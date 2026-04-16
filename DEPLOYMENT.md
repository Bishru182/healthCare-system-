# Healthcare System Deployment Runbook

This file gives copy-paste commands to run the full project in Docker and Kubernetes.

## 1) Prerequisites

Run these checks first in PowerShell from project root.

	docker desktop status
	docker version
	kubectl version --client

Expected:

- Docker status should be `running`
- `docker version` should show both Client and Server versions
- kubectl client version should print successfully

If Docker is not running, start it:

	docker desktop start

## 2) Docker Deployment (Full Stack)

Run:

	powershell -ExecutionPolicy Bypass -File .\scripts\deploy-docker.ps1

What this does:

- Builds all containers from [docker-compose.yml](docker-compose.yml)
- Starts services in background
- Validates key HTTP endpoints

Expected endpoints after success:

- Frontend: http://localhost:5173
- Patient Service: http://localhost:3001
- Appointment Service: http://localhost:3002
- Payment Service: http://localhost:3003/health
- Doctor Service: http://localhost:3004
- Telemedicine Service: http://localhost:3005
- Notification Service: http://localhost:5005

Stop Docker stack:

	docker compose down

Rebuild fresh:

	docker compose down
	docker compose up -d --build

## 3) Kubernetes Deployment (Full Stack)

### 3.1 Ensure kube context exists

	kubectl config current-context

If no context is set, create a local kind cluster:

	powershell -ExecutionPolicy Bypass -File .\scripts\create-kind-cluster.ps1

### 3.2 Deploy

	powershell -ExecutionPolicy Bypass -File .\scripts\deploy-k8s.ps1

What this does:

- Builds all local images
- Loads images into kind automatically when context starts with `kind-`
- Applies manifests from [k8s/kustomization.yaml](k8s/kustomization.yaml)
- Waits for all deployments to become ready

Check resources:

	kubectl get pods -n healthcare
	kubectl get svc -n healthcare

Frontend access:

- NodePort: http://localhost:30173
- If NodePort is unreachable:

	  kubectl port-forward -n healthcare svc/frontend 5173:80

Then open: http://localhost:5173

Cleanup Kubernetes resources:

	powershell -ExecutionPolicy Bypass -File .\scripts\destroy-k8s.ps1

## 4) Fast Troubleshooting

### Docker API 500 / Docker stuck in starting

Symptoms:

- `docker compose up` fails with API 500
- `docker desktop status` stays `starting`

Do:

1. Close Docker Desktop UI
2. Re-open Docker Desktop as Administrator
3. Wait until status becomes `running`
4. Retry Docker deploy script

### Kubernetes deploy says no active context

Run:

	powershell -ExecutionPolicy Bypass -File .\scripts\create-kind-cluster.ps1
	kubectl config current-context
	powershell -ExecutionPolicy Bypass -File .\scripts\deploy-k8s.ps1

