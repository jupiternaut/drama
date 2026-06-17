param(
  [string]$ZenRoot = "C:\Users\gengr\Downloads\open-source-clients\zen-browser",
  [string]$ShortZenRoot = "C:\Users\gengr\zen-build",
  [string]$RuntimeUrl = "http://127.0.0.1:3198"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$checks = New-Object System.Collections.Generic.List[object]

function Add-DramaCheck {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Message
  )

  $checks.Add([pscustomobject]@{
    Name = $Name
    Status = $Status
    Message = $Message
  }) | Out-Null
}

function Test-AnyPath {
  param([string[]]$Paths)

  foreach ($path in $Paths) {
    if ($path -and (Test-Path -LiteralPath $path)) {
      return $path
    }
  }
  return $null
}

function Test-CommandPath {
  param(
    [string]$Command,
    [string[]]$FallbackPaths = @()
  )

  $resolved = Get-Command $Command -ErrorAction SilentlyContinue
  if ($resolved) {
    return $resolved.Source
  }
  return Test-AnyPath -Paths $FallbackPaths
}

$browserShellIndex = Join-Path $repoRoot "apps\drama-browser-shell\dist\index.html"
if (Test-Path -LiteralPath $browserShellIndex) {
  Add-DramaCheck "Drama browser shell build" "PASS" $browserShellIndex
} else {
  Add-DramaCheck "Drama browser shell build" "FAIL" "Missing dist. Run: bun run browser-shell:build"
}

$dramaMainLauncher = Join-Path $repoRoot "scripts\launch-drama.ps1"
$zenLauncher = Join-Path $repoRoot "scripts\launch-zen-drama.ps1"
$shortcutInstaller = Join-Path $repoRoot "scripts\install-zen-drama-shortcut.ps1"
$packageScript = Join-Path $repoRoot "scripts\package-zen-drama-win.ps1"
$packageVerifyScript = Join-Path $repoRoot "scripts\verify-zen-drama-package.ps1"
$installScript = Join-Path $repoRoot "scripts\install-zen-drama-package.ps1"
$installVerifyScript = Join-Path $repoRoot "scripts\verify-zen-drama-install.ps1"
$installedPanelVerifyScript = Join-Path $repoRoot "scripts\verify-zen-drama-installed-panel.ps1"
foreach ($scriptPath in @($dramaMainLauncher, $zenLauncher, $shortcutInstaller, $packageScript, $packageVerifyScript, $installScript, $installVerifyScript, $installedPanelVerifyScript)) {
  if (Test-Path -LiteralPath $scriptPath) {
    Add-DramaCheck "Drama launcher $(Split-Path -Leaf $scriptPath)" "PASS" $scriptPath
  } else {
    Add-DramaCheck "Drama launcher $(Split-Path -Leaf $scriptPath)" "FAIL" "Missing $scriptPath"
  }
}

$packageManifest = Join-Path $repoRoot "dist\zen-drama-win-x64\manifest.json"
if (Test-Path -LiteralPath $packageManifest) {
  Add-DramaCheck "Zen Drama package" "PASS" $packageManifest
  try {
    $manifest = Get-Content -LiteralPath $packageManifest -Raw | ConvertFrom-Json
    if ($manifest.plotPilot.bundled -eq $true) {
      Add-DramaCheck "Zen Drama package PlotPilot" "PASS" "Bundled at $($manifest.plotPilot.source)"
    } else {
      Add-DramaCheck "Zen Drama package PlotPilot" "WARN" "PlotPilot is not bundled. Run: bun run zen:drama:package:win"
    }
  } catch {
    Add-DramaCheck "Zen Drama package PlotPilot" "WARN" "Could not inspect manifest: $($_.Exception.Message)"
  }
} else {
  Add-DramaCheck "Zen Drama package" "WARN" "Missing local package. Run: bun run zen:drama:package:win"
}

$desktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "Drama.lnk"
$defaultInstallDir = Join-Path $env:LOCALAPPDATA "Programs\DramaZen"
if (Test-Path -LiteralPath (Join-Path $defaultInstallDir "manifest.json")) {
  Add-DramaCheck "Zen Drama installed package" "PASS" $defaultInstallDir
} else {
  Add-DramaCheck "Zen Drama installed package" "WARN" "Missing install. Run: bun run zen:drama:install:win"
}

if (Test-Path -LiteralPath $desktopShortcut) {
  try {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($desktopShortcut)
    $installedLauncher = Join-Path $defaultInstallDir "Start-Drama-Zen.ps1"
    if (
      (Test-Path -LiteralPath $installedLauncher) -and
      $shortcut.TargetPath -match 'powershell(?:\.exe)?$' -and
      $shortcut.Arguments.IndexOf($installedLauncher, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    ) {
      Add-DramaCheck "Drama desktop shortcut" "PASS" "$desktopShortcut -> installed launcher $installedLauncher"
    } elseif ($shortcut.TargetPath -match 'powershell(?:\.exe)?$' -and $shortcut.Arguments -match 'launch-drama\.ps1') {
      Add-DramaCheck "Drama desktop shortcut" "PASS" "$desktopShortcut -> $($shortcut.TargetPath) $($shortcut.Arguments)"
    } else {
      Add-DramaCheck "Drama desktop shortcut" "WARN" "$desktopShortcut still points to $($shortcut.TargetPath) $($shortcut.Arguments). Run: bun run drama:shortcut:win"
    }
  } catch {
    Add-DramaCheck "Drama desktop shortcut" "WARN" "Could not inspect $desktopShortcut`: $($_.Exception.Message)"
  }
} else {
  Add-DramaCheck "Drama desktop shortcut" "WARN" "Missing. Run: bun run drama:shortcut:win"
}

$legacyElectronProcesses = @(Get-CimInstance Win32_Process -Filter "name = 'electron.exe'" -ErrorAction SilentlyContinue | Where-Object {
  $_.CommandLine -like "*apps/electron*"
})
if ($legacyElectronProcesses.Count -eq 0) {
  Add-DramaCheck "Legacy Electron process" "PASS" "No apps/electron process is running."
} else {
  $ids = ($legacyElectronProcesses | Select-Object -ExpandProperty ProcessId) -join ", "
  Add-DramaCheck "Legacy Electron process" "WARN" "Found apps/electron process(es): $ids. The Zen main path does not require them."
}

try {
  $status = Invoke-RestMethod -Uri "$RuntimeUrl/runtime/status" -Method Get -TimeoutSec 1
  if ($status.state -eq "ready") {
    Add-DramaCheck "Drama standalone runtime" "PASS" "Ready at $RuntimeUrl"
  } else {
    Add-DramaCheck "Drama standalone runtime" "WARN" "Runtime responded with state '$($status.state)'"
  }
} catch {
  Add-DramaCheck "Drama standalone runtime" "WARN" "Offline. Run: bun run runtime:launch:win"
}

if (Test-Path -LiteralPath $ZenRoot) {
  Add-DramaCheck "Zen source root" "PASS" $ZenRoot
} else {
  Add-DramaCheck "Zen source root" "FAIL" "Missing Zen source root: $ZenRoot"
}

$zenEnginePath = Join-Path $ZenRoot "engine"
if ($zenEnginePath.Length -gt 62) {
  Add-DramaCheck "Zen Windows source path length" "WARN" "Mozilla configure rejects long source paths. Use short build root: $ShortZenRoot"
} else {
  Add-DramaCheck "Zen Windows source path length" "PASS" "$($zenEnginePath.Length) characters"
}

if (Test-Path -LiteralPath $ShortZenRoot) {
  Add-DramaCheck "Zen short build root" "PASS" $ShortZenRoot
} else {
  Add-DramaCheck "Zen short build root" "WARN" "Recommended on Windows: copy Zen to $ShortZenRoot before configure/build"
}

$zenRequiredFiles = @(
  "src\zen\drama\ZenDramaManager.mjs",
  "src\zen\drama\zen-drama.css",
  "src\zen\drama\zen-drama.inc.xhtml",
  "src\zen\drama\drama.svg",
  "src\zen\drama\drama-graph.svg",
  "src\zen\drama\drama-plm.svg",
  "src\zen\drama\drama-crew.svg",
  "src\zen\drama\jar.inc.mn",
  "src\zen\drama\moz.build"
)

foreach ($relative in $zenRequiredFiles) {
  $path = Join-Path $ZenRoot $relative
  if (Test-Path -LiteralPath $path) {
    Add-DramaCheck "Zen file $relative" "PASS" $path
  } else {
    Add-DramaCheck "Zen file $relative" "FAIL" "Missing $path"
  }
}

$customizableUiPath = Join-Path $ZenRoot "src\zen\common\sys\ZenCustomizableUI.sys.mjs"
if (Test-Path -LiteralPath $customizableUiPath) {
  $customizableUi = Get-Content -LiteralPath $customizableUiPath -Raw
  $surfaceButtons = @(
    "zen-drama-graph-sidebar-button",
    "zen-drama-plm-sidebar-button",
    "zen-drama-crew-sidebar-button"
  )
  $missingSurfaceButtons = @($surfaceButtons | Where-Object { $customizableUi -notmatch [regex]::Escape("`"$_`"") })
  if ($missingSurfaceButtons.Count -eq 0) {
    Add-DramaCheck "Zen sidebar default placement" "PASS" "Graph/PLM/Crew are in defaultSidebarIcons"
  } else {
    Add-DramaCheck "Zen sidebar default placement" "FAIL" "Missing defaultSidebarIcons entries: $($missingSurfaceButtons -join ', ')"
  }
}

$sidebarIconsPath = Join-Path $ZenRoot "src\browser\base\content\zen-sidebar-icons.inc.xhtml"
if (Test-Path -LiteralPath $sidebarIconsPath) {
  $sidebarIcons = Get-Content -LiteralPath $sidebarIconsPath -Raw
  $requiredSidebarIcons = @(
    'id="zen-drama-graph-sidebar-button".*chrome://browser/content/zen-icons/drama-graph\.svg',
    'id="zen-drama-plm-sidebar-button".*chrome://browser/content/zen-icons/drama-plm\.svg',
    'id="zen-drama-crew-sidebar-button".*chrome://browser/content/zen-icons/drama-crew\.svg'
  )
  $missingSidebarIcons = @($requiredSidebarIcons | Where-Object { $sidebarIcons -notmatch $_ })
  if ($missingSidebarIcons.Count -eq 0) {
    Add-DramaCheck "Zen Drama sidebar icons" "PASS" "Graph/PLM/Crew use packaged chrome icons"
  } else {
    Add-DramaCheck "Zen Drama sidebar icons" "FAIL" "Graph/PLM/Crew sidebar button/icon wiring is incomplete"
  }
}

$dramaJarPath = Join-Path $ZenRoot "src\zen\drama\jar.inc.mn"
if (Test-Path -LiteralPath $dramaJarPath) {
  $dramaJar = Get-Content -LiteralPath $dramaJarPath -Raw
  $requiredJarIcons = @(
    'content/browser/zen-icons/drama\.svg',
    'content/browser/zen-icons/drama-graph\.svg',
    'content/browser/zen-icons/drama-plm\.svg',
    'content/browser/zen-icons/drama-crew\.svg'
  )
  $missingJarIcons = @($requiredJarIcons | Where-Object { $dramaJar -notmatch $_ })
  if ($missingJarIcons.Count -eq 0) {
    Add-DramaCheck "Zen Drama icon package mapping" "PASS" "Drama and Graph/PLM/Crew icons are packaged into browser content"
  } else {
    Add-DramaCheck "Zen Drama icon package mapping" "FAIL" "Missing jar mappings for: $($missingJarIcons -join ', ')"
  }
}

$zenGlobalsPath = Join-Path $ZenRoot "src\zen\zen.globals.mjs"
if (Test-Path -LiteralPath $zenGlobalsPath) {
  $zenGlobals = Get-Content -LiteralPath $zenGlobalsPath -Raw
  if ($zenGlobals -match '"gZenDramaManager"') {
    Add-DramaCheck "Zen Drama global" "PASS" "gZenDramaManager registered"
  } else {
    Add-DramaCheck "Zen Drama global" "WARN" "Add gZenDramaManager to src\zen\zen.globals.mjs for lint/build hygiene"
  }
}

$managerPath = Join-Path $ZenRoot "src\zen\drama\ZenDramaManager.mjs"
if (Test-Path -LiteralPath $managerPath) {
  $node = Test-CommandPath -Command "node"
  if ($node) {
    Push-Location $ZenRoot
    try {
      $syntaxOutput = & $node --check $managerPath 2>&1
      if ($LASTEXITCODE -eq 0) {
        Add-DramaCheck "ZenDramaManager syntax" "PASS" "node --check passed"
      } else {
        Add-DramaCheck "ZenDramaManager syntax" "FAIL" ($syntaxOutput -join "`n")
      }
    } finally {
      Pop-Location
    }
  } else {
    Add-DramaCheck "ZenDramaManager syntax" "WARN" "node not found in PATH"
  }
}

$machPath = Join-Path $ZenRoot "engine\mach"
$mozconfigPath = Join-Path $ZenRoot "engine\mozconfig"
if (Test-Path -LiteralPath $machPath) {
  Add-DramaCheck "Zen Firefox engine" "PASS" $machPath
} else {
  Add-DramaCheck "Zen Firefox engine" "FAIL" "Missing engine\mach. Run in Zen repo: npm run download"
}

if (Test-Path -LiteralPath $mozconfigPath) {
  Add-DramaCheck "Zen mozconfig" "PASS" $mozconfigPath
} else {
  Add-DramaCheck "Zen mozconfig" "WARN" "Missing engine\mozconfig. Run in Zen repo: npm run build:ui -- --skip-patch-check"
}

$sevenZip = Test-CommandPath -Command "7z" -FallbackPaths @("C:\Program Files\7-Zip\7z.exe", "C:\Program Files (x86)\7-Zip\7z.exe")
if ($sevenZip) {
  Add-DramaCheck "7-Zip" "PASS" $sevenZip
} else {
  Add-DramaCheck "7-Zip" "FAIL" "7z not found. Install 7-Zip or add it to PATH before Zen download/build."
}

$mozillaBuildCandidates = @()
if ($env:MOZILLABUILD) {
  $mozillaBuildCandidates += $env:MOZILLABUILD
}
$mozillaBuildCandidates += @(
  "C:\mozilla-build",
  "C:\MozillaBuild",
  (Join-Path $env:USERPROFILE "Downloads\mozilla-build-4.2.1")
)
$mozillaBuild = Test-AnyPath -Paths $mozillaBuildCandidates
if ($mozillaBuild) {
  Add-DramaCheck "MozillaBuild" "PASS" $mozillaBuild
  $mozillaBuildTmp = Join-Path $mozillaBuild "msys2\tmp"
  if (Test-Path -LiteralPath $mozillaBuildTmp) {
    Add-DramaCheck "MozillaBuild msys2 tmp" "PASS" $mozillaBuildTmp
  } else {
    Add-DramaCheck "MozillaBuild msys2 tmp" "WARN" "Create directory before mach: $mozillaBuildTmp"
  }
} else {
  Add-DramaCheck "MozillaBuild" "FAIL" "Missing MozillaBuild. Install it at C:\mozilla-build or set MOZILLABUILD."
}

$clangCandidates = @(
  (Join-Path $env:USERPROFILE ".mozbuild\clang\bin\clang-cl.exe")
)
$clang = Test-AnyPath -Paths $clangCandidates
if ($clang) {
  Add-DramaCheck "Mozilla clang-cl" "PASS" $clang
} else {
  Add-DramaCheck "Mozilla clang-cl" "WARN" "Run mach bootstrap --application-choice browser --no-system-changes from the Zen engine directory."
}

$builtZenCandidates = @(
  (Join-Path $ShortZenRoot "engine\obj-x86_64-pc-windows-msvc\dist\bin\zen.exe"),
  (Join-Path $ZenRoot "engine\obj-x86_64-pc-windows-msvc\dist\bin\zen.exe")
)
$builtZen = Test-AnyPath -Paths $builtZenCandidates
if ($builtZen) {
  Add-DramaCheck "Built Zen executable" "PASS" $builtZen
} else {
  Add-DramaCheck "Built Zen executable" "WARN" "Run full Zen build once: npm run build -- --skip-patch-check"
}

$checks | Format-Table -AutoSize

$failures = @($checks | Where-Object { $_.Status -eq "FAIL" })
if ($failures.Count -gt 0) {
  Write-Host ""
  Write-Host "Zen Drama embedding check failed with $($failures.Count) blocking item(s)." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Zen Drama embedding check passed." -ForegroundColor Green
