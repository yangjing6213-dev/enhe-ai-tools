param(
  [Parameter(Mandatory = $true)]
  [string]$ProtectedFile
)

$ErrorActionPreference = "Stop"
try {
  $encrypted = [System.IO.File]::ReadAllText($ProtectedFile).Trim()
  $secure = ConvertTo-SecureString -String $encrypted
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    [Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer))
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
} catch {
  exit 1
}
