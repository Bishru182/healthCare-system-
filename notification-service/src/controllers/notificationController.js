// src/controllers/notificationController.js
// ─────────────────────────────────────────────
// Handles incoming notification requests and
// provides a log-retrieval endpoint for the
// admin dashboard.
// ─────────────────────────────────────────────

import NotificationLog from '../models/NotificationLog.js';
import sendEmail       from '../config/mailer.js';
import sendTextLkSMS   from '../config/textlk.js';
import sendTwilioSMS, { sendWhatsApp } from '../config/twilio.js';
import getTemplate     from '../services/templateService.js';

const hasTextLkSmsConfig = () =>
  Boolean(process.env.TEXTLK_API_TOKEN && process.env.TEXTLK_SENDER_ID);

const hasTwilioBaseConfig = () =>
  Boolean(process.env.TWILIO_SID && process.env.TWILIO_AUTH);

const hasTwilioSmsConfig = () =>
  Boolean(hasTwilioBaseConfig() && process.env.TWILIO_PHONE);

const hasTwilioWhatsAppConfig = () =>
  Boolean(hasTwilioBaseConfig() && (process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_PHONE));

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
  const normalizedChannels = Array.isArray(channels)
    ? channels.map((channel) => String(channel).trim().toLowerCase()).filter(Boolean)
    : [];
  const normalizedRecipients = Array.isArray(recipients) ? recipients : [];

  // Validate required fields
  if (!eventType || !normalizedChannels.length || !normalizedRecipients.length) {
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
  const textLkSmsEnabled = hasTextLkSmsConfig();
  const twilioSmsEnabled = hasTwilioSmsConfig();
  const twilioWhatsAppEnabled = hasTwilioWhatsAppConfig();

  for (const recipient of normalizedRecipients) {
    const { subject, message } = getTemplate(eventType, data);

    // ── Email channel ───────────────────────────────────────────────
    if (normalizedChannels.includes('email') && recipient.email) {
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
    if (normalizedChannels.includes('sms') && recipient.phone) {
      let smsDelivered = false;
      const smsErrors = [];

      if (textLkSmsEnabled) {
        try {
          await sendTextLkSMS(recipient.phone, message);
          smsDelivered = true;
        } catch (error) {
          smsErrors.push(`Text.lk: ${error.message}`);
          if (twilioSmsEnabled) {
            console.warn(
              `⚠️  Text.lk SMS failed for ${recipient.phone}. Retrying with Twilio SMS...`
            );
          }
        }
      }

      if (!smsDelivered && twilioSmsEnabled) {
        try {
          await sendTwilioSMS(recipient.phone, message);
          smsDelivered = true;
        } catch (error) {
          smsErrors.push(`Twilio: ${error.message}`);
        }
      }

      if (smsDelivered) {
        await NotificationLog.create({
          eventType,
          recipient: recipient.phone,
          channel: 'sms',
          status: 'sent',
        });
      } else {
        const configMessage =
          !textLkSmsEnabled && !twilioSmsEnabled
            ? 'No SMS provider configured. Set TEXTLK_API_TOKEN/TEXTLK_SENDER_ID or TWILIO_SID/TWILIO_AUTH/TWILIO_PHONE.'
            : null;
        const errorMessage = configMessage || smsErrors.join(' | ') || 'SMS delivery failed.';
        console.error(`❌  SMS failed for ${recipient.phone}:`, errorMessage);
        await NotificationLog.create({
          eventType,
          recipient: recipient.phone,
          channel: 'sms',
          status: 'failed',
          errorMessage,
        });
      }
    }

    // ── WhatsApp channel ───────────────────────────────────────────
    if (normalizedChannels.includes('whatsapp') && recipient.phone) {
      if (!twilioWhatsAppEnabled) {
        const errorMessage =
          'Twilio WhatsApp is not configured. Set TWILIO_SID/TWILIO_AUTH and TWILIO_WHATSAPP_FROM (or TWILIO_PHONE).';
        console.error(`❌  WhatsApp failed for ${recipient.phone}:`, errorMessage);
        await NotificationLog.create({
          eventType,
          recipient: recipient.phone,
          channel: 'whatsapp',
          status: 'failed',
          errorMessage,
        });
      } else {
        try {
          await sendWhatsApp(recipient.phone, message);
          await NotificationLog.create({
            eventType,
            recipient: recipient.phone,
            channel: 'whatsapp',
            status: 'sent',
          });
        } catch (error) {
          console.error(`❌  WhatsApp failed for ${recipient.phone}:`, error.message);
          await NotificationLog.create({
            eventType,
            recipient: recipient.phone,
            channel: 'whatsapp',
            status: 'failed',
            errorMessage: error.message,
          });
        }
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
