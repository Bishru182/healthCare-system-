import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Session from "../models/Session.js";

const JITSI_DOMAIN = process.env.JITSI_DOMAIN || "meet.jit.si";

/**
 * Verify the appointment exists and belongs to the caller (or their doctor).
 */
async function fetchAppointment(appointmentId, authHeader) {
  const url = `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/${appointmentId}`;
  const { data } = await axios.get(url, {
    headers: { Authorization: authHeader },
    timeout: 5000,
  });
  return data.appointment;
}

/**
 * @route POST /api/telemedicine/sessions
 * Body: { appointmentId }
 * Idempotent: returns existing session if one exists for the appointment.
 */
export const createSession = async (req, res, next) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res
        .status(400)
        .json({ success: false, message: "appointmentId is required." });
    }

    let session = await Session.findOne({ appointmentId });
    if (session) {
      return res.status(200).json({ success: true, session });
    }

    // Fetch appointment details via appointment-service
    let appointment;
    try {
      appointment = await fetchAppointment(
        appointmentId,
        req.headers.authorization
      );
    } catch (err) {
      const status = err.response?.status || 502;
      return res.status(status).json({
        success: false,
        message:
          err.response?.data?.message ||
          "Unable to verify appointment with Appointment Service.",
      });
    }

    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    // Allow only the doctor or patient involved in the appointment
    const userId = req.user.id;
    const isDoctor = String(appointment.doctorId) === String(userId);
    const isPatient = String(appointment.patientId) === String(userId);
    if (!isDoctor && !isPatient) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this appointment.",
      });
    }

    // Build a unique but human-readable room name
    const roomName = `medico-${appointmentId}-${uuidv4().slice(0, 8)}`;
    const meetingUrl = `https://${JITSI_DOMAIN}/${roomName}`;

    session = await Session.create({
      appointmentId,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      roomName,
      jitsiDomain: JITSI_DOMAIN,
      meetingUrl,
      scheduledAt: appointment.date,
      status: "scheduled",
    });

    res.status(201).json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/telemedicine/sessions/:id
 */
export const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found." });
    }
    // Only doctor or patient can view
    const userId = req.user.id;
    if (
      String(session.doctorId) !== String(userId) &&
      String(session.patientId) !== String(userId) &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden." });
    }
    res.status(200).json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/telemedicine/sessions/appointment/:appointmentId
 */
export const getSessionByAppointment = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      appointmentId: req.params.appointmentId,
    });
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "No session for this appointment." });
    }
    res.status(200).json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/telemedicine/sessions/mine
 * Lists sessions for current user (patient or doctor).
 */
export const getMySessions = async (req, res, next) => {
  try {
    const filter =
      req.user.role === "doctor"
        ? { doctorId: req.user.id }
        : { patientId: req.user.id };

    const sessions = await Session.find(filter).sort({ scheduledAt: -1 });
    res
      .status(200)
      .json({ success: true, count: sessions.length, sessions });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/telemedicine/sessions/:id/start
 */
export const startSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found." });
    }

    const userId = req.user.id;
    if (
      String(session.doctorId) !== String(userId) &&
      String(session.patientId) !== String(userId)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden." });
    }

    if (session.status === "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Session already completed." });
    }

    session.status = "in_progress";
    if (!session.startedAt) session.startedAt = new Date();
    await session.save();

    res.status(200).json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/telemedicine/sessions/:id/end
 * Body: { notes } (optional) — doctor can add consultation notes.
 */
export const endSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found." });
    }

    const userId = req.user.id;
    if (
      String(session.doctorId) !== String(userId) &&
      String(session.patientId) !== String(userId)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden." });
    }

    session.status = "completed";
    session.endedAt = new Date();
    if (session.startedAt) {
      session.durationSeconds = Math.floor(
        (session.endedAt - session.startedAt) / 1000
      );
    }
    if (req.user.role === "doctor" && req.body.notes) {
      session.consultationNotes = req.body.notes;
    }
    await session.save();

    // Best-effort: mark appointment as completed on Appointment Service
    if (req.user.role === "doctor") {
      try {
        await axios.put(
          `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/${session.appointmentId}/status`,
          { status: "completed" },
          {
            headers: { Authorization: req.headers.authorization },
            timeout: 5000,
          }
        );
      } catch (e) {
        console.warn(
          "[TelemedicineService] Could not mark appointment completed:",
          e.message
        );
      }
    }

    res.status(200).json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/telemedicine/sessions/:id/join-info
 * Returns the Jitsi room details the client needs to embed the meeting.
 */
export const getJoinInfo = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found." });
    }

    const userId = req.user.id;
    const isDoctor = String(session.doctorId) === String(userId);
    const isPatient = String(session.patientId) === String(userId);
    if (!isDoctor && !isPatient) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden." });
    }

    res.status(200).json({
      success: true,
      joinInfo: {
        roomName: session.roomName,
        domain: session.jitsiDomain,
        meetingUrl: session.meetingUrl,
        isModerator: isDoctor,
        displayName: isDoctor ? "Doctor" : "Patient",
      },
    });
  } catch (error) {
    next(error);
  }
};
