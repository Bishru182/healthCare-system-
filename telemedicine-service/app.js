import express from "express";
import cors from "cors";
import morgan from "morgan";
import sessionRoutes from "./routes/sessionRoutes.js";
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "Telemedicine Service",
    status: "running",
    jitsiDomain: process.env.JITSI_DOMAIN || "meet.jit.si",
  });
});

app.use("/api/telemedicine", sessionRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use(errorHandler);

export default app;
