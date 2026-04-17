# API Keys and Auth Documentation

## Purpose
This document lists all API keys, tokens, and secrets used in this healthcare system, where they are used, and how to configure and rotate them safely.

## Auth Methods Used in This Project

| Method | Header/Source | Used For |
|---|---|---|
| JWT bearer token | Authorization: Bearer <token> | User auth for protected API routes |
| Internal service API key | x-internal-api-key: <key> | Trusted service-to-service contact lookups |
| Stripe webhook signature | Stripe-Signature: <signature> | Verifying Stripe webhook authenticity (non-sandbox mode) |
| Provider credentials in env | process.env.* | Textlk, Twilio, SMTP, Cloudinary, Stripe integrations |

## Complete Key and Secret Inventory

### Core cross-service auth keys

| Key | Required | Used By | Purpose | Notes |
|---|---|---|---|---|
| JWT_SECRET | Yes | patient-service, appointment-service, doctor-service, payment-service, telemedicine-service | Signs and verifies JWT tokens | Must be identical across services that verify shared tokens |
| INTER_SERVICE_API_KEY | Yes for internal contact lookups | appointment-service, patient-service, doctor-service, payment-service | Authenticates trusted internal calls using x-internal-api-key header | Must be identical across services that call or validate internal endpoints |
| APPOINTMENT_SERVICE_TOKEN | Optional but recommended for webhook-driven status updates | payment-service | Service token used by payment webhooks to update appointment status | Token must carry a role permitted by appointment-service status route |

### Payment provider keys

| Key | Required | Used By | Purpose | Notes |
|---|---|---|---|---|
| PAYMENT_PROVIDER | Yes | payment-service | Selects gateway: mock, stripe, payhere | Case-insensitive by config normalization |
| STRIPE_SECRET_KEY | Required when using live Stripe integration | payment-service | Stripe API secret key | Should be sk_test_* in test mode |
| STRIPE_WEBHOOK_SECRET | Required when validating real Stripe webhooks | payment-service | Verifies Stripe-Signature header | Needed when STRIPE_SANDBOX_MODE is false |
| STRIPE_SANDBOX_MODE | Optional | payment-service | Enables simulated Stripe checkout/webhook flow | true avoids real Stripe API dependency |

### Notification provider keys

| Key | Required | Used By | Purpose | Notes |
|---|---|---|---|---|
| TEXTLK_API_TOKEN | Required for Textlk SMS | notification-service | Bearer token for Textlk SMS API | Used in Authorization header to Textlk |
| TEXTLK_SENDER_ID | Required for Textlk SMS | notification-service | Approved sender identifier | Must match provider-approved sender |
| TEXTLK_SMS_API_URL | Optional | notification-service | Textlk endpoint override | Defaults to https://app.text.lk/api/v3/sms/send |
| TEXTLK_SMS_TYPE | Optional | notification-service | SMS type payload value | Defaults to plain |
| TWILIO_SID | Required for Twilio SMS/WhatsApp | notification-service | Twilio account SID | Used with TWILIO_AUTH |
| TWILIO_AUTH | Required for Twilio SMS/WhatsApp | notification-service | Twilio auth token | Keep secret |
| TWILIO_PHONE | Required for Twilio SMS and fallback | notification-service | Twilio from number | Also used as WhatsApp fallback sender when needed |
| TWILIO_WHATSAPP_FROM | Optional but recommended | notification-service | Explicit WhatsApp sender (whatsapp:+...) | If empty, service tries TWILIO_PHONE |
| EMAIL_USER | Required for authenticated SMTP/Gmail sending | notification-service | Sender email account | Used as from address |
| EMAIL_PASS | Required for authenticated SMTP/Gmail sending | notification-service | SMTP or Gmail app password | Never commit this value |
| SMTP_HOST | Optional | notification-service | Custom SMTP host | If not set, transporter falls back to Gmail service mode |
| SMTP_PORT | Optional | notification-service | Custom SMTP port | Used with SMTP_HOST |

### Storage provider keys

| Key | Required | Used By | Purpose | Notes |
|---|---|---|---|---|
| CLOUD_NAME | Required for report upload/delete | patient-service | Cloudinary cloud name | Used by multer storage and report cleanup |
| CLOUD_API_KEY | Required for report upload/delete | patient-service | Cloudinary API key | Keep private |
| CLOUD_API_SECRET | Required for report upload/delete | patient-service | Cloudinary API secret | Keep private |

### Admin bootstrap credentials

| Key | Required | Used By | Purpose | Notes |
|---|---|---|---|---|
| ADMIN_EMAIL | Optional | create-admin.js, setup-admin.js | Admin seed email | Defaults to admin@medico.local |
| ADMIN_PASSWORD | Optional | create-admin.js, setup-admin.js | Admin seed password | Change immediately after bootstrap |
| ADMIN_NAME | Optional | create-admin.js, setup-admin.js | Admin display name | Defaults to Administrator |

## Endpoint Header Requirements

## 1) JWT bearer token required
Header format:
Authorization: Bearer <jwt>

Protected route groups:
- patient-service: /api/patients/me, /api/patients/reports/*, /api/patients/history, /api/patients/prescriptions
- appointment-service: all routes under /api/appointments
- doctor-service: /api/doctors/me, /api/doctors/availability/*, /api/doctors/prescriptions/*, /api/doctors/appointments/*, /api/doctors/admin/pending, /api/doctors/:id/verify
- payment-service: all /api/payments routes except /api/payments/webhook/:provider; /health is public
- telemedicine-service: all routes under /api/telemedicine

## 2) Internal API key required
Header format:
x-internal-api-key: <INTER_SERVICE_API_KEY>

Endpoints:
- GET /api/patients/internal/:id/contact
- GET /api/doctors/internal/:id/contact

## 3) Stripe webhook signature header (live mode)
Header format:
Stripe-Signature: <signature>

Endpoint:
- POST /api/payments/webhook/stripe

Note:
- In sandbox mode, webhook verification is simulated and does not require real Stripe signature validation.

## Where to Configure

Current templates and references:
- patient env template: [patient-service/.env.example](patient-service/.env.example)
- appointment env template: [appointment-service/.env.example](appointment-service/.env.example)
- payment env template: [payment-service/.env.example](payment-service/.env.example)
- notification env variable reference: [notification-service/README.md](notification-service/README.md)
- Docker Compose environment wiring: [docker-compose.yml](docker-compose.yml)

Important:
- docker-compose currently includes development defaults for JWT_SECRET and INTER_SERVICE_API_KEY. Replace these with strong secrets for shared or production environments.

## Generate Strong Secrets Quickly

PowerShell examples:

```powershell
# JWT secret (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Internal API key
node -e "console.log('medico-' + require('crypto').randomBytes(24).toString('hex'))"
```

## Key Rotation Checklist

1. Generate new JWT_SECRET and INTER_SERVICE_API_KEY.
2. Update all dependent services together.
3. Restart services in one deployment window.
4. Verify internal endpoints and login flows.
5. Rotate provider keys (Stripe, Twilio, Textlk, SMTP, Cloudinary) in their dashboards.
6. Update .env, CI secrets, and orchestration secrets.
7. Re-run endpoint smoke tests and notification tests.

## Security Rules

- Never commit real secrets to Git.
- Use environment variables or secret managers for all keys.
- Prefer short-lived tokens where possible.
- Restrict API key scope at provider level.
- Rotate keys immediately if leaked.
