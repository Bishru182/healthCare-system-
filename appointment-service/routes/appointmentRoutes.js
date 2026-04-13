import { Router } from "express";

// Middleware
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

// Controllers
import {
  createAppointment,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
} from "../controllers/appointmentController.js";

const router = Router();

// ──── Patient History (used by Patient Service via inter-service call) ────
router.get("/patient/:patientId", auth, getPatientAppointments);

// ──── Doctor Dashboard ────
router.get("/doctor/:doctorId", auth, getDoctorAppointments);

// ──── CRUD ────
router.post("/", auth, roleCheck("patient"), createAppointment);
router.get("/:id", auth, getAppointmentById);
router.put("/:id", auth, updateAppointment);
router.delete("/:id", auth, deleteAppointment);

// ──── Status Management (doctor only) ────
router.put("/:id/status", auth, roleCheck("doctor"), updateAppointmentStatus);

export default router;
