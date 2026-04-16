// test/notification-playwright.spec.js
// ─────────────────────────────────────────────────────────────────────────────
// Playwright API tests for the Notification Service.
//
// What is tested:
//   • GET  /health                         – service liveness
//   • POST /api/notifications/send         – all channels (email, SMS, WhatsApp)
//                                            all event types, validation errors,
//                                            multi-recipient, channel skipping
//   • GET  /api/notifications/logs         – log structure, ordering, counts
//
// External-service strategy:
//   • Email  → local mock SMTP server (TCP) via SMTP_HOST/SMTP_PORT env vars
//   • SMS    → local mock HTTP server      via TEXTLK_SMS_API_URL env var
//   • WhatsApp (Twilio) → invalid test credentials; Twilio will return 401,
//                          the controller catches it and logs the attempt as
//                          "failed". We verify the failure IS logged.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect, request } from "@playwright/test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const repoRoot   = path.resolve(__dirname, "..");
const notifDir   = path.join(repoRoot, "notification-service");

// ─── Shared mock capture buffers ──────────────────────────────────────────────
const capturedEmails      = [];   // { from, to[], subject, body }
const capturedSmsRequests = [];   // raw Text.lk JSON payloads

// ─── Process / server handles ─────────────────────────────────────────────────
let mongoServer;
let smtpServer;
let smsServer;
let notifProcess;
let notifBaseUrl;
let apiContext;

const processLogs = { notif: [] };

// ═════════════════════════════════════════════════════════════════════════════
// Infrastructure helpers
// ═════════════════════════════════════════════════════════════════════════════

/** Reserve a free TCP port on loopback then release it. */
async function getFreePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const port = s.address().port;
      s.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

/** Bind a net/http server on a random port and return the port. */
function listen(server, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => resolve(server.address().port));
  });
}

/** Close a net/http server gracefully. */
function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

/** Simple ms-based delay for fire-and-forget background processing. */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Mock SMTP server
//
// Handles the full SMTP dialogue (EHLO, AUTH LOGIN / AUTH PLAIN, MAIL FROM,
// RCPT TO, DATA, QUIT) without TLS.  Every accepted message is pushed to
// `capturedEmails`.
// ─────────────────────────────────────────────────────────────────────────────
function createMockSmtpServer() {
  return net.createServer((socket) => {
    let inData   = false;
    let authStep = 0;   // 0 = normal  1 = waiting for username  2 = waiting for password
    let mail     = { from: "", to: [], subject: "", body: "" };
    let buf      = "";

    socket.write("220 mock.smtp ESMTP MockServer\r\n");

    socket.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split("\r\n");
      buf = lines.pop(); // keep any incomplete trailing fragment

      for (const line of lines) {
        // ── DATA body accumulation ──────────────────────────────────────────
        if (inData) {
          if (line === ".") {
            // End of message
            inData = false;
            const subjectMatch = mail.body.match(/^Subject: (.+)$/m);
            if (subjectMatch) mail.subject = subjectMatch[1].trim();
            capturedEmails.push({ ...mail });
            mail = { from: "", to: [], subject: "", body: "" };
            socket.write("250 2.0.0 OK\r\n");
          } else {
            // De-dot-stuffing: a leading ".." becomes "."
            mail.body += (line.startsWith("..") ? line.slice(1) : line) + "\n";
          }
          continue;
        }

        // ── AUTH LOGIN multi-step ───────────────────────────────────────────
        if (authStep === 1) {   // received base64 username
          authStep = 2;
          socket.write("334 UGFzc3dvcmQ6\r\n");   // "Password:"
          continue;
        }
        if (authStep === 2) {   // received base64 password
          authStep = 0;
          socket.write("235 2.7.0 Authentication successful\r\n");
          continue;
        }

        const up = line.toUpperCase().trimEnd();

        if (up.startsWith("EHLO") || up.startsWith("HELO")) {
          // Advertise AUTH LOGIN and PLAIN; deliberately omit STARTTLS
          socket.write("250-mock.smtp\r\n250-AUTH LOGIN PLAIN\r\n250 OK\r\n");

        } else if (up.startsWith("AUTH LOGIN")) {
          authStep = 1;
          socket.write("334 VXNlcm5hbWU6\r\n");   // "Username:"

        } else if (up.startsWith("AUTH")) {
          // AUTH PLAIN or anything else → accept immediately
          socket.write("235 2.7.0 Authentication successful\r\n");

        } else if (up.startsWith("MAIL FROM")) {
          const m = line.match(/MAIL FROM:<([^>]*)>/i);
          if (m) mail.from = m[1];
          socket.write("250 2.1.0 OK\r\n");

        } else if (up.startsWith("RCPT TO")) {
          const m = line.match(/RCPT TO:<([^>]*)>/i);
          if (m) mail.to.push(m[1]);
          socket.write("250 2.1.5 OK\r\n");

        } else if (up === "DATA") {
          inData = true;
          socket.write("354 Start mail input; end with <CRLF>.<CRLF>\r\n");

        } else if (up === "QUIT") {
          socket.write("221 2.0.0 Bye\r\n");
          socket.end();

        } else if (line.trim()) {
          socket.write("250 OK\r\n");
        }
      }
    });

    socket.on("error", () => {});
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Text.lk SMS HTTP server
//
// Accepts any POST, records the request body in `capturedSmsRequests`, and
// returns a success response identical to the real Text.lk API.
// ─────────────────────────────────────────────────────────────────────────────
function createMockSmsServer() {
  return http.createServer((req, res) => {
    if (req.method !== "POST") {
      res.writeHead(404);
      res.end();
      return;
    }

    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        capturedSmsRequests.push(JSON.parse(Buffer.concat(chunks).toString()));
      } catch { /* ignore malformed body */ }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: true,
          data: { sms_id: "mock-sms-001" },
          message: "SMS sent successfully",
        })
      );
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification service process management
// ─────────────────────────────────────────────────────────────────────────────
function startNotifService(env) {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: notifDir,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (c) => processLogs.notif.push(c.toString()));
  child.stderr.on("data", (c) => processLogs.notif.push(c.toString()));
  return child;
}

async function waitForHttp(url, { timeoutMs = 60_000, processRef } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";

  while (Date.now() < deadline) {
    if (processRef?.exitCode !== null && processRef?.exitCode !== undefined) {
      const logs = processLogs.notif.join("");
      throw new Error(
        `Notification service exited early (code ${processRef.exitCode}).\n${logs}`
      );
    }
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.status < 500) return;
    } catch (e) {
      lastError = e.message;
    }
    await wait(300);
  }

  throw new Error(`Timed out waiting for ${url}. Last: ${lastError}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  const exited = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), 5000);
    child.once("exit", () => { clearTimeout(t); resolve(true); });
  });
  if (!exited && child.pid) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"]);
    } else {
      child.kill("SIGKILL");
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Test lifecycle
// ═════════════════════════════════════════════════════════════════════════════

test.beforeAll(async () => {
  // 1. In-memory MongoDB
  mongoServer = await MongoMemoryServer.create();

  // 2. Mock SMTP server (for nodemailer email delivery)
  smtpServer = createMockSmtpServer();
  const smtpPort = await listen(smtpServer);

  // 3. Mock Text.lk SMS server
  smsServer = createMockSmsServer();
  const smsPort = await listen(smsServer);

  // 4. Notification service process
  const notifPort = await getFreePort();
  notifBaseUrl = `http://127.0.0.1:${notifPort}`;

  notifProcess = startNotifService({
    PORT:               String(notifPort),
    NODE_ENV:           "test",
    MONGO_URI:          mongoServer.getUri(),

    // Email → local mock SMTP (SMTP_HOST activates the override in mailer.js)
    SMTP_HOST:          "127.0.0.1",
    SMTP_PORT:          String(smtpPort),
    EMAIL_USER:         "test@mock.local",
    EMAIL_PASS:         "mockpassword",

    // SMS → local mock HTTP server
    TEXTLK_API_TOKEN:   "mock-textlk-token",
    TEXTLK_SENDER_ID:   "MockSender",
    TEXTLK_SMS_API_URL: `http://127.0.0.1:${smsPort}`,
    TEXTLK_SMS_TYPE:    "plain",

    // WhatsApp / Twilio → invalid test credentials.
    // Twilio will respond with 401; the controller logs the attempt as "failed".
    TWILIO_SID:          "AC00000000000000000000000000000000",
    TWILIO_AUTH:         "00000000000000000000000000000000",
    TWILIO_PHONE:        "+15005550006",
    TWILIO_WHATSAPP_FROM:"whatsapp:+15005550006",
  });

  await waitForHttp(`${notifBaseUrl}/health`, {
    timeoutMs: 60_000,
    processRef: notifProcess,
  });

  apiContext = await request.newContext();
}, 120_000); // allow 2 minutes for MongoDB + service startup

test.afterAll(async () => {
  await apiContext?.dispose();
  await stopProcess(notifProcess);
  if (smtpServer) await closeServer(smtpServer);
  if (smsServer)  await closeServer(smsServer);
  await mongoServer?.stop();
});

// ═════════════════════════════════════════════════════════════════════════════
// Convenience wrappers
// ═════════════════════════════════════════════════════════════════════════════

async function sendNotification(body) {
  return apiContext.post(`${notifBaseUrl}/api/notifications/send`, { data: body });
}

async function getLogs() {
  const res = await apiContext.get(`${notifBaseUrl}/api/notifications/logs`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).logs;
}

// ═════════════════════════════════════════════════════════════════════════════
// ① Health check
// ═════════════════════════════════════════════════════════════════════════════

test("GET /health returns 200 with service name", async () => {
  const res  = await apiContext.get(`${notifBaseUrl}/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("OK");
  expect(body.service).toBe("notification-service");
});

// ═════════════════════════════════════════════════════════════════════════════
// ② Request validation — 400 errors
// ═════════════════════════════════════════════════════════════════════════════

test("POST /send rejects missing eventType with 400", async () => {
  const res = await sendNotification({
    channels:   ["email"],
    recipients: [{ name: "Test", email: "t@t.com" }],
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).success).toBe(false);
});

test("POST /send rejects empty channels array with 400", async () => {
  const res = await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   [],
    recipients: [{ name: "Test", email: "t@t.com" }],
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).success).toBe(false);
});

test("POST /send rejects empty recipients array with 400", async () => {
  const res = await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   ["email"],
    recipients: [],
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).success).toBe(false);
});

// ═════════════════════════════════════════════════════════════════════════════
// ③ Email channel — happy path and event types
// ═════════════════════════════════════════════════════════════════════════════

test("POST /send returns 200 immediately (fire-and-forget) for email", async () => {
  const res  = await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   ["email"],
    recipients: [{ name: "Alice", email: "alice@test.local" }],
    data:       { doctorName: "Dr. Silva", date: "2025-05-01", time: "10:00 AM" },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.message).toMatch(/accepted/i);
});

test("Email is delivered to mock SMTP for APPOINTMENT_BOOKED", async () => {
  const before = capturedEmails.length;
  await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   ["email"],
    recipients: [{ name: "Bob", email: "bob@test.local" }],
    data:       { doctorName: "Dr. Perera", date: "2025-06-01", time: "09:00 AM" },
  });
  await wait(2000);

  expect(capturedEmails.length).toBeGreaterThan(before);
  const mail = capturedEmails.find((e) => e.to.includes("bob@test.local"));
  expect(mail).toBeDefined();
  // Body contains the appointment confirmation text
  expect(mail.body).toMatch(/Dr\. Perera/);
  expect(mail.body).toMatch(/2025-06-01/);
});

test("Email is delivered for CONSULTATION_COMPLETED event", async () => {
  await sendNotification({
    eventType:  "CONSULTATION_COMPLETED",
    channels:   ["email"],
    recipients: [{ name: "Carol", email: "carol@test.local" }],
    data:       {},
  });
  await wait(2000);

  const mail = capturedEmails.find((e) => e.to.includes("carol@test.local"));
  expect(mail).toBeDefined();
  expect(mail.body).toMatch(/consultation is complete/i);
});

test("Email is delivered for PAYMENT_SUCCESS event", async () => {
  await sendNotification({
    eventType:  "PAYMENT_SUCCESS",
    channels:   ["email"],
    recipients: [{ name: "Dan", email: "dan@test.local" }],
    data:       { amount: "3500" },
  });
  await wait(2000);

  const mail = capturedEmails.find((e) => e.to.includes("dan@test.local"));
  expect(mail).toBeDefined();
  expect(mail.body).toMatch(/3500/);
  expect(mail.body).toMatch(/LKR/i);
});

test("Email is delivered for APPOINTMENT_CANCELLED event", async () => {
  await sendNotification({
    eventType:  "APPOINTMENT_CANCELLED",
    channels:   ["email"],
    recipients: [{ name: "Eve", email: "eve@test.local" }],
    data:       { date: "2025-07-15" },
  });
  await wait(2000);

  const mail = capturedEmails.find((e) => e.to.includes("eve@test.local"));
  expect(mail).toBeDefined();
  expect(mail.body).toMatch(/2025-07-15/);
  expect(mail.body).toMatch(/cancelled/i);
});

test("Default template is used for unknown event types", async () => {
  await sendNotification({
    eventType:  "SOME_UNKNOWN_EVENT",
    channels:   ["email"],
    recipients: [{ name: "Frank", email: "frank@test.local" }],
    data:       {},
  });
  await wait(2000);

  const mail = capturedEmails.find((e) => e.to.includes("frank@test.local"));
  expect(mail).toBeDefined();
  // Default template embeds the eventType string
  expect(mail.body).toMatch(/SOME_UNKNOWN_EVENT/);
});

test("Email log entry is created in DB with status=sent", async () => {
  await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   ["email"],
    recipients: [{ name: "Grace", email: "grace@test.local" }],
    data:       { doctorName: "Dr. Log", date: "2025-08-01", time: "08:00 AM" },
  });
  await wait(2000);

  const logs    = await getLogs();
  const emailLog = logs.find(
    (l) => l.channel === "email" &&
           l.recipient === "grace@test.local" &&
           l.status === "sent"
  );
  expect(emailLog).toBeDefined();
  expect(emailLog.eventType).toBe("APPOINTMENT_BOOKED");
});

test("Email is skipped when recipient has no email address", async () => {
  const before = capturedEmails.length;
  await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   ["email"],
    recipients: [{ name: "PhoneOnly", phone: "+94771234567" }],   // no email
    data:       { doctorName: "Dr. X", date: "2025-09-01", time: "10:00 AM" },
  });
  await wait(1500);
  // No new email should have been sent
  expect(capturedEmails.length).toBe(before);
});

// ═════════════════════════════════════════════════════════════════════════════
// ④ SMS channel (Text.lk)
// ═════════════════════════════════════════════════════════════════════════════

test("SMS is dispatched to Text.lk mock server for APPOINTMENT_BOOKED", async () => {
  const before = capturedSmsRequests.length;
  const res = await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   ["sms"],
    recipients: [{ name: "Hana", phone: "+94771000001" }],
    data:       { doctorName: "Dr. Kamal", date: "2025-10-01", time: "11:00 AM" },
  });
  expect(res.status()).toBe(200);
  await wait(2000);

  expect(capturedSmsRequests.length).toBeGreaterThan(before);
  const sms = capturedSmsRequests[capturedSmsRequests.length - 1];
  expect(sms.sender_id).toBe("MockSender");
  expect(sms.message).toBeDefined();
  expect(sms.message).toMatch(/Dr\. Kamal/);
});

test("SMS is dispatched for CONSULTATION_COMPLETED event", async () => {
  const before = capturedSmsRequests.length;
  await sendNotification({
    eventType:  "CONSULTATION_COMPLETED",
    channels:   ["sms"],
    recipients: [{ name: "Ivan", phone: "+94772000002" }],
    data:       {},
  });
  await wait(2000);

  expect(capturedSmsRequests.length).toBeGreaterThan(before);
  const sms = capturedSmsRequests[capturedSmsRequests.length - 1];
  expect(sms.message).toMatch(/consultation is complete/i);
});

test("SMS is dispatched for PAYMENT_SUCCESS event", async () => {
  const before = capturedSmsRequests.length;
  await sendNotification({
    eventType:  "PAYMENT_SUCCESS",
    channels:   ["sms"],
    recipients: [{ name: "Julia", phone: "+94773000003" }],
    data:       { amount: "1500" },
  });
  await wait(2000);

  expect(capturedSmsRequests.length).toBeGreaterThan(before);
  const sms = capturedSmsRequests[capturedSmsRequests.length - 1];
  expect(sms.message).toMatch(/1500/);
});

test("SMS log entry is created in DB with status=sent", async () => {
  await sendNotification({
    eventType:  "CONSULTATION_COMPLETED",
    channels:   ["sms"],
    recipients: [{ name: "Karl", phone: "+94774000004" }],
    data:       {},
  });
  await wait(2000);

  const logs   = await getLogs();
  const smsLog = logs.find(
    (l) => l.channel === "sms" &&
           l.recipient.includes("94774000004") &&
           l.status === "sent"
  );
  expect(smsLog).toBeDefined();
  expect(smsLog.eventType).toBe("CONSULTATION_COMPLETED");
});

test("SMS phone number is normalised for Sri Lankan numbers", async () => {
  const before = capturedSmsRequests.length;
  await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   ["sms"],
    // '077...' local format should be normalised to '94770...' by textlk.js
    recipients: [{ name: "Lena", phone: "0770000099" }],
    data:       { doctorName: "Dr. N", date: "2025-11-01", time: "09:00 AM" },
  });
  await wait(2000);

  expect(capturedSmsRequests.length).toBeGreaterThan(before);
  const sms = capturedSmsRequests[capturedSmsRequests.length - 1];
  // textlk.js strips non-digits and prepends 94
  expect(sms.recipient).toBe("94770000099");
});

test("SMS is skipped when recipient has no phone number", async () => {
  const before = capturedSmsRequests.length;
  await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   ["sms"],
    recipients: [{ name: "EmailOnly", email: "emailonly@test.local" }],  // no phone
    data:       { doctorName: "Dr. Y", date: "2025-12-01", time: "10:00 AM" },
  });
  await wait(1500);
  expect(capturedSmsRequests.length).toBe(before);
});

// ═════════════════════════════════════════════════════════════════════════════
// ⑤ WhatsApp channel (Twilio)
// ═════════════════════════════════════════════════════════════════════════════

test("POST /send accepts WhatsApp channel and returns 200 immediately", async () => {
  const res  = await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   ["whatsapp"],
    recipients: [{ name: "Mia", phone: "+94770000010" }],
    data:       { doctorName: "Dr. Ravi", date: "2025-09-10", time: "02:00 PM" },
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).success).toBe(true);
});

test("WhatsApp attempt is logged in DB (sent or failed) after processing", async () => {
  await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   ["whatsapp"],
    recipients: [{ name: "Noel", phone: "+94770000020" }],
    data:       { doctorName: "Dr. WA", date: "2025-09-15", time: "03:00 PM" },
  });

  // Twilio call may take a few seconds to fail with 401 from api.twilio.com
  await wait(8000);

  const logs  = await getLogs();
  const waLog = logs.find(
    (l) => l.channel === "whatsapp" && l.recipient.includes("94770000020")
  );
  expect(waLog).toBeDefined();
  // With invalid test credentials Twilio returns 401 → status is "failed".
  // If real sandbox credentials were provided the status would be "sent".
  expect(["sent", "failed"]).toContain(waLog.status);
  expect(waLog.eventType).toBe("APPOINTMENT_BOOKED");
});

test("WhatsApp failure does not crash the service — health check still OK", async () => {
  // Send a WhatsApp notification (will fail) then confirm the service is still alive
  await sendNotification({
    eventType:  "CONSULTATION_COMPLETED",
    channels:   ["whatsapp"],
    recipients: [{ name: "Omar", phone: "+94770000030" }],
    data:       {},
  });
  await wait(5000);

  const healthRes = await apiContext.get(`${notifBaseUrl}/health`);
  expect(healthRes.status()).toBe(200);
  expect((await healthRes.json()).status).toBe("OK");
});

// ═════════════════════════════════════════════════════════════════════════════
// ⑥ Multi-channel and multi-recipient scenarios
// ═════════════════════════════════════════════════════════════════════════════

test("POST /send delivers both email and SMS when both channels requested", async () => {
  const emailBefore = capturedEmails.length;
  const smsBefore   = capturedSmsRequests.length;

  await sendNotification({
    eventType:  "PAYMENT_SUCCESS",
    channels:   ["email", "sms"],
    recipients: [{ name: "Pat", email: "pat@test.local", phone: "+94775000001" }],
    data:       { amount: "4200" },
  });
  await wait(2000);

  expect(capturedEmails.length).toBeGreaterThan(emailBefore);
  expect(capturedSmsRequests.length).toBeGreaterThan(smsBefore);

  const mail = capturedEmails.find((e) => e.to.includes("pat@test.local"));
  expect(mail).toBeDefined();
  const sms  = capturedSmsRequests.find((s) => s.recipient && s.recipient.includes("94775000001"));
  expect(sms).toBeDefined();
});

test("POST /send notifies all three channels (email + sms + whatsapp)", async () => {
  const res = await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   ["email", "sms", "whatsapp"],
    recipients: [{ name: "Quinn", email: "quinn@test.local", phone: "+94776000001" }],
    data:       { doctorName: "Dr. All", date: "2025-10-10", time: "12:00 PM" },
  });
  expect(res.status()).toBe(200);
  // Allow enough time for SMS (fast) and Twilio (slower network failure)
  await wait(8000);

  const logs   = await getLogs();
  const recip  = logs.filter((l) =>
    (l.recipient === "quinn@test.local" || l.recipient.includes("94776000001"))
  );

  const channels = new Set(recip.map((l) => l.channel));
  expect(channels.has("email")).toBe(true);
  expect(channels.has("sms")).toBe(true);
  expect(channels.has("whatsapp")).toBe(true);
});

test("POST /send notifies multiple recipients individually", async () => {
  const before = capturedEmails.length;

  await sendNotification({
    eventType:  "APPOINTMENT_BOOKED",
    channels:   ["email"],
    recipients: [
      { name: "Doctor Ray",    email: "doctor.ray@test.local" },
      { name: "Patient Sam",   email: "patient.sam@test.local" },
    ],
    data: { doctorName: "Dr. Ray", date: "2025-11-20", time: "04:00 PM" },
  });
  await wait(2000);

  // Both recipients should have received an email
  expect(capturedEmails.length).toBeGreaterThanOrEqual(before + 2);
  expect(capturedEmails.some((e) => e.to.includes("doctor.ray@test.local"))).toBe(true);
  expect(capturedEmails.some((e) => e.to.includes("patient.sam@test.local"))).toBe(true);
});

// ═════════════════════════════════════════════════════════════════════════════
// ⑦ GET /api/notifications/logs
// ═════════════════════════════════════════════════════════════════════════════

test("GET /api/notifications/logs returns 200 with correct shape", async () => {
  const res  = await apiContext.get(`${notifBaseUrl}/api/notifications/logs`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body.logs)).toBe(true);
  expect(typeof body.count).toBe("number");
  expect(body.count).toBe(body.logs.length);
});

test("Log entries contain all required fields with valid enum values", async () => {
  const logs = await getLogs();
  expect(logs.length).toBeGreaterThan(0);

  const log = logs[0];
  expect(log).toHaveProperty("_id");
  expect(log).toHaveProperty("eventType");
  expect(log).toHaveProperty("recipient");
  expect(log).toHaveProperty("channel");
  expect(log).toHaveProperty("status");
  expect(log).toHaveProperty("createdAt");

  expect(["email", "sms", "whatsapp"]).toContain(log.channel);
  expect(["sent", "failed"]).toContain(log.status);
});

test("Logs are sorted newest-first", async () => {
  const logs = await getLogs();
  if (logs.length < 2) return;   // not enough data to verify ordering

  const t0 = new Date(logs[0].createdAt).getTime();
  const t1 = new Date(logs[1].createdAt).getTime();
  expect(t0).toBeGreaterThanOrEqual(t1);
});

test("Logs are capped at 100 entries", async () => {
  const logs = await getLogs();
  expect(logs.length).toBeLessThanOrEqual(100);
});

test("Both email and SMS logs appear after a multi-channel send", async () => {
  await sendNotification({
    eventType:  "PAYMENT_SUCCESS",
    channels:   ["email", "sms"],
    recipients: [{ name: "Tara", email: "tara@test.local", phone: "+94777000001" }],
    data:       { amount: "7777" },
  });
  await wait(2000);

  const logs    = await getLogs();
  const emailLg = logs.find((l) => l.channel === "email"   && l.recipient === "tara@test.local");
  const smsLg   = logs.find((l) => l.channel === "sms"     && l.recipient.includes("94777000001"));
  expect(emailLg).toBeDefined();
  expect(smsLg).toBeDefined();
  expect(emailLg.status).toBe("sent");
  expect(smsLg.status).toBe("sent");
});
