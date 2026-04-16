// config/constants.js
// ─────────────────────────────────────────────
// Application-wide constants
// ─────────────────────────────────────────────

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

export const PAYMENT_METHOD = Object.freeze({
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  BANK_TRANSFER: 'bank_transfer',
  DIGITAL_WALLET: 'digital_wallet',
});

export const PAYMENT_PROVIDER = Object.freeze({
  MOCK: 'mock',
  STRIPE: 'stripe',
  PAYHERE: 'payhere',
});

export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
});
