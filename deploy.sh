#!/bin/bash
# ============================================================
# Healthcare System - Full Kubernetes Deployment Script
# Run this script to build, load, and deploy the entire system
# Usage: bash deploy.sh
# ============================================================

set -e

CLUSTER_NAME="healthcare"
NAMESPACE="healthcare"
KIND_AVAILABLE=false
TARGET_CONTEXT=""

echo ""
echo "=========================================="
echo "  Healthcare System - Full Deployment"
echo "=========================================="
echo ""

# ----------------------------------------------------------
# STEP 1: Check prerequisites
# ----------------------------------------------------------
echo "[1/6] Checking prerequisites..."

for tool in docker kubectl; do
  if ! command -v $tool &> /dev/null; then
    echo "ERROR: '$tool' is not installed or not in PATH. Please install it first."
    exit 1
  fi
done

if command -v kind &> /dev/null; then
  KIND_AVAILABLE=true
fi

echo "  docker   : $(docker --version)"
echo "  kubectl  : $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
if $KIND_AVAILABLE; then
  echo "  kind     : $(kind --version)"
else
  echo "  kind     : not installed (optional)"
fi
echo ""

# ----------------------------------------------------------
# STEP 2: Select and prepare cluster context
# ----------------------------------------------------------
echo "[2/6] Selecting Kubernetes cluster/context..."

if $KIND_AVAILABLE; then
  if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
    echo "  Cluster '${CLUSTER_NAME}' already exists. Skipping creation."
  else
    echo "  Creating kind cluster '${CLUSTER_NAME}'..."
    kind create cluster --name $CLUSTER_NAME
    echo "  Cluster created."
  fi

  TARGET_CONTEXT="kind-${CLUSTER_NAME}"
  kubectl config use-context $TARGET_CONTEXT
  echo "  kubectl context set to: $TARGET_CONTEXT"
else
  TARGET_CONTEXT=$(kubectl config current-context 2>/dev/null || true)

  if [ -z "$TARGET_CONTEXT" ]; then
    echo "ERROR: kind is not installed and no current kubectl context is set."
    echo "Please install kind, or set a context first (for example: docker-desktop)."
    exit 1
  fi

  echo "  kind not found. Using existing context: $TARGET_CONTEXT"
fi

echo ""

# ----------------------------------------------------------
# STEP 3: Build all Docker images
# ----------------------------------------------------------
echo "[3/6] Building Docker images..."

SERVICES=("appointment-service" "patient-service" "doctor-service" "payment-service" "telemedicine-service" "notification-service" "frontend")

for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "  Building: ${SERVICE}..."
  docker build -t ${SERVICE}:local ./${SERVICE}
  echo "  Done: ${SERVICE}:local"
done

echo ""
echo "  All images built successfully."
echo ""

# ----------------------------------------------------------
# STEP 4: Load images into kind cluster
# ----------------------------------------------------------
echo "[4/6] Preparing images for target cluster..."

if [[ "$TARGET_CONTEXT" == kind-* ]] && $KIND_AVAILABLE; then
  echo "  kind context detected. Loading local images into kind..."

  for SERVICE in "${SERVICES[@]}"; do
    echo "  Loading: ${SERVICE}:local -> kind-${CLUSTER_NAME}"
    kind load docker-image ${SERVICE}:local --name $CLUSTER_NAME
  done

  # Load mongo image (pulled from Docker Hub, needed in kind)
  echo "  Loading: mongo:7.0 -> kind-${CLUSTER_NAME}"
  kind load docker-image mongo:7.0 --name $CLUSTER_NAME 2>/dev/null || echo "  (mongo:7.0 will be pulled from registry if not cached)"
else
  echo "  Non-kind context detected ($TARGET_CONTEXT). Skipping kind image load."
  echo "  Ensure your cluster can access local images tagged as :local."
fi

echo ""
echo "  Image preparation complete."
echo ""

# ----------------------------------------------------------
# STEP 5: Apply Kubernetes manifests
# ----------------------------------------------------------
echo "[5/6] Applying Kubernetes manifests..."

echo "  Applying namespace, secrets, mongodb, and application manifests..."
kubectl apply -k ./k8s/

echo ""
echo "  Manifests applied."
echo ""

DEPLOYMENTS=("mongo" "appointment-service" "patient-service" "doctor-service" "payment-service" "telemedicine-service" "notification-service" "frontend")

echo "  Restarting deployments to pick up latest :local images..."
for DEPLOY in "${DEPLOYMENTS[@]}"; do
  kubectl rollout restart deployment/${DEPLOY} -n $NAMESPACE
done
echo ""

# ----------------------------------------------------------
# STEP 6: Wait for all pods to be ready
# ----------------------------------------------------------
echo "[6/6] Waiting for all pods to become Ready..."
echo ""

for DEPLOY in "${DEPLOYMENTS[@]}"; do
  echo -n "  Waiting for deployment/${DEPLOY}... "
  kubectl rollout status deployment/${DEPLOY} -n $NAMESPACE --timeout=120s
done

echo ""
echo "=========================================="
echo "  Deployment Complete! All pods running."
echo "=========================================="
echo ""

# Print final status
echo "--- Pod Status ---"
kubectl get pods -n $NAMESPACE
echo ""
echo "--- Service Status ---"
kubectl get services -n $NAMESPACE
echo ""
echo "--- Access Your Application ---"
echo "  Frontend URL : http://localhost:30173"
echo ""
echo "  To check logs of any service:"
echo "    kubectl logs -f deployment/<service-name> -n healthcare"
echo ""
if [[ "$TARGET_CONTEXT" == kind-* ]]; then
  echo "  To tear down everything:"
  echo "    kind delete cluster --name healthcare"
else
  echo "  To tear down workloads:"
  echo "    kubectl delete -k ./k8s/"
fi
echo ""
