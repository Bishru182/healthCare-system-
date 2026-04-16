import Patient from "../models/Patient.js";
import Report from "../models/Report.js";
import { cloudinary } from "../config/cloudinary.js";

const hasValidInternalApiKey = (req) => {
  const expected = process.env.INTER_SERVICE_API_KEY;
  const provided = req.headers["x-internal-api-key"];
  return Boolean(expected) && typeof provided === "string" && provided === expected;
};

/**
 * @desc    Get patient contact details for trusted internal services
 * @route   GET /api/patients/internal/:id/contact
 */
export const getInternalPatientContact = async (req, res, next) => {
  try {
    if (!hasValidInternalApiKey(req)) {
      return res.status(401).json({ success: false, message: "Unauthorized internal request." });
    }

    const patient = await Patient.findById(req.params.id).select("name email phone");
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found." });
    }

    return res.status(200).json({
      success: true,
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged-in patient profile
 * @route   GET /api/patients/me
 */
export const getProfile = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.patient._id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found." });
    }

    res.status(200).json({ success: true, patient });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update patient profile
 * @route   PUT /api/patients/me
 */
export const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ["name", "email", "age", "phone"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    const patient = await Patient.findByIdAndUpdate(req.patient._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      patient,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete patient account (and all associated reports from DB & Cloudinary)
 * @route   DELETE /api/patients/me
 */
export const deleteAccount = async (req, res, next) => {
  try {
    // Delete reports from Cloudinary
    const reports = await Report.find({ patientId: req.patient._id });
    for (const report of reports) {
      //await cloudinary.uploader.destroy(report.publicId, { resource_type: "raw" });
      await cloudinary.uploader.destroy(report.publicId);
    }

    // Delete reports from DB
    await Report.deleteMany({ patientId: req.patient._id });

    // Delete the patient
    await Patient.findByIdAndDelete(req.patient._id);

    res.status(200).json({
      success: true,
      message: "Account and all associated data deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
