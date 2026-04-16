// src/config/twilio.js
// ─────────────────────────────────────────────
// Twilio client for sending SMS and WhatsApp messages.
// Uses environment variables TWILIO_SID, TWILIO_AUTH, TWILIO_PHONE,
// and optional TWILIO_WHATSAPP_FROM.
// ─────────────────────────────────────────────

import twilio from 'twilio';

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

const normalizeWhatsAppAddress = (value) =>
  value?.startsWith('whatsapp:') ? value : `whatsapp:${value}`;

/**
 * Send an SMS message via Twilio.
 * @param {string} to   – Recipient phone number (E.164 format, e.g. +94771234567)
 * @param {string} body – Message text
 * @returns {Promise<object>} Twilio message instance
 */
const sendSMS = async (to, body) => {
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE,
    to,
  });

  console.log(`📱  SMS sent to ${to}  (sid: ${message.sid})`);
  return message;
};

/**
 * Send a WhatsApp message via Twilio.
 * @param {string} to   – Recipient phone number (E.164 format, e.g. +94771234567)
 * @param {string} body – Message text
 * @returns {Promise<object>} Twilio message instance
 */
export const sendWhatsApp = async (to, body) => {
  const fromValue = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_PHONE;

  if (!fromValue) {
    throw new Error('TWILIO_WHATSAPP_FROM or TWILIO_PHONE must be set for WhatsApp sending.');
  }

  const message = await client.messages.create({
    body,
    from: normalizeWhatsAppAddress(fromValue),
    to: normalizeWhatsAppAddress(to),
  });

  console.log(`💬  WhatsApp sent to ${to}  (sid: ${message.sid})`);
  return message;
};

export default sendSMS;
