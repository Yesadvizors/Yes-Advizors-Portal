# scripts/ — Phase 0 environment safeguard

## `verify-supabase-ref.mjs` (cross-platform, source of truth) and `verify-supabase-ref.ps1` (PowerShell wrapper)

A **fail-safe, read-only** guard that prevents accidental use of the prohibited
V1/Production Supabase project and requires the authorised V2/yav2-dev project.

### Rules (all must hold to pass)
1. A primary URL (`VITE_SUPABASE_URL`) **must** exist.
2. The prohibited V1 ref must **not** appear in any checked URL.
3. `VITE_SUPABASE_URL` must reference the authorised V2 ref.
4. If `VITE_SUPABASE_FUNCTIONS_URL` is present, it must **also** reference V2.
5. Any checked Supabase URL pointing to an **unknown / third project** is rejected.

### Verified test matrix (Node + PowerShell, equivalent results)
| # | VITE_SUPABASE_URL | VITE_SUPABASE_FUNCTIONS_URL | Exit |
|---|---|---|:--:|
| A | (unset) | (unset) | 2 |
| B | V1 | (unset) | 1 |
| C | V2 | (unset) | 0 |
| D | unknown | (unset) | 1 |
| E | V2 | V1 | 1 |
| F | V2 | unknown | 1 |
| G | V2 | V2 | 0 |

Node (`.mjs`), the PowerShell delegation path, and the PowerShell native fallback
all produce the exit codes above. (PowerShell `Fail` writes to stderr via
`[Console]::Error.WriteLine` rather than `Write-Error`, so the distinct 1/2 exit
codes are preserved under `$ErrorActionPreference='Stop'`.)

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
