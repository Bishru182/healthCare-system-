// app.js
// ─────────────────────────────────────────────
// Express Application Factory
// Sets up middleware, routes, and error handlers.
// Kept separate from server.js so the app can be
// imported in tests without starting a TCP listener.
// ─────────────────────────────────────────────

import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// ── Middleware ────────────────────────────────
import requestLogger        from './middleware/logger.middleware.js';
import { notFoundHandler, globalErrorHandler } from './middleware/error.middleware.js';

// ── Routes ────────────────────────────────────
import paymentRoutes from './routes/payment.routes.js';

const app = express();

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:30173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:30173',
];

const allowedOrigins = (process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : defaultAllowedOrigins
)
  .map((origin) => origin.trim())
  .filter(Boolean);

// ─────────────────────────────────────────────
// 1. Core Middleware
// ─────────────────────────────────────────────

// CORS configuration
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Parse incoming JSON bodies
app.use(
  express.json({
    limit: '100kb',
    verify: (req, _res, buf) => {
      if (req.originalUrl.startsWith('/api/payments/webhook/')) {
        req.rawBody = Buffer.from(buf);
      }
    },
  })
);

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// HTTP request logger (morgan)
app.use(requestLogger);

// Security headers (lightweight, no external dep needed)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Powered-By', 'Healthcare Payment Service');
  next();
});

// ─────────────────────────────────────────────
// 2. Health Check  (unauthenticated)
// ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    service: 'payment-service',
    status: 'UP',
    timestamp: new Date().toISOString(),
    provider: process.env.PAYMENT_PROVIDER || 'mock',
  });
});

// ─────────────────────────────────────────────
// 3. API Routes
// ─────────────────────────────────────────────
app.use('/api/payments', paymentRoutes);

// ─────────────────────────────────────────────
// 4. Error Handling  (must be last)
// ─────────────────────────────────────────────
app.use(notFoundHandler);       // 404 for unmatched routes
app.use(globalErrorHandler);    // Central error formatter

export default app;
