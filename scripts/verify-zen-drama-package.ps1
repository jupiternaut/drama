param(
  [string]$PackageDir = "",
  [int]$RuntimePort = 3298,
  [switch]$RequireBundledPlotPilot,
  [switch]$StartPlotPilot
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $PackageDir) {
  $PackageDir = Join-Path $repoRoot "dist\zen-drama-win-x64"
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

function Test-PowerShellSyntax {
  param([string]$Path)

  $tokens = $null
  $errors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$tokens, [ref]$errors)
  if ($errors.Count -gt 0) {
    $message = ($errors | ForEach-Object { $_.Message }) -join "`n"
    throw "PowerShell syntax check failed for $Path`n$message"
  }
}

$packageRoot = if ([System.IO.Path]::IsPathRooted($PackageDir)) {
  [System.IO.Path]::GetFullPath($PackageDir)
} else {
  [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $PackageDir))
}

$manifestPath = Join-Path $packageRoot "manifest.json"
$runtimeLauncher = Join-Path $packageRoot "Start-Drama-Runtime.ps1"
$zenLauncher = Join-Path $packageRoot "Start-Drama-Zen.ps1"
$shortcutInstaller = Join-Path $packageRoot "Install-Shortcut.ps1"
$runtimeScript = Join-Path $packageRoot "runtime\drama-runtime.js"
$zenExe = Join-Path $packageRoot "zen\zen.exe"
$browserShellIndex = Join-Path $packageRoot "drama-browser-shell\dist\index.html"
$bootShim = Join-Path $packageRoot "resources\plotpilot_embedded_boot.py"
$plotPilotRoot = Join-Path $packageRoot "resources\plotpilot\source"
$plotPilotMain = Join-Path $plotPilotRoot "interfaces\main.py"
$plotPilotPython = Join-Path $plotPilotRoot ".venv\Scripts\python.exe"
$runtimeUrl = "http://127.0.0.1:$RuntimePort"

Test-RequiredPath -Path $manifestPath -Label "Package manifest"
Test-RequiredPath -Path $runtimeLauncher -Label "Runtime launcher"
Test-RequiredPath -Path $zenLauncher -Label "Zen launcher"
Test-RequiredPath -Path $shortcutInstaller -Label "Shortcut installer"
Test-RequiredPath -Path $runtimeScript -Label "Runtime bundle"
Test-RequiredPath -Path $zenExe -Label "Zen executable"
Test-RequiredPath -Path $browserShellIndex -Label "Browser shell"
Test-RequiredPath -Path $bootShim -Label "PlotPilot embedded boot shim"

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$plotPilotBundled = [bool]($manifest.plotPilot.bundled)
if ($RequireBundledPlotPilot -and -not $plotPilotBundled) {
  throw "Package manifest does not declare bundled PlotPilot."
}
if ($plotPilotBundled) {
  Test-RequiredPath -Path $plotPilotMain -Label "Bundled PlotPilot source"
  Test-RequiredPath -Path $plotPilotPython -Label "Bundled PlotPilot Python"
}

Test-PowerShellSyntax -Path $runtimeLauncher
Test-PowerShellSyntax -Path $zenLauncher
Test-PowerShellSyntax -Path $shortcutInstaller

$result = [ordered]@{
  packageRoot = $packageRoot
  manifest = $manifestPath
  runtimePort = $RuntimePort
  runtimeReady = $false
  appStatus = $null
  contentType = $null
  plotPilotBundled = $plotPilotBundled
  runtimePackageRoot = $null
  runtimePackageRootIsPackaged = $false
  plotPilotProjectRoot = $null
  plotPilotProjectRootIsPackaged = $false
  plotPilotPython = if (Test-Path -LiteralPath $plotPilotPython) { $plotPilotPython } else { $null }
  plotPilotStarted = $false
  plotPilotPort = $null
}

try {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runtimeLauncher -RuntimePort $RuntimePort -TimeoutSeconds 45
  if ($LASTEXITCODE -ne 0) {
    throw "Packaged runtime launcher failed with exit code $LASTEXITCODE."
  }

  $status = Invoke-RestMethod -Uri "$runtimeUrl/runtime/status" -Method Get -TimeoutSec 3
  if ($status.state -ne "ready") {
    throw "Packaged runtime returned state '$($status.state)' instead of ready."
  }
  $result.runtimeReady = $true
  $result.runtimePackageRoot = $status.runtimePackageRoot
  if (-not $status.runtimePackageRoot) {
    throw "Runtime status does not expose runtimePackageRoot; it is not a packaged Zen Drama runtime."
  }
  $resolvedRuntimePackageRoot = [System.IO.Path]::GetFullPath([string]$status.runtimePackageRoot)
  $resolvedPackageRoot = [System.IO.Path]::GetFullPath($packageRoot)
  $result.runtimePackageRootIsPackaged = $resolvedRuntimePackageRoot.Equals(
    $resolvedPackageRoot,
    [System.StringComparison]::OrdinalIgnoreCase
  )
  if (-not $result.runtimePackageRootIsPackaged) {
    throw "Runtime package root is '$resolvedRuntimePackageRoot', expected '$resolvedPackageRoot'."
  }

  $result.plotPilotProjectRoot = $status.plmRuntime.projectRoot
  if ($plotPilotBundled) {
    $resolvedRuntimePlotPilotRoot = [System.IO.Path]::GetFullPath([string]$status.plmRuntime.projectRoot)
    $resolvedPackagedPlotPilotRoot = [System.IO.Path]::GetFullPath($plotPilotRoot)
    $result.plotPilotProjectRootIsPackaged = $resolvedRuntimePlotPilotRoot.Equals(
      $resolvedPackagedPlotPilotRoot,
      [System.StringComparison]::OrdinalIgnoreCase
    )
    if (-not $result.plotPilotProjectRootIsPackaged) {
      throw "Runtime resolved PlotPilot project root to '$resolvedRuntimePlotPilotRoot', expected packaged root '$resolvedPackagedPlotPilotRoot'."
    }
  }

  $app = Invoke-WebRequest -Uri "$runtimeUrl/app/graph?host=zen" -Method Get -TimeoutSec 3 -UseBasicParsing
  if ([int]$app.StatusCode -ne 200) {
    throw "Packaged app returned HTTP $($app.StatusCode)."
  }
  $result.appStatus = [int]$app.StatusCode
  $result.contentType = $app.Headers["Content-Type"]

  if ($StartPlotPilot) {
    $body = @{
      channel = "plotpilot:runtime:start"
      payload = @{
        preferExisting = $false
      }
    } | ConvertTo-Json -Depth 5
    $plmStart = Invoke-RestMethod -Uri "$runtimeUrl/runtime/rpc" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 90
    if (-not $plmStart.ok -or -not $plmStart.data.healthy) {
      throw "Packaged PlotPilot runtime did not become healthy: $($plmStart | ConvertTo-Json -Depth 6)"
    }
    $result.plotPilotStarted = $true
    $result.plotPilotPort = $plmStart.data.port
  }
} finally {
  try {
    Invoke-RestMethod -Uri "$runtimeUrl/runtime/shutdown" -Method Post -Body "{}" -ContentType "application/json" -TimeoutSec 3 | Out-Null
  } catch {
    # The runtime might not have started; nothing to clean up.
  }
}

$result | ConvertTo-Json -Depth 4
