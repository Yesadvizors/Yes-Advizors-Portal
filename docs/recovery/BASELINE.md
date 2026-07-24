# YAV2 Recovery — Phase 0 BASELINE (Contract Freeze)

**Recovery method:** MODIFIED HYBRID YAV2 RECOVERY (PJ-directed).
**Purpose:** fixed reference all three terminals treat as immutable during the parallel sprint. This file is a baseline, not a narrative — see `docs/YAV2_Package_A_Historical_Evidence_And_Live_State_Discovery.md` for full history.

## 1. Governing anchors (FIXED)
| Anchor | Value |
|---|---|
| Governing Issue | #23 — Complete Historical Recovery, Consolidation & Live Alignment |
| Governing branch | `ui/redesign-v1` |
| Governing merged PR | #27 |
| Governing HEAD | `bbdf1ba1c611d61850662d5b042c5632c1f2ac43` |
| Authorised Supabase (V2 / yav2-dev) | ref `ogjrwemjefvccpyjwxuo` |
| **PROHIBITED** Supabase (V1 / Production) | ref `zcszesuvjrryxtigjglt` — **never connect, query, or deploy** |
| Governing runtime deployment | `https://yes-advizors-portal-v2-preview-git-4c8764-yes-advizors-projects.vercel.app` (commit `d95912f`; representative for `bbdf1ba` — delta is docs-only) |
| Stale clean alias | `https://yes-advizors-portal-v2-preview.vercel.app` — **STALE / MISASSIGNED**, do NOT use (serves non-governing bundle → `v_firm_dashboard.due_soon` 42703) |
| Current recovery status | Package A **PARTIAL**; entering parallel implementation via Phase 0 freeze |

## 2. Verified facts — treat as fixed (evidence-backed)
- `d95912f → bbdf1ba` is **docs-only**; no app-source or DB change (`git diff --name-only`).
- App is a **single-page tabbed portal** (`src/App.jsx`); tabs switch client-side — not multi-route. Tabs: `home` (admin-only), `dashboard`, `tasks`, `clients`, `compliance`, `documents`, `team`, `usage`, `auditlog` (admin-only); plus `Login`, always-mounted `ChatAgent`.
- Role model = `team.portal_role` enum `('Admin','Manager','Executive','Staff','Viewer')` (`supabase/migrations/0001_extensions_and_enums.sql:56`) + `is_admin` boolean + `is_active` (`0002`). UI admin gate = `is_admin === true` (`App.jsx:112,121,155,164`); write gate = server `is_admin_or_manager()` = `portal_role IN ('Admin','Manager')` (`src/lib/clientMaster.js`). Server role via `get_app_role()`/`get_app_role_for_user` (`0008`).
- `src/supabase.js` requires `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, throws on missing, and permits **no V1 fallback**; no hard-coded project ref.
- Migration files present: `0001–0011, 0014–0018, 0021, 0022`. **Absent: `0012, 0013, 0019, 0020`** (`0012` secure-docs executed live-only; `0019` D3 backfill never assigned; `0013`/`0020` numbering gaps).
- A4 read-only discovery script **present**: `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql` (SELECT-only).
- No `supabase/functions/*` in governing → Edge Function source is **unversioned** (referenced: `ai-agent`, `extract-financial`, `scan-document`; historical-only `dkyc-verify-upload`).
- SECURITY DEFINER functions exist across many migrations (e.g. `0008`×10, `0017`×27, `0016`×10).
- **VERIFIED (I-26):** governing deployment (`d95912f`) firm dashboard returns valid data with `due_in_7_days`, targets V2 `ogjrwemjefvccpyjwxuo` (Network `Sb-Project-Ref`; no V1). Alias variance is a Vercel issue only, not a source/migration/DB defect.
- Env-var evidence observed for `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_P2_PREVIEW` only; **NOT observed:** `VITE_SUPABASE_FUNCTIONS_URL`, `VITE_DOCS_BUCKET`, `VITE_P5_UI`.

## 3. Explicit assumptions (until evidence supersedes)
- The live V2 schema is assumed to reflect migrations `0001–0022` as authored, **except** the known ledger gaps — this is an **assumption pending A4 output**, not a verified fact.
- The generated governing deployment is assumed representative of `bbdf1ba` runtime (justified: docs-only delta).
- `.env.example` placeholders (`<APPROVED_V2_SUPABASE_PROJECT_REF>`) are assumed to be filled only with the authorised V2 ref in any environment.

## 4. Unresolved facts (must be closed by Gap Register items)
- Live schema / RLS / FORCE / grants / SECURITY DEFINER `search_path` / policies on V2 — **unverified** (G-02…G-06).
- Auth ↔ `team` mapping, storage `secure-docs` per-client separation — **unverified** (G-07, G-08).
- Edge Function source + deployment state — **missing / unverified** (G-09, G-10).
- Per-tab runtime + per-role RBAC live behaviour — **unverified** (G-12, G-13).
- Vercel build config + 3 env vars — **unverified** (G-14); clean-alias remediation — **pending PJ** (G-15).
- n8n / WhatsApp inventory — **external / blocked** (G-17).

## Governance footer
```
Governing Issue: #23
Governing merged PR: #27
Governing HEAD: bbdf1ba1c611d61850662d5b042c5632c1f2ac43
Recovery method: MODIFIED HYBRID YAV2 RECOVERY
Package B: NOT AUTHORISED
Deployment/Alias change: NOT AUTHORISED
SQL/Database action: NOT AUTHORISED
```
