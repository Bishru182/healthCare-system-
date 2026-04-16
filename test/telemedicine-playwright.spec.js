import { test, expect, request } from "@playwright/test";
import { MongoMemoryServer } from "mongodb-memory-server";
import axios from "axios";
import jwt from "jsonwebtoken";
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const telemedicineServiceDir = path.join(repoRoot, "telemedicine-service");
const frontendDir = path.join(repoRoot, "frontend");

const TEST_JWT_SECRET = "telemedicine-playwright-secret";
const DOCTOR_ID = "64b8c4a0f1234567890abc11";
const PATIENT_ID = "64b8c4a0f1234567890abc22";
const STRANGER_ID = "64b8c4a0f1234567890abc33";

const doctorToken = jwt.sign({ id: DOCTOR_ID, role: "doctor" }, TEST_JWT_SECRET, {
  expiresIn: "2h",
});
const patientToken = jwt.sign({ id: PATIENT_ID, role: "patient" }, TEST_JWT_SECRET, {
  expiresIn: "2h",
});
const strangerToken = jwt.sign({ id: STRANGER_ID, role: "patient" }, TEST_JWT_SECRET, {
  expiresIn: "2h",
});

const frontendPort = 4173;
let telemedicinePort;
let appointmentPort;
let telemedicineBaseUrl;
let frontendBaseUrl;

let mongoServer;
let appointmentServer;
let telemedicineProcess;
let frontendProcess;
let apiContext;

const appointmentStatusUpdates = [];
const processLogs = {
  telemedicine: [],
  frontend: [],
};

const FAKE_JITSI_SCRIPT = `
window.JitsiMeetExternalAPI = function(domain, options) {
  this.domain = domain;
  this.options = options;
  this._listeners = {};

  var marker = document.createElement('div');
  marker.className = 'fake-jitsi-ready';
  marker.setAttribute('data-domain', domain);
  marker.setAttribute('data-room', options.roomName);
  marker.textContent = 'Fake Jitsi connected to ' + options.roomName;

  if (options.parentNode) {
    options.parentNode.appendChild(marker);
  }

  this.addListener = function(name, callback) {
    this._listeners[name] = callback;
  };

  this.executeCommand = function(command) {
    if (command === 'hangup' && this._listeners.readyToClose) {
      this._listeners.readyToClose();
    }
  };

  this.dispose = function() {
    if (marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
  };
};
`;

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((closeError) => {
        if (closeError) return reject(closeError);
        if (!port) return reject(new Error("Could not allocate a free port."));
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
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        return resolve(JSON.parse(raw));
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

    const url = new URL(req.url || "/", "http://127.0.0.1");
    const getMatch = url.pathname.match(/^\/api\/appointments\/([^/]+)$/);
    const putMatch = url.pathname.match(/^\/api\/appointments\/([^/]+)\/status$/);

    if (req.method === "GET" && getMatch) {
      const appointmentId = getMatch[1];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          appointment: {
            _id: appointmentId,
            doctorId: DOCTOR_ID,
            patientId: PATIENT_ID,
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: "confirmed",
          },
        })
      );
      return;
    }

    if (req.method === "PUT" && putMatch) {
      const payload = await readRequestBody(req);
      appointmentStatusUpdates.push({
        appointmentId: putMatch[1],
        payload,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, appointment: { _id: putMatch[1], ...payload } }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, message: "Mock route not found." }));
  });
}

function startProcess(command, args, { cwd, env, logKey }) {
  const useShell =
    process.platform === "win32" && /\.(cmd|bat)$/i.test(command);

  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    shell: useShell,
  });

  child.stdout.on("data", (chunk) => {
    processLogs[logKey].push(chunk.toString());
  });
  child.stderr.on("data", (chunk) => {
    processLogs[logKey].push(chunk.toString());
  });

  return child;
}

async function waitForHttp(url, { timeoutMs = 45000, processRef, processName }) {
  const startedAt = Date.now();
  let lastError = "";

  while (Date.now() - startedAt < timeoutMs) {
    if (processRef && processRef.exitCode !== null) {
      const logs = processLogs[processName].join("");
      throw new Error(
        `${processName} exited early with code ${processRef.exitCode}. Logs:\n${logs}`
      );
    }

    try {
      const response = await axios.get(url, {
        timeout: 1500,
        validateStatus: () => true,
      });
      if (response.status < 500) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Timed out waiting for ${url}. Last error: ${lastError}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;

  child.kill("SIGTERM");

  const exited = await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 5000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });

  if (!exited && child.pid) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"]);
    } else {
      child.kill("SIGKILL");
    }
  }
}

async function createSession(appointmentId) {
  const response = await apiContext.post(`${telemedicineBaseUrl}/api/telemedicine/sessions`, {
    headers: authHeader(doctorToken),
    data: { appointmentId },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBeTruthy();
  return body.session;
}

async function configureUserContext(context, { role, token, user }) {
  void role;
  void token;
  void user;

  await context.addInitScript(() => {
    if (typeof window.JitsiMeetExternalAPI === "function") return;

    window.JitsiMeetExternalAPI = function JitsiMeetExternalAPI(domain, options) {
      this.domain = domain;
      this.options = options;
      this.listeners = {};

      const marker = document.createElement("div");
      marker.className = "fake-jitsi-ready";
      marker.setAttribute("data-domain", domain);
      marker.setAttribute("data-room", options.roomName);
      marker.textContent = `Fake Jitsi connected to ${options.roomName}`;

      if (options.parentNode) {
        options.parentNode.appendChild(marker);
      }

      this.addListener = (name, callback) => {
        this.listeners[name] = callback;
      };

      this.executeCommand = (command) => {
        if (command === "hangup" && this.listeners.readyToClose) {
          this.listeners.readyToClose();
        }
      };

      this.dispose = () => {
        if (marker.parentNode) {
          marker.parentNode.removeChild(marker);
        }
      };
    };
  });

  await context.route(/\/api\/telemedicine\/.*/, async (route, request) => {
    const originalUrl = new URL(request.url());
    const targetUrl = `${telemedicineBaseUrl}${originalUrl.pathname}${originalUrl.search}`;
    const response = await route.fetch({ url: targetUrl });
    await route.fulfill({ response });
  });

  await context.route(/external_api\.js(?:\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: FAKE_JITSI_SCRIPT,
    })
  );
}

test.beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  appointmentPort = await getFreePort();
  telemedicinePort = await getFreePort();

  appointmentServer = createAppointmentMockServer();
  await new Promise((resolve, reject) => {
    appointmentServer.once("error", reject);
    appointmentServer.listen(appointmentPort, "127.0.0.1", () => resolve());
  });

  telemedicineBaseUrl = `http://127.0.0.1:${telemedicinePort}`;
  frontendBaseUrl = `http://localhost:${frontendPort}`;

  telemedicineProcess = startProcess(process.execPath, ["server.js"], {
    cwd: telemedicineServiceDir,
    logKey: "telemedicine",
    env: {
      PORT: String(telemedicinePort),
      NODE_ENV: "test",
      MONGO_URI: mongoServer.getUri(),
      JWT_SECRET: TEST_JWT_SECRET,
      APPOINTMENT_SERVICE_URL: `http://127.0.0.1:${appointmentPort}`,
      JITSI_DOMAIN: "meet.jit.si",
    },
  });

  await waitForHttp(`${telemedicineBaseUrl}/`, {
    timeoutMs: 60000,
    processRef: telemedicineProcess,
    processName: "telemedicine",
  });

  if (process.platform === "win32") {
    const winCommand =
      `set "VITE_TELEMEDICINE_API=${telemedicineBaseUrl}/api/telemedicine"` +
      ` && npm run dev -- --host localhost --port ${frontendPort} --strictPort`;
    frontendProcess = startProcess("cmd.exe", ["/d", "/s", "/c", winCommand], {
      cwd: frontendDir,
      logKey: "frontend",
      env: {},
    });
  } else {
    frontendProcess = startProcess(
      "npm",
      ["run", "dev", "--", "--host", "localhost", "--port", String(frontendPort), "--strictPort"],
      {
        cwd: frontendDir,
        logKey: "frontend",
        env: {
          VITE_TELEMEDICINE_API: `${telemedicineBaseUrl}/api/telemedicine`,
        },
      }
    );
  }

  await waitForHttp(`${frontendBaseUrl}/`, {
    timeoutMs: 60000,
    processRef: frontendProcess,
    processName: "frontend",
  });

  apiContext = await request.newContext();
});

test.afterAll(async () => {
  await apiContext?.dispose();

  await stopProcess(frontendProcess);
  await stopProcess(telemedicineProcess);

  if (appointmentServer) {
    await new Promise((resolve) => appointmentServer.close(() => resolve()));
  }

  await mongoServer?.stop();
});

test("telemedicine API lifecycle and authorization", async () => {
  const appointmentId = "64b8c4a0f1234567890abc91";
  const session = await createSession(appointmentId);

  const duplicateResponse = await apiContext.post(`${telemedicineBaseUrl}/api/telemedicine/sessions`, {
    headers: authHeader(doctorToken),
    data: { appointmentId },
  });
  expect(duplicateResponse.ok()).toBeTruthy();
  const duplicateBody = await duplicateResponse.json();
  expect(duplicateBody.session._id).toBe(session._id);

  const doctorJoinResponse = await apiContext.get(
    `${telemedicineBaseUrl}/api/telemedicine/sessions/${session._id}/join-info`,
    { headers: authHeader(doctorToken) }
  );
  expect(doctorJoinResponse.status()).toBe(200);
  const doctorJoinBody = await doctorJoinResponse.json();
  expect(doctorJoinBody.joinInfo.isModerator).toBe(true);

  const patientJoinResponse = await apiContext.get(
    `${telemedicineBaseUrl}/api/telemedicine/sessions/${session._id}/join-info`,
    { headers: authHeader(patientToken) }
  );
  expect(patientJoinResponse.status()).toBe(200);
  const patientJoinBody = await patientJoinResponse.json();
  expect(patientJoinBody.joinInfo.isModerator).toBe(false);

  const strangerResponse = await apiContext.get(
    `${telemedicineBaseUrl}/api/telemedicine/sessions/${session._id}/join-info`,
    { headers: authHeader(strangerToken) }
  );
  expect(strangerResponse.status()).toBe(403);

  const startResponse = await apiContext.put(
    `${telemedicineBaseUrl}/api/telemedicine/sessions/${session._id}/start`,
    { headers: authHeader(patientToken), data: {} }
  );
  expect(startResponse.status()).toBe(200);

  const endResponse = await apiContext.put(
    `${telemedicineBaseUrl}/api/telemedicine/sessions/${session._id}/end`,
    {
      headers: authHeader(doctorToken),
      data: { notes: "Playwright doctor notes" },
    }
  );
  expect(endResponse.status()).toBe(200);

  const fetchResponse = await apiContext.get(
    `${telemedicineBaseUrl}/api/telemedicine/sessions/${session._id}`,
    { headers: authHeader(doctorToken) }
  );
  expect(fetchResponse.status()).toBe(200);
  const fetchBody = await fetchResponse.json();
  expect(fetchBody.session.status).toBe("completed");
  expect(fetchBody.session.consultationNotes).toBe("Playwright doctor notes");

  expect(
    appointmentStatusUpdates.some(
      (update) => update.appointmentId === appointmentId && update.payload.status === "completed"
    )
  ).toBeTruthy();
});

test("doctor and patient open the same video room", async ({ browser }) => {
  const appointmentId = "64b8c4a0f1234567890abc92";
  const session = await createSession(appointmentId);

  const doctorContext = await browser.newContext();
  const patientContext = await browser.newContext();

  await configureUserContext(doctorContext, {
    role: "doctor",
    token: doctorToken,
    user: { id: DOCTOR_ID, name: "Doctor Playwright" },
  });

  await configureUserContext(patientContext, {
    role: "patient",
    token: patientToken,
    user: { id: PATIENT_ID, name: "Patient Playwright" },
  });

  const doctorPage = await doctorContext.newPage();
  const patientPage = await patientContext.newPage();

  await Promise.all([
    doctorPage.goto(`${frontendBaseUrl}/login`),
    patientPage.goto(`${frontendBaseUrl}/login`),
  ]);

  await doctorPage.evaluate(
    ({ role, token, user }) => {
      localStorage.setItem("medico_role", role);
      localStorage.setItem("medico_token", token);
      localStorage.setItem("medico_user", JSON.stringify(user));
    },
    {
      role: "doctor",
      token: doctorToken,
      user: { id: DOCTOR_ID, name: "Doctor Playwright" },
    }
  );

  await patientPage.evaluate(
    ({ role, token, user }) => {
      localStorage.setItem("medico_role", role);
      localStorage.setItem("medico_token", token);
      localStorage.setItem("medico_user", JSON.stringify(user));
    },
    {
      role: "patient",
      token: patientToken,
      user: { id: PATIENT_ID, name: "Patient Playwright" },
    }
  );

  await Promise.all([
    doctorPage.goto(`${frontendBaseUrl}/doctor/consultations/${session._id}`),
    patientPage.goto(`${frontendBaseUrl}/patient/consultations/${session._id}`),
  ]);

  await expect(doctorPage).toHaveURL(
    new RegExp(`/doctor/consultations/${session._id}$`)
  );
  await expect(patientPage).toHaveURL(
    new RegExp(`/patient/consultations/${session._id}$`)
  );

  await expect
    .poll(() => doctorPage.evaluate(() => typeof window.JitsiMeetExternalAPI))
    .toBe("function");
  await expect
    .poll(() => patientPage.evaluate(() => typeof window.JitsiMeetExternalAPI))
    .toBe("function");

  await expect(doctorPage.getByText(session.roomName, { exact: false })).toBeVisible();
  await expect(patientPage.getByText(session.roomName, { exact: false })).toBeVisible();

  await doctorPage.getByRole("button", { name: /End Session/i }).click();
  await expect(doctorPage).toHaveURL(/\/doctor\/consultations$/);

  const sessionAfterEnd = await apiContext.get(
    `${telemedicineBaseUrl}/api/telemedicine/sessions/${session._id}`,
    { headers: authHeader(doctorToken) }
  );
  expect(sessionAfterEnd.status()).toBe(200);
  const sessionAfterEndBody = await sessionAfterEnd.json();
  expect(sessionAfterEndBody.session.status).toBe("completed");

  await doctorContext.close();
  await patientContext.close();
});
