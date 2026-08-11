[CmdletBinding()]
param(
  [uri]$SitemapUri = [uri]"https://www.enhe-tech.com.cn/sitemap.xml",
  [string]$OutputDirectory = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b0"),
  [ValidateRange(1, 2)]
  [int]$MaxConcurrency = 1,
  [ValidateRange(350, 60000)]
  [int]$DelayMilliseconds = 350,
  [string]$UserAgent = "ENHE-Redesign-ReadOnly-Audit/1.1"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

if ($UserAgent -ne "ENHE-Redesign-ReadOnly-Audit/1.1") {
  throw "The audit User-Agent is fixed by the Phase 1B.0 contract."
}

# The contract permits at most two workers.  This collector deliberately runs
# one worker so the request interval is deterministic and easy to audit.
$effectiveConcurrency = 1
$script:lastRequestAt = [DateTime]::MinValue
$script:requestCount = 0

$corePaths = @(
  "/", "/en", "/software", "/en/software", "/skill-learning", "/en/skill-learning",
  "/ai-news", "/en/ai-news", "/ai-trends", "/en/ai-trends", "/about", "/en/about",
  "/help", "/en/help", "/updates", "/en/updates", "/online-tools", "/account-services",
  "/ai-topics", "/product-demos", "/build-your-own-x", "/skill-learning/build-your-own-x",
  "/ai-skills", "/en/ai-skills"
)

$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$handler.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(45)

function Get-HeaderValue {
  param(
    [System.Net.Http.HttpResponseMessage]$Response,
    [string]$Name
  )
  [string[]]$values = $null
  if ($Response.Headers.TryGetValues($Name, [ref]$values)) { return ($values -join ", ") }
  if ($Response.Content.Headers.TryGetValues($Name, [ref]$values)) { return ($values -join ", ") }
  return ""
}

function Wait-RequestSlot {
  $now = [DateTime]::UtcNow
  if ($script:lastRequestAt -ne [DateTime]::MinValue) {
    $elapsed = ($now - $script:lastRequestAt).TotalMilliseconds
    if ($elapsed -lt $DelayMilliseconds) { Start-Sleep -Milliseconds ([int]($DelayMilliseconds - $elapsed)) }
  }
  $script:lastRequestAt = [DateTime]::UtcNow
  $script:requestCount++
}

function Get-SafeUriString {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  try {
    $u = [uri]$Value
    if ($u.IsAbsoluteUri) { return ("{0}://{1}{2}" -f $u.Scheme, $u.Authority, $u.AbsolutePath) }
  } catch { }
  return (($Value -split "[?#]", 2)[0]).Trim()
}

function Get-SafeError {
  param([System.Exception]$Exception)
  $message = if ($Exception) { $Exception.GetType().Name } else { "UnknownError" }
  return ($message -replace "[^A-Za-z0-9_.-]", "_")
}

function Read-ResponseBody {
  param([System.Net.Http.HttpResponseMessage]$Response)
  $contentType = (Get-HeaderValue -Response $Response -Name "Content-Type").ToLowerInvariant()
  $length = $Response.Content.Headers.ContentLength
  if ($contentType -notmatch "text/html|application/xhtml\+xml") { return "" }
  if ($null -ne $length -and $length -gt 2097152) { return "" }
  return $Response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
}

function Get-MatchValue {
  param([string]$Body, [string]$Pattern)
  if ([string]::IsNullOrEmpty($Body)) { return "" }
  $match = [regex]::Match($Body, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if ($match.Success) { return [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value).Trim() }
  return ""
}

function Get-LinkHref {
  param([string]$Body, [string]$Attribute, [string]$ValuePattern)
  $patterns = @(
    ('<link[^>]*' + $Attribute + '\s*=\s*["'']' + $ValuePattern + '["''][^>]*href\s*=\s*["'']([^"'']+)["'']'),
    ('<link[^>]*href\s*=\s*["'']([^"'']+)["''][^>]*' + $Attribute + '\s*=\s*["'']' + $ValuePattern + '["'']')
  )
  foreach ($pattern in $patterns) {
    $value = Get-MatchValue -Body $Body -Pattern $pattern
    if ($value) { return (Get-SafeUriString -Value $value) }
  }
  return ""
}

function Get-JsonLdTypes {
  param([string]$Body)
  $types = [System.Collections.Generic.List[string]]::new()
  if ([string]::IsNullOrEmpty($Body)) { return "" }
  foreach ($match in [regex]::Matches($Body, '"@type"\s*:\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    $type = $match.Groups[1].Value.Trim()
    if ($type -and -not $types.Contains($type)) { $types.Add($type) }
  }
  return ($types -join "|")
}

function Invoke-PageAudit {
  param(
    [uri]$Uri,
    [string]$SourceType,
    [bool]$SitemapIncluded,
    [bool]$CoreContractIncluded
  )
  $sourceUrl = Get-SafeUriString -Value $Uri.AbsoluteUri
  $current = $Uri
  $firstRedirect = ""
  $redirects = [System.Collections.Generic.List[string]]::new()
  $initialStatus = ""
  $finalStatus = ""
  $response = $null
  $body = ""
  $errorText = ""
  try {
    for ($hop = 0; $hop -le 5; $hop++) {
      Wait-RequestSlot
      $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $current)
      $request.Headers.UserAgent.ParseAdd($UserAgent)
      try {
        $response = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
      } finally { $request.Dispose() }
      $status = [int]$response.StatusCode
      if ($hop -eq 0) { $initialStatus = $status }
      $finalStatus = $status
      $location = Get-HeaderValue -Response $response -Name "Location"
      if ($status -ge 300 -and $status -lt 400 -and $location) {
        if ($hop -eq 5) { $errorText = "REDIRECT_HOP_LIMIT_EXCEEDED"; break }
        $next = [uri]::new($current, $location)
        $safeNext = Get-SafeUriString -Value $next.AbsoluteUri
        if (-not $firstRedirect) { $firstRedirect = $safeNext }
        $redirects.Add(("{0} [{1}]" -f $safeNext, $status))
        $response.Dispose(); $response = $null
        $current = $next
        continue
      }
      $body = Read-ResponseBody -Response $response
      break
    }
    if ($response) {
      $title = Get-MatchValue -Body $body -Pattern '<title[^>]*>(.*?)</title>'
      $canonical = Get-LinkHref -Body $body -Attribute 'rel' -ValuePattern '(?i:canonical)'
      $robots = Get-MatchValue -Body $body -Pattern '<meta[^>]+name\s*=\s*[\"'']robots[\"''][^>]+content\s*=\s*[\"'']([^\"'']+)[\"'']'
      if (-not $robots) { $robots = Get-MatchValue -Body $body -Pattern '<meta[^>]+content\s*=\s*[\"'']([^\"'']+)[\"''][^>]+name\s*=\s*[\"'']robots[\"'']' }
      $language = Get-HeaderValue -Response $response -Name "Content-Language"
      if (-not $language) { $language = Get-MatchValue -Body $body -Pattern '<html[^>]+lang\s*=\s*[\"'']([^\"'']+)[\"'']' }
      $hreflangZh = Get-LinkHref -Body $body -Attribute 'hreflang' -ValuePattern '(?i:zh(?:-CN)?)'
      $hreflangEn = Get-LinkHref -Body $body -Attribute 'hreflang' -ValuePattern '(?i:en(?:-US)?)'
      $hreflangDefault = Get-LinkHref -Body $body -Attribute 'hreflang' -ValuePattern '(?i:x-default)'
      $h1Count = if ($body) { ([regex]::Matches($body, '<h1(?=\s|>)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count } else { 0 }
      [pscustomobject]@{
        source_url = $sourceUrl
        source_type = $SourceType
        initial_http_status = $initialStatus
        first_redirect_target = $firstRedirect
        redirect_chain = ($redirects -join " -> ")
        redirect_hop_count = $redirects.Count
        final_url = Get-SafeUriString -Value $current.AbsoluteUri
        final_http_status = $finalStatus
        title = $title
        h1_count = $h1Count
        canonical = Get-SafeUriString -Value $canonical
        robots_meta = $robots
        content_language = $language
        hreflang_zh = $hreflangZh
        hreflang_en = $hreflangEn
        hreflang_x_default = $hreflangDefault
        json_ld_types = Get-JsonLdTypes -Body $body
        sitemap_included = if ($SitemapIncluded) { "YES" } else { "NO" }
        core_contract_included = if ($CoreContractIncluded) { "YES" } else { "NO" }
        response_content_type = Get-HeaderValue -Response $response -Name "Content-Type"
        cache_control = Get-HeaderValue -Response $response -Name "Cache-Control"
        observed_at = (Get-Date).ToUniversalTime().ToString("o")
        error = $errorText
      }
    } else {
      throw "NoResponse"
    }
  } catch {
    if (-not $errorText) { $errorText = Get-SafeError -Exception $_.Exception }
    [pscustomobject]@{
      source_url = $sourceUrl; source_type = $SourceType; initial_http_status = $initialStatus
      first_redirect_target = $firstRedirect; redirect_chain = ($redirects -join " -> "); redirect_hop_count = $redirects.Count
      final_url = Get-SafeUriString -Value $current.AbsoluteUri; final_http_status = $finalStatus
      title = ""; h1_count = ""; canonical = ""; robots_meta = ""; content_language = ""
      hreflang_zh = ""; hreflang_en = ""; hreflang_x_default = ""; json_ld_types = ""
      sitemap_included = if ($SitemapIncluded) { "YES" } else { "NO" }
      core_contract_included = if ($CoreContractIncluded) { "YES" } else { "NO" }
      response_content_type = ""; cache_control = ""; observed_at = (Get-Date).ToUniversalTime().ToString("o"); error = $errorText
    }
  } finally { if ($response) { $response.Dispose() } }
}

try {
  $sitemapResponse = $null
  if (-not (Test-Path -LiteralPath $OutputDirectory)) { New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null }
  Wait-RequestSlot
  $sitemapRequest = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $SitemapUri)
  $sitemapRequest.Headers.UserAgent.ParseAdd($UserAgent)
  try { $sitemapResponse = $client.SendAsync($sitemapRequest).GetAwaiter().GetResult() } finally { $sitemapRequest.Dispose() }
  $sitemapStatus = [int]$sitemapResponse.StatusCode
  if ($sitemapStatus -ge 300 -and $sitemapStatus -lt 400) { throw "SITEMAP_REDIRECT_STATUS_$sitemapStatus" }
  $sitemapBytes = $sitemapResponse.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  [string[]]$sitemapCacheValues = $null
  $sitemapCache = if ($sitemapResponse.Headers.TryGetValues("Cache-Control", [ref]$sitemapCacheValues)) { $sitemapCacheValues -join ", " } else { "" }
  $sitemapContentType = Get-HeaderValue -Response $sitemapResponse -Name "Content-Type"
  $sitemapResponse.Dispose()
  $hash = [System.Security.Cryptography.SHA256]::Create()
  try { $sitemapHash = [BitConverter]::ToString($hash.ComputeHash($sitemapBytes)).Replace("-", "") } finally { $hash.Dispose() }
  $sitemapText = [Text.Encoding]::UTF8.GetString($sitemapBytes)
  $urlMap = [System.Collections.Generic.Dictionary[string,object]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($match in [regex]::Matches($sitemapText, '<loc>\s*(.*?)\s*</loc>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)) {
    $raw = [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value).Trim()
    if (-not $raw) { continue }
    $safe = Get-SafeUriString -Value $raw
    if (-not $urlMap.ContainsKey($safe)) { $urlMap[$safe] = [pscustomobject]@{ uri = [uri]$raw; sitemap = $true; core = $false } }
  }
  $origin = "{0}://{1}" -f $SitemapUri.Scheme, $SitemapUri.Authority
  foreach ($path in $corePaths) {
    $raw = "$origin$path"
    $safe = Get-SafeUriString -Value $raw
    if ($urlMap.ContainsKey($safe)) { $urlMap[$safe].core = $true }
    else { $urlMap[$safe] = [pscustomobject]@{ uri = [uri]$raw; sitemap = $false; core = $true } }
  }
  $rows = [System.Collections.Generic.List[object]]::new()
  foreach ($entry in $urlMap.GetEnumerator()) {
    $sourceType = if ($entry.Value.sitemap) { "sitemap" } else { "core_contract" }
    $rows.Add((Invoke-PageAudit -Uri $entry.Value.uri -SourceType $sourceType -SitemapIncluded:$entry.Value.sitemap -CoreContractIncluded:$entry.Value.core))
    if (($rows.Count % 25) -eq 0) { Write-Host ("PROGRESS={0}/{1}" -f $rows.Count, $urlMap.Count) }
  }
  $csvPath = Join-Path $OutputDirectory "03-R006-PUBLIC-URL-BASELINE-V2.csv"
  $rows | Sort-Object source_url | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding utf8
  $initialRedirects = @($rows | Where-Object { $_.initial_http_status -in @("301", "302") }).Count
  $final200 = @($rows | Where-Object { $_.final_http_status -eq "200" }).Count
  $errors = @($rows | Where-Object { $_.error }).Count
  ([ordered]@{
    SITEMAP_URI = Get-SafeUriString -Value $SitemapUri.AbsoluteUri
    SITEMAP_HTTP_STATUS = $sitemapStatus
    SITEMAP_URL_COUNT = @($urlMap.Values | Where-Object sitemap).Count
    CORE_URL_COUNT = @($urlMap.Values | Where-Object core).Count
    UNION_URL_COUNT = $urlMap.Count
    SITEMAP_SHA256 = $sitemapHash
    SITEMAP_CONTENT_TYPE = $sitemapContentType
    SITEMAP_CACHE_CONTROL = $sitemapCache
    URL_FETCH_COUNT = $rows.Count
    INITIAL_REDIRECT_COUNT = $initialRedirects
    FINAL_200_COUNT = $final200
    FETCH_ERRORS = $errors
    MAX_CONCURRENCY = $effectiveConcurrency
    REQUEST_COUNT = $script:requestCount
    DELAY_MILLISECONDS = $DelayMilliseconds
    USER_AGENT = $UserAgent
    CSV_PATH = $csvPath
    OBSERVED_AT = (Get-Date).ToUniversalTime().ToString("o")
  }).GetEnumerator() | ForEach-Object { "{0}={1}" -f $_.Key, $_.Value }
} finally {
  if ($sitemapResponse) { $sitemapResponse.Dispose() }
  $client.Dispose(); $handler.Dispose()
}
