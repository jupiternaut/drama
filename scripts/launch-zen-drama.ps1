param(
  [string]$ZenExe = "",
  [string]$ShortZenRoot = "C:\Users\gengr\zen-build",
  [string]$Profile = "C:\Users\gengr\zen-build\profile-drama-main",
  [ValidateSet("graph", "plm", "crew")]
  [string]$Surface = "graph",
  [string]$RuntimeUrl = "http://127.0.0.1:3198",
  [switch]$NoRuntimeLaunch,
  [switch]$PrepareOnly,
  [switch]$WaitForExit
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

function Resolve-ZenExe {
  param(
    [string]$ExplicitZenExe,
    [string]$BuildRoot
  )

  if ($ExplicitZenExe -and (Test-Path -LiteralPath $ExplicitZenExe)) {
    return (Resolve-Path -LiteralPath $ExplicitZenExe).Path
  }

  $candidates = @(
    (Join-Path $BuildRoot "engine\obj-x86_64-pc-windows-msvc\dist\bin\zen.exe"),
    "C:\Users\gengr\Downloads\open-source-clients\zen-browser\engine\obj-x86_64-pc-windows-msvc\dist\bin\zen.exe"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  throw "Built Zen executable not found. Run Zen full build first, or pass -ZenExe."
}

function Test-DramaRuntimeReady {
  param([string]$BaseUrl)

  try {
    $status = Invoke-RestMethod -Uri "$BaseUrl/runtime/status" -Method Get -TimeoutSec 2
    return $status.state -eq "ready"
  } catch {
    return $false
  }
}

function Wait-DramaRuntimeReady {
  param(
    [string]$BaseUrl,
    [int]$TimeoutSeconds = 45
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-DramaRuntimeReady -BaseUrl $BaseUrl) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Focus-ZenDramaWindow {
  param(
    [string]$ZenExecutable,
    [string]$ProfileDir
  )

  try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class ZenDramaLauncherWindowTools {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@ -ErrorAction SilentlyContinue

    $existing = Get-CimInstance Win32_Process -Filter "name = 'zen.exe'" |
      Where-Object {
        $_.ExecutablePath -eq $ZenExecutable -and
        $_.CommandLine -like "*$ProfileDir*"
      } |
      Select-Object -First 1

    if (-not $existing) {
      return $false
    }

    $process = Get-Process -Id $existing.ProcessId -ErrorAction SilentlyContinue
    if (-not $process -or $process.MainWindowHandle -eq 0) {
      return $false
    }

    [void][ZenDramaLauncherWindowTools]::ShowWindow([IntPtr]$process.MainWindowHandle, 9)
    [void][ZenDramaLauncherWindowTools]::SetForegroundWindow([IntPtr]$process.MainWindowHandle)
    Write-Host "Focused existing Zen Drama window."
    Write-Host "ProcessId: $($process.Id)"
    return $true
  } catch {
    Write-Warning "Could not focus existing Zen Drama window: $($_.Exception.Message)"
    return $false
  }
}

function ConvertTo-FirefoxPrefString {
  param([string]$Value)

  return $Value.Replace('\', '\\').Replace('"', '\"')
}

function Set-ZenDramaProfilePrefs {
  param(
    [string]$ProfileDir,
    [string]$BaseRuntimeUrl,
    [string]$InitialSurface,
    [string]$DramaRepoRoot
  )

  New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null

  $userJs = Join-Path $ProfileDir "user.js"
  $existing = @()
  if (Test-Path -LiteralPath $userJs) {
    $existing = Get-Content -LiteralPath $userJs | Where-Object {
      $_ -notmatch '^user_pref\("zen\.drama\.'
    }
  }

  $runtimeBase = $BaseRuntimeUrl.TrimEnd("/")
  $launchScript = Join-Path $DramaRepoRoot "scripts\launch-drama-runtime.ps1"
  $launchArgsJson = ConvertTo-Json @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $launchScript
  ) -Compress

  $dramaPrefs = [System.Collections.Generic.List[string]]::new()
  $dramaPrefs.Add('user_pref("zen.drama.base-url", "' + (ConvertTo-FirefoxPrefString "$runtimeBase/app") + '");')
  $dramaPrefs.Add('user_pref("zen.drama.runtime-url", "' + (ConvertTo-FirefoxPrefString $runtimeBase) + '");')
  $dramaPrefs.Add('user_pref("zen.drama.open-on-startup", true);')
  $dramaPrefs.Add('user_pref("zen.drama.start-surface", "' + (ConvertTo-FirefoxPrefString $InitialSurface) + '");')
  $dramaPrefs.Add('user_pref("zen.drama.runtime-launch.enabled", true);')
  $dramaPrefs.Add('user_pref("zen.drama.runtime-launch.command", "powershell.exe");')
  $dramaPrefs.Add('user_pref("zen.drama.runtime-launch.args", "' + (ConvertTo-FirefoxPrefString $launchArgsJson) + '");')
  $dramaPrefs.Add('user_pref("zen.drama.runtime-launch.cwd", "' + (ConvertTo-FirefoxPrefString $DramaRepoRoot) + '");')
  $dramaPrefs.Add('user_pref("zen.drama.runtime-launch.timeout-ms", 45000);')

  $lines = @($existing) + @($dramaPrefs.ToArray())
  $lines | Set-Content -LiteralPath $userJs -Encoding UTF8
  return $userJs
}

$resolvedZenExe = Resolve-ZenExe -ExplicitZenExe $ZenExe -BuildRoot $ShortZenRoot
$runtimeBaseUrl = $RuntimeUrl.TrimEnd("/")

if (-not $NoRuntimeLaunch) {
  $runtimeLauncher = Join-Path $repoRoot "scripts\launch-drama-runtime.ps1"
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runtimeLauncher
  if ($LASTEXITCODE -ne 0) {
    throw "Drama runtime launcher failed with exit code $LASTEXITCODE."
  }
}

if (-not (Wait-DramaRuntimeReady -BaseUrl $runtimeBaseUrl -TimeoutSeconds 45)) {
  throw "Drama runtime did not become ready at $runtimeBaseUrl."
}

$userJsPath = Set-ZenDramaProfilePrefs `
  -ProfileDir $Profile `
  -BaseRuntimeUrl $runtimeBaseUrl `
  -InitialSurface $Surface `
  -DramaRepoRoot $repoRoot

if ($PrepareOnly) {
  Write-Host "Prepared Zen Drama profile." -ForegroundColor Green
  Write-Host "Zen: $resolvedZenExe"
  Write-Host "Profile: $Profile"
  Write-Host "Prefs: $userJsPath"
  Write-Host "Runtime: $runtimeBaseUrl"
  Write-Host "Surface: $Surface"
  exit 0
}

if (Focus-ZenDramaWindow -ZenExecutable $resolvedZenExe -ProfileDir $Profile) {
  exit 0
}

$zenArgs = @(
  "-no-remote",
  "-profile",
  $Profile,
  "about:blank"
)

$process = Start-Process `
  -FilePath $resolvedZenExe `
  -ArgumentList $zenArgs `
  -WorkingDirectory (Split-Path $resolvedZenExe) `
  -PassThru

Write-Host "Started Zen Drama main path." -ForegroundColor Green
Write-Host "Zen: $resolvedZenExe"
Write-Host "Profile: $Profile"
Write-Host "Prefs: $userJsPath"
Write-Host "Runtime: $runtimeBaseUrl"
Write-Host "Surface: $Surface"
Write-Host "ProcessId: $($process.Id)"

if ($WaitForExit) {
  Wait-Process -Id $process.Id
}
