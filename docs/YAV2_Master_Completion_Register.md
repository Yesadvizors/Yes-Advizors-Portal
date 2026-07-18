# YAV2 Portal V2 — Master Completion Register

Rev 1.1 · Created 2026-07-18 (P0 discovery); updated same day with P0 review rulings + housekeeping · Owner: PJ · Executor: Claude Code · Reviewer: ChatGPT

Governed repository: `D:\Claude\Claude Code\Yes-Advizors-Portal` (GitHub `Yesadvizors/Yes-Advizors-Portal`)
Working branch: `ui/redesign-v1` @ `28416643e33ffc2a5b802a4e9a573fe3da7de1ce`
Authorized Supabase target: **V2 / yav2-dev `ogjrwemjefvccpyjwxuo` only**. V1/Production `zcszesuvjrryxtigjglt` prohibited.

Status vocabulary: NOT STARTED · DISCOVERY · AUTHORED · REVIEW HOLD · APPROVED FOR EXECUTION · EXECUTED · VERIFIED · CLOSED / PASS · BLOCKED

---

## 0. Closed baseline (immutable)

| Item | Status |
|---|---|
| Portal V2 repo, Preview deployment, PJ admin login | CLOSED / PASS |
| R4-DB migration 0014 (FY 2020-21…2030-31, current FY 2026-27, coverage repair) | CLOSED / PASS — **never modify** |
| Calendar concurrency-safe upsert in Preview | CLOSED / PASS |
| M1-A migration 0015 (9 Client Master tables, clients.id UUID key, RLS forced, 12 audit events) | CLOSED / PASS |
| M1-B D1 discovery | CLOSED / PASS |
| M1-B D2a migration 0016 (audit_write_event, 6 family events, lineage + remediation columns/indexes) | CLOSED / PASS — **never rerun/modify** |
| D2a live verification (owner postgres, SECURITY DEFINER, pinned search_path, no direct EXECUTE, protected counts unchanged) | CLOSED / PASS |

Protected counts (guard values for every future verification): clients 13 · accounting_tracker 312 · financials_tracker 120 · income_tax_tracker 26 · compliance_calendar 0 · client_persons 0 · client_remediation_flags 0.

---

## P0 — Repository and live-state reconciliation

- **Workstream:** Governance / discovery
- **Objective:** Reconcile repo, Preview and live state; produce this register and the P0 package.
- **Scope:** Read-only/local only. No SQL, no deploy, no P1 authoring.
- **Dependencies:** none.
- **Database objects:** none touched. Zero database writes; zero database reads (see blocker B-1).
- **Frontend files:** none changed.
- **Execution status:** EXECUTED (this session, 2026-07-18).
- **Review status:** **CLOSED / PASS WITH CONDITIONS** (ChatGPT independent review, 2026-07-18). Rulings recorded in §P0 Rulings below. Post-review housekeeping EXECUTED same day — see §P0 Housekeeping record.
- **Commit:** `c67d65093426d0d21ae42fd08218e0a552f95811` — `chore(db): record verified M1-B D2a audit foundation` (the four closed D2a artifacts only; local, not pushed).
- **Preview URL:** `yes-advizors-portal-v2-preview-3gqbxbkmy-yes-advizors-projects.vercel.app` (latest READY deployment).
- **Rollback position:** n/a (no state changed).
- **% complete:** 100 % of what is locally reconcilable; live-DB reconciliation 0 % (BLOCKED, B-1).
- **Blockers:** B-1, B-2, B-3 (see §Risk register).
- **Next action:** independent review; PJ decisions on B-1/B-2/B-3.

### P0 Rulings (independent review, 2026-07-18)

- **B-1 — ruled EXECUTION BLOCKER ONLY.** The MCP connector exposes prohibited V1/Production `zcszesuvjrryxtigjglt`; it must never be queried. Local authoring continues. Live V2 verification and approved execution use **PJ's manual V2 SQL Editor** unless a safe V2-only connector becomes available.
- **B-2 — provenance CONFIRMED.** The 0017 file was authored in the earlier D2b session. Classification: **D2b Rev 1 — HOLD / REVISION REQUIRED.** Retain; do not delete, execute, or treat as unknown.
- **B-3 — APPROVED (scoped).** Remove only the `supabase/` line from `.git/info/exclude`; then inspect and classify the full tree before staging. No blind commit of `migrations.zip` or duplicates. Historical migration corpus NOT committed yet.
- **R-6 — RULED.** Portal V2 must not capture, accept, backfill, or newly store Aadhaar digits including last-four. No destructive deletion of legacy source fields during P1/P3; legacy cleanup separately governed.

### P0 Housekeeping record (executed 2026-07-18, post-review)

1. **D2a integrity check: PASS.** All four staged D2a artifacts byte-identical between index and working tree. SHA-256:
   - `docs/M1B_D2a_Implementation_Report.md` — `91fb54c67b500f336853517f116fc3f45a27d1218fd9331b8340841523f54d14`
   - `supabase/migrations/0016_m1b_d2a_audit_write_and_lineage.sql` — `a5044b4e2672ebc4d4947a142c82fb5edc546160d806f68b8213c4fbf76f8c40`
   - `supabase/migrations/0016_m1b_d2a_audit_write_and_lineage_rollback.sql` — `83c722704689c889668fcd851578eab3b2c51a9c83794a850fa272d74172a90a`
   - `supabase/verification/M1B_D2a_post_execution_verification_readonly.sql` — `aa4965d2d21df6d82e281b1985111ccd2652bc7c83d6a4bd1848040c89d08842`
2. **D2a commit:** `c67d65093426d0d21ae42fd08218e0a552f95811` (4 files, 1,220 insertions; pathspec-limited commit; local only, not pushed).
3. **`.git/info/exclude`:** `supabase/` line removed (backup kept at `.git/info/exclude.bak-p0`). No other line touched.
4. **DEVIATION D-P0-1 (recorded, no action taken):** between the P0 snapshot and housekeeping, the **concurrent D2b session** continued working in this tree (07:03–07:08 IST): it modified `0017` again (61,942 → 61,873 bytes), authored `0017_…_rollback.sql` (07:04), `M1B_D2b_post_execution_verification_readonly.sql` (07:06), `docs/M1B_D2b_Implementation_Report.md` (07:07), and **staged all four D2b files** (index 07:08). This executor did not stage, modify, or unstage any D2b file; the D2a commit was pathspec-limited so D2b's staged state is exactly as that session left it. D2b Rev 1 current hashes (read-only record):
   - `0017_m1b_d2b_client_master_crud_rpcs.sql` — `b72c4a63b88067e35fda01124354f2a400207c625ffdd3e45852a3ff0ffb1db4`
   - `0017_m1b_d2b_client_master_crud_rpcs_rollback.sql` — `d3848d3d9b055c26692fe7310117318e34ccae9502c6044abf57b29898e26180`
   - `supabase/verification/M1B_D2b_post_execution_verification_readonly.sql` — `052e77345f920aa93de0edfc32453b9fd61bcffc3b18b7192eda7b75cd040bd2`
   - `docs/M1B_D2b_Implementation_Report.md` — `4092740ef9ba70e5e56c245b5f9ce9df6dc3a5073e85ffd51706d3b8c24ed386`

   **Whether these four staged D2b files remain staged is a review decision; recommendation: unstage (index-only, content untouched) to honour the HOLD / REVISION REQUIRED status.**

### Classified Supabase inventory (newly visible after exclude removal)

| Class | Files | Disposition |
|---|---|---|
| Authoritative historical migrations (V1-parity corpus, G-2b Rev1.2, applied to V2 via G-3) | 0001–0011 (12 files incl. 0011 DEFER) | Untracked. Commit later as a reviewed hygiene commit (ruling 5: not yet). |
| Authoritative executed gate migrations | 0014 + 0014_rollback (untracked); 0015 + rollback (committed `2841664`); 0016 + rollback (committed `c67d650`) | 0014 pair to join the hygiene commit. |
| D2a artifacts | 0016 pair + verification + report | **Committed `c67d650`.** |
| D2b draft (Rev 1 — HOLD / REVISION REQUIRED) | 0017 + 0017_rollback + D2b verification + D2b report | Retained, frozen; currently staged by the D2b session (D-P0-1). Not committed. |
| Verification files (closed gates) | M1A (committed), M1B_D2a (committed) | Done. |
| Archives / duplicates / temporary | `supabase/migrations.zip` (65,297 B, 2026-07-16 snapshot of 0001–0015 — pure duplicate) | Exclude from any commit; recommend delete or move outside repo (needs approval). `.git/info/exclude.bak-p0` is temporary — delete after review confirms. |

SHA-256 of the newly visible corpus: 0001 `9f76338f…`, 0002 `ccf200f8…`, 0003 `27dc65b0…`, 0004 `f38a1eaa…`, 0005 `2e3693f4…`, 0006 `705bd59a…`, 0007 `2506ccaf…`, 0008 `d5797786…`, 0009 `ba4bf408…`, 0010 `5d20953b…`, 0011 `ef947d42…`, 0014 `c32c8a0c…`, 0014_rollback `d2120091…`, migrations.zip `7558f2c2…` (full 64-hex values in the housekeeping session transcript).

### Proposed repository-hygiene commit plan (for approval — NOT executed)

1. `chore(db): record V1-parity migration corpus 0001-0011 (G-2b Rev1.2, applied via G-3)` — the 12 historical files, byte-exact.
2. `chore(db): record executed R4-DB migration 0014 and rollback` — the 0014 pair.
3. `docs: add Master Completion Register` — this register.
4. Delete `supabase/migrations.zip` (duplicate) — or relocate outside the repo.
5. (After D2b review completes its own gate) D2b files enter git under the P1 gate, never under housekeeping.

### P0 findings — git state

- Branch `ui/redesign-v1`, HEAD `2841664` ("M1-A Rev1.1: finalize client-master migration, rollback, verification kit"), in sync with `origin/ui/redesign-v1` (0 ahead / 0 behind). No stash.
- **Staged, uncommitted (4 files — D2a evidence):** `docs/M1B_D2a_Implementation_Report.md`, `supabase/migrations/0016_….sql`, `0016_…_rollback.sql`, `supabase/verification/M1B_D2a_post_execution_verification_readonly.sql`.
- No unstaged modifications.
- **`.git/info/exclude` contains `supabase/`** (local, non-versioned). This hides the entire `supabase/` tree from `git status`. Consequence: migrations 0001–0011 and the 0014 pair exist **on disk only** — they are in no commit on any branch. Only 0015 (committed) and 0016 (staged) entered git, evidently via forced adds. `supabase/migrations.zip` also on disk only.
- **Out-of-band artifact:** `supabase/migrations/0017_m1b_d2b_client_master_crud_rpcs.sql` (61,942 bytes) appeared on disk at **2026-07-18 07:03:38 IST — during this P0 session, seconds after the first directory listing**. It was NOT authored by this session. Header claims a complete D2b package (19 RPCs + bypass closure) targeting 0017. Provenance unknown to the executor. Untracked, hidden from status by the `supabase/` exclude. **Quarantine pending review (B-2).**
- Local branches: `main`, `ui/redesign-v1`, `fix/frontend-safety-v1`, `g2b/v2-migrations` (at ae6bf1e0, behind working branch). Numerous historical `feat/*`, `claude/*`, `tmp/*` branches on origin (phase-4 audit series, dkyc series) — superseded history, no active work found there.

### P0 findings — Preview deployment (Vercel, read-only)

- Project `yes-advizors-portal-v2-preview` (`prj_PFPT5rOJ4hpjyfqDHvppBlxTVeZv`, team `team_k1XHDoYfk0zOBVvGC4pVPFOc`).
- Latest deployment `dpl_5NhXDhficfZ1t2DY28NrZfYtUMGQ`: state READY, created ≈ 2026-07-11, built from **`g2b/v2-migrations` @ `ae6bf1e0`** (PR #12 baseline), flag `gitDirty: 1`.
- **Preview is 13 commits behind `ui/redesign-v1` HEAD** — none of the frontend-hardening, R4 FY, onboarding-draft, Aadhaar-guard or M1-A-era frontend commits (`bda50f6`…`2841664`) are deployed.

### P0 findings — live database state

- **BLOCKED (B-1):** the connected Supabase MCP server exposes **only** V1/Production `zcszesuvjrryxtigjglt`. Per Global Rule 2 the executor stopped immediately; **zero queries were run against any project** (only the tool's project list was read). Live-state description below therefore rests on the CLOSED D2a live-verification evidence (2026-07-17), which remains the authoritative live snapshot: migrations 0014/0015/0016 executed on V2; audit_write_event live; protected counts as in §0.

### P0 findings — frontend inventory

- Stack: Vite 5 + React 18 SPA, tab-based navigation in `src/App.jsx` (no router). Components (19): Login, AdminHome (admin only), Dashboard, Tasks, Clients, Compliance, DocumentsHub, DocumentManager, WorkDocuments, Team, Usage, AuditLog (admin only), OnboardingWizard, AddTaskModal, FollowUpModal, HistoryModal, MarkFiledModal, ChatAgent, ErrorBoundary.
- Auth: Supabase auth session → fail-closed lookup in `team` (active member required); password-recovery flow present. Target binding `src/supabase.js`: env-only, no hard-coded ref, no V1 fallback (IR-1A).
- **Onboarding today:** OnboardingWizard writes `clients` directly (insert / update **keyed by `client_id` business code**, not `clients.id`), persists directors as `clients.directors` JSONB, stores `aadhaar_last4`/`aadhaar_masked` derived fields (full Aadhaar never persisted — enforced by `src/lib/aadhaar.js` + CI-tested), uploads to `documents`. Draft state supported. Compliance run is a separate explicit action via `complianceRunner.js`.
- **Direct table writes (complete inventory):** documents (DocumentManager, DocumentsHub, Compliance, MarkFiledModal, OnboardingWizard), completed_documents (WorkDocuments), follow_ups + tasks (FollowUpModal, AddTaskModal, Tasks), clients (OnboardingWizard, Clients doc_pin), financials_tracker / extracted_document_data / client_financials (Compliance), compliance_calendar (concurrency-safe upsert in complianceRunner). **None of the 7 M1-A child tables is written by the frontend yet** — P1 bypass closure breaks nothing in the current UI.
- **RPCs invoked by frontend:** `generate_client_compliance`, `activate_accounting_service` (complianceRunner), `get_sensitive_audit_logs` (AuditLog).
- Deferred/TODO markers: AdminHome "awaiting review: DEFERRED — no review-status field exists". No other actionable TODO/FIXME in `src/`.

### P0 findings — database artifacts in repo (files, not live state)

- Migration files on disk: 0001–0011 (V1-parity foundation: enums, people/clients, work/documents, trackers, audit phase-4b, RLS, dependency closure, functions/RPCs incl. role helpers `is_active_user`/`is_admin_or_manager`/`get_app_role`, views, refined RLS, storage/edge DEFER), 0014 pair (executed/closed), 0015 pair (executed/closed), 0016 pair (executed/closed), plus out-of-band 0017 (B-2). **Numbering note (corrected at housekeeping-2 from the 0014 header): 0012 = secure-docs, already executed live (no file in repo); 0013 = RESERVED for R3 (client-ID sequence), unused.** Neither number is free — do not reuse; the missing 0012 file is a corpus gap to flag at the next DB gate.
- M1-A tables (0015): entity_type_catalogue + client_persons, client_registrations, gst_registration_details, client_identifiers, client_contacts, client_addresses, client_relationships, client_remediation_flags — all with `row_version integer NOT NULL DEFAULT 1` (the live optimistic-lock mechanism), RLS enabled+forced, `REVOKE ALL FROM PUBLIC, anon`, `GRANT SELECT, INSERT, UPDATE TO authenticated` (direct DML still granted → to be revoked by D2b bypass closure), no DELETE grant.
- 0016 additions: `public.audit_write_event`, 6 family events, lineage columns (source_system, source_ref, source_hash, backfill_batch_id) + remediation rule columns (rule_code, rule_version, batch_id) + 2 indexes.
- Verification kits committed/staged: M1A + M1B_D2a read-only verification SQL.

### P0 findings — tests, build, CI

- `npm test`: **167/167 pass** (aadhaar, compliance, complianceRunner, complianceTabs, financialYear suites; includes static guards: no hard-coded FY, no full-Aadhaar persistence, coverage-gap fail-closed behaviour).
- `npm run build`: **passes** (vite 5.4.21, 101 modules, 3.4 s).
- CI: `.github/workflows/ci.yml` (npm ci → test → build → diff hygiene) + `pr-safety-gate.yml` (PR-body check + AI review). No lint gate yet (deliberate, documented).

---

## Gate register

### P1 — M1-B D2b secure audited CRUD (backend)
- **Workstream:** Module 1 backend. **Objective:** 19-ish hardened audited RPCs for the 7 M1-A child tables + mandatory bypass closure (revoke direct authenticated INSERT/UPDATE).
- **Scope:** per master instruction (SECURITY DEFINER, pinned search_path, null-uid rejection, null-safe `is_active_user()`/`is_admin_or_manager()` gates, clients.id UUID, validation, no Aadhaar, optimistic locking on `row_version`, atomic `audit_write_event`, error taxonomy not-found/conflict/validation/authorization, REVOKE PUBLIC+anon).
- **Dependencies:** P0 review closed; disposition of out-of-band 0017 (B-2); D2a baseline (closed). Execution additionally requires a safe V2-only execution channel (B-1).
- **Database objects:** functions on client_persons, client_identifiers, client_contacts, client_addresses, client_relationships, client_registrations, gst_registration_details; grants on those 7 tables.
- **Audit events:** person/identifier/contact/address/relationship/gst_detail `.changed`, `registration.updated`; actions CREATE/UPDATE; change_type_code CREATED/UPDATED/ENABLED/DISABLED; combined header+GST update emits both events atomically.
- **Frontend files:** none.
- **Expected files:** `supabase/migrations/0017_m1b_d2b_client_master_crud_rpcs.sql` + `_rollback.sql`, `supabase/verification/M1B_D2b_post_execution_verification_readonly.sql`, `docs/M1B_D2b_Implementation_Report.md`, test plan (unit/negative/concurrency), register update. Hashes + parser results + git evidence per Rule 11.
- **Risks:** R-2 (out-of-band 0017), R-1 (no safe execution channel), R-6 (Aadhaar last4 rule tension — RPCs must reject Aadhaar fields).
- **Acceptance criteria:** all master-instruction RPC properties verified by read-only SQL; protected counts unchanged; no unaudited write path to the 7 tables; rollback proven paired.
- **Status:** **D2b — CLOSED PASS** (2026-07-18; independently reviewed + executed on V2/yav2-dev; includes the follow-on 0018 DELETE privilege closure). Five artifacts: 0017 migration (22 RPCs incl. registration create/create_with_gst/set_active; G1 Aadhaar rejection; P11/P13–P16 validation; bypass closure; RAISE `%%`→`%` fix L154) sha `91c605a9…`; rollback (fail-closed) sha `3e43fbac…`; read-only verification (V1–V9 incl. coverage matrix, protected counts, no-D3/D4) sha `c402174f…`; transactional test kit (36 tests, always-ROLLBACK) sha `95e161e0…`; implementation report (matrix + AQ-1..7). Committed at `83339e539321cbc6c240b2b0f20f2e8b443f923d` on `ui/redesign-v1` (repository closure). **Final rulings applied 2026-07-18:** AQ-2 (P15 reg_type = IN_GST/AE_VAT/AE_CT/LICENCE/OTHER, OTHER extensible), AQ-3 (P16 jurisdiction = trimmed non-empty text ≤64 chars, not two-letter), AQ-4 (Aadhaar: reject TYPES only, no length-only 12-digit value reject; test T16 repurposed) — CLOSED. **Execution status:** EXECUTED on V2/yav2-dev — 0017 (RPCs + INSERT/UPDATE bypass closure, SHA `91c605a9…`) and 0018 (DELETE privilege closure, SHA `bbef5d3e…`, rollback `3ffa1a6e…`, read-only verification `1e2e1fa2…`); independently verified (`all_7_insert_update_delete_denied_select_kept_expect_true = true`). **Review:** CLOSED PASS (independent). **OBS-D2B-V9-1** (post-execution verification V9) preserved as **NON-BLOCKING** — does not gate closure. Open items AQ-1, AQ-5, AQ-6, AQ-7 are non-blocking deferrals to later phases. **% :** authoring 100, closure/gate 100 — CLOSED PASS. **Deviation D-P1-1:** concurrent session re-staged D2b files mid-authoring (07:51:56 IST), authored an unauthorized duplicate test kit (`M1B_D2b_functional_test_kit_transactional.sql`), and rewrote the report (corrected in place); dispositions recommended in report §H. **Next action:** D2b repository closure complete; await separate approval before starting the next phase.

### P2 — Client onboarding frontend (Preview)
- **Objective:** full Client Master UI (sections A–G) writing only via D2b RPCs; pilot mode for 2–3 real clients.
- **Dependencies:** P1 EXECUTED + VERIFIED. **Key discovery inputs:** current wizard keys writes on `clients.client_id` (must move to `clients.id`); current direct `clients`/`documents` writes must be re-routed or explicitly retained per approved scope; draft mechanism exists; Aadhaar capture UI still collects full number transiently to derive masked/last4 — **must be removed to meet the no-last-four rule** (R-6 decision).
- **Frontend files expected:** OnboardingWizard.jsx (major), Clients.jsx, new section components, lib validators; tests.
- **Deliverables:** tests, build, CI, screenshots, console + network evidence (RPC-only writes), Preview URL. **Status:** NOT STARTED.

### P3 — D3 legacy person backfill
- **Objective:** backfill client_persons from `clients.directors` JSONB (11 clients, ~26 persons; client_directors legacy table 0 rows) with lineage columns, dedupe priority PAN→DIN→name+evidence, no auto-merge of ambiguous, batch-controlled, rerunnable, no JSONB deletion.
- **Rule tension R-6:** source JSONB rows carry `aadhaar_last4`/`aadhaar_masked`; master rule forbids copying digits/last-four → backfill must **drop** them (confirm at review).
- **Dependencies:** P1 (audit RPC layer), execution approval, safe execution channel (B-1). **Status:** NOT STARTED.

### P4 — D4 remediation flags
- **Objective:** populate client_remediation_flags: MISSING_INCORP_DATE (exp. 11), LEGACY_JSONB_DIRECTORS (exp. 11), others only if refreshed discovery proves; rule_code/rule_version/batch_id, unresolved-uniqueness, audited resolution; remediation UI after backend approval.
- **Dependencies:** P3 (for LEGACY flag lifecycle), P1. **Status:** NOT STARTED.

### P5 — Service applicability
- **Objective:** per-client service activation layer (accounting, GST, TDS, payroll, income tax, ROC/LLP, statutory/tax audit, secretarial…) with effective/end dates, frequency, registration linkage, assignee, approval status, audit, optimistic locking; defines "Ready for Service Applicability" = Module 1 completion. No compliance generation from Client Master edits.
- **Discovery input:** a legacy `activate_accounting_service` RPC exists (0008/0014) — P5 must reconcile/supersede it. **Dependencies:** P2 (UI base), P1. Separate backend and frontend checkpoints. **Status:** NOT STARTED.

### P6 — Controlled compliance generation
- **Objective:** idempotent, FY-aware generation from approved service applicability; dry-run first; lineage (generated_by/at); safe re-run; concurrency-protected; 0014 untouched.
- **Discovery input:** existing paths = `generate_client_compliance` RPC + `complianceRunner.js` upsert (`onConflict client_id,compliance_tracker_id, ignoreDuplicates`) — to be superseded/gated by applicability-driven generation. **Dependencies:** P5 CLOSED. **Status:** NOT STARTED.

### P7 — Tasks and recurring operations
- **Discovery input:** Tasks/AddTaskModal/FollowUpModal exist with direct table writes; no recurrence engine found. **Dependencies:** P5 (linkage), P9 (roles) partial. **Status:** NOT STARTED.

### P8 — Document management
- **Discovery input:** DocumentsHub/DocumentManager/WorkDocuments exist (direct writes, doc_pin gate, visibility toggle, deletes are hard `delete()` — archive policy needed); storage/edge migration 0011 was DEFERred. **Status:** NOT STARTED.

### P9 — Team, RBAC and masked reads (M1-C)
- **Discovery input:** role helpers exist (get_app_role, is_admin/is_admin_or_manager, get_portal_role); UI gates AdminHome/AuditLog on `is_admin`; Team.jsx exists; no masked-read layer yet. **Status:** NOT STARTED.

### P10 — Dashboard and reporting
- **Discovery input:** Dashboard + AdminHome exist; client counts previously corrected (4317388); "awaiting review" metric deferred (no field). Truthfulness audit required against approved sources. **Status:** NOT STARTED.

### P11 — WhatsApp and automation
- **Discovery input:** no WhatsApp/n8n code in the governed repo (ChatAgent.jsx is an in-portal agent UI; Usage.jsx tracks API usage). Existing bot/n8n work lives outside this repository — inventory it at gate start; do not re-enable. Execution requires separate approval. **Status:** NOT STARTED.

### P12 — End-to-end UAT and Preview closure
- **Input:** YAV2_Readiness_Package_Rev1.5 (UAT/SOP, committed at repo root) as seed material. **Status:** NOT STARTED.

### P13 — Production release package (no merge, no deploy)
- **Status:** NOT STARTED.

---

## Dependency map

```
P0 ─▶ P1 ─▶ P2 ─▶ P5(FE) ─▶ P6 ─▶ P7 ─▶ P12 ─▶ P13
      │      ▲     ▲
      ├─▶ P3 ─▶ P4 ┘ (P4 UI needs P2 shell; P5 backend needs P1 only)
      P8, P9, P10 — parallel after P2 shell; P9 gates P12
      P11 — independent plan, separate approval
B-1 (V2 execution channel) gates every EXECUTED state from P1 onward.
```

## Risk register

| ID | Risk / blocker | Severity | Position |
|---|---|---|---|
| B-1 | **BLOCKER.** Supabase MCP in this environment exposes ONLY V1/Production `zcszesuvjrryxtigjglt`. All MCP DB use stopped per Global Rule 2; zero queries run. Standing hazard for any future session; also blocks live verification. **RULED 2026-07-18: execution blocker only — never query it; local authoring continues; live verification/execution via PJ-manual V2 SQL Editor unless a safe V2-only connector appears.** | Critical | RULED / STANDING |
| B-2 | **BLOCKER (governance).** Out-of-band `0017_m1b_d2b…sql` appeared in the working tree during P0 (2026-07-18 07:03:38 IST), not authored by this session, provenance unknown (possible concurrent session). Collides with P1 scope and numbering. **RULED 2026-07-18: provenance confirmed (earlier D2b session) — classified D2b Rev 1, HOLD / REVISION REQUIRED; retain, never delete/execute. See D-P0-1 for post-P0 concurrent changes.** | High | RULED |
| B-3 | `.git/info/exclude` hides `supabase/` from git status; migrations 0001–0011 and 0014 exist on disk only (no commit, no push) — evidence-chain and disaster-recovery gap, and the mechanism that let B-2 arrive silently. **RESOLVED 2026-07-18: exclude line removed per ruling (backup `.bak-p0`); tree classified (see inventory); corpus commit deferred pending hygiene-plan approval.** | High | RESOLVED (commit pending) |
| R-4 | Preview deployment (READY) is pinned to `ae6bf1e0`, 13 commits behind working HEAD; recent safety fixes not deployed. Redeploy is a material-behaviour Preview change → needs gate approval. | Medium | OPEN |
| R-5 | Staged-but-uncommitted D2a evidence (4 files) — closed-gate evidence not yet in history. Low-risk housekeeping commit recommended at P0 close-out. | Low | OPEN |
| R-6 | **Rule conflict.** Master Rule 6 forbids storing Aadhaar last-four, but live data (`clients.directors` JSONB) and current UI store `aadhaar_last4`/`aadhaar_masked` (mask embeds the last four). Affects P1 (RPC field rejection), P2 (UI capture removal), P3 (backfill must drop). **RULED 2026-07-18: no capture/accept/backfill/new storage of Aadhaar digits incl. last-four anywhere in V2; legacy source fields NOT destructively deleted in P1/P3; legacy cleanup separately governed.** | High | RULED |
| R-7 | Frontend keys client writes on `clients.client_id` business code (OnboardingWizard, Clients doc_pin); Rule 7 requires UUID relational keying — P2 remediation scope. | Medium | OPEN |
| R-8 | Broad direct-table-write surface outside Module 1 (tasks, documents, trackers) remains unaudited until P7/P8; interim exposure accepted by phasing. | Medium | ACCEPTED (phased) |
| R-9 | Numbering 0012 = secure-docs executed live but file ABSENT from repo (recover/re-author at a future gate); 0013 reserved for R3. Do not reuse either number. | Info | NOTED (corrected) |

## Proposed migration numbering

| Number | Content | Gate |
|---|---|---|
| 0017 | M1-B D2b CRUD RPCs + INSERT/UPDATE bypass closure (+ `_rollback`) — **EXECUTED / CLOSED PASS** | P1 |
| 0018 | M1-B D2b DELETE privilege closure (+ `_rollback`, read-only verification) — **EXECUTED / CLOSED PASS** | P1 |
| 0019 | D3 legacy person backfill package (renumbered from 0018) | P3 |
| 0020 | D4 remediation-flag population (renumbered from 0019) | P4 |
| 0021 | Service applicability schema + RPCs | P5 |
| 0022 | Controlled compliance generation | P6 |
| 0023+ | P7/P8/P9 backend objects, sequential, one gate per number | P7–P9 |

0012 (secure-docs, executed live, file absent) and 0013 (reserved, R3) are not reusable; 0014–0016 frozen.

---

*Register update rule: this file is amended at the close of every gate with status, commit, evidence hashes and Preview URL. This Rev 1.0 records the P0 result and awaits independent review.*
