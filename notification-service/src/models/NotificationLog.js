// src/models/NotificationLog.js
// ─────────────────────────────────────────────
// Mongoose model – logs every notification attempt
// (both successful and failed) for auditing.
// ─────────────────────────────────────────────

import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
    },
    recipient: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: ['email', 'sms'],
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);

export default NotificationLog;
