// middleware/error.middleware.js
// ─────────────────────────────────────────────
// Centralised Error Handling Middleware
// Must be registered LAST in Express middleware chain
// ─────────────────────────────────────────────

import { HTTP_STATUS } from '../config/constants.js';

// ─── Custom Application Error ────────────────────────────────────────────────
export class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes from unexpected errors
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── 404 Not Found Handler ───────────────────────────────────────────────────
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    HTTP_STATUS.NOT_FOUND
  );
  next(error);
};

// ─── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
export const globalErrorHandler = (err, req, res, next) => {
  // Default to 500 if no status code set
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';

  // ── Mongoose Validation Error ──────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    // Collect all field-level messages
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join('; ');
  }

  // ── Mongoose Duplicate Key Error ───────────────────────────────────────
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}. A payment for this appointment already exists.`;
  }

  // ── Mongoose Cast Error (invalid ObjectId) ─────────────────────────────
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = `Invalid value for field: ${err.path}`;
  }

  // ── JWT Errors (caught here if not caught in middleware) ───────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token expired';
  }

  // ── Log unexpected errors (non-operational) ────────────────────────────
  if (!err.isOperational) {
    console.error('💥 Unexpected Error:', err);
  }

  // ── Send JSON response ─────────────────────────────────────────────────
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
};
