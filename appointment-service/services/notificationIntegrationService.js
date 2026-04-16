const PATIENT_SERVICE_URL =
  process.env.PATIENT_SERVICE_URL || "http://patient-service:3001";
const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:5005";
const DOCTOR_SERVICE_URL =
  process.env.DOCTOR_SERVICE_URL || "http://doctor-service:3004";
const INTER_SERVICE_API_KEY =
  process.env.INTER_SERVICE_API_KEY || "medico-internal-key-change-me";

const REQUEST_TIMEOUT_MS = Number(process.env.INTER_SERVICE_HTTP_TIMEOUT_MS || 5000);
const SUPPORTED_NOTIFICATION_CHANNELS = new Set(["email", "sms", "whatsapp"]);

const parseChannels = (value) =>
  (value || "")
    .split(",")
    .map((channel) => channel.trim().toLowerCase())
    .filter((channel) => SUPPORTED_NOTIFICATION_CHANNELS.has(channel));

const APPOINTMENT_NOTIFICATION_CHANNELS = parseChannels(
  process.env.APPOINTMENT_NOTIFICATION_CHANNELS || "email,sms,whatsapp"
);
const CONSULTATION_NOTIFICATION_CHANNELS = parseChannels(
  process.env.CONSULTATION_NOTIFICATION_CHANNELS ||
    process.env.APPOINTMENT_NOTIFICATION_CHANNELS ||
    "email,sms,whatsapp"
);

const getSignal = () => {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  }
  return undefined;
};

const formatDateForNotification = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

const fallbackDoctorName = (doctorId) => String(doctorId || "Doctor");

const getInternalHeaders = () => {
  const headers = {};
  if (INTER_SERVICE_API_KEY) {
    headers["x-internal-api-key"] = INTER_SERVICE_API_KEY;
  }
  return headers;
};

const fetchPatientContact = async (patientId) => {
  if (!patientId) return null;

  const response = await fetch(`${PATIENT_SERVICE_URL}/api/patients/internal/${patientId}/contact`, {
    method: "GET",
    headers: getInternalHeaders(),
    signal: getSignal(),
  });

  if (!response.ok) {
    throw new Error(`Patient contact lookup failed with status ${response.status}`);
  }

  const body = await response.json();
  return body?.patient || null;
};

const fetchDoctorContact = async (doctorId) => {
  if (!doctorId) return null;

  const response = await fetch(`${DOCTOR_SERVICE_URL}/api/doctors/internal/${doctorId}/contact`, {
    method: "GET",
    headers: getInternalHeaders(),
    signal: getSignal(),
  });

  if (!response.ok) {
    throw new Error(`Doctor contact lookup failed with status ${response.status}`);
  }

  const body = await response.json();
  return body?.doctor || null;
};

const fetchContactSafely = async (lookupLabel, lookup, id) => {
  if (!id) return null;

  try {
    return await lookup(id);
  } catch (error) {
    console.warn(`Failed to resolve ${lookupLabel} contact ${id}: ${error.message}`);
    return null;
  }
};

const buildRecipient = (contact, fallbackName) => {
  if (!contact) return null;

  const recipient = {
    name: contact.name || fallbackName,
  };

  if (contact.email) recipient.email = contact.email;
  if (contact.phone) recipient.phone = contact.phone;

  if (!recipient.email && !recipient.phone) return null;
  return recipient;
};

const resolveRecipients = (patient, doctor) => {
  const recipients = [];
  const patientRecipient = buildRecipient(patient, "Patient");
  const doctorRecipient = buildRecipient(doctor, "Doctor");
  if (patientRecipient) recipients.push(patientRecipient);
  if (doctorRecipient) recipients.push(doctorRecipient);
  return recipients;
};

const hasAddressableRecipientsForChannels = (recipients, channels) => {
  if (!recipients.length || !channels.length) return false;

  if (channels.includes("email") && recipients.some((r) => Boolean(r.email))) {
    return true;
  }

  if (
    (channels.includes("sms") || channels.includes("whatsapp")) &&
    recipients.some((r) => Boolean(r.phone))
  ) {
    return true;
  }

  return false;
};

const queueEventNotification = async ({ eventType, channels, appointment }) => {
  if (!NOTIFICATION_SERVICE_URL || !channels.length) {
    return;
  }

  try {
    const [patient, doctor] = await Promise.all([
      fetchContactSafely("patient", fetchPatientContact, appointment.patientId),
      fetchContactSafely("doctor", fetchDoctorContact, appointment.doctorId),
    ]);

    const recipients = resolveRecipients(patient, doctor);
    if (!hasAddressableRecipientsForChannels(recipients, channels)) {
      console.warn(
        `Skipping ${eventType} notification due to missing contact details for configured channels.`
      );
      return;
    }

    const payload = {
      eventType,
      channels,
      recipients,
      data: {
        doctorName: doctor?.name || fallbackDoctorName(appointment.doctorId),
        date: formatDateForNotification(appointment.date),
        time: appointment.time,
      },
    };

    const response = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getInternalHeaders(),
      },
      body: JSON.stringify(payload),
      signal: getSignal(),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      console.warn(`Failed to queue ${eventType} notification (${response.status}): ${bodyText}`);
    }
  } catch (error) {
    console.warn(`Failed to send ${eventType} notification: ${error.message}`);
  }
};

export const queueAppointmentBookedNotification = async ({ appointment }) =>
  queueEventNotification({
    eventType: "APPOINTMENT_BOOKED",
    channels: APPOINTMENT_NOTIFICATION_CHANNELS,
    appointment,
  });

export const queueAppointmentConfirmedNotification = async ({ appointment }) =>
  queueEventNotification({
    eventType: "APPOINTMENT_CONFIRMED",
    channels: APPOINTMENT_NOTIFICATION_CHANNELS,
    appointment,
  });

export const queueAppointmentCancelledNotification = async ({ appointment }) =>
  queueEventNotification({
    eventType: "APPOINTMENT_CANCELLED",
    channels: APPOINTMENT_NOTIFICATION_CHANNELS,
    appointment,
  });

export const queueConsultationCompletedNotification = async ({ appointment }) =>
  queueEventNotification({
    eventType: "CONSULTATION_COMPLETED",
    channels: CONSULTATION_NOTIFICATION_CHANNELS,
    appointment,
  });
