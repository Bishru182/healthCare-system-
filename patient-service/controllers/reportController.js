import Report from "../models/Report.js";
import { cloudinary } from "../config/cloudinary.js";

/**
 * @desc    Upload a medical report
 * @route   POST /api/patients/reports
 */
export const uploadReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const report = await Report.create({
      patientId: req.patient._id,
      fileUrl: req.file.path,
      publicId: req.file.filename,
    });

    res.status(201).json({
      success: true,
      message: "Report uploaded successfully.",
      report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all reports for logged-in patient
 * @route   GET /api/patients/reports
 */
export const getReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ patientId: req.patient._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({ success: true, count: reports.length, reports });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single report by ID
 * @route   GET /api/patients/reports/:id
 */
export const getReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }

    // Ownership check
    if (report.patientId.toString() !== req.patient._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    res.status(200).json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a report (DB + Cloudinary)
 * @route   DELETE /api/patients/reports/:id
 */
export const deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }

    // Ownership check
    if (report.patientId.toString() !== req.patient._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Delete from Cloudinary
    //await cloudinary.uploader.destroy(report.publicId, { resource_type: "raw" });
    await cloudinary.uploader.destroy(report.publicId);

    // Delete from DB
    await Report.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Report deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
