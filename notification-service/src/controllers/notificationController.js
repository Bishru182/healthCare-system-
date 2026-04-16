// src/controllers/notificationController.js
// ─────────────────────────────────────────────
// Handles incoming notification requests and
// provides a log-retrieval endpoint for the
// admin dashboard.
// ─────────────────────────────────────────────

import NotificationLog from '../models/NotificationLog.js';
import sendEmail       from '../config/mailer.js';
import sendSMS         from '../config/twilio.js';
import getTemplate     from '../services/templateService.js';

// ─────────────────────────────────────────────
// POST /api/notifications/send
// ─────────────────────────────────────────────
// Body:
//   {
//     eventType : "APPOINTMENT_BOOKED",
//     channels  : ["email", "sms"],
//     recipients: [{ name, email, phone }],
//     data      : { doctorName, date, time, ... }
//   }
//
// Returns 200 immediately so the calling service
// is not blocked. Processing continues in the
// background (fire-and-forget).
// ─────────────────────────────────────────────
export const sendNotification = async (req, res) => {
  const { eventType, channels = [], recipients = [], data = {} } = req.body;

  // Validate required fields
  if (!eventType || !channels.length || !recipients.length) {
    return res.status(400).json({
      success: false,
      message: 'eventType, channels, and recipients are required.',
    });
  }

  // Respond immediately – processing is fire-and-forget
  res.status(200).json({
    success: true,
    message: 'Notification request accepted. Processing in background.',
  });

  // ── Background processing ───────────────────────────────────────────
  for (const recipient of recipients) {
    const { subject, message } = getTemplate(eventType, data);

    // ── Email channel ───────────────────────────────────────────────
    if (channels.includes('email') && recipient.email) {
      try {
        await sendEmail(recipient.email, subject, message);
        await NotificationLog.create({
          eventType,
          recipient: recipient.email,
          channel: 'email',
          status: 'sent',
        });
      } catch (error) {
        console.error(`❌  Email failed for ${recipient.email}:`, error.message);
        await NotificationLog.create({
          eventType,
          recipient: recipient.email,
          channel: 'email',
          status: 'failed',
          errorMessage: error.message,
        });
      }
    }

    // ── SMS channel ─────────────────────────────────────────────────
    if (channels.includes('sms') && recipient.phone) {
      try {
        await sendSMS(recipient.phone, message);
        await NotificationLog.create({
          eventType,
          recipient: recipient.phone,
          channel: 'sms',
          status: 'sent',
        });
      } catch (error) {
        console.error(`❌  SMS failed for ${recipient.phone}:`, error.message);
        await NotificationLog.create({
          eventType,
          recipient: recipient.phone,
          channel: 'sms',
          status: 'failed',
          errorMessage: error.message,
        });
      }
    }
  }
};

// ─────────────────────────────────────────────
// GET /api/notifications/logs
// ─────────────────────────────────────────────
// Returns the most recent 100 notification logs
// sorted by newest first.
// ─────────────────────────────────────────────
export const getLogs = async (_req, res) => {
  try {
    const logs = await NotificationLog.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({ success: true, count: logs.length, logs });
  } catch (error) {
    console.error('❌  Failed to fetch logs:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
