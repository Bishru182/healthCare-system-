# Healthcare System API Documentation (Table Format)

## Base URLs

| Service | Local Base URL |
|---|---|
| Patient Service | http://localhost:3001 |
| Appointment Service | http://localhost:3002 |
| Payment Service | http://localhost:3003 |
| Doctor Service | http://localhost:3004 |
| Telemedicine Service | http://localhost:3005 |
| Notification Service | http://localhost:5005 |

## Auth Legend

| Auth Type | Meaning |
|---|---|
| Public | No token required |
| Bearer token | Authorization: Bearer <jwt> |
| Bearer doctor | JWT must carry role doctor |
| Bearer patient | JWT must carry role patient |
| Bearer admin | JWT must carry role admin |
| Internal key | Header x-internal-api-key required |

## Patient Service

| Method | Endpoint | Auth | Required Headers | Request Body or Params | Success |
|---|---|---|---|---|---|
| GET | / | Public | None | None | 200 |
| POST | /api/patients/register | Public | Content-Type: application/json | name, email, password, age(optional), phone(optional) | 201 |
| POST | /api/patients/login | Public | Content-Type: application/json | email, password | 200 |
| GET | /api/patients/internal/:id/contact | Internal key | x-internal-api-key | Param: id | 200 |
| GET | /api/patients/me | Bearer token | Authorization | None | 200 |
| PUT | /api/patients/me | Bearer token | Authorization, Content-Type: application/json | Any of: name, email, age, phone | 200 |
| DELETE | /api/patients/me | Bearer token | Authorization | None | 200 |
| POST | /api/patients/reports | Bearer token | Authorization, multipart/form-data | Form field file | 201 |
| GET | /api/patients/reports | Bearer token | Authorization | None | 200 |
| GET | /api/patients/reports/:id | Bearer token | Authorization | Param: id | 200 |
| DELETE | /api/patients/reports/:id | Bearer token | Authorization | Param: id | 200 |
| GET | /api/patients/history | Bearer token | Authorization | None | 200 |
| GET | /api/patients/prescriptions | Bearer token | Authorization | None | 200 |

## Appointment Service

| Method | Endpoint | Auth | Required Headers | Request Body or Params | Success |
|---|---|---|---|---|---|
| GET | / | Public | None | None | 200 |
| POST | /api/appointments | Bearer patient | Authorization, Content-Type: application/json | doctorId, date, time, reason(optional) | 201 |
| GET | /api/appointments/:id | Bearer token | Authorization | Param: id | 200 |
| PUT | /api/appointments/:id | Bearer token | Authorization, Content-Type: application/json | date(optional), time(optional), reason(optional) | 200 |
| DELETE | /api/appointments/:id | Bearer token | Authorization | Param: id | 200 |
| GET | /api/appointments/patient/:patientId | Bearer token | Authorization | Param: patientId, query: status(optional), upcoming(optional) | 200 |
| GET | /api/appointments/doctor/:doctorId | Bearer token | Authorization | Param: doctorId, query: status(optional), upcoming(optional) | 200 |
| PUT | /api/appointments/:id/status | Bearer doctor | Authorization, Content-Type: application/json | Param: id, body: status (confirmed or completed) | 200 |

## Doctor Service

| Method | Endpoint | Auth | Required Headers | Request Body or Params | Success |
|---|---|---|---|---|---|
| GET | / | Public | None | None | 200 |
| POST | /api/doctors/register | Public | Content-Type: application/json | name, email, password, specialty, phone(optional), licenseNumber(optional), experience(optional), consultationFee(optional), bio(optional) | 201 |
| POST | /api/doctors/login | Public | Content-Type: application/json | email, password | 200 |
| GET | /api/doctors/specialties | Public | None | None | 200 |
| GET | /api/doctors | Public | None | Query: specialty(optional), q(optional) | 200 |
| GET | /api/doctors/admin/pending | Bearer admin | Authorization | None | 200 |
| GET | /api/doctors/me | Bearer doctor | Authorization | None | 200 |
| PUT | /api/doctors/me | Bearer doctor | Authorization, Content-Type: application/json | Any profile fields | 200 |
| DELETE | /api/doctors/me | Bearer doctor | Authorization | None | 200 |
| POST | /api/doctors/availability | Bearer doctor | Authorization, Content-Type: application/json | dayOfWeek, startTime, endTime, slotDurationMinutes(optional) | 201 |
| GET | /api/doctors/availability/mine | Bearer doctor | Authorization | None | 200 |
| PUT | /api/doctors/availability/:slotId | Bearer doctor | Authorization, Content-Type: application/json | Param: slotId, any slot fields | 200 |
| DELETE | /api/doctors/availability/:slotId | Bearer doctor | Authorization | Param: slotId | 200 |
| POST | /api/doctors/prescriptions | Bearer doctor | Authorization, Content-Type: application/json | patientId, medications(array), appointmentId(optional), patientName(optional), diagnosis(optional), notes(optional) | 201 |
| GET | /api/doctors/prescriptions/mine | Bearer doctor | Authorization | None | 200 |
| GET | /api/doctors/prescriptions/patient/:patientId | Bearer token | Authorization | Param: patientId | 200 |
| GET | /api/doctors/prescriptions/:id | Bearer token | Authorization | Param: id | 200 |
| GET | /api/doctors/appointments/mine | Bearer doctor | Authorization | Query: status(optional), upcoming(optional) | 200 |
| PUT | /api/doctors/appointments/:id/accept | Bearer doctor | Authorization | Param: id | 200 |
| PUT | /api/doctors/appointments/:id/reject | Bearer doctor | Authorization | Param: id | 200 |
| PUT | /api/doctors/appointments/:id/complete | Bearer doctor | Authorization | Param: id | 200 |
| PUT | /api/doctors/:id/verify | Bearer admin | Authorization | Param: id | 200 |
| GET | /api/doctors/internal/:id/contact | Internal key | x-internal-api-key | Param: id | 200 |
| GET | /api/doctors/:id | Public | None | Param: id | 200 |
| GET | /api/doctors/:id/availability | Public | None | Param: id | 200 |

## Payment Service

| Method | Endpoint | Auth | Required Headers | Request Body or Params | Success |
|---|---|---|---|---|---|
| GET | /health | Public | None | None | 200 |
| POST | /api/payments/webhook/:provider | Public | Content-Type: application/json (and Stripe-Signature in live Stripe mode) | Param: provider (stripe or payhere), provider payload | 200 |
| POST | /api/payments/initiate-online | Bearer token | Authorization, Content-Type: application/json | appointmentId, provider (STRIPE or PAYHERE) | 201 |
| POST | /api/payments/create | Bearer token | Authorization, Content-Type: application/json | appointmentId, amount, currency(optional), paymentMethod(optional) | 201 |
| POST | /api/payments/confirm | Bearer admin | Authorization, Content-Type: application/json | paymentId | 200 |
| POST | /api/payments/fail | Bearer admin | Authorization, Content-Type: application/json | paymentId, reason(optional) | 200 |
| GET | /api/payments | Bearer admin | Authorization | None | 200 |
| GET | /api/payments/patient/:patientId | Bearer token | Authorization | Param: patientId | 200 |
| GET | /api/payments/:id | Bearer token | Authorization | Param: id | 200 |

## Telemedicine Service

| Method | Endpoint | Auth | Required Headers | Request Body or Params | Success |
|---|---|---|---|---|---|
| GET | / | Public | None | None | 200 |
| POST | /api/telemedicine/sessions | Bearer token | Authorization, Content-Type: application/json | appointmentId | 201 or 200 |
| GET | /api/telemedicine/sessions/mine | Bearer token | Authorization | None | 200 |
| GET | /api/telemedicine/sessions/appointment/:appointmentId | Bearer token | Authorization | Param: appointmentId | 200 |
| GET | /api/telemedicine/sessions/:id | Bearer token | Authorization | Param: id | 200 |
| GET | /api/telemedicine/sessions/:id/join-info | Bearer token | Authorization | Param: id | 200 |
| PUT | /api/telemedicine/sessions/:id/start | Bearer token | Authorization | Param: id | 200 |
| PUT | /api/telemedicine/sessions/:id/end | Bearer token | Authorization, Content-Type: application/json | Param: id, notes(optional) | 200 |

## Notification Service

| Method | Endpoint | Auth | Required Headers | Request Body or Params | Success |
|---|---|---|---|---|---|
| GET | /health | Public | None | None | 200 |
| POST | /api/notifications/send | Public | Content-Type: application/json | eventType, channels(array), recipients(array), data(object) | 200 |
| GET | /api/notifications/logs | Public | None | None | 200 |

## Common Error Codes

| Code | Meaning |
|---|---|
| 400 | Validation or bad request |
| 401 | Missing or invalid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (example: duplicate payment) |
| 500 | Internal server error |
| 503 | Upstream dependency unavailable |

## Notes

- Keep JWT_SECRET the same across services that validate shared tokens.
- Keep INTER_SERVICE_API_KEY the same across internal service callers and validators.
- For production, move all secrets to a secret manager or container orchestrator secret store.
