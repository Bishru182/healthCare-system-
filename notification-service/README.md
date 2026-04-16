# 🔔 Notification Service

> Microservice responsible for dispatching **email** and **SMS** notifications for the **Healthcare Distributed Platform**.
> Built with **Node.js · Express · MongoDB (Mongoose) · Nodemailer · Twilio** using ES Modules and clean architecture.

---

## 📁 Project Structure

```
notification-service/
├── src/
│   ├── config/
│   │   ├── db.js                          # MongoDB connection
│   │   ├── mailer.js                      # Nodemailer Gmail transport
│   │   └── twilio.js                      # Twilio SMS client
│   ├── controllers/
│   │   └── notificationController.js      # Request/response layer
│   ├── models/
│   │   └── NotificationLog.js             # Mongoose audit-log schema
│   ├── routes/
│   │   └── notificationRoutes.js          # Express router
│   ├── services/
│   │   └── templateService.js             # Event-based message templates
│   └── app.js                             # Express app factory
├── k8s/                                   # Kubernetes manifests
│   ├── namespace.yaml
│   ├── notification-serviceaccount.yaml
│   ├── notification-configmap.yaml
│   ├── notification-secret.yaml
│   ├── notification-deployment.yaml
│   ├── notification-service.yaml
│   ├── notification-hpa.yaml
│   └── kustomization.yaml
├── server.js                              # Entry point + graceful shutdown
├── Dockerfile                             # Production image
├── .env.example                           # Environment variable template
└── package.json
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable       | Default                              | Description                               |
|----------------|--------------------------------------|-------------------------------------------|
| `PORT`         | `5005`                               | HTTP server port                          |
| `MONGO_URI`    | `mongodb://localhost:27021/notification` | MongoDB connection string              |
| `EMAIL_USER`   | —                                    | Gmail address for sending emails          |
| `EMAIL_PASS`   | —                                    | Gmail App Password (not regular password) |
| `TWILIO_SID`   | —                                    | Twilio Account SID                        |
| `TWILIO_AUTH`  | —                                    | Twilio Auth Token                         |
| `TWILIO_PHONE` | —                                    | Twilio phone number (E.164 format)        |
| `TWILIO_WHATSAPP_FROM` | —                             | Optional WhatsApp sender (`whatsapp:+...`), falls back to `TWILIO_PHONE` |

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Create your .env
cp .env.example .env
# ⚠️  Fill in your Gmail App Password & Twilio credentials

# 3. Start (requires MongoDB running locally)
npm start

# 4. Development mode with auto-reload
npm run dev
```

---

## 🐳 Running with Docker

```bash
# Create the shared network (once, across all services)
docker network create healthcare-net

# Build and start the service + MongoDB
docker-compose up --build notification-service

# Stop
docker-compose down
```

---

## ☸️ Running with Kubernetes

```bash
# Apply all manifests via Kustomize
kubectl apply -k k8s/

# Verify
kubectl get pods -l app=notification-service
```

---

## 📡 API Endpoints

### `POST /api/notifications/send`
Dispatch email, SMS, and/or WhatsApp notifications. Returns **200 immediately** (fire-and-forget processing).

**Request body:**
```json
{
  "eventType": "APPOINTMENT_BOOKED",
  "channels": ["email", "sms", "whatsapp"],
  "recipients": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+94771234567"
    }
  ],
  "data": {
    "doctorName": "Smith",
    "date": "2026-04-20",
    "time": "10:00 AM"
  }
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Notification request accepted. Processing in background."
}
```

---

### `GET /api/notifications/logs`
Retrieve the most recent 100 notification audit logs (newest first).

**Response `200`:**
```json
{
  "success": true,
  "count": 42,
  "logs": [
    {
      "_id": "...",
      "eventType": "APPOINTMENT_BOOKED",
      "recipient": "john@example.com",
      "channel": "email",
      "status": "sent",
      "errorMessage": null,
      "createdAt": "2026-04-16T10:30:00.000Z",
      "updatedAt": "2026-04-16T10:30:00.000Z"
    }
  ]
}
```

---

### `GET /health`
Health check (no auth required).
```json
{
  "status": "OK",
  "service": "notification-service"
}
```

---

## 📨 Supported Event Types

| Event Type               | Template Message                                                    |
|--------------------------|---------------------------------------------------------------------|
| `APPOINTMENT_BOOKED`     | "Confirmed! Appointment with Dr. {doctorName} on {date} at {time}." |
| `CONSULTATION_COMPLETED` | "Your consultation is complete. Check your dashboard for prescriptions." |
| `PAYMENT_SUCCESS`        | "Payment of LKR {amount} received successfully."                    |
| `APPOINTMENT_CANCELLED`  | "Your appointment on {date} has been cancelled."                    |

---

## 🔗 Inter-Service Communication

Other microservices call `POST /api/notifications/send` to trigger notifications:

| Calling Service     | Trigger Event                              |
|---------------------|--------------------------------------------|
| Appointment Service | Appointment booked / cancelled             |
| Payment Service     | Payment confirmed / failed                 |
| Telemedicine Service| Consultation completed                     |

All calls are **fire-and-forget** — the notification service returns 200 immediately so the caller is never blocked.

---

## 🧪 Quick Test with curl

```bash
# 1. Send a notification
curl -X POST http://localhost:5005/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "APPOINTMENT_BOOKED",
    "channels": ["email", "whatsapp"],
    "recipients": [{"name": "Test", "email": "test@example.com", "phone": "+94771234567"}],
    "data": {"doctorName": "Silva", "date": "2026-04-20", "time": "10:00 AM"}
  }'

# 2. View logs
curl http://localhost:5005/api/notifications/logs
```
