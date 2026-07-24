# T3 — Proposed Supabase DB Contract (for T1 to freeze)

**Owner:** TERMINAL 3 — Supabase & Security · **Branch:** `sync/supabase-security`
**Consumed by:** TERMINAL 1 (freezes as generated types → `contracts/**`), TERMINAL 2 (consumes).
**Governing Issue:** #23 · **Governing merged PR:** #29 · **Governing HEAD:** `1286a290f5d4287e70c6853d2eb3bad16256e276`
**Authorised project:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` · **Prohibited:** V1 `zcszesuvjrryxtigjglt`.

## Provenance & status of this contract
This contract is **derived exclusively from the authored SQL migrations** in
`supabase/migrations/` at the governing HEAD. Every migration file carries an
**"AUTHORED NOT APPLIED"** banner, and `0021`/`0022` are additionally marked **DRAFT — NOT
APPLIED**. Therefore this is the **expected/source-of-truth contract**, **not a live-verified
one**. Live reconciliation against V2 (Gaps **G-03**, **G-11**) requires the read-only A4
discovery output, which is **[EVIDENCE-PENDING]** on PJ (see `T3_PJ_EVIDENCE_REQUEST.md`).

- **No SQL was executed** to produce this document. **No V1 access.** Extraction was static
  read of migration files + verbatim `grep`/`sed` inspection.
- Every enum label, column type, and function signature below is quoted **verbatim** from source
  with a file anchor. Where source and live may diverge, it is flagged for A4.

---

## §0. Migration ledger reconciliation (Gap G-02)

**Files present:** forward `0001–0011, 0014, 0015, 0016, 0017, 0018, 0021, 0022` (18) + 5 in-ledger
rollbacks (`0014–0018`). **Absent from the 0001–0022 range:** `0012, 0013, 0019, 0020`.

| # | File | Purpose (from header) | Rollback |
|---|---|---|---|
| 0001 | `0001_extensions_and_enums.sql` | `pgcrypto` + 19 enum types | — |
| 0002 | `0002_tables_people_and_clients.sql` | `financial_years, team, clients, client_directors` | — |
| 0003 | `0003_tables_work_and_documents.sql` | `tasks, follow_ups, documents, completed_documents, extracted_document_data, client_financials, financials_tracker, claude_usage_log` | — |
| 0004 | `0004_tables_compliance_trackers.sql` | 8 tracker tables | — |
| 0005 | `0005_audit_phase4b.sql` | `audit_log, audit_event_contract, audit_ingestion_failures` (FORCE RLS) | — |
| 0006 | `0006_rls_policies.sql` | Baseline RLS ENABLE + permissive `authenticated`-all (OI-2) | — |
| 0007 | `0007_dependency_closure.sql` | 5 dependency tables + audit-validation fn chain | — |
| 0008 | `0008_functions_rpc.sql` | Role helpers + 3 frontend RPCs | — |
| 0009 | `0009_views.sql` | 3 views (`security_invoker=on`) | — |
| 0010 | `0010_rls_refined_phase4b.sql` | Refined portal-role RLS (replaces 0006) — ⚠ in-file banner mislabels itself `0009_…` | — |
| 0011 | `0011_storage_and_edge_DEFER.sql` | **DEFER manifest only — nothing executable** | — |
| 0014 | `0014_r4db_financial_year_repair.sql` | FY & compliance-generation repair (GUC-guarded) | ✔ |
| 0015 | `0015_m1a_client_master_foundation.sql` | M1-A client master (9 tables, FORCE RLS) | ✔ |
| 0016 | `0016_m1b_d2a_audit_write_and_lineage.sql` | `audit_write_event` + lineage cols | ✔ |
| 0017 | `0017_m1b_d2b_client_master_crud_rpcs.sql` | 22 audited CRUD RPCs + write-bypass closure | ✔ |
| 0018 | `0018_m1b_d2b_delete_privilege_closure.sql` | Revoke residual DELETE on 7 base tables | ✔ |
| 0021 | `0021_service_applicability.sql` | **DRAFT** P5 service applicability | manual (in `verification/`) |
| 0022 | `0022_p5_pg1_other_notes_enforcement.sql` | **DRAFT** OTHER-notes CHECK + RPC guards | manual (in `verification/`) |

**Absent-number explanations (evidence-backed):**
- **0012** — secure-docs storage, **executed live-only, no repo file** (evidenced in `0014`/`0015`
  headers, `docs/recovery/SECURITY_BASELINE.md:27`, `BASELINE.md:24`). Number must never be reused.
- **0013** — **RESERVED for R3 (client-ID sequence), NOT USED** (evidenced in `0014`/`0015` headers).
- **0019** — D3 legacy-person backfill, **CANCELLED / never executed** (evidenced in
  `docs/M1B_D3_0019_Draft_Decision_And_Mapping.md`; executable package never committed).
- **0020** — **numbering gap only**; no purpose narrative in repo beyond `BASELINE.md:24`.

**Ledger acceptance (G-02):** source-side ledger reconciled and gaps explained. The live
`supabase_migrations.schema_migrations` read (Part 2 §9 of A4) remains **[EP]** — see evidence request.

> **Apply-ordering constraint (load-bearing):** `0006` alone applies a wide-open
> `FOR ALL TO authenticated USING (true) WITH CHECK (true)` on 20 tables
> (`0006_rls_policies.sql:29`); `0010` **drops every `<table>_authenticated_all` policy**
> (`0010_…:85`) before applying the refined model. **`0010` MUST be applied after `0006`** or the
> DB is left fully open to any authenticated user. T1 should encode this dependency in any apply plan.

---

## §1. Enums (19) — `0001_extensions_and_enums.sql`

Extension: `CREATE EXTENSION IF NOT EXISTS pgcrypto`. All enums in schema `public`. Labels verbatim, ordered.

| Enum | Ordered labels |
|---|---|
| `portal_role_enum` | `Admin, Manager, Executive, Staff, Viewer` |
| `user_role_enum` | `Partner, Manager, Team Member, Client` |
| `compliance_status_enum` | `Not Started, Data Pending, Documents Pending, Assigned, In Progress, Prepared, Waiting for Client, Waiting for Internal Team, Reviewed, Partner Approval Pending, Payment Pending, Filing Pending, Partner Approved, Filed, Completed, Overdue, Not Applicable, Closed` |
| `workflow_stage_enum` | `Assigned, In Progress, Prepared, Reviewed, Partner Approved, Filed` |
| `client_status_enum` | `Active, Inactive, Closed, Prospect` |
| `client_type_enum` | `Individual, Proprietor, HUF, Partnership Firm, LLP, Private Limited Company, Limited Company, Section 8 Company, Trust, Society` |
| `document_category_enum` | `PAN, GST Certificate, TAN, Incorporation Certificate, MOA / AOA, LLP Agreement, Trust Deed, Partnership Deed, Bank Statement, Trial Balance, Ledger, Sales Register, Purchase Register, GSTR-1, GSTR-3B, GSTR-2B, TDS Challan, Form 26AS, AIS, TIS, Financial Statement, Audit Report, ROC Challan, MCA Form, Notice, Reply, Assessment Order, Working Paper, SHA, SPA, Other Document` |
| `audit_type_enum` | `Statutory Audit, Tax Audit, Trust Audit, Internal Audit, GSTR-9C / GST Audit, Stock Audit, Bank Audit, Management Audit, Due Diligence, Special Purpose Audit, Section 8 / NGO Audit` |
| `gst_return_type_enum` | `GSTR-1, GSTR-3B, GSTR-9, GSTR-9C, CMP-08, GSTR-4, LUT, GST Refund, GST Notice Reply, E-Way Bill, E-Invoice` |
| `gst_frequency_enum` | `Monthly, Quarterly_QRMP, Composition` |
| `tds_form_enum` | `24Q, 26Q, 27Q, 27EQ` |
| `roc_filing_type_enum` | `Annual, Event Based` |
| `notice_authority_enum` | `Income Tax, GST, TDS, ROC / MCA, PF, ESI, Labour Department, Other` |
| `month_enum` | `April, May, June, July, August, September, October, November, December, January, February, March` |
| `quarter_enum` | `Q1, Q2, Q3, Q4` |
| `priority_enum` | `Low, Medium, High, Critical` |
| `reminder_channel_enum` | `In-App, Email, WhatsApp` |
| `dkyc_change_type_enum` | `EMAIL, MOBILE, RESIDENTIAL_ADDRESS, MULTIPLE, OTHER` |
| `dkyc_record_type_enum` | `PERIODIC_KYC, EVENT_UPDATE, REACTIVATION, HISTORICAL` |

**Contract flags for T1/T2:**
- `portal_role_enum` (RBAC) and `user_role_enum` (legacy `ct_team_members`) are **two distinct role
  vocabularies** — do not conflate. UI/RBAC gate uses `portal_role_enum`.
- No `ALTER TYPE … ADD VALUE` exists in any migration → enum label sets are fixed as above.
- A4 **§5** must confirm live enums match this ordered set exactly (label order matters for clients).

---

## §2. Tables & columns (source-authored)

All tables schema `public`. Full column detail is preserved in the extraction appendix
(`0002`–`0005`, `0007`, `0015`, `0021`). Below is the **contract-level index**: table → key columns,
PK, notable constraints, and the **client-key model** (critical for T2 field contracts / G-19).

### Two coexisting client-key models (OI-1 — must be in the frozen contract)
- **`client_id text`, NO FK** — `documents, tasks, follow_ups, completed_documents, client_directors,
  client_financials, financials_tracker, extracted_document_data, claude_usage_log`.
- **`client_id uuid` → `clients(id)`** — all 8 trackers (`0004`), the 5 dependency trackers (`0007`),
  and all M1-A/P5 tables (`0015`/`0021`). FKs are declared **only** in `0015`/`0021` tables; tracker
  `client_id uuid` columns are **unenforced references** (no FK constraint in `0004`/`0007`).
- `clients` itself has both `id uuid PK` and `client_id text` (UNIQUE) — the join bridge.

### Core (0002)
- **`clients`** — `id uuid PK`, `client_id text UNIQUE`, `name text NOT NULL`, + ~45 profile cols
  (`pan, gstin, tan, cin, directors jsonb '[]', services jsonb '[]', status text 'Active', is_draft,
  is_test_client, doc_pin, drive_folder_url`, registration numbers/dates, address parts).
- **`team`** — `id uuid PK`, `name text NOT NULL`, `email text UNIQUE (added 0007)`,
  `is_admin boolean NOT NULL false`, `is_active boolean true`, `auth_user_id uuid`,
  `portal_role portal_role_enum DEFAULT 'Staff'`, `ct_role text 'Team Member'`, `chatbot_role text`
  (+ CHECK `chk_team_chatbot_role`). **This is the Auth↔app-role mapping table (G-07).**
- **`financial_years`** — `id uuid PK`, `fy_label varchar(10) UNIQUE`, start/end dates, `is_current`, `is_active`.
- **`client_directors`** — `id uuid PK`, `client_id text` (no FK), director PII (`din, pan,
  aadhaar_masked, aadhaar_last4, dsc_expiry`).

### Work & documents (0003)
- **`tasks`**, **`follow_ups`**, **`documents`** (`scope` CHECK `IN ('client','director','compliance')`;
  `doc_category text 'kyc'`, `file_path, file_url`), **`completed_documents`** (`visibility` CHECK
  `IN ('internal','client')`, `version int 1`), **`extracted_document_data`**, **`client_financials`**
  (UNIQUE `(client_id, fy_label)` added 0007; ~40 numeric financial cols + `raw_extracted jsonb`),
  **`financials_tracker`** (UNIQUE `(client_id, fy_label, doc_type)` added 0007), **`claude_usage_log`**
  (`function_name, model, input/output/total_tokens, provider 'anthropic', cost_estimate`) — feeds Usage tab.

### Compliance trackers (0004) — all `client_id uuid NOT NULL`
`compliance_calendar, gst_tracker, income_tax_tracker, tds_tracker, roc_tracker, notice_tracker,
audit_tracker, accounting_tracker`. Shared columns: `workflow_stage workflow_stage_enum 'Assigned'`,
`status compliance_status_enum 'Not Started'`, per-stage actor(uuid)+date cols, `standard/extended/
individual_due_date`, `remarks`, `created_at/updated_at`. UNIQUE business keys added in 0007 (see appendix).
Actor col naming exceptions: `audit_tracker.assigned_auditor` (not `assigned_to`); `notice_tracker` has no `filed_*`.

### Audit (0005) — FORCE RLS, default-deny
- **`audit_log`** — `id uuid PK (no default)`, `occurred_at`, `initiated_by_type` CHECK `IN ('user','service')`,
  actor/target/client cols, `event_name text NOT NULL`, `risk_tier` CHECK `IN ('LOW','MEDIUM','HIGH','CRITICAL')`,
  `sensitivity_tier` CHECK `IN ('S1','S2','S3','S4')`, `metadata jsonb '{}'`, + `chk_actor_user`/`chk_actor_service`.
- **`audit_event_contract`** — `event_name text PK`, required/optional/permitted key & actor arrays.
- **`audit_ingestion_failures`** — `id uuid PK (no default)`, failure reason (field names only, never values).

### Dependency closure (0007)
New tables: `ct_team_members` (`role user_role_enum`, `email UNIQUE`), `llp_tracker`, `payroll_tracker`
(UNIQUE `(client_id, fy_label, month)`), `tds_client_config` (UNIQUE `client_id`), `trust_ngo_tracker`.

### M1-A client master (0015) — additive, FORCE RLS, all FK → `clients(id) ON DELETE RESTRICT`
`entity_type_catalogue` (code PK, 11 seed rows), `client_persons` (aadhaar verification status machine,
`row_version`), `client_registrations` (+`client_registrations_id_client_uq (id, client_id)` added 0021),
`gst_registration_details` (`registration_id` PK → registrations ON DELETE CASCADE), `client_identifiers`,
`client_contacts`, `client_addresses`, `client_relationships` (client-XOR-person CHECK, ownership_pct 0–100),
`client_remediation_flags` (`severity IN ('info','warn','block-on-edit')`). All carry `row_version int` for
optimistic concurrency and `created_by/updated_by uuid`.

### P5 service applicability (0021, DRAFT) — FORCE RLS
`service_catalogue` (code PK, 11 seed rows, `default_frequency` CHECK), `client_service_applicability`
(`status IN ('Draft','Approved','Inactive')`, partial UNIQUE `(client_id, service_code) WHERE status <> 'Inactive'`,
composite FK `(linked_registration_id, client_id) → client_registrations(id, client_id)`, approval-gate CHECKs).
**0022** adds CHECK `csa_other_notes_required_chk` (`service_code <> 'OTHER' OR notes present`).

> Full column-by-column DDL (types/nullability/defaults/constraints for every table) is retained in
> `T3_DB_CONTRACT_APPENDIX.md`. A4 **§2/§3/§4** must reconcile live columns/constraints/indexes to it (G-03).

---

## §3. Views (3) — `0009_views.sql` — all `WITH (security_invoker='on')`

| View | Output columns (verbatim) | Grouping | Source |
|---|---|---|---|
| `v_firm_dashboard` | `category, total, completed, overdue, pending, **due_in_7_days**, waiting_client, partner_approval_pending` | by `category` | 10 trackers UNION ALL |
| `v_client_compliance_summary` | `client_id, fy_label, total_compliances, completed, overdue, pending, **due_soon**, not_applicable, waiting_client, partner_approval_pending, review_pending, filing_pending` | by `client_id, fy_label` | 11 trackers UNION ALL |
| `v_overdue_ageing` | `client_id, category, due_date, days_overdue, ageing_bucket` | per row | 5 trackers |

- **Contract-critical:** the firm dashboard column is **`due_in_7_days`** — NOT `due_soon`. `due_soon`
  belongs to `v_client_compliance_summary`. The stale clean alias 42703 is exactly a build serving a
  bundle that expects `due_soon` on the firm view (see `BASELINE.md`). Both columns share the identical
  predicate: `due_date BETWEEN CURRENT_DATE AND CURRENT_DATE+7 AND status NOT IN
  ('Filed','Completed','Closed','Not Applicable')` (`0009_views.sql:83,160`).
- `due_date` = `COALESCE(individual_due_date, extended_due_date, standard_due_date)` per tracker
  (notice uses `response_due_date`; accounting contributes `NULL::date`).
- **`v_team_workload` is NOT authored** (deferred, OI-3) yet is referenced by `Dashboard.jsx`/`Compliance.jsx`.
  A4 **§6/§9b** must report whether it exists live; if referenced-but-absent it is a **G-11 variance for T1/T2**.
- All three views are **SECURITY INVOKER** → they run with the caller's RLS. A4 **§6** must confirm no view
  was created SECURITY DEFINER live (that would bypass RLS).

---

## §4. RPC / function signatures (34 functions) — verbatim

**Role & gate helpers (0008)** — all `SECURITY DEFINER`, `STABLE`, `search_path` pinned:

| Function | Returns | search_path |
|---|---|---|
| `get_app_role()` | `text` | `'pg_catalog','public','pg_temp'` |
| `get_app_role_for_user(p_user_id uuid)` | `text` | `'pg_catalog','public','pg_temp'` |
| `get_my_role()` | `user_role_enum` | `'public','pg_temp'` |
| `get_my_team_id()` | `uuid` | `'public','pg_temp'` |
| `get_portal_role()` | `text` | `'public'` |
| `is_active_user()` | `boolean` | `'public'` |
| `is_admin()` | `boolean` | `'public','pg_temp'` |
| `is_admin_or_manager()` | `boolean` | `'public'` |

**Frontend / sensitive RPCs (0008):**
- `generate_client_compliance(p_client_id uuid, p_client_type text, p_has_gstin boolean DEFAULT false,
  p_gstin text DEFAULT NULL, p_gst_frequency text DEFAULT 'Monthly', p_has_tan boolean DEFAULT false,
  p_tan text DEFAULT NULL, p_has_cin boolean DEFAULT false, p_cin text DEFAULT NULL,
  p_has_llpin boolean DEFAULT false, p_llpin text DEFAULT NULL, p_incorporation_date date DEFAULT NULL)`
  → `void` · **SECURITY INVOKER** · `search_path 'public','pg_temp'`.
- `activate_accounting_service(p_client_id uuid, p_start_fy varchar DEFAULT '2020-21')` → `void` ·
  **SECURITY INVOKER** · `search_path 'public','pg_temp'`.
- `get_sensitive_audit_logs(p_from timestamptz, p_to timestamptz, p_page_number integer,
  p_page_size integer, p_risk_tier text DEFAULT NULL, p_client_uuid uuid DEFAULT NULL)` → `jsonb` ·
  **SECURITY DEFINER** · `search_path 'pg_catalog','public','pg_temp'` · enforces `auth.uid()` non-null
  **and** `get_app_role() = 'admin'` internally, with fail-closed read-audit.

**Audit writer (0016):** `audit_write_event(p_event_name text, p_action text, p_resource_type text,
p_resource_id text, p_client_id uuid, p_metadata jsonb)` → `uuid` · SECURITY DEFINER ·
`search_path pg_catalog, public, pg_temp` · `REVOKE ALL FROM PUBLIC, anon, authenticated, service_role`
(callable only via SECURITY DEFINER chain).

**Client-master CRUD RPCs (0017) — 22 functions**, all SECURITY DEFINER, `search_path pg_catalog,
public, pg_temp`, `REVOKE ALL FROM PUBLIC, anon, service_role; GRANT EXECUTE TO authenticated`:
`client_person_create/update/set_active`, `client_identifier_create/update/set_active`,
`client_contact_create/update/set_active`, `client_address_create/update/set_active`,
`client_relationship_create/update/set_active`, `client_registration_create/update/set_active`,
`gst_detail_create/update`, `client_registration_create_with_gst`, `client_registration_update_with_gst`.
Every update/set_active takes `p_expected_row_version integer` (optimistic-lock contract) and returns
`integer` (new row_version) or `jsonb`/`uuid` for creates. Full arg lists retained in the appendix.

**Security-relevant totals:** 34 functions · 32 SECURITY DEFINER · 2 SECURITY INVOKER · **34/34 pin
`search_path`** → **S3 gate passes at source level** (live confirmation still required, A4 §7).

---

## §5. Storage contract — `0011_storage_and_edge_DEFER.sql` (DEFER manifest, nothing executed)

Three **private** buckets (`public=false`), all commented/deferred in source:
- **`secure-docs`** — primary client/compliance documents (OnboardingWizard, DocumentManager, Compliance).
- **`completed-work`** — finalised work products (WorkDocuments).
- **`client-docs`** — legacy read path (`legacyBucket()`).

`storage.objects` RLS policies, signed-URL expiry, and per-client path separation are **NOT authored**
(deferred to the storage-provisioning gate). Documented (unconfirmed) limits: max object ~5–10 MB;
MIME allow-list pdf/image/office. **Storage is entirely [EVIDENCE-PENDING] (G-08):** A4 **§13/§13c** must
capture live buckets, private flag, and `storage.objects` policies for `secure-docs` (S5 gate). Note `0012`
(secure-docs) was executed **live-only** — the live bucket/policies are the source of truth, not the repo.

---

## §6. Edge Function invocation contract (observed from frontend callers)

**Source recovery status: NONE recoverable** — no `.ts` for any function exists in git history
(see `supabase/functions/EDGE_FUNCTION_RECOVERY_STATUS.md`, G-09). The **invocation shapes** below are
extracted read-only from the frontend call sites (not invented); they define the request/response contract
T1 should freeze and any recovered/redeployed function must honour.

| Function | Call site | Transport | Request body | Response (fields consumed) |
|---|---|---|---|---|
| `ai-agent` | `src/components/ChatAgent.jsx:51` | `supabase.functions.invoke('ai-agent', …)` | `{ messages: [{ role: 'user'\|'assistant', content: string }] }` | `{ response: string, error?: any }` |
| `scan-document` | `src/components/OnboardingWizard.jsx:380` | `supabase.functions.invoke('scan-document', …)` | `{ imageBase64: string, mimeType: 'image/jpeg' }` | `{ extracted: { name, pan, gstin, tan, cin, mobile, email, address, udyam_no, city, state, pincode }, fieldsFound: number, provider: string, error?: any }` |
| `extract-financial` | `src/components/Compliance.jsx:653,721` | `fetch(`${SUPABASE_FUNCTIONS_URL}/extract-financial`)` with `Authorization: Bearer <session.access_token>` | `{ mode: 'check'\|'claude', financialId, fileBase64, mimeType, docType, clientId, fyLabel, documentId, unitOverride?, ocrText? }` | `{ error?, usedFree?, needsClaude?, fields?, engine?, confidence?, crossCheck?, unit?, score?, charCount?, pdfType?, mistralChars?, ocrText?, message? }` |

**Notes for T1 env contract:** `SUPABASE_FUNCTIONS_URL = VITE_SUPABASE_FUNCTIONS_URL || `${SUPABASE_URL}/functions/v1``
(`src/supabase.js:21`). `ai-agent`/`scan-document` use `functions.invoke` (SDK attaches anon+auth headers);
`extract-financial` uses explicit `fetch` with the end-user bearer token. `dkyc-verify-upload` is Package E
(**NOT AUTHORISED**) — its locked contract exists only as a review-only spec (see recovery status doc).

---

## §7. What T1 should freeze vs. what still needs live evidence

**Freezable now from source (high confidence):** enum sets (§1), view output columns (§3), RPC signatures
(§4), the two client-key models (§2), the Edge invocation shapes (§6). These are exact from authored source.

**Do NOT freeze as live-true until A4 output (G-03/G-11/G-04..08/G-10):** actual live tables/columns/
constraints/indexes; live RLS/FORCE/policy/grant state; `search_path` on live functions; storage buckets &
policies; `v_team_workload` existence; migration ledger `schema_migrations`; Edge deployment state.
These are enumerated with exact read-only probes in `T3_PJ_EVIDENCE_REQUEST.md`.

## Governance footer
```
Governing Issue: #23 · Governing merged PR: #29 · Governing HEAD: 1286a290f5d4287e70c6853d2eb3bad16256e276
Role: T3 — DATA SECURITY · Branch: sync/supabase-security · Target: sync/integration
Source basis: authored migrations (AUTHORED NOT APPLIED); live reconciliation pending A4 (PJ)
SQL/Database action: NOT AUTHORISED · Deployment/Alias change: NOT AUTHORISED · V1 access: NONE
```
