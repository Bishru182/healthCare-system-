// config/payment.js
// ─────────────────────────────────────────────
// Payment-gateway specific configuration
// Loaded from environment variables only.
// ─────────────────────────────────────────────

import { PAYMENT_PROVIDER } from './constants.js';

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const paymentConfig = Object.freeze({
  defaultProvider: (process.env.PAYMENT_PROVIDER || PAYMENT_PROVIDER.MOCK).toUpperCase(),
  defaultCurrency: (process.env.DEFAULT_CURRENCY || 'USD').toUpperCase(),
  defaultAppointmentFee: toPositiveNumber(process.env.DEFAULT_APPOINTMENT_FEE, 100),

  successUrl:
    process.env.SUCCESS_URL ||
    'http://localhost:5173/patient/payments?gateway=success',
  cancelUrl:
    process.env.CANCEL_URL ||
    'http://localhost:5173/patient/payments?gateway=cancelled',

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    sandboxMode: toBoolean(process.env.STRIPE_SANDBOX_MODE, false),
  },

  appointmentServiceUrl: process.env.APPOINTMENT_SERVICE_URL || '',

  // Optional service token used for webhook-driven appointment confirmation.
  // This token should carry a role that is permitted by the appointment service.
  appointmentServiceToken: process.env.APPOINTMENT_SERVICE_TOKEN || '',
});

export default paymentConfig;
