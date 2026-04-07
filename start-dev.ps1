param(
  [int]$BackendPort = 8000,
  [int]$FrontendPort = 5173,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$repoRoot  = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir  = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"

function Write-Step { param($Msg) Write-Host "  >> $Msg" -ForegroundColor Cyan }
function Write-Ok   { param($Msg) Write-Host "  OK  $Msg" -ForegroundColor Green }
function Write-Warn { param($Msg) Write-Host "  !!  $Msg" -ForegroundColor Yellow }
function Write-Fail { param($Msg) Write-Host "  ERR $Msg" -ForegroundColor Red }

function Get-EnvValue {
  param([string]$FilePath, [string]$Key)
  if (-not (Test-Path $FilePath)) { return $null }
  $line = Get-Content $FilePath | Where-Object { $_ -match "^\s*$Key\s*=" } | Select-Object -First 1
  if (-not $line) { return $null }
  return ($line -replace "^\s*$Key\s*=\s*", "").Trim().Trim('"').Trim("'")
}

function Find-Python {
  $candidates = @(
    (Join-Path $repoRoot ".venv\Scripts\python.exe"),
    (Join-Path $repoRoot ".venv311\Scripts\python.exe"),
    (Join-Path $repoRoot ".venv3\Scripts\python.exe")
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }
  $sysCmd = Get-Command python -ErrorAction SilentlyContinue
  if ($sysCmd) { return $sysCmd.Source }
  throw "No Python found. Create a venv at .venv or install Python."
}

function Test-Port {
  param([int]$Port)
  try {
    $null = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Stop-PortProcess {
  param([int]$Port)
  try {
    $ownerPids = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
                 Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $ownerPids) {
      Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 600
  } catch {}
}

function Wait-Url {
  param([string]$Url, [int]$Retries = 20, [int]$DelayMs = 800)
  for ($i = 0; $i -lt $Retries; $i++) {
    try {
      $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
      if ($r.StatusCode -lt 400) { return $true }
    } catch {}
    Start-Sleep -Milliseconds $DelayMs
  }
  return $false
}

Write-Host ""
Write-Host "  CampusAI Dev Launcher" -ForegroundColor White
Write-Host "  ----------------------" -ForegroundColor DarkGray

Write-Step "Locating Python..."
$pythonExe = Find-Python
Write-Ok $pythonExe

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm not found. Install Node.js from https://nodejs.org"
}

$vectorstoreDb = Join-Path $backendDir "vectorstore\chroma.sqlite3"
if (-not (Test-Path $vectorstoreDb)) {
  Write-Warn "Vectorstore not found. Running ingest (takes ~30 s)..."
  Push-Location $backendDir
  try { & $pythonExe ingest.py }
  finally { Pop-Location }
  Write-Ok "Ingest complete."
} else {
  Write-Ok "Vectorstore found."
}

if (Test-Port $BackendPort) {
  Write-Warn "Port $BackendPort in use. Killing stale process..."
  Stop-PortProcess $BackendPort
}
if (Test-Port $FrontendPort) {
  Write-Warn "Port $FrontendPort in use. Killing stale process..."
  Stop-PortProcess $FrontendPort
}

Write-Step "Starting backend on port $BackendPort..."
$backendCmd = "Set-Location '$backendDir'; & '$pythonExe' -m uvicorn main:app --host 127.0.0.1 --port $BackendPort --reload; Read-Host 'Press Enter to close'"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal | Out-Null

$backendUrl = "http://127.0.0.1:$BackendPort"
$adminPassword = Get-EnvValue -FilePath (Join-Path $backendDir ".env") -Key "ADMIN_PASSWORD"
Write-Step "Waiting for backend..."
if (Wait-Url "$backendUrl/health") {
  Write-Ok "Backend ready at $backendUrl"
  # Hot-reload vectorstore in case docs changed since last run
  try {
    if ($adminPassword) {
      $null = Invoke-RestMethod -Uri "$backendUrl/admin/reindex" -Method Post -Headers @{ "x-admin-password" = $adminPassword } -TimeoutSec 120 -ErrorAction Stop
      Write-Ok "Vectorstore reindexed."
    } else {
      Write-Warn "ADMIN_PASSWORD not found in backend/.env; skipping auto reindex."
    }
  } catch {
    Write-Warn "Reindex skipped (non-fatal): $_"
  }
} else {
  Write-Fail "Backend did not respond in time. Check the backend window for errors."
}

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
  Write-Warn "node_modules missing. Running npm install..."
  Push-Location $frontendDir
  try { npm install --silent }
  finally { Pop-Location }
  Write-Ok "npm install complete."
}

Write-Step "Starting frontend on port $FrontendPort..."
$frontendCmd = "Set-Location '$frontendDir'; `$env:VITE_API_URL='$backendUrl'; npm run dev; Read-Host 'Press Enter to close'"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal | Out-Null

$frontendUrl = "http://localhost:$FrontendPort"
Write-Step "Waiting for frontend..."
if (Wait-Url $frontendUrl) {
  Write-Ok "Frontend ready at $frontendUrl"
} else {
  Write-Fail "Frontend did not respond in time. Check the frontend window for errors."
}

if (-not $NoBrowser) {
  Start-Process $frontendUrl
}

Write-Host ""
Write-Host "  Both services are running." -ForegroundColor Green
Write-Host "  Backend  : $backendUrl" -ForegroundColor Green
Write-Host "  Frontend : $frontendUrl" -ForegroundColor Green
if ($adminPassword) {
  Write-Host "  Admin pw : loaded from backend/.env" -ForegroundColor DarkGray
} else {
  Write-Host "  Admin pw : not configured" -ForegroundColor Yellow
}
Write-Host ""
