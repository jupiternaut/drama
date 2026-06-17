param(
  [string]$PackageDir = "",
  [string]$InstallDir = "",
  [ValidateSet("graph", "plm", "crew")]
  [string]$Surface = "graph",
  [switch]$NoShortcut,
  [switch]$NoStopRunning,
  [switch]$Verify,
  [switch]$VerifyPlotPilot,
  [switch]$AllowOutsideLocalAppData
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $PackageDir) {
  $PackageDir = Join-Path $repoRoot "dist\zen-drama-win-x64"
}
if (-not $InstallDir) {
  $InstallDir = Join-Path $env:LOCALAPPDATA "Programs\DramaZen"
}

function Get-FullPath {
  param([string]$Path)

  if ([System.IO.Path]::IsPathRooted($Path)) {
    return [System.IO.Path]::GetFullPath($Path)
  }
  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $Path))
}

function Assert-SafeInstallPath {
  param(
    [string]$Candidate,
    [switch]$AllowOutside
  )

  $full = Get-FullPath $Candidate
  $programsRoot = Get-FullPath (Join-Path $env:LOCALAPPDATA "Programs")
  $comparison = [System.StringComparison]::OrdinalIgnoreCase

  if ($full.Equals($programsRoot, $comparison)) {
    throw "InstallDir must be a child directory of $programsRoot, not the Programs directory itself."
  }

  if (-not $AllowOutside) {
    $prefix = $programsRoot.TrimEnd('\') + '\'
    if (-not $full.StartsWith($prefix, $comparison)) {
      throw "Refusing to install outside LocalAppData Programs without -AllowOutsideLocalAppData: $full"
    }
  }

  return $full
}

function Test-RequiredPath {
  param(
    [string]$Path,
    [string]$Label
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Label is missing: $Path"
  }
}

function Invoke-RobocopyMirror {
  param(
    [string]$Source,
    [string]$Destination,
    [string[]]$ExcludeDirs = @(),
    [string[]]$ExcludeFiles = @()
  )

  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  $arguments = @($Source, $Destination, "/MIR", "/NFL", "/NDL", "/NJH", "/NJS", "/NP")
  if ($ExcludeDirs.Count -gt 0) {
    $arguments += "/XD"
    $arguments += $ExcludeDirs
  }
  if ($ExcludeFiles.Count -gt 0) {
    $arguments += "/XF"
    $arguments += $ExcludeFiles
  }

  & robocopy @arguments | Out-Null
  $exitCode = $LASTEXITCODE
  if ($exitCode -gt 7) {
    throw "robocopy failed from $Source to $Destination with exit code $exitCode."
  }
  $global:LASTEXITCODE = 0
}

function Stop-InstalledDramaRuntime {
  param([string]$ExpectedInstallRoot)

  try {
    $status = Invoke-RestMethod -Uri "http://127.0.0.1:3198/runtime/status" -Method Get -TimeoutSec 2
    if (
      $status.state -eq "ready" -and
      [string]$status.runtimePackageRoot -and
      [System.IO.Path]::GetFullPath([string]$status.runtimePackageRoot).Equals(
        [System.IO.Path]::GetFullPath($ExpectedInstallRoot),
        [System.StringComparison]::OrdinalIgnoreCase
      )
    ) {
      Write-Host "Stopping installed Drama runtime before update..."
      Invoke-RestMethod -Uri "http://127.0.0.1:3198/runtime/shutdown" -Method Post -Body "{}" -ContentType "application/json" -TimeoutSec 5 | Out-Null
      Start-Sleep -Milliseconds 800
    }
  } catch {
    # Runtime is not running or not reachable.
  }
}

function Stop-InstalledZenProcesses {
  param([string]$ExpectedInstallRoot)

  $zenExe = Join-Path $ExpectedInstallRoot "zen\zen.exe"
  $processes = @(Get-CimInstance Win32_Process -Filter "name = 'zen.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.ExecutablePath -and [System.IO.Path]::GetFullPath($_.ExecutablePath).Equals(
      [System.IO.Path]::GetFullPath($zenExe),
      [System.StringComparison]::OrdinalIgnoreCase
    )
  })
  $installedProcessIds = @($processes | Select-Object -ExpandProperty ProcessId)
  $rootProcesses = @($processes | Where-Object { $installedProcessIds -notcontains $_.ParentProcessId })

  foreach ($process in $rootProcesses) {
    Write-Host "Stopping installed Zen process $($process.ProcessId)..."
    & taskkill /F /T /PID $process.ProcessId 2>$null | Out-Null
  }
}

$packageRoot = Get-FullPath $PackageDir
$installRoot = Assert-SafeInstallPath -Candidate $InstallDir -AllowOutside:$AllowOutsideLocalAppData

Test-RequiredPath -Path (Join-Path $packageRoot "manifest.json") -Label "Zen Drama package manifest"
Test-RequiredPath -Path (Join-Path $packageRoot "Start-Drama-Zen.ps1") -Label "Zen Drama package launcher"
Test-RequiredPath -Path (Join-Path $packageRoot "zen\zen.exe") -Label "Packaged Zen executable"
Test-RequiredPath -Path (Join-Path $packageRoot "runtime\drama-runtime.js") -Label "Packaged Drama runtime"
Test-RequiredPath -Path (Join-Path $packageRoot "drama-browser-shell\dist\index.html") -Label "Packaged browser shell"

Write-Host "Installing Zen Drama package..." -ForegroundColor Cyan
Write-Host "Package: $packageRoot"
Write-Host "Install: $installRoot"

if (-not $NoStopRunning) {
  Stop-InstalledDramaRuntime -ExpectedInstallRoot $installRoot
  Stop-InstalledZenProcesses -ExpectedInstallRoot $installRoot
}

Invoke-RobocopyMirror `
  -Source $packageRoot `
  -Destination $installRoot `
  -ExcludeDirs @(
    (Join-Path $packageRoot "profile"),
    (Join-Path $installRoot "profile"),
    (Join-Path $packageRoot "logs"),
    (Join-Path $installRoot "logs"),
    "__pycache__"
  ) `
  -ExcludeFiles @("*.pyc", "install-manifest.json")

$installedManifestPath = Join-Path $installRoot "install-manifest.json"
$installManifest = [ordered]@{
  installedAt = (Get-Date).ToUniversalTime().ToString("o")
  installDir = $installRoot
  sourcePackage = $packageRoot
  surface = $Surface
  shortcut = -not $NoShortcut
}
($installManifest | ConvertTo-Json -Depth 4) | Set-Content -LiteralPath $installedManifestPath -Encoding UTF8

if (-not $NoShortcut) {
  $shortcutInstaller = Join-Path $installRoot "Install-Shortcut.ps1"
  Test-RequiredPath -Path $shortcutInstaller -Label "Installed shortcut installer"
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $shortcutInstaller -Surface $Surface
  if ($LASTEXITCODE -ne 0) {
    throw "Installed shortcut installer failed with exit code $LASTEXITCODE."
  }
}

if ($Verify) {
  $verifyScript = Join-Path $repoRoot "scripts\verify-zen-drama-install.ps1"
  Test-RequiredPath -Path $verifyScript -Label "Repo install verifier"
  $verifyArgs = @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $verifyScript,
    "-InstallDir",
    $installRoot,
    "-RuntimePort",
    "3398"
  )
  if ($VerifyPlotPilot) {
    $verifyArgs += "-StartPlotPilot"
  }
  & powershell.exe @verifyArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Installed package verification failed with exit code $LASTEXITCODE."
  }
}

Write-Host "Zen Drama package installed." -ForegroundColor Green
Write-Host "InstallDir: $installRoot"
Write-Host "Launcher: $(Join-Path $installRoot "Start-Drama-Zen.ps1")"
Write-Host "Manifest: $installedManifestPath"
