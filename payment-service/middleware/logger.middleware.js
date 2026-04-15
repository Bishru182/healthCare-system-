// middleware/logger.middleware.js
// ─────────────────────────────────────────────
// Request Logging Middleware
// Uses morgan under the hood with a custom format
// ─────────────────────────────────────────────

import morgan from 'morgan';

// ─── Custom token: log request body (sanitised) ──────────────────────────────
morgan.token('body', (req) => {
  const body = { ...req.body };

  // Redact sensitive fields before logging
  const sensitiveFields = ['password', 'cardNumber', 'cvv', 'secret', 'token'];
  sensitiveFields.forEach((field) => {
    if (body[field]) body[field] = '***REDACTED***';
  });

  return JSON.stringify(body);
});

// ─── Custom token: authenticated user id ─────────────────────────────────────
morgan.token('userId', (req) => {
  return req.user ? req.user.id : 'anonymous';
});

// ─── Format string ───────────────────────────────────────────────────────────
const FORMAT =
  process.env.NODE_ENV === 'production'
    ? 'combined' // Apache-style for production log aggregators
    : '[:date[clf]] :method :url :status :response-time ms | user=:userId | body=:body';

const requestLogger = morgan(FORMAT, {
  // Skip logging for health-check endpoints to reduce noise
  skip: (req) => req.url === '/health',
});

export default requestLogger;
