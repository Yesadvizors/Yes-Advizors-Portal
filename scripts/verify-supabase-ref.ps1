<#
  YAV2 Supabase environment safeguard (Phase 0, hardened) — PowerShell wrapper.

  Windows/PowerShell-first convenience wrapper around the cross-platform
  Node guard (verify-supabase-ref.mjs). Same fail-safe contract, no secrets,
  no network, no database/Vercel/Edge/n8n access.

  If Node is available it delegates to the .mjs (single source of truth).
  If Node is unavailable it performs the identical checks natively so the
  safeguard still fails closed on Windows without Node.

  RULES (all must hold to pass)
    1. A primary URL (VITE_SUPABASE_URL) MUST exist.
    2. The prohibited V1 ref MUST NOT appear in any checked URL.
    3. VITE_SUPABASE_URL MUST reference the authorised V2 ref.
    4. If VITE_SUPABASE_FUNCTIONS_URL is present, it MUST also reference V2.
    5. Any checked Supabase URL pointing to an unknown / third project is rejected.

  Exit codes: 0 = authorised V2 confirmed; 1 = prohibited V1 / unknown project /
              not-on-V2; 2 = primary URL missing / no vars set (fail closed).

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

# ---- Native fallback (identical fail-safe contract) ----
# Write to stderr WITHOUT throwing: Write-Error under $ErrorActionPreference='Stop'
# would terminate with exit code 1 before `exit $code` runs, defeating the
# distinct 1/2 exit contract. [Console]::Error.WriteLine avoids that.
function Fail([int]$code, [string]$msg) {
    [Console]::Error.WriteLine("[supabase-safeguard] FAIL($code): $msg")
    exit $code
}

$primary = $env:VITE_SUPABASE_URL
$func    = $env:VITE_SUPABASE_FUNCTIONS_URL

# Rule 1: primary URL must exist (fail closed).
if ([string]::IsNullOrWhiteSpace($primary)) {
    Fail 2 "primary URL VITE_SUPABASE_URL is not set. Cannot verify environment; refusing."
}

# Collect checked URLs that are actually set: @(name, value) pairs.
$checked = @()
if (-not [string]::IsNullOrWhiteSpace($primary)) { $checked += ,@('VITE_SUPABASE_URL', $primary) }
if (-not [string]::IsNullOrWhiteSpace($func))    { $checked += ,@('VITE_SUPABASE_FUNCTIONS_URL', $func) }

# Rule 2: prohibited V1 ref must not appear in any checked URL.
foreach ($pair in $checked) {
    if ($pair[1].Contains($ProhibitedV1Ref)) {
        Fail 1 "PROHIBITED V1/Production ref '$ProhibitedV1Ref' found in $($pair[0]). Refusing. Use only authorised V2 ref '$AuthorisedV2Ref'."
    }
}

# Rules 3,4,5: every checked URL must reference the authorised V2 ref.
foreach ($pair in $checked) {
    if (-not $pair[1].Contains($AuthorisedV2Ref)) {
        $m = [regex]::Match($pair[1], '([a-z0-9]{20})\.supabase\.co', 'IgnoreCase')
        if ($m.Success) {
            $detail = "points to unknown/third project ref '$($m.Groups[1].Value.ToLower())'"
        } else {
            $detail = "does not reference authorised V2 ref '$AuthorisedV2Ref'"
        }
        Fail 1 "$($pair[0]) $detail. Only '$AuthorisedV2Ref' is permitted. Refusing."
    }
}

$names = ($checked | ForEach-Object { $_[0] }) -join ', '
Write-Host "[supabase-safeguard] OK: authorised V2 ref '$AuthorisedV2Ref' confirmed for [$names]; prohibited V1 ref '$ProhibitedV1Ref' absent; no unknown project."
exit 0
