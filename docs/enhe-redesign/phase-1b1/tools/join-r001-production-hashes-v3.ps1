[CmdletBinding()]
param(
  [string]$ObservationCsv = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b0\09-R001-EXPOSURE-CLASSIFICATION.csv"),
  [string]$MetadataCsv = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b1\06-PRODUCTION-ADDRESS-HASH-METADATA.csv"),
  [string]$OutputPath = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b1\07-R001-HASH-JOIN-V3.csv")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$observations = @(Import-Csv -LiteralPath $ObservationCsv)
$metadata = @(Import-Csv -LiteralPath $MetadataCsv)
if ($observations.Count -ne 18) { throw "Expected 18 public observations." }

$index = @{}
foreach ($row in $metadata) {
  $hash = ([string]$row.address_sha256).Trim().ToUpperInvariant()
  if ($hash -notmatch '^[0-9A-F]{64}$') { throw "Invalid production metadata hash." }
  if (-not $index.ContainsKey($hash)) { $index[$hash] = [System.Collections.Generic.List[object]]::new() }
  $index[$hash].Add($row)
}

function Join-Values {
  param([AllowEmptyCollection()][object[]]$Rows, [string]$Property)
  if (-not $Rows) { return "" }
  return (@($Rows | ForEach-Object { [string]$_.PSObject.Properties[$Property].Value } | Where-Object { $_ } | Sort-Object -Unique) -join ";")
}

$result = [System.Collections.Generic.List[object]]::new()
foreach ($observation in $observations) {
  $hash = ([string]$observation.address_sha256).Trim().ToUpperInvariant()
  if ($hash -notmatch '^[0-9A-F]{64}$') { throw "Invalid observation hash." }
  $productionMatches = @(if ($index.ContainsKey($hash)) { $index[$hash] } else { @() })
  $classification = "UNKNOWN_REQUIRES_OWNER"
  $ownerRequired = "YES"
  $action = "OWNER_CLASSIFY_AND_TRACE_SOURCE"
  $verification = if ($productionMatches.Count) { "HASH_MATCHED_OWNER_REQUIRED" } else { "NO_DATABASE_MATCH" }
  $notes = if ($productionMatches.Count) { "Production hash match found; owner approval remains mandatory." } else { "No hash match in permitted production public-content fields." }

  if ($observation.classification -eq "EXTERNAL_SOURCE") {
    $classification = "EXTERNAL_SOURCE"
    $ownerRequired = "NO"
    $action = "RETAIN_AS_EXTERNAL_SOURCE_EVIDENCE"
    $verification = if ($productionMatches.Count) { "HASH_MATCHED_EXTERNAL_SOURCE" } else { "CLASSIFIED_FROM_PUBLIC_EVIDENCE" }
    $notes = "External source classification retained; it is not treated as a delivery leak."
  } elseif ($observation.classification -eq "PARSER_FALSE_POSITIVE") {
    $classification = "PARSER_FALSE_POSITIVE"
    $ownerRequired = "NO"
    $action = "FIX_OR_DOCUMENT_PARSER_RULE"
    $verification = "CLASSIFIED_FROM_PUBLIC_EVIDENCE"
    $notes = "Known own-site media query source; not a delivery address."
  } elseif ($productionMatches.Count) {
    $paid = @($productionMatches | Where-Object { $_.is_download_paid -match '^(?i:true|t|1|yes)$' -or $_.price_state -eq "PAID" })
    $legacy = @($productionMatches | Where-Object { $_.related_tool_status -match '(?i)archiv|unpublish|deleted|inactive' })
    $media = @($productionMatches | Where-Object { $_.storage_category -eq "cos_media" })
    $free = @($productionMatches | Where-Object { $_.is_download_paid -match '^(?i:false|f|0|no)$' -and $_.price_state -eq "FREE_FLAG" })
    if ($paid.Count) {
      $classification = "PAID_DELIVERY_LEAK_CANDIDATE"
      $action = "P0_OWNER_CONFIRM_AND_PLAN_CONTAINMENT"
    } elseif ($legacy.Count) {
      $classification = "LEGACY_DELIVERY_LEAK_CANDIDATE"
      $action = "P0_OWNER_CONFIRM_AND_PLAN_LEGACY_CONTAINMENT"
    } elseif ($observation.artifact_type -eq "public_media" -and $media.Count) {
      $classification = "PUBLIC_MEDIA_ALLOWLIST_CANDIDATE"
      $action = "OWNER_CONFIRM_MEDIA_ALLOWLIST_AND_CACHE_POLICY"
    } elseif ($free.Count) {
      $classification = "FREE_PUBLIC_RESOURCE_CANDIDATE"
      $action = "OWNER_CONFIRM_FREE_PUBLIC_INTENT_AND_DELIVERY_POLICY"
    }
  }

  $result.Add([pscustomobject]@{
    address_sha256 = $hash
    observed_page = $observation.observed_page
    artifact_type = $observation.artifact_type
    production_match_count = $productionMatches.Count
    source_model = Join-Values -Rows $productionMatches -Property "source_model"
    source_field = Join-Values -Rows $productionMatches -Property "source_field"
    related_tool_slug = Join-Values -Rows $productionMatches -Property "related_tool_slug"
    related_tool_status = Join-Values -Rows $productionMatches -Property "related_tool_status"
    is_download_paid = Join-Values -Rows $productionMatches -Property "is_download_paid"
    price_state = Join-Values -Rows $productionMatches -Property "price_state"
    visibility_state = Join-Values -Rows $productionMatches -Property "visibility_state"
    classification_candidate = $classification
    owner_decision_required = $ownerRequired
    required_action = $action
    verification_status = $verification
    notes = $notes
  })
}

$parent = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
$result | Export-Csv -LiteralPath $OutputPath -NoTypeInformation -Encoding utf8

Write-Output "R001_PUBLIC_OBSERVATION_COUNT=$($result.Count)"
Write-Output "R001_HASH_MATCH_COUNT=$(@($result | Where-Object { [int]$_.production_match_count -gt 0 }).Count)"
$result | Group-Object classification_candidate | Sort-Object Name | ForEach-Object {
  Write-Output "CLASSIFICATION_$($_.Name)=$($_.Count)"
}
