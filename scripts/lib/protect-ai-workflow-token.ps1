param(
  [Parameter(Mandatory = $true)]
  [string]$ProtectedFile
)

$ErrorActionPreference = "Stop"
try {
  $plain = [Console]::In.ReadToEnd()
  if ([string]::IsNullOrWhiteSpace($plain) -or $plain.Length -lt 64 -or $plain.Length -gt 256) { exit 1 }
  $secure = ConvertTo-SecureString -String $plain -AsPlainText -Force
  $encrypted = ConvertFrom-SecureString -SecureString $secure
  $temporary = "$ProtectedFile.$([Guid]::NewGuid().ToString('N')).tmp"
  [System.IO.File]::WriteAllText($temporary, $encrypted, [System.Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporary -Destination $ProtectedFile -Force
  [Console]::Out.WriteLine("PROTECTED")
} catch {
  exit 1
} finally {
  if ($null -ne $plain) { $plain = $null }
}
