$ErrorActionPreference = "Stop"

$installerPath = Join-Path $PSScriptRoot "..\install-ai-workflow-collector.ps1"
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($installerPath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw "The installer script did not parse cleanly." }

$expectedRunner = ConvertFrom-Json '"E:\\AiProject\\\u5404\u5e73\u53f0\u5185\u5bb9\u53d1\u5e03\u9879\u76ee\\ai-workflows\\runner"'
$expectedRuns = ConvertFrom-Json '"E:\\AiProject\\\u5404\u5e73\u53f0\u5185\u5bb9\u53d1\u5e03\u9879\u76ee\\ai-workflows\\runs"'
$pathConstants = @($ast.FindAll({
  param($node)
  $node -is [System.Management.Automation.Language.StringConstantExpressionAst] -and
    $node.Value.StartsWith("E:\AiProject\") -and
    $node.Value.Contains("\ai-workflows\")
}, $true) | ForEach-Object { $_.Value })

if ($pathConstants -cnotcontains $expectedRunner -or $pathConstants -cnotcontains $expectedRuns) {
  throw "The installer path literals do not match the collector's Unicode paths."
}

Write-Output "INSTALLER_ENCODING_PASS"
