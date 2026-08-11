[CmdletBinding()]
param(
  [string]$OutputPath = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b0\07-MISSING-SOURCE-PROVENANCE.csv"),
  [string]$OriginalWorktree = "C:\Users\HU\Documents\New project 2",
  [string]$CurrentRef = "HEAD",
  [string]$MainRef = "main",
  [string]$FeatureRef = "feature/enhe-api-gateway"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$items = @(
  [pscustomobject]@{ Name = "src/components/product-video-player.tsx"; Kind = "path" },
  [pscustomobject]@{ Name = "src/lib/tool-category-groups.ts"; Kind = "path" },
  [pscustomobject]@{ Name = "normalizeMediaSrc"; Kind = "symbol" },
  [pscustomobject]@{ Name = "skills/ebos/skill-registry.json"; Kind = "path" }
)

function Invoke-GitText {
  param([string[]]$Arguments)
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try { $output = & git @Arguments 2>$null } finally { $ErrorActionPreference = $previous }
  if ($LASTEXITCODE -ne 0) { return "" }
  return (($output -join "`n").TrimEnd())
}

function Get-GitBlobSha256 {
  param([string]$Ref, [string]$Path)
  $spec = "{0}:{1}" -f $Ref, $Path
  $psi = [Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = "git"
  $psi.Arguments = "cat-file blob `"$spec`""
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $psi
  try {
    [void]$process.Start()
    $memory = [IO.MemoryStream]::new()
    try {
      $process.StandardOutput.BaseStream.CopyTo($memory)
      $process.WaitForExit()
      if ($process.ExitCode -ne 0) { return "" }
      $sha = [Security.Cryptography.SHA256]::Create()
      try { return ([BitConverter]::ToString($sha.ComputeHash($memory.ToArray())).Replace("-", "")) } finally { $sha.Dispose() }
    } finally { $memory.Dispose() }
  } catch { return "" }
  return ""
}

function Get-GitPathInfo {
  param([string]$Ref, [string]$Path)
  $spec = "{0}:{1}" -f $Ref, $Path
  $exists = $false
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try { & git cat-file -e $spec 2>$null } finally { $ErrorActionPreference = $previous }
  if ($LASTEXITCODE -eq 0) { $exists = $true }
  if (-not $exists) {
    return [pscustomobject]@{ Exists = $false; Commit = ""; Blob = ""; Sha256 = ""; Recent = "" }
  }
  $commit = Invoke-GitText -Arguments @("rev-parse", "--verify", $Ref)
  $blob = Invoke-GitText -Arguments @("rev-parse", $spec)
  $recent = Invoke-GitText -Arguments @("log", "-1", "--format=%H|%cI", $Ref, "--", $Path)
  $sha256 = Get-GitBlobSha256 -Ref $Ref -Path $Path
  [pscustomobject]@{ Exists = $true; Commit = $commit; Blob = $blob; Sha256 = $sha256; Recent = $recent }
}

function Get-WorktreeState {
  param([string]$Root, [string]$Path)
  $full = Join-Path $Root ($Path -replace '/', '\')
  if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { return "MISSING" }
  $status = (& git -C $Root status --porcelain -- $Path 2>$null | Select-Object -First 1)
  $state = if (-not $status) { "tracked_clean_or_untracked_unknown" } elseif ($status -match '^\?\?') { "untracked" } elseif ($status -match '^.M|^M.') { "modified" } else { ($status.Substring(0,2)).Trim() }
  return $state
}

function Get-SymbolSummary {
  param([string]$Ref, [string]$Symbol)
  $definitionPattern = "(export[[:space:]]+)?(async[[:space:]]+)?function[[:space:]]+$Symbol|const[[:space:]]+$Symbol|let[[:space:]]+$Symbol|var[[:space:]]+$Symbol"
  $text = Invoke-GitText -Arguments @("grep", "-l", "-E", $definitionPattern, $Ref, "--", "src", "skills")
  $files = @($text -split "`n" | Where-Object { $_ })
  if (-not $files) { return "NONE" }
  return (($files | Sort-Object -Unique) -join ";")
}

function Get-SymbolReferences {
  param([string]$Ref, [string]$Symbol)
  $text = Invoke-GitText -Arguments @("grep", "-l", "-F", $Symbol, $Ref, "--", "src", "skills")
  $files = @($text -split "`n" | Where-Object { $_ })
  if (-not $files) { return "NONE" }
  return (($files | Sort-Object -Unique) -join ";")
}

$otherRefText = Invoke-GitText -Arguments @("for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes")
$otherRefs = @($otherRefText -split "`n" | Where-Object { $_ -and $_ -notin @($CurrentRef,$MainRef,$FeatureRef) })
$rows = [System.Collections.Generic.List[object]]::new()
foreach ($item in $items) {
  $path = if ($item.Kind -eq "symbol") { "src/lib/media.ts" } else { $item.Name }
  $current = if ($item.Kind -eq "symbol") { Get-SymbolSummary -Ref $CurrentRef -Symbol $item.Name } else { Get-GitPathInfo -Ref $CurrentRef -Path $path }
  $main = if ($item.Kind -eq "symbol") { Get-SymbolSummary -Ref $MainRef -Symbol $item.Name } else { Get-GitPathInfo -Ref $MainRef -Path $path }
  $feature = if ($item.Kind -eq "symbol") { Get-SymbolSummary -Ref $FeatureRef -Symbol $item.Name } else { Get-GitPathInfo -Ref $FeatureRef -Path $path }
  $originalState = if ($item.Kind -eq "symbol") {
    $mediaPath = Join-Path $OriginalWorktree "src\lib\media.ts"
    if (Test-Path -LiteralPath $mediaPath) {
      $content = Get-Content -LiteralPath $mediaPath -Raw -Encoding UTF8
      $escaped = [regex]::Escape($item.Name)
      $definitionPattern = "(?m)(?:export\s+)?(?:async\s+)?function\s+$escaped\b|(?:const|let|var)\s+$escaped\b"
      if ($content -match $definitionPattern) { "definition_present_$(Get-WorktreeState -Root $OriginalWorktree -Path 'src/lib/media.ts')" } elseif ($content -match $escaped) { "definition_missing_reference_present" } else { "definition_and_reference_missing" }
    } else { "file_missing" }
  } else { Get-WorktreeState -Root $OriginalWorktree -Path $path }
  $other = [System.Collections.Generic.List[string]]::new()
  foreach ($ref in $otherRefs) {
    if ($item.Kind -eq "symbol") { if ((Get-SymbolSummary -Ref $ref -Symbol $item.Name) -ne "NONE") { $other.Add($ref) } }
    else { $info = Get-GitPathInfo -Ref $ref -Path $path; if ($info.Exists) { $other.Add($ref) } }
  }
  if ($item.Kind -eq "symbol") {
    $currentReferences = Get-SymbolReferences -Ref $CurrentRef -Symbol $item.Name
    $mainReferences = Get-SymbolReferences -Ref $MainRef -Symbol $item.Name
    $featureReferences = Get-SymbolReferences -Ref $FeatureRef -Symbol $item.Name
    $currentValue = if ($current -ne "NONE") { "DEFINED_IN:$current" } elseif ($currentReferences -ne "NONE") { "DEFINITION_MISSING_REFERENCE_PRESENT" } else { "DEFINITION_AND_REFERENCE_MISSING" }
    $mainValue = if ($main -ne "NONE") { "DEFINED_IN:$main" } elseif ($mainReferences -ne "NONE") { "DEFINITION_MISSING_REFERENCE_PRESENT" } else { "DEFINITION_AND_REFERENCE_MISSING" }
    $featureValue = if ($feature -ne "NONE") { "DEFINED_IN:$feature" } elseif ($featureReferences -ne "NONE") { "DEFINITION_MISSING_REFERENCE_PRESENT" } else { "DEFINITION_AND_REFERENCE_MISSING" }
    $candidate = if ($main -ne "NONE" -and $current -eq "NONE") { "$MainRef`:src/lib/media.ts" } else { "NONE" }
    $candidateHash = if ($candidate -ne "NONE") { Get-GitBlobSha256 -Ref $MainRef -Path "src/lib/media.ts" } else { "" }
    $currentStatus = if ($current -eq "NONE") { "MISSING" } else { "PRESENT" }
    $mainStatus = if ($main -eq "NONE") { "MISSING" } else { "PRESENT" }
    $featureStatus = if ($feature -eq "NONE") { "MISSING" } else { "PRESENT" }
  } else {
    $currentValue = if ($current.Exists) { "PRESENT" } else { "MISSING" }
    $mainValue = if ($main.Exists) { "PRESENT" } else { "MISSING" }
    $featureValue = if ($feature.Exists) { "PRESENT" } else { "MISSING" }
    $candidate = if (-not $current.Exists -and $main.Exists) { $MainRef } else { "NONE" }
    $candidateHash = if ($candidate -ne "NONE") { $main.Sha256 } else { "" }
    $currentStatus = $currentValue; $mainStatus = $mainValue; $featureStatus = $featureValue
  }
  $notes = if ($item.Kind -eq "symbol") { "definition file set only; current branch has references but no definition; business source text omitted" } else { "existence/ref/hash metadata only; business file contents omitted" }
  $rows.Add([pscustomobject]@{
    required_symbol_or_path = $item.Name
    current_redesign = $currentValue
    local_main = $mainValue
    feature_branch = $featureValue
    original_worktree = $originalState
    other_ref = if ($other.Count) { $other -join ";" } else { "NONE" }
    production_match = "UNKNOWN_NO_PRODUCTION_FINGERPRINT"
    candidate_source = $candidate
    candidate_sha256 = $candidateHash
    tracked_status = "redesign:$currentStatus;main:$mainStatus;feature:$featureStatus;original:$originalState"
    recommended_action = if ($currentStatus -eq "MISSING") { "BLOCK_AND_RECONCILE_WITH_PRODUCTION" } else { "VERIFY_AGAINST_PRODUCTION_BEFORE_USE" }
    notes = $notes
  })
}
$parent = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
$rows | Export-Csv -LiteralPath $OutputPath -NoTypeInformation -Encoding utf8
Write-Output "ROWS=$($rows.Count)"
Write-Output "OTHER_REF_COUNT=$($otherRefs.Count)"
Write-Output "AUTHORITATIVE_SOURCE_BASELINE=BLOCKED"
Write-Output "OUTPUT_PATH=$OutputPath"
