# YAV2 Portal — Full-System Synchronisation & Runtime Variance Audit

**Type:** Controlled, primarily **read-only** full-system audit. **Work-package issue:** #21.
**Establishes on:** #13 · #17 · #19 · PR #18 · PR #20. **Author:** Claude Code · **Reviewer:** ChatGPT · **Approver:** PJ.
**Audit date:** 2026-07-23 IST. **Governing base:** `ui/redesign-v1` @ `683d45d77cb793c54baf0532e6b3c06aa1a85b21`.

> **Read-only, documentation-only.** No application code, SQL/migration authoring, SQL execution, DB mutation,
> Auth/user change, RLS/function/trigger change, Edge Function deploy, storage change, n8n change/execution, Vercel
> config change, redeploy, merge, Production/V1 access, P6 implementation, or cleanup. **Provenance/SHA/config-name
> alignment is not runtime proof; a historical PASS is not a current live PASS.**

## 0. Execution-capability constraint (read this first)
This package authorises read-only Supabase V2 discovery, n8n inventory and runtime testing **where technically safe /
where access exists / with approved test accounts**. Within the standing governance guardrails those preconditions
are **not met in-session**, so parts of Phases 3–5 could not be executed by Claude and are recorded as **UNVERIFIED**
with a scoped follow-on gate — they are **not** failures, and nothing was assumed:
- **Supabase V2 (Phase 3):** the connected Supabase MCP reaches only the **prohibited V1** project
  (`zcszesuvjrryxtigjglt`); **Claude never executes SQL / never touches the database**; **SQL authoring is not
  authorised by this package.** → V2 live schema/security/Auth/storage/Edge state **UNVERIFIED** here.
- **Authenticated runtime (Phase 5):** no approved test-account credentials are available in-session → admin/manager/
  staff end-to-end scenarios **UNVERIFIED**; delivered as a ready-to-run test plan (§9.5).
- **n8n live (Phase 4):** repository evidence shows n8n/WhatsApp automation lives **outside** the governed repo; the
  connected n8n MCP workspace is **not confirmed** to be the YAV2 one → live n8n inventory **UNVERIFIED** (not probed
  to avoid touching an unrelated workspace).

What **was** verified read-only: local/GitHub baseline (Phase 1), Vercel provenance/topology (Phase 2), and the
source-declared dependency surface (feature flags, Edge Functions, storage bucket, integrations) that Phases 3–5 must
confirm live.

---

## 1. Phase 1 — Baseline confirmation (VERIFIED)
| Item | Value |
|---|---|
| Repository | `Yesadvizors/Yes-Advizors-Portal` (repoId 1257818966, public) |
| Governing branch / HEAD | `ui/redesign-v1` @ **`683d45d77cb793c54baf0532e6b3c06aa1a85b21`** (PR #20 merge) |
| `origin/ui/redesign-v1` HEAD | `683d45d…` (fetched; matches governing) |
| Last **application/source-change** commit | `3a5f439c15cafa493cd2d2320d7733f286441b6b` (all later commits docs-only) |
| Local working branch (at audit start) | `docs/full-history-functional-variance-audit` @ `7a159bd` (PR #20 branch); audit branch `docs/full-system-synchronisation-audit` cut from `683d45d` |
| Local uncommitted | **untracked only** — local-only P6 "Rev10" docs, `supabase/verification/M1B_P6_discovery_readonly.sql`, ZIPs, and `M docs/YAV2_Master_Completion_Register.md`; **no tracked `src/` change** (prior audit exception E-1/FV-7) |
| Approved Supabase env | **V2 / yav2-dev `ogjrwemjefvccpyjwxuo`** only; **prohibited** V1/Production `zcszesuvjrryxtigjglt` |
| Supabase ref expected by source | `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_FUNCTIONS_URL` (placeholder `<APPROVED_V2_SUPABASE_PROJECT_REF>`); storage `VITE_DOCS_BUCKET=secure-docs` |
| Feature flags in source | `VITE_P2_PREVIEW` (Client Master Preview, default disabled), **`VITE_P5_UI`** (Service Applicability visibility gate) — **`VITE_P5_UI` is NOT in `.env.example`** (documentation/config gap) |
| Edge Functions invoked by source | `ai-agent` (`ChatAgent.jsx`), `extract-financial` (`Compliance.jsx`), `scan-document` (`OnboardingWizard.jsx`) — **none versioned in the repo** (`supabase/functions/` empty on governing) |
| Integrations referenced | WhatsApp PIN flow (`Clients.jsx` — "set new PIN on next WhatsApp session"); n8n/WhatsApp bot **documented as external, not in repo** (`YAV2_Master_Completion_Register.md` L225) |

## 2. Phase 2 — Vercel synchronisation (VERIFIED provenance; config values UNVERIFIED)
Team `team_k1XHDoYfk0zOBVvGC4pVPFOc`. Both projects connect to the **same GitHub repo** and now build **`ui/redesign-v1`**.

| Field | `yes-advizors-portal-v2-preview` (governing) | `yes-advizors-portal` (second) |
|---|---|---|
| Project ID | `prj_PFPT5rOJ4hpjyfqDHvppBlxTVeZv` | `prj_7vjFHtSJQIIHiPJEvPw0DSwnCvEJ` |
| Framework | null (Vite via `vercel.json`) | vite |
| Latest deployment | `dpl_9edhdnZBrnbPuLR2oEfKdeL1G73H` (READY) | `dpl_2jHcJySCgZ3jSajAHRD9XekP17N9` (READY) |
| Deployment commit SHA | **`683d45d…`** (== governing HEAD ✓) | **`6ef948f…`** (PR #18 merge) |
| Git ref | `ui/redesign-v1` (verified commit) | `ui/redesign-v1` (verified commit) |
| Target / Production? | `target:null`, `live:false` → **Preview-class; no Production target** | `target:null`, `live:false` → **Preview-class; no Production target** |
| Production domains | `yes-advizors-portal-v2-preview.vercel.app` (+ `-yes-advizors-projects`) | `yes-advizors-portal.vercel.app`, `-yes-advizors-projects`, `-git-main-…` |
| Branch alias | `-git-4c8764-…` | `-git-ui-redesign-v1-…` |
| Region | iad1 | iad1 |

**Findings:**
- **Provenance PASS (both):** each latest deployment's `githubCommitSha` matches a governing-repo `ui/redesign-v1`
  commit, verified signature, correct repoId. **No Production contamination** (no `target:production`; `live:false`).
- **App-code equivalence:** governing = `683d45d`, second = `6ef948f`. The delta `6ef948f→683d45d` is **documentation-only**
  (last source change `3a5f439`), so **both projects serve identical application code**. The "wrong/stale project =
  old app" hypothesis is therefore **weak on code**, but **not eliminated on configuration** (below).
- **CONFIG UNKNOWN (both) — the material live gap for Phase 2:** the **values** of env vars and **feature-flag
  settings** per project/environment were **not readable** via available read-only calls. It is **unconfirmed**
  whether each project has `VITE_P5_UI=true` and `VITE_P2_PREVIEW=true` (without which **Service Applicability** and
  **Client Master Preview** are **hidden even though the code is present**), and **which Supabase project ref** each
  project's `VITE_SUPABASE_URL`/`VITE_SUPABASE_FUNCTIONS_URL` points to. This is a **prime runtime-invisibility cause
  candidate** and is deferred to FR-1.
- **URL PJ uses — UNCONFIRMED:** two plausible production domains exist (`…-v2-preview.vercel.app` vs
  `yes-advizors-portal.vercel.app`). Which one PJ opens, and that domain's exact promoted deployment, must be
  confirmed (FR-1). Distinct concepts kept separate: **GitHub HEAD `683d45d`** ≠ **Vercel deployment SHA** (683d45d /
  6ef948f) ≠ **domain-promoted deployment** (not read here) ≠ **URL PJ opens** (unconfirmed).
- **`vercel.json`:** SPA rewrite (`/((?!assets/).*) → /index.html`) + security headers (XFO DENY, nosniff, HSTS,
  Referrer/Permissions-Policy). Build command / output dir / ignored-build rules / env-var names per project were not
  exposed by the read-only calls used (FR-1).

## 3. Phase 3 — Supabase V2 read-only (UNVERIFIED within guardrails — dependency surface catalogued)
Live inspection of `ogjrwemjefvccpyjwxuo` was **not** performed (see §0). The following is the **source/GitHub-declared
expectation** that a PJ-run read-only V2 discovery (separate gate) must confirm:

| Area | Source/GitHub-declared expectation | Live V2 state |
|---|---|---|
| Migrations present | `0001–0011`, `0014–0018`, `0021`, `0022` (+ rollbacks) | **UNVERIFIED** |
| Migration gaps | `0012` file absent (executed live historically — provenance gap); `0013` reserved/unused | **UNVERIFIED** |
| P5 migrations | `0021_service_applicability`, `0022_p5_pg1_other_notes_enforcement` present in repo | **UNVERIFIED** (executed?) |
| Tables/keys/indexes/constraints/views/enums | Per `0001–0009` (people/clients, work/documents, compliance trackers, RPCs, views) | **UNVERIFIED** |
| Views | e.g. `v_firm_dashboard` (uses `due_in_7_days`), `v_client_compliance_summary` (`due_soon`) | **UNVERIFIED** |
| RLS / FORCE RLS / policies | `0006`/`0010` refined; `is_active_user()` (UID-keyed), `team_others_select` | **UNVERIFIED** |
| Grants / helpers / audit fns | `0008` RPCs; `0005`/`0016` audit write & lineage; SECURITY DEFINER helpers | **UNVERIFIED** |
| Auth ↔ team mapping | `team.auth_user_id` ↔ Auth UUID; `team.is_active`; portal role; admin flag; client/team assignments | **UNVERIFIED** — **the most likely root cause of admin/non-admin/RBAC "not working"** (see FV-2 lineage: P5 Step 12 required provisioning a `team` row before a Staff user became active) |
| Storage | bucket `secure-docs` (from `VITE_DOCS_BUCKET`); policies | **UNVERIFIED** |
| Edge Functions | source invokes `ai-agent`, `extract-financial`, `scan-document`; **none in repo**; dKYC branch expects `dkyc-verify-upload` | **UNVERIFIED** — **source depends on Edge Functions with no versioned source (0012-style provenance gap)** |

## 4. Phase 4 — n8n & integrations (evidence-based)
- **Repository search** (`src`, docs, config) found **no n8n workflow, code, or export in the repo**. Direct evidence:
  `docs/YAV2_Master_Completion_Register.md` L225 — *"no WhatsApp/n8n code in the governed repo … Existing bot/n8n
  work lives outside this repository — inventory it at gate start; do not re-enable."*
- **WhatsApp** appears only as a **UI-triggered PIN-reset** in `Clients.jsx` (client sets a new PIN on next WhatsApp
  session) — implying an **external WhatsApp bot / automation** whose backend is **not in this repo**.
- **Audit-log design docs** list `whatsapp`, `edge_function`, `n8n`, `scheduled_job`, `webhook` as event **channels**
  (`PHASE4A_AUDIT_LOG_SCHEMA_DRAFT.md`) — describing an intended integration surface, not versioned workflows.
- **Conclusion:** **n8n/WhatsApp automation is an external, un-versioned integration** — not synchronised into GitHub.
  The connected n8n MCP workspace was **not probed** (unconfirmed as the YAV2 workspace; probing could touch an
  unrelated account). Live n8n inventory is **UNVERIFIED** and requires PJ to confirm the workspace first (FR-6).

## 5. Phase 5 — Controlled runtime (UNVERIFIED — no approved test credentials in-session)
Authenticated admin/manager/staff scenarios, dKYC presence-at-runtime, and feature end-to-end tests **could not be
executed** (no credentials). They are delivered as a ready-to-run plan (§9.5). **Recorded before any future run:**
governing URL candidate `https://yes-advizors-portal-v2-preview.vercel.app`, deployment `dpl_9edhdnZBrnbPuLR2oEfKdeL1G73H`,
SHA `683d45d…` (confirm the exact URL PJ uses first). **Source-side** facts for the runtime gate: dKYC has **no menu/
route/component** in governing source (only `OnboardingWizard.jsx`, which is client-onboarding, not Director-KYC);
Service Applicability & Client Master Preview render **only when `VITE_P5_UI` / `VITE_P2_PREVIEW` are `true`**.

## 6. Phase 6 — Full-system variance matrix
L=Localhost · GH=GitHub · V=Vercel · SB=Supabase V2 · N=n8n/integration · RT=Runtime. `✓` verified · `~` partial/historical · `?` unverified · `✗` absent.

| ID | Feature / dependency | L | GH | V | SB | N | RT | Expected | Exact variance | Likely cause (evidence) | Conf | Risk | Recovery | PJ gate |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|---|---|---|---|---|---|---|
| VS-01 | Admin login | ✓ | ✓ | ✓ | ? | – | ? | Admin authenticates, full access | Source present; live unverified | DB/Auth `team` mapping + config (not source) | Med | High | FR-1/FR-2/FR-3 | Runtime+DB |
| VS-02 | Manager login | ✓ | ✓ | ✓ | ? | – | ? | Manager scoped access | live unverified | Auth/`team` role data | Med | High | FR-1/FR-3 | Runtime+DB |
| VS-03 | Staff / non-admin login | ✓ | ✓ | ✓ | ? | – | ? | Staff limited access | Historically "not active" until `team` row provisioned (P5 Step 12) | Missing/incorrect `team.auth_user_id`/`is_active` on V2 | Med | High | FR-3 | DB data (PJ-exec) |
| VS-04 | Auth ↔ `team` mapping | – | ✓ | – | ? | – | ? | Every test user mapped/active | live unverified | V2 data state | Med | High | FR-2/FR-3 | DB |
| VS-05 | RBAC (is_admin/portal role) | ✓ | ✓ | ✓ | ? | – | ? | Correct role gating | source present; live unverified | RLS/data + flags | Med | High | FR-1/FR-2 | Runtime+DB |
| VS-06 | Menu/route/action permissions | ✓ | ✓ | ✓ | ? | – | ? | Permitted vs denied enforced | live unverified | client-side gating + RLS | Med | High | FR-1 | Runtime |
| VS-07 | Client-level restrictions | – | ✓ | – | ? | – | ? | Users see only assigned clients | live unverified | RLS `is_active_user()` + assignments | Med | High | FR-2 | DB |
| VS-08 | Client Master + preview | ✓ | ✓ | ✓ | ? | – | ~ | Visible to Admin/Manager | **Hidden unless `VITE_P2_PREVIEW=true`** | Vercel env flag likely unset | **High** | High | FR-1 | Config |
| VS-09 | Service Applicability | ✓ | ✓ | ✓ | ? | – | ~ | Visible per role | **Hidden unless `VITE_P5_UI=true`** (flag absent from `.env.example`) | Vercel env flag likely unset/undocumented | **High** | High | FR-1 | Config |
| VS-10 | Customer assessment / **Director-KYC (dKYC)** | ✗ | ✗(open PR#9/#10) | ✗ | ? | – | ✗ | (scope TBD) | **Absent from governing/live**; built on unmerged PRs #9/#10 | Not ported into redesign (FV-1) | **High** | Med-High | FR-5 (scope+port) | Scope+build |
| VS-11 | Compliance trackers + dashboard | ✓ | ✓ | ✓ | ? | – | ? | Dashboard + trackers work | `v_firm_dashboard` uses `due_in_7_days`; historic FE `due_soon` mismatch fixed in source | needs current-runtime confirm | Med | Med | FR-1 | Runtime |
| VS-12 | Tasks | ✓ | ✓ | ✓ | ? | – | ? | CRUD per role | live unverified | — | Low | Med | FR-1 | Runtime |
| VS-13 | Documents / WorkDocuments | ✓ | ✓ | ✓ | ? | – | ? | Upload/view per role | live unverified; storage `secure-docs` + `scan-document` fn | storage/Edge state | Med | Med | FR-1/FR-2 | Runtime+DB |
| VS-14 | Team | ✓ | ✓ | ✓ | ? | – | ? | Manage team per role | live unverified | — | Low | Med | FR-1 | Runtime |
| VS-15 | Audit logs | ✓ | ✓ | ✓ | ? | – | ? | Admin views audit | governing uses `0005`/`0016` (phase4c set superseded, PR#6) | live unverified | Med | Med | FR-2 | DB |
| VS-16 | Onboarding wizard | ✓ | ✓ | ✓ | ? | – | ? | Client onboarding + `scan-document` | Edge fn `scan-document` not in repo | Edge deploy state on V2 | Med | Med | FR-2 | DB/Edge |
| VS-17 | AI chat agent | ✓ | ✓ | ✓ | ? | – | ? | `ai-agent` Edge fn responds | Edge fn not in repo | Edge deploy state on V2 | Med | Low | FR-2 | DB/Edge |
| VS-18 | Financial extract | ✓ | ✓ | ✓ | ? | – | ? | `extract-financial` Edge fn | Edge fn not in repo | Edge deploy state on V2 | Med | Low | FR-2 | DB/Edge |
| VS-19 | Migrations executed on V2 | – | ✓ | – | ? | – | – | All repo migrations applied | `0012` provenance gap; `0021`/`0022` execution unconfirmed | V2 execution state | Med | Med | FR-2 | DB |
| VS-20 | RLS / functions / triggers | – | ✓ | – | ? | – | – | RLS ON + policies effective | live unverified | V2 security state | Med | High | FR-2 | DB |
| VS-21 | Edge Functions (all) | – | ✗(not in repo) | – | ? | – | ? | `ai-agent`/`extract-financial`/`scan-document` deployed | **No versioned source** for any Edge fn (+ `dkyc-verify-upload` absent) | 0012-style source-provenance gap | **High** | Med | FR-2/FR-4 | DB/Edge |
| VS-22 | Storage (`secure-docs`) | – | ✓(name) | ✓(name) | ? | – | ? | Bucket + policies exist | live unverified | V2 storage state | Med | Med | FR-2 | DB |
| VS-23 | Vercel config / env / flags | – | ~ | ? | – | – | ? | Correct env+flags+ref per project | **values not readable**; flags likely unset | config not exposed | **High** | High | FR-1 | Config |
| VS-24 | n8n / WhatsApp integration | ✗ | ✗ | – | – | ? | ? | External automation working | **Not in repo / not version-controlled** | External, un-synced integration | **High** | Med | FR-6 | Inventory |

## 7. Phase 7 — Verification percentage (governance progress indicator — NOT an assurance opinion)
| # | Category | Verified | Unverified | Basis / evidence | Exclusions |
|---|---|:--:|:--:|---|---|
| 1 | Localhost alignment | 95% | 5% | Working tree = governing tracked source; only untracked P6/ZIP material | tracked-file byte compare not re-hashed |
| 2 | GitHub alignment | 100% | 0% | `origin/ui/redesign-v1 == 683d45d`; full-history audit (#19/#20) | — |
| 3 | Vercel provenance / config | 55% | 45% | Provenance PASS both projects (SHA/ref verified, Preview, no Prod); **config values/flags/env not readable** | env-var values, flag settings, build cfg, domain→deploy map, URL PJ uses |
| 4 | Supabase schema / migrations | 10% | 90% | Repo migration set known; **V2 execution not inspected** | all live schema/migration state |
| 5 | Supabase Auth / RBAC / mapping | 0% | 100% | Not inspected (guardrails) | all Auth/`team`/RLS data |
| 6 | Storage / Edge Functions | 5% | 95% | Names known; **no Edge source in repo**; live not inspected | bucket/policies, deployed fns/versions |
| 7 | n8n / integrations | 30% | 70% | Repo evidence = external/not-in-repo; live workspace not probed | live n8n workflows |
| 8 | Admin runtime | 0% | 100% | No credentials | full admin scenario |
| 9 | Manager / staff runtime | 0% | 100% | No credentials | full manager/staff scenarios |
| 10 | Feature end-to-end runtime | 0% | 100% | No credentials/runtime drive | all feature runtime |
| | **Overall (weighted, indicative)** | **≈ 30%** | **≈ 70%** | Provenance strong; **live/DB/runtime/config/integration largely unverified** | — |

> The ~30% is a **governance progress indicator only**. It reflects that provenance (local/GitHub/Vercel-SHA) is
> strong while the live layers (Supabase V2, runtime, per-project config, integrations) are largely unverified.

## 8. Phase 8 — Recovery / verification plan (proposed; NOTHING performed or authorised here)
Each is a **separate PJ-approved package**; ordered by priority.

| FR | Package title | Scope / systems | DB impact | Vercel impact | n8n impact | Tests | Risk | Rollback | PJ gates | Order |
|---|---|---|---|---|---|---|---|---|---|:--:|
| **FR-1** | Vercel URL/project/config verification | Confirm exact URL PJ uses; per-project env-var **values**, `VITE_P5_UI`/`VITE_P2_PREVIEW`, Supabase ref, build cfg, domain→deployment map | none | **read-only** (no change/redeploy) | none | Config read-only | Low | n/a | Read-only PJ | 1 |
| **FR-2** | Supabase V2 read-only discovery | PJ-run read-only V2 checks: schema/migrations/RLS/functions/triggers/storage/**Edge deploy state**; reconcile vs repo; `0012` provenance | read-only | none | none | SQL read-only (PJ-run) | Low | n/a | DB read-only (V2) | 2 |
| **FR-3** | Auth/RBAC live-enablement | Provision/repair `team.auth_user_id`/`is_active`/role for approved admin/manager/staff test users on V2 | **write (data)** | none | none | Login re-test | Med | Revert rows | DB write (PJ-exec, V2) | 3 |
| **FR-4** | Edge Function source recovery | Recover/version `ai-agent`, `extract-financial`, `scan-document` (+ decide `dkyc-verify-upload`) into repo; reconcile deployed vs source | none | none | none | Fn invoke (test) | Med | Redeploy prior | Authoring+deploy (separate) | 4 |
| **FR-5** | Director-KYC (dKYC) scope + selective port | PJ scope decision; if in-scope, requirements/security/compat/test/DB-reviewed selective port from PR #9/#10 (no wholesale merge) | schema add | build | none | Full feature | High | Feature-flag off | Scope+build+DB | 5 |
| **FR-6** | n8n / integration inventory | Confirm YAV2 n8n workspace; read-only inventory; decide version-controlling exports | none | none | **read-only** | Inventory | Low | n/a | Inventory (PJ) | 6 |
| **FR-7** | Live acceptance | End-to-end runtime acceptance on the confirmed governing URL with all deps + flags | read-only | read-only | read-only | Full UAT | Low | n/a | Runtime (PJ) | 7 |
| **FR-8** | Branch/PR/local cleanup | PJ-decided disposition of PRs #6/#9/#10, local-only `g2b/v2-migrations`, Rev10 P6 material, stale `feat/*` | none | none | none | — | Low | n/a | Cleanup (PJ) | 8 |

### 9.5 Runtime test plan (for FR-1/FR-3/FR-7 execution — not run here)
Record URL + deployment ID + SHA first. **Admin:** page load, login, identity, dashboard, menus, client list, Client
Master, Service Applicability, task/compliance/document/team, permitted create/edit/view (safe test data), restricted
functions denied, logout. **Manager:** login, menus, assigned-client visibility, permitted routes, admin-only denied,
Client Master/Service Applicability, logout. **Staff:** login, limited menus, assigned-client access, unauthorised
clients denied, admin actions denied, task/document access, logout. **dKYC:** confirm no menu/route/form (source
confirms absent), no dKYC tables/Edge → intentional-vs-unintentional per PJ scope. **Others:** dashboard, compliance,
tasks, documents, team, audit logs, onboarding, WhatsApp/PIN **only if already configured and non-business-impacting**.
No external messages; no business records; writes only on an explicitly-documented-safe approved test client.

## 9. Documentation-only PR & status updates (Phase 9)
Branch `docs/full-system-synchronisation-audit` from `683d45d`; adds this file; updates `PROJECT_STATUS.md` +
`CURRENT_PHASE_SCOPE.md`; draft PR → `ui/redesign-v1`. No code/SQL/migration/Vercel/Supabase/n8n change; no deployment.

## 10. Conclusion
### `UNABLE TO CONCLUDE`
- **Provenance is aligned and VERIFIED:** local ↔ GitHub `ui/redesign-v1@683d45d` ↔ Vercel deployments (governing
  `dpl_9edhdnZBrnbPuLR2oEfKdeL1G73H`@`683d45d`; second project @`6ef948f`, **identical app code**), verified commits,
  **Preview-class, no Production contamination**.
- **Full system alignment CANNOT be certified:** Supabase V2 (schema/Auth/RLS/storage/Edge), authenticated runtime
  (admin/manager/staff), per-project Vercel **configuration values & feature flags**, and n8n/integration live state
  are **UNVERIFIED** within this package's executable guardrails. **No full-alignment claim is permitted** without
  these.
- **Highest-value, evidence-backed hypotheses for "developed features not visible/working"** (to be confirmed, not
  asserted): **(1) feature flags** `VITE_P5_UI` / `VITE_P2_PREVIEW` unset in the live Vercel env → Service
  Applicability & Client Master Preview hidden despite present code (VS-08/09/23, **High** confidence on mechanism);
  **(2) Auth↔`team` data** missing/incorrect on V2 → admin/manager/staff/RBAC failures (VS-01..07, consistent with
  the P5 Step-12 precedent); **(3) Director-KYC (dKYC) genuinely absent** from governing/live (VS-10, confirmed
  source gap from #19); **(4) Edge Functions / storage** deploy state on V2 unconfirmed and **un-versioned in repo**
  (VS-16..22).
- It is **not `FULL SYSTEM ALIGNMENT`** (live layers unverified), **not `MATERIAL SYSTEM MISALIGNMENT`** (provenance
  is sound and app code is consistent across both projects; the confirmed gaps are specific and explainable), hence
  **`UNABLE TO CONCLUDE`** — resolved by FR-1…FR-8 under separate PJ approval, starting with the **read-only** FR-1
  (Vercel config) and FR-2 (Supabase V2 discovery), which together can likely explain the reported invisibility.
