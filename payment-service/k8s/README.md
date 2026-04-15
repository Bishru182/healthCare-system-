# Payment Service - Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the Payment Service.

## Files

- **namespace.yaml** - Healthcare namespace
- **payment-serviceaccount.yaml** - Service account for RBAC
- **payment-configmap.yaml** - Configuration (NODE_ENV, PAYMENT_PROVIDER, LOG_LEVEL)
- **payment-secret.yaml** - Secrets (MONGO_URI, JWT_SECRET)
- **payment-service.yaml** - Kubernetes Service (ClusterIP)
- **payment-deployment.yaml** - Kubernetes Deployment with liveness/readiness probes
- **payment-hpa.yaml** - Horizontal Pod Autoscaler
- **kustomization.yaml** - Kustomize configuration

## Prerequisites

1. Kubernetes cluster running (1.19+)
2. kubectl configured to access your cluster
3. Docker image built: `payment-service:latest`

## Deployment Steps

### Option 1: Using kubectl apply

```bash
# Create namespace and deploy
kubectl apply -f payment-service/k8s/namespace.yaml
kubectl apply -f payment-service/k8s/

# Verify deployment
kubectl get pods -n healthcare
kubectl get svc -n healthcare
```

### Option 2: Using Kustomize

```bash
# Deploy with Kustomize
kubectl apply -k payment-service/k8s/

# Verify
kubectl get pods -n healthcare
kubectl logs -n healthcare -l app=payment-service
```

## Configuration

### Update Secrets

Edit `payment-secret.yaml` with your actual values:

```bash
# Create/update secrets
kubectl create secret generic payment-secrets \
  --from-literal=MONGO_URI='your_mongo_uri' \
  --from-literal=JWT_SECRET='your_jwt_secret' \
  -n healthcare --dry-run=client -o yaml | kubectl apply -f -
```

### Update ConfigMap

Edit `payment-configmap.yaml` to change environment variables:

```bash
kubectl edit configmap payment-config -n healthcare
```

## Port Forwarding (Local Testing)

```bash
kubectl port-forward -n healthcare svc/payment-service 3003:3003
```

Then access: `http://localhost:3003`

## Monitoring

### View Logs

```bash
# View recent logs
kubectl logs -n healthcare -l app=payment-service

# Stream logs from all pods
kubectl logs -n healthcare -l app=payment-service -f

# View logs from specific pod
kubectl logs -n healthcare payment-service-<pod-id>
```

### Check Pod Status

```bash
# Describe pod for events
kubectl describe pod -n healthcare <pod-name>

# Get pod events
kubectl get events -n healthcare --sort-by='.lastTimestamp'
```

### Check HPA Status

```bash
kubectl get hpa -n healthcare
kubectl describe hpa payment-service-hpa -n healthcare
```

## Scaling

### Manual Scaling

```bash
# Scale to 5 replicas
kubectl scale deployment payment-service --replicas=5 -n healthcare

# Check current replicas
kubectl get deployment payment-service -n healthcare
```

### Automatic Scaling

HPA is configured to automatically scale between 2-10 replicas based on CPU/Memory metrics.

## Health Checks

The deployment includes:
- **Liveness Probe**: Restarts container if `/health` endpoint fails
- **Readiness Probe**: Removes from load balancer if `/ready` endpoint fails

You may need to implement these endpoints in your application:

```javascript
// In your app.js
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/ready', (req, res) => {
  // Add readiness checks (DB connection, etc.)
  res.status(200).json({ status: 'ready' });
});
```

## Security

- Non-root user (UID 1000)
- Read-only root filesystem
- No privilege escalation
- Network policies recommended

## Cleanup

```bash
# Delete all payment service resources
kubectl delete -k payment-service/k8s/

# Delete namespace (deletes all resources in it)
kubectl delete namespace healthcare
```

## Troubleshooting

### Pods not starting

```bash
kubectl describe pod -n healthcare <pod-name>
kubectl logs -n healthcare <pod-name>
```

### Image not found

Build and push the image:

```bash
docker build -t payment-service:latest ./payment-service
# If using a registry:
docker tag payment-service:latest your-registry/payment-service:latest
docker push your-registry/payment-service:latest
```

### Database connection issues

Check your MONGO_URI in the secret:

```bash
kubectl get secret payment-secrets -n healthcare -o jsonpath='{.data.MONGO_URI}' | base64 -d
```

## Production Checklist

- [ ] Update MONGO_URI in secrets
- [ ] Update JWT_SECRET in secrets
- [ ] Change IMAGE to use your registry
- [ ] Configure ingress for external access
- [ ] Set up network policies
- [ ] Configure PodDisruptionBudget
- [ ] Enable metrics server for HPA
- [ ] Test health check endpoints
- [ ] Review resource limits
- [ ] Set up persistent storage if needed
