import axios from "axios";

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL;
const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL;

/**
 * @desc    Get patient appointment history via Appointment Service
 * @route   GET /api/patients/history
 */
export const getHistory = async (req, res, _next) => {
  try {
    const patientId = req.patient._id;
    const authHeader = req.headers.authorization;

    if (!APPOINTMENT_SERVICE_URL) {
      console.error("[PatientService] APPOINTMENT_SERVICE_URL is not configured.");
      return res.status(500).json({
        success: false,
        message: "Appointment Service URL is not configured.",
      });
    }

    const response = await axios.get(
      `${APPOINTMENT_SERVICE_URL}/api/appointments/patient/${patientId}`,
      {
        headers: { Authorization: authHeader },
        timeout: 5000,
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};

    console.error(
      `[PatientService] Failed to fetch history: ${error.message}`,
      { status, patientId: req.patient?._id }
    );

    return res.status(status).json({
      success: false,
      message: errorData.message || "Failed to retrieve appointment history.",
    });
  }
};

/**
 * @desc    Get prescriptions from Doctor Service
 * @route   GET /api/patients/prescriptions
 */
export const getPrescriptions = async (req, res, _next) => {
  try {
    const patientId = req.patient._id;
    const authHeader = req.headers.authorization;

    if (!DOCTOR_SERVICE_URL) {
      return res.status(200).json({
        success: true,
        count: 0,
        prescriptions: [],
        message: "Doctor Service URL not configured.",
      });
    }

    const response = await axios.get(
      `${DOCTOR_SERVICE_URL}/api/doctors/prescriptions/patient/${patientId}`,
      {
        headers: { Authorization: authHeader },
        timeout: 5000,
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};

    console.error(
      `[PatientService] Failed to fetch prescriptions: ${error.message}`
    );

    return res.status(status).json({
      success: false,
      message: errorData.message || "Failed to retrieve prescriptions.",
    });
  }
};
