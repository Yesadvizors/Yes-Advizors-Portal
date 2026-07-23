# YAV2 — Complete Historical Recovery, Consolidation & Live-Alignment Plan

**Type:** **Executable recovery design + initial source/history inventory** (documentation-only). **Work-package issue:** #23. *(The full historical audit/reconciliation and all live verification are executed under Packages A–H, not in this package.)*
**Establishes on:** #13 · #14 · #17 · #19 · #21 · PR #15 · PR #16 · PR #18 · PR #20 · PR #22.
**Author:** Claude Code · **Reviewer:** ChatGPT · **Approver:** PJ. **Date:** 2026-07-23 IST.
**Governing base:** `ui/redesign-v1` @ `798afaa80dc61d3a3466fa7badd5a60628d6ddc7`.

> **Documentation-only design package.** It **identifies and plans**; it **implements nothing**. No application code,
> SQL/migration authoring or execution, DB mutation, Supabase/Auth/RLS/function/trigger/storage/Edge change, Vercel
> config/redeploy, n8n change, deployment, merge, Production/V1 access, cleanup, or P6 implementation. **Every
> recovery action (Packages A–H) is a separate PJ-approved live-action gate.**

> **Objective:** move the **complete approved YAV2 system** into one controlled live state —
> `Localhost ↔ GitHub ↔ Vercel ↔ Supabase V2 ↔ Storage ↔ Edge Functions ↔ n8n/WhatsApp ↔ Live Runtime`. No valid
> approved work may remain isolated only on localhost, an abandoned branch, an old/unmerged PR, an unexecuted
> migration, a ZIP, or historical documentation.

> **Execution-capability constraint (governs every "live" row):** Claude never executes SQL / never touches the DB;
> the connected Supabase MCP reaches only the **prohibited V1** project; no approved test-account credentials
> in-session; SQL/migration authoring is not authorised here. Therefore all **live-state** facts below are
> **PENDING** and expressed as discovery/verification plans, not as verified live results.

> ## Present status (precise)
> - **COMPLETE RECOVERY DESIGN PREPARED.**
> - **INITIAL SOURCE/HISTORY INVENTORY COMPLETED.**
> - **FULL HISTORICAL AND LIVE RECONCILIATION PENDING EXECUTION OF PACKAGES A–H.**
>
> **What is NOT yet done** (deferred to Packages A/B execution, under separate PJ gates): the **row-by-row** approved-
> decision reconciliation, the **object-by-object / per-table** database reconciliation, **migration-by-migration**
> current-V2 reconciliation, the **table-by-table** RLS matrix, **role-by-role** Auth/team evidence, the
> **feature-by-feature** approval-to-live verification, and live **Vercel / Supabase / Edge / storage / n8n** evidence.
> This document is a **design + initial inventory**; the historical **audit/reconciliation is not yet complete**, and
> no live layer is verified. Registers below are **initial inventories and templates**, not completed reconciliations.

---

## 1. Governing baseline (VERIFIED)
| Item | Value |
|---|---|
| Repository | `Yesadvizors/Yes-Advizors-Portal` (repoId 1257818966, public) |
| Base branch / governing HEAD | `ui/redesign-v1` @ **`798afaa80dc61d3a3466fa7badd5a60628d6ddc7`** (PR #22 merge) |
| Last application/source-change commit | `3a5f439c15cafa493cd2d2320d7733f286441b6b` (all later commits docs-only) |
| First commit | `32e89da` (2026-06-03); 254 commits across all refs |
| Authorised Supabase env | **V2 / yav2-dev `ogjrwemjefvccpyjwxuo`** only; **prohibited** V1/Production `zcszesuvjrryxtigjglt` |
| Governing Vercel (V2) | `yes-advizors-portal-v2-preview` `prj_PFPT5rOJ4hpjyfqDHvppBlxTVeZv` — latest `dpl_9edhdnZBrnbPuLR2oEfKdeL1G73H` @ `798afaa`'s parent line (redeploy on merge expected) |

## 2. Mandatory evidence universe (INITIAL inventory — full reconciliation pending Package A)
> This section is the **initial source/history inventory**, not a completed item-by-item reconciliation. Row-by-row
> tracing of each item to its strongest evidence is a **Package A** execution deliverable.
**Git/GitHub (from #19):** first commit `32e89da`; two source lines — `main` (PRs #1–#10) → **redesign `ui/redesign-v1`** (governing, PRs #11/#12/#15/#16/#18/#20/#22). Branches with genuine unmerged content: **#6** `feat/phase4c-audit-log-implementation-draft` (9 audit migrations; superseded by `0005`/`0016`), **#9** `feat/dkyc-phase2-frontend`, **#10** `feat/dkyc-statutory` (Director-KYC + `dkyc-verify-upload` edge fn). `feat/admin-dashboard-home`(#7) & `feat/phase4d`(#8) add no unique source. Local-only branch `g2b/v2-migrations@ae6bf1e`. 0 stashes, 0 tags.

**Migrations in governing:** `0001–0011`, `0014–0018` (+rollbacks), `0021`, `0022`. **Gaps:** `0012` executed-live-no-file (R-9); `0013` reserved/unused.

**Verification/evidence SQL in governing** (`supabase/verification/`): M1A, M1B D2a/D2b (+transactional), D3 (legacy person/supplementary), D4 remediation, P5 `0021` pre/post, PG-1 pre/post/transactional, service-applicability discovery, manual rollbacks for `0021`/`0022`.

**Docs universe in governing** (`docs/`): Master Completion Register; AI governance/workflow; M1B D2a/D2b reports; D3 (0019 draft decision/mapping, discovery/design, supplementary rules); D4; P5 `0021` (impl plan/runbook/execution evidence/PJ checklist); P5 PG-1 (impl/evidence); P5 service-applicability discovery/design; P5 UI (discovery/design/impl, CP5–CP7 closure, interim + closure runtime evidence); P6 first-release scope/due-dates; PHASE3 safety gate; PHASE4/4A/4B audit; the three prior audits (#17/#19/#21); `M1B_Future_V2_Clean_Start_Reset_Task`.

**Local-only (untracked, NOT in GitHub):** `M docs/YAV2_Master_Completion_Register.md` (modified tracked) + untracked P6 "Rev10" set (`docs/M1B_P6_*.md`, `docs/YAV2_P6_Readonly_Discovery_Execution_Capture_*.md`, `supabase/verification/M1B_P6_discovery_readonly.sql`) + ~26 review ZIPs.

**Live layers (PENDING — see §0 constraint):** Supabase V2 executed state, Auth/team data, RLS/functions/triggers/views/storage/Edge, per-project Vercel config/flag values, live n8n/WhatsApp.

## 3. Historical decision register (INITIAL inventory — row-by-row reconciliation pending Package A)
> The table below is an **initial inventory** drawn from the Master Completion Register + phase docs. The **complete
> row-by-row approved-decision register** (with per-decision date, approving authority, affected tables/roles/RLS/
> migrations/functions/integrations, source doc/commit/PR, governing/superseded/implemented/executed/runtime-verified
> flags, recovery impact) is a **Package A** execution deliverable — it is **not** asserted complete here.
Governing unless marked superseded. `impl`=implemented in governing source · `exec`=executed on V2 (per evidence docs) · `live`=current-live verification.

| ID | Decision / gate | Business/technical effect | impl | exec | live | Governing? | Recovery impact |
|---|---|---|:--:|:--:|:--:|---|---|
| ENV-ISO | V2-only execution; V1/Production prohibited | Environment isolation | – | – | ? | **Yes** | Enforce in Packages A/H; verify no V1 refs in Vercel/n8n |
| P0 | Repo/live-state reconciliation | Baseline, hygiene | ✓ | n/a | ~ | Yes | Package A |
| P1 | M1-B D2b secure audited CRUD (backend) | RPC CRUD + audit + delete-privilege closure (`0017`/`0018`) | ✓ | ✓(evidence) | ? | Yes | Package B/C verify live |
| P2 | Client onboarding frontend (Preview) | Onboarding wizard + Client Master preview (flagged) | ✓ | n/a | ? | Yes | Package D |
| P3 | D3 legacy person backfill | `0019` draft decision/mapping | ~ | ? | ? | Yes | **PJ decision** — `0019` never assigned/executed |
| P4 | D4 remediation flags | Remediation discovery/design | ~ | ? | ? | Yes | Package B (schedule) |
| P5 | Service applicability (`0021`) + PG-1 (`0022`) + UI CP1–CP7 | **CLOSED PASS** 2026-07-21 | ✓ | ✓(evidence) | ~(historical) | Yes | Package D/H re-verify live |
| P6 | Controlled compliance generation (simple first release, #14) | Proposal merged (PR #16); **not authorised to implement** | proposal | – | – | Yes (scope) | Out of this programme's build scope |
| P7 | Tasks & recurring operations | Tasks module | ✓ | ? | ? | Yes | Package D |
| P8 | Document management | Documents + storage + `scan-document` | ✓ | ? | ? | Yes | Package D/F |
| P9 | Team, RBAC & masked reads (M1-C) | Roles + masked sensitive reads | ~ | ? | ? | Yes | **Package C** (roles beyond admin/staff) |
| P10 | Dashboard & reporting | `v_firm_dashboard` etc. | ✓ | ? | ? | Yes | Package D |
| P11 | WhatsApp & automation | External bot/n8n; PIN reset UI | ext | ? | ? | Yes | **Package G** (external, un-versioned) |
| P12 | End-to-end UAT & Preview closure | Full UAT | – | – | – | Yes | **Package H** |
| P13 | Production release package (no merge/deploy) | Release prep | – | – | – | Yes | Final gate (post-programme) |
| D-01/06/12 | P6 blocking business decisions | Approved (obligation identity etc.) | doc | – | – | Yes | P6 scope only |
| D-10/D-17 | (P6 design decisions) | recorded | doc | – | – | Yes | P6 scope only |
| R-9 | `0012` provenance gap | secure-docs executed live, no file | – | ✓(live, no file) | ? | Yes | **Package B** recover/re-author with evidence; never reuse `0012`/`0013` |
| CP-1..CP-7 / PG-1 | P5 UI checkpoints + OTHER-notes | P5 UI closure | ✓ | ✓ | ~ | Yes | Package D |
| FV-1 (#19) | Director-KYC (dKYC) omission | built on #9/#10, never merged, absent | ✗ | ✗ | ✗ | Yes (gap) | **Package E** selective port / PJ scope |

> Full per-field detail (dates, approving authority, affected tables/roles/RLS/migrations, source doc/commit, superseded flag) is carried in the recovery register (§14) per item; the Master Completion Register remains the authoritative decision source and must be reconciled row-by-row during Package A.

## 4. Architecture audit (approved design → governing → live-pending)
| Element | Governing implementation (evidence) | Live-verification | Recovery |
|---|---|---|---|
| Frontend (React/Vite) | `src/` 55 files, 33 components; SPA via `vercel.json` rewrite | runtime PENDING | D/H |
| Routing/menus/RBAC gating | `App.jsx` tab nav + `is_admin`/portal-role gating | PENDING | C/D |
| Shared components/modals | preview/*, serviceApplicability/*, modals | present | D |
| Supabase client | `src/supabase.js` (`VITE_SUPABASE_URL/ANON/FUNCTIONS_URL`) | config PENDING | A |
| Feature flags | `VITE_P2_PREVIEW` (Client Master Preview), `VITE_P5_UI` (Service Applicability) — `VITE_P5_UI` **absent from `.env.example`** | live value PENDING | **A** (leading invisibility mechanism) |
| Database architecture | migrations `0001–0022` (gaps `0012`/`0013`) | executed-state PENDING | B |
| Edge Function architecture | source invokes `ai-agent`, `extract-financial`, `scan-document`; **none versioned in repo** | deploy-state PENDING | **B/E** |
| Storage architecture | bucket `secure-docs` (`VITE_DOCS_BUCKET`) | PENDING | F |
| Audit architecture | `0005`/`0016` (write & lineage); PHASE4 docs | PENDING | F |
| n8n/WhatsApp architecture | **external, not in repo** (Master Register L225) | PENDING | **G** |
| Vercel/deploy/env separation | two projects build `ui/redesign-v1`; Preview-class | config PENDING | A |
| Secret handling | only `.env.example` tracked; `.env.local` untracked | PENDING | A |
| Fail-closed / rollback / recovery | migration rollbacks present for `0014–0018`, `0021`/`0022` | PENDING | B/H |

## 5. Database-structuring audit (plan — live state PENDING)
Per-table reconciliation (business purpose · creation migration · later modifications · related functions/triggers/views/RLS · expected ownership/role access · governing Git state · **V2 verification state PENDING** · live data dependency · recovery action) to be produced in **Package B** for every object created by `0001–0022`, covering: schemas, tables, columns, types, defaults, UUID strategy, PK/FK, **authoritative relational keys vs business/display identifiers**, unique constraints & **partial unique indexes** (idempotency), check/not-null, indexes, enums/controlled values, timestamps, created/updated-by, soft-delete, active/inactive, versioning, **source-system/source-reference/source-hash** fields, lineage/provenance, client/person/director/team/service-applicability/compliance/task/document/financial/WhatsApp/audit relationships, **weak-identity** structure, duplicate prevention, idempotency, migration dependency order, execution evidence, rollback, schema/data drift, index/performance, retention/archive/backup. **Evidence discipline:** a migration in Git ≠ executed; an execution record ≠ current match; a table existing ≠ correct constraints/indexes/policies.

## 6. Migration ledger (governing files; execution/live state PENDING)
| # | File | Purpose | Rollback | Exec evidence (doc) | Live-verified | Treatment |
|---|---|---|:--:|:--:|:--:|---|
| 0001 | extensions_and_enums | extensions/enums | – | baseline | ? | verify |
| 0002 | tables_people_and_clients | core people/clients | – | baseline | ? | verify |
| 0003 | tables_work_and_documents | work/documents | – | baseline | ? | verify |
| 0004 | tables_compliance_trackers | trackers | – | baseline | ? | verify |
| 0005 | audit_phase4b | audit foundation | – | P4 | ? | verify (governing audit design) |
| 0006 | rls_policies | RLS | – | baseline | ? | verify |
| 0007 | dependency_closure | closure | – | baseline | ? | verify |
| 0008 | functions_rpc | RPCs | – | baseline | ? | verify |
| 0009 | views | views (`v_firm_dashboard`…) | – | baseline | ? | verify |
| 0010 | rls_refined_phase4b | RLS refine | – | P4 | ? | verify |
| 0011 | storage_and_edge_DEFER | storage/edge (DEFERRED) | – | deferred | ? | **reconcile vs live storage/edge** |
| 0012 | **(absent)** | secure-docs (executed live, no file — R-9) | – | live-only | ? | **B: recover/re-author + evidence; never reuse** |
| 0013 | **(reserved/unused)** | — | – | – | – | keep reserved |
| 0014 | r4db_financial_year_repair | FY repair (never modify) | ✓ | R4-DB | ? | verify only |
| 0015 | m1a_client_master_foundation | Client Master | ✓ | M1A | ? | verify |
| 0016 | m1b_d2a_audit_write_and_lineage | audit write/lineage | ✓ | D2a | ? | verify |
| 0017 | m1b_d2b_client_master_crud_rpcs | CRUD RPCs | ✓ | D2b | ? | verify |
| 0018 | m1b_d2b_delete_privilege_closure | delete-privilege closure | ✓ | D2b | ? | verify |
| 0019 | **(never assigned)** | D3 legacy person backfill (draft decision only) | – | – | – | **PJ decision (P3)** |
| 0020 | **(gap)** | — | – | – | – | confirm intentional |
| 0021 | service_applicability | P5 applicability | ✓(manual) | P5 | ~ | verify |
| 0022 | p5_pg1_other_notes_enforcement | OTHER notes (PG-1) | ✓(manual) | P5 | ~ | verify |
| 4c-set | `feat/phase4c` `20260613080000–080008` | alt audit-log DB set | ✓ | — | – | **SUPERSEDED** (PR #6) — do not merge |
**Explicit flags:** missing numbers `0012/0013/0019/0020`; duplicate numbers none in governing; migrations only in old branch = phase4c set; executed-not-in-Git = `0012`; superseded = phase4c; never-rerun = `0014` (FY repair) and any data migration.

## 7. RLS & privilege audit (plan + matrix template — live PENDING)
Per-table **RLS matrix** to be completed in **Package C** (live) and pre-specified here from governing migrations (`0006`/`0010`, `is_active_user()` UID-keyed, `team_others_select`, SECURITY DEFINER helpers):

| Role | Select | Insert | Update | Delete | Expected scope |
|---|---|---|---|---|---|
| anon | deny | deny | deny | deny | none |
| unmapped/inactive authenticated | deny | deny | deny | deny | none (fail-closed) |
| admin | ✓ | ✓ | ✓ | ✓(closure per `0018`) | all (per design) |
| manager | scoped | scoped | scoped | limited | assigned clients |
| executive/staff | scoped | limited | limited | deny | assigned clients |
| intern/restricted | read-limited | deny | deny | deny | assigned, masked |
| client user (if enabled) | own | limited | limited | deny | own records |

**Mandatory negative tests** (Package C/F, executed live by PJ): anonymous, unmapped user, inactive user, banned user, wrong client, cross-client, direct URL, direct RPC, direct table query, prohibited action, storage access, audit-log access, sensitive-field access. **Frontend menu hiding is never security enforcement** — every restriction must be DB/Edge-enforced. Cover FORCE RLS, grants/revokes, NOINHERIT, policy recursion, bypass risk, SECURITY DEFINER/INVOKER, secure `search_path`, function ownership, view security, fail-closed.

## 8. Authentication & RBAC audit (plan — live PENDING)
Recover **every approved role** (admin, manager, executive/staff, intern, developer/test, client user — not just admin/staff). Verify (Package C, live): Auth config, provisioning, email confirmation, password/credential resets, banned/inactive, **Auth-UUID ↔ `team.auth_user_id`**, duplicate/orphan mappings, activation per role, role hierarchy/changes, sessions/refresh/logout, direct-route + menu + page + action permissions, client restrictions, **DB + Edge enforcement**, denied-access audit, least privilege, bootstrap admin, deactivation. **Precedent (not proven current cause):** P5 Step 12 required provisioning a `team` row before a Staff user became active → prime hypothesis for reported admin/non-admin/RBAC failures.

## 9. Data-security & privacy audit (plan — preserve approved restrictions)
Classify and protect: client/entity/director/person data, **PAN/Aadhaar/DIN**, mobile/email, tax/financial/banking, compliance/task/documents, auth data, audit data, **WhatsApp access & PIN**, uploaded KYC docs, AI-extracted info. Verify: classification, minimisation, masking/redaction, sensitive-field access, encryption in transit/at rest, secure storage, signed URLs, log restrictions, backup exposure, test-data separation, **V1/V2 isolation**, retention/deletion/export/archive, least privilege, secret protection. **Preserve all approved Aadhaar/PAN/DIN restrictions; do not migrate/expose sensitive values merely because historical source contains them.**

## 10. Functions / triggers / RPCs / views audit (plan — live PENDING)
Inventory every DB function/helper/validation/access-control/audit/security function, trigger, RPC, view, materialized view, timestamp/integrity function (source migration · owner · DEFINER/INVOKER · `search_path` · grants · input validation · output · exception handling · fail-closed · transaction · idempotency · concurrency · app callers · live verification · recovery). **Critical:** identify every function **called by the app but absent from governing migrations or unverified on V2** — includes the three invoked Edge Functions (§4) and any RPC used by CRUD/service-applicability.

## 11. Audit-log & security-monitoring recovery (plan)
Reconcile governing audit (`0005`/`0016`) + PHASE4/4A/4B (event contract, valid/sensitive event types, actor/role/client/entity context, before/after, metadata, **unknown-event fail-closed**, sensitive reads, audit RLS, immutability, denied-action & security-incident & credential-incident logging, retention, tamper protection, completeness). **Reconcile the superseded phase4c set (PR #6):** confirm governing design is accepted; PJ supersede/close — **do not merge**.

## 12. Frontend / module recovery audit (plan)
Per-feature capture (requirement · approval · source branch/commit/PR · governing state · DB/security/integration dependency · live state · recovery classification · exact files · tests · closure) for: login; admin/manager/staff access; dashboard; onboarding; Client Master; entity types/multi-GST; PAN/GSTIN/TAN validation; directors/persons; **customer assessment; Director-KYC**; document upload/management; Service Applicability; tasks; compliance/trackers; team; RBAC; reports; financial; audit viewing; **WhatsApp access/PIN**; notifications; menus/routes/actions; client restrictions; error/loading/empty states; validation; accessibility/responsive where implemented. **Confirmed gap:** Director-KYC/customer-assessment absent from governing (§3 FV-1) → Package E.

## 13. Edge Functions & API audit (plan — live PENDING)
| Function | Source location | Referenced by | Versioned in repo? | Deploy state (V2) | Recovery |
|---|---|---|:--:|:--:|---|
| `ai-agent` | none in repo | `ChatAgent.jsx` | **No** | PENDING | **B/E** recover source + verify |
| `extract-financial` | none in repo | `Compliance.jsx` | **No** | PENDING | B/E |
| `scan-document` | none in repo | `OnboardingWizard.jsx` | **No** | PENDING | B/E |
| `dkyc-verify-upload` | `feat/dkyc-statutory` (#10) only | dKYC (absent) | branch-only | PENDING | **E** (with dKYC) |
| WhatsApp/audit/other | branches/docs | external | ? | PENDING | G/F |
Per function: purpose · caller · auth/JWT/role/client-scope · service-role · secrets · CORS · input/upload validation · rate limiting · logging · error exposure · external APIs · deploy status · target project · versioning · rollback. **Every Edge Function invoked by the app but not versioned is a source-provenance gap (0012-style).**

## 14. Recovery register structure (per-item schema — completed in `docs/…Plan.md` registers + Package A)
Each material item carries: ID · category · module · business purpose · historical decision · approval evidence · source file · branch · commit · PR · governing source state · local-only state · schema/migration/RLS/Auth/function/storage/Edge/Vercel/n8n dependency · security/data-integrity/compatibility risk · recovery method · exact files · exact SQL/migration need · test plan · negative test · rollback · **PJ approval gate** · **final classification** (§21 states). No material approved item may remain `UNKNOWN`.

## 15. Storage audit (plan)
Bucket `secure-docs` + any others: intended privacy, live existence, object paths, client segmentation, document categories, upload/download/overwrite/delete permissions, signed-URL expiry, storage RLS, staff/client/admin access, orphan files, file-type/size validation, filename sanitisation, malicious-file risk, DB references, retention/deletion, audit trail. Reconcile against `0011_storage_and_edge_DEFER` and the `0012` secure-docs live-only gap.

## 16. Vercel & environment recovery (plan — values not documented; presence/scope/target only)
Both projects (`yes-advizors-portal-v2-preview` governing; `yes-advizors-portal` second) build `ui/redesign-v1`; inspected metadata `target:null`/`live:false` → no Production-target deployment observed (posture not fully certified). Verify per project (Package A, read-only): names/IDs, linked repo/branch, deployment SHA, Preview/Production, aliases/domains, env scopes, **presence** of `VITE_SUPABASE_URL/ANON_KEY/FUNCTIONS_URL/DOCS_BUCKET/P2_PREVIEW/P5_UI`, **validated Supabase target = V2 only**, feature-flag settings, build/runtime settings, stale/duplicate projects, **accidental V1 references**, secret leakage, promoted/rollback deployment. **Do not document secret values.**

## 17. n8n / WhatsApp / integration audit (plan — external)
Repo evidence: **n8n/WhatsApp automation is external and un-versioned** (Master Register L225); WhatsApp appears only as UI PIN-reset (`Clients.jsx`). **Package G** (read-only, after PJ confirms the YAV2 workspace): workflow inventory/purpose/active-state/owning-workspace/credentials/webhook URLs+verification/data transmitted/**Supabase target = V2**/client mapping/PIN/sessions/expiry/retries/idempotency/error handling/logging/retention/external APIs/failure recovery/rollback/**source-version backup into GitHub**. No integration may remain live but undocumented/untraceable.

## 18. Approval-to-live reconciliation (every item → exactly one final state)
Allowed states: `APPROVED — LIVE AND FULLY VERIFIED` · `… IMPLEMENTED, LIVE VERIFICATION PENDING` · `… PRESENT IN GOVERNING SOURCE, DEPLOYMENT PENDING` · `… PRESENT ONLY IN HISTORICAL SOURCE` · `… SELECTIVE PORT REQUIRED` · `… LIMITED REBUILD REQUIRED` · `… DATABASE EXECUTION REQUIRED` · `… CONFIGURATION REQUIRED` · `… INTEGRATION ALIGNMENT REQUIRED` · `SUPERSEDED BY LATER APPROVED DESIGN` · `PJ DECISION REQUIRED` · `TECHNICAL BLOCKER WITH EVIDENCE`. **Provisional classification (to be confirmed by live discovery, Package A):**
| Item | Provisional final state | Basis |
|---|---|---|
| P5 (service applicability, `0021`/`0022`, UI CP1–7) | IMPLEMENTED, LIVE VERIFICATION PENDING | CLOSED PASS historical; live not re-verified |
| Client Master / preview | IMPLEMENTED, LIVE VERIFICATION PENDING + CONFIGURATION REQUIRED | flag `VITE_P2_PREVIEW` |
| Service Applicability visibility | CONFIGURATION REQUIRED | flag `VITE_P5_UI` |
| M1-B CRUD/audit (`0015–0018`) | IMPLEMENTED, LIVE VERIFICATION PENDING | evidence docs; V2 unverified |
| Migrations `0001–0022` | DATABASE EXECUTION REQUIRED (verify) | executed-state unverified |
| `0012` secure-docs | DATABASE EXECUTION REQUIRED + PJ DECISION | provenance gap R-9 |
| `0019` D3 backfill | PJ DECISION REQUIRED | never assigned/executed |
| Edge Functions (ai-agent/extract-financial/scan-document) | PRESENT ONLY IN HISTORICAL/EXTERNAL SOURCE → SELECTIVE PORT + DATABASE EXECUTION | un-versioned; deploy-state unknown |
| Director-KYC (dKYC) + `dkyc-verify-upload` | SELECTIVE PORT REQUIRED (or PJ de-scope) | #19 FV-1 |
| phase4c audit set (PR #6) | SUPERSEDED BY LATER APPROVED DESIGN | `0005`/`0016` governing |
| Roles beyond admin/staff (P9) | LIMITED REBUILD / CONFIGURATION REQUIRED | verify designed roles present |
| WhatsApp/n8n (P11) | INTEGRATION ALIGNMENT REQUIRED | external/un-versioned |
| Admin/manager/staff runtime | IMPLEMENTED, LIVE VERIFICATION PENDING | no creds in-session |

## 19. Recovery implementation packages (each a SEPARATE PJ-approved gate)
- **Package A — Evidence & configuration discovery** (read-only): source preservation; Vercel env/project/domain verification; **Supabase V2 schema/migration/Auth/team/RLS/functions/triggers/views/storage/Edge discovery**; runtime-URL confirmation. *(Claude authors the discovery plans; PJ executes DB/Vercel reads.)*
  **Mandatory Package A execution deliverables (required before Package A can be marked complete):**
  1. **Row-by-row approved-decision register** — every material decision (P0–P13, D/R/CP/PG and any others) traced to its strongest evidence with the full field set of §14.
  2. **Feature-by-feature approval-to-live status register** — every module/feature of §12 classified into exactly one §18 final state (no `UNKNOWN`).
  3. **Live evidence capture** — read-only **Vercel** (per-project config presence/scope, validated V2 target, flags), **Supabase V2** (schema/Auth/team/RLS/functions/triggers/views), **Edge Functions** (deployed set/versions vs source), **storage** (buckets/policies), and **n8n/WhatsApp** (workspace/workflows/targets) evidence — attached to the issue.
- **Package B — Architecture & database reconciliation**: approved schema; missing tables/constraints/indexes; migration & provenance gaps (`0012`); functions/triggers/views; data-integrity controls; rollback.
  **Mandatory Package B execution deliverables (required before Package B can be marked complete):**
  1. **Object-by-object / per-table database register** — every table and material DB object with the full §5 field set and its current-V2 verification result.
  2. **Migration-by-migration current-V2 reconciliation** — each number `0001–0022` (+ gaps `0012/0013/0019/0020`, superseded phase4c) reconciled file ↔ executed-state ↔ current-live, with provenance resolution for `0012`.
  3. **Table-by-table RLS matrix** — the §7 matrix completed per table with live results.
  4. **Role-by-role Auth/RBAC evidence** — the §8 verification completed per approved role (admin, manager, executive/staff, intern, developer/test, client user), with Auth↔`team` mapping evidence.
- **Package C — Authentication, RBAC & security recovery**: all approved roles; Auth↔team; menu/route/action; client-level access; cross-client denial; RLS; privilege hardening; fail-closed verification.
- **Package D — Governing core-module recovery**: onboarding, clients, Client Master, Service Applicability, tasks, compliance, documents, team, dashboards, reports (approved Module 1).
- **Package E — Historical omitted functionality**: customer assessment; Director-KYC; `dkyc-verify-upload`; missing screens/services/functions/storage flows (selective port, security/compat/test/DB-reviewed).
- **Package F — Audit, storage & security completion**: audit logs/event contracts/sensitive reads; storage policies/signed URLs/document security; security monitoring; negative testing.
- **Package G — Integrations**: WhatsApp, n8n, Meta API, automation, external APIs, credentials, webhooks, idempotency, retries, logging (+ version-control into GitHub).
- **Package H — Final live alignment**: exact GitHub SHA ↔ Vercel deployment ↔ Supabase V2 state ↔ Edge versions ↔ n8n versions; admin/manager/staff runtime; cross-client tests; all module tests; rollback readiness; final closure register.

**Order:** A → B → C → D → E → F → G → H (config/DB blockers first; live acceptance last). Each requires separate written PJ approval before any live action.

## 20. Security test matrix (positive + negative — executed under Packages C/F/H)
Roles/vectors: anonymous; invalid login; banned; inactive; unmapped authenticated; admin; manager; executive/staff; restricted staff; client user (if applicable); direct route; direct table; direct RPC; direct Edge Function; wrong-client; cross-client; storage; audit-log; invalid/oversized/malicious-filename document; duplicate submission; **missing env var**; **false feature flag**; **wrong feature-flag scope**; **missing team mapping**; expired/revoked session; **V1 URL/key reference**; privilege escalation. Each: expected result, enforcement layer (DB/Edge, not menu), evidence, live status.

## 21. Complete closure standard (programme complete ONLY when)
All approved historical work classified (no `UNKNOWN`); every governing decision documented; valid source in GitHub; **no valid functionality only-local or in an abandoned branch**; DB structure in Git matches Supabase V2; migrations reconciled; RLS verified; Auth/roles verified; cross-client leakage fails safely; sensitive data protected; storage secured; Edge Functions versioned; Vercel points to V2 only; n8n/WhatsApp point to V2 only; live modules tested; exact deployment SHA verified; unresolved exceptions explicit (evidence/risk/owner/closure); PJ approved all live actions; ChatGPT final package PASS. **Visible screens / documentation / a migration file / historical PASS are NOT completion** — completion = the approved system is present, secure, deployed and tested in the authorised V2 live environment.

## 22. This PR's scope & the next step
This draft PR changes **only** `docs/YAV2_Complete_Historical_Recovery_Consolidation_And_Live_Alignment_Plan.md`, `PROJECT_STATUS.md`, `CURRENT_PHASE_SCOPE.md`. It implements nothing. **Next:** ChatGPT reviews this design → PJ approves → execution begins with **Package A** (read-only discovery), each subsequent package separately PJ-gated.

## 23. Programme conclusion (design-stage)
**Present status:**
- **COMPLETE RECOVERY DESIGN PREPARED.**
- **INITIAL SOURCE/HISTORY INVENTORY COMPLETED.**
- **FULL HISTORICAL AND LIVE RECONCILIATION PENDING EXECUTION OF PACKAGES A–H.**

The executable recovery is decomposed into Packages A–H with tests, negative tests, rollback and PJ gates, and each
material item is given a **provisional** §18 classification. **The historical audit/reconciliation is NOT yet
complete:** the row-by-row decision register, object-by-object/per-table database register, migration-by-migration
V2 reconciliation, table-by-table RLS matrix, role-by-role Auth/RBAC evidence, feature-by-feature approval-to-live
status, and live Vercel/Supabase/Edge/storage/n8n evidence are **Package A/B execution deliverables**. Live alignment
across `Localhost ↔ GitHub ↔ Vercel ↔ Supabase V2 ↔ Storage ↔ Edge ↔ n8n ↔ Runtime` cannot be asserted yet (live
layers unverified within guardrails) and is delivered by Packages A–H under separate PJ approval. **No full-audit,
full-alignment or completion claim is made here.**
