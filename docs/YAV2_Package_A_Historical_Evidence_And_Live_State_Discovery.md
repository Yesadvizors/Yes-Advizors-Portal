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
| Latest deployment | **`dpl_6zvEGXX67GxV7rSe3YSru4VPwapt`** | `dpl_2jHcJySCgZ3jSajAHRD9XekP17N9` |
| Deployment SHA | **`b2ceb30…` == governing HEAD ✓** (verified commit) | `6ef948f…` (app-source equivalent) |
| Target | `target:null`, `live:false` → no Production-target observed | same |
| Domains/aliases | `…-v2-preview.vercel.app`, `-git-4c8764-…` | `yes-advizors-portal.vercel.app`, `-git-main-…` |
| Build framework/command/output | **UNVERIFIED — MANUAL PJ EVIDENCE REQUIRED** (not exposed; `framework:null`, Vite via `vercel.json`) | UNVERIFIED |
| Governing deployment URL | `https://yes-advizors-portal-v2-preview.vercel.app` (confirm PJ's exact URL) | — |

**Environment-variable discovery (names required by source; live values/scopes NOT exposed by read-only API):**
| Variable | Required by source | Present in Vercel env | Points to authorised V2 |
|---|---|:--:|:--:|
| `VITE_SUPABASE_URL` | yes | `UNVERIFIED — MANUAL PJ EVIDENCE REQUIRED` | `UNVERIFIED — MANUAL PJ EVIDENCE REQUIRED` |
| `VITE_SUPABASE_ANON_KEY` | yes | UNVERIFIED — MANUAL PJ EVIDENCE REQUIRED | UNVERIFIED |
| `VITE_SUPABASE_FUNCTIONS_URL` | yes | UNVERIFIED — MANUAL PJ EVIDENCE REQUIRED | UNVERIFIED |
| `VITE_DOCS_BUCKET` (`secure-docs`) | yes | UNVERIFIED — MANUAL PJ EVIDENCE REQUIRED | n/a |
| `VITE_P2_PREVIEW` | flag | UNVERIFIED — MANUAL PJ EVIDENCE REQUIRED | n/a |
| `VITE_P5_UI` | flag | UNVERIFIED — MANUAL PJ EVIDENCE REQUIRED | n/a |
**Provenance vs configuration are separate facts:** `dpl_6zvEGXX67…` = commit `b2ceb30` proves **deployment provenance only** (which commit was built). It does **not** verify the deployment's **environment-variable values/scopes** or **which Supabase project** the built app actually points to at runtime — those remain **UNVERIFIED until PJ supplies evidence**.
**No secret values requested/exposed.** Duplicate/stale projects: the second project is a duplicate building the same branch (app-source equivalent). **V1 reference:** none observed in provenance metadata; **env-value V1/V2 target confirmation is `UNVERIFIED — MANUAL PJ EVIDENCE REQUIRED`.** **PJ evidence needed:** for each variable/project — name · scope · present/missing · V2-target confirmed (screenshot/redacted export), never secret values.

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
*(No item is `UNKNOWN`.)*

## A9 — Verification percentage (governance indicators — NOT technical assurance)
**Distinct classes:** source/provenance (strong) · configuration (unverified) · live database (unverified) · runtime (unverified).
| Layer | Source/Prov | Config | Live DB | Runtime | Basis |
|---|:--:|:--:|:--:|:--:|---|
| Git history | 100% | – | – | – | all refs enumerated |
| Governing source | 100% | – | – | – | full inventory (A2) |
| Localhost-only work | 100% | – | – | – | inventoried & classified (A1) |
| Approved-decision evidence | 70% | – | – | – | initial inventory; row-by-row pending Pkg A exec |
| Database structure | 15% | – | 0% | – | expected set known; V2 unverified (A4) |
| Migration execution | 10% | – | 0% | – | files known; V2 unverified |
| RLS & privileges | 10% | – | 0% | – | design known; V2 unverified |
| Auth/RBAC | 5% | – | 0% | 0% | source only; no creds/DB |
| Vercel | 60%(prov) | 0% | – | – | SHA verified; env values UNVERIFIED |
| Storage | 10% | – | 0% | – | bucket name; V2 unverified |
| Edge Functions | 20% | – | 0% | – | 4 named; deploy unverified; un-versioned |
| n8n/WhatsApp | 20% | – | 0% | 0% | external/un-versioned; no access |
| Runtime | – | – | – | 0% | no creds |
| **End-to-end alignment** | — | — | — | **0%** | live chain unverified |
**Overall governance indicator ≈ 30%** (provenance strong; configuration/live-DB/runtime largely unverified). **Not a technical assurance percentage.**

## A10 — Package conclusion
### `PACKAGE A PARTIAL — PJ EVIDENCE REQUIRED`
**Only the Claude-side source/provenance discovery is complete** — A1 baseline/preservation; A2 governing source inventory; A3 Vercel **deployment provenance** (SHA only); A4 discovery SQL **authored** (not run); A5/A7 evidence templates; A6 Edge/storage register; A8 approval-to-live register with every item classified — no `UNKNOWN`; A9 indicators. **Package A itself remains PARTIAL** and is **not** complete: it closes only once the **PJ evidence bundle is attached and reviewed** (by ChatGPT + PJ). **Live verification cannot proceed within standing guardrails** (Claude never executes SQL; connected Supabase MCP reaches only prohibited V1; no approved test-account credentials in-session; Vercel env values not exposed).
**PJ evidence required before Package A can be closed and Package B considered:** (1) run the A4 discovery SQL on V2 and return the full Part 1 + Part 2 output; (2) supply Vercel env-var presence/scope/V2-target evidence (redacted, no secrets); (3) confirm the exact governing portal URL PJ uses; (4) provide approved test-account runtime evidence (A5); (5) provide n8n/WhatsApp export or screen evidence (A7).
**Package B is NOT authorised or "ready" merely because the discovery SQL and templates exist** — it requires the returned evidence, ChatGPT review, and a separate PJ approval. **No live alignment is claimed.**
