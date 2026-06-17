$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeUrl = if ($env:DRAMA_RUNTIME_URL) { $env:DRAMA_RUNTIME_URL } else { "http://127.0.0.1:3198" }
$logDir = Join-Path $repoRoot ".codex-run-logs"
$launcherLog = Join-Path $logDir "drama-runtime-launcher.log"
$runtimeLog = Join-Path $logDir "drama-runtime-dev.log"
$bunExe = Join-Path $env:USERPROFILE ".bun\bin\bun.exe"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-DramaRuntimeLog {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $launcherLog -Encoding UTF8 -Value "[$timestamp] $Message"
}

function Test-DramaRuntimeReady {
  try {
    $status = Invoke-RestMethod -Uri "$runtimeUrl/runtime/status" -Method Get -TimeoutSec 1
    return $status.state -eq "ready"
  } catch {
    return $false
  }
}

function Wait-DramaRuntimeReady {
  param([int]$TimeoutSeconds = 30)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-DramaRuntimeReady) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

Write-DramaRuntimeLog "Starting Drama runtime launcher for $runtimeUrl"

try {
  if (Test-DramaRuntimeReady) {
    Write-DramaRuntimeLog "Drama runtime is already ready."
    exit 0
  }

  if (-not (Test-Path -LiteralPath $bunExe)) {
    $bunCommand = Get-Command bun -ErrorAction Stop
    $bunExe = $bunCommand.Source
  }

  $browserShellIndex = Join-Path $repoRoot "apps\drama-browser-shell\dist\index.html"
  if (-not (Test-Path -LiteralPath $browserShellIndex)) {
    Write-DramaRuntimeLog "Browser shell dist missing; building packages and browser shell."
    Push-Location $repoRoot
    try {
      & $bunExe run drama:build-packages *>> $launcherLog
      if ($LASTEXITCODE -ne 0) {
        throw "drama:build-packages failed with exit code $LASTEXITCODE"
      }
      & $bunExe run browser-shell:build *>> $launcherLog
      if ($LASTEXITCODE -ne 0) {
        throw "browser-shell:build failed with exit code $LASTEXITCODE"
      }
    } finally {
      Pop-Location
    }
  }

  $arguments = @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "Set-Location `"$repoRoot`"; `"$bunExe`" run runtime:dev:fast *> `"$runtimeLog`""
  )

  Start-Process -FilePath "powershell.exe" -ArgumentList $arguments -WindowStyle Hidden -WorkingDirectory $repoRoot
  Write-DramaRuntimeLog "Started background runtime process."

  if (Wait-DramaRuntimeReady -TimeoutSeconds 30) {
    Write-DramaRuntimeLog "Drama runtime is ready."
    exit 0
  }

  Write-DramaRuntimeLog "Timed out waiting for Drama runtime."
  exit 1
} catch {
  Write-DramaRuntimeLog "Launcher failed: $($_.Exception.Message)"
  exit 1
}
