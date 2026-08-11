[CmdletBinding()]
param(
  [uri]$SitemapUri = [uri]"https://www.enhe-tech.com.cn/sitemap.xml",
  [string]$OutputDirectory = (Join-Path (Get-Location) "docs\enhe-redesign\phase-1b-gates"),
  [ValidateRange(1, 2)]
  [int]$MaxConcurrency = 1,
  [ValidateRange(0, 60000)]
  [int]$DelayMilliseconds = 350,
  [string]$UserAgent = "ENHE-Redesign-ReadOnly-Audit/1.0"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

if ($UserAgent -ne "ENHE-Redesign-ReadOnly-Audit/1.0") {
  throw "The audit User-Agent is fixed by the Phase 1B contract."
}

$sitemapBytes = $null
$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds(45)

function Get-HeaderValue {
  param(
    [System.Net.Http.HttpResponseMessage]$Response,
    [string]$Name
  )
  $value = $null
  if ($Response.Headers.TryGetValues($Name, [ref]$value)) { return ($value -join ", ") }
  if ($Response.Content.Headers.TryGetValues($Name, [ref]$value)) { return ($value -join ", ") }
  return ""
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
  $match = [regex]::Match($Body, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if ($match.Success) { return [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value).Trim() }
  return ""
}

function Invoke-PageAudit {
  param([uri]$Uri)
  $sourceUrl = $Uri.AbsoluteUri
  $current = $Uri
  $firstRedirect = ""
  $response = $null
  $errorText = ""
  try {
    for ($hop = 0; $hop -lt 6; $hop++) {
      $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $current)
      $request.Headers.UserAgent.ParseAdd($UserAgent)
      $response = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
      $location = Get-HeaderValue -Response $response -Name "Location"
      if ($response.StatusCode.value__ -ge 300 -and $response.StatusCode.value__ -lt 400 -and $location) {
        if (-not $firstRedirect) { $firstRedirect = $location }
        $next = [uri]::new($current, $location)
        $response.Dispose()
        $current = $next
        continue
      }
      break
    }

    $body = Read-ResponseBody -Response $response
    $title = Get-MatchValue -Body $body -Pattern '<title[^>]*>(.*?)</title>'
    $canonical = Get-MatchValue -Body $body -Pattern '<link[^>]+rel=["'']canonical["''][^>]+href=["'']([^"'']+)["'']'
    if (-not $canonical) { $canonical = Get-MatchValue -Body $body -Pattern '<link[^>]+href=["'']([^"'']+)["''][^>]+rel=["'']canonical["'']' }
    $robots = Get-MatchValue -Body $body -Pattern '<meta[^>]+name=["'']robots["''][^>]+content=["'']([^"'']+)["'']'
    $language = Get-HeaderValue -Response $response -Name "Content-Language"
    $h1Count = ([regex]::Matches($body, '<h1(?=\s|>)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
    $hreflangZh = Get-MatchValue -Body $body -Pattern '<link[^>]+hreflang=["''](?:zh-CN|zh)["''][^>]+href=["'']([^"'']+)["'']'
    $hreflangEn = Get-MatchValue -Body $body -Pattern '<link[^>]+hreflang=["'']en(?:-US)?["''][^>]+href=["'']([^"'']+)["'']'
    $hreflangDefault = Get-MatchValue -Body $body -Pattern '<link[^>]+hreflang=["'']x-default["''][^>]+href=["'']([^"'']+)["'']'
    $types = [System.Collections.Generic.List[string]]::new()
    foreach ($match in [regex]::Matches($body, '"@type"\s*:\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
      if (-not $types.Contains($match.Groups[1].Value)) { $types.Add($match.Groups[1].Value) }
    }
    $cacheControl = Get-HeaderValue -Response $response -Name "Cache-Control"
    $exposure = [ordered]@{
      file_url_exposed = [bool]($body -match '(?i)fileUrl')
      file_path_exposed = [bool]($body -match '(?i)filePath')
      object_key_exposed = [bool]($body -match '(?i)objectKey')
      signed_url_exposed = [bool]($body -match '(?i)(signedUrl|X-Amz-Signature|Signature=)')
      download_url_exposed = [bool]($body -match '(?i)downloadUrl')
      uploads_path_exposed = [bool]($body -match '(?i)(https?://[^"'' <]+)?/uploads/')
      cos_path_exposed = [bool]($body -match '(?i)cos://|\.cos\.[^"'' <]+')
      public_immutable_cache = [bool]($cacheControl -match '(?i)immutable')
    }
    [pscustomobject]@{
      url = $sourceUrl
      source = "sitemap.xml"
      http_status = [int]$response.StatusCode
      redirect_target = $firstRedirect
      final_url = $current.AbsoluteUri
      title = $title
      h1_count = $h1Count
      canonical = $canonical
      robots_meta = $robots
      content_language = $language
      hreflang_zh = $hreflangZh
      hreflang_en = $hreflangEn
      hreflang_x_default = $hreflangDefault
      json_ld_types = ($types -join "|")
      sitemap_included = "YES"
      response_content_type = Get-HeaderValue -Response $response -Name "Content-Type"
      file_url_exposed = $exposure.file_url_exposed
      file_path_exposed = $exposure.file_path_exposed
      object_key_exposed = $exposure.object_key_exposed
      signed_url_exposed = $exposure.signed_url_exposed
      download_url_exposed = $exposure.download_url_exposed
      uploads_path_exposed = $exposure.uploads_path_exposed
      cos_path_exposed = $exposure.cos_path_exposed
      public_immutable_cache = $exposure.public_immutable_cache
      observed_at = (Get-Date).ToUniversalTime().ToString("o")
      error = ""
    }
  } catch {
    [pscustomobject]@{
      url = $sourceUrl; source = "sitemap.xml"; http_status = ""; redirect_target = $firstRedirect; final_url = $current.AbsoluteUri
      title = ""; h1_count = ""; canonical = ""; robots_meta = ""; content_language = ""; hreflang_zh = ""; hreflang_en = ""; hreflang_x_default = ""; json_ld_types = ""; sitemap_included = "YES"; response_content_type = ""
      file_url_exposed = $false; file_path_exposed = $false; object_key_exposed = $false; signed_url_exposed = $false; download_url_exposed = $false; uploads_path_exposed = $false; cos_path_exposed = $false; public_immutable_cache = $false
      observed_at = (Get-Date).ToUniversalTime().ToString("o"); error = $_.Exception.Message
    }
  } finally { if ($response) { $response.Dispose() } }
}

try {
  $sitemapRequest = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $SitemapUri)
  $sitemapRequest.Headers.UserAgent.ParseAdd($UserAgent)
  $sitemapResponse = $client.SendAsync($sitemapRequest).GetAwaiter().GetResult()
  $sitemapBytes = $sitemapResponse.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  $sitemapStatus = [int]$sitemapResponse.StatusCode
  $sitemapHeaders = @{
    cache_control = Get-HeaderValue -Response $sitemapResponse -Name "Cache-Control"
    content_type = Get-HeaderValue -Response $sitemapResponse -Name "Content-Type"
    content_language = Get-HeaderValue -Response $sitemapResponse -Name "Content-Language"
  }
  $sitemapResponse.Dispose()
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try { $sitemapHash = [BitConverter]::ToString($sha256.ComputeHash($sitemapBytes)).Replace("-", "") } finally { $sha256.Dispose() }
  $sitemapText = [System.Text.Encoding]::UTF8.GetString($sitemapBytes)
  $urls = [System.Collections.Generic.List[string]]::new()
  foreach ($match in [regex]::Matches($sitemapText, '<loc>\s*(.*?)\s*</loc>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)) {
    $url = [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value).Trim()
    if ($url -and -not $urls.Contains($url)) { $urls.Add($url) }
  }
  if (-not (Test-Path -LiteralPath $OutputDirectory)) { New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null }
  $rows = [System.Collections.Generic.List[object]]::new()
  for ($i = 0; $i -lt $urls.Count; $i++) {
    $rows.Add((Invoke-PageAudit -Uri ([uri]$urls[$i])))
    if ($i -lt ($urls.Count - 1) -and $DelayMilliseconds -gt 0) { Start-Sleep -Milliseconds $DelayMilliseconds }
    if (($i + 1) % 25 -eq 0) { Write-Host ("PROGRESS={0}/{1}" -f ($i + 1), $urls.Count) }
  }
  $csvPath = Join-Path $OutputDirectory "02-R006-PUBLIC-URL-BASELINE.csv"
  $rows | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding utf8
  $summary = [ordered]@{
    SITEMAP_URI = $SitemapUri.AbsoluteUri
    SITEMAP_HTTP_STATUS = $sitemapStatus
    SITEMAP_URL_COUNT = $urls.Count
    SITEMAP_UNIQUE_URL_COUNT = ($urls | Select-Object -Unique).Count
    SITEMAP_SHA256 = $sitemapHash
    SITEMAP_CONTENT_TYPE = $sitemapHeaders.content_type
    SITEMAP_CACHE_CONTROL = $sitemapHeaders.cache_control
    SITEMAP_CONTENT_LANGUAGE = $sitemapHeaders.content_language
    URL_FETCH_COUNT = $rows.Count
    URL_FETCH_ERRORS = @($rows | Where-Object { $_.error }).Count
    MAX_CONCURRENCY = $MaxConcurrency
    DELAY_MILLISECONDS = $DelayMilliseconds
    USER_AGENT = $UserAgent
    CSV_PATH = $csvPath
    OBSERVED_AT = (Get-Date).ToUniversalTime().ToString("o")
  }
  $summary.GetEnumerator() | ForEach-Object { "{0}={1}" -f $_.Key, $_.Value }
} finally { $client.Dispose() }
