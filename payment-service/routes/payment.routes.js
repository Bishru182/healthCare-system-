// routes/payment.routes.js
// ─────────────────────────────────────────────
// Payment Routes
// Webhook route is public; all other routes are JWT protected.
// ─────────────────────────────────────────────

import { Router } from 'express';

import authMiddleware from '../middleware/auth.middleware.js';
import { roleCheck } from '../middleware/roleCheck.middleware.js';
import {
  validate,
  createPaymentRules,
  initiateOnlinePaymentRules,
  changeStatusRules,
  failPaymentRules,
  mongoIdParam,
  webhookProviderParamRule,
} from '../middleware/validate.middleware.js';

import {
  handleProviderWebhook,
  createPayment,
  initiateOnlinePayment,
  confirmPayment,
  failPayment,
  getPaymentById,
  getPaymentsByPatient,
  getAllPayments,
} from '../controllers/payment.controller.js';

const router = Router();

// ─── POST /api/payments/webhook/:provider ───────────────────────────────────
/**
 * @route   POST /api/payments/webhook/:provider
 * @desc    Generic provider webhook endpoint (Stripe, PayHere, ...)
 * @access  Public (provider callbacks)
 */
router.post('/webhook/:provider', webhookProviderParamRule, validate, handleProviderWebhook);

// Apply JWT auth to every route in this router
router.use(authMiddleware);

// ─── POST /api/payments/initiate-online ─────────────────────────────────────
/**
 * @route   POST /api/payments/initiate-online
 * @desc    Start online checkout using selected provider
 * @access  Private (requires JWT)
 * @body    { appointmentId, provider }
 */
router.post(
  '/initiate-online',
  initiateOnlinePaymentRules,
  validate,
  initiateOnlinePayment
);

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
 * @desc    Confirm payment (admin only)
 * @access  Private – admin role required
 * @body    { paymentId }
 */
router.post('/confirm', changeStatusRules, validate, roleCheck('admin'), confirmPayment);

// ─── POST /api/payments/fail ──────────────────────────────────────────────────
/**
 * @route   POST /api/payments/fail
 * @desc    Fail payment (admin only)
 * @access  Private – admin role required
 * @body    { paymentId, reason? }
 */
router.post('/fail', failPaymentRules, validate, roleCheck('admin'), failPayment);

// ─── GET /api/payments ────────────────────────────────────────────────────────
/**
 * @route   GET /api/payments
 * @desc    Get all payments in the system (admin only)
 * @access  Private – admin role required
 */
router.get('/', roleCheck('admin'), getAllPayments);

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
