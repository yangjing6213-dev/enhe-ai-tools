[CmdletBinding()]
param(
  [string]$ConnectionSource = "scripts/push-and-deploy.ps1",
  [string]$SourceOutputPath = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b1\03-PRODUCTION-SOURCE-FILE-HASHES.csv")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (& git ls-files --error-unmatch -- $ConnectionSource 2>$null)) {
  throw "Connection source must be tracked."
}

$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile(
  (Resolve-Path -LiteralPath $ConnectionSource).Path,
  [ref]$tokens,
  [ref]$parseErrors
)
if ($parseErrors.Count) { throw "Tracked connection source does not parse." }

function Get-TrackedDefault {
  param([string]$Name)
  $parameter = $ast.ParamBlock.Parameters |
    Where-Object { $_.Name.VariablePath.UserPath -eq $Name } |
    Select-Object -First 1
  if (-not $parameter -or -not $parameter.DefaultValue) {
    throw "Required tracked connection default is missing."
  }
  return [string]$parameter.DefaultValue.SafeGetValue()
}

$resolver = $ast.FindAll({
    param($node)
    $node -is [Management.Automation.Language.FunctionDefinitionAst] -and
      $node.Name -eq "Resolve-SshKey"
  }, $true) | Select-Object -First 1
if (-not $resolver) { throw "Tracked key-path resolver is missing." }

# The tracked resolver performs path discovery only. It never reads key bytes.
Invoke-Expression $resolver.Extent.Text

$remoteTarget = Get-TrackedDefault -Name "ServerHost"
$remoteUser = Get-TrackedDefault -Name "ServerUser"
$remotePort = [int](Get-TrackedDefault -Name "SshPort")
$projectPath = Get-TrackedDefault -Name "RemoteProjectDir"
$identityPath = Resolve-SshKey -Path ""

if ($projectPath -ne "/opt/enhe-ai-tools") { throw "Unexpected production project path." }
if ($remoteTarget -match '(?i)staging|stage|test|dev|localhost' -or $remoteTarget -in @("127.0.0.1", "::1")) {
  throw "Non-production target refused."
}
if (-not $identityPath -or -not (Test-Path -LiteralPath $identityPath -PathType Leaf)) {
  throw "Tracked identity path is unavailable."
}

$sourceText = Get-Content -LiteralPath $ConnectionSource -Raw -Encoding UTF8
if ($sourceText -match '(?i)StrictHostKeyChecking\s*=\s*no|UserKnownHostsFile\s*=\s*/dev/null|password') {
  throw "Unsafe connection option found in tracked source."
}

$candidateMaterial = "{0}@{1}|{2}" -f $remoteUser, $remoteTarget, $identityPath
$candidateHasher = [Security.Cryptography.SHA256]::Create()
try {
  $candidateId = [BitConverter]::ToString(
    $candidateHasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($candidateMaterial))
  ).Replace("-", "")
} finally {
  $candidateHasher.Dispose()
}

$trafficPython = @'
import glob
import gzip
import os
import re
from collections import defaultdict
from datetime import datetime

paths = [
    "/online-tools", "/account-services", "/build-your-own-x",
    "/skill-learning/build-your-own-x", "/help", "/en/help",
    "/updates", "/en/updates", "/ai-topics", "/product-demos",
]
targets = set(paths)
files = [p for p in sorted(glob.glob("/var/log/nginx/access.log*")) if os.path.isfile(p) and os.access(p, os.R_OK)]
if not files:
    print("NGINX_LOG_AGGREGATION_STATUS=UNAVAILABLE")
    raise SystemExit(0)

request_re = re.compile(r'"[A-Z]+\s+(\S+)\s+HTTP/[^\"]+"\s+(\d{3})\b')
date_re = re.compile(r'\[([^\]]+)\]')
rows = defaultdict(lambda: [0, None, None])
for file_path in files:
    opener = gzip.open if file_path.endswith(".gz") else open
    try:
        handle = opener(file_path, "rt", encoding="utf-8", errors="ignore")
        with handle:
            for line in handle:
                request = request_re.search(line)
                if not request:
                    continue
                path = request.group(1).split("?", 1)[0]
                if path not in targets:
                    continue
                status = request.group(2)
                date_match = date_re.search(line)
                date_value = None
                if date_match:
                    try:
                        date_value = datetime.strptime(date_match.group(1).split()[0], "%d/%b/%Y:%H:%M:%S").date().isoformat()
                    except Exception:
                        pass
                item = rows[(path, status)]
                item[0] += 1
                if date_value:
                    item[1] = date_value if item[1] is None or date_value < item[1] else item[1]
                    item[2] = date_value if item[2] is None or date_value > item[2] else item[2]
    except Exception:
        continue

for path in paths:
    matched = False
    for (candidate, status), values in sorted(rows.items()):
        if candidate != path:
            continue
        matched = True
        print("TRAFFIC|{}|{}|{}|{}|{}|{}".format(path, status, values[0], values[1] or "", values[2] or "", len(files)))
    if not matched:
        print("TRAFFIC|{}||0|||{}".format(path, len(files)))
print("NGINX_LOG_AGGREGATION_STATUS=COLLECTED")
'@
$trafficPythonBase64 = [Convert]::ToBase64String(
  [Text.Encoding]::UTF8.GetBytes($trafficPython.Replace("`r`n", "`n"))
)

$remoteScript = @'
set -eu
project='/opt/enhe-ai-tools'
now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

printf 'PRODUCTION_READONLY_CONNECTION=PASS\n'
if [ ! -d "$project/.git" ]; then
  printf 'PRODUCTION_GIT_STATUS=MISSING\n'
  exit 0
fi

printf 'PRODUCTION_GIT_STATUS=FOUND\n'
printf 'GIT_SHA=%s\n' "$(git -C "$project" rev-parse HEAD 2>/dev/null || printf UNKNOWN)"
printf 'GIT_BRANCH=%s\n' "$(git -C "$project" branch --show-current 2>/dev/null || printf UNKNOWN)"
if [ -z "$(git -C "$project" status --porcelain 2>/dev/null)" ]; then
  printf 'GIT_CLEAN=YES\n'
else
  printf 'GIT_CLEAN=NO\n'
fi
printf 'GIT_LAST_COMMIT_TIME=%s\n' "$(git -C "$project" log -1 --format=%cI 2>/dev/null || printf UNKNOWN)"

emit_hash() {
  label="$1"
  file="$2"
  if [ -f "$file" ]; then
    printf 'CONFIG_HASH|%s|YES|%s\n' "$label" "$(sha256sum "$file" | awk '{print $1}')"
  else
    printf 'CONFIG_HASH|%s|NO|\n' "$label"
  fi
}
emit_hash package.json "$project/package.json"
lock_found=NO
for lock in package-lock.json pnpm-lock.yaml yarn.lock bun.lockb; do
  if [ -f "$project/$lock" ]; then emit_hash "$lock" "$project/$lock"; lock_found=YES; fi
done
if [ "$lock_found" = NO ]; then printf 'CONFIG_HASH|lockfile|NO|\n'; fi
emit_hash prisma/schema.prisma "$project/prisma/schema.prisma"
emit_hash Dockerfile "$project/Dockerfile"
for compose in docker-compose.yml docker-compose.yaml docker-compose.prod.yml docker-compose.prod.yaml compose.yml compose.yaml deploy/docker-compose.local.yml deploy/enhe-ai-tools/docker-compose.yml; do
  if [ -f "$project/$compose" ]; then emit_hash "$compose" "$project/$compose"; fi
done

for path in \
  src/app/root-layout-shared.tsx \
  src/components/product-video-player.tsx \
  src/lib/tool-category-groups.ts \
  src/lib/media.ts \
  skills/ebos/skill-registry.json \
  src/lib/ebos/post-launch/__tests__/optimized-page-redeploy-checker.test.ts
do
  full="$project/$path"
  if [ ! -f "$full" ]; then
    printf 'SOURCE|%s|NO||NO|MISSING|%s\n' "$path" "$now"
    continue
  fi
  tracked=NO
  category=UNTRACKED
  if git -C "$project" ls-files --error-unmatch -- "$path" >/dev/null 2>&1; then
    tracked=YES
    if [ -z "$(git -C "$project" status --porcelain -- "$path" 2>/dev/null)" ]; then category=CLEAN_TRACKED; else category=MODIFIED_TRACKED; fi
  fi
  printf 'SOURCE|%s|YES|%s|%s|%s|%s\n' "$path" "$(sha256sum "$full" | awk '{print $1}')" "$tracked" "$category" "$now"
done

find_service() {
  service="$1"
  exact_name="$2"
  ids="$(docker ps --filter "label=com.docker.compose.service=$service" --format '{{.ID}}' 2>/dev/null || true)"
  count="$(printf '%s\n' "$ids" | sed '/^$/d' | wc -l | tr -d ' ')"
  method=COMPOSE_LABEL
  if [ "$count" -eq 0 ]; then
    ids="$(docker ps --filter "name=^/${exact_name}$" --format '{{.ID}}' 2>/dev/null || true)"
    count="$(printf '%s\n' "$ids" | sed '/^$/d' | wc -l | tr -d ' ')"
    method=EXACT_NAME_FALLBACK
  fi
  if [ "$count" -ne 1 ]; then printf '%s|%s|%s\n' "$count" "$method" ''; return; fi
  printf '%s|%s|%s\n' "$count" "$method" "$(printf '%s\n' "$ids" | sed '/^$/d')"
}

app_info="$(find_service app enhe-ai-tools-app)"
db_info="$(find_service db enhe-ai-tools-db)"
app_count="$(printf '%s' "$app_info" | cut -d '|' -f1)"
app_method="$(printf '%s' "$app_info" | cut -d '|' -f2)"
app_id="$(printf '%s' "$app_info" | cut -d '|' -f3)"
db_count="$(printf '%s' "$db_info" | cut -d '|' -f1)"
db_method="$(printf '%s' "$db_info" | cut -d '|' -f2)"
db_id="$(printf '%s' "$db_info" | cut -d '|' -f3)"

printf 'APP_CONTAINER_COUNT=%s\nAPP_CONTAINER_METHOD=%s\nAPP_CONTAINER_FOUND=%s\n' "$app_count" "$app_method" "$(if [ "$app_count" -eq 1 ]; then printf YES; else printf NO; fi)"
printf 'DB_CONTAINER_COUNT=%s\nDB_CONTAINER_METHOD=%s\nDB_CONTAINER_FOUND=%s\n' "$db_count" "$db_method" "$(if [ "$db_count" -eq 1 ]; then printf YES; else printf NO; fi)"
if [ "$app_count" -ne 1 ] || [ "$db_count" -ne 1 ]; then
  printf 'PRODUCTION_CONTAINER_DISCOVERY=BLOCKED\n'
  exit 0
fi
printf 'PRODUCTION_CONTAINER_DISCOVERY=PASS\n'
printf 'APP_SERVICE_LABEL=%s\n' "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$app_id" 2>/dev/null || true)"
printf 'DB_SERVICE_LABEL=%s\n' "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$db_id" 2>/dev/null || true)"

image_id="$(docker inspect --format '{{.Image}}' "$app_id")"
printf 'IMAGE_ID=%s\n' "$image_id"
digest="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$image_id" 2>/dev/null | sed -n 's/.*@//p' | head -n 1 || true)"
printf 'IMAGE_DIGEST=%s\n' "${digest:-UNKNOWN}"
printf 'IMAGE_REVISION=%s\n' "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image_id" 2>/dev/null || true)"
printf 'IMAGE_CREATED_TIME=%s\n' "$(docker image inspect --format '{{.Created}}' "$image_id" 2>/dev/null || true)"
workdir="$(docker inspect --format '{{.Config.WorkingDir}}' "$app_id")"
[ -n "$workdir" ] || workdir=/app
printf 'CONTAINER_WORKDIR=%s\n' "$workdir"
printf 'COMPOSE_PROJECT_LABEL=%s\n' "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$app_id" 2>/dev/null || true)"
printf 'COMPOSE_SERVICE_LABEL=%s\n' "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$app_id" 2>/dev/null || true)"

docker exec "$app_id" sh -lc '
set -eu
wd="$1"
emit_file() {
  label="$1"; file="$2"
  if [ -f "$file" ]; then
    rel="${file#$wd/}"
    printf "NEXT_FILE|%s|YES|%s|%s\n" "$label" "$rel" "$(sha256sum "$file" | cut -d " " -f1)"
  else
    printf "NEXT_FILE|%s|NO||\n" "$label"
  fi
}
if [ -f "$wd/.next/BUILD_ID" ]; then
  build_id="$(tr -d "\\r\\n" < "$wd/.next/BUILD_ID")"
  case "$build_id" in *[!A-Za-z0-9._-]*) build_id=UNSAFE_VALUE_REDACTED;; esac
  printf "NEXT_BUILD_ID=%s\n" "$build_id"
else printf "NEXT_BUILD_ID=UNKNOWN\n"; fi
emit_file app-paths-manifest "$wd/.next/server/app-paths-manifest.json"
emit_file routes-manifest "$wd/.next/routes-manifest.json"
emit_file middleware-manifest "$wd/.next/server/middleware-manifest.json"
emit_file required-server-files "$wd/.next/required-server-files.json"
if [ -f "$wd/standalone/server.js" ]; then emit_file standalone-server "$wd/standalone/server.js"; else emit_file standalone-server "$wd/.next/standalone/server.js"; fi
manifest="$wd/.next/server/app-paths-manifest.json"
if [ -f "$manifest" ] && command -v node >/dev/null 2>&1; then
  node -e "const fs=require(\"fs\"),c=require(\"crypto\");const x=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));const k=Object.keys(x).sort();console.log(\"ROUTE_KEY_COUNT=\"+k.length);console.log(\"ROUTE_KEY_SET_SHA256=\"+c.createHash(\"sha256\").update(k.join(\"\\n\")).digest(\"hex\"));" "$manifest"
else printf "ROUTE_KEY_COUNT=UNKNOWN\nROUTE_KEY_SET_SHA256=UNKNOWN\n"; fi
' sh "$workdir"

if command -v python3 >/dev/null 2>&1; then
  python3 -c "$(printf '%s' '__TRAFFIC_PYTHON_B64__' | base64 -d)"
else
  printf 'NGINX_LOG_AGGREGATION_STATUS=PYTHON3_UNAVAILABLE\n'
fi

migration_exists="$(printf "%s\n" "BEGIN TRANSACTION READ ONLY; SELECT CASE WHEN to_regclass('public._prisma_migrations') IS NULL THEN 'NO' ELSE 'YES' END; ROLLBACK;" | docker exec -i "$db_id" sh -lc 'psql -X -qAt -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' 2>/dev/null || true)"
migration_exists="$(printf '%s\n' "$migration_exists" | grep -E '^(YES|NO)$' | tail -n 1 || true)"
printf 'MIGRATION_TABLE_EXISTS=%s\n' "${migration_exists:-UNKNOWN}"
if [ "$migration_exists" = YES ]; then
  stats="$(printf "%s\n" "BEGIN TRANSACTION READ ONLY; SELECT count(*) || '|' || count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) || '|' || count(*) FILTER (WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL) || '|' || COALESCE((SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC NULLS LAST, started_at DESC LIMIT 1),'') || '|' || COALESCE((SELECT finished_at::text FROM _prisma_migrations ORDER BY finished_at DESC NULLS LAST, started_at DESC LIMIT 1),'') FROM _prisma_migrations; ROLLBACK;" | docker exec -i "$db_id" sh -lc 'psql -X -qAt -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' 2>/dev/null | grep '|' | tail -n 1 || true)"
  if [ -n "$stats" ]; then
    printf 'MIGRATION_COUNT=%s\nMIGRATION_SUCCESS_COUNT=%s\nMIGRATION_FAILED_COUNT=%s\nLATEST_MIGRATION_NAME=%s\nLATEST_MIGRATION_FINISHED_AT=%s\n' \
      "$(printf '%s' "$stats" | cut -d '|' -f1)" "$(printf '%s' "$stats" | cut -d '|' -f2)" "$(printf '%s' "$stats" | cut -d '|' -f3)" "$(printf '%s' "$stats" | cut -d '|' -f4)" "$(printf '%s' "$stats" | cut -d '|' -f5)"
    set_hash="$(printf "%s\n" "BEGIN TRANSACTION READ ONLY; COPY (SELECT migration_name FROM _prisma_migrations ORDER BY migration_name) TO STDOUT; ROLLBACK;" | docker exec -i "$db_id" sh -lc 'psql -X -qAt -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' 2>/dev/null | grep -vE '^(BEGIN|ROLLBACK)$' | sha256sum | awk '{print $1}')"
    printf 'MIGRATION_SET_SHA256=%s\nPRODUCTION_MIGRATION_STATUS=COLLECTED\n' "$set_hash"
  else printf 'PRODUCTION_MIGRATION_STATUS=QUERY_FAILED\n'; fi
else
  printf 'MIGRATION_COUNT=0\nMIGRATION_SUCCESS_COUNT=0\nMIGRATION_FAILED_COUNT=0\nLATEST_MIGRATION_NAME=\nLATEST_MIGRATION_FINISHED_AT=\nMIGRATION_SET_SHA256=\nPRODUCTION_MIGRATION_STATUS=TABLE_NOT_FOUND\n'
fi
'@
$remoteScript = $remoteScript.Replace("__TRAFFIC_PYTHON_B64__", $trafficPythonBase64)

$normalizedRemoteScript = $remoteScript.Replace("`r`n", "`n")
$remoteBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($normalizedRemoteScript))
$target = "{0}@{1}" -f $remoteUser, $remoteTarget
$sshArguments = @(
  "-T",
  "-o", "BatchMode=yes",
  "-o", "ConnectTimeout=10",
  "-o", "StrictHostKeyChecking=yes",
  "-o", "LogLevel=ERROR",
  "-o", "PasswordAuthentication=no",
  "-o", "ClearAllForwardings=yes",
  "-o", "ForwardAgent=no",
  "-o", "ForwardX11=no",
  "-p", [string]$remotePort,
  "-i", $identityPath,
  $target,
  "printf '%s' '$remoteBase64' | base64 -d | sh"
)

$previousPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  $raw = @(& ssh @sshArguments 2>&1)
  $sshExitCode = $LASTEXITCODE
} finally {
  $ErrorActionPreference = $previousPreference
}

$allowedPrefixes = @(
  "PRODUCTION_", "GIT_", "CONFIG_HASH|", "SOURCE|", "APP_", "DB_",
  "IMAGE_", "CONTAINER_", "COMPOSE_", "NEXT_", "ROUTE_",
  "MIGRATION_", "LATEST_", "TRAFFIC|", "NGINX_"
)
$safeLines = [System.Collections.Generic.List[string]]::new()
foreach ($item in $raw) {
  $line = ([string]$item).Trim()
  if (-not $line) { continue }
  if (-not ($allowedPrefixes | Where-Object { $line.StartsWith($_, [StringComparison]::Ordinal) })) { continue }
  if ($line -match '(?i)https?://|postgres(?:ql)?://|password|secret|token=|private.?key|@') { continue }
  $safeLines.Add($line)
}

if ($sshExitCode -ne 0) {
  Write-Output "CONNECTION_SOURCE_FILE=$ConnectionSource"
  Write-Output "CONNECTION_CANDIDATE_COUNT=1"
  Write-Output "CONNECTION_CANDIDATE_ID=$candidateId"
  Write-Output "KEY_FILE_EXISTS=YES"
  Write-Output "PRODUCTION_CONNECTION_STATUS=FAILED"
  Write-Output "REASON=READONLY_SSH_COMMAND_FAILED"
  Write-Output "SSH_EXIT_CODE=$sshExitCode"
  $safeLines
  exit 3
}

if (-not ($safeLines -contains "PRODUCTION_READONLY_CONNECTION=PASS")) {
  Write-Output "PRODUCTION_CONNECTION_STATUS=FAILED"
  Write-Output "REASON=READONLY_SSH_CONNECTION_FAILED"
  exit 4
}

$sourceRows = [System.Collections.Generic.List[object]]::new()
foreach ($line in $safeLines) {
  if (-not $line.StartsWith("SOURCE|", [StringComparison]::Ordinal)) { continue }
  $parts = $line.Split("|", 7)
  if ($parts.Count -ne 7 -or $parts[5] -notin @("CLEAN_TRACKED", "MODIFIED_TRACKED", "UNTRACKED", "MISSING")) {
    throw "Unsafe or malformed source-hash row."
  }
  if ($parts[2] -eq "YES" -and $parts[3] -notmatch '^[0-9a-f]{64}$') { throw "Invalid source SHA-256." }
  $sourceRows.Add([pscustomobject]@{
    path = $parts[1]
    exists = $parts[2]
    sha256 = $parts[3]
    git_tracked = $parts[4]
    git_status_category = $parts[5]
    observed_at = $parts[6]
  })
}
if ($sourceRows.Count -ne 6) { throw "Expected six production source rows." }
$sourceParent = Split-Path -Parent $SourceOutputPath
if (-not (Test-Path -LiteralPath $sourceParent)) { New-Item -ItemType Directory -Path $sourceParent -Force | Out-Null }
$sourceRows | Export-Csv -LiteralPath $SourceOutputPath -NoTypeInformation -Encoding utf8

Write-Output "CONNECTION_SOURCE_FILE=$ConnectionSource"
Write-Output "CONNECTION_CANDIDATE_COUNT=1"
Write-Output "CONNECTION_CANDIDATE_ID=$candidateId"
Write-Output "KEY_FILE_EXISTS=YES"
Write-Output "PRODUCTION_CONNECTION_STATUS=PASS"
Write-Output "PRODUCTION_SOURCE_ROW_COUNT=$($sourceRows.Count)"
$safeLines
