# Healthcare System Deployment Guide (Windows + Docker Desktop + Kubernetes)

This guide explains how to run this project on your PC using:

1. Docker Compose (easy local run)
2. Kubernetes (Docker Desktop Kubernetes or kind)

The steps below are written for Windows PowerShell.

---

## 1) What You Need

Install these tools first:

- Docker Desktop
- kubectl
- Optional: kind (only if you want a separate local Kubernetes cluster)

Quick install commands (PowerShell):

```powershell
winget install -e --id Docker.DockerDesktop
winget install -e --id Kubernetes.kubectl
winget install -e --id Kubernetes.kind
```

After install, open Docker Desktop and wait until the engine is running.

Verify tools:

```powershell
docker desktop status
docker version
kubectl version --client
```

Expected:

- `docker desktop status` shows `running`
- `docker version` shows Client and Server info
- `kubectl` command works

---

## 2) Project Root

Open PowerShell in the project root folder:

```powershell
cd "C:\Users\Umair_Salah\Downloads\healthCare-system-"
```

---

## 3) Option A: Deploy with Docker Compose (Recommended First)

This is the easiest way to run everything locally.

### 3.1 Run Deployment Script

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-docker.ps1
```

What this script does:

- Builds Docker images from all service Dockerfiles
- Starts containers with `docker compose up -d --build`
- Checks important URLs and returns success/failure

### 3.2 Access Services

- Frontend: http://localhost:5173
- Patient Service: http://localhost:3001
- Appointment Service: http://localhost:3002
- Payment Service: http://localhost:3003/health
- Doctor Service: http://localhost:3004
- Telemedicine Service: http://localhost:3005
- Notification Service: http://localhost:5005

### 3.3 Useful Docker Commands

Check containers:

```powershell
docker compose ps
```

See logs:

```powershell
docker compose logs -f
```

Stop stack:

```powershell
docker compose down
```

Rebuild from scratch:

```powershell
docker compose down
docker compose up -d --build
```

---

## 4) Option B: Deploy to Kubernetes

This repository already has Kubernetes manifests in the `k8s` folder and an automated script.

### 4.1 Choose Your Cluster

You can use either:

1. Docker Desktop Kubernetes (simple)
2. kind cluster (script-supported)

#### Docker Desktop Kubernetes

1. Open Docker Desktop
2. Go to Settings > Kubernetes
3. Enable Kubernetes and wait until it is ready

Check context:

```powershell
kubectl config current-context
```

Expected context is usually `docker-desktop`.

#### kind (optional)

If you prefer kind, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\create-kind-cluster.ps1
kubectl config current-context
```

Expected context starts with `kind-` (for example `kind-healthcare`).

### 4.2 Update Kubernetes Secret Values (Important)

Before production-like usage, edit `k8s/secrets.yaml` and set your own values for:

- `JWT_SECRET`
- `CLOUD_NAME`
- `CLOUD_API_KEY`
- `CLOUD_API_SECRET`

### 4.3 Deploy

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-k8s.ps1
```

What this script does:

- Builds required images with `:local` tags
- If context is `kind-*`, loads images into kind cluster
- Applies manifests with `kubectl apply -k ./k8s`
- Waits for all deployments to become ready

### 4.4 Check Kubernetes Resources

```powershell
kubectl get pods -n healthcare
kubectl get svc -n healthcare
```

All main pods should become `Running`.

### 4.5 Open Frontend

The frontend service is NodePort `30173`:

- http://localhost:30173

If NodePort is not reachable on your system, use port-forward:

```powershell
kubectl port-forward -n healthcare svc/frontend 5173:80
```

Then open:

- http://localhost:5173

### 4.6 Remove Kubernetes Deployment

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\destroy-k8s.ps1
```

---

## 5) How It Works (Simple Explanation)

1. Docker builds one image per microservice.
2. Docker Compose runs all containers on one Docker network for local testing.
3. Kubernetes uses the same service images (`*:local`) and runs them as pods.
4. Kubernetes Services connect pods together internally.
5. Frontend is exposed to your PC through NodePort (or port-forward).

---

## 6) Troubleshooting

### Docker not running / API errors

Symptoms:

- `docker compose` fails
- Docker Desktop status stays `starting`

Fix:

1. Close Docker Desktop
2. Re-open Docker Desktop as Administrator
3. Wait until engine is fully `running`
4. Retry deployment

### `kubectl` says no current context

Fix:

```powershell
kubectl config get-contexts
powershell -ExecutionPolicy Bypass -File .\scripts\create-kind-cluster.ps1
kubectl config current-context
```

### Pods stuck in `ImagePullBackOff`

Reason: local image not available in current cluster.

Fix:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-k8s.ps1
```

### Pod crashing (`CrashLoopBackOff`)

Check logs:

```powershell
kubectl logs -n healthcare deployment/patient-service
kubectl logs -n healthcare deployment/appointment-service
kubectl logs -n healthcare deployment/payment-service
kubectl logs -n healthcare deployment/doctor-service
kubectl logs -n healthcare deployment/telemedicine-service
kubectl logs -n healthcare deployment/frontend
```

---

## 7) One-Page Quick Start

If you only want it running quickly:

```powershell
cd "C:\Users\Umair_Salah\Downloads\healthCare-system-"
docker desktop status
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-docker.ps1
```

Then open:

- http://localhost:5173

If you want Kubernetes instead:

```powershell
cd "C:\Users\Umair_Salah\Downloads\healthCare-system-"
kubectl config current-context
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-k8s.ps1
```

Then open:

- http://localhost:30173

