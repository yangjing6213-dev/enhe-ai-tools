param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$ReleaseRef,
  [string]$ServerHost = "111.229.135.3",
  [ValidatePattern('\A[A-Za-z_][A-Za-z0-9._-]*\z')]
  [string]$ServerUser = "ubuntu",
  [ValidateRange(1, 65535)]
  [int]$SshPort = 22,
  [string]$SshKeyPath = "",
  [ValidatePattern('^[A-Za-z0-9._/-]+$')]
  [string]$RemoteProjectDir = "/opt/enhe-ai-tools",
  [ValidatePattern('^[A-Za-z0-9._/-]+$')]
  [Parameter(Mandatory = $true)]
    [ValidatePattern('\A[A-Za-z0-9_][A-Za-z0-9._/-]*\z')]
  [string]$Branch,
  [string]$TestDatabaseUrl = $env:SEO_AUDIT_TEST_DATABASE_URL,
  [ValidateRange(1024, 65535)]
  [int]$E2ePort = 3107,
  [switch]$Push,
  [switch]$Deploy,
  [switch]$AllowDatabaseMutatingVitest,
  [switch]$AllowDatabaseMutatingE2E,
  [switch]$NoDeploy
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($Deploy -and $NoDeploy) {
  throw "Use either -Deploy or -NoDeploy, not both."
}
if ($Deploy -and -not $Push) {
  throw "-Deploy requires -Push so the server receives the explicitly pushed release ref."
}
if ($NoDeploy -and -not $Push) {
  throw "-NoDeploy is only valid with -Push. Omit it for local-only checks."
}
$pushRequested = [bool]$Push
$deployRequested = [bool]$Deploy
$databaseMutationRequested = $AllowDatabaseMutatingVitest -or $AllowDatabaseMutatingE2E

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
  $databaseName = [System.Uri]::UnescapeDataString($uri.AbsolutePath.Trim("/"))
  if (
    $uri.Scheme -notin @("postgres", "postgresql") -or
    $uri.Host -notin @("localhost", "127.0.0.1") -or
    [string]::IsNullOrWhiteSpace($databaseName)
  ) {
    throw "SEO_AUDIT_TEST_DATABASE_URL must target an explicit local PostgreSQL database."
  }
  if ($databaseName -match '(?:^|[_-])(prod|production|live)(?:[_-]|$)') {
    throw "SEO_AUDIT_TEST_DATABASE_URL must not use a database name marked prod, production, or live."
  }
  if ($databaseName -notmatch '(?:^|[_-])(test|e2e)(?:[_-]|$)') {
    throw "SEO_AUDIT_TEST_DATABASE_URL must use a dedicated local test database whose name contains a test or e2e marker."
  }
}

function Assert-LocalDockerContext {
  if (-not [string]::IsNullOrWhiteSpace($env:DOCKER_HOST)) {
    throw "DOCKER_HOST overrides are not allowed for release checks; use a local Docker context without this override."
  }

  $dockerContext = (& docker context show).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($dockerContext)) {
    throw "Unable to inspect the active Docker context."
  }

  $dockerEndpoint = (& docker context inspect $dockerContext --format '{{.Endpoints.docker.Host}}').Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($dockerEndpoint)) {
    throw "Unable to inspect the active Docker endpoint."
  }
  $localDockerEndpointPattern = '^(?:unix:///(?!/).+|npipe:////\./pipe/(?:docker_engine|dockerDesktopLinuxEngine)|npipe://\./pipe/(?:docker_engine|dockerDesktopLinuxEngine))$'
  if ($dockerEndpoint -notmatch $localDockerEndpointPattern) {
    throw "Docker endpoint must be a local named pipe or Unix socket; remote Docker contexts are not allowed."
  }
}

Assert-RequiredCommand git
Assert-RequiredCommand npm
Assert-RequiredCommand node
Assert-RequiredCommand docker
Assert-LocalDockerContext
if ($deployRequested) {
  Assert-RequiredCommand ssh
}
if ($databaseMutationRequested) {
  Assert-LocalTestDatabaseUrl $TestDatabaseUrl
}

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

& git check-ref-format --branch $Branch
if ($LASTEXITCODE -ne 0) {
  throw "Branch must be a valid Git branch name before any remote refresh."
}

if ($pushRequested) {
  Invoke-Native -FilePath git -Arguments @(
    "fetch",
    "--no-tags",
    "origin",
    "refs/heads/${Branch}:refs/remotes/origin/${Branch}"
  )
}
& git show-ref --verify --quiet "refs/remotes/origin/$Branch"
if ($LASTEXITCODE -ne 0) {
  throw "Cached origin/$Branch is required for the migration check. Use -Push only when a remote refresh and GitHub push are intended."
}
& git merge-base --is-ancestor "origin/$Branch" $ReleaseRef
if ($LASTEXITCODE -ne 0) {
  throw "ReleaseRef must descend from the current origin/$Branch before release."
}

Invoke-Native -FilePath npm -Arguments @("audit", "--include=dev", "--include=optional", "--include=peer", "--audit-level=high", "--registry=https://registry.npmjs.org")

Invoke-Native -FilePath node -Arguments @("scripts/test-migration-paths.mjs", $Branch)
$releaseShellMount = "type=bind,source=$repoRoot,target=/repo,readonly"
Invoke-Native -FilePath docker -Arguments @(
  "run", "--rm", "--pull=never",
  "--mount", $releaseShellMount,
  "postgres:16-alpine",
  "sh", "/repo/scripts/test-release-shell-behavior.sh", "/repo"
)

$previousSeoAuditTestDatabaseUrl = $env:SEO_AUDIT_TEST_DATABASE_URL
$previousDatabaseUrl = $env:DATABASE_URL
$previousDirectUrl = $env:DIRECT_URL
$previousNextTelemetryDisabled = $env:NEXT_TELEMETRY_DISABLED
$previousAdminVisualFixture = $env:ENHE_ADMIN_VISUAL_FIXTURE
$releaseCheckDatabaseUrl = "postgresql://127.0.0.1:1/enhe-release-check?connect_timeout=1"
$previousPlaywrightProduction = $env:PLAYWRIGHT_USE_PRODUCTION_SERVER
$previousPlaywrightBaseUrl = $env:PLAYWRIGHT_BASE_URL
$previousPort = $env:PORT
$previousHostname = $env:HOSTNAME
$previousAuthSecret = $env:AUTH_SECRET
$previousAppUrl = $env:APP_URL
$previousPublicAppUrl = $env:NEXT_PUBLIC_APP_URL
$previousPublicSiteUrl = $env:NEXT_PUBLIC_SITE_URL
$previousZpayMode = $env:ZPAY_MODE
$previousMonitoringSales = $env:SEO_AUDIT_MONITORING_SALES_ENABLED
$previousAllowDatabaseMutations = $env:ENHE_E2E_ALLOW_DATABASE_MUTATION
try {
  $env:SEO_AUDIT_TEST_DATABASE_URL = $null
  $env:DATABASE_URL = $null
  $env:DIRECT_URL = $null
  $env:NEXT_TELEMETRY_DISABLED = "1"
  if ($AllowDatabaseMutatingVitest) {
    $env:SEO_AUDIT_TEST_DATABASE_URL = $TestDatabaseUrl
    $env:DATABASE_URL = $TestDatabaseUrl
  }
  Invoke-Native -FilePath npm -Arguments @("test")
  $env:SEO_AUDIT_TEST_DATABASE_URL = $null
  $env:DATABASE_URL = $null
  $env:DIRECT_URL = $null
  Invoke-Native -FilePath npm -Arguments @("run", "typecheck")
  Invoke-Native -FilePath npm -Arguments @("run", "lint")
  $env:DATABASE_URL = $releaseCheckDatabaseUrl
  $env:DIRECT_URL = $releaseCheckDatabaseUrl
  Invoke-Native -FilePath npm -Arguments @("run", "build")
  $env:DATABASE_URL = $null
  $env:DIRECT_URL = $null

  $localBaseUrl = "http://127.0.0.1:$E2ePort"
  $env:PLAYWRIGHT_USE_PRODUCTION_SERVER = "1"
  $env:PLAYWRIGHT_BASE_URL = $localBaseUrl
  $env:PORT = "$E2ePort"
  $env:HOSTNAME = "127.0.0.1"
  $env:AUTH_SECRET = "enhe-release-e2e-secret-2026-07-31"
  $env:APP_URL = $localBaseUrl
  $env:NEXT_PUBLIC_APP_URL = $localBaseUrl
  $env:NEXT_PUBLIC_SITE_URL = $localBaseUrl
  $env:ZPAY_MODE = "disabled"
  $env:SEO_AUDIT_MONITORING_SALES_ENABLED = "false"
  if ($AllowDatabaseMutatingE2E) {
    $env:SEO_AUDIT_TEST_DATABASE_URL = $TestDatabaseUrl
    $env:DATABASE_URL = $TestDatabaseUrl
    $env:ENHE_E2E_ALLOW_DATABASE_MUTATION = "1"
  } else {
    $env:SEO_AUDIT_TEST_DATABASE_URL = $null
    $env:DATABASE_URL = $null
    $env:DIRECT_URL = $null
    $env:ENHE_E2E_ALLOW_DATABASE_MUTATION = $null
  }
  $env:ENHE_ADMIN_VISUAL_FIXTURE = $null
  Invoke-Native -FilePath npm -Arguments @("run", "test:e2e")
} finally {
  $env:PLAYWRIGHT_USE_PRODUCTION_SERVER = $previousPlaywrightProduction
  $env:PLAYWRIGHT_BASE_URL = $previousPlaywrightBaseUrl
  $env:PORT = $previousPort
  $env:HOSTNAME = $previousHostname
  $env:AUTH_SECRET = $previousAuthSecret
  $env:APP_URL = $previousAppUrl
  $env:NEXT_PUBLIC_APP_URL = $previousPublicAppUrl
  $env:NEXT_PUBLIC_SITE_URL = $previousPublicSiteUrl
  $env:ZPAY_MODE = $previousZpayMode
  $env:SEO_AUDIT_MONITORING_SALES_ENABLED = $previousMonitoringSales
  $env:ENHE_E2E_ALLOW_DATABASE_MUTATION = $previousAllowDatabaseMutations
  $env:DATABASE_URL = $previousDatabaseUrl
  $env:DIRECT_URL = $previousDirectUrl
  $env:NEXT_TELEMETRY_DISABLED = $previousNextTelemetryDisabled
  $env:ENHE_ADMIN_VISUAL_FIXTURE = $previousAdminVisualFixture
  $env:SEO_AUDIT_TEST_DATABASE_URL = $previousSeoAuditTestDatabaseUrl
}

$worktreeStatus = & git status --porcelain --untracked-files=all
if ($LASTEXITCODE -ne 0 -or $worktreeStatus) {
  throw "Checks changed the worktree; refusing to release an unreproducible ref."
}

$resolvedKey = ""
$remoteLockFile = "$RemoteProjectDir/deploy/enhe-ai-tools/runtime/enhe-operation.lock"
if ($deployRequested) {
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

if (-not $pushRequested) {
  Write-Host "Local release checks completed; fetch, push, and deployment were not requested." -ForegroundColor Yellow
  exit 0
}

if ($pushRequested) {
  Invoke-Native -FilePath git -Arguments @("push", "origin", "${ReleaseRef}:refs/heads/$Branch")
}

if (-not $deployRequested) {
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
