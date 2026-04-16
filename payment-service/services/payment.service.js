// services/payment.service.js
// ─────────────────────────────────────────────
// Core Payment Business Logic
// All DB operations and gateway calls live here.
// Controllers only call these functions.
// ─────────────────────────────────────────────

import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Payment from '../models/Payment.js';
import getGateway from './gateway/gateway.factory.js';
import getPaymentGateway, {
  normalizeProvider,
} from './paymentGateway/index.js';
import { notifyPaymentSuccess, notifyPaymentFailure } from './notification.service.js';
import paymentConfig from '../config/payment.js';
import {
  fetchAppointmentById,
  markAppointmentAsConfirmed,
} from './appointment.integration.service.js';
import {
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  HTTP_STATUS,
} from '../config/constants.js';
import { AppError } from '../middleware/error.middleware.js';

// ─── Helper: validate MongoDB ObjectId ───────────────────────────────────────
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const resolveAppointmentAmount = (appointment) => {
  const rawAmount =
    appointment?.amount ??
    appointment?.fee ??
    appointment?.consultationFee ??
    paymentConfig.defaultAppointmentFee;

  const amount = Number(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(
      'Unable to determine a valid appointment amount for online checkout.',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  return Number(amount.toFixed(2));
};

const resolvePaymentForWebhook = async ({
  paymentId,
  appointmentId,
  gatewaySessionId,
}) => {
  if (paymentId && isValidObjectId(paymentId)) {
    const byId = await Payment.findById(paymentId);
    if (byId) return byId;
  }

  if (gatewaySessionId) {
    const bySession = await Payment.findOne({ gatewaySessionId });
    if (bySession) return bySession;
  }

  if (appointmentId && isValidObjectId(appointmentId)) {
    const byAppointment = await Payment.findOne({ appointmentId });
    if (byAppointment) return byAppointment;
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE PAYMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new payment record with status = "pending".
 * Prevents duplicate payments for the same appointmentId.
 *
 * @param {{ patientId: string, appointmentId: string, amount: number, currency?: string, paymentMethod?: string }} data
 * @returns {Promise<Payment>}
 */
export const createPayment = async ({
  patientId,
  appointmentId,
  amount,
  currency = 'USD',
  paymentMethod = 'credit_card',
}) => {
  // 1a. Validate IDs
  if (!isValidObjectId(patientId)) {
    throw new AppError('Invalid patientId', HTTP_STATUS.BAD_REQUEST);
  }
  if (!isValidObjectId(appointmentId)) {
    throw new AppError('Invalid appointmentId', HTTP_STATUS.BAD_REQUEST);
  }

  // 1b. Duplicate-payment guard
  const existing = await Payment.findOne({ appointmentId });
  if (existing) {
    throw new AppError(
      `A payment already exists for appointment ${appointmentId}. Status: ${existing.status}`,
      HTTP_STATUS.CONFLICT
    );
  }

  // 1c. Persist payment (status defaults to "pending" in schema)
  const payment = await Payment.create({
    patientId,
    appointmentId,
    amount,
    currency: currency.toUpperCase(),
    paymentMethod,
    provider: process.env.PAYMENT_PROVIDER || 'mock',
    status: PAYMENT_STATUS.PENDING,
  });

  return payment;
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. INITIATE ONLINE PAYMENT (new, additive flow)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Starts an online payment checkout flow using a pluggable provider.
 * This does not affect existing manual/admin endpoints.
 *
 * @param {{ patientId: string, appointmentId: string, provider: string, authorizationHeader?: string, userRole?: string }} data
 * @returns {Promise<{ paymentId: string, redirectUrl: string | null }>}
 */
export const initiateOnlinePayment = async ({
  patientId,
  appointmentId,
  provider,
  authorizationHeader,
  userRole = 'patient',
}) => {
  if (!isValidObjectId(patientId)) {
    throw new AppError('Invalid patientId', HTTP_STATUS.BAD_REQUEST);
  }

  if (!isValidObjectId(appointmentId)) {
    throw new AppError('Invalid appointmentId', HTTP_STATUS.BAD_REQUEST);
  }

  const normalizedProvider = normalizeProvider(provider);

  let gateway;
  try {
    gateway = getPaymentGateway(normalizedProvider);
  } catch (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  const existing = await Payment.findOne({ appointmentId });
  if (existing) {
    throw new AppError(
      `A payment already exists for appointment ${appointmentId}. Status: ${existing.status}`,
      HTTP_STATUS.CONFLICT
    );
  }

  let appointment;
  try {
    appointment = await fetchAppointmentById({
      appointmentId,
      authorizationHeader,
    });
  } catch (error) {
    console.error(
      `⚠️  Failed to fetch appointment ${appointmentId} for online payment: ${error.message}`
    );
    throw new AppError(
      'Unable to fetch appointment details for online payment.',
      HTTP_STATUS.BAD_GATEWAY
    );
  }

  if (
    userRole === 'patient' &&
    appointment?.patientId &&
    String(appointment.patientId) !== String(patientId)
  ) {
    throw new AppError(
      'Access denied. Appointment does not belong to the authenticated patient.',
      HTTP_STATUS.FORBIDDEN
    );
  }

  const amount = resolveAppointmentAmount(appointment);
  const currency = String(
    appointment?.currency || paymentConfig.defaultCurrency || 'USD'
  ).toUpperCase();

  const payment = await Payment.create({
    patientId,
    appointmentId,
    amount,
    currency,
    status: PAYMENT_STATUS.PENDING,
    paymentMethod: PAYMENT_METHOD.ONLINE,
    gatewayProvider: normalizedProvider,
    provider: normalizedProvider.toLowerCase(),
  });

  try {
    const gatewayResult = await gateway.createPayment({
      paymentId: payment._id.toString(),
      appointmentId: payment.appointmentId.toString(),
      amount: payment.amount,
      currency: payment.currency,
      successUrl: paymentConfig.successUrl,
      cancelUrl: paymentConfig.cancelUrl,
    });

    payment.gatewaySessionId = gatewayResult?.gatewaySessionId || null;
    payment.checkoutUrl = gatewayResult?.redirectUrl || null;
    payment.gatewayResponse = gatewayResult?.rawResponse || gatewayResult || null;

    await payment.save();

    return {
      paymentId: payment._id.toString(),
      redirectUrl: payment.checkoutUrl,
    };
  } catch (error) {
    console.error(
      `⚠️  Gateway initiation failed for provider ${normalizedProvider}, payment ${payment._id}: ${error.message}`
    );

    payment.failureReason =
      'Online gateway initiation failed. Retry later or use manual confirmation.';
    payment.gatewayResponse = {
      provider: normalizedProvider,
      error: error.message,
      failedAt: new Date().toISOString(),
    };

    await payment.save();

    return {
      paymentId: payment._id.toString(),
      redirectUrl: null,
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROCESS PROVIDER WEBHOOK (new, additive flow)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processes a provider webhook and updates payment state idempotently.
 *
 * @param {{ provider: string, headers: object, rawBody?: Buffer, body?: object }} data
 * @returns {Promise<object>}
 */
export const handleGatewayWebhook = async ({
  provider,
  headers,
  rawBody,
  body,
}) => {
  const normalizedProvider = normalizeProvider(provider);

  let gateway;
  try {
    gateway = getPaymentGateway(normalizedProvider);
  } catch (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  let result;
  try {
    result = await gateway.handleWebhook({ headers, rawBody, body });
  } catch (error) {
    console.error(
      `⚠️  ${normalizedProvider} webhook verification failed: ${error.message}`
    );
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  if (!result || result.status === 'IGNORED') {
    return {
      received: true,
      provider: normalizedProvider,
      ignored: true,
      eventType: result?.eventType || null,
    };
  }

  const payment = await resolvePaymentForWebhook({
    paymentId: result.paymentId,
    appointmentId: result.appointmentId,
    gatewaySessionId: result.gatewaySessionId,
  });

  if (!payment) {
    console.warn(
      `⚠️  Webhook payment target not found for provider ${normalizedProvider}`
    );
    return {
      received: true,
      provider: normalizedProvider,
      ignored: true,
      reason: 'payment-not-found',
      eventType: result.eventType || null,
    };
  }

  if (result.status === 'SUCCESS') {
    if (payment.status === PAYMENT_STATUS.COMPLETED) {
      return {
        received: true,
        provider: normalizedProvider,
        paymentId: payment._id.toString(),
        status: payment.status,
        idempotent: true,
      };
    }

    payment.status = PAYMENT_STATUS.COMPLETED;
    payment.transactionId =
      result.transactionId || payment.transactionId || `TXN-${uuidv4().toUpperCase()}`;
    payment.gatewayProvider = payment.gatewayProvider || normalizedProvider;
    payment.gatewaySessionId = result.gatewaySessionId || payment.gatewaySessionId;
    payment.gatewayResponse = result.gatewayResponse || result;
    payment.failureReason = null;

    await payment.save();

    notifyPaymentSuccess({
      patientId: payment.patientId.toString(),
      appointmentId: payment.appointmentId.toString(),
      amount: payment.amount,
      currency: payment.currency,
      transactionId: payment.transactionId,
    });

    await markAppointmentAsConfirmed(payment.appointmentId.toString());

    return {
      received: true,
      provider: normalizedProvider,
      paymentId: payment._id.toString(),
      status: payment.status,
    };
  }

  if (result.status === 'FAILED') {
    if (payment.status === PAYMENT_STATUS.FAILED) {
      return {
        received: true,
        provider: normalizedProvider,
        paymentId: payment._id.toString(),
        status: payment.status,
        idempotent: true,
      };
    }

    // Do not regress completed payments to failed from a late/out-of-order event.
    if (payment.status === PAYMENT_STATUS.COMPLETED) {
      return {
        received: true,
        provider: normalizedProvider,
        paymentId: payment._id.toString(),
        status: payment.status,
        ignored: true,
        reason: 'already-completed',
      };
    }

    payment.status = PAYMENT_STATUS.FAILED;
    payment.failureReason = result.failureReason || 'Gateway payment failed.';
    payment.transactionId =
      result.transactionId || payment.transactionId || `FAILED-${uuidv4().toUpperCase()}`;
    payment.gatewayProvider = payment.gatewayProvider || normalizedProvider;
    payment.gatewaySessionId = result.gatewaySessionId || payment.gatewaySessionId;
    payment.gatewayResponse = result.gatewayResponse || result;

    await payment.save();

    notifyPaymentFailure({
      patientId: payment.patientId.toString(),
      appointmentId: payment.appointmentId.toString(),
      reason: payment.failureReason,
    });

    return {
      received: true,
      provider: normalizedProvider,
      paymentId: payment._id.toString(),
      status: payment.status,
    };
  }

  return {
    received: true,
    provider: normalizedProvider,
    ignored: true,
    eventType: result.eventType || null,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. CONFIRM PAYMENT  (simulate gateway success)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calls the gateway, generates a transactionId, and marks the payment
 * as "completed".  Triggers a success notification afterwards.
 *
 * @param {string} paymentId
 * @returns {Promise<Payment>}
 */
export const confirmPayment = async (paymentId) => {
  if (!isValidObjectId(paymentId)) {
    throw new AppError('Invalid paymentId', HTTP_STATUS.BAD_REQUEST);
  }

  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new AppError('Payment not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!payment.isPending()) {
    throw new AppError(
      `Cannot confirm a payment that is already "${payment.status}"`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Call the active gateway adapter
  const gateway = getGateway();
  const { transactionId } = await gateway.chargePayment({
    amount: payment.amount,
    currency: payment.currency,
    method: payment.paymentMethod,
  });

  // Update payment record
  payment.status        = PAYMENT_STATUS.COMPLETED;
  payment.transactionId = transactionId;
  await payment.save();

  // Async notification – fire and forget
  notifyPaymentSuccess({
    patientId:     payment.patientId.toString(),
    appointmentId: payment.appointmentId.toString(),
    amount:        payment.amount,
    currency:      payment.currency,
    transactionId,
  });

  return payment;
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. FAIL PAYMENT  (simulate gateway failure)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marks a payment as "failed" and records an optional failure reason.
 *
 * @param {string} paymentId
 * @param {string} [reason]
 * @returns {Promise<Payment>}
 */
export const failPayment = async (paymentId, reason = 'Payment declined') => {
  if (!isValidObjectId(paymentId)) {
    throw new AppError('Invalid paymentId', HTTP_STATUS.BAD_REQUEST);
  }

  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new AppError('Payment not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!payment.isPending()) {
    throw new AppError(
      `Cannot fail a payment that is already "${payment.status}"`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  payment.status        = PAYMENT_STATUS.FAILED;
  payment.failureReason = reason;
  payment.transactionId = `FAILED-${uuidv4().toUpperCase()}`;
  await payment.save();

  // Async notification – fire and forget
  notifyPaymentFailure({
    patientId:     payment.patientId.toString(),
    appointmentId: payment.appointmentId.toString(),
    reason,
  });

  return payment;
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET PAYMENT BY ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a single payment by its Mongo _id.
 *
 * @param {string} paymentId
 * @returns {Promise<Payment>}
 */
export const getPaymentById = async (paymentId) => {
  if (!isValidObjectId(paymentId)) {
    throw new AppError('Invalid paymentId', HTTP_STATUS.BAD_REQUEST);
  }

  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new AppError('Payment not found', HTTP_STATUS.NOT_FOUND);
  }

  return payment;
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET ALL PAYMENTS FOR PATIENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all payments belonging to a patient, newest first.
 *
 * @param {string} patientId
 * @returns {Promise<Payment[]>}
 */
export const getPaymentsByPatient = async (patientId) => {
  if (!isValidObjectId(patientId)) {
    throw new AppError('Invalid patientId', HTTP_STATUS.BAD_REQUEST);
  }

  const payments = await Payment.find({ patientId }).sort({ createdAt: -1 });

  return payments;
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. GET ALL PAYMENTS (ADMIN ONLY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all payments in the system, newest first.
 * Admin only - returns all payments regardless of patient.
 *
 * @returns {Promise<Payment[]>}
 */
export const getAllPayments = async () => {
  const payments = await Payment.find({}).sort({ createdAt: -1 });
  return payments;
};
