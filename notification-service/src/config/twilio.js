// src/config/twilio.js
// ─────────────────────────────────────────────
// Twilio client for sending SMS messages.
// Uses environment variables TWILIO_SID, TWILIO_AUTH, TWILIO_PHONE.
// ─────────────────────────────────────────────

import twilio from 'twilio';

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

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

export default sendSMS;
