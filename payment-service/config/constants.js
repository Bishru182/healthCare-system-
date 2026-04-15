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
  CARD: 'card',
  MOCK: 'mock',
  PAYHERE: 'payhere',
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
