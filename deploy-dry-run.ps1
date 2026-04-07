param(
  [switch]$SkipDocker,
  [string]$ApiUrl = "http://localhost:8000"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$backendEnvFile = Join-Path $backendDir ".env"

function Write-Step { param([string]$Msg) Write-Host "  >> $Msg" -ForegroundColor Cyan }
function Write-Ok { param([string]$Msg) Write-Host "  OK  $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "  !!  $Msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$Msg) Write-Host "  ERR $Msg" -ForegroundColor Red }

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

function Assert-Command {
  param([string]$Name, [string]$InstallHint)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name not found. $InstallHint"
  }
}

Write-Host ""
Write-Host "  CampusAI Deployment Dry Run" -ForegroundColor White
Write-Host "  ---------------------------" -ForegroundColor DarkGray

Write-Step "Checking toolchain..."
$pythonExe = Find-Python
Assert-Command -Name "npm" -InstallHint "Install Node.js from https://nodejs.org"
Write-Ok "Python: $pythonExe"
Write-Ok "npm: available"

if (-not (Test-Path $backendEnvFile)) {
  throw "backend/.env not found. Create it from backend/.env.example first."
}

Write-Step "Validating backend/.env essentials..."
$backendEnvFilePy = ($backendEnvFile -replace "\\", "/")
$missingValues = & $pythonExe -c "from dotenv import dotenv_values; import sys; cfg = dotenv_values(r'$backendEnvFilePy'); missing = [k for k in ('ADMIN_PASSWORD','CORS_ORIGINS') if not (cfg.get(k) or '').strip()]; has_llm = bool((cfg.get('GEMINI_API_KEY') or '').strip() or (cfg.get('GROQ_API_KEY') or '').strip()); missing += ([] if has_llm else ['GEMINI_API_KEY or GROQ_API_KEY']); print(', '.join(missing)); sys.exit(1 if missing else 0)"
if ($LASTEXITCODE -ne 0) {
  throw "Missing required env values: $missingValues"
}
Write-Ok "Required backend env values present"

$envJson = & $pythonExe -c "from dotenv import dotenv_values; import json; cfg = dotenv_values(r'$backendEnvFilePy'); print(json.dumps({'ADMIN_PASSWORD': cfg.get('ADMIN_PASSWORD',''), 'CORS_ORIGINS': cfg.get('CORS_ORIGINS',''), 'GEMINI_API_KEY': cfg.get('GEMINI_API_KEY',''), 'GROQ_API_KEY': cfg.get('GROQ_API_KEY','')}))"
$resolvedEnv = $envJson | ConvertFrom-Json

Write-Step "Running backend strict preflight + import smoke test..."
Push-Location $backendDir
try {
  $env:STRICT_STARTUP_VALIDATION = "true"
  $env:APP_ENV = "production"
  $env:ADMIN_PASSWORD = [string]$resolvedEnv.ADMIN_PASSWORD
  $env:CORS_ORIGINS = [string]$resolvedEnv.CORS_ORIGINS
  $env:GEMINI_API_KEY = [string]$resolvedEnv.GEMINI_API_KEY
  $env:GROQ_API_KEY = [string]$resolvedEnv.GROQ_API_KEY

  & $pythonExe -c "from main import _validate_startup_config, app; _validate_startup_config(); print('backend_smoke_ok')"
  if ($LASTEXITCODE -ne 0) {
    throw "Backend smoke check failed."
  }
} finally {
  Pop-Location
}
Write-Ok "Backend strict preflight passed"

Write-Step "Running frontend production build smoke test..."
Push-Location $frontendDir
try {
  $env:VITE_API_URL = $ApiUrl
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "Frontend build failed."
  }
} finally {
  Pop-Location
}
Write-Ok "Frontend build passed"

if (-not $SkipDocker) {
  Write-Step "Validating docker compose configuration..."
  if (Get-Command docker -ErrorAction SilentlyContinue) {
    Push-Location $repoRoot
    try {
      docker compose config | Out-Null
      if ($LASTEXITCODE -ne 0) {
        throw "docker compose config failed."
      }
    } finally {
      Pop-Location
    }
    Write-Ok "Docker compose config is valid"
  } else {
    Write-Warn "docker not found; skipping docker compose validation"
  }
} else {
  Write-Warn "Skipping docker validation by request"
}

Write-Host ""
Write-Host "  Dry run complete. Deployment checks passed." -ForegroundColor Green
Write-Host ""
