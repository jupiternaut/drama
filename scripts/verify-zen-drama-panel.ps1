param(
  [string]$ZenExe = "",
  [string]$ShortZenRoot = "C:\Users\gengr\zen-build",
  [string]$Profile = "C:\Users\gengr\zen-build\profile-drama-verify",
  [ValidateSet("graph", "plm", "crew")]
  [string]$Surface = "graph",
  [string]$RuntimeUrl = "http://127.0.0.1:3198",
  [int]$MarionettePort = 2828,
  [switch]$Headless,
  [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot "launch-zen-drama.ps1"

function Resolve-ZenExe {
  param(
    [string]$ExplicitZenExe,
    [string]$BuildRoot
  )

  if ($ExplicitZenExe -and (Test-Path -LiteralPath $ExplicitZenExe)) {
    return (Resolve-Path -LiteralPath $ExplicitZenExe).Path
  }

  $candidate = Join-Path $BuildRoot "engine\obj-x86_64-pc-windows-msvc\dist\bin\zen.exe"
  if (Test-Path -LiteralPath $candidate) {
    return (Resolve-Path -LiteralPath $candidate).Path
  }

  throw "Built Zen executable not found. Run Zen full build first, or pass -ZenExe."
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

function Get-FullPath {
  param([string]$Path)

  if ([System.IO.Path]::IsPathRooted($Path)) {
    return [System.IO.Path]::GetFullPath($Path)
  }
  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $Path))
}

$resolvedZenExe = Resolve-ZenExe -ExplicitZenExe $ZenExe -BuildRoot $ShortZenRoot
$python = Resolve-Python
$resolvedProfile = Get-FullPath $Profile
$resolvedShortZenRoot = Get-FullPath $ShortZenRoot
if (-not $resolvedProfile.StartsWith($resolvedShortZenRoot.TrimEnd('\') + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to reset verification profile outside ShortZenRoot: $resolvedProfile"
}
Remove-Item -LiteralPath $resolvedProfile -Recurse -Force -ErrorAction SilentlyContinue

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher `
  -ZenExe $resolvedZenExe `
  -ShortZenRoot $ShortZenRoot `
  -Profile $Profile `
  -Surface $Surface `
  -RuntimeUrl $RuntimeUrl `
  -PrepareOnly
if ($LASTEXITCODE -ne 0) {
  throw "Zen Drama launch failed with exit code $LASTEXITCODE."
}

$existing = Get-Process zen -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $resolvedZenExe } | Select-Object -ExpandProperty Id
$zenArgs = @(
  "-no-remote",
  "-profile",
  $Profile,
  "--marionette",
  "-remote-allow-system-access",
  "about:blank"
)
if ($Headless) {
  $zenArgs = @(
    "-no-remote",
    "-profile",
    $Profile,
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
  -FilePath $resolvedZenExe `
  -ArgumentList $zenArgs `
  -WorkingDirectory (Split-Path $resolvedZenExe) `
  -PassThru

try {
  if (-not (Wait-TcpPort -Port $MarionettePort -TimeoutSeconds 30)) {
    throw "Timed out waiting for Marionette on port $MarionettePort."
  }

  $env:DRAMA_VERIFY_SURFACE = $Surface
  $env:DRAMA_VERIFY_RUNTIME_URL = $RuntimeUrl.TrimEnd("/")
  $env:DRAMA_VERIFY_MARIONETTE_PORT = [string]$MarionettePort

  $pythonScript = @'
import json
import os
import socket
import sys
import time
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
    throw "Zen Drama panel verification failed."
  }
} finally {
  if (-not $KeepRunning) {
    $after = Get-Process zen -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $resolvedZenExe }
    foreach ($zenProcess in $after) {
      if ($existing -notcontains $zenProcess.Id) {
        Stop-Process -Id $zenProcess.Id -Force -ErrorAction SilentlyContinue
      }
    }
  }
}
