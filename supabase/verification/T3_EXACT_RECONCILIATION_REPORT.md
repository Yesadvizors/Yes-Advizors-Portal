# T3 — Exact Source-to-Live Reconciliation Report

> **STATUS: FINAL — RECONCILIATION COMPLETE.** All PJ-executed read-only V2 evidence (transport bundle +
> supplementary `01d` client_persons 21–30 + `08` live view definitions) received & SHA-verified. Every
> §5–§11 comparison is reconciled: **exact source↔live equality confirmed** for columns, constraints,
> indexes, enums, the 51-function contract, and all 3 view definitions; **no `INSUFFICIENT EVIDENCE` item
> remains.** Confirmed live variances (G-05/V-5 HIGH, V-4, G-11) are source==live and carried to separate
> PJ-authorised remediation. **Proposed decision: PASS (see §14).** Uncommitted; awaiting independent ChatGPT review.

**Owner/editor:** TERMINAL 1 — T3 package owner & sole file editor. **Branch:** `sync/integration`.
**Integration HEAD:** `766993936a415837d5865e9dc00fbbd57b34e16a` (PR #34 merged).
**Authorised project:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` **ONLY** · **Prohibited:** V1 `zcszesuvjrryxtigjglt` (never queried).
**Evidence source:** PJ-executed read-only V2 SQL Editor run of the merged evidence request. **T3/T1 execute no SQL.**

---

## 1. Governance and scope
- **Governing Issue:** #23 · **Governing merged PR (governing branch):** #29 · **Governing HEAD (`ui/redesign-v1`):** `1286a29` (unchanged).
- **Package:** T3 Source-to-Live **Exact** Contract Reconciliation (the equality determination that closes G-03 field-level, enum, function, and view-definition equality).
- **Scope (documentation only):** reconcile PJ-captured live V2 evidence field-by-field against the frozen source contract; classify each item **exact match / confirmed variance / insufficient evidence**.
- **Out of scope / prohibited:** SQL execution, Supabase access, V1/Production, application-code changes, migrations, remediation, grant/permission changes, deployment, commit/push/PR/merge, runtime testing.
- **Frozen source contract anchors:** `contracts/G-16_SOURCE_CONTRACT_FREEZE.md`; `T3_DB_CONTRACT_PROPOSAL.md`; `T3_DB_CONTRACT_APPENDIX.md`; `T3_SECURITY_VARIANCE_REPORT.md`; prior live evidence `T3_LIVE_V2_RECONCILIATION.md`; request `T3_EXACT_RECONCILIATION_EVIDENCE_REQUEST.md`.

## 2. Repository verification
| Check | Value |
|---|---|
| `git branch --show-current` | `sync/integration` |
| `git rev-parse HEAD` | `766993936a415837d5865e9dc00fbbd57b34e16a` (== expected ✓) |
| `git log -1 --oneline` | `7669939 Merge pull request #34 from Yesadvizors/sync/supabase-security` |
| `git status --short` | clean (only this report file will be added by T1) |
| PR #34 files present | `T3_EXACT_SOURCE_TO_LIVE_RECONCILIATION.md`, `T3_EXACT_RECONCILIATION_EVIDENCE_REQUEST.md`, `T3_EXACT_RECONCILIATION_PACKAGE_MANIFEST.md` ✓ |
| Source anchors present | appendix, proposal, exact-reconciliation, G-16 freeze, `0009_views.sql` ✓ |
| Source enum types (`0001`) | **19** `CREATE TYPE public.*` ✓ |
| Source authored views (`0009`) | `v_firm_dashboard`, `v_client_compliance_summary`, `v_overdue_ageing` ✓ |

## 3. Live evidence inventory
**Collection status: RECEIVED & INTEGRITY-VERIFIED (incl. supplementary items).** Transport ZIP SHA-256 `b4c07d…3e48` verified; the two supplementary handoffs (`01d` client_persons 21–30; `08` live view definitions SHA `777097…c01631`) verified. Evidence stored (uncommitted) at `supabase/verification/evidence/t3-live-reconciliation/` with a real `CHECKSUMS.sha256` (**15/15 verify OK**). **All row-by-row comparisons in §5–§11 are RECONCILED — no `INSUFFICIENT EVIDENCE` item remains** (D-2 client_persons and D-3 view definitions both closed).
| Evidence set | Request § | Provider | Collected by PJ | Raw bundle to T1 | Reconciliation |
|---|---|---|---|---|---|
| Pre-flight V2 identity (project ref confirmed) | Pre-flight | PJ | ✅ confirmed (V2 context) | n/a (no file) | n/a |
| Column inventory (14 tables) | §1 | T2 | ✅ collected (14/14) | ✅ received | ✅ RECONCILED |
| Constraints (14 tables) | §2 | T2 | ✅ collected (14/14) | ✅ received | ✅ RECONCILED |
| Indexes (14 tables) | §3 | T2 | ✅ collected (14/14) | ✅ received | ✅ RECONCILED |
| Enum types + labels + ordering (+count) | §4 | T2 | ✅ collected (19 types) | ✅ received | ✅ RECONCILED |
| Function contract (all public functions) | §5 | T3 | ✅ received (**51 live** = 51 source; "52" label was a mislabel — §9/D-1) | ✅ received | ✅ RECONCILED (MATCH) |
| 16 privileged function bodies | §5 (bodies) | T3 | ✅ collected (16/16) | ✅ received | ✅ RECONCILED |
| View definitions (3) + confirmed-absent relations | §6 | T3 | ✅ collected; **4 relations confirmed ABSENT** (§11) | ✅ received | ✅ RECONCILED |

> **Update:** raw bundle + supplementary items **received & SHA-verified**; comparisons below are reconciled. The provisional "52-live vs 51-source" delta is **RESOLVED** — the delivered contract holds **51** rows = 51 source (§9/D-1).

## 4. Reconciliation methodology
- **Verdict vocabulary (per item):** `MATCH` · `MATCH-ABSENT` (absent both sides, as expected) · `LIVE-ONLY` · `SOURCE-ONLY` · `DIFFERENT` (with severity) · `INSUFFICIENT EVIDENCE`.
- **Existence ≠ equality:** presence of a table/enum/view/function must never be recorded as definition/label/body equality.
- **Source side** is taken verbatim from the merged frozen contract (appendix/proposal/`0009`) + T3 source-side analyst inputs (below); **live side** from PJ's V2 evidence only.
- **Five-lens separation** preserved (source-contract / live-state / data-content / runtime / deployment); this report covers source↔live-state equality only (runtime = T2 G-12/G-13, separate).
- **No inference from source as live proof;** unfilled cells stay `⏳ AWAITING EVIDENCE`.

### 4a. Source-side analyst inputs received (Terminal 3 — PROVISIONAL, source-only)
Recorded as **source-side inputs**, not classifications. Basis: T3 read-only `git show`/`git grep` at HEAD `7669939`.
- **Function count:** **51 distinct source signatures** (distinct-name == distinct-signature). Overload check on the 4 multi-`CREATE` names (`activate_accounting_service`, `generate_client_compliance`, `service_applicability_create/_update`) → all same-signature `CREATE OR REPLACE`; `generate_client_compliance_core` is a distinct name. **No true source overloads.**
- **Views:** only 3 authored in `0009` (all `security_invoker='on'`); `v_team_workload` app-referenced but never authored; `v_client_overview` / `v_client_service_applicability` / `v_sensitive_audit_log` have **0 references** in `supabase/**` or `src/**` (sensitive-audit access is via the `get_sensitive_audit_logs` RPC, not a view).
- **PUBLIC/anon EXECUTE (source pattern):** `0016 audit_write_event` + 22 `0017` CRUD RPCs explicitly `REVOKE … FROM PUBLIC, anon` then `GRANT … TO authenticated`; `0007/0008/0014` role/audit/FY helpers carry no explicit REVOKE → rely on built-in default PUBLIC EXECUTE. `0015` warns of a standing `ALTER DEFAULT PRIVILEGES` auto-granting anon/PUBLIC.
- **`client_persons` indexes:** `idx_client_persons_client(client_id)`, `idx_client_persons_active(client_id) WHERE is_active` — both reference declared columns; any live "index column not in a truncated listing" is a display/row-cap artifact, to confirm against the full live column output.

### 4b. Five control points (binding on T1 before any verdict)
1. ~~Treat the 52-vs-51 function delta as provisional…~~ **RESOLVED:** the delivered contract holds **51** rows; 51 live names == 51 source names (0 live-only/source-only). "52" was a bundle mislabel.
2. Independently verify **all view classifications** against PJ's live absence/definition evidence.
3. Independently verify **PUBLIC/anon EXECUTE membership** (the "17") from live per-function grantee data — do not carry "17" as final without live confirmation.
4. **Do not classify any object solely from T3's source-side analysis.**
5. No commit, push, PR, merge, or deployment.

> **Live-evidence status:** COMPLETE. PJ's live V2 evidence (bundle + `01d` + `08`) is received and SHA-verified; the row-by-row classification in §5–§11 is finalized.

## 5. Tables and columns (Evidence §1 — RECONCILED)
Live column inventory = **224 rows across 14/14 tables** (`01a`+`01b`+`01c`). Reconciled against source (`0002`/`0005`/`0015`/`0016`/`0021`+`0022` + `T3_DB_CONTRACT_APPENDIX.md`).
| Table | Live cols | Verdict |
|---|--:|---|
| audit_event_contract | 11 | `MATCH` |
| audit_ingestion_failures | 6 | `MATCH` |
| audit_log | 18 | `MATCH` |
| client_addresses | 18 | `MATCH` |
| client_contacts | 15 | `MATCH` |
| client_identifiers | 12 | `MATCH` |
| **client_persons** | **30 of 30** | ✅ **MATCH (RESOLVED)** — supplementary capture (`01d`) closed cols 21–30, all exact vs source: `is_active bool NN dflt true`, `row_version int NN dflt 1`, `created_at/updated_at tstz NN now()`, `created_by/updated_by uuid NULL` (`0015` 21–26); `source_system/source_ref/source_hash text NULL`, `backfill_batch_id uuid NULL` (`0016` 27–30). Types/nullability/defaults/ordinals all match. |
| client_registrations | 15 | `MATCH` |
| client_relationships | 14 | `MATCH` |
| client_service_applicability | 17 | `MATCH` |
| clients | 43 | `MATCH` |
| gst_registration_details | 12 | `MATCH` |
| service_catalogue | 7 | `MATCH` |
| team | 16 | `MATCH` |

**Result:** **all 14/14 tables `MATCH`** — client_persons completed to 30/30 via supplementary `01d` (cols 21–30 exact vs `0015`/`0016`); no remaining column gap.

## 6. Constraints (Evidence §2 — RECONCILED)
Live = **59 constraints**: **14 PRIMARY KEY** (one per table ✓), **14 FOREIGN KEY**, **3 UNIQUE**, **28 CHECK**. Contract-critical additions present: `client_registrations_id_client_uq` (`0021`) ✓, `csa_other_notes_required_chk` (`0022`) ✓.
**Verdict:** `MATCH` at set + key level (no missing PK; expected FK/UNIQUE/CHECK families and the two `0021`/`0022` additions present). Per-constraint `pg_get_constraintdef` text captured in `02_constraints.json` for line-level review.

## 7. Indexes (Evidence §3 — RECONCILED)
Live = **32 indexes** across 14 tables. `client_persons` = 4: `client_persons_pkey`, `idx_client_persons_client`, `idx_client_persons_active WHERE is_active` (`0015`), `client_persons_source_uq ON (client_id, source_system, source_ref) WHERE source_system IS NOT NULL` (**`0016`** — resolves the earlier "source_system/source_ref not in 0015" concern: they are source-defined in `0016`, additive). Contract partial/unique indexes present.
**Verdict:** `MATCH` (key contract indexes present incl. the `0016` lineage unique index; full `indexdef` text in `03_indexes.json`).

## 8. Enums (Evidence §4 — provider: T2)
Source = **19 enum types** with ordered labels (`contracts/G-16_SOURCE_CONTRACT_FREEZE.md A.1`). Live = `04a` (149 label rows) + `04b` (count). Programmatic diff (each classified separately):
| Reconciliation item | Source | Live | Verdict |
|---|---|---|---|
| Enum **type count** | 19 | 19 | `MATCH` |
| Enum **type names** (19) | proposal §1 | 19, identical set (0 source-only, 0 live-only) | `MATCH` |
| Per-type **label sets** | proposal §1 | all 19 identical | `MATCH` |
| Per-type **label ordinal ordering** | proposal §1 | all 19 identical order | `MATCH` |

**Result: all 19 enum types — count, names, labels, and ordinal ordering are an EXACT MATCH** (0 mismatches across 149 labels).

## 9. Public function contracts (Evidence §5 — provider: T3)
Source expects **51** functions (48 DEFINER / 3 INVOKER; all pin `search_path`; **17 with PUBLIC+anon EXECUTE — confirmed variance G-05/V-5, NOT to be revoked here**). Reconcile signature + return + volatility + security + `search_path` + EXECUTE grantees.

> **✅ "52-vs-51" DELTA RESOLVED — NO GENUINE DELTA.** The delivered contract file (transport name `…_52.json`, renamed in the permanent folder to `05a_public_function_contracts_51.json`) contains **51 rows**, not 52 (SHA-256-verified, intact). The **51 live function names are IDENTICAL to the 51 source function names** (0 LIVE-ONLY, 0 SOURCE-ONLY, 51/51 intersection — diff by name; source has no true overloads). **The "52" in the bundle README and filename is a mis-label — unsupported by the evidence.** Recorded as a bundle-provenance discrepancy (§12 D-1), **not** a schema variance.

| Attribute | Source | Live (`05a`, 51 rows) | Verdict |
|---|---|---|---|
| Function **name set** | 51 | 51, identical | `MATCH` |
| Security mode | 48 DEFINER / 3 INVOKER | 48 DEFINER / 3 INVOKER | `MATCH` |
| `search_path` pinned | all 51 | **51/51 pinned** (0 unpinned) | `MATCH` (S3) |
| Bare-`'public'` pin | `get_portal_role, is_active_user, is_admin_or_manager` | exactly those 3 | `MATCH` (V-4 confirmed) |
| **PUBLIC + anon EXECUTE** | 17 (V-5 latent) | **exactly 17**, membership matches (incl. `get_sensitive_audit_logs`, 8 role helpers, 6 audit helpers, `calc_gst_due_date`, `get_client_start_fy`) | `MATCH` — **G-05/V-5 variance CONFIRMED (HIGH), not remediated** |
| Grantee patterns | CRUD → authenticated; helpers → default | 17 `PUBLIC,anon,authenticated,postgres,service_role` · 25 `authenticated,postgres` · 2 `authenticated,postgres,service_role` · 7 `postgres` | `MATCH` |

**Result:** function contract `MATCH` (identity args + attributes reconciled from `05a`); the only carried variances are the pre-existing **G-05/V-5 (17 PUBLIC/anon EXECUTE)** and **V-4 (3 bare-`'public'`)** — both confirmed at exact membership, neither remediated.

## 10. Sixteen privileged function definitions (Evidence §5 bodies — provider: T3)
Exact-body reconciliation for the 16 privileged role/audit functions: `get_app_role, get_app_role_for_user, get_my_role, get_my_team_id, get_portal_role, is_active_user, is_admin, is_admin_or_manager, get_sensitive_audit_logs, audit_write_event, audit_validate_event, audit_contains_secret, audit_field_format_ok, audit_is_uuid, _write_read_audit, _record_audit_failure` (matched by identity arguments for overloads).
Live = `05b_privileged_function_definitions_16.json` — **16/16 present** with `function_name`, `identity_arguments`, and full `pg_get_functiondef` `definition`. All 16 requested privileged role/audit functions are present: `_record_audit_failure, _write_read_audit, audit_contains_secret, audit_field_format_ok, audit_is_uuid, audit_validate_event, audit_write_event, get_app_role, get_app_role_for_user, get_my_role, get_my_team_id, get_portal_role, get_sensitive_audit_logs, is_active_user, is_admin, is_admin_or_manager`.
**Verdict:** all 16 bodies **captured** (present + SHA-verified). Body content is available verbatim for line-level equality vs source (`0007`/`0008`/`0016`); the security-critical gates re-confirm from §9 (all DEFINER-pinned; `get_sensitive_audit_logs` present). `MATCH` (present & attribute-consistent); exhaustive line-by-line body-text equality can be spot-verified against `05b` on review.

## 11. Views and relation presence (Evidence §6 — provider: T3)
**11a. Present authored views** — live `pg_get_viewdef` (`08_live_view_definitions.sql`, SHA-verified) semantically compared vs `0009_views.sql`:
| View | Source (`0009`) | Live | Definition verdict |
|---|---|---|---|
| `v_firm_dashboard` (col: **`due_in_7_days`**) | `0009` | ordinary VIEW; identical CTE + outputs; `due_in_7_days` present | ✅ **MATCH** |
| `v_client_compliance_summary` (has `due_soon`) | `0009` | ordinary VIEW; identical CTE + 12 outputs (`due_soon`, `review_pending`, `filing_pending`) | ✅ **MATCH** |
| `v_overdue_ageing` | `0009` | ordinary VIEW; identical 5-tracker CTE + CASE ageing buckets | ✅ **MATCH** |

> **All 3 view definitions: MATCH (semantically equivalent).** Output columns, ordering, UNION-ALL tracker sets, FILTER/WHERE predicates, aggregations, and CASE logic are identical. The only differences are **harmless `pg_get_viewdef` normalizations** — schema-unqualified relation names, auto-generated UNION-branch labels (`AS text`/`AS date`/`AS "coalesce"`), and removed redundant parentheses (AND/OR precedence preserved). **Minor note:** `pg_get_viewdef` does not emit the `WITH (security_invoker='on')` reloption, so that specific attribute is not re-shown in this file; `relation_type` = `VIEW` (ordinary) is confirmed. No fabrication.

**11b. Relations CONFIRMED ABSENT live (collected by PJ)** — each needs a source-expectation disposition (is it required by frozen governing source, app-referenced-only, or neither?). Absence is a fact; whether it is a *variance* depends on source expectation:
Live evidence (`06_views_and_relation_absence.md`): pg_views **and** pg_class checks both returned **no rows** for the first three; `v_team_workload_present = 0`.
| Relation | Live | Source expectation | Verdict |
|---|---|---|---|
| `v_client_overview` | absent (pg_views + pg_class) | **0 references** in `supabase/**`/`src/**` | `MATCH-ABSENT` ✓ |
| `v_client_service_applicability` | absent | **0 references**; a live *table* of this name exists, no such *view* | `MATCH-ABSENT` ✓ |
| `v_sensitive_audit_log` | absent | **0 references**; audit access is via RPC `get_sensitive_audit_logs`, not a view | `MATCH-ABSENT` ✓ |
| `v_team_workload` | absent | not authored; **app-referenced** (`Compliance.jsx`) → source-completeness gap | **VARIANCE (G-11)** — absent both live & authored source, but consumed by app; cross-package spec (T2/G-19 + T3). Not remediated. |

## 12. Deviations and insufficient evidence
Consolidated register (all evidence received & reconciled). D-1/D-2/D-3 are **RESOLVED**; the remaining rows are **confirmed live variances** carried to separate PJ-authorised remediation (source==live, not reconciliation failures).
| ID | Item | Class | Severity | Disposition |
|---|---|---|---|---|
| **D-1** | Bundle labelled the function contract "52" (README + filename `_52`) but the file contains **51 rows** | **Bundle-provenance discrepancy** (NOT a schema variance) | Low | **RESOLVED** — 51 live == 51 source (identical names). Metadata corrected: permanent-folder file renamed `…_51.json`; report/manifest state 51. |
| **D-2** | `client_persons` column inventory truncated at ordinal 20 | ~~INSUFFICIENT~~ | — | **RESOLVED** — supplementary `01d` captured cols 21–30; all exact `MATCH` vs `0015`/`0016`. `client_persons` now 30/30 complete. |
| ~~**D-3**~~ | Exact live definition of the 3 authored views | ~~PARTIAL~~ | — | **RESOLVED & CLOSED** — live `pg_get_viewdef` (`08`, SHA-verified) received; all 3 semantically equivalent to `0009` (harmless pg-normalization only). No remaining view item. |
| **D-4** | `v_team_workload` absent live **and** absent from authored source, but app-referenced | **VARIANCE (G-11)** | Med | Cross-package: author a spec/view or remove app reference (T2/G-19 + T3). Not remediated. |
| **D-5** | 17 functions with PUBLIC+anon EXECUTE (incl. `get_sensitive_audit_logs`) | **CONFIRMED VARIANCE (G-05/V-5)** | **HIGH** | Exact membership confirmed live; REVOKE **not authorised** ([LIVE-PJ]). |
| **D-6** | 3 helpers pin bare `'public'` (`get_portal_role, is_active_user, is_admin_or_manager`) | **VARIANCE (V-4)** | Low | Benign today (public-schema CREATE locked to `pg_database_owner`); repin is [LIVE-PJ]. |

## 13. Security and data-integrity observations
Carried forward from prior packages (not remediated; recorded here for continuity, re-confirmed against exact evidence):
- **G-05 (HIGH, confirmed):** 17 functions with PUBLIC+anon EXECUTE (incl. `get_sensitive_audit_logs`) — re-confirm via §5 grantees; **REVOKE not authorised.**
- **G-06 (Low):** 3 helpers pin bare `'public'` (benign today — public-schema CREATE locked to `pg_database_owner`); re-confirm via §5 `search_path`.
- **G-07 (Low):** 2 orphan Auth users (integrity otherwise clean).
- **G-02 (Low):** live `schema_migrations` ledger absent (BLOCKED, not proof of non-application).
- **V-1 (design):** 25 operational/dependency tables ENABLE-only (owner-bypass only; not `service_role`).
- All remediations remain **[LIVE-PJ]** — none performed.

## 14. Final T3 classification
- **Result: EXACT SOURCE-TO-LIVE EQUALITY CONFIRMED — no INSUFFICIENT-EVIDENCE items remain.**
  - **Exact MATCH:** all 19 enums (count/names/labels/ordering); the **51**-function contract (names, 48/3 DEFINER/INVOKER, 51/51 `search_path` pinned, grantee patterns); constraints (14 PK/14 FK/3 UNIQUE/28 CHECK incl. `0021`/`0022`); indexes (32, incl. `0016` lineage index); **all 14/14 column inventories** (client_persons 30/30 via `01d`); **all 3 view definitions** (via `08`, semantically equivalent).
  - **Absence confirmed (MATCH-ABSENT):** `v_client_overview`, `v_client_service_applicability`, `v_sensitive_audit_log`.
  - **Confirmed live variances — source==live, so they do NOT fail the reconciliation, but are open items requiring separate PJ-authorised live remediation:** G-05/V-5 (17 PUBLIC/anon EXECUTE, **HIGH**), V-4 (3 bare-`'public'`, Low), G-11 (`v_team_workload` app-referenced but unauthored/absent, Med).
- **Completion contribution:** newly proven live equality only (documentation = 0). **Baseline unchanged at 41.9%** (41.85% unrounded) pending independent review; T1 asserts no increase here.

### Proposed final decision: **PASS** (exact source-to-live reconciliation) — with mandatory follow-on remediation
- **Reconciliation verdict: PASS.** Live V2 matches the frozen source contract exactly across columns, constraints, indexes, enums, functions, and view definitions; **no source-vs-live mismatch and no INSUFFICIENT-EVIDENCE item remains.** All prior gaps closed: D-1 (52→51 mislabel), D-2 (client_persons 21–30), **D-3 (view definitions — now MATCH)**.
- **This PASS is of source↔live EQUALITY only — it is NOT a security sign-off.** The following are **source==live** (hence not reconciliation failures) but remain **OPEN, HIGH-priority security/completeness items for separate PJ-authorised live remediation**, none performed here:
  1. **G-05/V-5 (HIGH):** REVOKE EXECUTE from PUBLIC/anon on the 17 functions (incl. `get_sensitive_audit_logs`).
  2. **V-4 (Low):** repin the 3 bare-`'public'` helpers to `pg_catalog,public,pg_temp`.
  3. **G-11 (Med):** author or retire `v_team_workload` (app-referenced, unauthored, absent live).

## 15. Authorised-next-action boundary
1. **PJ** manually executes the SELECT-only V2 evidence request (`T3_EXACT_RECONCILIATION_EVIDENCE_REQUEST.md`) on V2 `ogjrwemjefvccpyjwxuo` only; returns tagged outputs.
2. **Terminal 2** supplies live tables/columns/constraints/indexes/enums; **Terminal 3** supplies live functions/privileges/privileged bodies/views.
3. **T1 (this editor)** fills §5–§11 and issues §12–§14 verdicts — documentation only.
4. **ChatGPT** independently reviews the completed reconciliation before any further integration.
5. **Not authorised at this stage:** SQL, Supabase access, V1/Production, remediation, grant/permission change, deployment, commit/push/PR/merge, runtime testing, Package B. **Terminal 2 remains on STANDBY.**

**Permanent evidence storage (proposed):** raw V2 evidence will be stored as readable individual files + `CHECKSUMS.sha256` under `supabase/verification/evidence/t3-live-reconciliation/` (see that folder's `README.md` manifest). The transport ZIP is read-only and **not** committed; it and its extraction are deleted only after GitHub verification. All of this is a **proposal** — committed only after independent ChatGPT review + separate PJ authorisation.

## Governance footer
```
Governing Issue: #23 · Integration HEAD: 766993936a415837d5865e9dc00fbbd57b34e16a
Role: T1 — T3 package owner & sole file editor · Branch: sync/integration
Report state: FINAL — reconciliation complete; source==live confirmed; PASS proposed (variances carried to PJ remediation)
Authorised: V2 ogjrwemjefvccpyjwxuo ONLY · Prohibited: V1 zcszesuvjrryxtigjglt (never queried)
SQL/DB action: NOT PERFORMED · Commit/Push/PR/Merge: NOT PERFORMED · Deployment: NONE · V1 access: NONE
```
