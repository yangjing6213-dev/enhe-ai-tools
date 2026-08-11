[CmdletBinding()]
param(
  [string]$ExposureCsv = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b-gates\07-R001-PUBLIC-EXPOSURE-SCAN.csv"),
  [string]$MetadataCsv = "",
  [string]$OutputPath = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b0\09-R001-EXPOSURE-CLASSIFICATION.csv")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ExposureCsv -PathType Leaf)) { throw "Exposure CSV is missing." }
$exposure = @(Import-Csv -LiteralPath $ExposureCsv)
$metadata = @()
$metadataStatus = "NOT_AVAILABLE"
if ($MetadataCsv) {
  if (-not (Test-Path -LiteralPath $MetadataCsv -PathType Leaf)) { throw "Metadata CSV is missing." }
  $metadata = @(Import-Csv -LiteralPath $MetadataCsv)
  if ($metadata.Count) {
    $columns = @($metadata[0].PSObject.Properties.Name)
    $forbidden = @('file_url','file_path','url','path','object_key','signed_url','database_url')
    foreach ($name in $forbidden) { if ($columns -contains $name) { throw "Unsafe raw-address column refused: $name" } }
    foreach ($required in @('file_url_sha256','file_path_sha256','effective_address_sha256')) {
      if ($columns -notcontains $required) { throw "Required hash column missing: $required" }
    }
    $metadataStatus = "AVAILABLE"
  }
}

$hashIndex = @{}
foreach ($row in $metadata) {
  foreach ($field in @('file_url_sha256','file_path_sha256','effective_address_sha256')) {
    $value = ([string]$row.$field).Trim().ToUpperInvariant()
    if (-not $value) { continue }
    if ($value -notmatch '^[0-9A-F]{64}$') { throw "Invalid metadata hash format." }
    if (-not $hashIndex.ContainsKey($value)) { $hashIndex[$value] = [System.Collections.Generic.List[object]]::new() }
    if (-not $hashIndex[$value].Contains($row)) { $hashIndex[$value].Add($row) }
  }
}

$result = [System.Collections.Generic.List[object]]::new()
foreach ($row in $exposure) {
  $hash = ([string]$row.address_sha256).Trim().ToUpperInvariant()
  if ($hash -notmatch '^[0-9A-F]{64}$') { throw "Invalid exposure hash format." }
  $fileMatches = @(if ($hashIndex.ContainsKey($hash)) { $hashIndex[$hash] })
  $productionMatch = if ($metadataStatus -ne "AVAILABLE") { "NO_METADATA" } elseif ($fileMatches.Count -eq 0) { "NO_MATCH" } elseif ($fileMatches.Count -eq 1) { "MATCHED" } else { "AMBIGUOUS_DUPLICATE" }
  $matched = if ($fileMatches.Count -eq 1) { $fileMatches[0] } else { $null }
  $classification = "UNKNOWN_REQUIRES_OWNER"
  $action = "OWNER_CLASSIFY_AND_CONTAIN"
  $owner = "storage_and_content_owner"
  $verification = "OWNER_REQUIRED"
  $notes = "Production File metadata unavailable; paid/free status not inferred."
  if ($row.artifact_type -eq "external_archive_source") {
    $classification = "EXTERNAL_SOURCE"
    $action = "NO_CONTAINMENT_ACTION_FOR_EXTERNAL_SOURCE"
    $owner = "content_owner"
    $verification = "CLASSIFIED_FROM_PUBLIC_EVIDENCE"
    $notes = "External source reference; old scan excluded it from the delivery-leak fail count."
  } elseif ($row.artifact_type -eq "parser_false_positive") {
    $classification = "PARSER_FALSE_POSITIVE"
    $action = "FIX_OR_DOCUMENT_PARSER_RULE"
    $owner = "audit_tool_owner"
    $verification = "CLASSIFIED_FROM_PUBLIC_EVIDENCE"
    $notes = "Own-site public media query source was not a delivery address."
  } elseif ($matched) {
    $paidValue = [string]$matched.is_download_paid
    $toolStatus = [string]$matched.related_tool_status
    if ($paidValue -match '^(?i:true|t|1|yes)$') {
      $classification = "PAID_DELIVERY_LEAK"
      $action = "CONTAIN_PUBLIC_DELIVERY_AND_REVIEW_ENTITLEMENT"
      $owner = "commerce_and_storage_owner"
      $verification = "CLASSIFIED_FROM_PRODUCTION_METADATA"
      $notes = "Hash matched a File row marked download-paid; owner must execute containment and entitlement review."
    } elseif ($toolStatus -match '(?i)archiv|unpublish|deleted|inactive') {
      $classification = "LEGACY_DELIVERY_LEAK"
      $action = "CONTAIN_LEGACY_PUBLIC_DELIVERY"
      $owner = "content_and_storage_owner"
      $verification = "CLASSIFIED_FROM_PRODUCTION_METADATA"
      $notes = "Hash matched a File row associated with an archived or inactive tool."
    } elseif ($paidValue -match '^(?i:false|f|0|no)$' -and $row.artifact_type -eq "public_media") {
      $classification = "FREE_PUBLIC_RESOURCE_INTENTIONAL"
      $action = "OWNER_CONFIRM_ALLOWLIST_AND_CACHE_POLICY"
      $owner = "content_and_storage_owner"
      $verification = "CLASSIFIED_FROM_PRODUCTION_METADATA"
      $notes = "Hash matched a non-paid public-media File row; owner confirmation is still required."
    } else {
      $notes = "Hash matched production File metadata; paid/legacy/public intent remains owner-reviewed."
    }
  }
  $result.Add([pscustomobject]@{
    address_sha256 = $hash
    observed_page = $row.page_path
    observed_surface = $row.surface
    artifact_type = $row.artifact_type
    domain_category = $row.path_category
    production_file_match = $productionMatch
    related_tool_slug = if ($matched -and $matched.PSObject.Properties.Name -contains 'related_tool_slug') { $matched.related_tool_slug } else { "" }
    related_tool_status = if ($matched -and $matched.PSObject.Properties.Name -contains 'related_tool_status') { $matched.related_tool_status } else { "" }
    is_download_paid = if ($matched -and $matched.PSObject.Properties.Name -contains 'is_download_paid') { $matched.is_download_paid } else { "" }
    classification = $classification
    required_action = $action
    owner = $owner
    verification_status = $verification
    notes = $notes
  })
}

$parent = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
$result | Export-Csv -LiteralPath $OutputPath -NoTypeInformation -Encoding utf8
Write-Output "R001_METADATA_QUERY_STATUS=$(if($metadataStatus -eq 'AVAILABLE'){'AVAILABLE'}else{'BLOCKED'})"
if ($metadataStatus -ne "AVAILABLE") { Write-Output "REASON=NO_PRODUCTION_FILE_METADATA" }
Write-Output "ROWS=$($result.Count)"
Write-Output "HASH_MATCHES=$(@($result | Where-Object production_file_match -eq 'MATCHED').Count)"
$result | Group-Object classification | Sort-Object Name | ForEach-Object { "CLASSIFICATION_$($_.Name)=$($_.Count)" }
Write-Output "OUTPUT_PATH=$OutputPath"
