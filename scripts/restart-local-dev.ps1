param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" }

foreach ($connection in $connections) {
  $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
  if ($process -and $process.ProcessName -eq "node") {
    Write-Host "Stopping old Node process on port ${Port}: $($process.Id)" -ForegroundColor Yellow
    Stop-Process -Id $process.Id -Force
  }
}

$nextDir = Resolve-Path -LiteralPath ".next" -ErrorAction SilentlyContinue
if ($nextDir) {
  if (-not $nextDir.Path.StartsWith($repoRoot)) {
    throw "Refusing to remove .next outside repo: $($nextDir.Path)"
  }
  Write-Host "Removing stale .next cache..." -ForegroundColor Yellow
  Remove-Item -LiteralPath $nextDir.Path -Recurse -Force
}

Write-Host "Starting ENHE local dev server: http://127.0.0.1:${Port}" -ForegroundColor Green
npm run dev
