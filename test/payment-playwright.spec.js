import { test, expect, request } from "@playwright/test";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const paymentServiceDir = path.join(repoRoot, "payment-service");

const TEST_JWT_SECRET = "payment-playwright-secret";
const PATIENT_ID = "64b8c4a0f1234567890abc22";
const ADMIN_ID = "64b8c4a0f1234567890abc11";
const SERVICE_DOCTOR_ID = "64b8c4a0f1234567890abc33";

const APPOINTMENT_MANUAL_ID = "64b8c4a0f1234567890ab101";
const APPOINTMENT_ONLINE_SUCCESS_ID = "64b8c4a0f1234567890ab102";
const APPOINTMENT_ONLINE_FAILED_ID = "64b8c4a0f1234567890ab103";

const patientToken = jwt.sign({ id: PATIENT_ID, role: "patient" }, TEST_JWT_SECRET, {
  expiresIn: "2h",
});

const adminToken = jwt.sign({ id: ADMIN_ID, role: "admin" }, TEST_JWT_SECRET, {
  expiresIn: "2h",
});

const serviceToken = jwt.sign(
  { id: SERVICE_DOCTOR_ID, role: "doctor" },
  TEST_JWT_SECRET,
  {
    expiresIn: "2h",
  }
);

let mongoServer;
let paymentServer;
let appointmentServer;
let apiContext;
let paymentBaseUrl;
let appointmentBaseUrl;
let paymentPort;

const appointmentStatusUpdates = [];

let manualPaymentId;
let onlineSuccessPaymentId;
let onlineFailedPaymentId;

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;

      server.close((closeError) => {
        if (closeError) return reject(closeError);
        if (!port) return reject(new Error("Failed to allocate a free port."));
        return resolve(port);
      });
    });
  });
}

function readRequestBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      if (!rawBody) return resolve({});

      try {
        return resolve(JSON.parse(rawBody));
      } catch {
        return resolve({});
      }
    });
  });
}

function createAppointmentMockServer() {
  return http.createServer(async (req, res) => {
    const auth = req.headers.authorization || "";

    if (!auth.startsWith("Bearer ")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Unauthorized" }));
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(auth.split(" ")[1], TEST_JWT_SECRET);
    } catch {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Invalid token" }));
      return;
    }

    const url = new URL(req.url || "/", "http://127.0.0.1");
    const getMatch = url.pathname.match(/^\/api\/appointments\/([a-f0-9]{24})$/i);
    const putMatch = url.pathname.match(
      /^\/api\/appointments\/([a-f0-9]{24})\/status$/i
    );

    if (req.method === "GET" && getMatch) {
      const appointmentId = getMatch[1];

      // Simulate a patient-owned appointment payload for payment initialization.
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          appointment: {
            _id: appointmentId,
            patientId: PATIENT_ID,
            doctorId: SERVICE_DOCTOR_ID,
            status: "pending",
            amount: 125.5,
            currency: "USD",
          },
        })
      );
      return;
    }

    if (req.method === "PUT" && putMatch) {
      if (!["doctor", "admin"].includes(decoded.role)) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, message: "Forbidden" }));
        return;
      }

      const payload = await readRequestBody(req);
      appointmentStatusUpdates.push({ appointmentId: putMatch[1], payload });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          message: "Appointment status updated.",
          appointment: {
            _id: putMatch[1],
            status: payload.status || "pending",
          },
        })
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, message: "Mock route not found" }));
  });
}

async function confirmPaymentWithRetry(paymentId, retries = 6) {
  let lastBody = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const response = await apiContext.post(`${paymentBaseUrl}/api/payments/confirm`, {
      headers: authHeader(adminToken),
      data: { paymentId },
    });

    const body = await response.json();
    lastBody = body;

    if (response.ok()) {
      return body;
    }
  }

  throw new Error(`Manual confirm failed after retries: ${JSON.stringify(lastBody)}`);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const appointmentPort = await getFreePort();
  paymentPort = await getFreePort();

  appointmentBaseUrl = `http://127.0.0.1:${appointmentPort}`;
  paymentBaseUrl = `http://127.0.0.1:${paymentPort}`;

  appointmentServer = createAppointmentMockServer();
  await new Promise((resolve) =>
    appointmentServer.listen(appointmentPort, "127.0.0.1", resolve)
  );

  mongoServer = await MongoMemoryServer.create();

  process.env.NODE_ENV = "test";
  process.env.PORT = String(paymentPort);
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.JWT_SECRET = TEST_JWT_SECRET;

  process.env.APPOINTMENT_SERVICE_URL = appointmentBaseUrl;
  process.env.APPOINTMENT_SERVICE_TOKEN = serviceToken;

  process.env.PAYMENT_PROVIDER = "mock";
  process.env.STRIPE_SANDBOX_MODE = "true";
  process.env.SUCCESS_URL = "http://localhost:5173/patient/payments?gateway=success";
  process.env.CANCEL_URL = "http://localhost:5173/patient/payments?gateway=cancelled";
  process.env.DEFAULT_APPOINTMENT_FEE = "99";

  // Keep notification side effects disabled for deterministic tests.
  process.env.NOTIFICATION_SERVICE_URL = "";

  const appModule = await import(pathToFileURL(path.join(paymentServiceDir, "app.js")).toString());
  const dbModule = await import(
    pathToFileURL(path.join(paymentServiceDir, "config", "db.js")).toString()
  );

  await dbModule.default();

  paymentServer = appModule.default.listen(paymentPort);
  await new Promise((resolve) => paymentServer.on("listening", resolve));

  apiContext = await request.newContext();
}, 120000);

test.afterAll(async () => {
  await apiContext?.dispose();

  if (paymentServer) {
    await new Promise((resolve) => paymentServer.close(resolve));
  }

  if (appointmentServer) {
    await new Promise((resolve) => appointmentServer.close(resolve));
  }

  try {
    const mongooseModule = await import(
      pathToFileURL(
        path.join(paymentServiceDir, "node_modules", "mongoose", "index.js")
      ).toString()
    );
    await mongooseModule.default.connection.close();
  } catch {
    // Best-effort close; test process will terminate if connection is already closed.
  }

  await mongoServer?.stop();
});

test("health endpoint is up", async () => {
  const response = await apiContext.get(`${paymentBaseUrl}/health`);
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.service).toBe("payment-service");
  expect(body.status).toBe("UP");
});

test("manual flow works: create then confirm", async () => {
  const createResponse = await apiContext.post(`${paymentBaseUrl}/api/payments/create`, {
    headers: authHeader(patientToken),
    data: {
      appointmentId: APPOINTMENT_MANUAL_ID,
      amount: 200,
      currency: "USD",
      paymentMethod: "credit_card",
    },
  });

  expect(createResponse.status()).toBe(201);
  const createBody = await createResponse.json();

  expect(createBody.success).toBeTruthy();
  expect(createBody.data.status).toBe("pending");

  manualPaymentId = createBody.data._id;

  const confirmBody = await confirmPaymentWithRetry(manualPaymentId);
  expect(confirmBody.success).toBeTruthy();
  expect(confirmBody.data.status).toBe("completed");
});

test("online initiate with STRIPE returns redirect url and pending payment", async () => {
  const response = await apiContext.post(
    `${paymentBaseUrl}/api/payments/initiate-online`,
    {
      headers: authHeader(patientToken),
      data: {
        appointmentId: APPOINTMENT_ONLINE_SUCCESS_ID,
        provider: "STRIPE",
      },
    }
  );

  expect(response.status()).toBe(201);
  const body = await response.json();

  expect(body.paymentId).toBeTruthy();
  expect(body.redirectUrl).toContain("gateway=success");
  expect(body.redirectUrl).toContain("sandbox=true");

  onlineSuccessPaymentId = body.paymentId;

  const getPayment = await apiContext.get(
    `${paymentBaseUrl}/api/payments/${onlineSuccessPaymentId}`,
    {
      headers: authHeader(patientToken),
    }
  );

  expect(getPayment.ok()).toBeTruthy();
  const paymentBody = await getPayment.json();

  expect(paymentBody.data.status).toBe("pending");
  expect(paymentBody.data.paymentMethod).toBe("ONLINE");
  expect(paymentBody.data.gatewayProvider).toBe("STRIPE");
  expect(paymentBody.data.checkoutUrl).toContain("sandbox=true");
});

test("stripe webhook success completes payment and confirms appointment", async () => {
  const webhookResponse = await apiContext.post(
    `${paymentBaseUrl}/api/payments/webhook/stripe`,
    {
      data: {
        status: "SUCCESS",
        paymentId: onlineSuccessPaymentId,
        appointmentId: APPOINTMENT_ONLINE_SUCCESS_ID,
        transactionId: "pi_test_success_001",
      },
    }
  );

  expect(webhookResponse.ok()).toBeTruthy();

  const getPayment = await apiContext.get(
    `${paymentBaseUrl}/api/payments/${onlineSuccessPaymentId}`,
    {
      headers: authHeader(patientToken),
    }
  );

  expect(getPayment.ok()).toBeTruthy();
  const paymentBody = await getPayment.json();

  expect(paymentBody.data.status).toBe("completed");
  expect(paymentBody.data.transactionId).toBe("pi_test_success_001");

  const matchingUpdate = appointmentStatusUpdates.find(
    (update) =>
      update.appointmentId === APPOINTMENT_ONLINE_SUCCESS_ID &&
      update.payload?.status === "confirmed"
  );

  expect(matchingUpdate).toBeTruthy();
});

test("stripe webhook failure marks payment as failed", async () => {
  const initiateResponse = await apiContext.post(
    `${paymentBaseUrl}/api/payments/initiate-online`,
    {
      headers: authHeader(patientToken),
      data: {
        appointmentId: APPOINTMENT_ONLINE_FAILED_ID,
        provider: "STRIPE",
      },
    }
  );

  expect(initiateResponse.status()).toBe(201);
  onlineFailedPaymentId = (await initiateResponse.json()).paymentId;

  const webhookResponse = await apiContext.post(
    `${paymentBaseUrl}/api/payments/webhook/stripe`,
    {
      data: {
        status: "FAILED",
        paymentId: onlineFailedPaymentId,
        appointmentId: APPOINTMENT_ONLINE_FAILED_ID,
        reason: "Card declined",
      },
    }
  );

  expect(webhookResponse.ok()).toBeTruthy();

  const getPayment = await apiContext.get(
    `${paymentBaseUrl}/api/payments/${onlineFailedPaymentId}`,
    {
      headers: authHeader(patientToken),
    }
  );

  expect(getPayment.ok()).toBeTruthy();
  const paymentBody = await getPayment.json();

  expect(paymentBody.data.status).toBe("failed");
  expect(paymentBody.data.failureReason).toContain("Card declined");
});

test("payment history includes manual and online records", async () => {
  const patientHistoryResponse = await apiContext.get(
    `${paymentBaseUrl}/api/payments/patient/${PATIENT_ID}`,
    {
      headers: authHeader(patientToken),
    }
  );

  expect(patientHistoryResponse.ok()).toBeTruthy();
  const historyBody = await patientHistoryResponse.json();

  expect(historyBody.count).toBeGreaterThanOrEqual(3);

  const ids = historyBody.data.map((item) => item._id);
  expect(ids).toContain(manualPaymentId);
  expect(ids).toContain(onlineSuccessPaymentId);
  expect(ids).toContain(onlineFailedPaymentId);

  const methods = historyBody.data.map((item) => item.paymentMethod);
  expect(methods).toContain("credit_card");
  expect(methods).toContain("ONLINE");
});
