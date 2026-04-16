// src/config/textlk.js
// ─────────────────────────────────────────────
// Text.lk client for sending SMS messages.
// Uses environment variables:
//   TEXTLK_API_TOKEN
//   TEXTLK_SENDER_ID
// Optional:
//   TEXTLK_SMS_API_URL (default: https://app.text.lk/api/v3/sms/send)
//   TEXTLK_SMS_TYPE    (default: plain)
// ─────────────────────────────────────────────

const normalizeRecipient = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (!digits) {
    throw new Error('Recipient phone number is required for Text.lk SMS.');
  }

  // Text.lk examples use Sri Lankan recipients in 94XXXXXXXXX format.
  if (digits.startsWith('94')) {
    return digits;
  }

  if (digits.startsWith('0')) {
    return `94${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `94${digits}`;
  }

  return digits;
};

const parseApiResponse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const sendSMS = async (to, body) => {
  const apiToken = process.env.TEXTLK_API_TOKEN;
  const senderId = process.env.TEXTLK_SENDER_ID;
  const endpoint = process.env.TEXTLK_SMS_API_URL || 'https://app.text.lk/api/v3/sms/send';
  const smsType = process.env.TEXTLK_SMS_TYPE || 'plain';

  if (!apiToken) {
    throw new Error('TEXTLK_API_TOKEN is required for Text.lk SMS sending.');
  }

  if (!senderId) {
    throw new Error('TEXTLK_SENDER_ID is required for Text.lk SMS sending.');
  }

  const payload = {
    recipient: normalizeRecipient(to),
    sender_id: senderId,
    type: smsType,
    message: body,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  const data = parseApiResponse(raw);

  if (!response.ok) {
    throw new Error(data?.message || `Text.lk HTTP ${response.status}`);
  }

  if (data && data.status === false) {
    throw new Error(data.message || 'Text.lk rejected SMS request.');
  }

  const smsId = data?.data?.sms_id ? ` (sms_id: ${data.data.sms_id})` : '';
  console.log(`📱  SMS sent via Text.lk to ${payload.recipient}${smsId}`);

  return data;
};

export default sendSMS;
