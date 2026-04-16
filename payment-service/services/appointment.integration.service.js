// services/appointment.integration.service.js
// ─────────────────────────────────────────────
// Inter-service communication with Appointment Service
// ─────────────────────────────────────────────

import axios from 'axios';
import paymentConfig from '../config/payment.js';

const buildAuthHeaders = (authorizationHeader) => {
  const headers = {};

  if (authorizationHeader) {
    headers.Authorization = authorizationHeader;
    return headers;
  }

  if (paymentConfig.appointmentServiceToken) {
    headers.Authorization = `Bearer ${paymentConfig.appointmentServiceToken}`;
  }

  return headers;
};

const extractAppointment = (responseData) => {
  if (!responseData) return null;
  return responseData.appointment || responseData.data || null;
};

export const fetchAppointmentById = async ({
  appointmentId,
  authorizationHeader,
}) => {
  if (!paymentConfig.appointmentServiceUrl) {
    throw new Error('APPOINTMENT_SERVICE_URL is not configured.');
  }

  const response = await axios.get(
    `${paymentConfig.appointmentServiceUrl}/api/appointments/${appointmentId}`,
    {
      headers: buildAuthHeaders(authorizationHeader),
      timeout: 5000,
    }
  );

  const appointment = extractAppointment(response.data);
  if (!appointment) {
    throw new Error('Appointment payload is missing in appointment-service response.');
  }

  return appointment;
};

export const markAppointmentAsConfirmed = async (appointmentId) => {
  if (!paymentConfig.appointmentServiceUrl) {
    console.warn('⚠️  APPOINTMENT_SERVICE_URL not set – skipping appointment update');
    return { updated: false, reason: 'missing-url' };
  }

  if (!paymentConfig.appointmentServiceToken) {
    console.warn(
      '⚠️  APPOINTMENT_SERVICE_TOKEN not set – cannot update appointment status after online payment'
    );
    return { updated: false, reason: 'missing-token' };
  }

  try {
    await axios.put(
      `${paymentConfig.appointmentServiceUrl}/api/appointments/${appointmentId}/status`,
      { status: 'confirmed' },
      {
        headers: buildAuthHeaders(),
        timeout: 5000,
      }
    );

    return { updated: true };
  } catch (error) {
    console.error(
      `⚠️  Failed to update appointment ${appointmentId} status: ${error.message}`
    );
    return { updated: false, reason: error.message };
  }
};
