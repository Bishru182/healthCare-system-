import { Router } from "express";

// Middleware
import auth from "../middleware/auth.js";
import upload from "../middleware/upload.js";

// Controllers
import {
  register,
  login,
  registerRules,
  loginRules,
} from "../controllers/authController.js";

import {
  getProfile,
  updateProfile,
  deleteAccount,
  getInternalPatientContact,
} from "../controllers/patientController.js";

import {
  uploadReport,
  getReports,
  getReport,
  deleteReport,
} from "../controllers/reportController.js";

import {
  getHistory,
  getPrescriptions,
} from "../controllers/recordsController.js";

const router = Router();

// ──── Auth ────
router.post("/register", registerRules, register);
router.post("/login", loginRules, login);

// ──── Patient Profile (protected) ────
router.get("/internal/:id/contact", getInternalPatientContact);
router.get("/me", auth, getProfile);
router.put("/me", auth, updateProfile);
router.delete("/me", auth, deleteAccount);

// ──── Medical Reports (protected) ────
router.post("/reports", auth, upload.single("file"), uploadReport);
router.get("/reports", auth, getReports);
router.get("/reports/:id", auth, getReport);
router.delete("/reports/:id", auth, deleteReport);

// ──── Medical History & Prescriptions (protected) ────
router.get("/history", auth, getHistory);
router.get("/prescriptions", auth, getPrescriptions);

export default router;
