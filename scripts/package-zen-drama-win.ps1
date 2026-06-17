param(
  [string]$ZenBinDir = "",
  [string]$ShortZenRoot = "C:\Users\gengr\zen-build",
  [string]$OutputDir = "",
  [ValidateSet("graph", "plm", "crew")]
  [string]$Surface = "graph",
  [string]$PlotPilotProjectRoot = "",
  [switch]$NoPlotPilotBundle,
  [switch]$SkipBuild,
  [switch]$Zip,
  [switch]$AllowOutsideRepo
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutputDir) {
  $OutputDir = Join-Path $repoRoot "dist\zen-drama-win-x64"
}

function Get-FullPath {
  param([string]$Path)

  if ([System.IO.Path]::IsPathRooted($Path)) {
    return [System.IO.Path]::GetFullPath($Path)
  }
  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $Path))
}

function Assert-SafeOutputPath {
  param(
    [string]$Candidate,
    [switch]$AllowOutside
  )

  $full = Get-FullPath $Candidate
  $distRoot = Get-FullPath (Join-Path $repoRoot "dist")
  $comparison = [System.StringComparison]::OrdinalIgnoreCase

  if ($full.Equals($distRoot, $comparison)) {
    throw "OutputDir must be a child directory of dist, not dist itself: $full"
  }

  if (-not $AllowOutside) {
    $prefix = $distRoot.TrimEnd('\') + '\'
    if (-not $full.StartsWith($prefix, $comparison)) {
      throw "Refusing to package outside repo dist without -AllowOutsideRepo: $full"
    }
  }

  return $full
}

function Resolve-BunExe {
  $candidates = @()
  if ($env:BUN_EXE) {
    $candidates += $env:BUN_EXE
  }
  $candidates += (Join-Path $env:USERPROFILE ".bun\bin\bun.exe")

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  $command = Get-Command bun -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  throw "bun was not found. Install Bun or set BUN_EXE."
}

function Resolve-ZenBinDir {
  param(
    [string]$ExplicitZenBinDir,
    [string]$BuildRoot
  )

  $candidates = @()
  if ($ExplicitZenBinDir) {
    $candidates += $ExplicitZenBinDir
  }
  $candidates += @(
    (Join-Path $BuildRoot "engine\obj-x86_64-pc-windows-msvc\dist\bin"),
    "C:\Users\gengr\Downloads\open-source-clients\zen-browser\engine\obj-x86_64-pc-windows-msvc\dist\bin"
  )

  foreach ($candidate in $candidates) {
    if (-not $candidate) {
      continue
    }

    $candidatePath = Get-FullPath $candidate
    if ((Test-Path -LiteralPath $candidatePath -PathType Leaf) -and ((Split-Path -Leaf $candidatePath) -ieq "zen.exe")) {
      return Split-Path -Parent $candidatePath
    }

    $zenExe = Join-Path $candidatePath "zen.exe"
    if (Test-Path -LiteralPath $zenExe) {
      return $candidatePath
    }
  }

  throw "Built Zen bin directory not found. Run the Zen build first or pass -ZenBinDir."
}

function Resolve-PlotPilotProjectRoot {
  param([string]$ExplicitProjectRoot)

  $candidates = @()
  if ($ExplicitProjectRoot) {
    $candidates += $ExplicitProjectRoot
  }
  if ($env:PLOTPILOT_PROJECT_ROOT) {
    $candidates += $env:PLOTPILOT_PROJECT_ROOT
  }
  $candidates += @(
    (Join-Path $env:USERPROFILE "Downloads\PlotPilot-plm-v46-read"),
    (Join-Path $env:USERPROFILE "Downloads\PlotPilot-plm-v46"),
    (Join-Path $env:USERPROFILE "Downloads\PlotPilot-plm-v451-read"),
    (Join-Path $env:USERPROFILE "Downloads\PlotPilot-plm")
  )

  foreach ($candidate in $candidates) {
    if (-not $candidate) {
      continue
    }

    $full = Get-FullPath $candidate
    if (Test-Path -LiteralPath (Join-Path $full "interfaces\main.py")) {
      return $full
    }
  }

  if ($ExplicitProjectRoot) {
    throw "PlotPilot project root is invalid or missing interfaces\main.py: $ExplicitProjectRoot"
  }

  return $null
}

function Invoke-Checked {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory = $repoRoot
  )

  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath $($ArgumentList -join ' ') failed with exit code $LASTEXITCODE."
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

  & robocopy @arguments
  $exitCode = $LASTEXITCODE
  if ($exitCode -gt 7) {
    throw "robocopy failed from $Source to $Destination with exit code $exitCode."
  }
  $global:LASTEXITCODE = 0
}

function Write-TextFile {
  param(
    [string]$Path,
    [string]$Content
  )

  $parent = Split-Path -Parent $Path
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  Set-Content -LiteralPath $Path -Encoding UTF8 -Value $Content
}

$outputRoot = Assert-SafeOutputPath -Candidate $OutputDir -AllowOutside:$AllowOutsideRepo
$bunExe = Resolve-BunExe
$zenBin = Resolve-ZenBinDir -ExplicitZenBinDir $ZenBinDir -BuildRoot $ShortZenRoot
$resolvedPlotPilotRoot = if ($NoPlotPilotBundle) { $null } else { Resolve-PlotPilotProjectRoot -ExplicitProjectRoot $PlotPilotProjectRoot }

Write-Host "Packaging Zen Drama main path..." -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"
Write-Host "Zen bin: $zenBin"
Write-Host "Output: $outputRoot"
if ($resolvedPlotPilotRoot) {
  Write-Host "PlotPilot: $resolvedPlotPilotRoot"
} else {
  Write-Host "PlotPilot: not bundled"
}

if (-not $SkipBuild) {
  Push-Location $repoRoot
  try {
    Invoke-Checked -FilePath $bunExe -ArgumentList @("run", "drama:build-packages")
    Invoke-Checked -FilePath $bunExe -ArgumentList @("run", "browser-shell:build")
  } finally {
    Pop-Location
  }
}

$browserShellDist = Join-Path $repoRoot "apps\drama-browser-shell\dist"
$browserShellIndex = Join-Path $browserShellDist "index.html"
if (-not (Test-Path -LiteralPath $browserShellIndex)) {
  throw "Drama browser shell build is missing: $browserShellIndex"
}

$runtimeSource = Join-Path $repoRoot "apps\drama-runtime\src\server.ts"
if (-not (Test-Path -LiteralPath $runtimeSource)) {
  throw "Drama runtime source is missing: $runtimeSource"
}

if (Test-Path -LiteralPath $outputRoot) {
  Remove-Item -LiteralPath $outputRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$zenDest = Join-Path $outputRoot "zen"
$shellDest = Join-Path $outputRoot "drama-browser-shell\dist"
$runtimeDest = Join-Path $outputRoot "runtime"
$resourcesDest = Join-Path $outputRoot "resources"
$binDest = Join-Path $outputRoot "bin"
$plotPilotSourceDest = Join-Path $resourcesDest "plotpilot\source"

Invoke-RobocopyMirror -Source $zenBin -Destination $zenDest
Invoke-RobocopyMirror -Source $browserShellDist -Destination $shellDest

New-Item -ItemType Directory -Force -Path $runtimeDest, $resourcesDest, $binDest | Out-Null

$plotPilotBundle = [ordered]@{
  bundled = $false
  source = $null
  sourceRoot = $null
  includesVenv = $false
  python = $null
  excludedDirs = @(".git", ".pytest_cache", "__pycache__", "logs", "projects")
  excludedFiles = @(".env", ".env.local", ".env.production", "*.pyc", "*.log")
}

if ($resolvedPlotPilotRoot) {
  Invoke-RobocopyMirror `
    -Source $resolvedPlotPilotRoot `
    -Destination $plotPilotSourceDest `
    -ExcludeDirs $plotPilotBundle["excludedDirs"] `
    -ExcludeFiles $plotPilotBundle["excludedFiles"]

  $plotPilotPython = Join-Path $plotPilotSourceDest ".venv\Scripts\python.exe"
  $plotPilotBundle.bundled = $true
  $plotPilotBundle.source = "resources\plotpilot\source"
  $plotPilotBundle.sourceRoot = $resolvedPlotPilotRoot
  $plotPilotBundle.includesVenv = Test-Path -LiteralPath (Join-Path $plotPilotSourceDest ".venv")
  $plotPilotBundle.python = if (Test-Path -LiteralPath $plotPilotPython) { "resources\plotpilot\source\.venv\Scripts\python.exe" } else { $null }
}

$runtimeBundle = Join-Path $runtimeDest "drama-runtime.js"
Invoke-Checked -FilePath $bunExe -ArgumentList @(
  "build",
  $runtimeSource,
  "--target=bun",
  "--outfile",
  $runtimeBundle
)

$plmBootShim = Join-Path $repoRoot "packages\drama-plm\resources\plotpilot_embedded_boot.py"
if (Test-Path -LiteralPath $plmBootShim) {
  Copy-Item -LiteralPath $plmBootShim -Destination (Join-Path $resourcesDest "plotpilot_embedded_boot.py") -Force
} else {
  Write-Warning "PLM embedded boot shim was not found: $plmBootShim"
}

$iconSource = Join-Path $repoRoot "apps\electron\resources\drama-icon.ico"
if (Test-Path -LiteralPath $iconSource) {
  Copy-Item -LiteralPath $iconSource -Destination (Join-Path $resourcesDest "drama-icon.ico") -Force
}

if ((Split-Path -Leaf $bunExe) -ieq "bun.exe") {
  Copy-Item -LiteralPath $bunExe -Destination (Join-Path $binDest "bun.exe") -Force
} else {
  Write-Warning "Resolved Bun is not bun.exe, so the package launcher will fall back to PATH: $bunExe"
}

$runtimeLauncher = @'
param(
  [int]$RuntimePort = 3198,
  [int]$TimeoutSeconds = 45
)

$ErrorActionPreference = "Stop"

$packageRoot = $PSScriptRoot
$runtimeUrl = "http://127.0.0.1:$RuntimePort"
$logDir = Join-Path $packageRoot "logs"
$runtimeLog = Join-Path $logDir "drama-runtime-$RuntimePort.log"
$launcherLog = Join-Path $logDir "drama-runtime-launcher-$RuntimePort.log"
$runtimeScript = Join-Path $packageRoot "runtime\drama-runtime.js"
$browserShellDist = Join-Path $packageRoot "drama-browser-shell\dist"
$resourcesDir = Join-Path $packageRoot "resources"
$bootShim = Join-Path $resourcesDir "plotpilot_embedded_boot.py"
$plotPilotRoot = Join-Path $resourcesDir "plotpilot\source"
$plotPilotPython = Join-Path $plotPilotRoot ".venv\Scripts\python.exe"
$bunExe = Join-Path $packageRoot "bin\bun.exe"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-DramaRuntimeLog {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $launcherLog -Encoding UTF8 -Value "[$timestamp] $Message"
}

function Test-DramaRuntimeReady {
  try {
    $status = Invoke-RestMethod -Uri "$runtimeUrl/runtime/status" -Method Get -TimeoutSec 1
    return $status.state -eq "ready" -and (Test-RuntimeOwnedByPackage -Status $status)
  } catch {
    return $false
  }
}

function Get-DramaRuntimeStatus {
  try {
    return Invoke-RestMethod -Uri "$runtimeUrl/runtime/status" -Method Get -TimeoutSec 1
  } catch {
    return $null
  }
}

function Test-RuntimeOwnedByPackage {
  param([object]$Status)

  if (-not $Status -or $Status.state -ne "ready") {
    return $false
  }
  $reportedRoot = [string]$Status.runtimePackageRoot
  if (-not $reportedRoot) {
    return $false
  }
  return [System.IO.Path]::GetFullPath($reportedRoot).Equals(
    [System.IO.Path]::GetFullPath($packageRoot),
    [System.StringComparison]::OrdinalIgnoreCase
  )
}

function Stop-ForeignDramaRuntime {
  $status = Get-DramaRuntimeStatus
  if (-not $status -or $status.state -ne "ready" -or (Test-RuntimeOwnedByPackage -Status $status)) {
    return
  }

  Write-DramaRuntimeLog "Stopping foreign Drama runtime before starting packaged runtime. Reported runtimePackageRoot=$($status.runtimePackageRoot)"
  try {
    Invoke-RestMethod -Uri "$runtimeUrl/runtime/shutdown" -Method Post -Body "{}" -ContentType "application/json" -TimeoutSec 3 | Out-Null
  } catch {
    Write-DramaRuntimeLog "Foreign runtime shutdown request failed: $($_.Exception.Message)"
  }

  Start-Sleep -Milliseconds 800
}

function Wait-DramaRuntimeReady {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-DramaRuntimeReady) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

if (-not (Test-Path -LiteralPath $bunExe)) {
  $bunCommand = Get-Command bun -ErrorAction Stop
  $bunExe = $bunCommand.Source
}

if (-not (Test-Path -LiteralPath $runtimeScript)) {
  throw "Packaged Drama runtime script is missing: $runtimeScript"
}

if (-not (Test-Path -LiteralPath (Join-Path $browserShellDist "index.html"))) {
  throw "Packaged Drama browser shell is missing: $browserShellDist"
}

$plotPilotEnv = ""
if (Test-Path -LiteralPath (Join-Path $plotPilotRoot "interfaces\main.py")) {
  $plotPilotEnv += "`$env:PLOTPILOT_PROJECT_ROOT = '$plotPilotRoot'`r`n"
  if (Test-Path -LiteralPath $plotPilotPython) {
    $plotPilotEnv += "`$env:PLOTPILOT_PYTHON_EXE = '$plotPilotPython'`r`n"
  }
}

Write-DramaRuntimeLog "Starting packaged Drama runtime for $runtimeUrl"

if (Test-DramaRuntimeReady) {
  Write-DramaRuntimeLog "Drama runtime is already ready."
  exit 0
}

Stop-ForeignDramaRuntime

$runtimeCommand = @"
`$env:DRAMA_RUNTIME_PORT = '$RuntimePort'
`$env:DRAMA_BROWSER_SHELL_DIST = '$browserShellDist'
`$env:DRAMA_RESOURCES_BASE = '$resourcesDir'
`$env:DRAMA_ZEN_PACKAGE_RESOURCES = '$resourcesDir'
`$env:DRAMA_PLOTPILOT_BOOT_SHIM = '$bootShim'
`$env:DRAMA_RUNTIME_PACKAGE_ROOT = '$packageRoot'
$plotPilotEnv
& '$bunExe' '$runtimeScript' *> '$runtimeLog'
"@

Start-Process `
  -FilePath "powershell.exe" `
  -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $runtimeCommand) `
  -WindowStyle Hidden `
  -WorkingDirectory $packageRoot

if (Wait-DramaRuntimeReady) {
  Write-DramaRuntimeLog "Drama runtime is ready."
  exit 0
}

Write-DramaRuntimeLog "Timed out waiting for Drama runtime."
exit 1
'@

$zenLauncher = @'
param(
  [ValidateSet("graph", "plm", "crew")]
  [string]$Surface = "graph",
  [int]$RuntimePort = 3198,
  [switch]$NoRuntimeLaunch,
  [switch]$WaitForExit
)

$ErrorActionPreference = "Stop"

$packageRoot = $PSScriptRoot
$zenExe = Join-Path $packageRoot "zen\zen.exe"
$profileDir = Join-Path $packageRoot "profile"
$runtimeUrl = "http://127.0.0.1:$RuntimePort"
$runtimeLauncher = Join-Path $packageRoot "Start-Drama-Runtime.ps1"

function ConvertTo-FirefoxPrefString {
  param([string]$Value)

  return $Value.Replace('\', '\\').Replace('"', '\"')
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
  param([int]$TimeoutSeconds = 45)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-DramaRuntimeReady) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Set-ZenDramaProfilePrefs {
  New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

  $userJs = Join-Path $profileDir "user.js"
  $existing = @()
  if (Test-Path -LiteralPath $userJs) {
    $existing = Get-Content -LiteralPath $userJs | Where-Object {
      $_ -notmatch '^user_pref\("zen\.drama\.'
    }
  }

  $launchArgsJson = ConvertTo-Json @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $runtimeLauncher,
    "-RuntimePort",
    "$RuntimePort"
  ) -Compress

  $lines = @($existing) + @(
    'user_pref("zen.drama.base-url", "' + (ConvertTo-FirefoxPrefString "$runtimeUrl/app") + '");',
    'user_pref("zen.drama.runtime-url", "' + (ConvertTo-FirefoxPrefString $runtimeUrl) + '");',
    'user_pref("zen.drama.open-on-startup", true);',
    'user_pref("zen.drama.start-surface", "' + (ConvertTo-FirefoxPrefString $Surface) + '");',
    'user_pref("zen.drama.runtime-launch.enabled", true);',
    'user_pref("zen.drama.runtime-launch.command", "powershell.exe");',
    'user_pref("zen.drama.runtime-launch.args", "' + (ConvertTo-FirefoxPrefString $launchArgsJson) + '");',
    'user_pref("zen.drama.runtime-launch.cwd", "' + (ConvertTo-FirefoxPrefString $packageRoot) + '");',
    'user_pref("zen.drama.runtime-launch.timeout-ms", 45000);'
  )

  $lines | Set-Content -LiteralPath $userJs -Encoding UTF8
  return $userJs
}

function Clear-ZenDramaChromeCaches {
  $cachePaths = @(
    (Join-Path $profileDir "startupCache")
  )

  foreach ($cachePath in $cachePaths) {
    Remove-Item -LiteralPath $cachePath -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Focus-ZenDramaWindow {
  try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class PackagedZenDramaWindowTools {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@ -ErrorAction SilentlyContinue

    $existing = Get-CimInstance Win32_Process -Filter "name = 'zen.exe'" |
      Where-Object {
        $_.ExecutablePath -eq $zenExe -and
        $_.CommandLine -like "*$profileDir*"
      } |
      Select-Object -First 1

    if (-not $existing) {
      return $false
    }

    $process = Get-Process -Id $existing.ProcessId -ErrorAction SilentlyContinue
    if (-not $process -or $process.MainWindowHandle -eq 0) {
      return $false
    }

    [void][PackagedZenDramaWindowTools]::ShowWindow([IntPtr]$process.MainWindowHandle, 9)
    [void][PackagedZenDramaWindowTools]::SetForegroundWindow([IntPtr]$process.MainWindowHandle)
    Write-Host "Focused existing packaged Zen Drama window."
    return $true
  } catch {
    Write-Warning "Could not focus existing packaged Zen Drama window: $($_.Exception.Message)"
    return $false
  }
}

if (-not (Test-Path -LiteralPath $zenExe)) {
  throw "Packaged Zen executable is missing: $zenExe"
}

if (-not $NoRuntimeLaunch) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runtimeLauncher -RuntimePort $RuntimePort
  if ($LASTEXITCODE -ne 0) {
    throw "Packaged Drama runtime launcher failed with exit code $LASTEXITCODE."
  }
}

if (-not (Wait-DramaRuntimeReady -TimeoutSeconds 45)) {
  throw "Drama runtime did not become ready at $runtimeUrl."
}

if (Focus-ZenDramaWindow) {
  exit 0
}

$userJsPath = Set-ZenDramaProfilePrefs
Clear-ZenDramaChromeCaches

$process = Start-Process `
  -FilePath $zenExe `
  -ArgumentList @("-no-remote", "-profile", $profileDir, "about:blank") `
  -WorkingDirectory (Split-Path $zenExe) `
  -PassThru

Write-Host "Started packaged Zen Drama." -ForegroundColor Green
Write-Host "Zen: $zenExe"
Write-Host "Profile: $profileDir"
Write-Host "Prefs: $userJsPath"
Write-Host "Runtime: $runtimeUrl"
Write-Host "Surface: $Surface"
Write-Host "ProcessId: $($process.Id)"

if ($WaitForExit) {
  Wait-Process -Id $process.Id
}
'@

$shortcutInstaller = @'
param(
  [ValidateSet("graph", "plm", "crew")]
  [string]$Surface = "graph"
)

$ErrorActionPreference = "Stop"

$packageRoot = $PSScriptRoot
$launcher = Join-Path $packageRoot "Start-Drama-Zen.ps1"
$zenExe = Join-Path $packageRoot "zen\zen.exe"
$icon = Join-Path $packageRoot "resources\drama-icon.ico"
$shortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "Drama.lnk"

if (-not (Test-Path -LiteralPath $launcher)) {
  throw "Packaged launcher is missing: $launcher"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`" -Surface $Surface"
$shortcut.WorkingDirectory = $packageRoot
$shortcut.Description = "Drama in Zen Browser"
if (Test-Path -LiteralPath $icon) {
  $shortcut.IconLocation = "$icon,0"
} elseif (Test-Path -LiteralPath $zenExe) {
  $shortcut.IconLocation = "$zenExe,0"
}
$shortcut.Save()

Write-Host "Installed Drama desktop shortcut." -ForegroundColor Green
Write-Host $shortcutPath
'@

Write-TextFile -Path (Join-Path $outputRoot "Start-Drama-Runtime.ps1") -Content $runtimeLauncher
Write-TextFile -Path (Join-Path $outputRoot "Start-Drama-Zen.ps1") -Content $zenLauncher
Write-TextFile -Path (Join-Path $outputRoot "Install-Shortcut.ps1") -Content $shortcutInstaller

$manifest = [ordered]@{
  name = "Drama Zen Browser"
  version = "0.1.0"
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  surface = $Surface
  zenExe = "zen\zen.exe"
  runtime = "runtime\drama-runtime.js"
  browserShell = "drama-browser-shell\dist"
  resources = "resources"
  plotPilot = $plotPilotBundle
  repoRoot = $repoRoot
  notes = @(
    "This package uses the Zen Browser main path and does not launch Electron.",
    "When PlotPilot is bundled, the package launcher sets PLOTPILOT_PROJECT_ROOT and PLOTPILOT_PYTHON_EXE to resources\plotpilot\source."
  )
}

($manifest | ConvertTo-Json -Depth 4) | Set-Content -LiteralPath (Join-Path $outputRoot "manifest.json") -Encoding UTF8

if ($Zip) {
  $zipPath = "$outputRoot.zip"
  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }
  Compress-Archive -Path (Join-Path $outputRoot "*") -DestinationPath $zipPath -Force
  Write-Host "Zip: $zipPath"
}

Write-Host "Zen Drama package is ready." -ForegroundColor Green
Write-Host "Run: powershell -NoProfile -ExecutionPolicy Bypass -File `"$outputRoot\Start-Drama-Zen.ps1`" -Surface $Surface"
