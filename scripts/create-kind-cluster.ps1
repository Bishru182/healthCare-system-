param(
  [string]$Name = 'healthcare'
)

$ErrorActionPreference = 'Stop'

$kindExe = $null
$kindCmd = Get-Command kind -ErrorAction SilentlyContinue
if ($kindCmd) {
  $kindExe = 'kind'
} else {
  Write-Host 'kind executable not found in PATH. Trying winget install...' -ForegroundColor Yellow
  winget install --id Kubernetes.kind -e --accept-package-agreements --accept-source-agreements --silent

  $kindCmd = Get-Command kind -ErrorAction SilentlyContinue
  if ($kindCmd) {
    $kindExe = 'kind'
  } else {
    $kindPath = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter kind.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    if (-not $kindPath) {
      throw 'kind could not be installed or found.'
    }
    $kindExe = $kindPath
  }
}

Write-Host "Creating kind cluster: $Name" -ForegroundColor Cyan
& $kindExe create cluster --name $Name
if ($LASTEXITCODE -ne 0) {
  throw 'kind cluster creation failed.'
}

kubectl config use-context "kind-$Name"
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to switch kubectl context to kind cluster.'
}

kubectl get nodes
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to query cluster nodes after creation.'
}

Write-Host "Kind cluster ready: kind-$Name" -ForegroundColor Green
