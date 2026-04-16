import Appointment from "../models/Appointment.js";
import {
  queueAppointmentBookedNotification,
  queueConsultationCompletedNotification,
} from "../services/notificationIntegrationService.js";

// ──── Helper: normalize a Date to midnight UTC (strips time) ────
const toDateOnly = (value) => {
  const d = new Date(value);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * @desc    Create a new appointment (patient only)
 * @route   POST /api/appointments
 */
export const createAppointment = async (req, res, next) => {
  try {
    const { doctorId, date, time, reason } = req.body;

    if (!doctorId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "doctorId, date, and time are required.",
      });
    }

    // Prevent booking in the past
    const appointmentDate = toDateOnly(date);
    if (appointmentDate < toDateOnly(new Date())) {
      return res.status(400).json({
        success: false,
        message: "Cannot book an appointment in the past.",
      });
    }

    const appointment = await Appointment.create({
      patientId: req.user.id,
      doctorId,
      date: appointmentDate,
      time,
      reason,
      status: "pending",
    });

    // Trigger inter-service notification over HTTP without blocking appointment creation.
    void queueAppointmentBookedNotification({
      appointment,
    });

    res.status(201).json({
      success: true,
      message: "Appointment created successfully.",
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get appointment by ID
 * @route   GET /api/appointments/:id
 */
export const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    res.status(200).json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update / reschedule appointment
 * @route   PUT /api/appointments/:id
 */
export const updateAppointment = async (req, res, next) => {
  try {
    const { date, time, reason } = req.body;
    const updates = {};

    if (date) {
      const newDate = toDateOnly(date);
      if (newDate < toDateOnly(new Date())) {
        return res.status(400).json({
          success: false,
          message: "Cannot reschedule to a past date.",
        });
      }
      updates.date = newDate;
    }
    if (time) updates.time = time;
    if (reason !== undefined) updates.reason = reason;

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update." });
    }

    // Reset status to pending on reschedule
    updates.status = "pending";

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    res.status(200).json({
      success: true,
      message: "Appointment updated successfully.",
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel (delete) appointment
 * @route   DELETE /api/appointments/:id
 */
export const deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a completed appointment.",
      });
    }

    appointment.status = "cancelled";
    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully.",
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all appointments for a patient
 * @route   GET /api/appointments/patient/:patientId
 */
export const getPatientAppointments = async (req, res, next) => {
  try {
    const { status, upcoming } = req.query;
    const filter = { patientId: req.params.patientId };

    if (status) filter.status = status;
    if (upcoming === "true") filter.date = { $gte: new Date() };

    const appointments = await Appointment.find(filter).sort({ date: 1, time: 1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all appointments for a doctor
 * @route   GET /api/appointments/doctor/:doctorId
 */
export const getDoctorAppointments = async (req, res, next) => {
  try {
    const { status, upcoming } = req.query;
    const filter = { doctorId: req.params.doctorId };

    if (status) filter.status = status;
    if (upcoming === "true") filter.date = { $gte: new Date() };

    const appointments = await Appointment.find(filter).sort({ date: 1, time: 1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update appointment status (doctor only)
 * @route   PUT /api/appointments/:id/status
 */
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ["confirmed", "completed"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Doctors can set status to: ${validStatuses.join(", ")}`,
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot update status of a cancelled appointment.",
      });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Appointment is already completed.",
      });
    }

    appointment.status = status;
    await appointment.save();

    if (status === "completed") {
      // Notify both patient and doctor when consultation is completed.
      void queueConsultationCompletedNotification({ appointment });
    }

    res.status(200).json({
      success: true,
      message: `Appointment status updated to '${status}'.`,
      appointment,
    });
  } catch (error) {
    next(error);
  }
};
