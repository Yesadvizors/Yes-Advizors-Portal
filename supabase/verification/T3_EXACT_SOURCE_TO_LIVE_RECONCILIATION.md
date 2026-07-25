# T3 — Exact Source-to-Live Contract Reconciliation

**Owner:** TERMINAL 3 — Supabase & Security · **Branch:** `sync/supabase-security` · **Draft PR base:** `sync/integration`
**Governing Issue:** #23 · **Integration HEAD:** `65e20a44e386f91ee85912414ad86e593cda11a1`
**Authorised:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` ONLY · **Prohibited:** V1 `zcszesuvjrryxtigjglt`.
**Nature:** read-only, evidence & documentation only. **T3 executed no SQL; no V1; no mutation/deploy/remediation.**

**Package status (accurate scope — NOT a completion claim):** this package **establishes the source-side
reconciliation**, **records the structural matches supported by existing in-repo evidence**, and **prepares the
consolidated read-only evidence request** required to complete exact live equality. **Exact live equality remains
EVIDENCE-PENDING** for field-by-field columns, constraints/indexes, enums, per-function detail/bodies, and view
definitions until the evidence request is executed by PJ and reconciled. The exact source-to-live reconciliation is
**not** described as complete.

## Classification legend (five-way distinction — never conflated)
- **SRC** = source contract (established from merged migrations).
- **LIVE** = live V2 evidence available **in-repo** now (PR #33 reconciliation + P5 execution-evidence docs).
- **EXACT** = exact-equality result: **MATCH** (both sides present & equal) · **VARIANCE** (confirmed diff) ·
  **EVIDENCE-PENDING** (SRC established, LIVE detail not yet available — needs the evidence request) ·
  **N/A**.
- **REMED** = remediation authority (this package performs none).

> **Rule honoured:** live equality is **never inferred** from source presence or matching object counts.
> Existence/count/structural posture matches are labelled as such and do **not** constitute field-by-field
> or definition equality.

## Evidence sources used (per the evidence-acquisition rule)
1. Merged migrations at integration HEAD (`supabase/migrations/**`) — SRC.
2. `T3_DB_CONTRACT_PROPOSAL.md` / `T3_DB_CONTRACT_APPENDIX.md` / `contracts/G-16_SOURCE_CONTRACT_FREEZE.md` — frozen SRC.
3. `T3_LIVE_V2_RECONCILIATION.md` (PR #33, CLOSED PASS) — structural/count-level LIVE.
4. `docs/M1B_P5_0021_Execution_Evidence.md`, `docs/M1B_P5_PG1_Execution_Evidence.md` — LIVE structural for the 2 P5 tables + 3 P5 RPCs.
Where exact LIVE detail is missing → consolidated in `T3_EXACT_RECONCILIATION_EVIDENCE_REQUEST.md` (PJ read-only).

---

## 1. Fourteen-table field-by-field reconciliation

**LIVE evidence available in-repo is structural/count-level, not per-column.** Table **existence** (39/39, PR #33)
and **RLS/FORCE** posture (FORCE-14 set + 25 ENABLE-only, PR #33) are verified live; **per-column** attributes
(ordinal/type/nullability/default/identity/generated), **constraints**, and **indexes** were **captured by PJ
but the values were not preserved in-repo**, so field-by-field equality is **EVIDENCE-PENDING** (Evidence Request
§1–§3). The 2 P5 tables carry additional in-repo structural evidence (0021/0022 execution).

| # | Table | SRC anchor | Existence (LIVE) | RLS/FORCE (LIVE) | Columns field-by-field | Constraints (PK/UQ/FK/CHK) | Indexes |
|---|---|---|---|---|---|---|---|
| 1 | `clients` | 0002 / APPENDIX §A | **MATCH** (present) | **MATCH** — RLS on, not FORCE (ENABLE-only by design) | EVIDENCE-PENDING (§1) | EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 2 | `team` | 0002 / §A | **MATCH** | **MATCH** — RLS on, not FORCE | EVIDENCE-PENDING (§1) | EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 3 | `client_persons` | 0015 / §C | **MATCH** | **MATCH** — FORCE (in FORCE-14 set) | EVIDENCE-PENDING (§1) | EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 4 | `client_identifiers` | 0015 / §C | **MATCH** | **MATCH** — FORCE | EVIDENCE-PENDING (§1) | EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 5 | `client_addresses` | 0015 / §C | **MATCH** | **MATCH** — FORCE | EVIDENCE-PENDING (§1) | EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 6 | `client_contacts` | 0015 / §C | **MATCH** | **MATCH** — FORCE | EVIDENCE-PENDING (§1) | EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 7 | `client_registrations` | 0015 (+0021 UQ) / §C | **MATCH** | **MATCH** — FORCE | EVIDENCE-PENDING (§1) | **PARTIAL:** `client_registrations_id_client_uq` **MATCH** (0021 exec evidence); rest EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 8 | `gst_registration_details` | 0015 / §C | **MATCH** | **MATCH** — FORCE | EVIDENCE-PENDING (§1) | EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 9 | `client_relationships` | 0015 / §C | **MATCH** | **MATCH** — FORCE | EVIDENCE-PENDING (§1) | EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 10 | `client_service_applicability` | 0021 (+0022 CHK) / §D | **MATCH** | **MATCH** — FORCE (0021 exec: `p5_rls_applicability_forced`) | EVIDENCE-PENDING (§1) | **PARTIAL:** `csa_other_notes_required_chk` **MATCH** (0022 exec); FK/UQ/other EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 11 | `service_catalogue` | 0021 / §D | **MATCH** (11 rows) | **MATCH** — FORCE (0021 exec: `p5_rls_catalogue_forced`) | EVIDENCE-PENDING (§1) | EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 12 | `audit_event_contract` | 0005 / §A | **MATCH** | **MATCH** — FORCE | EVIDENCE-PENDING (§1) | EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 13 | `audit_log` | 0005 / §A | **MATCH** | **MATCH** — FORCE | EVIDENCE-PENDING (§1) | EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |
| 14 | `audit_ingestion_failures` | 0005 / §A | **MATCH** | **MATCH** — FORCE | EVIDENCE-PENDING (§1) | EVIDENCE-PENDING (§2) | EVIDENCE-PENDING (§3) |

**Full table equality is NOT claimed for any of the 14** — only existence and RLS/FORCE posture are live-verified;
all per-column and (except the two noted P5 constraints) constraint/index equality is EVIDENCE-PENDING. SRC side for
every column/constraint/index is fully specified in `T3_DB_CONTRACT_APPENDIX.md §A/§C/§D`.

## 2. Enum reconciliation
- **SRC:** 19 enum types with verbatim ordered labels (`0001`; `T3_DB_CONTRACT_PROPOSAL.md §1`; `G-16 A.1`).
- **LIVE (in-repo):** **none** — the supplied PJ findings did not include enum type/label/order output.
- **EXACT:** type count / type names / labels / label-ordering → **all EVIDENCE-PENDING** (Evidence Request §4).
  Live enum content and ordering **must not be inferred from source**. **N/A / VARIANCE: none determinable yet.**
- **REMED:** none.

## 3. Function contract reconciliation (51 functions, risk-based)
- **SRC:** 51 functions across `0007/0008/0014/0016/0017/0021`; 34 explicitly frozen in `G-16 A.3`
  (signatures, DEFINER/INVOKER, pinned `search_path`); full arg lists in `APPENDIX §E`.
- **LIVE (in-repo, PR #33):** count **51 = MATCH**; **48 DEFINER / 3 INVOKER**; **all 51 have explicit
  `search_path`** (aggregate posture) — **MATCH (aggregate/structural)**. **17 functions with PUBLIC+anon
  EXECUTE — enumerated CONFIRMED VARIANCE (G-05, V-5)** — retained, **not revoked**. P5 RPCs
  (`service_applicability_create/update/set_status`) live EXECUTE posture (authenticated yes; anon/service_role/
  PUBLIC no) — **MATCH** (0022 PG1 evidence `p6_rpc_execute_posture`).
- **EXACT per function:** aggregate posture MATCH; **per-function signature / return / language / volatility /
  proconfig / per-function grant matrix / body → EVIDENCE-PENDING** (Evidence Request §5), except the P5 RPC grants
  (MATCH) and the 17 enumerated PUBLIC/anon grants (VARIANCE).
- **Risk-based reconciliation plan** (executed against Evidence Request §5 output):
  | Tier | Functions | Depth required | Status |
  |---|---|---|---|
  | Privileged role/audit | `get_app_role`, `get_app_role_for_user`, `get_my_role`, `get_my_team_id`, `get_portal_role`, `is_active_user`, `is_admin`, `is_admin_or_manager`, `get_sensitive_audit_logs`, `audit_write_event`, `audit_validate_event`, `audit_contains_secret`, `audit_field_format_ok`, `audit_is_uuid`, `_write_read_audit`, `_record_audit_failure` | signature + security + search_path + grants + **body** | **EVIDENCE-PENDING** (§5 incl. `pg_get_functiondef`) |
  | CRUD / security RPCs | 22 client-master CRUD (`client_*`, `gst_detail_*`) + `generate_client_compliance`, `activate_accounting_service`, 3 service_applicability RPCs | signature + security + search_path + grants (body if material) | **EVIDENCE-PENDING** (§5); P5 RPC grants MATCH |
  | Pure calc/read helpers | `calc_gst_due_date`, `get_client_start_fy`, `get_current_fy`, `ensure_financial_year_horizon`, `expected_backfill_start_fy`, `resolve_client_start_fy`, `get_unknown_incorporation_start_fy`, `generate_client_compliance_core` | signature + security + search_path (proportionate; body optional — limitation documented) | **EVIDENCE-PENDING** (§5) |
- **REMED:** the 17 PUBLIC/anon EXECUTE grants remain a **confirmed unresolved variance** — **no revoke** (PJ-authority, [LIVE-PJ]).

## 4. Live-view definition reconciliation (3 views)
- **SRC:** `0009_views.sql`, all `WITH (security_invoker='on')` — exact column lists, joins, filters, aggregations
  (`G-16 A.2`); `v_firm_dashboard.due_in_7_days` (not `due_soon`).
- **LIVE (in-repo, PR #33):** all 3 views **present** (existence MATCH); `v_team_workload` **absent** (MATCH-absent).
- **EXACT:** **definition equality EVIDENCE-PENDING** (Evidence Request §6 — `pg_get_viewdef` + `security_invoker`).
  Existence is **not** treated as definition equality.
- **`v_team_workload`:** retained as a **CROSS-PACKAGE SOURCE-COMPLETENESS VARIANCE** (absent from live **and**
  authored DB source; referenced by app source). **Not authored/created here.**
- **REMED:** none.

## 5. Storage source-expectation disposition (repository-evidence-based)
- **`secure-docs`:** **VERIFIED REQUIRED/LIVE bucket** — present, private (`public=false`), 6 objects, policy
  `secure_docs_admin_manager_all` (PR #33). SRC: primary documents path across
  OnboardingWizard/DocumentManager/Compliance. **Disposition: required/live — PASS.**
- **`completed-work`:** **HISTORICAL/DEFERRED REFERENCE, PENDING GOVERNING SOURCE-EXPECTATION DISPOSITION.**
  Repo evidence: appears **only** in the non-executable DEFER manifest `0011_storage_and_edge_DEFER.sql:10,16`
  (commented, "nothing executable") and as a frontend path (`WorkDocuments.jsx`). **No executable migration
  requires it.** Not a confirmed live requirement; not obsolete-confirmed either — governing disposition (deferred
  design item vs obsolete) is a PJ/T1 decision. Absent live (PR #33).
- **`client-docs`:** **HISTORICAL/DEFERRED REFERENCE (legacy read path), PENDING GOVERNING SOURCE-EXPECTATION
  DISPOSITION.** Repo evidence: `0011:11,17` (commented) + legacy `legacyBucket()` read path. No executable
  migration requires it. Absent live.
- **Recommendation:** classify `secure-docs` = required/live (PASS); `completed-work` + `client-docs` = **deferred
  design references pending PJ governing disposition** (candidates for OBSOLETE if the WorkDocuments/legacy paths
  are confirmed dead by T2). **No bucket/policy created or modified.**

## 6. Migration-ledger disposition (formal, evidence-based)
- **Facts:** `supabase_migrations.schema_migrations` **does not exist** on V2 (PR #33). Objects are present
  (32/33 expected). **Object presence evidences that equivalent objects exist live but does NOT prove the
  migration-ledger history or which migration files were executed.** Source-to-live *equivalence* can be assessed
  independently of migration provenance (via the column/constraint/enum/function/view evidence above).
- **Provenance:** historical migration-execution provenance remains **unavailable** unless additional evidence
  exists (the CLI ledger table is absent; migrations were applied via direct SQL — consistent with the P5
  execution-evidence docs, which record manual SQL-Editor execution, not a CLI ledger).
- **Recommended disposition: `ACCEPTED PROVENANCE LIMITATION`** — the absence of `schema_migrations` is a
  **provenance limitation**, not a schema defect and not proof of non-application. Source-to-live equivalence is
  pursued directly (evidence request). The ledger itself is **not** required by Issue #23 acceptance for schema
  equivalence, so it need not remain hard-BLOCKED; it is an accepted, documented limitation.
  (Alternative `BLOCKED` is retained only if PJ requires a live ledger as an acceptance artifact.)
- **REMED:** **none** — do not create, backfill, or alter any migration ledger.

---

## 7. Consolidated status

### Reconciled from existing evidence (LIVE, in-repo) — no new SQL
- 14/14 table **existence** MATCH; 14/14 **RLS/FORCE** posture MATCH; function **count + security posture** MATCH;
  **17 PUBLIC/anon EXECUTE** VARIANCE (enumerated); P5 (`service_catalogue`, `client_service_applicability`)
  structural MATCH incl. `client_registrations_id_client_uq` + `csa_other_notes_required_chk` + P5 RPC grants;
  3 views + `v_team_workload`-absent existence MATCH; `secure-docs` required/live PASS.

### Still requiring PJ read-only evidence (Evidence Request §1–§6)
- Field-by-field columns (14 tables); constraints/indexes (12 tables + remainder of the 2 P5 tables);
  enum type/name/label/order; per-function signature/return/language/volatility/proconfig/grant/body;
  3 view definitions.

### Confirmed variances (none remediated)
- **G-05 (Aggregate HIGH):** 17 PUBLIC/anon EXECUTE functions (retained; no revoke).
- **G-11:** `v_team_workload` cross-package source-completeness variance (not created).

### Dispositions recommended
- **Migration ledger:** ACCEPTED PROVENANCE LIMITATION (not BLOCKED, not a defect; no backfill).
- **Storage:** `secure-docs` required/live PASS; `completed-work` + `client-docs` deferred references pending PJ disposition.

## 8. Completion impact
Per the completion rule, **preparing documentation/queries/analysis earns no completion**, and **exact live
evidence remains pending PJ execution** for the field-by-field / enum / function-detail / view-definition items —
so **no portion may be counted as completed** by this package.

| Area | Prior fraction | New fraction | Contribution |
|---|---:|---:|---:|
| 3 Supabase schema/DB | 0.28 | 0.28 | **+0.00 pp** |
| 4 Security | 0.32 | 0.32 | **+0.00 pp** |
| 5 Edge/Storage/Integrations | 0.12 | 0.12 | **+0.00 pp** |
| **Total** | | | **+0.00 pp** |

- **Official completion (before):** **41.9%** displayed (unrounded **41.85%**) — the current post-PR #33 baseline.
- **Contribution:** **+0.00 pp** (analysis/evidence-request preparation only; exact live evidence pending PJ).
- **After (displayed):** **41.9%** (unchanged, unrounded 41.85%) · **Remaining (displayed):** **58.2%** (unchanged, unrounded 58.15%).
- **Provisional** pending independent ChatGPT review; any future increase attaches to the *returned* exact evidence,
  not to this preparation.

## Constraints honoured
No SQL executed by T3 · no V1 access · no create/alter/drop/insert/update/delete · no GRANT/REVOKE (17 grants
retained) · no `v_team_workload` · no Auth/Storage change · no person backfill · no Edge/Vercel deploy · no
`src/**` change · **no remediation** · no merge. Commit + push + draft PR are **authorised review actions only**.

## Governance footer
```
Governing Issue: #23 · Integration HEAD: 65e20a44e386f91ee85912414ad86e593cda11a1
Role: T3 — DATA SECURITY · Branch: sync/supabase-security · Draft PR base: sync/integration
Authorised: V2 ogjrwemjefvccpyjwxuo ONLY · Prohibited: V1 zcszesuvjrryxtigjglt (never queried)
SQL/DB mutation: NOT AUTHORISED · Deploy/Alias: NOT AUTHORISED · Remediation: NOT PERFORMED · V1 access: NONE
```
