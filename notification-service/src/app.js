// src/app.js
// ─────────────────────────────────────────────
// Express application setup for the Notification Service.
// Middleware: CORS, JSON parsing, Morgan logging.
// Routes: /api/notifications
// ─────────────────────────────────────────────

import express from 'express';
import cors    from 'cors';
import morgan  from 'morgan';

import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// ─── Middleware ────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ─── Health Check ─────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', service: 'notification-service' });
});

// ─── Routes ───────────────────────────────────
app.use('/api/notifications', notificationRoutes);

export default app;
