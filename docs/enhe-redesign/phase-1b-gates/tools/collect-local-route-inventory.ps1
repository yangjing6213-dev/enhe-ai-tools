[CmdletBinding()]
param(
  [string]$RepositoryRoot = (Get-Location).Path,
  [string]$OutputPath = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b-gates\03-R006-LOCAL-ROUTE-INVENTORY.csv")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Convert-AppPathToRoute {
  param([string]$RelativePath)
  $parts = $RelativePath.Replace("\", "/").Split("/")
  $parts = @($parts | Where-Object { $_ -notmatch '^\([^/]+\)$' })
  if ($parts.Count -gt 0 -and $parts[0] -eq "en") { $parts = @($parts | Select-Object -Skip 1) }
  if ($parts.Count -eq 0) { return "/" }
  $parts = @($parts | ForEach-Object {
    if ($_ -eq "page.tsx" -or $_ -eq "route.ts") { return $null }
    if ($_ -match '^\[\.\.\.(.+)\]$') { return ("*" + $Matches[1]) }
    if ($_ -match '^\[\[(\.\.\.)?(.+)\]\]$') { return ("*" + $Matches[2] + "?") }
    if ($_ -match '^\[(.+)\]$') { return (":" + $Matches[1]) }
    return $_
  } | Where-Object { $_ })
  if ($parts.Count -eq 0) { return "/" }
  return "/" + ($parts -join "/")
}

function Get-Visibility {
  param([string]$Route, [string]$RouteType)
  if ($RouteType -eq "api" -or $Route -match '^/(admin|user|orders|api|payment|checkout)') { return "private" }
  if ($Route -match '^/(login|register)') { return "public-auth" }
  return "public"
}

$appRoot = Join-Path $RepositoryRoot "src\app"
$files = Get-ChildItem -LiteralPath $appRoot -Recurse -File | Where-Object { $_.Name -in @("page.tsx", "route.ts") }
$rows = [System.Collections.Generic.List[object]]::new()
foreach ($file in $files) {
  $relative = $file.FullName.Substring($RepositoryRoot.Length + 1).Replace("\", "/")
  $route = Convert-AppPathToRoute -RelativePath $relative.Substring(8)
  $isApi = $relative -match '^src/app/api/'
  $type = if ($isApi) { "api" } elseif ($file.Name -eq "route.ts") { "route" } else { "page" }
  $locale = if ($relative -match '^src/app/en/') { "en" } elseif ($relative -match '^src/app/\(zh-public\)/') { "zh" } else { "neutral" }
  $visibility = Get-Visibility -Route $route -RouteType $type
  $indexability = if ($visibility -eq "public") { "indexable-intent" } else { "noindex/private-intent" }
  $notes = if ($visibility -eq "public") { "public route pattern; verify sitemap/canonical at production" } else { "not a public content surface" }
  $rows.Add([pscustomobject]@{
    route_pattern = $route
    route_type = $type
    locale = $locale
    source_file = $relative
    indexability_intent = $indexability
    redirect_target = ""
    private_or_public = $visibility
    notes = $notes
  })
}

$nextConfig = Join-Path $RepositoryRoot "next.config.ts"
if (Test-Path -LiteralPath $nextConfig) {
  $config = Get-Content -Raw -LiteralPath $nextConfig
  foreach ($match in [regex]::Matches($config, 'source:\s*"([^"]+)"\s*,\s*destination:\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    $source = $match.Groups[1].Value
    $destination = $match.Groups[2].Value
    $rows.Add([pscustomobject]@{
      route_pattern = $source
      route_type = "redirect"
      locale = if ($source.StartsWith("/en/")) { "en" } else { "neutral" }
      source_file = "next.config.ts"
      indexability_intent = "redirect"
      redirect_target = $destination
      private_or_public = "public-legacy-or-alias"
      notes = "configured redirect; production behavior must be checked"
    })
  }
}

$rows.Add([pscustomobject]@{ route_pattern = "sitemap.xml"; route_type = "generator"; locale = "neutral"; source_file = "src/app/sitemap.ts"; indexability_intent = "public-index-control"; redirect_target = ""; private_or_public = "public-metadata"; notes = "dynamic sitemap; database-backed" })
$rows.Add([pscustomobject]@{ route_pattern = "public-slugs"; route_type = "configuration"; locale = "neutral"; source_file = "src/lib/public-slugs.ts"; indexability_intent = "canonical-source"; redirect_target = ""; private_or_public = "public-metadata"; notes = "canonical tool/news slug helpers" })

$parent = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
$rows | Sort-Object route_pattern,route_type,source_file | Export-Csv -LiteralPath $OutputPath -NoTypeInformation -Encoding utf8
Write-Output ("ROUTE_ROWS={0}" -f $rows.Count)
Write-Output ("CSV_PATH={0}" -f $OutputPath)
