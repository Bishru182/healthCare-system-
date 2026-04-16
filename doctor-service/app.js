import express from "express";
import cors from "cors";
import morgan from "morgan";
import doctorRoutes from "./routes/doctorRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:30173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:30173",
];

const allowedOrigins = (process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : defaultAllowedOrigins
)
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "Doctor Management Service",
    status: "running",
  });
});

app.use("/api/doctors", doctorRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use(errorHandler);

export default app;
