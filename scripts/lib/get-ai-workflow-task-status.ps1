$ErrorActionPreference = "Stop"
try {
  $task = Get-ScheduledTask -TaskName "ENHE AI Workflow Collector" -ErrorAction SilentlyContinue
  if ($null -eq $task) {
    [Console]::Out.Write('{"registered":false,"enabled":false}')
    exit 0
  }
  $enabled = [bool]$task.Settings.Enabled
  [Console]::Out.Write((@{ registered = $true; enabled = $enabled } | ConvertTo-Json -Compress))
} catch {
  [Console]::Out.Write('{"registered":false,"enabled":false}')
  exit 1
}
