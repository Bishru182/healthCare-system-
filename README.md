# Medico – Smart Healthcare Appointment & Telemedicine Platform

> **Distributed Systems Assignment — University Submission**
> A cloud-native, microservices-based healthcare platform built with Node.js, React, Docker, and Kubernetes.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites](#2-prerequisites)
3. [Clone Instructions](#3-clone-instructions)
4. [Environment Variable Setup](#4-environment-variable-setup)
5. [Local Development Setup](#5-local-development-setup)
6. [Docker Deployment](#6-docker-deployment)
7. [Kubernetes Deployment](#7-kubernetes-deployment)
8. [Service Access URLs & Ports](#8-service-access-urls--ports)
9. [Contributors](#9-contributors)

---

## 1. Project Overview

**Medico** is a distributed, microservices-based healthcare platform. Patients can register, book appointments, upload medical reports, and view their history through a React web interface. Each service is independently containerised with Docker and orchestrated with Kubernetes.

### Implemented Services

| Service | Port | Status |
|---|---|---|
| Patient Service | 3001 | ✅ Complete |
| Appointment Service | 3002 | ✅ Complete |
| Payment Service | 3003 | 🔲 In Progress |
| Frontend (React / Vite) | 5173 (dev) | ✅ Complete |

### Architecture

```
[React Frontend (Vite)]
         |  HTTP / REST
   ┌─────┴─────────────────────────────┐
   │     Internal Kubernetes Network   │
   │   Patient Service        :3001    │
   │   Appointment Service    :3002    │
   │   Payment Service        :3003    │
   └───────────────────────────────────┘

[MongoDB Atlas]  — cloud database (namespaced per service)
[Cloudinary]     — medical report storage (Patient Service only)
```

---

## 2. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | v20 (LTS) | https://nodejs.org |
| npm | v9+ | Bundled with Node.js |
| Git | Any recent | https://git-scm.com |
| Docker Desktop | v4.30+ | https://www.docker.com/products/docker-desktop |
| kubectl | v1.28+ | https://kubernetes.io/docs/tasks/tools |
| Docker Desktop Kubernetes | — | Enable: Docker Desktop → Settings → Kubernetes → ☑ Enable Kubernetes |
| MongoDB Atlas Account | — | https://www.mongodb.com/atlas |
| Cloudinary Account | — | https://cloudinary.com *(Patient Service only)* |

**Verify installations:**
```bash
node --version      # v20.x.x
npm --version       # 9.x.x or higher
docker --version    # Docker version 24.x.x
kubectl version     # Client Version: v1.28+
kubectl config current-context   # should output: docker-desktop
```

---

## 3. Clone Instructions

```bash
git clone https://github.com/<your-org>/medico.git
cd medico
git checkout main
```

---

## 4. Environment Variable Setup

Each service uses its own `.env` file. **Never commit `.env` files to version control.** Use the provided `.env.example` as a template.

### Patient Service — `patient-service/.env`

```bash
cp patient-service/.env.example patient-service/.env
```

```env
PORT=3001
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/medico?appName=<appName>
JWT_SECRET=your_strong_jwt_secret_here
CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

# Local development:
APPOINTMENT_SERVICE_URL=http://localhost:3002
# Docker Compose:  APPOINTMENT_SERVICE_URL=http://appointment-service:3002
# Kubernetes:      APPOINTMENT_SERVICE_URL=http://appointment-service:3002
```

### Appointment Service — `appointment-service/.env`

```bash
cp appointment-service/.env.example appointment-service/.env
```

```env
PORT=3002
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/medico?appName=<appName>
JWT_SECRET=your_strong_jwt_secret_here
PATIENT_SERVICE_URL=http://localhost:3001
DOCTOR_SERVICE_URL=http://localhost:3004
```

### Payment Service — `payment-service/.env`

```bash
cp payment-service/.env.example payment-service/.env
```

```env
PORT=3003
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/medico?appName=<appName>
JWT_SECRET=your_strong_jwt_secret_here
APPOINTMENT_SERVICE_URL=http://localhost:3002
PATIENT_SERVICE_URL=http://localhost:3001
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
SUCCESS_URL=http://localhost:5173/patient/payments
CANCEL_URL=http://localhost:5173/patient/payments
```

### Doctor Service — `doctor-service/.env`

```env
PORT=3004
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/medico?appName=<appName>
JWT_SECRET=your_strong_jwt_secret_here
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```

### Telemedicine Service — `telemedicine-service/.env`

```env
PORT=3005
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/medico?appName=<appName>
JWT_SECRET=your_strong_jwt_secret_here
APPOINTMENT_SERVICE_URL=http://localhost:3002
JITSI_DOMAIN=meet.jit.si
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```

### Notification Service — `notification-service/.env`

```env
PORT=5005
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/medico?appName=<appName>
NODE_ENV=development

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# SMS via TextLK (Optional)
TEXTLK_API_TOKEN=your_textlk_token
TEXTLK_SENDER_ID=MedicoHealth

# SMS/WhatsApp via Twilio (Optional)
TWILIO_SID=your_twilio_sid
TWILIO_AUTH=your_twilio_auth_token
TWILIO_PHONE=+1234567890
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
```

### Environment Variables Summary

| Variable | Services | Description |
|---|---|---|
| `PORT` | All | Listening port |
| `MONGO_URI` | All | MongoDB Atlas connection string |
| `JWT_SECRET` | Patient, Appointment, Doctor, Telemedicine | **Must be identical across services** |
| `NODE_ENV` | Doctor, Notification | Environment (development/production) |
| `CORS_ORIGINS` | Doctor, Telemedicine | Comma-separated allowed origins |
| `CLOUD_NAME` | Patient | Cloudinary cloud name |
| `CLOUD_API_KEY` | Patient | Cloudinary API key |
| `CLOUD_API_SECRET` | Patient | Cloudinary API secret |
| `APPOINTMENT_SERVICE_URL` | Patient, Telemedicine, Payment | Inter-service URL |
| `PATIENT_SERVICE_URL` | Appointment, Payment | Inter-service URL |
| `DOCTOR_SERVICE_URL` | Appointment | Inter-service URL |
| `PAYMENT_PROVIDER` | Payment | `stripe`, `payhere`, or `mock` |
| `STRIPE_SECRET_KEY` | Payment | Stripe test key (sk_test_...) |
| `SUCCESS_URL` | Payment | Redirect after successful payment |
| `CANCEL_URL` | Payment | Redirect after cancelled payment |
| `JITSI_DOMAIN` | TePatient → Appointment → Doctor → Payment → Telemedicine → Notification → Frontend

### Patient Service
```bash
cd patient-service
npm install
npm start            # → http://localhost:3001
```

### Appointment Service
```bash
cd appointment-service
npm install
npm start            # → http://localhost:3002
```

### Doctor Service
```bash
cd doctor-service
npm install
npm run seed         # (Optional: populate with test doctors)
npm start            # → http://localhost:3004
```

### Payment Service
```bash
cd payment-service
npm install
npm start            # → http://localhost:3003
```

### Telemedicine Service
```bash
cd telemedicine-service
npm install
npm start            # → http://localhost:3005
```

### Notification Service
```bash
cd notification-service
npm install
npm start            # → http://localhost:5005
```

### Frontend
```bash
docker compose logs -f doctor-service
docker compose logs -f payment-service
docker compose logs -f telemedicine-service
docker compose logs -f notification-service

# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v
```

**Services started by Docker Compose:**

| Container | Port Mapping | Notes |
|---|---|---|
| `patient-service` | `3001:3001` | Uses MongoDB Atlas |
| `appointment-service` | `3002:3002` | Uses MongoDB Atlas |
| `payment-service` | `3003:3003` | Uses MongoDB Atlas, Stripe integration |
| `doctor-service` | `3004:3004` | Uses MongoDB Atlas |
| `telemedicine-service` | `3005:3005` | Uses MongoDB Atlas, Jitsi integration |
| `notification-service` | `5005:5005` | Uses MongoDB Atlas, Email/SMS gateways |
| `frontend` | `5173:5173` | Vite dev server with hot reload
npm install
npm run dev            # → http://localhost:5173
```

> Ensure both backend services are running before launching the frontend.

---

## 6. Docker Deployment

### Build Images

```bash
docker build -t patient-service:latest ./patient-service
docker build -t appointment-service:latest ./appointment-service
```

### Run with Docker Compose (Recommended)

```bash
# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f patient-service
docker compose logs -f appointment-service

# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v
```

**Services started by Docker Compose:**

| Container | Port Mapping | Notes |
|---|---|---|
| `patient-service` | `3001:3001` | Uses MongoDB Atlas |
| `appointment-service` | `3002:3002` | Uses MongoDB Atlas |
| `payment-service` | `3003:3003` | In progress |
| `mongo-appointment` | `27017:27017` | Local MongoDB |
| `mongo-payment` | `27018:27017` | Local MongoDB |

### Run Individual Containers

```bash
docker run -d --name patient-service -p 3001:3001 \
  --env-file ./patient-service/.env patient-service:latest

docker run -d --name appointment-service -p 3002:3002 \
  --env-file ./appointment-service/.env appointment-service:latest
```

---

## 7. Kubernetes Deployment

This project uses **Docker Desktop's built-in Kubernetes**. All manifests use `imagePullPolicy: Never` — images are sourced directly from the local Docker daemon, which Docker Desktop Kubernetes shares automatically.

### 7.1 Verify Cluster

```bash
kubectl config current-context   # Expected: docker-desktop
kubectl cluster-info
kubectl get nodes                 # Expected: docker-desktop   Ready
```

### 7.2 Build Images Locally

```bash
# No daemon switching required — Docker Desktop shares the host daemon
docker build -t patient-service:latest ./patient-service
docker build -t appointment-service:latest ./appointment-service

docker images | grep -E 'patient-service|appointment-service'
```

### 7.3 Create Kubernetes Secrets

```bash
# Patient Service Secret
kubectl create secret generic patient-service-secret \
  --from-literal=PORT=3001 \
  --from-literal=MONGO_URI="<your_atlas_mongo_uri>" \
  --from-literal=JWT_SECRET="<your_jwt_secret>" \
  --from-literal=CLOUD_NAME="<your_cloud_name>" \
  --from-literal=CLOUD_API_KEY="<your_api_key>" \
  --from-literal=CLOUD_API_SECRET="<your_api_secret>" \
  --from-literal=APPOINTMENT_SERVICE_URL="http://appointment-service:3002"

# Appointment Service Secret
kubectl create secret generic appointment-service-secret \
  --from-literal=PORT=3002 \
  --from-literal=MONGO_URI="<your_atlas_mongo_uri>" \
  --from-literal=JWT_SECRET="<your_jwt_secret>" \
  --from-literal=PATIENT_SERVICE_URL="http://patient-service:3001" \
  --from-literal=NOTIFICATION_SERVICE_URL="http://notification-service:5005" \
  --from-literal=APPOINTMENT_NOTIFICATION_CHANNELS="email,sms"

kubectl get secrets
```

> If a secret already exists: `kubectl delete secret <secret-name>` then recreate it.

### 7.4 Deploy Services

```bash
# Deploy Appointment Service first (Patient Service depends on it)
kubectl apply -f appointment-service/appointment-deployment.yaml
kubectl apply -f appointment-service/appointment-service.yaml

# Deploy Patient Service
kubectl apply -f patient-service/patient-deployment.yaml
kubectl apply -f patient-service/patient-service.yaml

kubectl get deployments
kubectl get pods
kubectl get services
```

### 7.5 Monitor Pods

```bash
kubectl get pods --watch                     # Watch pod startup
kubectl describe pod <pod-name>              # Detailed status / debug
kubectl logs -f deployment/patient-service
kubectl logs -f deployment/appointment-service
```

All pods should reach `Running` with `1/1` containers ready.

### 7.6 Access Services (Port-Forward)
 Notes |
|---|---|---|
| Patient Service | http://localhost:3001 | User registration, profile management |
| Appointment Service | http://localhost:3002 | Appointment booking, status management |
| Doctor Service | http://localhost:3004 | Doctor profiles, availability, specialties |
| Payment Service | http://localhost:3003 | Payment processing with Stripe |
| Telemedicine Service | http://localhost:3005 | Video consultations via Jitsi |
| Notification Service | http://localhost:5005 | Email, SMS, WhatsApp notifications |
| Frontend (Vite Dev) | http://localhost:5173 | React application with hot reload |

### Docker Compose

| Service | URL |
|---|---|
| Patient Service | http://localhost:3001 |
| Appointment Service | http://localhost:3002 |
| Payment Service | http://localhost:3003 |
| Doctor Service | http://localhost:3004 |
| Telemedicine Service | http://localhost:3005 |
| Notification Service | http://localhost:5005 |
| Frontend | http://localhost:5173 |

### Kubernetes (Port-Forwarded)

| Service | URL | K8s Service Type |
|---|---|---|
| Patient Service | http://localhost:3001 | NodePort |
| Appointment Service | http://localhost:3002 | NodePort |
| Payment Service | http://localhost:3003 | NodePort |
| Doctor Service | http://localhost:3004 | NodePort |
| Telemedicine Service | http://localhost:3005 | NodePort |
| Notification Service | http://localhost:5005
kubectl delete secret appointment-service-secret

kubectl get pods     # Confirm all resources removed
```

> To disable Kubernetes: Docker Desktop → Settings → Kubernetes → ☐ Enable Kubernetes → Apply & Restart.

---

## 8. Service Access URLs & Ports

### Local Development

| Service | URL |
|---|---|
| Patient Service | http://localhost:3001 |
| Appointment Service | http://localhost:3002 |
| Frontend (Vite Dev) | http://localhost:5173 |

### Docker Compose

| Service | URL |
|---|---|
| Patient Service | http://localhost:3001 |
| Appointment Service | http://localhost:3002 |
| Payment Service | http://localhost:3003 |

### Kubernetes (Port-Forwarded)

| Service | URL | K8s Service Type |
|---|---|---|
| Patient Service | http://localhost:3001 | NodePort |
| Appointment Service | http://localhost:3002 | NodePort |

---

## 9. Contributors

> **Assignment Group — Distributed Systems**

| Name | Student ID | Assigned Module | Branch |
|---|---|---|---|
| Bishru | IT22115102 | Patient Service, Appointment Service, Frontend, DevOps | `bishru_FE`, `feature/frontend_bishru` |
| *(Teammate 2)* | — | *(e.g. Doctor Service)* | *(e.g. `doctorService_BE`)* |
| *(Teammate 3)* | — | *(e.g. Payment Service)* | *(e.g. `fix/paymentService_BE`)* |
| *(Teammate 4)* | — | *(e.g. Notification Service)* | *(e.g. `notificationService_BE`)* |
| *(Teammate 5)* | — | *(e.g. Telemedicine Service)* | *(e.g. `telemedicineService_BE`)* |

---

*Last updated: April 2026 | Medico — Distributed Systems Assignment*
