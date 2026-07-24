<#
  YAV2 Supabase environment safeguard (Phase 0) — PowerShell wrapper.

  Windows/PowerShell-first convenience wrapper around the cross-platform
  Node guard (verify-supabase-ref.mjs). Same fail-safe contract, no secrets,
  no network, no database/Vercel/Edge/n8n access.

  If Node is available it delegates to the .mjs (single source of truth).
  If Node is unavailable it performs the identical string check natively so
  the safeguard still fails closed on Windows without Node.

  Exit codes: 0 = authorised V2 confirmed; 1 = prohibited V1 or missing V2;
              2 = required env vars not set (fail closed).

  REVIEW BEFORE USE. Not wired into any build/CI. Run manually:
      powershell -File scripts/verify-supabase-ref.ps1
#>

$ErrorActionPreference = 'Stop'

# Non-secret public project references (identifiers, not credentials).
$AuthorisedV2Ref = 'ogjrwemjefvccpyjwxuo'
$ProhibitedV1Ref = 'zcszesuvjrryxtigjglt'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mjs = Join-Path $scriptDir 'verify-supabase-ref.mjs'

# Prefer the cross-platform Node implementation when available.
$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -ne $node -and (Test-Path $mjs)) {
    & $node.Source $mjs
    exit $LASTEXITCODE
}

# Native fallback (identical fail-safe contract).
$url  = $env:VITE_SUPABASE_URL
$func = $env:VITE_SUPABASE_FUNCTIONS_URL

if ([string]::IsNullOrEmpty($url) -and [string]::IsNullOrEmpty($func)) {
    Write-Error "[supabase-safeguard] FAIL(2): no Supabase URL env vars set. Cannot verify environment; refusing."
    exit 2
}
foreach ($v in @($url, $func)) {
    if (-not [string]::IsNullOrEmpty($v) -and $v.Contains($ProhibitedV1Ref)) {
        Write-Error "[supabase-safeguard] FAIL(1): PROHIBITED V1/Production ref '$ProhibitedV1Ref' detected. Refusing."
        exit 1
    }
}
if ([string]::IsNullOrEmpty($url)) {
    Write-Error "[supabase-safeguard] FAIL(2): VITE_SUPABASE_URL not set. Cannot confirm authorised V2 project."
    exit 2
}
if (-not $url.Contains($AuthorisedV2Ref)) {
    Write-Error "[supabase-safeguard] FAIL(1): VITE_SUPABASE_URL does not reference authorised V2 ref '$AuthorisedV2Ref'. Refusing."
    exit 1
}
Write-Host "[supabase-safeguard] OK: authorised V2 ref '$AuthorisedV2Ref' confirmed; prohibited V1 ref '$ProhibitedV1Ref' absent."
exit 0
