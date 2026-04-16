// src/config/mailer.js
// ─────────────────────────────────────────────
// Nodemailer transport configured for Gmail.
// Uses environment variables EMAIL_USER & EMAIL_PASS.
//
// ⚠️  EMAIL_PASS must be a Gmail App Password
//     (not your regular Google password).
// ─────────────────────────────────────────────

import nodemailer from 'nodemailer';

// In test environments set SMTP_HOST (and optionally SMTP_PORT) to redirect
// outgoing mail to a local mock SMTP server instead of Gmail.
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 25,
      secure: false,
      ignoreTLS: true,
      auth: process.env.EMAIL_USER
        ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS || '' }
        : undefined,
    })
  : nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

/**
 * Send an email.
 * @param {string} to      – Recipient email address
 * @param {string} subject – Email subject line
 * @param {string} text    – Plain-text body
 * @returns {Promise<object>} Nodemailer info object
 */
const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: `"MediConnect Notifications" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧  Email sent to ${to}  (messageId: ${info.messageId})`);
  return info;
};

export default sendEmail;
