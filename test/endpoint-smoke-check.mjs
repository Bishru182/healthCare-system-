import crypto from "crypto";
import fs from "fs";
import path from "path";

const BASE = {
  frontend: "http://localhost:5173",
  patient: "http://localhost:3001",
  appointment: "http://localhost:3002",
  payment: "http://localhost:3003",
  doctor: "http://localhost:3004",
  telemedicine: "http://localhost:3005",
  notification: "http://localhost:5005",
};

const JWT_SECRET = process.env.JWT_SECRET || "medico-shared-jwt-secret-change-in-prod";
const INTERNAL_API_KEY = process.env.INTER_SERVICE_API_KEY || "medico-internal-key-change-me";

const results = [];
const state = {};

const randomHex = (bytes = 12) => crypto.randomBytes(bytes).toString("hex");
const randomEmail = (prefix) => `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@test.local`;

const dayOffsetIsoDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const signJwtHS256 = (payload, secret) => {
  const header = { alg: "HS256", typ: "JWT" };
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${encode(header)}.${encode(payload)}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(unsigned)
    .digest("base64url");
  return `${unsigned}.${signature}`;
};

const nowEpoch = Math.floor(Date.now() / 1000);
state.adminToken = signJwtHS256(
  {
    id: randomHex(12),
    email: "admin@test.local",
    role: "admin",
    iat: nowEpoch,
    exp: nowEpoch + 60 * 60 * 4,
  },
  JWT_SECRET
);

const toSummary = (body) => {
  if (body === undefined || body === null) return "";
  if (typeof body === "string") return body.slice(0, 220);
  try {
    return JSON.stringify(body).slice(0, 220);
  } catch {
    return String(body).slice(0, 220);
  }
};

const callApi = async (
  name,
  {
    method = "GET",
    url,
    token,
    headers = {},
    body,
    expectedStatuses = [200],
    timeoutMs = 15000,
  }
) => {
  const reqHeaders = { ...headers };

  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  let payload = undefined;
  if (body !== undefined && body !== null) {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    if (isFormData) {
      payload = body;
    } else {
      reqHeaders["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const raw = await res.text();
    let parsed;
    try {
      parsed = raw ? JSON.parse(raw) : undefined;
    } catch {
      parsed = raw;
    }

    const pass = expectedStatuses.includes(res.status);

    results.push({
      name,
      method,
      url,
      expected: expectedStatuses.join("/"),
      status: res.status,
      pass,
      summary: toSummary(parsed),
    });

    return {
      ok: pass,
      status: res.status,
      data: parsed,
      raw,
    };
  } catch (error) {
    clearTimeout(timeout);

    results.push({
      name,
      method,
      url,
      expected: expectedStatuses.join("/"),
      status: "ERROR",
      pass: false,
      summary: error.message,
    });

    return {
      ok: false,
      status: "ERROR",
      data: null,
      raw: "",
      error,
    };
  }
};

const requireState = (...keys) => keys.every((k) => Boolean(state[k]));

const run = async () => {
  const patientEmail = randomEmail("endpoint.patient");
  const doctorEmail = randomEmail("endpoint.doctor");
  const password = "Pass123456!";

  // Service-level health checks
  await callApi("frontend root", {
    url: `${BASE.frontend}/`,
    expectedStatuses: [200],
  });
  await callApi("patient health", { url: `${BASE.patient}/`, expectedStatuses: [200] });
  await callApi("appointment health", { url: `${BASE.appointment}/`, expectedStatuses: [200] });
  await callApi("doctor health", { url: `${BASE.doctor}/`, expectedStatuses: [200] });
  await callApi("payment health", { url: `${BASE.payment}/health`, expectedStatuses: [200] });
  await callApi("telemedicine health", { url: `${BASE.telemedicine}/`, expectedStatuses: [200] });
  await callApi("notification health", { url: `${BASE.notification}/health`, expectedStatuses: [200] });

  // Doctor public + auth flows
  await callApi("doctor specialties", {
    url: `${BASE.doctor}/api/doctors/specialties`,
    expectedStatuses: [200],
  });

  const doctorRegister = await callApi("doctor register", {
    method: "POST",
    url: `${BASE.doctor}/api/doctors/register`,
    body: {
      name: "Endpoint Test Doctor",
      email: doctorEmail,
      password,
      specialty: "General Physician",
      phone: "+94770000001",
      licenseNumber: `LIC-${Date.now()}`,
      experience: 5,
      consultationFee: 4500,
      bio: "Endpoint smoke test doctor",
    },
    expectedStatuses: [201],
  });

  state.doctorId = doctorRegister.data?.doctor?.id;
  state.doctorToken = doctorRegister.data?.token;

  const doctorLogin = await callApi("doctor login", {
    method: "POST",
    url: `${BASE.doctor}/api/doctors/login`,
    body: {
      email: doctorEmail,
      password,
    },
    expectedStatuses: [200],
  });

  if (doctorLogin.data?.token) {
    state.doctorToken = doctorLogin.data.token;
  }

  if (requireState("doctorToken")) {
    await callApi("doctor me", {
      url: `${BASE.doctor}/api/doctors/me`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });

    await callApi("doctor update me", {
      method: "PUT",
      url: `${BASE.doctor}/api/doctors/me`,
      token: state.doctorToken,
      body: {
        bio: "Updated bio from smoke test",
        consultationFee: 5000,
      },
      expectedStatuses: [200],
    });
  }

  await callApi("doctor admin pending", {
    url: `${BASE.doctor}/api/doctors/admin/pending`,
    token: state.adminToken,
    expectedStatuses: [200],
  });

  if (requireState("doctorId")) {
    await callApi("doctor verify", {
      method: "PUT",
      url: `${BASE.doctor}/api/doctors/${state.doctorId}/verify`,
      token: state.adminToken,
      expectedStatuses: [200],
    });

    await callApi("doctor get by id", {
      url: `${BASE.doctor}/api/doctors/${state.doctorId}`,
      expectedStatuses: [200],
    });

    await callApi("doctor public availability", {
      url: `${BASE.doctor}/api/doctors/${state.doctorId}/availability`,
      expectedStatuses: [200],
    });

    await callApi("doctor internal contact success", {
      url: `${BASE.doctor}/api/doctors/internal/${state.doctorId}/contact`,
      headers: { "x-internal-api-key": INTERNAL_API_KEY },
      expectedStatuses: [200],
    });

    await callApi("doctor internal contact unauthorized", {
      url: `${BASE.doctor}/api/doctors/internal/${state.doctorId}/contact`,
      expectedStatuses: [401],
    });
  }

  await callApi("doctor list public", {
    url: `${BASE.doctor}/api/doctors`,
    expectedStatuses: [200],
  });

  // Patient auth + profile flows
  const patientRegister = await callApi("patient register", {
    method: "POST",
    url: `${BASE.patient}/api/patients/register`,
    body: {
      name: "Endpoint Test Patient",
      email: patientEmail,
      password,
      age: 30,
      phone: "+94770000002",
    },
    expectedStatuses: [201],
  });

  state.patientId = patientRegister.data?.patient?.id;
  state.patientToken = patientRegister.data?.token;

  const patientLogin = await callApi("patient login", {
    method: "POST",
    url: `${BASE.patient}/api/patients/login`,
    body: {
      email: patientEmail,
      password,
    },
    expectedStatuses: [200],
  });

  if (patientLogin.data?.token) {
    state.patientToken = patientLogin.data.token;
  }

  if (requireState("patientToken")) {
    await callApi("patient me", {
      url: `${BASE.patient}/api/patients/me`,
      token: state.patientToken,
      expectedStatuses: [200],
    });

    await callApi("patient update me", {
      method: "PUT",
      url: `${BASE.patient}/api/patients/me`,
      token: state.patientToken,
      body: {
        age: 31,
        phone: "+94770009999",
      },
      expectedStatuses: [200],
    });
  }

  if (requireState("patientId")) {
    await callApi("patient internal contact success", {
      url: `${BASE.patient}/api/patients/internal/${state.patientId}/contact`,
      headers: { "x-internal-api-key": INTERNAL_API_KEY },
      expectedStatuses: [200],
    });

    await callApi("patient internal contact unauthorized", {
      url: `${BASE.patient}/api/patients/internal/${state.patientId}/contact`,
      expectedStatuses: [401],
    });
  }

  // Doctor availability CRUD
  if (requireState("doctorToken")) {
    const slotA = await callApi("doctor create availability A", {
      method: "POST",
      url: `${BASE.doctor}/api/doctors/availability`,
      token: state.doctorToken,
      body: {
        dayOfWeek: "Monday",
        startTime: "09:00",
        endTime: "12:00",
        slotDurationMinutes: 30,
      },
      expectedStatuses: [201],
    });

    state.slotAId = slotA.data?.slot?._id;

    const slotB = await callApi("doctor create availability B", {
      method: "POST",
      url: `${BASE.doctor}/api/doctors/availability`,
      token: state.doctorToken,
      body: {
        dayOfWeek: "Tuesday",
        startTime: "13:00",
        endTime: "15:00",
        slotDurationMinutes: 20,
      },
      expectedStatuses: [201],
    });

    state.slotBId = slotB.data?.slot?._id;

    await callApi("doctor get my availability", {
      url: `${BASE.doctor}/api/doctors/availability/mine`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });

    if (state.slotAId) {
      await callApi("doctor update availability", {
        method: "PUT",
        url: `${BASE.doctor}/api/doctors/availability/${state.slotAId}`,
        token: state.doctorToken,
        body: {
          endTime: "12:30",
          slotDurationMinutes: 25,
        },
        expectedStatuses: [200],
      });
    }

    if (state.slotBId) {
      await callApi("doctor delete availability", {
        method: "DELETE",
        url: `${BASE.doctor}/api/doctors/availability/${state.slotBId}`,
        token: state.doctorToken,
        expectedStatuses: [200],
      });
    }
  }

  // Appointment flows
  const createAppointment = async (name, dateOffsetDays, time) => {
    if (!requireState("patientToken", "doctorId")) return null;
    const r = await callApi(name, {
      method: "POST",
      url: `${BASE.appointment}/api/appointments`,
      token: state.patientToken,
      body: {
        doctorId: state.doctorId,
        date: dayOffsetIsoDate(dateOffsetDays),
        time,
        reason: "Endpoint smoke test",
      },
      expectedStatuses: [201],
    });
    return r.data?.appointment?._id || null;
  };

  state.appointment1 = await createAppointment("appointment create #1", 1, "10:30");
  state.appointment2 = await createAppointment("appointment create #2", 2, "11:30");
  state.appointment3 = await createAppointment("appointment create #3", 3, "12:30");
  state.appointment4 = await createAppointment("appointment create #4", 4, "14:00");
  state.appointment5 = await createAppointment("appointment create #5", 5, "15:00");
  state.appointment6 = await createAppointment("appointment create #6", 6, "16:00");

  if (state.appointment1) {
    await callApi("appointment get by id", {
      url: `${BASE.appointment}/api/appointments/${state.appointment1}`,
      token: state.patientToken,
      expectedStatuses: [200],
    });

    await callApi("appointment update", {
      method: "PUT",
      url: `${BASE.appointment}/api/appointments/${state.appointment1}`,
      token: state.patientToken,
      body: {
        reason: "Rescheduled by smoke test",
        time: "10:45",
      },
      expectedStatuses: [200],
    });
  }

  if (requireState("patientId", "patientToken")) {
    await callApi("appointment list by patient", {
      url: `${BASE.appointment}/api/appointments/patient/${state.patientId}`,
      token: state.patientToken,
      expectedStatuses: [200],
    });
  }

  if (requireState("doctorId", "doctorToken")) {
    await callApi("appointment list by doctor", {
      url: `${BASE.appointment}/api/appointments/doctor/${state.doctorId}`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });

    await callApi("doctor proxy appointments mine", {
      url: `${BASE.doctor}/api/doctors/appointments/mine`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });
  }

  if (state.appointment1 && state.doctorToken) {
    await callApi("doctor proxy accept appointment", {
      method: "PUT",
      url: `${BASE.doctor}/api/doctors/appointments/${state.appointment1}/accept`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });

    await callApi("appointment status update direct", {
      method: "PUT",
      url: `${BASE.appointment}/api/appointments/${state.appointment1}/status`,
      token: state.doctorToken,
      body: { status: "completed" },
      expectedStatuses: [200],
    });
  }

  if (state.appointment2 && state.doctorToken) {
    await callApi("doctor proxy reject appointment", {
      method: "PUT",
      url: `${BASE.doctor}/api/doctors/appointments/${state.appointment2}/reject`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });
  }

  if (state.appointment3 && state.patientToken) {
    await callApi("appointment delete direct", {
      method: "DELETE",
      url: `${BASE.appointment}/api/appointments/${state.appointment3}`,
      token: state.patientToken,
      expectedStatuses: [200],
    });
  }

  if (state.appointment4 && state.doctorToken) {
    await callApi("doctor proxy complete appointment", {
      method: "PUT",
      url: `${BASE.doctor}/api/doctors/appointments/${state.appointment4}/complete`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });
  }

  // Payment flows
  if (state.appointment4 && state.patientToken) {
    const paymentCreate1 = await callApi("payment create", {
      method: "POST",
      url: `${BASE.payment}/api/payments/create`,
      token: state.patientToken,
      body: {
        appointmentId: state.appointment4,
        amount: 120.5,
        currency: "USD",
        paymentMethod: "credit_card",
      },
      expectedStatuses: [201],
    });

    state.payment1 = paymentCreate1.data?.data?._id;
  }

  if (state.payment1 && state.patientToken) {
    await callApi("payment get by id", {
      url: `${BASE.payment}/api/payments/${state.payment1}`,
      token: state.patientToken,
      expectedStatuses: [200],
    });
  }

  if (state.patientId && state.patientToken) {
    await callApi("payment list by patient", {
      url: `${BASE.payment}/api/payments/patient/${state.patientId}`,
      token: state.patientToken,
      expectedStatuses: [200],
    });
  }

  await callApi("payment list all (admin)", {
    url: `${BASE.payment}/api/payments`,
    token: state.adminToken,
    expectedStatuses: [200],
  });

  if (state.payment1) {
    await callApi("payment confirm (admin)", {
      method: "POST",
      url: `${BASE.payment}/api/payments/confirm`,
      token: state.adminToken,
      body: { paymentId: state.payment1 },
      expectedStatuses: [200],
    });
  }

  if (state.appointment5 && state.patientToken) {
    const paymentCreate2 = await callApi("payment create #2", {
      method: "POST",
      url: `${BASE.payment}/api/payments/create`,
      token: state.patientToken,
      body: {
        appointmentId: state.appointment5,
        amount: 90,
        currency: "USD",
        paymentMethod: "debit_card",
      },
      expectedStatuses: [201],
    });

    state.payment2 = paymentCreate2.data?.data?._id;
  }

  if (state.payment2) {
    await callApi("payment fail (admin)", {
      method: "POST",
      url: `${BASE.payment}/api/payments/fail`,
      token: state.adminToken,
      body: {
        paymentId: state.payment2,
        reason: "Smoke test failure path",
      },
      expectedStatuses: [200],
    });
  }

  if (state.appointment6 && state.patientToken) {
    const initOnline = await callApi("payment initiate online", {
      method: "POST",
      url: `${BASE.payment}/api/payments/initiate-online`,
      token: state.patientToken,
      body: {
        appointmentId: state.appointment6,
        provider: "STRIPE",
      },
      expectedStatuses: [201],
    });

    state.payment3 = initOnline.data?.paymentId;
  }

  await callApi("payment webhook payhere", {
    method: "POST",
    url: `${BASE.payment}/api/payments/webhook/payhere`,
    body: {
      status: "SUCCESS",
      paymentId: state.payment3 || state.payment2 || state.payment1,
      transactionId: `SIM-${Date.now()}`,
    },
    expectedStatuses: [200],
  });

  // Telemedicine flows
  if (state.appointment4 && state.doctorToken) {
    const sessionCreate = await callApi("telemedicine create session", {
      method: "POST",
      url: `${BASE.telemedicine}/api/telemedicine/sessions`,
      token: state.doctorToken,
      body: { appointmentId: state.appointment4 },
      expectedStatuses: [201, 200],
    });

    state.sessionId = sessionCreate.data?.session?._id;

    if (state.sessionId) {
      await callApi("telemedicine get session by id", {
        url: `${BASE.telemedicine}/api/telemedicine/sessions/${state.sessionId}`,
        token: state.doctorToken,
        expectedStatuses: [200],
      });

      await callApi("telemedicine get join info", {
        url: `${BASE.telemedicine}/api/telemedicine/sessions/${state.sessionId}/join-info`,
        token: state.doctorToken,
        expectedStatuses: [200],
      });

      await callApi("telemedicine start session", {
        method: "PUT",
        url: `${BASE.telemedicine}/api/telemedicine/sessions/${state.sessionId}/start`,
        token: state.doctorToken,
        expectedStatuses: [200],
      });

      await callApi("telemedicine end session", {
        method: "PUT",
        url: `${BASE.telemedicine}/api/telemedicine/sessions/${state.sessionId}/end`,
        token: state.doctorToken,
        body: { notes: "Consultation completed by smoke test." },
        expectedStatuses: [200],
      });
    }

    await callApi("telemedicine get session by appointment", {
      url: `${BASE.telemedicine}/api/telemedicine/sessions/appointment/${state.appointment4}`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });

    await callApi("telemedicine mine (doctor)", {
      url: `${BASE.telemedicine}/api/telemedicine/sessions/mine`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });

    if (state.patientToken) {
      await callApi("telemedicine mine (patient)", {
        url: `${BASE.telemedicine}/api/telemedicine/sessions/mine`,
        token: state.patientToken,
        expectedStatuses: [200],
      });
    }
  }

  // Prescription + patient records
  if (requireState("doctorToken", "patientId", "appointment4")) {
    const prescriptionCreate = await callApi("doctor create prescription", {
      method: "POST",
      url: `${BASE.doctor}/api/doctors/prescriptions`,
      token: state.doctorToken,
      body: {
        patientId: state.patientId,
        appointmentId: state.appointment4,
        patientName: "Endpoint Test Patient",
        diagnosis: "Routine check",
        medications: [
          {
            name: "Paracetamol",
            dosage: "500mg",
            frequency: "Twice a day",
            duration: "3 days",
            instructions: "After meals",
          },
        ],
        notes: "Generated by endpoint smoke test",
      },
      expectedStatuses: [201],
    });

    state.prescriptionId = prescriptionCreate.data?.prescription?._id;
  }

  if (state.doctorToken) {
    await callApi("doctor prescriptions mine", {
      url: `${BASE.doctor}/api/doctors/prescriptions/mine`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });
  }

  if (state.patientId && state.doctorToken) {
    await callApi("doctor prescriptions by patient", {
      url: `${BASE.doctor}/api/doctors/prescriptions/patient/${state.patientId}`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });
  }

  if (state.prescriptionId && state.doctorToken) {
    await callApi("doctor prescription by id", {
      url: `${BASE.doctor}/api/doctors/prescriptions/${state.prescriptionId}`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });
  }

  if (state.patientToken) {
    await callApi("patient history", {
      url: `${BASE.patient}/api/patients/history`,
      token: state.patientToken,
      expectedStatuses: [200],
    });

    await callApi("patient prescriptions", {
      url: `${BASE.patient}/api/patients/prescriptions`,
      token: state.patientToken,
      expectedStatuses: [200],
    });
  }

  // Patient reports
  if (state.patientToken) {
    const form = new FormData();
    // 1x1 PNG fixture in base64 to guarantee a valid image payload.
    const tinyPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6v8AAAAASUVORK5CYII=";
    const tinyPngBytes = Buffer.from(tinyPngBase64, "base64");
    form.append(
      "file",
      new Blob([tinyPngBytes], { type: "image/png" }),
      "smoke-test-report.png"
    );

    const reportUpload = await callApi("patient upload report", {
      method: "POST",
      url: `${BASE.patient}/api/patients/reports`,
      token: state.patientToken,
      body: form,
      expectedStatuses: [201],
    });

    state.reportId = reportUpload.data?.report?._id;

    await callApi("patient list reports", {
      url: `${BASE.patient}/api/patients/reports`,
      token: state.patientToken,
      expectedStatuses: [200],
    });

    if (state.reportId) {
      await callApi("patient get report", {
        url: `${BASE.patient}/api/patients/reports/${state.reportId}`,
        token: state.patientToken,
        expectedStatuses: [200],
      });

      await callApi("patient delete report", {
        method: "DELETE",
        url: `${BASE.patient}/api/patients/reports/${state.reportId}`,
        token: state.patientToken,
        expectedStatuses: [200],
      });
    }
  }

  // Notification service
  await callApi("notification send", {
    method: "POST",
    url: `${BASE.notification}/api/notifications/send`,
    body: {
      eventType: "APPOINTMENT_BOOKED",
      channels: ["email", "sms", "whatsapp"],
      recipients: [
        {
          name: "Endpoint Tester",
          email: "endpoint-tester@example.com",
          phone: "+94770000003",
        },
      ],
      data: {
        doctorName: "Endpoint Test Doctor",
        date: dayOffsetIsoDate(2),
        time: "10:00 AM",
      },
    },
    expectedStatuses: [200],
  });

  await callApi("notification logs", {
    url: `${BASE.notification}/api/notifications/logs`,
    expectedStatuses: [200],
  });

  // Optional cleanup endpoints
  if (state.doctorToken) {
    await callApi("doctor delete me", {
      method: "DELETE",
      url: `${BASE.doctor}/api/doctors/me`,
      token: state.doctorToken,
      expectedStatuses: [200],
    });
  }

  if (state.patientToken) {
    await callApi("patient delete me", {
      method: "DELETE",
      url: `${BASE.patient}/api/patients/me`,
      token: state.patientToken,
      expectedStatuses: [200],
    });
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  const report = {
    executedAt: new Date().toISOString(),
    totals: {
      total: results.length,
      passed,
      failed,
    },
    state: {
      patientId: state.patientId || null,
      doctorId: state.doctorId || null,
      appointment1: state.appointment1 || null,
      payment1: state.payment1 || null,
      sessionId: state.sessionId || null,
      prescriptionId: state.prescriptionId || null,
      reportId: state.reportId || null,
    },
    results,
  };

  const reportPath = path.resolve(process.cwd(), "test", "endpoint-smoke-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n=== Endpoint Smoke Check Summary ===");
  console.log(`Total: ${report.totals.total}`);
  console.log(`Passed: ${report.totals.passed}`);
  console.log(`Failed: ${report.totals.failed}`);
  console.log(`Report: ${reportPath}`);

  if (failed > 0) {
    console.log("\nFailed endpoints:");
    for (const item of results.filter((r) => !r.pass)) {
      console.log(`- ${item.name} | ${item.method} ${item.url} | expected ${item.expected} got ${item.status}`);
      if (item.summary) {
        console.log(`  ${item.summary}`);
      }
    }
  }

  process.exitCode = failed > 0 ? 1 : 0;
};

run().catch((error) => {
  console.error("Fatal error running endpoint smoke check:", error);
  process.exit(1);
});
