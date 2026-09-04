param(
  [string]$CommitMessage = "Deploy ENHE AI tools update",
  [string]$ServerHost = "111.229.135.3",
  [string]$ServerUser = "ubuntu",
  [int]$SshPort = 22,
  [string]$SshKeyPath = "",
  [string]$RemoteProjectDir = "/opt/enhe-ai-tools",
  [string]$Branch = "main",
  [switch]$SkipChecks,
  [switch]$RunBuild,
  [switch]$NoDeploy
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [string[]]$Arguments = @()
  )

  Write-Host ""
  Write-Host ">>> $FilePath $($Arguments -join ' ')" -ForegroundColor Cyan
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
  }
}

function Resolve-SshKey {
  param([string]$Path)

  $siteInfoFolder = -join ([char[]](0x7F51, 0x7AD9, 0x76F8, 0x5173, 0x8D44, 0x6599))
  $keyFolder = -join ([char[]](0x5BC6, 0x94A5))
  $defaultKeyFolder = Join-Path "E:\Ai Project" "01.$siteInfoFolder\$keyFolder"
  $candidatePaths = @()

  if ($Path) {
    $candidatePaths += $Path
  }
  $candidatePaths += (Join-Path $HOME ".ssh\enhe-ai-tools-tencent.pem")
  $candidatePaths += $defaultKeyFolder

  foreach ($candidatePath in $candidatePaths) {
    if (Test-Path -LiteralPath $candidatePath -PathType Leaf) {
      return (Resolve-Path -LiteralPath $candidatePath).Path
    }

    if (Test-Path -LiteralPath $candidatePath -PathType Container) {
      $key = Get-ChildItem -LiteralPath $candidatePath -File |
        Where-Object { $_.Name -match '(\.pem|\.key)$|^id_(rsa|ed25519)$' } |
        Select-Object -First 1

      if ($key) {
        return $key.FullName
      }
    }
  }

  throw "SSH key not found. Provide -SshKeyPath with a private key file or a folder containing .pem/.key/id_rsa/id_ed25519."
}

function Protect-WindowsSshKey {
  param([string]$KeyPath)

  if ($env:OS -ne "Windows_NT") {
    return $KeyPath
  }

  $sshDir = Join-Path $HOME ".ssh"
  if (-not (Test-Path -LiteralPath $sshDir -PathType Container)) {
    New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
  }

  $safeKeyPath = Join-Path $sshDir "enhe-ai-tools-tencent.pem"
  $sourcePath = (Resolve-Path -LiteralPath $KeyPath).Path
  $destinationPath = if (Test-Path -LiteralPath $safeKeyPath) {
    (Resolve-Path -LiteralPath $safeKeyPath).Path
  } else {
    $safeKeyPath
  }

  if ($sourcePath -ne $destinationPath) {
    Copy-Item -LiteralPath $sourcePath -Destination $safeKeyPath -Force
  }

  $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  & icacls $safeKeyPath /inheritance:r | Out-Null
  & icacls $safeKeyPath /grant:r "${currentUser}:R" | Out-Null

  foreach ($identity in @("BUILTIN\Users", "Authenticated Users", "Everyone")) {
    & icacls $safeKeyPath /remove:g $identity 2>$null | Out-Null
    & icacls $safeKeyPath /remove $identity 2>$null | Out-Null
  }

  return $safeKeyPath
}

function Assert-RequiredCommand {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

Assert-RequiredCommand git
Assert-RequiredCommand npm
Assert-RequiredCommand ssh

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$currentBranch = (& git branch --show-current).Trim()
if ($currentBranch -ne $Branch) {
  throw "Current branch is '$currentBranch'. Switch to '$Branch' before deploying."
}

if (-not $SkipChecks) {
  Invoke-Native -FilePath npm -Arguments @("test")
  Invoke-Native -FilePath npm -Arguments @("run", "typecheck")
  Invoke-Native -FilePath npm -Arguments @("run", "lint")
  if ($RunBuild) {
    Invoke-Native -FilePath npm -Arguments @("run", "build")
  }
} else {
  Write-Host "Skipping local checks because -SkipChecks was provided." -ForegroundColor Yellow
}

Invoke-Native -FilePath git -Arguments @("add", "-A")

$forbidden = & git diff --cached --name-only |
  Where-Object {
    $_ -match '(^|/)\.env(\..*)?$' -or
    $_ -like ".codex-logs/*" -or
    $_ -like ".dev-logs/*" -or
    $_ -like "web-access/*"
  }

if ($forbidden) {
  throw "Refusing to commit local-only or secret files:`n$($forbidden -join "`n")"
}

$staged = (& git diff --cached --name-only)
if ($staged) {
  Invoke-Native -FilePath git -Arguments @("commit", "-m", $CommitMessage)
} else {
  Write-Host "No local changes to commit." -ForegroundColor Yellow
}

Invoke-Native -FilePath git -Arguments @("pull", "--rebase", "origin", $Branch)
Invoke-Native -FilePath git -Arguments @("push", "origin", $Branch)

if ($NoDeploy) {
  Write-Host "Push complete. Skipping remote deploy because -NoDeploy was provided." -ForegroundColor Yellow
  exit 0
}

$resolvedKey = Protect-WindowsSshKey (Resolve-SshKey $SshKeyPath)
$remoteCommand = "set -e; cd $RemoteProjectDir; git -c http.version=HTTP/1.1 pull origin $Branch; chmod +x deploy.sh; SKIP_GIT_PULL=1 ./deploy.sh"

Invoke-Native -FilePath ssh -Arguments @("-i", $resolvedKey, "-p", "$SshPort", "-o", "StrictHostKeyChecking=accept-new", "$ServerUser@$ServerHost", $remoteCommand)

Write-Host ""
Write-Host "Deploy workflow complete." -ForegroundColor Green
