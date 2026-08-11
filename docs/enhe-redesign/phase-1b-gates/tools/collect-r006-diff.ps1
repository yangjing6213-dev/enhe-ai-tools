[CmdletBinding()]
param(
  [string]$BaselineCsv = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b-gates\02-R006-PUBLIC-URL-BASELINE.csv"),
  [string]$LocalCsv = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b-gates\03-R006-LOCAL-ROUTE-INVENTORY.csv"),
  [string]$OutputPath = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b-gates\04-R006-DIFF-REPORT.csv")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-RouteMatch {
  param([string]$Path, [string]$Pattern)
  $actual = @($Path.Trim("/").Split("/", [System.StringSplitOptions]::RemoveEmptyEntries))
  $expected = @($Pattern.Trim("/").Split("/", [System.StringSplitOptions]::RemoveEmptyEntries))
  if ($actual.Count -eq 0 -and $expected.Count -eq 0) { return $true }
  if ($expected.Count -ne $actual.Count -and ($expected.Count -eq 0 -or -not ($expected[-1] -like "*"))) { return $false }
  for ($i = 0; $i -lt $expected.Count; $i++) {
    if ($expected[$i].StartsWith(":") -or $expected[$i].StartsWith("*")) { return $true }
    if ($i -ge $actual.Count -or $expected[$i] -ne $actual[$i]) { return $false }
  }
  return $expected.Count -eq $actual.Count
}

$baseline = @(Import-Csv -LiteralPath $BaselineCsv)
$local = @(Import-Csv -LiteralPath $LocalCsv | Where-Object { $_.route_type -eq "page" -and $_.private_or_public -in @("public", "public-auth") })
$diffs = [System.Collections.Generic.List[object]]::new()

foreach ($row in $baseline) {
  $uri = [uri]$row.url
  $path = $uri.AbsolutePath
  $matches = @($local | Where-Object {
    $candidate = $_.route_pattern
    if ($_.locale -eq "en") { $candidate = if ($candidate -eq "/") { "/en" } else { "/en" + $candidate } }
    Test-RouteMatch -Path $path -Pattern $candidate
  })
  $matchedPattern = if ($matches.Count) {
    if ($matches[0].locale -eq "en") { if ($matches[0].route_pattern -eq "/") { "/en" } else { "/en" + $matches[0].route_pattern } } else { $matches[0].route_pattern }
  } else { "" }
  $common = @{ url = $row.url; route_pattern = $matchedPattern; observed_status = $row.http_status; canonical = $row.canonical; notes = "" }
  if ($matches.Count -eq 0) {
    $diffs.Add([pscustomobject]@{ url = $common.url; route_pattern = $common.route_pattern; diff_type = "CODE_PRODUCTION_DRIFT"; observed_status = $common.observed_status; canonical = $common.canonical; notes = "sitemap URL has no matching public local page pattern" })
    continue
  }
  if ($row.redirect_target) { $diffs.Add([pscustomobject]@{ url = $common.url; route_pattern = $common.route_pattern; diff_type = "SITEMAP_REDIRECT"; observed_status = $common.observed_status; canonical = $common.canonical; notes = $row.redirect_target }); continue }
  if ([int]$row.http_status -ge 400) { $diffs.Add([pscustomobject]@{ url = $common.url; route_pattern = $common.route_pattern; diff_type = "SITEMAP_404"; observed_status = $common.observed_status; canonical = $common.canonical; notes = "HTTP error in sitemap fetch" }); continue }
  if ($row.robots_meta -match "(?i)noindex") { $diffs.Add([pscustomobject]@{ url = $common.url; route_pattern = $common.route_pattern; diff_type = "SITEMAP_NOINDEX"; observed_status = $common.observed_status; canonical = $common.canonical; notes = $row.robots_meta }); continue }
  try { $canonicalPath = ([uri]$row.canonical).AbsolutePath } catch { $canonicalPath = "" }
  if ($canonicalPath -and $canonicalPath.TrimEnd("/") -ne $path.TrimEnd("/")) { $diffs.Add([pscustomobject]@{ url = $common.url; route_pattern = $common.route_pattern; diff_type = "CANONICAL_MISMATCH"; observed_status = $common.observed_status; canonical = $common.canonical; notes = "canonical path differs from sitemap URL" }); continue }
  if (-not $row.hreflang_x_default -or -not $row.hreflang_zh) { $diffs.Add([pscustomobject]@{ url = $common.url; route_pattern = $common.route_pattern; diff_type = "HREFLANG_MISMATCH"; observed_status = $common.observed_status; canonical = $common.canonical; notes = "required x-default or zh-CN alternate missing" }); continue }
  if ($path -notmatch "^/en(?:/|$)" -and -not $row.hreflang_en) { $diffs.Add([pscustomobject]@{ url = $common.url; route_pattern = $common.route_pattern; diff_type = "LANGUAGE_PARTNER_MISSING"; observed_status = $common.observed_status; canonical = $common.canonical; notes = "HTTP/local route/canonical aligned, but public HTML had no hreflang_en partner" }); continue }
  $diffs.Add([pscustomobject]@{ url = $common.url; route_pattern = $common.route_pattern; diff_type = "MATCHED"; observed_status = $common.observed_status; canonical = $common.canonical; notes = "public sitemap, HTTP, local route and canonical aligned at observed time" })
}

$corePaths = @("/", "/en", "/software", "/en/software", "/skill-learning", "/en/skill-learning", "/ai-news", "/en/ai-news", "/ai-trends", "/en/ai-trends", "/about", "/en/about", "/help", "/en/help", "/updates", "/en/updates", "/online-tools", "/account-services", "/ai-topics", "/product-demos", "/skill-learning/build-your-own-x")
foreach ($corePath in $corePaths) {
  if (-not ($baseline.url -contains ("https://www.enhe-tech.com.cn" + $corePath))) {
    $diffs.Add([pscustomobject]@{ url = "https://www.enhe-tech.com.cn$corePath"; route_pattern = ""; diff_type = "NEEDS_DECISION"; observed_status = ""; canonical = ""; notes = "Phase 1A core URL not present in current sitemap" })
  }
}

$parent = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
$diffs | Export-Csv -LiteralPath $OutputPath -NoTypeInformation -Encoding utf8
Write-Output ("DIFF_ROWS={0}" -f $diffs.Count)
Write-Output ("MATCHED_ROWS={0}" -f @($diffs | Where-Object diff_type -EQ "MATCHED").Count)
Write-Output ("DIFF_PATH={0}" -f $OutputPath)
