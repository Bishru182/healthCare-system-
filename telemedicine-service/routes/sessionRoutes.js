import { Router } from "express";
import auth from "../middleware/auth.js";
import {
  createSession,
  getSessionById,
  getSessionByAppointment,
  getMySessions,
  startSession,
  endSession,
  getJoinInfo,
} from "../controllers/sessionController.js";

const router = Router();

router.post("/sessions", auth, createSession);
router.get("/sessions/mine", auth, getMySessions);
router.get(
  "/sessions/appointment/:appointmentId",
  auth,
  getSessionByAppointment
);
router.get("/sessions/:id", auth, getSessionById);
router.get("/sessions/:id/join-info", auth, getJoinInfo);
router.put("/sessions/:id/start", auth, startSession);
router.put("/sessions/:id/end", auth, endSession);

export default router;
