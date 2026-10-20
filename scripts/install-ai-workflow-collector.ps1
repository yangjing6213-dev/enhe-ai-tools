param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$TaskName = "ENHE AI Workflow Collector"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($TaskName -cne "ENHE AI Workflow Collector") { throw "The collector uses one fixed Windows task name." }
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
foreach ($required in @("scripts\ai-workflow-collector.ts", "node_modules\tsx", "scripts\lib\read-protected-ai-workflow-token.ps1")) {
  if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot $required))) { throw "Required collector file is missing: $required" }
}

$runRoot = "E:\AiProject\各平台内容发布项目\ai-workflows\runs"
$runnerRoot = "E:\AiProject\各平台内容发布项目\ai-workflows\runner"
$null = New-Item -ItemType Directory -Force -Path $runRoot, $runnerRoot, (Join-Path $runnerRoot "state"), (Join-Path $runnerRoot "logs"), (Join-Path $runnerRoot "codex"), (Join-Path $runnerRoot "empty-github-config"), (Join-Path $runnerRoot "empty-docker-config")

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$userSid = $identity.User.Value
$icacls = Join-Path $env:SystemRoot "System32\icacls.exe"
foreach ($protectedPath in @($runRoot, $runnerRoot)) {
  $item = Get-Item -Force -LiteralPath $protectedPath
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "A protected workflow folder cannot be a junction or symbolic link." }
  & $icacls $protectedPath "/inheritance:r" "/remove:g" "*S-1-1-0" "*S-1-5-11" "*S-1-5-32-545" "*S-1-5-4" "/grant:r" "*$($userSid):(OI)(CI)F" "*S-1-5-18:(OI)(CI)F" "*S-1-5-32-544:(OI)(CI)F" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Unable to restrict a workflow folder's permissions." }
  $acl = Get-Acl -LiteralPath $protectedPath
  if ($acl.Access | Where-Object { $_.IdentityReference.Value -match "Authenticated Users|S-1-5-11|Everyone|S-1-1-0" }) {
    throw "A workflow folder still allows access by other signed-in users."
  }
}

$node = Get-Command node.exe -ErrorAction Stop
$python = Get-Command python.exe -ErrorAction Stop
$codex = Get-Command codex.exe -ErrorAction Stop
$docker = Get-Command docker.exe -ErrorAction Stop
$config = [ordered]@{
  nodePath = $node.Source
  pythonPath = $python.Source
  codexPath = $codex.Source
  dockerPath = $docker.Source
  projectRoot = $ProjectRoot
  configuredBy = $identity.Name
  configuredAt = (Get-Date).ToUniversalTime().ToString("o")
}
$configPath = Join-Path $runnerRoot "config.json"
[System.IO.File]::WriteAllText($configPath, ($config | ConvertTo-Json), [System.Text.UTF8Encoding]::new($false))

$startBoundary = (Get-Date).Date.ToString("yyyy-MM-dd'T'HH:mm:ss")
$escapedUser = [Security.SecurityElement]::Escape($userSid)
$escapedCommand = [Security.SecurityElement]::Escape($node.Source)
$escapedArgs = [Security.SecurityElement]::Escape("--import tsx `"$(Join-Path $ProjectRoot 'scripts\ai-workflow-collector.ts')`"")
$escapedWorkingDirectory = [Security.SecurityElement]::Escape($ProjectRoot)
$xml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers><CalendarTrigger><StartBoundary>$startBoundary</StartBoundary><Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay><Repetition><Interval>PT5M</Interval><Duration>P1D</Duration><StopAtDurationEnd>false</StopAtDurationEnd></Repetition></CalendarTrigger></Triggers>
  <Principals><Principal id="Author"><UserId>$escapedUser</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><ExecutionTimeLimit>PT2H</ExecutionTimeLimit><Enabled>true</Enabled><Hidden>false</Hidden><WakeToRun>false</WakeToRun></Settings>
  <Actions Context="Author"><Exec><Command>$escapedCommand</Command><Arguments>$escapedArgs</Arguments><WorkingDirectory>$escapedWorkingDirectory</WorkingDirectory></Exec></Actions>
</Task>
"@

Register-ScheduledTask -TaskName $TaskName -Xml $xml -Force | Out-Null
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
if (-not $task.Settings.Enabled -or $task.Principal.LogonType -notin @("Interactive", "InteractiveToken")) { throw "The scheduled task was not registered with the expected signed-in-user settings." }

$startTestAt = Get-Date
Start-ScheduledTask -TaskName $TaskName
$taskInfo = $null
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  Start-Sleep -Seconds 2
  $taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
  $task = Get-ScheduledTask -TaskName $TaskName
  if ($taskInfo.LastRunTime -ge $startTestAt -and $task.State -ne "Running") { break }
}

if ($null -eq $taskInfo -or $taskInfo.LastRunTime -lt $startTestAt) {
  Write-Output "TASK_REGISTERED=true"
  Write-Output "TASK_ENABLED=true"
  Write-Output "FIRST_POLL=NOT_CONFIRMED"
  exit 2
}

$result = [uint32]$taskInfo.LastTaskResult
Write-Output "TASK_REGISTERED=true"
Write-Output "TASK_ENABLED=true"
Write-Output "RUN_AS=$($identity.Name)"
Write-Output "LOGON_REQUIREMENT=USER_MUST_BE_SIGNED_IN"
Write-Output "LAST_TASK_RESULT=0x$('{0:X8}' -f $result)"
Write-Output "FIRST_POLL=$(if ($result -eq 0) { 'PASS' } else { 'FAIL' })"
if ($result -ne 0) { exit 3 }
