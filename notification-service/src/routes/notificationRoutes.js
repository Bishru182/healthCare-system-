// src/routes/notificationRoutes.js
// ─────────────────────────────────────────────
// Route definitions for the Notification Service.
//   POST /send  – accept & dispatch notifications
//   GET  /logs  – retrieve notification audit logs
// ─────────────────────────────────────────────

import { Router } from 'express';
import { sendNotification, getLogs } from '../controllers/notificationController.js';

const router = Router();

router.post('/send', sendNotification);
router.get('/logs',  getLogs);

export default router;
