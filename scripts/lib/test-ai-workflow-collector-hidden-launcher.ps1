$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$installerPath = Join-Path $repoRoot "scripts\install-ai-workflow-collector.ps1"
$launcherPath = Join-Path $repoRoot "scripts\lib\ai-workflow-collector-launcher.pyw"
$tokens = $null
$parseErrors = $null
$null = [System.Management.Automation.Language.Parser]::ParseFile($installerPath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw "The collector installer did not parse cleanly." }

$installer = [System.IO.File]::ReadAllText($installerPath)
foreach ($required in @("pythonw.exe", "run-collector-hidden", "ai-workflow-collector-launcher.pyw", "collector.json", "WindowsApps")) {
  if (-not $installer.Contains($required)) { throw "The installer is missing the hidden-launcher setting: $required" }
}
foreach ($required in @('executable = $node.Source', "arguments =", 'workingDirectory = $ProjectRoot', 'WriteAllText($collectorConfigPath')) {
  if (-not $installer.Contains($required)) { throw "The launcher config must preserve the collector command: $required" }
}
foreach ($required in @('$configuredPythonPath = [string]$previousConfig.pythonPath', '$pythonwPath = Join-Path (Split-Path -Parent $python.Source) "pythonw.exe"')) {
  if (-not $installer.Contains($required)) { throw "The installer must use the configured Python runtime for pythonw.exe: $required" }
}
if ($installer -notmatch '(?m)^\s*\$escapedCommand\s*=\s*\[Security\.SecurityElement\]::Escape\(\$pythonwPath\)') {
  throw "The scheduled task must execute pythonw.exe rather than node.exe."
}
if ($installer -match '(?m)^\s*\$escapedCommand\s*=\s*\[Security\.SecurityElement\]::Escape\(\$node\.Source\)') {
  throw "The scheduled task still launches Node directly."
}
if ($installer -notmatch '(?m)^\s*\$escapedArgs\s*=.*\$hiddenLauncherPath.*\$collectorConfigPath') {
  throw "The scheduled task must pass both the bundled launcher and collector config."
}

if (-not (Test-Path -LiteralPath $launcherPath -PathType Leaf)) { throw "The bundled Job launcher is missing." }
$launcher = [System.IO.File]::ReadAllText($launcherPath)
foreach ($required in @("CreateJobObjectW", "KILL_ON_JOB_CLOSE", "CREATE_NO_WINDOW", "CREATE_SUSPENDED", "AssignProcessToJobObject", "ResumeThread")) {
  if (-not $launcher.Contains($required)) { throw "The bundled launcher is missing required process-tree behavior: $required" }
}
if ($launcher.IndexOf("AssignProcessToJobObject") -gt $launcher.IndexOf("ResumeThread")) {
  throw "The child process must join its Job Object before it resumes."
}

Write-Output "HIDDEN_LAUNCHER_INSTALLER_PASS"
