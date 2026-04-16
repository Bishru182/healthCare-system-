/* eslint-disable */
/**
 * Integration tests for Doctor and Telemedicine services.
 *
 * Spins up three separate in-memory MongoDB replicas (one per service),
 * starts the real Express apps on random ports, shares one JWT secret,
 * and exercises the full auth → availability → prescription → video session
 * flow end-to-end against the Appointment Service.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import axios from "axios";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const JWT_SECRET = "medico-test-secret";

let passed = 0;
let failed = 0;
const log = (ok, msg, extra = "") => {
  if (ok) {
    passed++;
    console.log(`  ✅ ${msg}${extra ? " — " + extra : ""}`);
  } else {
    failed++;
    console.log(`  ❌ ${msg}${extra ? " — " + extra : ""}`);
  }
};

const assert = (cond, msg, extra = "") => log(!!cond, msg, extra);

async function bootService({ name, serviceDir, mongoUri, port, extraEnv = {} }) {
  // Each service uses ESM, so we must set env BEFORE importing.
  process.env.MONGO_URI = mongoUri;
  process.env.PORT = String(port);
  process.env.JWT_SECRET = JWT_SECRET;
  for (const [k, v] of Object.entries(extraEnv)) process.env[k] = v;

  const serverPath = url
    .pathToFileURL(path.join(serviceDir, "server.js"))
    .toString();
  // Because `server.js` auto-calls `app.listen(PORT)`, we don't import it directly.
  // Instead we import `app.js` + connect to Mongo ourselves.
  const { default: app } = await import(
    url.pathToFileURL(path.join(serviceDir, "app.js")).toString()
  );
  const { default: connectDB } = await import(
    url.pathToFileURL(path.join(serviceDir, "config/db.js")).toString()
  );
  await connectDB();
  const server = app.listen(port);
  await new Promise((r) => server.on("listening", r));
  console.log(`  → ${name} up on :${port}`);
  return { app, server };
}

async function main() {
  console.log("▶ Starting in-memory MongoDB instances…");
  const mongoDoctor = await MongoMemoryServer.create();
  const mongoTele = await MongoMemoryServer.create();
  const mongoAppt = await MongoMemoryServer.create();
  console.log("  • doctor:", mongoDoctor.getUri());
  console.log("  • telemedicine:", mongoTele.getUri());
  console.log("  • appointment:", mongoAppt.getUri());

  const appointmentPort = 4010;
  const doctorPort = 4011;
  const telePort = 4012;

  console.log("\n▶ Booting Appointment Service…");
  await bootService({
    name: "appointment-service",
    serviceDir: path.join(repoRoot, "appointment-service"),
    mongoUri: mongoAppt.getUri(),
    port: appointmentPort,
  });

  console.log("▶ Booting Doctor Service…");
  await bootService({
    name: "doctor-service",
    serviceDir: path.join(repoRoot, "doctor-service"),
    mongoUri: mongoDoctor.getUri(),
    port: doctorPort,
    extraEnv: {
      APPOINTMENT_SERVICE_URL: `http://localhost:${appointmentPort}`,
    },
  });

  console.log("▶ Booting Telemedicine Service…");
  await bootService({
    name: "telemedicine-service",
    serviceDir: path.join(repoRoot, "telemedicine-service"),
    mongoUri: mongoTele.getUri(),
    port: telePort,
    extraEnv: {
      APPOINTMENT_SERVICE_URL: `http://localhost:${appointmentPort}`,
      JITSI_DOMAIN: "meet.jit.si",
    },
  });

  const DOC = `http://localhost:${doctorPort}/api/doctors`;
  const APPT = `http://localhost:${appointmentPort}/api/appointments`;
  const TELE = `http://localhost:${telePort}/api/telemedicine`;

  // ---------------------- Doctor flow ----------------------
  console.log("\n▶ Doctor Service tests");

  // Health check
  try {
    const { data } = await axios.get(`http://localhost:${doctorPort}/`);
    assert(
      data.service === "Doctor Management Service",
      "Doctor health check"
    );
  } catch (e) {
    assert(false, "Doctor health check", e.message);
  }

  // Specialties list
  try {
    const { data } = await axios.get(`${DOC}/specialties`);
    assert(
      Array.isArray(data.specialties) && data.specialties.length > 0,
      "Fetch specialties",
      `got ${data.specialties?.length || 0}`
    );
  } catch (e) {
    assert(false, "Fetch specialties", e.message);
  }

  // Register doctor
  let doctorToken, doctorId;
  try {
    const { data } = await axios.post(`${DOC}/register`, {
      name: "Saman Perera",
      email: `doc-${Date.now()}@test.local`,
      password: "secret123",
      specialty: "Cardiologist",
      phone: "+94770000001",
      licenseNumber: "SLMC/9876",
      experience: 10,
      consultationFee: 3000,
      bio: "Senior cardiologist with 10+ years of experience.",
    });
    doctorToken = data.token;
    doctorId = data.doctor.id;
    assert(!!doctorToken, "Register doctor", `id=${doctorId}`);
  } catch (e) {
    assert(false, "Register doctor", e.response?.data?.message || e.message);
  }

  const docAuth = { Authorization: `Bearer ${doctorToken}` };

  // Fetch own profile
  try {
    const { data } = await axios.get(`${DOC}/me`, { headers: docAuth });
    assert(data.doctor.email.includes("@test.local"), "Doctor GET /me");
  } catch (e) {
    assert(false, "Doctor GET /me", e.response?.data?.message || e.message);
  }

  // Update profile
  try {
    const { data } = await axios.put(
      `${DOC}/me`,
      { experience: 12, consultationFee: 3500 },
      { headers: docAuth }
    );
    assert(
      data.doctor.experience === 12 && data.doctor.consultationFee === 3500,
      "Doctor PUT /me"
    );
  } catch (e) {
    assert(false, "Doctor PUT /me", e.response?.data?.message || e.message);
  }

  // Add availability
  let slotId;
  try {
    const { data } = await axios.post(
      `${DOC}/availability`,
      {
        dayOfWeek: "Monday",
        startTime: "09:00",
        endTime: "12:00",
        slotDurationMinutes: 30,
      },
      { headers: docAuth }
    );
    slotId = data.slot._id;
    assert(!!slotId, "Add availability slot", `id=${slotId}`);
  } catch (e) {
    assert(
      false,
      "Add availability slot",
      e.response?.data?.message || e.message
    );
  }

  // List availability (public)
  try {
    const { data } = await axios.get(`${DOC}/${doctorId}/availability`);
    assert(data.slots.length > 0, "Public doctor availability");
  } catch (e) {
    assert(false, "Public doctor availability", e.message);
  }

  // List all doctors (public)
  try {
    const { data } = await axios.get(`${DOC}`);
    assert(
      data.doctors.some((d) => d._id === doctorId),
      "Public list doctors",
      `count=${data.doctors.length}`
    );
  } catch (e) {
    assert(false, "Public list doctors", e.message);
  }

  // ------------------- Appointment -------------------
  console.log("\n▶ Appointment + Doctor-proxy tests");

  // Create a fake patient token (matching the appointment-service JWT contract)
  const jwt = await import("jsonwebtoken");
  const patientId = "64b8c4a0f1234567890abcde";
  const patientToken = jwt.default.sign(
    { id: patientId, role: "patient" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  let appointmentId;
  try {
    const future = new Date();
    future.setDate(future.getDate() + 2);
    const { data } = await axios.post(
      `${APPT}`,
      {
        doctorId,
        date: future.toISOString(),
        time: "09:30 AM",
        reason: "Chest pain evaluation",
      },
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    appointmentId = data.appointment._id;
    assert(!!appointmentId, "Patient books appointment", `id=${appointmentId}`);
  } catch (e) {
    assert(
      false,
      "Patient books appointment",
      e.response?.data?.message || e.message
    );
  }

  // Doctor lists own appointments via doctor-service proxy
  try {
    const { data } = await axios.get(`${DOC}/appointments/mine`, {
      headers: docAuth,
    });
    assert(
      data.appointments?.some((a) => a._id === appointmentId),
      "Doctor GET /appointments/mine (proxy)"
    );
  } catch (e) {
    assert(
      false,
      "Doctor GET /appointments/mine",
      e.response?.data?.message || e.message
    );
  }

  // Doctor accepts appointment
  try {
    const { data } = await axios.put(
      `${DOC}/appointments/${appointmentId}/accept`,
      {},
      { headers: docAuth }
    );
    assert(
      data.appointment.status === "confirmed",
      "Doctor accepts appointment"
    );
  } catch (e) {
    assert(
      false,
      "Doctor accepts appointment",
      e.response?.data?.message || e.message
    );
  }

  // ----------------- Telemedicine -----------------
  console.log("\n▶ Telemedicine tests");

  let sessionId;
  try {
    const { data } = await axios.post(
      `${TELE}/sessions`,
      { appointmentId },
      { headers: docAuth }
    );
    sessionId = data.session._id;
    assert(
      !!sessionId && data.session.roomName.startsWith("medico-"),
      "Doctor creates video session",
      `room=${data.session.roomName}`
    );
  } catch (e) {
    assert(
      false,
      "Doctor creates video session",
      e.response?.data?.message || e.message
    );
  }

  // Idempotent create (should return same session)
  try {
    const { data } = await axios.post(
      `${TELE}/sessions`,
      { appointmentId },
      { headers: docAuth }
    );
    assert(data.session._id === sessionId, "Creating session is idempotent");
  } catch (e) {
    assert(false, "Creating session is idempotent", e.message);
  }

  // Patient fetches join info for same session
  try {
    const { data } = await axios.get(`${TELE}/sessions/${sessionId}/join-info`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(
      data.joinInfo?.roomName && data.joinInfo?.domain === "meet.jit.si",
      "Patient fetches Jitsi join info"
    );
    assert(
      data.joinInfo.isModerator === false,
      "Patient is not moderator"
    );
  } catch (e) {
    assert(false, "Patient fetches join info", e.response?.data?.message || e.message);
  }

  // Doctor starts session
  try {
    const { data } = await axios.put(
      `${TELE}/sessions/${sessionId}/start`,
      {},
      { headers: docAuth }
    );
    assert(data.session.status === "in_progress", "Start session → in_progress");
  } catch (e) {
    assert(false, "Start session", e.response?.data?.message || e.message);
  }

  // Doctor ends session with notes
  try {
    const { data } = await axios.put(
      `${TELE}/sessions/${sessionId}/end`,
      { notes: "Patient reported improvement. Follow-up in 2 weeks." },
      { headers: docAuth }
    );
    assert(
      data.session.status === "completed" && data.session.consultationNotes,
      "End session with notes"
    );
  } catch (e) {
    assert(false, "End session", e.response?.data?.message || e.message);
  }

  // Telemedicine list for doctor
  try {
    const { data } = await axios.get(`${TELE}/sessions/mine`, {
      headers: docAuth,
    });
    assert(data.sessions.length >= 1, "Doctor lists my sessions");
  } catch (e) {
    assert(false, "Doctor lists my sessions", e.message);
  }

  // Unauthorized random user can't fetch join info
  try {
    const strangerToken = jwt.default.sign(
      { id: "000000000000000000000000", role: "patient" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    try {
      await axios.get(`${TELE}/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${strangerToken}` },
      });
      assert(false, "Unauthorized stranger blocked");
    } catch (e) {
      assert(e.response?.status === 403, "Unauthorized stranger blocked", `status=${e.response?.status}`);
    }
  } catch (e) {
    assert(false, "Stranger block check", e.message);
  }

  // ----------------- Prescription -----------------
  console.log("\n▶ Prescription tests");

  let prescriptionId;
  try {
    const { data } = await axios.post(
      `${DOC}/prescriptions`,
      {
        patientId,
        appointmentId,
        patientName: "John Doe",
        diagnosis: "Mild hypertension",
        medications: [
          {
            name: "Amlodipine",
            dosage: "5mg",
            frequency: "Once daily",
            duration: "30 days",
            instructions: "Morning, after breakfast",
          },
        ],
        notes: "Reduce sodium intake. Re-evaluate in 1 month.",
      },
      { headers: docAuth }
    );
    prescriptionId = data.prescription._id;
    assert(!!prescriptionId, "Issue prescription", `id=${prescriptionId}`);
  } catch (e) {
    assert(false, "Issue prescription", e.response?.data?.message || e.message);
  }

  // Patient-facing lookup of prescriptions
  try {
    const { data } = await axios.get(
      `${DOC}/prescriptions/patient/${patientId}`,
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    assert(
      data.prescriptions.some((p) => p._id === prescriptionId),
      "Patient can list prescriptions"
    );
  } catch (e) {
    assert(
      false,
      "Patient list prescriptions",
      e.response?.data?.message || e.message
    );
  }

  // ------------- Final summary -------------
  console.log(`\n▶ Summary: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
