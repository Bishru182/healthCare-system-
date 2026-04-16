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

    case 'APPOINTMENT_CONFIRMED':
      return {
        subject: 'Doctor Confirmed Your Appointment – MediConnect',
        message: `Dr. ${data.doctorName} confirmed your appointment on ${data.date} at ${data.time}.`,
      };

    case 'CONSULTATION_COMPLETED':
      return {
        subject: 'Consultation Completed – MediConnect',
        message: 'Your consultation is complete. Check your dashboard for prescriptions.',
      };

    case 'PAYMENT_SUCCESS':
      return {
        subject: 'Payment Received – MediConnect',
        message: `Payment of ${data.currency || 'LKR'} ${data.amount} received successfully. Transaction ID: ${data.transactionId || 'N/A'}.`,
      };

    case 'PAYMENT_FAILED':
      return {
        subject: 'Payment Failed – MediConnect',
        message: `Your payment could not be processed. Reason: ${data.reason || 'Unknown'}. Please try again or contact support.`,
      };

    case 'APPOINTMENT_CANCELLED':
      return {
        subject: 'Appointment Cancelled – MediConnect',
        message: `Your appointment on ${data.date} has been cancelled.`,
      };

    case 'DOCTOR_VERIFIED':
      return {
        subject: 'Account Verified – MediConnect',
        message: 'Congratulations! Your doctor account has been verified by the admin. You can now accept appointments.',
      };

    default:
      return {
        subject: 'Notification – MediConnect',
        message: `You have a new notification: ${eventType}`,
      };
  }
};

export default getTemplate;
