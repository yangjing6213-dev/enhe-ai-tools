param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$ReleaseRef,
  [string]$ServerHost = "111.229.135.3",
  [string]$ServerUser = "ubuntu",
  [int]$SshPort = 22,
  [string]$SshKeyPath = "",
  [ValidatePattern('^[A-Za-z0-9._/-]+$')]
  [string]$RemoteProjectDir = "/opt/enhe-ai-tools",
  [ValidatePattern('^[A-Za-z0-9._/-]+$')]
  [string]$Branch = "main",
  [string]$TestDatabaseUrl = $env:SEO_AUDIT_TEST_DATABASE_URL,
  [switch]$NoDeploy
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [string[]]$Arguments = @()
  )

  Write-Host ""
  Write-Host ">>> $FilePath $($Arguments -join ' ')" -ForegroundColor Cyan
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath"
  }
}

function Assert-RequiredCommand {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Resolve-SshKey {
  param([string]$Path)

  $candidate = if ($Path) {
    $Path
  } else {
    Join-Path $HOME ".ssh\enhe-ai-tools-tencent.pem"
  }
  if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
    throw "SSH key not found. Provide -SshKeyPath with a private key file."
  }
  return (Resolve-Path -LiteralPath $candidate).Path
}

function Assert-LocalTestDatabaseUrl {
  param([string]$Url)

  if ([string]::IsNullOrWhiteSpace($Url)) {
    throw "SEO_AUDIT_TEST_DATABASE_URL is required so PostgreSQL tests cannot be skipped."
  }
  try {
    $uri = [System.Uri]$Url
  } catch {
    throw "SEO_AUDIT_TEST_DATABASE_URL must be a valid PostgreSQL URL."
  }
  if (
    $uri.Scheme -notin @("postgres", "postgresql") -or
    $uri.Host -notin @("localhost", "127.0.0.1") -or
    [string]::IsNullOrWhiteSpace($uri.AbsolutePath.Trim("/"))
  ) {
    throw "SEO_AUDIT_TEST_DATABASE_URL must target an explicit local PostgreSQL database."
  }
}

Assert-RequiredCommand git
Assert-RequiredCommand npm
Assert-RequiredCommand ssh
Assert-LocalTestDatabaseUrl $TestDatabaseUrl

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$worktreeStatus = & git status --porcelain
if ($LASTEXITCODE -ne 0) {
  throw "Unable to inspect the Git worktree."
}
if ($worktreeStatus) {
  throw "The Git worktree must be clean before release."
}

$resolvedRef = (& git rev-parse "$ReleaseRef^{commit}").Trim()
$headRef = (& git rev-parse HEAD).Trim()
if (
  -not $resolvedRef.Equals($ReleaseRef, [System.StringComparison]::OrdinalIgnoreCase) -or
  -not $headRef.Equals($ReleaseRef, [System.StringComparison]::OrdinalIgnoreCase)
) {
  throw "ReleaseRef must identify the current HEAD commit."
}

$env:SEO_AUDIT_TEST_DATABASE_URL = $TestDatabaseUrl
$env:DATABASE_URL = $TestDatabaseUrl
Invoke-Native -FilePath npm -Arguments @("test")
Invoke-Native -FilePath npm -Arguments @("run", "typecheck")
Invoke-Native -FilePath npm -Arguments @("run", "lint")
Invoke-Native -FilePath npm -Arguments @("run", "build")

$worktreeStatus = & git status --porcelain
if ($LASTEXITCODE -ne 0 -or $worktreeStatus) {
  throw "Checks changed the worktree; refusing to release an unreproducible ref."
}

Invoke-Native -FilePath git -Arguments @("push", "origin", "${ReleaseRef}:refs/heads/$Branch")

if ($NoDeploy) {
  Write-Host "Release ref pushed; remote deployment was not requested." -ForegroundColor Yellow
  exit 0
}

$resolvedKey = Resolve-SshKey $SshKeyPath
$remoteCommand = "set -eu; cd '$RemoteProjectDir'; git diff --quiet; git diff --cached --quiet; git fetch --depth=1 origin '$Branch'; test `"`$(git rev-parse FETCH_HEAD)`" = '$ReleaseRef'; git checkout --detach '$ReleaseRef'; chmod +x deploy.sh deploy/enhe-ai-tools/scripts/*.sh; RELEASE_REF='$ReleaseRef' ./deploy.sh"

Invoke-Native -FilePath ssh -Arguments @(
  "-i", $resolvedKey,
  "-p", "$SshPort",
  "-o", "StrictHostKeyChecking=accept-new",
  "$ServerUser@$ServerHost",
  $remoteCommand
)

Write-Host "Release workflow completed for $ReleaseRef." -ForegroundColor Green
