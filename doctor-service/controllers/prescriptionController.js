import Prescription from "../models/Prescription.js";
import Doctor from "../models/Doctor.js";

/**
 * @route POST /api/doctors/prescriptions
 * Doctor issues a prescription.
 */
export const createPrescription = async (req, res, next) => {
  try {
    const {
      patientId,
      appointmentId,
      patientName,
      diagnosis,
      medications,
      notes,
    } = req.body;

    if (!patientId) {
      return res
        .status(400)
        .json({ success: false, message: "patientId is required." });
    }
    if (!Array.isArray(medications) || medications.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one medication is required." });
    }

    const doctor = await Doctor.findById(req.user.id);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found." });
    }

    const prescription = await Prescription.create({
      doctorId: doctor._id,
      doctorName: doctor.name,
      patientId,
      patientName: patientName || "",
      appointmentId,
      diagnosis,
      medications,
      notes,
    });

    res.status(201).json({ success: true, prescription });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/doctors/prescriptions/mine
 */
export const getDoctorPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({
      doctorId: req.user.id,
    }).sort({ issuedDate: -1 });
    res
      .status(200)
      .json({ success: true, count: prescriptions.length, prescriptions });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/doctors/prescriptions/patient/:patientId
 * Used by Patient Service via inter-service call.
 */
export const getPatientPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({
      patientId: req.params.patientId,
    }).sort({ issuedDate: -1 });
    res
      .status(200)
      .json({ success: true, count: prescriptions.length, prescriptions });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/doctors/prescriptions/:id
 */
export const getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res
        .status(404)
        .json({ success: false, message: "Prescription not found." });
    }
    res.status(200).json({ success: true, prescription });
  } catch (error) {
    next(error);
  }
};
