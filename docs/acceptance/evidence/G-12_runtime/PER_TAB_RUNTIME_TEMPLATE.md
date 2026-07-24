# G-12 — Per-tab LIVE runtime evidence  [BLOCKED-CREDS]

**Status:** BLOCKED — awaiting PJ-authorised runtime credentials on the governing deployment.
Do **not** run live RBAC/runtime capture without authorised credentials/evidence (sprint rule §10).

**Runtime target (fixed):** `https://yes-advizors-portal-v2-preview-git-4c8764-yes-advizors-projects.vercel.app`
(governing `d95912f`). **Do NOT** use the stale clean alias `yes-advizors-portal-v2-preview.vercel.app`.
Every capture must record `Sb-Project-Ref: ogjrwemjefvccpyjwxuo` (no V1). Fill one row per tab, attach
artifacts under `G-12_runtime/artifacts/`.

## Capture procedure (per tab)
1. Sign in as an active mapped `team` member (role noted per row).
2. Open the tab. Capture: (a) screenshot, (b) browser console (0 errors expected), (c) Network panel showing
   the request(s) and the `Sb-Project-Ref` response header = `ogjrwemjefvccpyjwxuo`.
3. Record any `42703` / RLS-denied / 4xx/5xx as a **finding** (not a silent pass).

## Per-tab matrix (Acceptance §A)
| Tab | Pass criterion | Login/role | Status | Artifact | Sb-Project-Ref |
|---|---|---|---|---|---|
| `dashboard` | valid data, `due_in_7_days`, no 42703 | any active | **[V] (I-26)** | (I-26 evidence) | `ogjrwemjefvccpyjwxuo` |
| `home` (Firm Overview) | renders for admin; hidden+guarded non-admin | Admin / non-admin | ☐ pending creds | | |
| `tasks` | list loads, no error | active | ☐ pending creds | | |
| `clients` (Onboarding) | list+wizard load; `scan-document` observed | active | ☐ pending creds | | |
| `compliance` | trackers load; `generate_client_compliance` behaves; no `due_soon` | active | ☐ pending creds | | |
| `documents` | `secure-docs` list/download; per-client scoping | active + 2nd client | ☐ pending creds | | |
| `team` | list loads; edit gated Admin/Manager | multi-role | ☐ pending creds | | |
| `usage` | renders | active | ☐ pending creds | | |
| `auditlog` | renders for admin; **server-blocked** non-admin | Admin / non-admin | ☐ pending creds | | |
| `ChatAgent` (`ai-agent`) | invoke behaviour + deployed-or-not observed | active | ☐ pending creds | | |
| Unauthenticated | redirect to Login; no data/RPC | none | ☐ pending creds | | |

**Static precondition already met** for all rows: see `STATIC_VERIFICATION.md` (build + import/mount integrity).
Live capture is the only remaining work and is credential-gated.
