// services/notification.service.js
// ─────────────────────────────────────────────
// Inter-Service Communication – Notification Service
// Publishes payment events to the Notification Service via HTTP.
// Fails silently so a notification error never breaks the payment flow.
// ─────────────────────────────────────────────

import axios from 'axios';

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL;

/**
 * Notify the Notification Service that a payment completed successfully.
 *
 * @param {{ patientId: string, appointmentId: string, amount: number, currency: string, transactionId: string }} payload
 */
export const notifyPaymentSuccess = async (payload) => {
  if (!NOTIFICATION_URL) {
    console.warn('⚠️  NOTIFICATION_SERVICE_URL not set – skipping notification');
    return;
  }

  try {
    await axios.post(
      `${NOTIFICATION_URL}/api/notifications/send`,
      {
        type: 'PAYMENT_SUCCESS',
        recipientId: payload.patientId,
        data: {
          appointmentId: payload.appointmentId,
          amount: payload.amount,
          currency: payload.currency,
          transactionId: payload.transactionId,
          message: `Your payment of ${payload.currency} ${payload.amount} was successful. Transaction ID: ${payload.transactionId}`,
        },
      },
      { timeout: 3000 } // 3-second timeout – non-blocking
    );

    console.log(`📨  Notification sent for transaction ${payload.transactionId}`);
  } catch (error) {
    // Silent failure: log the issue but do NOT propagate
    console.error(
      `⚠️  Failed to notify Notification Service: ${error.message}`
    );
  }
};

/**
 * Notify the Notification Service that a payment failed.
 *
 * @param {{ patientId: string, appointmentId: string, reason: string }} payload
 */
export const notifyPaymentFailure = async (payload) => {
  if (!NOTIFICATION_URL) return;

  try {
    await axios.post(
      `${NOTIFICATION_URL}/api/notifications/send`,
      {
        type: 'PAYMENT_FAILED',
        recipientId: payload.patientId,
        data: {
          appointmentId: payload.appointmentId,
          reason: payload.reason || 'Unknown reason',
          message: `Your payment for appointment ${payload.appointmentId} has failed. Please try again.`,
        },
      },
      { timeout: 3000 }
    );

    console.log(`📨  Failure notification sent for patient ${payload.patientId}`);
  } catch (error) {
    console.error(
      `⚠️  Failed to send failure notification: ${error.message}`
    );
  }
};
