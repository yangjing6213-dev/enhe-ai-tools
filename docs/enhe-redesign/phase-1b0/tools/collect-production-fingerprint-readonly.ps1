[CmdletBinding()]
param(
  [string]$SshAlias = "",
  [switch]$DocumentedAliasConfirmed,
  [string]$ProjectPath = "/opt/enhe-ai-tools",
  [string]$OutputPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($ProjectPath -ne "/opt/enhe-ai-tools") {
  throw "Only the documented production project path is permitted."
}

function Write-Result {
  param([string[]]$Lines)
  $Lines | ForEach-Object { Write-Output $_ }
  if ($OutputPath) {
    $parent = Split-Path -Parent $OutputPath
    if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    $Lines | Set-Content -LiteralPath $OutputPath -Encoding utf8
  }
}

if (-not $SshAlias -or -not $DocumentedAliasConfirmed) {
  Write-Result -Lines @(
    "PRODUCTION_ACCESS_STATUS=UNAVAILABLE",
    "PRODUCTION_FINGERPRINT_STATUS=BLOCKED",
    "REASON=NO_PRECONFIGURED_READONLY_ACCESS",
    "READONLY_COMMAND_FILE=collect-production-fingerprint-readonly.ps1",
    "SSH_ATTEMPTED=NO"
  )
  exit 0
}

if ($SshAlias -notmatch '^[A-Za-z0-9._-]+$') {
  throw "SshAlias must be a documented alias token; literal hosts and command text are refused."
}
$parsedAddress = $null
if ([Net.IPAddress]::TryParse($SshAlias, [ref]$parsedAddress)) {
  throw "SshAlias must not be an IP literal."
}

# Fixed, read-only command set. It never prints env, .env, inspect JSON,
# compose/nginx bodies, database URLs, or migration credentials.
$remoteCommand = @'
set -eu
project='/opt/enhe-ai-tools'
printf 'GIT_SHA=%s\n' "$(git -C "$project" rev-parse HEAD 2>/dev/null || printf UNKNOWN)"
if [ -d "$project/.git" ]; then
  if [ -z "$(git -C "$project" status --porcelain 2>/dev/null)" ]; then printf 'GIT_CLEAN=YES\n'; else printf 'GIT_CLEAN=NO\n'; fi
else
  printf 'GIT_CLEAN=UNKNOWN\n'
fi
container="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '(^|[-_])(enhe|app|web)([-_]|$)' | head -n 1 || true)"
if [ -n "$container" ]; then
  printf 'CONTAINER_NAME=%s\n' "$container"
  image_id="$(docker inspect --format '{{.Image}}' "$container" 2>/dev/null || true)"
  if [ -n "$image_id" ]; then
    printf 'IMAGE_ID=%s\n' "$image_id"
    docker image inspect --format 'REVISION_LABEL={{index .Config.Labels "org.opencontainers.image.revision"}}' "$image_id" 2>/dev/null || true
    docker image inspect --format 'IMAGE_CREATED_TIME={{.Created}}' "$image_id" 2>/dev/null || true
    digest="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$image_id" 2>/dev/null | sed -n 's/.*@//p' | head -n 1 || true)"
    if [ -n "$digest" ]; then printf 'IMAGE_DIGEST=%s\n' "$digest"; else printf 'IMAGE_DIGEST=UNKNOWN\n'; fi
  else
    printf 'IMAGE_ID=UNKNOWN\nIMAGE_DIGEST=UNKNOWN\nREVISION_LABEL=UNKNOWN\nIMAGE_CREATED_TIME=UNKNOWN\n'
  fi
else
  printf 'CONTAINER_NAME=UNKNOWN\nIMAGE_ID=UNKNOWN\nIMAGE_DIGEST=UNKNOWN\nREVISION_LABEL=UNKNOWN\nIMAGE_CREATED_TIME=UNKNOWN\n'
fi
if [ -f "$project/.next/BUILD_ID" ]; then printf 'NEXT_BUILD_ID=%s\n' "$(tr -d '\r\n' < "$project/.next/BUILD_ID")"; else printf 'NEXT_BUILD_ID=UNKNOWN\n'; fi
if [ -f "$project/.next/server/app-paths-manifest.json" ]; then sha256sum "$project/.next/server/app-paths-manifest.json" | awk '{print "APP_PATHS_MANIFEST_SHA256=" $1}'; else printf 'APP_PATHS_MANIFEST_SHA256=UNKNOWN\n'; fi
route_tmp="$(mktemp)"
find "$project/.next/server/app" -type f \( -name 'page.js' -o -name 'route.js' \) 2>/dev/null | sort > "$route_tmp" || true
printf 'ROUTE_KEY_COUNT=%s\n' "$(wc -l < "$route_tmp" | tr -d ' ')"
sha256sum "$route_tmp" | awk '{print "ROUTE_KEY_SET_SHA256=" $1}'
rm -f "$route_tmp"
for f in "$project/docker-compose.yml" "$project/docker-compose.prod.yml" "$project/compose.yml"; do
  if [ -f "$f" ]; then sha256sum "$f" | awk -v n="$(basename "$f")" '{print "COMPOSE_SHA256_" n "=" $1}'; fi
done
for f in /etc/nginx/sites-enabled/enhe-ai-tools.conf /etc/nginx/conf.d/enhe-ai-tools.conf; do
  if [ -f "$f" ]; then sha256sum "$f" | awk -v n="$(basename "$f")" '{print "NGINX_SHA256_" n "=" $1}'; fi
done
printf 'MIGRATION_STATUS=NOT_COLLECTED_NO_DATABASE_ACCESS\n'
'@

try {
  $raw = & ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=yes $SshAlias $remoteCommand 2>&1
  $exitCode = $LASTEXITCODE
} catch {
  $raw = @()
  $exitCode = 1
}

$allowed = @(
  'GIT_SHA=', 'GIT_CLEAN=', 'CONTAINER_NAME=', 'IMAGE_ID=', 'IMAGE_DIGEST=',
  'REVISION_LABEL=', 'IMAGE_CREATED_TIME=', 'NEXT_BUILD_ID=', 'APP_PATHS_MANIFEST_SHA256=',
  'ROUTE_KEY_COUNT=', 'ROUTE_KEY_SET_SHA256=', 'COMPOSE_SHA256_', 'NGINX_SHA256_',
  'MIGRATION_STATUS='
)
$safe = [System.Collections.Generic.List[string]]::new()
$safe.Add("SSH_ATTEMPTED=YES")
$safe.Add("SSH_EXIT_CODE=$exitCode")
foreach ($line in @($raw)) {
  $text = [string]$line
  if ($allowed | Where-Object { $text.StartsWith($_, [StringComparison]::Ordinal) }) {
    if ($text -match '(?i)https?://|postgres|password|secret|token|key=') { continue }
    $safe.Add($text.Trim())
  }
}
if ($exitCode -ne 0 -or -not ($safe -match '^GIT_SHA=')) {
  $safe.Insert(0, 'PRODUCTION_ACCESS_STATUS=UNAVAILABLE')
  $safe.Add('PRODUCTION_FINGERPRINT_STATUS=BLOCKED')
  $safe.Add('REASON=READONLY_SSH_COMMAND_FAILED')
} else {
  $safe.Insert(0, 'PRODUCTION_ACCESS_STATUS=AVAILABLE')
  $safe.Add('PRODUCTION_FINGERPRINT_STATUS=COLLECTED')
}
Write-Result -Lines $safe
