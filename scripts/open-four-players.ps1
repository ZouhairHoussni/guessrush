[CmdletBinding()]
param(
  [string]$BaseUrl = "http://localhost:8080",
  [string]$RoomCode = "",
  [string[]]$PlayerNames = @("Alice", "Bilal", "Amine", "Badr"),
  [int]$Width = 405,
  [int]$Height = 720,
  [int]$StartX = 0,
  [int]$StartY = 0,
  [int]$Gap = 8,
  [string]$BrowserPath = "",
  [switch]$Chrome,
  [switch]$Edge,
  [switch]$ResetProfiles,
  [switch]$AppMode,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Resolve-BrowserPath {
  if ($BrowserPath) {
    if (-not (Test-Path -LiteralPath $BrowserPath)) {
      throw "BrowserPath was provided but does not exist: $BrowserPath"
    }
    return (Resolve-Path -LiteralPath $BrowserPath).Path
  }

  $edgePaths = @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
  )
  $chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
  )

  if ($Chrome -and $Edge) {
    throw "Choose only one of -Chrome or -Edge."
  }

  $candidates = if ($Chrome) {
    $chromePaths
  } elseif ($Edge) {
    $edgePaths
  } else {
    $edgePaths + $chromePaths
  }

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  throw "Could not find Edge or Chrome. Pass -BrowserPath 'C:\Path\to\browser.exe'."
}

if ($PlayerNames.Count -ne 4) {
  throw "Pass exactly four player names, or omit -PlayerNames to use Alice, Bilal, Amine and Badr."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$profileRoot = Join-Path $repoRoot ".tmp\browser-players"
$resolvedProfileRoot = [System.IO.Path]::GetFullPath($profileRoot)
$allowedTempRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot ".tmp"))

if (-not $resolvedProfileRoot.StartsWith($allowedTempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to manage browser profiles outside the repo .tmp folder."
}

if ($ResetProfiles -and (Test-Path -LiteralPath $resolvedProfileRoot)) {
  Remove-Item -LiteralPath $resolvedProfileRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $resolvedProfileRoot -Force | Out-Null

$browser = Resolve-BrowserPath
$trimmedBaseUrl = $BaseUrl.TrimEnd("/")
$roomPath = if ($RoomCode.Trim()) { "/join/$($RoomCode.Trim().ToUpperInvariant())" } else { "/join" }
$targetUrl = "$trimmedBaseUrl$roomPath"

Write-Host "Opening four isolated player browsers:"
Write-Host "  Browser: $browser"
Write-Host "  URL:     $targetUrl"
Write-Host "  Size:    ${Width}x${Height}"
Write-Host "  Profiles: $resolvedProfileRoot"

for ($index = 0; $index -lt 4; $index += 1) {
  $playerNumber = $index + 1
  $profilePath = Join-Path $resolvedProfileRoot "player-$playerNumber"
  New-Item -ItemType Directory -Path $profilePath -Force | Out-Null

  $x = $StartX + ($index * ($Width + $Gap))
  $args = @(
    "--user-data-dir=$profilePath",
    "--window-size=$Width,$Height",
    "--window-position=$x,$StartY",
    "--no-first-run",
    "--disable-default-apps",
    "--hide-crash-restore-bubble",
    "--disable-session-crashed-bubble"
  )

  if ($AppMode) {
    $args += "--app=$targetUrl"
  } else {
    $args += "--new-window"
    $args += $targetUrl
  }

  if ($DryRun) {
    Write-Host "  Dry run command: $browser $($args -join ' ')"
  } else {
    Start-Process -FilePath $browser -ArgumentList $args
  }
  Write-Host "  Player $playerNumber -> $($PlayerNames[$index]) at x=$x"
  Start-Sleep -Milliseconds 250
}

Write-Host ""
Write-Host "Join each window with these names: $($PlayerNames -join ', ')"
Write-Host "Tip: use -ResetProfiles when you want fresh player tokens."
