// controllers/payment.controller.js
// ─────────────────────────────────────────────
// Payment Controller
// Thin layer: parse request → call service → send response.
// No business logic lives here.
// ─────────────────────────────────────────────

import * as paymentService from '../services/payment.service.js';
import { HTTP_STATUS } from '../config/constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new payment (status = pending).
 * patientId is extracted from the verified JWT (req.user.id).
 */
export const createPayment = async (req, res, next) => {
  try {
    const { appointmentId, amount, currency, paymentMethod } = req.body;

    // patientId comes from the JWT – not from request body (security)
    const patientId = req.user.id;

    const payment = await paymentService.createPayment({
      patientId,
      appointmentId,
      amount,
      currency,
      paymentMethod,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Payment created successfully. Status: pending.',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/confirm
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a successful payment.
 * Calls the gateway, generates transactionId, sets status = completed.
 */
export const confirmPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.body;

    const payment = await paymentService.confirmPayment(paymentId);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Payment confirmed successfully.',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/fail
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulate a payment failure.
 * Sets status = failed and records an optional reason.
 */
export const failPayment = async (req, res, next) => {
  try {
    const { paymentId, reason } = req.body;

    const payment = await paymentService.failPayment(paymentId, reason);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Payment marked as failed.',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/:id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a single payment by its MongoDB _id.
 */
export const getPaymentById = async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/patient/:patientId
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all payments for a specific patient (newest first).
 * Only allows a patient to access their OWN records (enforced below).
 */
export const getPaymentsByPatient = async (req, res, next) => {
  try {
    const requestedPatientId = req.params.patientId;
    const tokenPatientId     = req.user.id;

    // Authorization guard: a patient can only query their own payments.
    // Admins/doctors (role check) may query any patient.
    if (
      requestedPatientId !== tokenPatientId &&
      req.user.role !== 'admin' &&
      req.user.role !== 'doctor'
    ) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Access denied. You can only view your own payment records.',
      });
    }

    const payments = await paymentService.getPaymentsByPatient(requestedPatientId);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};
