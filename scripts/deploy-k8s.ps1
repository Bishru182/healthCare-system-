param(
  [string]$Namespace = 'healthcare'
)

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$context = ''
try {
  $context = (kubectl config current-context).Trim()
} catch {
  throw 'No active kubectl context. Configure a Kubernetes cluster first (Docker Desktop K8s, kind, minikube, etc.).'
}

if ([string]::IsNullOrWhiteSpace($context)) {
  throw 'No active kubectl context. Configure a Kubernetes cluster first (Docker Desktop K8s, kind, minikube, etc.).'
}

Write-Host "Using kube context: $context" -ForegroundColor Cyan

$images = @(
  @{ Name = 'appointment-service:local'; Context = './appointment-service' },
  @{ Name = 'patient-service:local'; Context = './patient-service' },
  @{ Name = 'payment-service:local'; Context = './payment-service' },
  @{ Name = 'doctor-service:local'; Context = './doctor-service' },
  @{ Name = 'telemedicine-service:local'; Context = './telemedicine-service' },
  @{ Name = 'frontend:local'; Context = './frontend' }
)

foreach ($img in $images) {
  Write-Host "Building image $($img.Name)..." -ForegroundColor Cyan
  docker build -t $img.Name $img.Context
}

if ($context -like 'kind-*') {
  $kindCmd = (Get-Command kind -ErrorAction SilentlyContinue)
  if (-not $kindCmd) {
    $kindPath = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter kind.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    if ($kindPath) {
      foreach ($img in $images) {
        Write-Host "Loading $($img.Name) into kind cluster..." -ForegroundColor Cyan
        & $kindPath load docker-image $img.Name --name ($context -replace '^kind-', '')
      }
    } else {
      throw 'Context is kind-* but kind executable was not found to load images.'
    }
  } else {
    foreach ($img in $images) {
      Write-Host "Loading $($img.Name) into kind cluster..." -ForegroundColor Cyan
      kind load docker-image $img.Name --name ($context -replace '^kind-', '')
    }
  }
}

Write-Host 'Applying Kubernetes manifests...' -ForegroundColor Cyan
kubectl apply -k ./k8s

$deployments = @(
  'mongo',
  'appointment-service',
  'patient-service',
  'payment-service',
  'doctor-service',
  'telemedicine-service',
  'frontend'
)

Write-Host 'Restarting deployments to pick up latest :local images...' -ForegroundColor Cyan
foreach ($d in $deployments) {
  kubectl rollout restart deployment/$d -n $Namespace | Out-Null
}

foreach ($d in $deployments) {
  Write-Host "Waiting for deployment/$d..." -ForegroundColor Cyan
  kubectl rollout status deployment/$d -n $Namespace --timeout=300s
}

Write-Host 'Kubernetes deployment is ready.' -ForegroundColor Green
kubectl get pods -n $Namespace
kubectl get svc -n $Namespace

try {
  $nodePort = kubectl get svc frontend -n $Namespace -o jsonpath='{.spec.ports[0].nodePort}'
  Write-Host "Frontend NodePort: http://localhost:$nodePort" -ForegroundColor Green
} catch {
  Write-Host 'Use port-forward if NodePort is not reachable:' -ForegroundColor Yellow
  Write-Host "kubectl port-forward -n $Namespace svc/frontend 5173:80" -ForegroundColor Yellow
}
