param(
  [string]$Namespace = 'healthcare'
)

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

kubectl delete -k ./k8s --ignore-not-found=true
kubectl delete namespace $Namespace --ignore-not-found=true

Write-Host 'Kubernetes resources removed.' -ForegroundColor Green
