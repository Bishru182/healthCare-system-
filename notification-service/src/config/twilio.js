// src/config/twilio.js
// ─────────────────────────────────────────────
// Twilio client for sending SMS and WhatsApp messages.
// Uses environment variables TWILIO_SID, TWILIO_AUTH, TWILIO_PHONE,
// and optional TWILIO_WHATSAPP_FROM.
// ─────────────────────────────────────────────

import twilio from 'twilio';

const normalizePhoneNumber = (value) => {
  const input = String(value || '').trim().replace(/^whatsapp:/i, '');

  if (!input) {
    throw new Error('Recipient phone number is required.');
  }

  if (input.startsWith('+')) {
    const digits = input.slice(1).replace(/\D/g, '');
    if (!digits) {
      throw new Error('Recipient phone number is invalid.');
    }
    return `+${digits}`;
  }

  const digits = input.replace(/\D/g, '');
  if (!digits) {
    throw new Error('Recipient phone number is invalid.');
  }

  if (digits.startsWith('00')) {
    return `+${digits.slice(2)}`;
  }

  if (digits.startsWith('94')) {
    return `+${digits}`;
  }

  if (digits.startsWith('0')) {
    return `+94${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `+94${digits}`;
  }

  return `+${digits}`;
};

const getTwilioClient = () => {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH) {
    throw new Error('TWILIO_SID and TWILIO_AUTH must be set for Twilio messaging.');
  }

  return twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
};

const normalizeWhatsAppAddress = (value) =>
  `whatsapp:${normalizePhoneNumber(value)}`;

/**
 * Send an SMS message via Twilio.
 * @param {string} to   – Recipient phone number (E.164 format, e.g. +94771234567)
 * @param {string} body – Message text
 * @returns {Promise<object>} Twilio message instance
 */
const sendSMS = async (to, body) => {
  const from = normalizePhoneNumber(process.env.TWILIO_PHONE);
  const message = await getTwilioClient().messages.create({
    body,
    from,
    to: normalizePhoneNumber(to),
  });

  console.log(`📱  SMS sent to ${normalizePhoneNumber(to)}  (sid: ${message.sid})`);
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

  const message = await getTwilioClient().messages.create({
    body,
    from: normalizeWhatsAppAddress(fromValue),
    to: normalizeWhatsAppAddress(to),
  });

  console.log(`💬  WhatsApp sent to ${normalizePhoneNumber(to)}  (sid: ${message.sid})`);
  return message;
};

export default sendSMS;
