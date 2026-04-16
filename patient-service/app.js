import express from "express";
import cors from "cors";
import morgan from "morgan";
import patientRoutes from "./routes/patientRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// ──── Global Middleware ────
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ──── Health Check ────
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "Patient Service",
    status: "running",
  });
});

// ──── Routes ────
app.use("/api/patients", patientRoutes);

// ──── 404 Handler ────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ──── Central Error Handler ────
app.use(errorHandler);

export default app;
