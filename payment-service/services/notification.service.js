// services/notification.service.js
// ─────────────────────────────────────────────
// Inter-Service Communication – Notification Service
// Fetches patient contact, then publishes payment events to the
// Notification Service via HTTP.
// Fails silently so a notification error never breaks the payment flow.
// ─────────────────────────────────────────────

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL;
const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL || 'http://patient-service:3001';
const INTER_SERVICE_API_KEY = process.env.INTER_SERVICE_API_KEY || '';
const NOTIFICATION_CHANNELS = ['email', 'sms', 'whatsapp'];
const TIMEOUT_MS = 3000;

const getAbortSignal = () => {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(TIMEOUT_MS);
  }
  return undefined;
};

const fetchPatientContact = async (patientId) => {
  if (!patientId || !INTER_SERVICE_API_KEY) return null;

  try {
    const response = await fetch(
      `${PATIENT_SERVICE_URL}/api/patients/internal/${patientId}/contact`,
      {
        method: 'GET',
        headers: { 'x-internal-api-key': INTER_SERVICE_API_KEY },
        signal: getAbortSignal(),
      }
    );

    if (!response.ok) return null;

    const body = await response.json();
    return body?.patient || null;
  } catch {
    return null;
  }
};

const sendToNotificationService = async (eventType, patientContact, data) => {
  if (!NOTIFICATION_URL) {
    console.warn('⚠️  NOTIFICATION_SERVICE_URL not set – skipping notification');
    return;
  }

  const recipient = {
    name: patientContact?.name || 'Patient',
  };
  if (patientContact?.email) recipient.email = patientContact.email;
  if (patientContact?.phone) recipient.phone = patientContact.phone;

  if (!recipient.email && !recipient.phone) {
    console.warn(`⚠️  No contact info for patient – skipping ${eventType} notification`);
    return;
  }

  try {
    const response = await fetch(`${NOTIFICATION_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        channels: NOTIFICATION_CHANNELS,
        recipients: [recipient],
        data,
      }),
      signal: getAbortSignal(),
    });

    if (response.ok) {
      console.log(`📨  ${eventType} notification queued for patient ${patientContact?.name || 'unknown'}`);
    } else {
      console.warn(`⚠️  Notification service responded ${response.status} for ${eventType}`);
    }
  } catch (error) {
    console.error(`⚠️  Failed to notify for ${eventType}: ${error.message}`);
  }
};

/**
 * Notify patient that payment completed successfully.
 */
export const notifyPaymentSuccess = async ({ patientId, appointmentId, amount, currency, transactionId }) => {
  const patient = await fetchPatientContact(patientId);
  await sendToNotificationService('PAYMENT_SUCCESS', patient, {
    amount,
    currency,
    transactionId,
    appointmentId,
  });
};

/**
 * Notify patient that payment failed.
 */
export const notifyPaymentFailure = async ({ patientId, appointmentId, reason }) => {
  const patient = await fetchPatientContact(patientId);
  await sendToNotificationService('PAYMENT_FAILED', patient, {
    appointmentId,
    reason: reason || 'Unknown reason',
  });
};
