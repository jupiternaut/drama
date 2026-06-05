$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logPath = Join-Path $repoRoot "drama-shortcut.log"
$runStamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
$outputLogPath = Join-Path $repoRoot "drama-dev-output-$runStamp-$PID.log"
$bunExe = Join-Path $env:USERPROFILE ".bun\bin\bun.exe"
$electronExe = Join-Path $repoRoot "node_modules\electron\dist\electron.exe"
$electronAppArg = "apps/electron"
$electronMainBundle = Join-Path $repoRoot "apps\electron\dist\main.cjs"
$electronRendererIndex = Join-Path $repoRoot "apps\electron\dist\renderer\index.html"

function Write-DramaLog {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $logPath -Encoding UTF8 -Value "[$timestamp] $Message"
}

function Focus-DramaWindow {
  try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class DramaLauncherWindowTools {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@ -ErrorAction SilentlyContinue

    $window = Get-Process -Name electron -ErrorAction SilentlyContinue |
      Where-Object {
        $_.MainWindowHandle -ne 0 -and
        $_.MainWindowTitle -like "*Drama*"
      } |
      Select-Object -First 1

    if ($window) {
      [void][DramaLauncherWindowTools]::ShowWindow([IntPtr]$window.MainWindowHandle, 9)
      [void][DramaLauncherWindowTools]::SetForegroundWindow([IntPtr]$window.MainWindowHandle)
      Write-DramaLog "Focused Drama window PID $($window.Id)."
      return $true
    }

    $shell = New-Object -ComObject WScript.Shell
    $activated = $shell.AppActivate("Drama")
    Write-DramaLog "AppActivate fallback returned $activated."
    return $activated
  } catch {
    Write-DramaLog "Could not focus Drama window: $($_.Exception.Message)"
    return $false
  }
}

function Wait-FocusDramaWindow {
  param([int]$TimeoutSeconds = 12)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Focus-DramaWindow) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Start-DramaFocusHelper {
  Start-Job -ScriptBlock {
    param([string]$RepoRoot, [string]$LauncherLogPath)

    function Add-LauncherLog {
      param([string]$Message)

      $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
      Add-Content -Path $LauncherLogPath -Encoding UTF8 -Value "[$timestamp] $Message"
    }

    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class DramaLauncherFocusJobWindowTools {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@ -ErrorAction SilentlyContinue

    for ($i = 0; $i -lt 120; $i++) {
      $candidates = Get-CimInstance Win32_Process |
        Where-Object {
          $_.Name -eq "electron.exe" -and
          $_.CommandLine -like "*$RepoRoot*" -and
          $_.CommandLine -like "*apps/electron*" -and
          $_.CommandLine -notlike "*--type=*"
        }

      foreach ($candidate in $candidates) {
        $process = Get-Process -Id $candidate.ProcessId -ErrorAction SilentlyContinue
        if ($process -and $process.MainWindowHandle -ne 0) {
          [void][DramaLauncherFocusJobWindowTools]::ShowWindow([IntPtr]$process.MainWindowHandle, 9)
          [void][DramaLauncherFocusJobWindowTools]::SetForegroundWindow([IntPtr]$process.MainWindowHandle)
          Add-LauncherLog "Focused newly started Drama window PID $($process.Id)."
          return
        }
      }

      Start-Sleep -Milliseconds 500
    }

    Add-LauncherLog "Focus helper timed out waiting for Drama window."
  } -ArgumentList $repoRoot, $logPath | Out-Null
}

function Remove-StaleDramaServerLock {
  $lockPath = Join-Path $env:USERPROFILE ".craft-agent\.server.lock"
  if (-not (Test-Path -LiteralPath $lockPath)) {
    return
  }

  try {
    $lock = Get-Content -Raw -LiteralPath $lockPath | ConvertFrom-Json
    if ($lock.pid -and -not (Get-Process -Id ([int]$lock.pid) -ErrorAction SilentlyContinue)) {
      Remove-Item -LiteralPath $lockPath -Force
      Write-DramaLog "Removed stale server lock for PID $($lock.pid)."
    }
  } catch {
    Write-DramaLog "Could not inspect server lock: $($_.Exception.Message)"
  }
}

function Invoke-DramaSecondInstanceWake {
  try {
    if (-not (Test-Path -LiteralPath $electronExe)) {
      Write-DramaLog "Electron executable not found for second-instance wake: $electronExe"
      return $false
    }

    Start-Process -FilePath $electronExe -ArgumentList $electronAppArg -WorkingDirectory $repoRoot -WindowStyle Hidden
    Write-DramaLog "Sent Electron second-instance wake signal."
    Start-Sleep -Seconds 2
    return (Focus-DramaWindow)
  } catch {
    Write-DramaLog "Second-instance wake failed: $($_.Exception.Message)"
    return $false
  }
}

function Stop-StaleDramaDevProcesses {
  $currentPid = $PID
  $stale = Get-CimInstance Win32_Process |
    Where-Object {
      $_.ProcessId -ne $currentPid -and
      $_.CommandLine -like "*$repoRoot*" -and
      (
        $_.Name -eq "vite.exe" -or
        $_.Name -eq "esbuild.exe" -or
        ($_.Name -eq "node.exe" -and ($_.CommandLine -like "*vite.js*" -or $_.CommandLine -like "*electron\cli.js*")) -or
        ($_.Name -eq "bun.exe" -and $_.CommandLine -like "*electron:dev*") -or
        ($_.Name -eq "powershell.exe" -and $_.CommandLine -like "*launch-drama.ps1*")
      )
    }

  foreach ($process in $stale) {
    try {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
      Write-DramaLog "Stopped stale Drama dev process PID $($process.ProcessId) ($($process.Name))."
    } catch {
      Write-DramaLog "Could not stop stale process PID $($process.ProcessId): $($_.Exception.Message)"
    }
  }
}

Set-Content -Path $logPath -Encoding UTF8 -Value "[$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")] Starting Drama launcher"

try {
  $hasBuiltElectronApp = (
    (Test-Path -LiteralPath $electronExe) -and
    (Test-Path -LiteralPath $electronMainBundle) -and
    (Test-Path -LiteralPath $electronRendererIndex)
  )

  if (-not $hasBuiltElectronApp -and -not (Test-Path -LiteralPath $bunExe)) {
    $bunCommand = Get-Command bun -ErrorAction Stop
    $bunExe = $bunCommand.Source
  }

  if (Test-Path -LiteralPath $bunExe) {
    $bunHome = Split-Path -Parent $bunExe
    $env:PATH = "$bunHome;$env:PATH"
  }

  Remove-StaleDramaServerLock

  $existing = Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -eq "electron.exe" -and
      $_.CommandLine -like "*$repoRoot*" -and
      $_.CommandLine -like "*apps/electron*" -and
      $_.CommandLine -notlike "*--type=*"
    } |
    Select-Object -First 1

  if ($existing) {
    Write-DramaLog "Drama is already running as PID $($existing.ProcessId)."
    $focused = Focus-DramaWindow
    if ($focused) {
      exit 0
    }

    Write-DramaLog "Existing Drama process has no focusable window; trying second-instance wake."
    if (Invoke-DramaSecondInstanceWake) {
      exit 0
    }

    Write-DramaLog "Second-instance wake did not restore a window; stopping bad Drama instance before clean launch."
    Get-CimInstance Win32_Process |
      Where-Object {
        $_.Name -eq "electron.exe" -and
        $_.CommandLine -like "*$repoRoot*" -and
        $_.CommandLine -like "*apps/electron*"
      } |
      ForEach-Object {
        try {
          Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
          Write-DramaLog "Stopped bad Drama process PID $($_.ProcessId)."
        } catch {
          Write-DramaLog "Could not stop bad Drama process PID $($_.ProcessId): $($_.Exception.Message)"
        }
      }
    Remove-StaleDramaServerLock
  }

  Set-Location $repoRoot
  Stop-StaleDramaDevProcesses
  Set-Content -Path $outputLogPath -Encoding UTF8 -Value "[$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")] Drama dev output"
  Write-DramaLog "App output: $outputLogPath"

  if ($hasBuiltElectronApp) {
    Write-DramaLog "Running: $electronExe $electronAppArg"
    $process = Start-Process -FilePath $electronExe -ArgumentList $electronAppArg -WorkingDirectory $repoRoot -PassThru
    Write-DramaLog "Started Drama Electron PID $($process.Id)."
    if (Wait-FocusDramaWindow -TimeoutSeconds 15) {
      Write-DramaLog "Drama launch completed."
      exit 0
    }

    Write-DramaLog "Drama process started but no focusable window appeared within timeout."
    exit 0
  }

  Start-DramaFocusHelper
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    Write-DramaLog "Running: $bunExe run electron:start"
    & $bunExe run electron:start *>> $outputLogPath
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  Write-DramaLog "Drama process exited with code $exitCode."
  exit $exitCode
} catch {
  Write-DramaLog "Launcher failed: $($_.Exception.Message)"
  exit 1
}
