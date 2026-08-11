[CmdletBinding()]
param(
  [uri]$ProbeUri = [uri]"https://www.enhe-tech.com.cn/",
  [string]$UserAgent = "ENHE-Redesign-ReadOnly-Audit/1.0"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http
if ($UserAgent -ne "ENHE-Redesign-ReadOnly-Audit/1.0") { throw "Fixed audit User-Agent required." }
$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds(30)
try {
  $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Head, $ProbeUri)
  $request.Headers.UserAgent.ParseAdd($UserAgent)
  try {
    $response = $client.SendAsync($request).GetAwaiter().GetResult()
    Write-Output ("PROBE_HTTP_STATUS={0}" -f [int]$response.StatusCode)
    foreach ($name in @("ETag", "Last-Modified", "Cache-Control", "Content-Type", "Server", "X-Powered-By", "X-Nextjs-Cache", "X-Vercel-Id")) {
      $values = $null
      if ($response.Headers.TryGetValues($name, [ref]$values) -or $response.Content.Headers.TryGetValues($name, [ref]$values)) {
        Write-Output ("HEADER_{0}={1}" -f ($name -replace "[^A-Za-z0-9]", "_"), ($values -join ", "))
      }
    }
  } finally { if ($response) { $response.Dispose() } }
} catch {
  Write-Output "PROBE_STATUS=UNAVAILABLE"
  Write-Output "PROBE_ERROR_CLASS=$($_.Exception.GetType().FullName)"
} finally { $client.Dispose() }

Write-Output "PRODUCTION_GIT_SHA=UNAVAILABLE"
Write-Output "PRODUCTION_IMAGE_DIGEST=UNAVAILABLE"
Write-Output "PRODUCTION_MIGRATION_VERSION=UNAVAILABLE"
Write-Output "PRODUCTION_ROUTE_CONFIG_HASH=UNAVAILABLE"
Write-Output "PRODUCTION_FILE_METADATA=NOT_COLLECTED"
Write-Output "READ_ONLY=YES"
