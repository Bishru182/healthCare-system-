import express from "express";
import cors from "cors";
import morgan from "morgan";
import sessionRoutes from "./routes/sessionRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:4173"],
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
