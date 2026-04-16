import { Router } from "express";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

import {
  register,
  login,
  registerRules,
  loginRules,
} from "../controllers/authController.js";

import {
  getSpecialties,
  listDoctors,
  getMe,
  updateMe,
  deleteMe,
  getDoctorById,
  getInternalDoctorContact,
  verifyDoctor,
} from "../controllers/doctorController.js";

import {
  createSlot,
  getMySlots,
  getDoctorAvailability,
  updateSlot,
  deleteSlot,
} from "../controllers/availabilityController.js";

import {
  createPrescription,
  getDoctorPrescriptions,
  getPatientPrescriptions,
  getPrescriptionById,
} from "../controllers/prescriptionController.js";

import {
  getMyAppointments,
  acceptAppointment,
  rejectAppointment,
  completeAppointment,
} from "../controllers/appointmentProxyController.js";

const router = Router();

// ───────── Auth ─────────
router.post("/register", registerRules, register);
router.post("/login", loginRules, login);

// ───────── Public ─────────
router.get("/specialties", getSpecialties);
router.get("/", listDoctors);

// ───────── Doctor profile (self) ─────────
router.get("/me", auth, roleCheck("doctor"), getMe);
router.put("/me", auth, roleCheck("doctor"), updateMe);
router.delete("/me", auth, roleCheck("doctor"), deleteMe);

// ───────── Availability (self) ─────────
router.post("/availability", auth, roleCheck("doctor"), createSlot);
router.get("/availability/mine", auth, roleCheck("doctor"), getMySlots);
router.put("/availability/:slotId", auth, roleCheck("doctor"), updateSlot);
router.delete("/availability/:slotId", auth, roleCheck("doctor"), deleteSlot);

// ───────── Prescriptions ─────────
router.post("/prescriptions", auth, roleCheck("doctor"), createPrescription);
router.get(
  "/prescriptions/mine",
  auth,
  roleCheck("doctor"),
  getDoctorPrescriptions
);
router.get(
  "/prescriptions/patient/:patientId",
  auth,
  getPatientPrescriptions
);
router.get("/prescriptions/:id", auth, getPrescriptionById);

// ───────── Appointment proxy (doctor's view) ─────────
router.get(
  "/appointments/mine",
  auth,
  roleCheck("doctor"),
  getMyAppointments
);
router.put(
  "/appointments/:id/accept",
  auth,
  roleCheck("doctor"),
  acceptAppointment
);
router.put(
  "/appointments/:id/reject",
  auth,
  roleCheck("doctor"),
  rejectAppointment
);
router.put(
  "/appointments/:id/complete",
  auth,
  roleCheck("doctor"),
  completeAppointment
);

// ───────── Admin ─────────
router.put("/:id/verify", auth, roleCheck("admin"), verifyDoctor);

// ───────── Public doctor detail (keep last to avoid shadowing) ─────────
router.get("/internal/:id/contact", getInternalDoctorContact);
router.get("/:id", getDoctorById);
router.get("/:id/availability", getDoctorAvailability);

export default router;
