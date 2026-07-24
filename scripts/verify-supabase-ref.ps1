<#
  YAV2 Supabase environment safeguard (Phase 0, hardened — parsed-host validation).
  PowerShell wrapper + native fallback.

  Windows/PowerShell-first wrapper around the cross-platform Node guard
  (verify-supabase-ref.mjs). Same fail-safe contract, no secrets, no network,
  no database/Vercel/Edge/n8n access.

  If Node is available it delegates to the .mjs (single source of truth).
  If Node is unavailable it performs the identical parsed-host checks natively.

  VALIDATION (per checked URL) — project ref is taken ONLY from the host:
    1. Parse the value as a URL; reject malformed/unparseable.
    2. Require host of the form "<ref>.supabase.co" (bare host, single ref label).
    3. Extract <ref> from the hostname (never path/query/fragment).
    4. Require <ref> = authorised V2 ref exactly. Reject V1/unknown/third,
       non-Supabase host, or the ref appearing only in path/query.

  Exit codes: 0 = V2 host confirmed; 1 = V1/unknown/non-Supabase/path-or-query-only/
              malformed/not-on-V2; 2 = primary URL missing (fail closed).

  REVIEW BEFORE USE. Not wired into any build/CI. Run manually:
      powershell -File scripts/verify-supabase-ref.ps1
#>

$ErrorActionPreference = 'Stop'

# Non-secret public project references (identifiers, not credentials).
$AuthorisedV2Ref = 'ogjrwemjefvccpyjwxuo'
$ProhibitedV1Ref = 'zcszesuvjrryxtigjglt'
$SupabaseSuffix  = '.supabase.co'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mjs = Join-Path $scriptDir 'verify-supabase-ref.mjs'

# Prefer the cross-platform Node implementation when available.
$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -ne $node -and (Test-Path $mjs)) {
    & $node.Source $mjs
    exit $LASTEXITCODE
}

# ---- Native fallback (identical parsed-host contract) ----
# Write to stderr WITHOUT throwing so the distinct 1/2 exit codes survive.
function Fail([int]$code, [string]$msg) {
    [Console]::Error.WriteLine("[supabase-safeguard] FAIL($code): $msg")
    exit $code
}

# Return the Supabase project ref from the HOSTNAME only; throws on any violation.
function Get-ProjectRefFromHost([string]$rawValue, [string]$name) {
    $uri = $null
    $okParse = [System.Uri]::TryCreate($rawValue, [System.UriKind]::Absolute, [ref]$uri)
    if (-not $okParse -or $null -eq $uri) {
        throw "$name is not a valid URL (malformed/unparseable). Refusing."
    }
    if ($uri.Scheme -ne 'https' -and $uri.Scheme -ne 'http') {
        throw "$name has unsupported scheme '$($uri.Scheme)'. Refusing."
    }
    $hostName = $uri.Host.ToLower()   # host only — never path/query/fragment
    if (-not $hostName.EndsWith($SupabaseSuffix)) {
        throw "$name host '$hostName' is not a *$SupabaseSuffix host. Refusing."
    }
    $ref = $hostName.Substring(0, $hostName.Length - $SupabaseSuffix.Length)
    if ($ref.Length -eq 0 -or $ref.Contains('.')) {
        throw "$name host '$hostName' is not of the form <ref>$SupabaseSuffix. Refusing."
    }
    return $ref
}

$primary = $env:VITE_SUPABASE_URL
if ([string]::IsNullOrWhiteSpace($primary)) {
    Fail 2 "primary URL VITE_SUPABASE_URL is not set. Cannot verify environment; refusing."
}

$checked = @()
if (-not [string]::IsNullOrWhiteSpace($primary))                 { $checked += ,@('VITE_SUPABASE_URL', $primary) }
if (-not [string]::IsNullOrWhiteSpace($env:VITE_SUPABASE_FUNCTIONS_URL)) { $checked += ,@('VITE_SUPABASE_FUNCTIONS_URL', $env:VITE_SUPABASE_FUNCTIONS_URL) }

foreach ($pair in $checked) {
    try {
        $ref = Get-ProjectRefFromHost $pair[1] $pair[0]
    } catch {
        Fail 1 $_.Exception.Message
    }
    if ($ref -eq $ProhibitedV1Ref) {
        Fail 1 "$($pair[0]) host resolves to PROHIBITED V1/Production ref '$ProhibitedV1Ref'. Refusing."
    }
    if ($ref -ne $AuthorisedV2Ref) {
        Fail 1 "$($pair[0]) host resolves to unknown/third project ref '$ref'. Only '$AuthorisedV2Ref' is permitted. Refusing."
    }
}

$names = ($checked | ForEach-Object { $_[0] }) -join ', '
Write-Host "[supabase-safeguard] OK: authorised V2 host ref '$AuthorisedV2Ref' confirmed for [$names]; no V1/unknown/non-Supabase/path-or-query-only match."
exit 0
