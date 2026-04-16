$ErrorActionPreference = 'Stop'

Set-Location (Join-Path $PSScriptRoot '..')

Write-Host 'Building and starting Docker Compose stack...' -ForegroundColor Cyan
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
  throw 'docker compose up failed. Ensure Docker Desktop is running and healthy.'
}

Write-Host 'Services requested. Checking key endpoints...' -ForegroundColor Cyan
$targets = @(
  'http://localhost:3001/',
  'http://localhost:3002/',
  'http://localhost:3003/health',
  'http://localhost:3004/',
  'http://localhost:3005/',
  'http://localhost:5173/'
)

foreach ($url in $targets) {
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 10
    Write-Host "$url -> $($resp.StatusCode)" -ForegroundColor Green
    if ($resp.StatusCode -ne 200) {
      throw "Endpoint check failed for $url (status $($resp.StatusCode))."
    }
  } catch {
    throw "Endpoint check failed for $url"
  }
}

Write-Host 'Docker deployment complete.' -ForegroundColor Green
