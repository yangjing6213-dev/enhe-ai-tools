[CmdletBinding()]
param(
  [string]$ConnectionSource = "scripts/push-and-deploy.ps1",
  [string]$ObservationCsv = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b0\09-R001-EXPOSURE-CLASSIFICATION.csv"),
  [string]$SchemaOutputPath = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b1\05-PRODUCTION-DATABASE-SCHEMA-MAP.csv"),
  [string]$AddressOutputPath = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b1\06-PRODUCTION-ADDRESS-HASH-METADATA.csv")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (& git ls-files --error-unmatch -- $ConnectionSource 2>$null)) { throw "Connection source must be tracked." }
if (-not (Test-Path -LiteralPath $ObservationCsv -PathType Leaf)) { throw "Observation CSV is missing." }

$observations = @(Import-Csv -LiteralPath $ObservationCsv)
$targetHashes = @($observations.address_sha256 | ForEach-Object { ([string]$_).Trim().ToUpperInvariant() } | Sort-Object -Unique)
if ($targetHashes.Count -ne 18 -or @($targetHashes | Where-Object { $_ -notmatch '^[0-9A-F]{64}$' }).Count) {
  throw "Expected exactly 18 SHA-256 observations."
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
  if (-not $parameter -or -not $parameter.DefaultValue) { throw "Required tracked connection default is missing." }
  return [string]$parameter.DefaultValue.SafeGetValue()
}

$resolver = $ast.FindAll({
    param($node)
    $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq "Resolve-SshKey"
  }, $true) | Select-Object -First 1
if (-not $resolver) { throw "Tracked key-path resolver is missing." }
Invoke-Expression $resolver.Extent.Text

$remoteTarget = Get-TrackedDefault -Name "ServerHost"
$remoteUser = Get-TrackedDefault -Name "ServerUser"
$remotePort = [int](Get-TrackedDefault -Name "SshPort")
$projectPath = Get-TrackedDefault -Name "RemoteProjectDir"
$identityPath = Resolve-SshKey -Path ""
if ($projectPath -ne "/opt/enhe-ai-tools") { throw "Unexpected production project path." }
if (-not $identityPath -or -not (Test-Path -LiteralPath $identityPath -PathType Leaf)) { throw "Tracked identity path is unavailable." }
if ($remoteTarget -match '(?i)staging|stage|test|dev|localhost' -or $remoteTarget -in @("127.0.0.1", "::1")) {
  throw "Non-production target refused."
}

$schemaSql = @'
BEGIN TRANSACTION READ ONLY;
SELECT 'PGCRYPTO|' || CASE WHEN EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
) THEN 'YES' ELSE 'NO' END;
SELECT 'SCHEMA|' || table_name || '|' || column_name || '|' || data_type || '|' || is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'files', 'tools', 'tutorials', 'tool_price_specs', 'tool_faqs', 'tool_changelogs',
    'news_articles', 'news_external_sources', 'site_settings'
  )
ORDER BY table_name, ordinal_position;
ROLLBACK;
'@

$addressSql = @'
BEGIN TRANSACTION READ ONLY;
COPY (
  SELECT json_build_object(
    'source_model', 'Tool', 'source_row_id', t.id, 'tool_slug', t.slug,
    'tool_status', t.status::text, 'is_download_paid', t.is_download_paid,
    'download_price', t.download_price::text, 'mime_type', NULL, 'file_size', NULL,
    'fields', json_build_object(
      'short_description', t.short_description, 'content', t.content,
      'cover_image', t.cover_image, 'screenshots', t.screenshots,
      'online_url', t.online_url, 'video_url', t.video_url,
      'video_url_2', t.video_url_2, 'video_url_3', t.video_url_3
    )
  )::text
  FROM tools t
  WHERE lower(t.status::text) = 'published' OR t.slug IN (
    'a-skill', 'seo-geo-skill', 'ai-monetization-side-hustle-course',
    'codex-api', 'zfb-transfer-link-qr-code-generator'
  )

  UNION ALL
  SELECT json_build_object(
    'source_model', 'File', 'source_row_id', f.id, 'tool_slug', t.slug,
    'tool_status', t.status::text, 'is_download_paid', t.is_download_paid,
    'download_price', t.download_price::text, 'mime_type', f.mime_type,
    'file_size', f.file_size::text,
    'fields', json_build_object('file_path', f.file_path, 'file_url', f.file_url)
  )::text
  FROM files f
  JOIN tools t ON t.id = f.tool_id
  WHERE lower(t.status::text) = 'published' OR t.slug IN (
    'a-skill', 'seo-geo-skill', 'ai-monetization-side-hustle-course',
    'codex-api', 'zfb-transfer-link-qr-code-generator'
  )

  UNION ALL
  SELECT json_build_object(
    'source_model', 'Tutorial', 'source_row_id', u.id, 'tool_slug', t.slug,
    'tool_status', t.status::text, 'is_download_paid', t.is_download_paid,
    'download_price', t.download_price::text, 'mime_type', NULL, 'file_size', NULL,
    'fields', json_build_object(
      'content', u.content, 'image_url', u.image_url, 'video_url', u.video_url,
      'notes', u.notes, 'common_errors', u.common_errors
    )
  )::text
  FROM tutorials u
  JOIN tools t ON t.id = u.tool_id
  WHERE t.slug IN (
    'a-skill', 'seo-geo-skill', 'ai-monetization-side-hustle-course',
    'codex-api', 'zfb-transfer-link-qr-code-generator'
  ) OR (lower(u.status::text) = 'published' AND lower(t.status::text) = 'published')

  UNION ALL
  SELECT json_build_object(
    'source_model', 'ToolFaq', 'source_row_id', q.id, 'tool_slug', t.slug,
    'tool_status', t.status::text, 'is_download_paid', t.is_download_paid,
    'download_price', t.download_price::text, 'mime_type', NULL, 'file_size', NULL,
    'fields', json_build_object('question', q.question, 'answer', q.answer)
  )::text
  FROM tool_faqs q
  JOIN tools t ON t.id = q.tool_id
  WHERE lower(q.status::text) = 'published' AND lower(t.status::text) = 'published'

  UNION ALL
  SELECT json_build_object(
    'source_model', 'ToolChangelog', 'source_row_id', c.id, 'tool_slug', t.slug,
    'tool_status', t.status::text, 'is_download_paid', t.is_download_paid,
    'download_price', t.download_price::text, 'mime_type', NULL, 'file_size', NULL,
    'fields', json_build_object('title', c.title, 'content', c.content)
  )::text
  FROM tool_changelogs c
  JOIN tools t ON t.id = c.tool_id
  WHERE lower(c.status::text) = 'published' AND lower(t.status::text) = 'published'

  UNION ALL
  SELECT json_build_object(
    'source_model', 'NewsArticle', 'source_row_id', n.id, 'tool_slug', NULL,
    'tool_status', n.status::text, 'is_download_paid', NULL, 'download_price', NULL,
    'mime_type', NULL, 'file_size', NULL,
    'fields', json_build_object(
      'description', n.description, 'summary', n.summary, 'content', n.content,
      'cover_image', n.cover_image, 'video_url', n.video_url,
      'canonical_url', n.canonical_url, 'english_description', n.english_description,
      'english_summary', n.english_summary, 'english_content', n.english_content
    )
  )::text
  FROM news_articles n
  WHERE lower(n.status::text) = 'published' OR n.slug = 'chatbox-to-personal-ai-companion-desktop-execution'

  UNION ALL
  SELECT json_build_object(
    'source_model', 'NewsExternalSource', 'source_row_id', s.id, 'tool_slug', NULL,
    'tool_status', n.status::text, 'is_download_paid', NULL, 'download_price', NULL,
    'mime_type', NULL, 'file_size', NULL,
    'fields', json_build_object('url', s.url, 'description', s.description)
  )::text
  FROM news_external_sources s
  JOIN news_articles n ON n.id = s.article_id
  WHERE lower(n.status::text) = 'published' OR n.slug = 'chatbox-to-personal-ai-companion-desktop-execution'
) TO STDOUT;
ROLLBACK;
'@

$targetJson = ConvertTo-Json -InputObject @($targetHashes) -Compress
$hashPageMap = [ordered]@{}
foreach ($row in $observations) { $hashPageMap[([string]$row.address_sha256).ToUpperInvariant()] = [string]$row.observed_page }
$hashPageJson = ConvertTo-Json -InputObject $hashPageMap -Compress
$pythonScript = @'
import hashlib
import html
import json
import re
import sys
from datetime import datetime, timezone
from urllib.parse import urlsplit

TARGETS = set(__TARGET_HASHES__)
OBSERVED_PAGE = __HASH_PAGE_MAP__
URL_RE = re.compile(r'''(?:(?:https?|cos)://[^\s<>"'`]+|(?:/uploads|/api/uploads)/[^\s<>"'`]+)''', re.I)
TRAILING = ".,;:!?，。；：！？)]}>"

PAGE_BY_SLUG = {
    "a-skill": "/ai-skills/a-skill",
    "seo-geo-skill": "/ai-skills/seo-geo-skill",
    "ai-monetization-side-hustle-course": "/skill-learning/ai-monetization-side-hustle-course",
    "codex-api": "/software/codex-api",
    "zfb-transfer-link-qr-code-generator": "/software/zfb-transfer-link-qr-code-generator",
}

def strings(value):
    if value is None:
        return
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)

def candidates(value):
    seen = set()
    for raw in strings(value):
        decoded = html.unescape(raw.strip())
        direct = decoded if re.match(r'^(?:https?|cos)://', decoded, re.I) else None
        values = ([direct] if direct else []) + [m.group(0) for m in URL_RE.finditer(decoded)]
        for candidate in values:
            candidate = candidate.rstrip(TRAILING)
            if candidate and candidate not in seen:
                seen.add(candidate)
                yield candidate

def category(value):
    lower = value.lower()
    host = ""
    try:
        host = urlsplit(value).hostname or ""
    except Exception:
        pass
    if host in {"pan.baidu.com", "pan.quark.cn"}:
        return "permanent_cloud_share"
    if "myqcloud.com" in host or ".cos." in host or lower.startswith("cos://"):
        path = urlsplit(value).path.lower() if "://" in value else lower
        return "cos_archive" if re.search(r'\.(?:zip|rar|7z|tar|gz|tgz)(?:$|[?#])', path) else "cos_media"
    if host == "github.com" or host.endswith(".github.com"):
        return "external_source"
    if host.endswith("enhe-tech.com.cn"):
        return "public_media"
    return "external_or_other"

emitted = set()
observed = datetime.now(timezone.utc).isoformat()
for line in sys.stdin:
    line = line.strip()
    if not line.startswith("{"):
        continue
    try:
        row = json.loads(line)
    except Exception:
        continue
    slug = row.get("tool_slug") or ""
    model = row.get("source_model") or ""
    default_page = PAGE_BY_SLUG.get(slug, "/tutorials" if model == "Tutorial" else "")
    paid = row.get("is_download_paid")
    try:
        price = float(row.get("download_price") or 0)
    except Exception:
        price = 0
    price_state = "PAID" if paid is True or price > 0 else ("FREE_FLAG" if paid is False else "UNKNOWN")
    status = str(row.get("tool_status") or "")
    visibility = "PUBLIC" if status.lower() in {"published", "active"} else ("UNKNOWN" if not status else "NON_PUBLIC")
    fields = row.get("fields") or {}
    for field, value in fields.items():
        for address in candidates(value):
            digest = hashlib.sha256(address.encode("utf-8")).hexdigest().upper()
            if digest not in TARGETS:
                continue
            page = OBSERVED_PAGE.get(digest, default_page)
            key = (digest, model, str(row.get("source_row_id") or ""), field, page)
            if key in emitted:
                continue
            emitted.add(key)
            safe = [
                "ADDRESS", digest, model, str(row.get("source_row_id") or ""), field,
                page, slug, status, "" if paid is None else str(bool(paid)).lower(),
                price_state, visibility, str(row.get("mime_type") or ""),
                str(row.get("file_size") or ""), category(address),
                "PUBLIC_RECORD" if visibility == "PUBLIC" else "REVIEW_RECORD", observed,
            ]
            print("|".join(part.replace("|", "_").replace("\n", " ").replace("\r", " ") for part in safe))
'@
$pythonScript = $pythonScript.Replace("__TARGET_HASHES__", $targetJson)
$pythonScript = $pythonScript.Replace("__HASH_PAGE_MAP__", $hashPageJson)

$schemaBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($schemaSql.Replace("`r`n", "`n")))
$addressBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($addressSql.Replace("`r`n", "`n")))
$pythonBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($pythonScript.Replace("`r`n", "`n")))

$remoteScript = @'
set -eu
schema_b64='__SCHEMA_B64__'
address_b64='__ADDRESS_B64__'
python_b64='__PYTHON_B64__'

db_ids="$(docker ps --filter label=com.docker.compose.service=db --format '{{.ID}}' 2>/dev/null || true)"
count="$(printf '%s\n' "$db_ids" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$count" -eq 0 ]; then
  db_ids="$(docker ps --filter 'name=^/enhe-ai-tools-db$' --format '{{.ID}}' 2>/dev/null || true)"
  count="$(printf '%s\n' "$db_ids" | sed '/^$/d' | wc -l | tr -d ' ')"
fi
if [ "$count" -ne 1 ]; then printf 'ADDRESS_COLLECTION_STATUS=CONTAINER_BLOCKED\n'; exit 0; fi
db_id="$(printf '%s\n' "$db_ids" | sed '/^$/d')"

schema_out="$(printf '%s' "$schema_b64" | base64 -d | docker exec -i "$db_id" sh -lc 'psql -X -qAt -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' 2>/dev/null)"
printf '%s\n' "$schema_out" | grep -E '^(PGCRYPTO|SCHEMA)\|' || true
pgcrypto="$(printf '%s\n' "$schema_out" | sed -n 's/^PGCRYPTO|//p' | tail -n 1)"
printf 'PGCRYPTO_AVAILABLE=%s\n' "${pgcrypto:-UNKNOWN}"

if ! command -v python3 >/dev/null 2>&1; then printf 'ADDRESS_COLLECTION_STATUS=PYTHON3_UNAVAILABLE\n'; exit 0; fi
if [ "$pgcrypto" = YES ]; then
  printf 'ADDRESS_HASH_STRATEGY=SERVER_PYTHON_CONTENT_EXTRACTION\n'
else
  printf 'ADDRESS_HASH_STRATEGY=SERVER_PYTHON_STREAMING_FALLBACK\n'
fi
printf '%s' "$address_b64" | base64 -d |
  docker exec -i "$db_id" sh -lc 'psql -X -qAt -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' 2>/dev/null |
  python3 -c "$(printf '%s' "$python_b64" | base64 -d)"
printf 'ADDRESS_COLLECTION_STATUS=PASS\n'
'@
$remoteScript = $remoteScript.Replace("__SCHEMA_B64__", $schemaBase64).Replace("__ADDRESS_B64__", $addressBase64).Replace("__PYTHON_B64__", $pythonBase64)
$remoteBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($remoteScript.Replace("`r`n", "`n")))

$target = "{0}@{1}" -f $remoteUser, $remoteTarget
$sshArguments = @(
  "-T", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10",
  "-o", "StrictHostKeyChecking=yes", "-o", "LogLevel=ERROR",
  "-o", "PasswordAuthentication=no", "-o", "ClearAllForwardings=yes",
  "-o", "ForwardAgent=no", "-o", "ForwardX11=no",
  "-p", [string]$remotePort, "-i", $identityPath, $target,
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
if ($sshExitCode -ne 0) {
  Write-Output "ADDRESS_COLLECTION_STATUS=FAILED"
  Write-Output "REASON=READONLY_SSH_COMMAND_FAILED"
  exit 3
}

$schemaRows = [System.Collections.Generic.List[object]]::new()
$addressRows = [System.Collections.Generic.List[object]]::new()
$pgcrypto = "UNKNOWN"
$strategy = "UNKNOWN"
$remoteStatus = "UNKNOWN"
$modelMap = @{
  files = "File"; tools = "Tool"; tutorials = "Tutorial";
  tool_faqs = "ToolFaq"; tool_changelogs = "ToolChangelog";
  tool_price_specs = "ToolPriceSpec"; news_articles = "NewsArticle";
  news_external_sources = "NewsExternalSource"; site_settings = "SiteSetting"
}

foreach ($item in $raw) {
  $line = ([string]$item).Trim()
  if (-not $line) { continue }
  if ($line -match '^PGCRYPTO_AVAILABLE=(YES|NO|UNKNOWN)$') { $pgcrypto = $Matches[1]; continue }
  if ($line -match '^ADDRESS_HASH_STRATEGY=([A-Z0-9_]+)$') { $strategy = $Matches[1]; continue }
  if ($line -match '^ADDRESS_COLLECTION_STATUS=([A-Z0-9_]+)$') { $remoteStatus = $Matches[1]; continue }
  if ($line.StartsWith("SCHEMA|", [StringComparison]::Ordinal)) {
    $parts = $line.Split("|", 5)
    if ($parts.Count -ne 5 -or -not $modelMap.ContainsKey($parts[1])) { continue }
    $column = $parts[2]
    $urlCandidate = $column -match '(?i)(url|path|image|video|screenshots|content|description|summary|value)'
    $contentCandidate = $column -match '(?i)(content|description|summary|screenshots|value|notes|errors)'
    $note = if ($parts[1] -eq "tools") { "AI Skill pages use Tool rows with type=ai_skill." } else { "Production information_schema observation." }
    $schemaRows.Add([pscustomobject]@{
      prisma_model = $modelMap[$parts[1]]
      actual_table_name = $parts[1]
      column_name = $column
      data_type = $parts[3]
      nullable = $parts[4]
      candidate_url_field = if ($urlCandidate) { "YES" } else { "NO" }
      candidate_public_content_field = if ($contentCandidate) { "YES" } else { "NO" }
      notes = $note
    })
    continue
  }
  if ($line.StartsWith("ADDRESS|", [StringComparison]::Ordinal)) {
    $parts = $line.Split("|", 16)
    if ($parts.Count -ne 16 -or $parts[1] -notmatch '^[0-9A-F]{64}$') { continue }
    $addressRows.Add([pscustomobject]@{
      address_sha256 = $parts[1]
      source_model = $parts[2]
      source_row_id = $parts[3]
      source_field = $parts[4]
      related_page_path = $parts[5]
      related_tool_slug = $parts[6]
      related_tool_status = $parts[7]
      is_download_paid = $parts[8]
      price_state = $parts[9]
      visibility_state = $parts[10]
      mime_type = $parts[11]
      file_size = $parts[12]
      storage_category = $parts[13]
      public_content_state = $parts[14]
      observed_at = $parts[15]
    })
  }
}

if ($remoteStatus -ne "PASS" -or -not $schemaRows.Count) { throw "Remote schema/address collection did not complete." }

foreach ($outputPath in @($SchemaOutputPath, $AddressOutputPath)) {
  $parent = Split-Path -Parent $outputPath
  if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
}
$schemaRows | Export-Csv -LiteralPath $SchemaOutputPath -NoTypeInformation -Encoding utf8
$addressRows | Export-Csv -LiteralPath $AddressOutputPath -NoTypeInformation -Encoding utf8

Write-Output "PRODUCTION_DATABASE_SCHEMA_STATUS=COLLECTED"
Write-Output "SCHEMA_ROW_COUNT=$($schemaRows.Count)"
Write-Output "PGCRYPTO_AVAILABLE=$pgcrypto"
Write-Output "ADDRESS_HASH_STRATEGY=$strategy"
Write-Output "ADDRESS_COLLECTION_STATUS=PASS"
Write-Output "ADDRESS_METADATA_ROW_COUNT=$($addressRows.Count)"
Write-Output "ADDRESS_UNIQUE_HASH_COUNT=$(@($addressRows.address_sha256 | Sort-Object -Unique).Count)"
Write-Output "RAW_ADDRESS_LEFT_SERVER=NO"
