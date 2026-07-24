# YAV2 — Package A — Historical Evidence & Live-State Discovery

**Type:** Read-only discovery & evidence capture (documentation-only). **Work-package:** Issue #23 · **Package A**.
**Author:** Claude Code · **Reviewer:** ChatGPT · **Approver:** PJ. **Date:** 2026-07-23 IST.
**Governing base:** `ui/redesign-v1` @ `b2ceb30edccc7a209c4459fdb5c9df7caa51bcfb`.
**Companion:** `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql` (PJ executes on V2).

> **Strictly read-only.** No SQL executed, no migration authored, no application/Supabase/Auth/RLS/storage/Edge/Vercel/
> n8n/runtime change, no deploy, no merge, no cleanup. Claude never touches the database. **Live-DB, live-Vercel-config,
> runtime and n8n facts are delivered as PJ-execution plans and marked accordingly — not claimed verified here.**

## A1 — Baseline & preservation evidence (VERIFIED read-only)
| Item | Value |
|---|---|
| Local branch (this package) | `recovery/package-a-live-state-discovery` @ `b2ceb30` |
| Local HEAD | `b2ceb30edccc7a209c4459fdb5c9df7caa51bcfb` |
| `origin/ui/redesign-v1` HEAD | `b2ceb30…` — **exact match with governing HEAD ✓** |
| Local branches (11) | `docs/full-history-functional-variance-audit`(7a159bd), `docs/full-system-synchronisation-audit`(8de19a9), `docs/p6-first-release-scope-and-due-dates`(f8c43dc), `docs/project-live-alignment-audit`(9ffa7ed), `docs/project-wide-ai-collaboration-setup`(cd2eafd), `fix/frontend-safety-v1`(bda50f6), **`g2b/v2-migrations`(ae6bf1e, local-only)**, `main`(0588806), `recovery/package-a-live-state-discovery`(b2ceb30), `recovery/yav2-complete-history-live-alignment`(038f257), `ui/redesign-v1`(e6b7ec6 — stale local copy, behind origin) |
| Remote branches (22) | incl. dKYC: `feat/dkyc-phase2-frontend`(3863559), `feat/dkyc-statutory`(e63dd14); audit: `feat/phase4a/b/c/d`, `feat/phase4-…`; `feat/admin-dashboard-home`; `feat/phase3-pr-safety-gate`; `claude/*`; `tmp/dkyc-assembly-c8180f`; `main` |
| Stashes / Tags | **0 / 0** |
| Migration branches | `g2b/v2-migrations` (local-only); phase4c (remote) |

**Localhost recovery inventory (classification — nothing altered/moved/deleted):**
| Local-only item | Classification |
|---|---|
| `M docs/YAV2_Master_Completion_Register.md` (modified tracked) | `PRESERVE — REVIEW REQUIRED` (uncommitted decision-register edits) |
| `docs/M1B_P6_*.md` (13 files) + `docs/YAV2_P6_Readonly_Discovery_Execution_Capture_22_July_2026_IST.md` | `P6 / OUT OF CURRENT RECOVERY SCOPE` (Rev10; superseded by #14) |
| `supabase/verification/M1B_P6_discovery_readonly.sql` | `P6 / OUT OF CURRENT RECOVERY SCOPE` |
| 26 `*.zip` review bundles | `DUPLICATE / ZIP EVIDENCE` |
| `g2b/v2-migrations`(ae6bf1e) local-only branch | `LIKELY SUPERSEDED` (PR-#12 baseline) — Package B review |
| dKYC remote branches (#9/#10) | `HISTORICAL-BRANCH-ONLY` → Package E |
| phase4c remote branch (#6) | `LIKELY SUPERSEDED` (governing `0005`/`0016`) |

## A2 — Governing GitHub source inventory (VERIFIED)
**Nav / permission gates (`App.jsx`):** tabs — `home`(admin-only "Firm Overview"), `dashboard`, `tasks`, `clients`(Onboarding), `compliance`, `documents`, `team`, `usage`, `auditlog`(admin-only). **Role gating is `user.is_admin === true` only** at tab level; **manager/executive/intern/staff differentiation is NOT tab-gated** → any such RBAC is DB/RLS/component-driven (finding: verify whether designed multi-role menu/route/action gating exists live — Package C).
**Components (33):** Login, AdminHome, Dashboard, Tasks, Clients, Compliance, DocumentsHub, DocumentManager, WorkDocuments, Team, Usage, AuditLog, ChatAgent, OnboardingWizard, ErrorBoundary, AddTask/FollowUp/History/MarkFiled modals, `preview/*` (ClientMasterPreview + 6 sections), `serviceApplicability/*` (7). **No Director-KYC/dKYC component.**
**Hooks:** `useClientMasterRole`, `useServiceApplicabilityData`, `useServiceApplicabilityRole`. **Lib:** aadhaar (masking), clientMaster, compliance/complianceRunner/complianceTabs, serviceApplicability*, financialYear, errors.
**Tables referenced by source (33):** clients, client_persons, client_directors, client_identifiers, client_addresses, client_contacts, client_registrations, gst_registration_details, client_service_applicability, service_catalogue, client_financials, financials_tracker, financial_years, tasks, follow_ups, documents, completed_documents, extracted_document_data, team, claude_usage_log, compliance_calendar, accounting_tracker, gst_tracker, tds_tracker, income_tax_tracker, roc_tracker, llp_tracker, audit_tracker, notice_tracker; views v_firm_dashboard, v_client_compliance_summary, v_team_workload, v_overdue_ageing.
**RPCs referenced (3):** `activate_accounting_service`, `generate_client_compliance`, `get_sensitive_audit_logs`.
**Edge Functions referenced (3):** `ai-agent` (ChatAgent), `extract-financial` (Compliance), `scan-document` (OnboardingWizard) — **none versioned in repo**.
**Storage:** `secure-docs` (+ a legacy-bucket helper). **Feature flags:** `VITE_P2_PREVIEW` (Client Master Preview), `VITE_P5_UI` (Service Applicability). **Env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_FUNCTIONS_URL`, `VITE_DOCS_BUCKET`.
**WhatsApp:** UI PIN-reset only (`Clients.jsx`); backend external (not in repo). **Missing from governing:** Director-KYC/customer-assessment; `dkyc-verify-upload`; Edge Function source.

### A2 minimum-feature verification (source presence)
| Feature | Governing source | Note |
|---|---|---|
| admin login | ✓ (`Login.jsx`, `is_admin`) | runtime pending |
| manager login | ✓ (source) | no distinct nav gating (RLS-driven) |
| staff/non-admin login | ✓ (source) | precedent: needs `team` row (P5 Step 12) |
| Auth-to-team mapping | ✓ (`App.jsx` `.from('team')`) | live pending (A4 §11) |
| RBAC / menu / route / action perms | ✓ admin gate; ~ multi-role | Package C |
| client restrictions | source (RLS `is_active_user()`) | live pending |
| Client Master | ✓ `preview/*` | flag `VITE_P2_PREVIEW` |
| Service Applicability | ✓ `serviceApplicability/*` | flag `VITE_P5_UI` |
| onboarding | ✓ `OnboardingWizard` | `scan-document` edge |
| tasks / compliance / documents / team | ✓ | live pending |
| dashboards / reports | ✓ (`Dashboard`, `AdminHome`, views) | live pending |
| customer assessment / Director-KYC | ✗ (absent) | #9/#10 only → Package E |
| WhatsApp PIN | ✓ UI only | external backend → Package G |
| audit logs | ✓ `AuditLog` + `get_sensitive_audit_logs` | live pending |

## A3 — Vercel read-only discovery
| Field | `yes-advizors-portal-v2-preview` (governing) | `yes-advizors-portal` (second) |
|---|---|---|
| Project ID | `prj_PFPT5rOJ4hpjyfqDHvppBlxTVeZv` | `prj_7vjFHtSJQIIHiPJEvPw0DSwnCvEJ` |
| Linked repo / branch | `Yes-Advizors-Portal` / `ui/redesign-v1` | same / `ui/redesign-v1` |
| Latest deployment (captured at Package A discovery) | **`dpl_6zvEGXX67GxV7rSe3YSru4VPwapt`** — **HISTORICAL / SUPERSEDED** (governing-project deployment as of discovery, before the PR #25/#26 merges); the **current governing deployment is a later build at `d95912f`** on the `-git-4c8764-…` generated domain (A3.1) | `dpl_2jHcJySCgZ3jSajAHRD9XekP17N9` |
| Deployment SHA | **`b2ceb30…`** — was the governing HEAD **at discovery time**; **now superseded** (governing HEAD advanced via PR #25→`800013f`, PR #26→`d95912f`). **`dpl_6zvEGXX67…`/`b2ceb30` is NOT the current governing deployment and NOT the duplicate project — it is an earlier deployment of the same governing project. The current governing `d95912f` deployment was NOT built from `b2ceb30`.** | `6ef948f…` (app-source equivalent; duplicate project) |
| Target | `target:null`, `live:false` → no Production-target observed | same |
| Domains/aliases | `…-v2-preview.vercel.app`, `-git-4c8764-…` | `yes-advizors-portal.vercel.app`, `-git-main-…` |
| Build framework/command/output | **UNVERIFIED — MANUAL PJ EVIDENCE REQUIRED** (not exposed; `framework:null`, Vite via `vercel.json`) | UNVERIFIED |
| Governing deployment URL | **`https://yes-advizors-portal-v2-preview-git-4c8764-yes-advizors-projects.vercel.app`** — generated `-git-4c8764-…` deployment at `d95912f`, the **current governing deployment** (see A3.1). The clean alias `https://yes-advizors-portal-v2-preview.vercel.app` is **STALE / MISASSIGNED** and is **NOT** the governing URL. | — |

**Environment-variable discovery (names required by source; returned Vercel evidence observed presence/scope for `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_P2_PREVIEW` only — secret values NOT revealed; the other source-required variables were NOT observed in the returned Vercel evidence):**
| Variable | Required by source | Present in Vercel env (observed) | Points to authorised V2 |
|---|---|:--:|:--:|
| `VITE_SUPABASE_URL` | yes | present (scope observed; value not revealed) | **VERIFIED V2** (runtime targets `ogjrwemjefvccpyjwxuo.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | yes | present (value not revealed) | n/a (key — never revealed) |
| `VITE_SUPABASE_FUNCTIONS_URL` | yes | **UNVERIFIED — NOT OBSERVED IN RETURNED VERCEL EVIDENCE** | UNVERIFIED (not observed) |
| `VITE_DOCS_BUCKET` (`secure-docs`) | yes | **UNVERIFIED — NOT OBSERVED IN RETURNED VERCEL EVIDENCE** | n/a (bucket name) |
| `VITE_P2_PREVIEW` | flag | present/scope observed | n/a |
| `VITE_P5_UI` | flag | **UNVERIFIED — NOT OBSERVED IN RETURNED VERCEL EVIDENCE** | n/a |
**Deployed V2 target — VERIFIED (browser Network evidence):** on the **governing deployment `d95912f`**, browser Network evidence verified the app **targets `ogjrwemjefvccpyjwxuo.supabase.co`**, and the response header **`Sb-Project-Ref` confirmed the authorised V2 project ref `ogjrwemjefvccpyjwxuo`**. **No V1 target was observed.** So the deployed V2 target is **no longer wholly unverified** — the runtime Supabase target is confirmed V2.
**What is (and is not) established:** **secret environment-variable values were not revealed** (correct — never requested); **variable presence/scope was observed for `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_P2_PREVIEW` only** (the remaining source-required variables — `VITE_SUPABASE_FUNCTIONS_URL`, `VITE_DOCS_BUCKET`, `VITE_P5_UI` — were **NOT observed in the returned Vercel evidence**); the **runtime V2 target is verified via Network `Sb-Project-Ref`**. **Deployment-provenance clarification:** `dpl_6zvEGXX67…` (= commit `b2ceb30`) is a **historical/superseded deployment of the governing project** captured at Package A discovery — it is **not** the current governing deployment and **not** the duplicate project; the **current governing deployment is a later, separate build at commit `d95912f`** (`-git-4c8764-…` domain). **No reader should infer that the `d95912f` deployment was built from `b2ceb30`.** Duplicate project: the second project (`dpl_2jHcJySCgZ…` @ `6ef948f`) is a duplicate building the same branch (app-source equivalent).

### A3.1 — VERIFIED deployment-to-alias variance (Package A runtime evidence, 2026-07-23 IST)
PJ-returned runtime evidence establishes a **deployment-to-alias mismatch** on the governing V2 project. The **source, migration, live V2 database, and the current governing deployment `d95912f` are ALL ALIGNED** on `due_in_7_days`; only the **clean Vercel alias is stale/misassigned**. All governing findings below are anchored to governing HEAD **`d95912f428770915a0a2ee7c30ba31422abcfbe5`** (distinct from the working-branch commit `cd56252`, which was the **pre-final-correction baseline** — the working branch has since advanced through the final Package A documentation corrections and is now ahead of `cd56252`).

| Layer | State | Evidence |
|---|---|---|
| Governing source (`ui/redesign-v1@d95912f`) | ✅ selects **`due_in_7_days`** | `Dashboard.jsx:18` (explicit list), `Compliance.jsx:1260` (`select('*')`)+`1278`; **no** `v_firm_dashboard.due_soon` select anywhere |
| Repo migration | ✅ `v_firm_dashboard` defined with **`due_in_7_days`** | `supabase/migrations/0009_views.sql:93,160` (`due_soon` at L83 belongs to the separate `v_client_compliance_summary`) |
| Live V2 database view | ✅ columns include **`due_in_7_days`** (no `due_soon`) | live `v_firm_dashboard` columns: category, total, completed, overdue, pending, **due_in_7_days**, waiting_client, partner_approval_pending |
| **Current governing deployment** (`d95912f`) | ✅ **Ready; returns valid data with `due_in_7_days`; no `due_soon` error; targets V2 `ogjrwemjefvccpyjwxuo`** (Network `Sb-Project-Ref` confirmed; no V1 observed) | generated domain `https://yes-advizors-portal-v2-preview-git-4c8764-yes-advizors-projects.vercel.app` |
| **Clean Vercel alias** | ❌ **STALE / MISASSIGNED** — serves a **stale or non-governing deployment** whose bundle sends an invalid `v_firm_dashboard.due_soon` request → PostgreSQL **42703** | `https://yes-advizors-portal-v2-preview.vercel.app`; its deployment page shows only generated preview domains — custom/clean-domain assignment to `d95912f` was **skipped** (alias not assigned to `d95912f`) |

**Root cause:** the clean Vercel alias `yes-advizors-portal-v2-preview.vercel.app` is **not assigned to the governing deployment `d95912f`**; it continues to serve a **stale or non-governing deployment** whose bundle still requests the removed `due_soon` column. This is a **Vercel alias/promotion issue only** — **not** a source, migration, or database defect (all four are aligned on `due_in_7_days`).

**Impact:** users opening the **clean Vercel alias** get a `42703` on `v_firm_dashboard` and a broken firm/dashboard load; the **generated governing deployment URL is unaffected** and returns valid data.

**Recommended correction (separately authorised — NOT performed here):** a **Vercel alias promotion/reassignment** pointing the clean alias `yes-advizors-portal-v2-preview.vercel.app` to deployment **`d95912f`** (the current governing build). **No database change and no source-code change are recommended** (source/migration/DB already correct).

**Interim testing instruction:** until the alias is corrected, **use the generated governing deployment URL** `https://yes-advizors-portal-v2-preview-git-4c8764-yes-advizors-projects.vercel.app` (commit `d95912f`, V2 `ogjrwemjefvccpyjwxuo`) for all runtime testing — **do not** rely on the stale clean alias.

*(Read-only evidence record. No deployment, alias change, SQL, migration, or source edit performed. Any alias promotion is a separate PJ-approved Vercel action.)*

## A4 — Supabase V2 discovery package
Delivered as `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql` — **PJ executes on V2 (`ogjrwemjefvccpyjwxuo`) only; never V1.** SELECT-only; no DDL/DML/mutating calls/role/grant changes; no secret/hash/token selection.
- **Manual V2 target confirmation (no automatic abort):** the script **cannot** reliably assert project identity from SQL (`current_database()`/server address are not trustworthy signals), so Section 0 only **prints hints**; **PJ must manually confirm** the dashboard project ref = `ogjrwemjefvccpyjwxuo` before trusting any output and STOP if it is not V2.
- **Read-only protection:** **Part 1** is wrapped in `BEGIN; SET TRANSACTION READ ONLY; … COMMIT;` and uses only `pg_catalog`/`information_schema`, so it **never errors on missing objects** and captures gaps as data. If the editor runs statements individually, transaction-level protection may not span the whole run — every statement is SELECT-only regardless (optionally `SET default_transaction_read_only = on;`).
- **No all-or-nothing failure:** data-dependent probes that could error on an absent table/column (CLI migration ledger `supabase_migrations.schema_migrations`; `auth.users`/`team` role & mapping; module counts; `storage.buckets/objects`) are moved to **Part 2 as OPTIONAL standalone probes** with rerun instructions — **an error is itself a finding**, noted and skipped, not a script stop. Object existence is authoritatively reported by the catalog-safe Section 9b in Part 1.
- **Part 1 sections:** 0 identity hints · 1 schemas · 2 tables/columns · 3 constraints · 4 indexes · 5 enums · 6 views/matviews · 7 functions (security/owner/`search_path`) · 8 triggers · 9b expected-object existence (`0001–0022`; `0012`/`0019` notes) · 10 RLS/FORCE-RLS/policies/grants/function-execute · 13c storage policies · 15 audit objects/functions. **Part 2 optional probes:** 9 CLI ledger · 11 Auth+team+mapping (counts/status only) · 12 module counts · 13 storage buckets/objects · 14 Edge-function names (dashboard/CLI). **PJ pastes the full Part 1 output + every Part 2 probe result (including any "does not exist" errors) back for the Package A/B registers.**

## A5 — Auth/RBAC runtime evidence template (no users created/changed)
Existing **approved test accounts required** (PJ provides; Claude creates none): admin; manager; staff; restricted staff; (client user if applicable). PJ captures per scenario: login result · resolved identity (`team` row, `is_admin`, `portal_role`, `is_active`) · visible menus/routes · permitted vs denied actions · client scope.
**Negative-scenario evidence to capture:** unmapped authenticated user (deny); inactive user (deny/"not active"); banned user (deny); wrong-client access (deny); direct-route access to admin-only tab (deny); direct RPC (`generate_client_compliance`/`get_sensitive_audit_logs`) as non-privileged (deny); storage access to `secure-docs` cross-client (deny); audit-log read as non-admin (deny). **Frontend menu hiding is not security** — each denial must be DB/Edge-enforced. Record which approved accounts + evidence PJ must supply.

## A6 — Edge Function & storage discovery register
| Edge Function | Referenced by source | In governing GitHub | In historical branch | Believed deployed (V2) | Recovery classification |
|---|---|:--:|:--:|:--:|---|
| `ai-agent` | ✓ `ChatAgent.jsx` | ✗ | ? | `DATABASE UNVERIFIED` (confirm via dashboard/CLI) | source-provenance recovery (B/E) |
| `extract-financial` | ✓ `Compliance.jsx` | ✗ | ? | `DATABASE UNVERIFIED` | B/E |
| `scan-document` | ✓ `OnboardingWizard.jsx` | ✗ | ? | `DATABASE UNVERIFIED` | B/E |
| `dkyc-verify-upload` | dKYC (absent) | ✗ | ✓ `feat/dkyc-statutory` (#10) | `DATABASE UNVERIFIED` | `HISTORICAL-BRANCH-ONLY` → E |
| WhatsApp-related | UI PIN only | ✗ | ? | `RUNTIME UNVERIFIED` | G |
**Auth/security concern:** every invoked Edge Function lacks versioned source in governing → source + deploy state must be recovered/verified before reliance.
**Storage (`secure-docs`):** source references present; `0011_storage_and_edge_DEFER` (deferred) + `0012` secure-docs live-only (R-9). Live verification status `DATABASE UNVERIFIED` (A4 §13). Required (verify): private bucket, per-client path separation, upload/download policies, signed-URL expiry, storage RLS. Unresolved: whether policies enforce client separation on V2.

## A7 — n8n & WhatsApp discovery
Repo evidence: **n8n/WhatsApp automation is external and un-versioned** (`YAV2_Master_Completion_Register.md` L225 — "no WhatsApp/n8n code in the governed repo … lives outside this repository"). No safe in-session access confirmed to the YAV2 n8n workspace. **Live inventory (workspace/workflow name/ID/active/purpose/webhook/credentials/Supabase target/data/WhatsApp+PIN+session flow/retries/idempotency/failure/logging/version-export/V1 refs/classification):** `UNVERIFIED — PJ MANUAL EXPORT OR SCREEN EVIDENCE REQUIRED`. Classification: `INTEGRATION ALIGNMENT REQUIRED` (Package G).

## A8 — Initial approval-to-live evidence register
| ID | Category | Historical approval | Governing GitHub | Localhost-only | Vercel | Supabase V2 | Auth/RBAC | Storage | Edge | n8n | Runtime | Classification | Pkg |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| I-01 | Auth · admin login | P0/P5 | present | – | b2ceb30 verified | `DATABASE UNVERIFIED` | `PJ EVIDENCE REQUIRED` | – | – | – | `RUNTIME UNVERIFIED` | `PRESENT — LIVE VERIFICATION PENDING` | C |
| I-02 | Auth · manager login | P9 | present | – | verified | UNVERIFIED | PJ EVIDENCE REQUIRED | – | – | – | UNVERIFIED | `PRESENT — LIVE VERIFICATION PENDING` | C |
| I-03 | Auth · staff/non-admin | P5/P9 | present | – | verified | UNVERIFIED | PJ EVIDENCE REQUIRED | – | – | – | UNVERIFIED | `PRESENT — LIVE VERIFICATION PENDING` | C |
| I-04 | Auth↔team mapping | P0/P5 | present | – | – | `DATABASE UNVERIFIED` (A4 §11) | PJ EVIDENCE REQUIRED | – | – | – | – | `DATABASE UNVERIFIED` | C |
| I-05 | RBAC menu/route/action | P9 | admin gate present; multi-role ~ | – | – | UNVERIFIED | PJ EVIDENCE REQUIRED | – | – | – | UNVERIFIED | `CONFIGURATION UNVERIFIED` | C |
| I-06 | Client restrictions (RLS) | P0/P9 | source | – | – | `DATABASE UNVERIFIED` (A4 §10) | – | – | – | – | UNVERIFIED | `DATABASE UNVERIFIED` | C |
| I-07 | Client Master + preview | P2 | present | – | verified | UNVERIFIED | – | – | – | – | UNVERIFIED | `CONFIGURATION UNVERIFIED` (`VITE_P2_PREVIEW`) | A/D |
| I-08 | Service Applicability | P5 (0021) | present | – | verified | UNVERIFIED | – | – | – | – | UNVERIFIED | `CONFIGURATION UNVERIFIED` (`VITE_P5_UI`) | A/D |
| I-09 | Onboarding | P2 | present | – | verified | UNVERIFIED | – | – | `scan-document` UNVERIFIED | – | UNVERIFIED | `PRESENT — LIVE VERIFICATION PENDING` | D |
| I-10 | Tasks | P7 | present | – | verified | UNVERIFIED | – | – | – | – | UNVERIFIED | `PRESENT — LIVE VERIFICATION PENDING` | D |
| I-11 | Compliance/trackers | P5/P6 | present (`generate_client_compliance`) | – | verified | UNVERIFIED | – | – | – | – | UNVERIFIED | `PRESENT — LIVE VERIFICATION PENDING` | D |
| I-12 | Documents | P8 | present | – | verified | UNVERIFIED | – | `secure-docs` UNVERIFIED | – | – | UNVERIFIED | `PRESENT — LIVE VERIFICATION PENDING` | D/F |
| I-13 | Team | P9 | present | – | verified | UNVERIFIED | PJ EVIDENCE REQUIRED | – | – | – | UNVERIFIED | `PRESENT — LIVE VERIFICATION PENDING` | D |
| I-14 | Dashboards/reports | P10 | present (views) | – | verified | `DATABASE UNVERIFIED` | – | – | – | – | UNVERIFIED | `PRESENT — LIVE VERIFICATION PENDING` | D |
| I-15 | Audit logs | P4 | present (`0005`/`0016`, `get_sensitive_audit_logs`) | – | verified | `DATABASE UNVERIFIED` | PJ EVIDENCE REQUIRED | – | – | – | UNVERIFIED | `PRESENT — LIVE VERIFICATION PENDING` | F |
| I-16 | Customer assessment / Director-KYC | historical (#9/#10) | absent | – | – | – | – | – | `dkyc-verify-upload` branch-only | – | – | `MISSING FROM GOVERNING` / `HISTORICAL-BRANCH-ONLY` | E |
| I-17 | WhatsApp PIN/automation | P11 | UI only | – | – | UNVERIFIED | – | – | – | `PJ EVIDENCE REQUIRED` | UNVERIFIED | `PJ EVIDENCE REQUIRED` | G |
| I-18 | Edge Functions (ai-agent/extract-financial/scan-document) | P8/P11 | ✗ source | – | – | UNVERIFIED | – | – | `DATABASE UNVERIFIED` | – | UNVERIFIED | `MISSING FROM GOVERNING` (source) + `DATABASE UNVERIFIED` (deploy) | B/E |
| I-19 | Migrations `0001–0022` | P0–P5 | present | – | – | `DATABASE UNVERIFIED` (A4 §9) | – | – | – | – | – | `DATABASE UNVERIFIED` | B |
| I-20 | `0012` secure-docs | R-9 | absent (executed live) | – | – | `DATABASE UNVERIFIED` | – | UNVERIFIED | – | – | – | `PJ EVIDENCE REQUIRED` / provenance gap | B |
| I-21 | `0019` D3 backfill | P3 | never assigned | – | – | `DATABASE UNVERIFIED` | – | – | – | – | – | `PJ EVIDENCE REQUIRED` | B |
| I-22 | RLS & privileges | P0/P9 | source | – | – | `DATABASE UNVERIFIED` (A4 §10) | – | – | – | – | – | `DATABASE UNVERIFIED` | C |
| I-23 | Functions/triggers/views | P1/P5 | source (`0008`/`0009`) + 3 RPCs | – | – | `DATABASE UNVERIFIED` (A4 §7/8) | – | – | – | – | – | `DATABASE UNVERIFIED` | B |
| I-24 | phase4c audit DB set | superseded | ✗ (PR #6) | – | – | – | – | – | – | – | – | `SUPERSEDED` | — |
| I-25 | Local-only Rev10 P6 / ZIPs | #14 super. / evidence | – | present | – | – | – | – | – | – | – | `LOCAL-ONLY — REVIEW REQUIRED` / `P6 OUT OF SCOPE` | B |
| I-26 | **Firm dashboard (`v_firm_dashboard`) runtime** | P10 | present (`due_in_7_days`) | – | **governing deploy `d95912f` VERIFIED ✓** (valid data, `due_in_7_days`, V2 via `Sb-Project-Ref`); **clean Vercel alias STALE** (42703 `due_soon`; stale or non-governing deployment; not assigned to `d95912f`) | live view has `due_in_7_days` ✓ | – | – | – | – | ✅ governing deploy / ❌ clean Vercel alias | `VERIFIED DEPLOYMENT-TO-ALIAS VARIANCE — remediation pending separate PJ authorisation` (**Vercel alias reassignment to `d95912f`**; NO DB/source change) | A → Vercel alias gate |
*(No item is `UNKNOWN`. Source ↔ migration ↔ live V2 DB ↔ governing deployment are aligned on `due_in_7_days`; only the clean Vercel alias is stale/misassigned — see A3.1.)*

## A9 — Verification percentage (governance indicators — NOT technical assurance)
**Distinct classes:** source/provenance (strong) · configuration (**partially verified** — Vercel env presence/scope observed + runtime V2 target confirmed) · live database (**partially verified** — live `v_firm_dashboard` structure confirmed; broader schema/RLS/functions/storage pending) · runtime (**partially verified** — governing deployment firm-dashboard path + V2 target confirmed; page-by-page & per-role runtime pending).
| Layer | Source/Prov | Config | Live DB | Runtime | Basis |
|---|:--:|:--:|:--:|:--:|---|
| Git history | 100% | – | – | – | all refs enumerated |
| Governing source | 100% | – | – | – | full inventory (A2) |
| Localhost-only work | 100% | – | – | – | inventoried & classified (A1) |
| Approved-decision evidence | 70% | – | – | – | initial inventory; row-by-row pending Pkg A exec |
| Database structure | 15% | – | **8%** | – | expected set known; **live `v_firm_dashboard` structure verified**; broader schema still pending (A4) |
| Migration execution | 10% | – | 0% | – | files known; V2 execution reconciliation pending |
| RLS & privileges | 10% | – | 0% | – | design known; V2 unverified |
| Auth/RBAC | 5% | – | 0% | 0% | source only; per-role runtime/DB pending |
| Vercel | 60%(prov) | **40%** | – | – | provenance + **exact URL confirmed**; **env presence/scope observed + runtime V2 target verified**; build settings/flag values still partial |
| Storage | 10% | – | 0% | – | bucket name; V2 unverified |
| Edge Functions | 20% | – | 0% | – | 4 named; deploy unverified; un-versioned |
| n8n/WhatsApp | 20% | – | 0% | 0% | external/un-versioned; no access |
| Runtime | – | – | – | **15%** | **governing deployment firm-dashboard path + V2 target verified**; page-by-page & per-role pending |
| **End-to-end alignment** | — | — | — | **15%** | **one verified path (governing deploy ↔ V2 ↔ `v_firm_dashboard`) + deployment-to-alias variance verified**; broad chain still pending |

**Governance indicator (recalculated, explicit basis):** computed as the **unweighted mean of the four evidence classes**, each class taking a single representative verification level with the stated basis:
- **Source/provenance ≈ 85%** — git history, governing source, localhost inventory, decision inventory and Vercel provenance all high/verified.
- **Configuration ≈ 40%** — Vercel env-var **presence/scope observed**, **runtime V2 target verified** (`Sb-Project-Ref` = `ogjrwemjefvccpyjwxuo`), **exact governing URL confirmed**; secret values not revealed; build settings + full flag-value matrix still open.
- **Live database ≈ 10%** — **live `v_firm_dashboard` structure verified**; full schema, migrations, RLS, functions, storage still pending.
- **Runtime ≈ 15%** — **governing deployment runtime behaviour verified for the firm-dashboard path + V2 target**, and the **deployment-to-alias variance verified**; page-by-page and per-role runtime pending.

**Overall governance indicator = (85 + 40 + 10 + 15) ÷ 4 = 150 ÷ 4 = 37.5% (approximately 38%)** (up from the prior coarse ≈30% because configuration, live-DB and runtime moved from "unverified" to "partially verified" on the six newly recorded items, against a still-large open live universe). **This remains a governance-progress indicator, NOT a technical assurance percentage.**

## A10 — Package conclusion
### `PACKAGE A PARTIAL — PJ EVIDENCE REQUIRED`
**Source/provenance discovery is complete AND a first set of live-state evidence has now been returned and verified** — A1 baseline/preservation; A2 governing source inventory; A3 Vercel **deployment provenance** (SHA); A3.1 **verified deployment-to-alias variance**; A4 V2 read-only discovery **output returned**; A5/A7 evidence templates; A6 Edge/storage register; A8 approval-to-live register with every item classified — no `UNKNOWN`; A9 indicators (now ≈38%). Under the governing handshake the following are now **observed/verified** (not merely authored): the **A4 V2 read-only discovery output was returned**; **Vercel environment-variable presence and scope were observed** (secret values not revealed); the **deployed runtime target was verified as the authorised Supabase V2 project `ogjrwemjefvccpyjwxuo`** (Network `Sb-Project-Ref`; no V1 observed); the **exact governing generated deployment URL was confirmed** (`…-git-4c8764-…vercel.app`); the **live `v_firm_dashboard` structure was verified**; and the **governing deployment firm-dashboard runtime path was verified**. **Source, migration `0009`, the live V2 database, and the governing deployment are all aligned on `due_in_7_days`**, and the **generated governing deployment at commit `d95912f` works correctly** (valid data, no `due_soon` error). Separately, the **clean alias `https://yes-advizors-portal-v2-preview.vercel.app` was verified as stale or misassigned** — it serves a **non-governing deployment that still requests the removed `due_soon` column** (PostgreSQL 42703); this **alias variance is a Vercel deployment/alias issue, NOT a current source, migration, or live-database defect** (all four layers are aligned on `due_in_7_days`). **Package A itself nonetheless remains PARTIAL** — it is **not** complete and **no complete live alignment, Package A closure, or production readiness is claimed** — because broader verification remains open (full page-by-page runtime, per-role Auth/RBAC live evidence, complete schema/RLS/functions/storage/Edge live confirmation, and n8n/WhatsApp evidence); it closes only once the **remaining PJ evidence bundle is attached and reviewed** (by ChatGPT + PJ).
**Evidence returned/verified under the governing handshake (no longer pending):** (1) the A4 V2 read-only discovery output was returned; (2) Vercel env-var presence/scope was observed and the deployed **V2 target was verified** (`Sb-Project-Ref` = `ogjrwemjefvccpyjwxuo`; no V1) — secret values not revealed; (3) the exact governing deployment URL was confirmed. **Still required to close Package A and consider Package B:** approved test-account runtime evidence (A5, remaining roles), and n8n/WhatsApp export/screen evidence (A7) — plus the open areas listed below.
**Package B is NOT authorised or "ready" merely because the discovery SQL, templates and this evidence exist** — closing Package A requires the remaining evidence, ChatGPT review, and a separate PJ approval. **No full live alignment is claimed.**

**Evidence already completed under the governing handshake (not pending):** on the **governing deployment `d95912f`** — the **Supabase V2 read-only discovery output** was returned; the **deployed runtime V2 target was verified** (Network evidence: app targets `ogjrwemjefvccpyjwxuo.supabase.co`; `Sb-Project-Ref` = `ogjrwemjefvccpyjwxuo`; no V1 observed); the **exact governing deployment URL was confirmed** (`…-git-4c8764-…vercel.app`); Vercel env **variable presence/scope was observed** (secret values not revealed); and the **first verified runtime finding** was recorded (A3.1 / register I-26): **source ↔ migration ↔ live V2 database ↔ governing deployment `d95912f` are aligned on `due_in_7_days`**, while the **clean Vercel alias `yes-advizors-portal-v2-preview.vercel.app` is stale/misassigned** (serves a **stale or non-governing deployment** → `v_firm_dashboard.due_soon` 42703). Corrective action = a **separately authorised Vercel alias promotion/reassignment to `d95912f`** — **no database or source-code change**. Until corrected, use the **generated governing URL** `…-git-4c8764-…vercel.app` for testing.

**Remaining OPEN areas (Package A stays PARTIAL):** n8n/WhatsApp inventory and runtime; full page-by-page frontend runtime verification; complete frontend/database field-contract review; unresolved audit-privilege review; and the other open items already listed in this register (per-role Auth/RBAC live evidence, RLS/functions/storage/Edge live confirmation, second-project posture, `0012`/`0019` provenance). These **may be progressed only under separately authorised Package A completion work and Packages B–H, as applicable**; **Package B is not authorised** by this evidence.

---

## Governance footer
```
Governing Issue: #23
Governing merged PR: #26
Governing HEAD: d95912f428770915a0a2ee7c30ba31422abcfbe5
Current working branch: recovery/package-a-pj-evidence-pack
Current commit: cd56252
Current package PR: NOT CREATED — PJ AUTHORISATION REQUIRED
```
