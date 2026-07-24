# scripts/ — Phase 0 environment safeguard

## `verify-supabase-ref.mjs` (cross-platform, source of truth) and `verify-supabase-ref.ps1` (PowerShell wrapper)

A **fail-safe, read-only** guard that prevents accidental use of the prohibited
V1/Production Supabase project and requires the authorised V2/yav2-dev project.

### Validation (parsed-host, not substring)
The project ref is extracted **only from the parsed URL hostname** — never from a
substring, path, or query string. Per checked URL:
1. Parse as an absolute URL (`new URL` / `[System.Uri]::TryCreate`); reject malformed.
2. Require an `http(s)` scheme and a host of the exact form `<ref>.supabase.co`
   (bare host; `<ref>` is a single DNS label with no extra dots).
3. Extract `<ref>` from the hostname.
4. Require `<ref>` to equal the authorised V2 ref exactly.

Rules: `VITE_SUPABASE_URL` must exist and resolve to V2; if
`VITE_SUPABASE_FUNCTIONS_URL` is present it must also resolve to V2. This rejects
V1, unknown/third projects, non-Supabase hosts, the ref appearing only in a
path/query, userinfo tricks (`...@evil.com`), and malformed URLs.

### Verified test matrix (Node + PowerShell native + PowerShell delegation — all equivalent)
| # | Scenario (VITE_SUPABASE_URL / VITE_SUPABASE_FUNCTIONS_URL) | Exit |
|---|---|:--:|
| A | no primary URL | 2 |
| B | authorised V2 primary | 0 |
| C | V1 primary | 1 |
| D | unknown Supabase project | 1 |
| E | non-Supabase host, ref in **path** | 1 |
| F | non-Supabase host, ref in **query** | 1 |
| G | malformed value containing ref | 1 |
| H | V2 primary + V2 functions URL | 0 |
| I | V2 primary + unknown functions project | 1 |
| J | V2 primary + non-Supabase functions URL with ref in path | 1 |

All ten scenarios were run and pass identically in Node (`.mjs`), the PowerShell
native fallback, and the PowerShell delegation path. (PowerShell `Fail` writes to
stderr via `[Console]::Error.WriteLine` rather than `Write-Error`, so the distinct
1/2 exit codes survive under `$ErrorActionPreference='Stop'`.)

| Property | Guarantee |
|---|---|
| Secrets | **None.** Only the non-secret public project *refs* are embedded (`ogjrwemjefvccpyjwxuo` authorised, `zcszesuvjrryxtigjglt` prohibited). No keys/tokens. |
| Network | **None.** It inspects environment-variable strings only. |
| Mutation | **None.** Does not connect to, query, deploy to, or modify either Supabase project, Vercel, Edge Functions, n8n, or WhatsApp. |
| Failure mode | **Fail closed.** Missing/unparseable env ⇒ non-zero exit. |

### Exit codes
- `0` — authorised V2 ref present, prohibited V1 ref absent.
- `1` — prohibited V1 ref detected, or authorised V2 ref missing/mismatched.
- `2` — required env vars not set (cannot prove safety ⇒ refuse).

### Usage (manual; not wired into build/CI)
```
node scripts/verify-supabase-ref.mjs
# or, PowerShell-first:
powershell -File scripts/verify-supabase-ref.ps1
```
It reads `VITE_SUPABASE_URL` and, if present, `VITE_SUPABASE_FUNCTIONS_URL`.

### Review-before-use
This safeguard is intentionally **not** wired into `package.json`, Vite, Vercel,
or any CI hook. Wiring it in is a **build-configuration change owned by
TERMINAL 1 (Lead Integrator)** and must be reviewed by PJ before adoption
(see `docs/recovery/OWNERSHIP.md`, Gap `G-20`). It changes no live system.
