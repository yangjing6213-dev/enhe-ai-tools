[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$ProductionGitSha,
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$RuntimeImageRevision,
  [string]$ProductionSourceCsv = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b1\03-PRODUCTION-SOURCE-FILE-HASHES.csv"),
  [string]$PublicBaselineCsv = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b0\03-R006-PUBLIC-URL-BASELINE-V2.csv"),
  [string]$PreviousDiffCsv = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b0\04-R006-DIFF-V2.csv"),
  [string]$R006OutputPath = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b1\11-R006-AUTHORITATIVE-DIFF-V3.csv")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$productionRows = @(Import-Csv -LiteralPath $ProductionSourceCsv)
if ($productionRows.Count -ne 6) { throw "Expected six production source rows." }

function Get-GitBlobSha256 {
  param([string]$Ref, [string]$Path)
  $spec = "{0}:{1}" -f $Ref, $Path
  $processInfo = [Diagnostics.ProcessStartInfo]::new()
  $processInfo.FileName = "git"
  $processInfo.Arguments = "cat-file blob `"$spec`""
  $processInfo.UseShellExecute = $false
  $processInfo.CreateNoWindow = $true
  $processInfo.RedirectStandardOutput = $true
  $processInfo.RedirectStandardError = $true
  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $processInfo
  try {
    [void]$process.Start()
    $memory = [IO.MemoryStream]::new()
    try {
      $process.StandardOutput.BaseStream.CopyTo($memory)
      $process.WaitForExit()
      if ($process.ExitCode -ne 0) { return "" }
      $hasher = [Security.Cryptography.SHA256]::Create()
      try {
        return [BitConverter]::ToString($hasher.ComputeHash($memory.ToArray())).Replace("-", "").ToLowerInvariant()
      } finally {
        $hasher.Dispose()
      }
    } finally {
      $memory.Dispose()
    }
  } finally {
    $process.Dispose()
  }
}

function Get-CandidateResult {
  param([string]$Label, [string]$Ref)
  $resolved = (& git rev-parse --verify $Ref 2>$null)
  if ($LASTEXITCODE -ne 0 -or -not $resolved) {
    return [pscustomobject]@{ label = $Label; ref = $Ref; commit = ""; match = 0; exists = 0; full = "NO" }
  }
  $match = 0
  $exists = 0
  foreach ($row in $productionRows) {
    $hash = Get-GitBlobSha256 -Ref $Ref -Path $row.path
    if ($hash) { $exists++ }
    if ($hash -and $hash -eq ([string]$row.sha256).ToLowerInvariant()) { $match++ }
  }
  return [pscustomobject]@{
    label = $Label
    ref = $Ref
    commit = ([string]$resolved).Trim()
    match = $match
    exists = $exists
    full = if ($match -eq $productionRows.Count) { "YES" } else { "NO" }
  }
}

$named = @(
  Get-CandidateResult -Label "current_redesign" -Ref "HEAD"
  Get-CandidateResult -Label "local_main" -Ref "main"
  Get-CandidateResult -Label "feature_branch" -Ref "feature/enhe-api-gateway"
  Get-CandidateResult -Label "historical" -Ref "f3500ddf45a65211b017930b48324659ca1795a6"
  Get-CandidateResult -Label "production_commit" -Ref $ProductionGitSha
)

$allRefs = @(& git for-each-ref --format='%(refname:short)' refs/heads refs/remotes)
$fullRefs = [System.Collections.Generic.List[string]]::new()
foreach ($ref in $allRefs) {
  $candidate = Get-CandidateResult -Label "other_ref" -Ref $ref
  if ($candidate.full -eq "YES") { $fullRefs.Add($ref) }
}

$productionCandidate = $named | Where-Object label -eq "production_commit" | Select-Object -First 1
$runtimeConfirmed = $RuntimeImageRevision -eq $ProductionGitSha -and $productionCandidate.full -eq "YES"

function Convert-AppTreePathToRoute {
  param([string]$TreePath)
  $relative = $TreePath.Substring("src/app/".Length)
  $segments = @($relative.Split("/") | Where-Object {
    $_ -and $_ -notmatch '^\(.+\)$' -and $_ -notmatch '^@' -and $_ -notin @("page.tsx", "route.ts")
  } | ForEach-Object {
    if ($_ -match '^\[\.\.\.(.+)\]$') { "*$($Matches[1])" }
    elseif ($_ -match '^\[\[\.\.\.(.+)\]\]$') { "*$($Matches[1])?" }
    elseif ($_ -match '^\[(.+)\]$') { ":$($Matches[1])" }
    else { $_ }
  })
  if (-not $segments.Count) { return "/" }
  return "/" + ($segments -join "/")
}

function Test-RouteMatch {
  param([string]$Path, [string]$Pattern)
  $pathSegments = @($Path.Trim("/").Split("/", [StringSplitOptions]::RemoveEmptyEntries))
  $patternSegments = @($Pattern.Trim("/").Split("/", [StringSplitOptions]::RemoveEmptyEntries))
  if ($Pattern -eq "/") { return $Path -eq "/" }
  for ($index = 0; $index -lt $patternSegments.Count; $index++) {
    $segment = $patternSegments[$index]
    if ($segment.StartsWith("*")) {
      $optional = $segment.EndsWith("?")
      return $optional -or $index -lt $pathSegments.Count
    }
    if ($index -ge $pathSegments.Count) { return $false }
    if (-not $segment.StartsWith(":") -and $segment -ne $pathSegments[$index]) { return $false }
  }
  return $pathSegments.Count -eq $patternSegments.Count
}

function Get-RouteVisibility {
  param([string]$Pattern, [string]$RouteType)
  if ($RouteType -eq "api" -or $Pattern -match '^/(en/)?(admin|user|orders|api|payment|checkout)') { return "private" }
  if ($Pattern -match '^/(en/)?(login|register|search|validation)') { return "public-auth-or-utility" }
  return "public"
}

$treePaths = @(& git ls-tree -r --name-only $ProductionGitSha -- src/app)
$routeRows = [System.Collections.Generic.List[object]]::new()
foreach ($treePath in $treePaths) {
  if ($treePath -notmatch '/(page\.tsx|route\.ts)$') { continue }
  $pattern = Convert-AppTreePathToRoute -TreePath $treePath
  $type = if ($treePath -match '^src/app/api/' -or $treePath.EndsWith("/route.ts")) { "api" } else { "page" }
  $routeRows.Add([pscustomobject]@{
    pattern = $pattern
    type = $type
    visibility = Get-RouteVisibility -Pattern $pattern -RouteType $type
    source = $treePath
  })
}
$routeRows = @($routeRows | Sort-Object pattern,type,source -Unique)

$publicRows = @(Import-Csv -LiteralPath $PublicBaselineCsv)
$previousRows = @(Import-Csv -LiteralPath $PreviousDiffCsv)
$previousByUrl = @{}
foreach ($row in $previousRows) { if (-not ([string]$row.source_url).StartsWith("LOCAL_ONLY:")) { $previousByUrl[$row.source_url] = $row } }
$diffRows = [System.Collections.Generic.List[object]]::new()
$removePaths = @("/build-your-own-x", "/en/build-your-own-x", "/account-services")
$createPaths = @("/help", "/en/help", "/updates", "/en/updates")

foreach ($public in $publicRows) {
  $uri = [uri]$public.source_url
  $path = if ($uri.AbsolutePath.Length -gt 1) { $uri.AbsolutePath.TrimEnd("/") } else { "/" }
  $route = $routeRows | Where-Object { $_.type -eq "page" -and (Test-RouteMatch -Path $path -Pattern $_.pattern) } | Select-Object -First 1
  $old = if ($previousByUrl.ContainsKey($public.source_url)) { $previousByUrl[$public.source_url] } else { $null }
  $type = "MATCHED"
  $context = ""
  if ($public.final_http_status -eq "404" -and $path -in $createPaths) {
    $type = "CORE_404_PLANNED_CREATE"; $context = "Approved IA requires this page to be created."
  } elseif ($public.final_http_status -eq "404" -and $path -eq "/skill-learning/build-your-own-x") {
    $type = "CORE_404_REMOVE"; $context = "Approved IA removes Build Your Own X public content."
  } elseif ([int]$public.initial_http_status -ge 300 -and [int]$public.initial_http_status -lt 400 -and $public.core_contract_included -eq "YES") {
    $type = "CORE_REDIRECT"; $context = "Redirect exists; 301 versus 410 remains an owner decision."
  } elseif ($path -in $removePaths) {
    $type = "NEEDS_OWNER_DECISION"; $context = "Approved IA removes this content; redirect versus 410 needs traffic/link evidence."
  } elseif ($old -and $old.diff_type -in @("CONTENT_LANGUAGE_MISMATCH", "LANGUAGE_PARTNER_MISSING")) {
    $type = $old.diff_type; $context = "Public language evidence remains unchanged."
  } elseif (-not $route) {
    $type = "CODE_PRODUCTION_DRIFT"; $context = "Public URL has no matching authoritative source route."
  }
  $diffRows.Add([pscustomobject]@{
    source_url = $public.source_url
    source_type = $public.source_type
    route_pattern = if ($route) { $route.pattern } else { "" }
    diff_type = $type
    initial_http_status = $public.initial_http_status
    final_http_status = $public.final_http_status
    canonical = $public.canonical
    content_language = $public.content_language
    sitemap_included = $public.sitemap_included
    authoritative_ref = $ProductionGitSha
    decision_context = $context
    notes = "Public V2 observation reused; no full sitemap refetch."
  })
}

foreach ($route in $routeRows | Where-Object type -eq "page") {
  $covered = @($publicRows | Where-Object {
    $candidateUri = [uri]$_.source_url
    $candidatePath = if ($candidateUri.AbsolutePath.Length -gt 1) { $candidateUri.AbsolutePath.TrimEnd("/") } else { "/" }
    Test-RouteMatch -Path $candidatePath -Pattern $route.pattern
  }).Count -gt 0
  if ($covered) { continue }
  $type = if ($route.visibility -eq "public") { "LOCAL_ONLY_NEEDS_REVIEW" } else { "LOCAL_PRIVATE_EXPECTED" }
  $diffRows.Add([pscustomobject]@{
    source_url = "LOCAL_ONLY:$($route.pattern)"
    source_type = "local_route"
    route_pattern = $route.pattern
    diff_type = $type
    initial_http_status = ""
    final_http_status = ""
    canonical = ""
    content_language = ""
    sitemap_included = "NO"
    authoritative_ref = $ProductionGitSha
    decision_context = if ($type -eq "LOCAL_PRIVATE_EXPECTED") { "Private/auth/utility source route." } else { "Public local route is absent from V2 public baseline." }
    notes = $route.source
  })
}

$r006Parent = Split-Path -Parent $R006OutputPath
if (-not (Test-Path -LiteralPath $r006Parent)) { New-Item -ItemType Directory -Path $r006Parent -Force | Out-Null }
$diffRows | Export-Csv -LiteralPath $R006OutputPath -NoTypeInformation -Encoding utf8

$named | ForEach-Object {
  Write-Output "CANDIDATE|$($_.label)|$($_.ref)|$($_.commit)|$($_.match)|$($_.exists)|$($_.full)"
}
Write-Output "FULL_MATCH_LOCAL_REFS=$($fullRefs -join ';')"
Write-Output "PRODUCTION_SOURCE_MATCH_COUNT=$($productionCandidate.match)/$($productionRows.Count)"
Write-Output "AUTHORITATIVE_SOURCE_BASELINE=$(if ($runtimeConfirmed) { 'CONFIRMED_WITH_RUNTIME_IMAGE' } else { 'PARTIALLY_CONFIRMED' })"
Write-Output "AUTHORITATIVE_BASELINE_SHA=$ProductionGitSha"
Write-Output "PRODUCTION_RUNTIME_REVISION_MATCH=$(if ($RuntimeImageRevision -eq $ProductionGitSha) { 'YES' } else { 'NO' })"
Write-Output "AUTHORITATIVE_ROUTE_PATTERN_COUNT=$($routeRows.Count)"
Write-Output "R006_AUTHORITATIVE_ROW_COUNT=$($diffRows.Count)"
$diffRows | Group-Object diff_type | Sort-Object Name | ForEach-Object {
  Write-Output "R006_$($_.Name)=$($_.Count)"
}
