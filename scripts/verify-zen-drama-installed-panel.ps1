param(
  [string]$InstallDir = "",
  [ValidateSet("graph", "plm", "crew")]
  [string]$Surface = "graph",
  [string]$RuntimeUrl = "http://127.0.0.1:3198",
  [int]$MarionettePort = 2838,
  [switch]$Headless,
  [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"

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

function Test-RequiredPath {
  param(
    [string]$Path,
    [string]$Label
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Label is missing: $Path"
  }
}

function Resolve-Python {
  $command = Get-Command python -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $uvPython = Join-Path $env:USERPROFILE "AppData\Roaming\uv\python\cpython-3.11.14-windows-x86_64-none\python.exe"
  if (Test-Path -LiteralPath $uvPython) {
    return $uvPython
  }

  throw "Python is required for Marionette verification."
}

function Wait-TcpPort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
      $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
      if ($async.AsyncWaitHandle.WaitOne(500) -and $client.Connected) {
        $client.EndConnect($async)
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds 250
    } finally {
      $client.Dispose()
    }
  }

  return $false
}

function Wait-MarionettePort {
  param(
    [string]$ProfileDir,
    [int]$FallbackPort,
    [int]$TimeoutSeconds = 30
  )

  $activePortFile = Join-Path $ProfileDir "MarionetteActivePort"
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $candidatePort = $FallbackPort
    if (Test-Path -LiteralPath $activePortFile) {
      $rawPort = (Get-Content -LiteralPath $activePortFile -Raw -ErrorAction SilentlyContinue).Trim()
      $parsedPort = 0
      if ([int]::TryParse($rawPort, [ref]$parsedPort) -and $parsedPort -gt 0) {
        $candidatePort = $parsedPort
      }
    }

    if (Wait-TcpPort -Port $candidatePort -TimeoutSeconds 1) {
      return $candidatePort
    }

    Start-Sleep -Milliseconds 250
  }

  return $null
}

function ConvertTo-FirefoxPrefString {
  param([string]$Value)

  return $Value.Replace('\', '\\').Replace('"', '\"')
}

function Stop-InstalledZenProcesses {
  param([string]$InstalledZenExe)

  $processes = @(Get-CimInstance Win32_Process -Filter "name = 'zen.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.ExecutablePath -and [System.IO.Path]::GetFullPath($_.ExecutablePath).Equals(
      [System.IO.Path]::GetFullPath($InstalledZenExe),
      [System.StringComparison]::OrdinalIgnoreCase
    )
  })
  $installedProcessIds = @($processes | Select-Object -ExpandProperty ProcessId)
  $rootProcesses = @($processes | Where-Object { $installedProcessIds -notcontains $_.ParentProcessId })

  foreach ($process in $rootProcesses) {
    & taskkill /F /T /PID $process.ProcessId 2>$null | Out-Null
  }
}

function Set-InstalledZenDramaProfilePrefs {
  param(
    [string]$ProfileDir,
    [string]$BaseRuntimeUrl,
    [string]$InitialSurface,
    [string]$PackageRoot
  )

  New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null

  $runtimeBase = $BaseRuntimeUrl.TrimEnd("/")
  $runtimeLauncher = Join-Path $PackageRoot "Start-Drama-Runtime.ps1"
  $launchArgsJson = ConvertTo-Json @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $runtimeLauncher
  ) -Compress

  $lines = @(
    'user_pref("zen.drama.base-url", "' + (ConvertTo-FirefoxPrefString "$runtimeBase/app") + '");',
    'user_pref("zen.drama.runtime-url", "' + (ConvertTo-FirefoxPrefString $runtimeBase) + '");',
    'user_pref("zen.drama.open-on-startup", true);',
    'user_pref("zen.drama.start-surface", "' + (ConvertTo-FirefoxPrefString $InitialSurface) + '");',
    'user_pref("zen.drama.runtime-launch.enabled", true);',
    'user_pref("zen.drama.runtime-launch.command", "powershell.exe");',
    'user_pref("zen.drama.runtime-launch.args", "' + (ConvertTo-FirefoxPrefString $launchArgsJson) + '");',
    'user_pref("zen.drama.runtime-launch.cwd", "' + (ConvertTo-FirefoxPrefString $PackageRoot) + '");',
    'user_pref("zen.drama.runtime-launch.timeout-ms", 45000);'
  )

  $userJs = Join-Path $ProfileDir "user.js"
  $lines | Set-Content -LiteralPath $userJs -Encoding UTF8
  return $userJs
}

$installRoot = Get-FullPath $InstallDir
$zenExe = Join-Path $installRoot "zen\zen.exe"
$runtimeLauncher = Join-Path $installRoot "Start-Drama-Runtime.ps1"
$profile = Join-Path $installRoot "profile-marionette-verify"
$runtimeBaseUrl = $RuntimeUrl.TrimEnd("/")
$python = Resolve-Python

Test-RequiredPath -Path $zenExe -Label "Installed Zen executable"
Test-RequiredPath -Path $runtimeLauncher -Label "Installed Drama runtime launcher"
Test-RequiredPath -Path (Join-Path $installRoot "manifest.json") -Label "Installed package manifest"

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runtimeLauncher
if ($LASTEXITCODE -ne 0) {
  throw "Installed Drama runtime launcher failed with exit code $LASTEXITCODE."
}

$status = Invoke-RestMethod -Uri "$runtimeBaseUrl/runtime/status" -Method Get -TimeoutSec 3
if ($status.state -ne "ready") {
  throw "Installed Drama runtime is not ready: $($status | ConvertTo-Json -Depth 4)"
}
if (-not $status.runtimePackageRoot) {
  throw "Runtime status does not expose runtimePackageRoot."
}
$runtimePackageRoot = Get-FullPath ([string]$status.runtimePackageRoot)
if (-not $runtimePackageRoot.Equals($installRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Runtime package root is '$runtimePackageRoot', expected '$installRoot'."
}

Stop-InstalledZenProcesses -InstalledZenExe $zenExe

$resolvedProfile = Get-FullPath $profile
if (-not $resolvedProfile.StartsWith($installRoot.TrimEnd('\') + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to reset verification profile outside install directory: $resolvedProfile"
}
Remove-Item -LiteralPath $resolvedProfile -Recurse -Force -ErrorAction SilentlyContinue

$userJsPath = Set-InstalledZenDramaProfilePrefs `
  -ProfileDir $profile `
  -BaseRuntimeUrl $runtimeBaseUrl `
  -InitialSurface $Surface `
  -PackageRoot $installRoot

$activePortFile = Join-Path $profile "MarionetteActivePort"
Remove-Item -LiteralPath $activePortFile -Force -ErrorAction SilentlyContinue

$existing = Get-Process zen -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $zenExe } | Select-Object -ExpandProperty Id
$zenArgs = @(
  "-no-remote",
  "-profile",
  $profile,
  "--marionette",
  "-remote-allow-system-access",
  "about:blank"
)
if ($Headless) {
  $zenArgs = @(
    "-no-remote",
    "-profile",
    $profile,
    "--headless",
    "--marionette",
    "-remote-allow-system-access",
    "about:blank"
  )
}

if (Wait-TcpPort -Port $MarionettePort -TimeoutSeconds 1) {
  throw "Marionette port $MarionettePort is already in use. Close the existing Marionette-enabled Zen instance and retry."
}

$process = Start-Process `
  -FilePath $zenExe `
  -ArgumentList $zenArgs `
  -WorkingDirectory (Split-Path $zenExe) `
  -PassThru

try {
  $activeMarionettePort = Wait-MarionettePort -ProfileDir $profile -FallbackPort $MarionettePort -TimeoutSeconds 30
  if (-not $activeMarionettePort) {
    throw "Timed out waiting for Marionette on port $MarionettePort."
  }

  $env:DRAMA_VERIFY_SURFACE = $Surface
  $env:DRAMA_VERIFY_RUNTIME_URL = $runtimeBaseUrl
  $env:DRAMA_VERIFY_MARIONETTE_PORT = [string]$activeMarionettePort
  $env:DRAMA_VERIFY_INSTALL_ROOT = $installRoot
  $env:DRAMA_VERIFY_ZEN_EXE = $zenExe

  $pythonScript = @'
import json
import os
import socket
import sys
from urllib.parse import quote

host = "127.0.0.1"
port = int(os.environ["DRAMA_VERIFY_MARIONETTE_PORT"])
surface = os.environ["DRAMA_VERIFY_SURFACE"]
runtime_url = os.environ["DRAMA_VERIFY_RUNTIME_URL"].rstrip("/")

def recv_frame(sock):
    prefix = b""
    while not prefix.endswith(b":"):
        chunk = sock.recv(1)
        if not chunk:
            raise RuntimeError("socket closed while reading frame length")
        prefix += chunk
    length = int(prefix[:-1])
    payload = b""
    while len(payload) < length:
        chunk = sock.recv(length - len(payload))
        if not chunk:
            raise RuntimeError("socket closed while reading payload")
        payload += chunk
    return json.loads(payload.decode("utf-8"))

def send(sock, msg):
    data = json.dumps(msg, separators=(",", ":")).encode("utf-8")
    sock.sendall(str(len(data)).encode("ascii") + b":" + data)

with socket.create_connection((host, port), timeout=10) as sock:
    sock.settimeout(30)
    recv_frame(sock)
    message_id = 1
    send(sock, [0, message_id, "WebDriver:NewSession", {"capabilities": {"alwaysMatch": {}, "firstMatch": [{}]}}])
    recv_frame(sock)
    message_id += 1
    send(sock, [0, message_id, "Marionette:SetContext", {"value": "chrome"}])
    context_response = recv_frame(sock)
    if context_response[2] is not None:
        print(json.dumps({"ok": False, "stage": "set-context", "response": context_response}, ensure_ascii=False, indent=2))
        sys.exit(1)

    message_id += 1
    script = r'''
const done = arguments[arguments.length - 1];
const surface = arguments[0];
try {
  setTimeout(() => {
    const browser = document.getElementById("zen-drama-browser");
    const surfaceButton = document.getElementById(`zen-drama-${surface}-sidebar-button`);
    const result = {
      managerType: typeof window.gZenDramaManager,
      surfaceSidebarButton: !!surfaceButton,
      surfaceSidebarImage: surfaceButton?.getAttribute("image") ?? null,
      footChildren: Array.from(document.getElementById("zen-sidebar-foot-buttons")?.children || []).map((el) => el.id || el.localName),
      panelHidden: document.getElementById("zen-drama-panel")?.hidden ?? null,
      currentURI: browser?.currentURI?.spec ?? null,
      status: document.getElementById("zen-drama-runtime-status")?.getAttribute("value") ?? null,
      surfaceSidebarActive: surfaceButton?.hasAttribute("zen-drama-active") ?? null,
      surfaceActive: document.getElementById(`zen-drama-${surface}-button`)?.hasAttribute("zen-drama-active") ?? null,
    };

    const webTab = gBrowser.addTrustedTab("data:text/html,Drama%20normal%20web%20tab", {
      triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
    });
    gBrowser.selectedTab = webTab;
    setTimeout(() => {
      result.hiddenAfterWebTab = document.getElementById("zen-drama-panel")?.hidden ?? null;
      result.surfaceSidebarActiveAfterWebTab = surfaceButton?.hasAttribute("zen-drama-active") ?? null;
      result.surfaceActiveAfterWebTab = document.getElementById(`zen-drama-${surface}-button`)?.hasAttribute("zen-drama-active") ?? null;
      gBrowser.removeTab(webTab);
      done(result);
    }, 500);
  }, 2500);
} catch (error) {
  done({ error: String(error?.stack || error) });
}
'''
    send(sock, [0, message_id, "WebDriver:ExecuteAsyncScript", {"script": script, "args": [surface]}])
    response = recv_frame(sock)

result = response[3].get("value") if len(response) > 3 and isinstance(response[3], dict) else None
expected_prefix = f"{runtime_url}/app/{surface}?host=zen&runtime={quote(runtime_url, safe='')}"
expected_icon = f"chrome://browser/content/zen-icons/drama-{surface}.svg"
checks = {
    "manager": result and result.get("managerType") == "object",
    "surfaceSidebarButton": result and result.get("surfaceSidebarButton") is True,
    "surfaceSidebarIcon": result and result.get("surfaceSidebarImage") == expected_icon,
    "surfaceSidebarActive": result and result.get("surfaceSidebarActive") is True,
    "panelVisible": result and result.get("panelHidden") is False,
    "surfaceUrl": result and str(result.get("currentURI", "")).startswith(expected_prefix),
    "runtimeReady": result and result.get("status") == f"Runtime ready / {surface}",
    "surfaceActive": result and result.get("surfaceActive") is True,
    "hidesForNormalWebTab": result and result.get("hiddenAfterWebTab") is True,
    "surfaceSidebarInactiveAfterWebTab": result and result.get("surfaceSidebarActiveAfterWebTab") is False,
    "surfaceInactiveAfterWebTab": result and result.get("surfaceActiveAfterWebTab") is False,
}
ok = all(checks.values())
print(json.dumps({"ok": ok, "checks": checks, "result": result}, ensure_ascii=False, indent=2))
sys.exit(0 if ok else 1)
'@

  $pythonScript | & $python -
  if ($LASTEXITCODE -ne 0) {
    throw "Installed Zen Drama panel verification failed."
  }

  [ordered]@{
    ok = $true
    installDir = $installRoot
    zenExe = $zenExe
    profile = $profile
    prefs = $userJsPath
    runtimeUrl = $runtimeBaseUrl
    runtimePackageRoot = $runtimePackageRoot
    marionettePort = $activeMarionettePort
    surface = $Surface
  } | ConvertTo-Json -Depth 4
} finally {
  if (-not $KeepRunning) {
    $after = Get-Process zen -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $zenExe }
    foreach ($zenProcess in $after) {
      if ($existing -notcontains $zenProcess.Id -and $zenProcess.Id -ne $process.Id) {
        Stop-Process -Id $zenProcess.Id -Force -ErrorAction SilentlyContinue
      }
    }
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  }
}
