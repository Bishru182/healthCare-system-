// middleware/validate.middleware.js
// ─────────────────────────────────────────────
// Input Validation Middleware using express-validator
// ─────────────────────────────────────────────

import { body, param, validationResult } from 'express-validator';
import { HTTP_STATUS, PAYMENT_METHOD } from '../config/constants.js';

// ─── Helper: run validation result check ─────────────────────────────────────
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Rules: Create Payment ────────────────────────────────────────────────────
export const createPaymentRules = [
  body('appointmentId')
    .notEmpty().withMessage('appointmentId is required')
    .isMongoId().withMessage('appointmentId must be a valid MongoDB ObjectId'),

  body('amount')
    .notEmpty().withMessage('amount is required')
    .isFloat({ min: 0.01 }).withMessage('amount must be a positive number'),

  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 }).withMessage('currency must be a 3-letter code (e.g. USD)')
    .isAlpha().withMessage('currency must contain only letters'),

  body('paymentMethod')
    .optional()
    .isIn(Object.values(PAYMENT_METHOD))
    .withMessage(`paymentMethod must be one of: ${Object.values(PAYMENT_METHOD).join(', ')}`),
];

// ─── Rules: Confirm / Fail Payment ───────────────────────────────────────────
export const changeStatusRules = [
  body('paymentId')
    .notEmpty().withMessage('paymentId is required')
    .isMongoId().withMessage('paymentId must be a valid MongoDB ObjectId'),
];

// ─── Rules: Fail Payment (extra optional reason field) ───────────────────────
export const failPaymentRules = [
  ...changeStatusRules,
  body('reason')
    .optional()
    .isString().withMessage('reason must be a string')
    .isLength({ max: 500 }).withMessage('reason cannot exceed 500 characters'),
];

// ─── Rules: ObjectId param ────────────────────────────────────────────────────
export const mongoIdParam = (paramName) => [
  param(paramName)
    .isMongoId().withMessage(`${paramName} must be a valid MongoDB ObjectId`),
];
