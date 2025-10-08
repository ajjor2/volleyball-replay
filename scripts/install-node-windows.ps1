<#
  install-node-windows.ps1

  Interactive helper to install Node.js (LTS) on Windows and a useful dev tool (nodemon).
  - Tries winget first if available
  - Falls back to Chocolatey if available
  - Otherwise prints manual install instructions

  Usage (PowerShell as admin recommended):
    PS> .\scripts\install-node-windows.ps1

  The script will prompt before performing installs.
#>

function Is-Admin {
function Test-IsAdmin {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

Write-Host "Node.js install helper for Windows" -ForegroundColor Cyan
if (-not (Test-IsAdmin)) {
    Write-Warning "This script is not running as Administrator. Some installers (winget/choco) may require elevation. Consider running PowerShell as Administrator."
}

function Cmd-Exists($cmd) {
function Test-CommandExists($cmd) {
    return $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

Write-Host "Checking for existing Node installation..." -NoNewline
if (Cmd-Exists node) {
    $nodeVer = (& node -v) 2>$null
    Write-Host " found: $nodeVer" -ForegroundColor Green
} else {
    Write-Host " not found." -ForegroundColor Yellow
    # Try winget
    if (Test-CommandExists winget) {
        Write-Host "winget is available. Will use winget to install Node.js LTS." -ForegroundColor Cyan
        if ((Read-Host 'Proceed with winget install OpenJS.NodeJS.LTS? (Y/n)') -match '^[Nn]') { Write-Host 'Skipping winget install.'; }
        else {
            Write-Host 'Installing Node.js LTS via winget... (may require elevation)';
            winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
        }
    } elseif (Cmd-Exists choco) {
        Write-Host "Chocolatey is available. Will use choco to install nodejs-lts." -ForegroundColor Cyan
        if ((Read-Host 'Proceed with choco install nodejs-lts? (Y/n)') -match '^[Nn]') { Write-Host 'Skipping choco install.'; }
        else {
            Write-Host 'Installing Node.js LTS via Chocolatey... (may require elevation)';
            choco install nodejs-lts -y
        }
    } else {
        Write-Warning "No winget or Chocolatey detected. Please install Node.js LTS manually from https://nodejs.org/"
        Write-Host "After installing Node.js, re-run this script to install nodemon and verify installation." -ForegroundColor Cyan
    }
}

Write-Host "Verifying node/npm availability..." -NoNewline
Start-Sleep -Seconds 1
if (Test-CommandExists node) {
    $nodeVer = (& node -v) 2>$null
    $npmVer = (& npm -v) 2>$null
    Write-Host " node: $nodeVer, npm: $npmVer" -ForegroundColor Green
    if ((Read-Host 'Install nodemon globally (useful for development)? (Y/n)') -notmatch '^[Nn]') {
        Write-Host 'Installing nodemon globally via npm...';
        npm install -g nodemon
    }
    Write-Host "Installation checks complete." -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1) In repo root run: npm install  (no extra deps in this project, optional)"
    Write-Host "  2) Start the local server: npm start"
    Write-Host "  3) Open http://localhost:3000/ in your browser"
    Write-Host "  4) Run tests: npm test"
} else {
    Write-Host "Node still not available. Please install Node.js LTS from https://nodejs.org/ and re-run this script." -ForegroundColor Red
}
