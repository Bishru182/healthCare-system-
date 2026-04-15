// routes/payment.routes.js
// ─────────────────────────────────────────────
// Payment Routes
// All routes are protected by JWT authentication.
// ─────────────────────────────────────────────

import { Router } from 'express';

import authMiddleware from '../middleware/auth.middleware.js';
import {
  validate,
  createPaymentRules,
  changeStatusRules,
  failPaymentRules,
  mongoIdParam,
} from '../middleware/validate.middleware.js';

import {
  createPayment,
  confirmPayment,
  failPayment,
  getPaymentById,
  getPaymentsByPatient,
} from '../controllers/payment.controller.js';

const router = Router();

// Apply JWT auth to every route in this router
router.use(authMiddleware);

// ─── POST /api/payments/create ───────────────────────────────────────────────
/**
 * @route   POST /api/payments/create
 * @desc    Create a new payment with status = pending
 * @access  Private (requires JWT)
 * @body    { appointmentId, amount, currency?, paymentMethod? }
 */
router.post('/create', createPaymentRules, validate, createPayment);

// ─── POST /api/payments/confirm ──────────────────────────────────────────────
/**
 * @route   POST /api/payments/confirm
 * @desc    Simulate successful payment – status → completed
 * @access  Private (requires JWT)
 * @body    { paymentId }
 */
router.post('/confirm', changeStatusRules, validate, confirmPayment);

// ─── POST /api/payments/fail ──────────────────────────────────────────────────
/**
 * @route   POST /api/payments/fail
 * @desc    Simulate failed payment – status → failed
 * @access  Private (requires JWT)
 * @body    { paymentId, reason? }
 */
router.post('/fail', failPaymentRules, validate, failPayment);

// ─── GET /api/payments/patient/:patientId ────────────────────────────────────
// NOTE: This route MUST be defined before GET /:id to avoid "patient" being
//       treated as a MongoDB ObjectId.
/**
 * @route   GET /api/payments/patient/:patientId
 * @desc    Get all payments for a patient (newest first)
 * @access  Private – patients see only their own; admin/doctor see all
 */
router.get(
  '/patient/:patientId',
  mongoIdParam('patientId'),
  validate,
  getPaymentsByPatient
);

// ─── GET /api/payments/:id ───────────────────────────────────────────────────
/**
 * @route   GET /api/payments/:id
 * @desc    Get a single payment by its _id
 * @access  Private (requires JWT)
 */
router.get('/:id', mongoIdParam('id'), validate, getPaymentById);

export default router;
