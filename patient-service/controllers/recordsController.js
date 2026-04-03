/**
 * @desc    Get medical history (mock / placeholder)
 * @route   GET /api/patients/history
 */
export const getHistory = async (_req, res, _next) => {
  const mockHistory = [
    {
      id: 1,
      date: "2025-01-15",
      diagnosis: "Seasonal Flu",
      doctor: "Dr. Smith",
      notes: "Prescribed rest and fluids. Follow-up in 1 week.",
    },
    {
      id: 2,
      date: "2025-03-22",
      diagnosis: "Sprained Ankle",
      doctor: "Dr. Patel",
      notes: "X-ray clear. Ice and elevation recommended.",
    },
    {
      id: 3,
      date: "2025-06-10",
      diagnosis: "Routine Checkup",
      doctor: "Dr. Kim",
      notes: "All vitals normal. Next checkup in 6 months.",
    },
  ];

  res.status(200).json({
    success: true,
    message: "Mock medical history. Will be replaced by inter-service calls.",
    count: mockHistory.length,
    history: mockHistory,
  });
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
