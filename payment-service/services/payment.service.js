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
import { notifyPaymentSuccess, notifyPaymentFailure } from './notification.service.js';
import { PAYMENT_STATUS } from '../config/constants.js';
import { AppError } from '../middleware/error.middleware.js';
import { HTTP_STATUS } from '../config/constants.js';

// ─── Helper: validate MongoDB ObjectId ───────────────────────────────────────
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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
// 2. CONFIRM PAYMENT  (simulate gateway success)
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
// 3. FAIL PAYMENT  (simulate gateway failure)
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
// 4. GET PAYMENT BY ID
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
// 5. GET ALL PAYMENTS FOR PATIENT
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
// 6. GET ALL PAYMENTS (ADMIN ONLY)
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
