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
  [ValidateRange(1024, 65535)]
  [int]$E2ePort = 3107,
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
Assert-RequiredCommand node
Assert-RequiredCommand docker
Assert-RequiredCommand ssh
Assert-LocalTestDatabaseUrl $TestDatabaseUrl

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$worktreeStatus = & git status --porcelain --untracked-files=all
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
$ReleaseRef = $resolvedRef.ToLowerInvariant()

Invoke-Native -FilePath git -Arguments @("fetch", "origin", $Branch)
& git merge-base --is-ancestor "origin/$Branch" $ReleaseRef
if ($LASTEXITCODE -ne 0) {
  throw "ReleaseRef must descend from the current origin/$Branch before release."
}

Invoke-Native -FilePath node -Arguments @("scripts/test-migration-paths.mjs")
$releaseShellMount = "type=bind,source=$repoRoot,target=/repo,readonly"
Invoke-Native -FilePath docker -Arguments @(
  "run", "--rm",
  "--mount", $releaseShellMount,
  "postgres:16-alpine",
  "sh", "/repo/scripts/test-release-shell-behavior.sh", "/repo"
)

$env:SEO_AUDIT_TEST_DATABASE_URL = $TestDatabaseUrl
$env:DATABASE_URL = $TestDatabaseUrl
Invoke-Native -FilePath npm -Arguments @("test")
Invoke-Native -FilePath npm -Arguments @("run", "typecheck")
Invoke-Native -FilePath npm -Arguments @("run", "lint")
Invoke-Native -FilePath npm -Arguments @("run", "build")

$previousPlaywrightProduction = $env:PLAYWRIGHT_USE_PRODUCTION_SERVER
$previousPlaywrightBaseUrl = $env:PLAYWRIGHT_BASE_URL
$previousPort = $env:PORT
$previousAuthSecret = $env:AUTH_SECRET
$previousAppUrl = $env:APP_URL
$previousPublicAppUrl = $env:NEXT_PUBLIC_APP_URL
$previousPublicSiteUrl = $env:NEXT_PUBLIC_SITE_URL
$previousZpayMode = $env:ZPAY_MODE
$previousMonitoringSales = $env:SEO_AUDIT_MONITORING_SALES_ENABLED
try {
  $localBaseUrl = "http://localhost:$E2ePort"
  $env:PLAYWRIGHT_USE_PRODUCTION_SERVER = "1"
  $env:PLAYWRIGHT_BASE_URL = $localBaseUrl
  $env:PORT = "$E2ePort"
  $env:AUTH_SECRET = "enhe-release-e2e-secret-2026-07-31"
  $env:APP_URL = $localBaseUrl
  $env:NEXT_PUBLIC_APP_URL = $localBaseUrl
  $env:NEXT_PUBLIC_SITE_URL = $localBaseUrl
  $env:ZPAY_MODE = "disabled"
  $env:SEO_AUDIT_MONITORING_SALES_ENABLED = "false"
  Invoke-Native -FilePath npm -Arguments @("run", "test:e2e")
} finally {
  $env:PLAYWRIGHT_USE_PRODUCTION_SERVER = $previousPlaywrightProduction
  $env:PLAYWRIGHT_BASE_URL = $previousPlaywrightBaseUrl
  $env:PORT = $previousPort
  $env:AUTH_SECRET = $previousAuthSecret
  $env:APP_URL = $previousAppUrl
  $env:NEXT_PUBLIC_APP_URL = $previousPublicAppUrl
  $env:NEXT_PUBLIC_SITE_URL = $previousPublicSiteUrl
  $env:ZPAY_MODE = $previousZpayMode
  $env:SEO_AUDIT_MONITORING_SALES_ENABLED = $previousMonitoringSales
}

$worktreeStatus = & git status --porcelain --untracked-files=all
if ($LASTEXITCODE -ne 0 -or $worktreeStatus) {
  throw "Checks changed the worktree; refusing to release an unreproducible ref."
}

$resolvedKey = ""
$remoteLockFile = "$RemoteProjectDir/deploy/enhe-ai-tools/runtime/enhe-operation.lock"
if (-not $NoDeploy) {
  $resolvedKey = Resolve-SshKey $SshKeyPath
  $prePushRemoteCommand = @(
    "set -eu"
    "remote_lock_file='$remoteLockFile'"
    'mkdir -p "$(dirname "$remote_lock_file")"'
    'remote_lock_dir="$(cd "$(dirname "$remote_lock_file")" && pwd -P)"'
    'remote_lock_file="$remote_lock_dir/$(basename "$remote_lock_file")"'
    'exec 9>"$remote_lock_file"'
    'if ! flock -n 9; then echo "Another ENHE production operation is running." >&2; exit 75; fi'
    'export ENHE_OPERATION_LOCK_HELD=1'
    'export ENHE_OPERATION_LOCK_FILE="$remote_lock_file"'
    "cd '$RemoteProjectDir'"
    'test -z "$(git status --porcelain --untracked-files=all)"'
  ) -join "; "

  Invoke-Native -FilePath ssh -Arguments @(
    "-i", $resolvedKey,
    "-p", "$SshPort",
    "-o", "StrictHostKeyChecking=accept-new",
    "$ServerUser@$ServerHost",
    $prePushRemoteCommand
  )
}

Invoke-Native -FilePath git -Arguments @("push", "origin", "${ReleaseRef}:refs/heads/$Branch")

if ($NoDeploy) {
  Write-Host "Release ref pushed; remote deployment was not requested." -ForegroundColor Yellow
  exit 0
}

$remoteCommand = @(
  "set -eu"
  "remote_lock_file='$remoteLockFile'"
  'mkdir -p "$(dirname "$remote_lock_file")"'
  'remote_lock_dir="$(cd "$(dirname "$remote_lock_file")" && pwd -P)"'
  'remote_lock_file="$remote_lock_dir/$(basename "$remote_lock_file")"'
  'exec 9>"$remote_lock_file"'
  'if ! flock -n 9; then echo "Another ENHE production operation is running." >&2; exit 75; fi'
  'export ENHE_OPERATION_LOCK_HELD=1'
  'export ENHE_OPERATION_LOCK_FILE="$remote_lock_file"'
  "cd '$RemoteProjectDir'"
  'test -z "$(git status --porcelain --untracked-files=all)"'
  'previous_release_ref="$(git rev-parse HEAD)"'
  "git fetch --depth=1 origin '$Branch'"
  "test `"`$(git rev-parse FETCH_HEAD)`" = '$ReleaseRef'"
  "git checkout --detach '$ReleaseRef'"
  "PREVIOUS_RELEASE_REF=`"`$previous_release_ref`" RELEASE_REF='$ReleaseRef' sh ./deploy.sh"
) -join "; "

Invoke-Native -FilePath ssh -Arguments @(
  "-i", $resolvedKey,
  "-p", "$SshPort",
  "-o", "StrictHostKeyChecking=accept-new",
  "$ServerUser@$ServerHost",
  $remoteCommand
)

Write-Host "Release workflow completed for $ReleaseRef." -ForegroundColor Green
