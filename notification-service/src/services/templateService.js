// src/services/templateService.js
// ─────────────────────────────────────────────
// Returns a { subject, message } object for the
// given event type, with dynamic data interpolation.
// ─────────────────────────────────────────────

/**
 * Build notification subject & message for a known event type.
 *
 * @param {string} eventType – One of the supported event constants.
 * @param {object} data      – Dynamic values such as doctorName, date, time, amount.
 * @returns {{ subject: string, message: string }}
 */
const getTemplate = (eventType, data = {}) => {
  switch (eventType) {
    case 'APPOINTMENT_BOOKED':
      return {
        subject: 'Appointment Confirmed – MediConnect',
        message: `Confirmed! Appointment with Dr. ${data.doctorName} on ${data.date} at ${data.time}.`,
      };

    case 'CONSULTATION_COMPLETED':
      return {
        subject: 'Consultation Completed – MediConnect',
        message: 'Your consultation is complete. Check your dashboard for prescriptions.',
      };

    case 'PAYMENT_SUCCESS':
      return {
        subject: 'Payment Received – MediConnect',
        message: `Payment of LKR ${data.amount} received successfully.`,
      };

    case 'APPOINTMENT_CANCELLED':
      return {
        subject: 'Appointment Cancelled – MediConnect',
        message: `Your appointment on ${data.date} has been cancelled.`,
      };

    default:
      return {
        subject: 'Notification – MediConnect',
        message: `You have a new notification: ${eventType}`,
      };
  }
};

export default getTemplate;
