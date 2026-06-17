param(
  [string]$ShortcutPath = (Join-Path ([Environment]::GetFolderPath("Desktop")) "Drama.lnk"),
  [ValidateSet("graph", "plm", "crew")]
  [string]$Surface = "graph"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot "launch-drama.ps1"
$iconCandidates = @(
  (Join-Path $repoRoot "apps\electron\resources\drama-icon.ico"),
  (Join-Path $repoRoot "apps\electron\resources\drama-tray.ico")
)
$icon = $iconCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not (Test-Path -LiteralPath $launcher)) {
  throw "Drama launcher not found: $launcher"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`" -Surface $Surface"
$shortcut.WorkingDirectory = $repoRoot
$shortcut.WindowStyle = 7
$shortcut.Description = "Drama Zen Browser main path"
if ($icon) {
  $shortcut.IconLocation = "$icon,0"
}
$shortcut.Save()

Write-Host "Installed Drama shortcut." -ForegroundColor Green
Write-Host "Shortcut: $ShortcutPath"
Write-Host "Target: powershell.exe $($shortcut.Arguments)"
Write-Host "WorkingDirectory: $repoRoot"
