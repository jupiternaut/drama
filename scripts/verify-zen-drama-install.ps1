param(
  [string]$InstallDir = "",
  [string]$ShortcutPath = "",
  [int]$RuntimePort = 3398,
  [switch]$StartPlotPilot
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $InstallDir) {
  $InstallDir = Join-Path $env:LOCALAPPDATA "Programs\DramaZen"
}
if (-not $ShortcutPath) {
  $ShortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "Drama.lnk"
}

function Get-FullPath {
  param([string]$Path)

  if ([System.IO.Path]::IsPathRooted($Path)) {
    return [System.IO.Path]::GetFullPath($Path)
  }
  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $Path))
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

$installRoot = Get-FullPath $InstallDir
$launcher = Join-Path $installRoot "Start-Drama-Zen.ps1"
$runtimeLauncher = Join-Path $installRoot "Start-Drama-Runtime.ps1"
$manifest = Join-Path $installRoot "manifest.json"
$installManifest = Join-Path $installRoot "install-manifest.json"
$zenExe = Join-Path $installRoot "zen\zen.exe"
$plotPilotPython = Join-Path $installRoot "resources\plotpilot\source\.venv\Scripts\python.exe"
$packageVerifier = Join-Path $repoRoot "scripts\verify-zen-drama-package.ps1"

Test-RequiredPath -Path $launcher -Label "Installed Zen Drama launcher"
Test-RequiredPath -Path $runtimeLauncher -Label "Installed Drama runtime launcher"
Test-RequiredPath -Path $manifest -Label "Installed package manifest"
Test-RequiredPath -Path $installManifest -Label "Install manifest"
Test-RequiredPath -Path $zenExe -Label "Installed Zen executable"
Test-RequiredPath -Path $plotPilotPython -Label "Installed PlotPilot Python"
Test-RequiredPath -Path $packageVerifier -Label "Package verifier"
Test-RequiredPath -Path $ShortcutPath -Label "Drama desktop shortcut"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcutArguments = [string]$shortcut.Arguments
$shortcutWorkingDirectory = [string]$shortcut.WorkingDirectory
$comparison = [System.StringComparison]::OrdinalIgnoreCase

if (-not $shortcut.TargetPath.EndsWith("powershell.exe", $comparison)) {
  throw "Drama shortcut target is not powershell.exe: $($shortcut.TargetPath)"
}
if ($shortcutArguments.IndexOf($launcher, $comparison) -lt 0) {
  throw "Drama shortcut does not point to installed launcher. Arguments: $shortcutArguments"
}
if (-not ([System.IO.Path]::GetFullPath($shortcutWorkingDirectory).Equals($installRoot, $comparison))) {
  throw "Drama shortcut working directory is '$shortcutWorkingDirectory', expected '$installRoot'."
}

$verifyArgs = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $packageVerifier,
  "-PackageDir",
  $installRoot,
  "-RuntimePort",
  "$RuntimePort",
  "-RequireBundledPlotPilot"
)
if ($StartPlotPilot) {
  $verifyArgs += "-StartPlotPilot"
}

$packageVerifyOutput = & powershell.exe @verifyArgs
if ($LASTEXITCODE -ne 0) {
  throw "Installed package verification failed with exit code $LASTEXITCODE."
}

[ordered]@{
  installDir = $installRoot
  shortcut = $ShortcutPath
  shortcutTarget = $shortcut.TargetPath
  shortcutArguments = $shortcutArguments
  shortcutWorkingDirectory = $shortcutWorkingDirectory
  runtimePort = $RuntimePort
  startPlotPilot = [bool]$StartPlotPilot
  packageVerification = ($packageVerifyOutput -join "`n" | ConvertFrom-Json)
} | ConvertTo-Json -Depth 8
