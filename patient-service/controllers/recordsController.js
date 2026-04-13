import axios from "axios";

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL;

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
        headers: {
          Authorization: authHeader,
        },
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};

    console.error(
      `[PatientService] Failed to fetch history from Appointment Service: ${error.message}`,
      { status, patientId: req.patient?._id }
    );

    return res.status(status).json({
      success: false,
      message: errorData.message || "Failed to retrieve appointment history.",
    });
  }
};

/**
 * @desc    Get prescriptions (mock / placeholder)
 * @route   GET /api/patients/prescriptions
 */
export const getPrescriptions = async (_req, res, _next) => {
  const mockPrescriptions = [
    {
      id: 1,
      date: "2025-01-15",
      medication: "Amoxicillin 500mg",
      dosage: "1 tablet 3 times a day",
      duration: "7 days",
      prescribedBy: "Dr. Smith",
    },
    {
      id: 2,
      date: "2025-03-22",
      medication: "Ibuprofen 400mg",
      dosage: "1 tablet twice a day after meals",
      duration: "5 days",
      prescribedBy: "Dr. Patel",
    },
  ];

  res.status(200).json({
    success: true,
    message: "Mock prescriptions. Will be replaced by inter-service calls.",
    count: mockPrescriptions.length,
    prescriptions: mockPrescriptions,
  });
};
