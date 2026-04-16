import axios from "axios";

/**
 * Proxy to Appointment Service — fetch all appointments for the logged-in doctor
 * so the doctor dashboard sees their schedule.
 * Uses a lightweight local read-through cache via our own model if Appointment service is unreachable.
 *
 * @route GET /api/doctors/appointments/mine
 */
export const getMyAppointments = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const url = `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/doctor/${req.user.id}`;

    const { status, upcoming } = req.query;
    const params = {};
    if (status) params.status = status;
    if (upcoming) params.upcoming = upcoming;

    const response = await axios.get(url, {
      headers: { Authorization: authHeader },
      params,
      timeout: 5000,
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || {};
    return res.status(status).json({
      success: false,
      message: data.message || "Could not fetch appointments.",
    });
  }
};

/**
 * @route PUT /api/doctors/appointments/:id/accept
 * Convenience wrapper -> appointment-service PUT /:id/status { status: 'confirmed' }
 */
export const acceptAppointment = async (req, res, next) => {
  return updateAppointmentStatus(req, res, "confirmed");
};

/**
 * @route PUT /api/doctors/appointments/:id/reject
 * We map "reject" to cancellation.
 */
export const rejectAppointment = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const url = `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/${req.params.id}`;
    const response = await axios.delete(url, {
      headers: { Authorization: authHeader },
      timeout: 5000,
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || {};
    return res.status(status).json({
      success: false,
      message: data.message || "Could not reject appointment.",
    });
  }
};

/**
 * @route PUT /api/doctors/appointments/:id/complete
 */
export const completeAppointment = async (req, res, next) => {
  return updateAppointmentStatus(req, res, "completed");
};

async function updateAppointmentStatus(req, res, status) {
  try {
    const authHeader = req.headers.authorization;
    const url = `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/${req.params.id}/status`;
    const response = await axios.put(
      url,
      { status },
      {
        headers: { Authorization: authHeader },
        timeout: 5000,
      }
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    const st = error.response?.status || 500;
    const data = error.response?.data || {};
    return res.status(st).json({
      success: false,
      message: data.message || "Could not update appointment.",
    });
  }
}
