# YAV2 Recovery — Sprint 1 Coordination Record (T1 Control Tower)

**Owner:** T1 — Control Tower / Lead Integrator (`sync/integration`). T1-owned path (`docs/recovery/**`).
**Governing HEAD:** `1286a290f5d4287e70c6853d2eb3bad16256e276` (`origin/ui/redesign-v1`, PR #29 merged).
**Purpose:** single reference for what each workstream may begin, in what order, without overlap. T1 performs **no** T2/T3 implementation.

## 1. Branch/HEAD verification (all workstreams start from governing HEAD)
| Workstream | Branch | Worktree | HEAD | vs GOV | Clean |
|---|---|---|---|---|---|
| T1 Control Tower | `sync/integration` | `D:\Claude\Worktrees\YAV2-T1-Control-Tower` | `1286a29` | 0 ahead / 0 behind | yes |
| T2 App & Runtime | `sync/app-runtime` | `D:\Claude\Worktrees\YAV2-T2-App-Recovery` | `1286a29` | 0 ahead / 0 behind | yes |
| T3 Supabase & Security | `sync/supabase-security` | `D:\Claude\Worktrees\YAV2-T3-Data-Security` | `1286a29` | 0 ahead / 0 behind | yes |

No branch is checked out in more than one worktree. **T2 and T3 have not yet committed — implementation NOT started.**

## 2. Ownership boundaries (non-overlapping single writer)
- **T1:** `contracts/**`, `.env.example`, build config (`vite.config.js`, `vercel.json`, `package.json`), `docs/recovery/**`, `docs/acceptance/**`, integration exports. Sole authority to **change** a shared contract.
- **T2:** `src/**` (except `src/types/generated/**` → T1); shared libs `src/lib|hooks|services/**` are single-writer T2 but **contract-bearing** (signature changes route through T1).
- **T3:** `supabase/migrations/**`, `supabase/functions/**`, `supabase/verification/**`.
- Rule: **change a shared contract → sequential (through T1); consume a frozen contract → parallel.**

## 3. Dependency order (sequenced)
```
T3 (DB/security evidence + PROPOSED DB contract, read-only)
      └─► T1 freezes shared contracts + generated types (G-16)
                 └─► T2 consumes frozen contract (G-19; RBAC G-13 needs T3 RLS evidence)
```
Key edges: **G-16 depends on G-03**; **G-19 depends on G-03 + G-16**; **G-13 depends on A4 RLS evidence (T3 contributor) + creds**.

## 4. What each workstream MAY begin now (gap-gated)
### T3 — MAY begin (read-only / source only; NO SQL, NO deploy)
- G-02, G-03, G-04, G-05, G-06, G-07, G-08, G-11: source-side reconciliation against migrations + prepare the **proposed DB contract** using the existing read-only A4 script `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql`. **Live A4 execution on V2 is PJ-run (BLK-2); T3 must not execute SQL.**
- G-09: Edge source recovery *search* in git history (read-only); no deploy.
- G-10: EVIDENCE-PENDING — live deploy state is **SA/PJ**; T3 may only prepare, not deploy.

### T2 — RESTRICTED to schema-independent work until T1 freezes the DB contract
- **G-12 (MAY begin):** per-tab runtime evidence plan/harness — schema-independent (does not depend on G-03/G-16). Live runtime capture needs approved creds (BLK-1/PJ).
- **G-13 (PARTIAL / hold):** RBAC runtime depends on T3 RLS evidence + creds → begin only after T3 provides RLS evidence.
- **G-19 (BLOCKED):** field-contract review depends on G-03 + G-16 → **must not start** until T1 freezes the DB contract.

### T1 — coordination + scaffolding only (no contract freeze yet)
- G-16: **cannot freeze** — waiting on T3's G-03 evidence; may scaffold `contracts/**` structure only.
- G-14: record/coordinate; Vercel + 3 env-var evidence is PJ-supplied.
- G-15 (coordination only, alias = SA/PJ), G-17 (external/PJ), G-18 (coordination only, deferred), G-20 (safeguard adoption = build-config change, PJ review).

## 5. Overlap check
No write-path overlap: T3 → `supabase/**`; T2 → `src/**`; T1 → `contracts/`, build-config, `docs/recovery|acceptance/`. `src/types/generated/**` reserved to T1 (carve-out). Contract-bearing `src/lib` changes route through T1. **No two workstreams write the same path.**

## 6. Stacked-PR sequence (target model — not authorisation to open/merge)
1. **PR-1** — T3 DB/security definitions & reconciliation → `sync/integration`.
2. **PR-2** — T1 shared contracts / generated types (G-16 freeze) → `sync/integration`.
3. **PR-3** — T2 application/runtime recovery → `sync/integration`.
4. **PR-4** — T3 Edge source + T1 integration exports → `sync/integration`.
5. **PR-5** — `sync/integration` → `ui/redesign-v1` (final; PJ-approved only).
Each PR: independent ChatGPT review + applicable PJ approval before T1 integrates. **T1 alone integrates; no workstream self-merges into `ui/redesign-v1`.**

## 7. Assumption register
- A1: `1286a29` docs/scripts-only above `d95912f`; app runtime unchanged → generated `-git-4c8764-…` deploy remains representative (pending re-confirm).
- A2: live V2 assumed to reflect migrations `0001–0022` except known ledger gaps — **assumption pending A4 output**, not verified.
- A3: approved test accounts (Admin/Manager/Executive/Staff/Viewer + inactive) will be PJ-supplied for G-12/G-13.

## 8. Blocker register
- BLK-1: no in-session test creds → G-12/G-13 live runtime is PJ-executed.
- BLK-2: Supabase MCP reaches only prohibited V1 → A4 (G-02..08/11) is PJ-run on V2; T3 must not execute SQL.
- BLK-3: n8n/WhatsApp external/unversioned (G-17) → PJ export.
- BLK-4: Edge source absent (G-09); deploy state (G-10) live = SA/PJ.
- BLK-5: Vercel build config + 3 env vars not exposed (G-14) → PJ redacted evidence.
- BLK-6 (gating): G-16 contract freeze awaits T3 G-03 evidence → T2 G-19 held.

## 9. Live-action gates (STOP — PJ only)
Merge into `ui/redesign-v1`; SQL/DB execution; deployment; Vercel alias (G-15); Edge deploy (G-10); n8n/WhatsApp; V1 access. **None authorised in Sprint 1.**
