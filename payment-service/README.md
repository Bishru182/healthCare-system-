# 💳 Payment Service

> Microservice responsible for handling payments for doctor consultations in the **Healthcare Distributed Platform**.
> Built with **Node.js · Express · MongoDB (Mongoose)** using ES Modules and clean architecture.

---

## 📁 Project Structure

```
payment-service/
├── config/
│   ├── db.js                  # MongoDB connection
│   └── constants.js           # App-wide enums & constants
├── controllers/
│   └── payment.controller.js  # Request/response layer
├── middleware/
│   ├── auth.middleware.js      # JWT authentication
│   ├── error.middleware.js     # Global error handler + AppError
│   ├── logger.middleware.js    # Morgan request logger
│   └── validate.middleware.js  # express-validator rules
├── models/
│   └── Payment.js             # Mongoose schema
├── routes/
│   └── payment.routes.js      # Express router
├── services/
│   ├── gateway/
│   │   ├── mock.gateway.js    # Mock payment gateway adapter
│   │   └── gateway.factory.js # Selects active gateway by env var
│   ├── notification.service.js # Inter-service HTTP calls
│   └── payment.service.js     # Core business logic
├── app.js                     # Express app factory
├── server.js                  # Entry point + graceful shutdown
├── Dockerfile                 # Multi-stage production image
├── docker-compose.yml         # Local dev stack
├── .env.example               # Environment variable template
└── package.json
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable                   | Default                              | Description                              |
|----------------------------|--------------------------------------|------------------------------------------|
| `PORT`                     | `5003`                               | HTTP server port                         |
| `MONGO_URI`                | `mongodb://localhost:27017/payment_service` | MongoDB connection string          |
| `JWT_SECRET`               | —                                    | Must match Auth/Patient Service secret   |
| `PAYMENT_PROVIDER`         | `mock`                               | `mock` \| `stripe` \| `payhere`         |
| `NOTIFICATION_SERVICE_URL` | `http://localhost:5004`              | Notification Service base URL            |
| `APPOINTMENT_SERVICE_URL`  | `http://localhost:5002`              | Appointment Service base URL             |

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Create your .env
cp .env.example .env

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
docker-compose up --build

# Stop
docker-compose down
```

---

## 📡 API Endpoints

All endpoints require a valid **Bearer JWT token** in the `Authorization` header.

```
Authorization: Bearer <your_token>
```

### `POST /api/payments/create`
Create a new payment record (status = `pending`).

**Request body:**
```json
{
  "appointmentId": "664a1b2c3d4e5f6789abcdef",
  "amount": 150.00,
  "currency": "USD",
  "paymentMethod": "mock"
}
```
> `patientId` is extracted automatically from the JWT — never sent in the body.

**Response `201`:**
```json
{
  "success": true,
  "message": "Payment created successfully. Status: pending.",
  "data": { "_id": "...", "status": "pending", ... }
}
```

---

### `POST /api/payments/confirm`
Simulate a successful gateway charge. Sets status → `completed` and generates a `transactionId`.

**Request body:**
```json
{ "paymentId": "664a1b2c3d4e5f6789abcde0" }
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Payment confirmed successfully.",
  "data": { "status": "completed", "transactionId": "MOCK-TXN-...", ... }
}
```

---

### `POST /api/payments/fail`
Simulate a payment failure. Sets status → `failed`.

**Request body:**
```json
{
  "paymentId": "664a1b2c3d4e5f6789abcde0",
  "reason": "Insufficient funds"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Payment marked as failed.",
  "data": { "status": "failed", "failureReason": "Insufficient funds", ... }
}
```

---

### `GET /api/payments/:id`
Get a single payment by its MongoDB `_id`.

**Response `200`:**
```json
{
  "success": true,
  "data": { "_id": "...", "status": "completed", ... }
}
```

---

### `GET /api/payments/patient/:patientId`
Get all payments for a patient (newest first).
- Patients can only access **their own** records.
- `admin` and `doctor` roles can access any patient's records.

**Response `200`:**
```json
{
  "success": true,
  "count": 3,
  "data": [ ... ]
}
```

---

### `GET /health`
Health check (no auth required).
```json
{
  "service": "payment-service",
  "status": "UP",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "provider": "mock"
}
```

---

## 🔒 Authentication & Security

- All routes are protected by **JWT middleware** (`auth.middleware.js`)
- `patientId` is always extracted from the **verified token**, never from the request body
- Sensitive fields (`cardNumber`, `cvv`, etc.) are **redacted** from logs
- Duplicate payments per `appointmentId` are **prevented** at the database level (unique index)

---

## 🔗 Inter-Service Communication

| Direction           | Target                  | Trigger                        |
|---------------------|-------------------------|--------------------------------|
| Payment → Notification | `POST /api/notifications/send` | After completed / failed payment |

Notification calls are **fire-and-forget** — errors are logged but never surface to the client.

---

## 📊 Payment Status Lifecycle

```
create          confirm
pending ──────► completed
   │
   └─────────► failed
       fail
```

---

## 🏗️ Adding a Real Gateway (Stripe / PayHere)

1. Create `services/gateway/stripe.gateway.js` exporting `chargePayment` and `refundPayment`
2. Register it in `services/gateway/gateway.factory.js` under the `stripe` case
3. Set `PAYMENT_PROVIDER=stripe` in `.env`

No other files need to change.

---

## 🧪 Quick Test with curl

```bash
# 1. Create payment
curl -X POST http://localhost:5003/api/payments/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId":"664a1b2c3d4e5f6789abcdef","amount":120,"currency":"USD"}'

# 2. Confirm it
curl -X POST http://localhost:5003/api/payments/confirm \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"paymentId":"<id from step 1>"}'

# 3. Get payment
curl http://localhost:5003/api/payments/<id> \
  -H "Authorization: Bearer <token>"
```
