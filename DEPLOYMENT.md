# Healthcare System Deployment

## Docker deployment

1. Open PowerShell in the repository root.
2. Run:

```powershell
./scripts/deploy-docker.ps1
```

This builds all services and starts the full stack using `docker-compose.yml`.

Expected endpoints:

- Frontend: http://localhost:5173
- Patient: http://localhost:3001
- Appointment: http://localhost:3002
- Payment: http://localhost:3003/health
- Doctor: http://localhost:3004
- Telemedicine: http://localhost:3005

To stop Docker stack:

```powershell
docker compose down
```

## Kubernetes deployment

1. Ensure a Kubernetes context exists and is active:

```powershell
kubectl config current-context
```

If you do not have a local cluster yet, create one with Kind:

```powershell
./scripts/create-kind-cluster.ps1
```

2. Deploy:

```powershell
./scripts/deploy-k8s.ps1
```

What this script does:

- Builds all service images including frontend.
- Loads images into kind automatically if context is kind-*.
- Applies manifests from `k8s/` using kustomize.
- Waits for all deployments to become ready.

Frontend access:

- NodePort: http://localhost:30173
- If NodePort is unreachable in your cluster type:

```powershell
kubectl port-forward -n healthcare svc/frontend 5173:80
```

Then open http://localhost:5173

Cleanup:

```powershell
./scripts/destroy-k8s.ps1
```
