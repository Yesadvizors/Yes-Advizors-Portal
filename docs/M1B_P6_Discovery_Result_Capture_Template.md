# YAV2 Portal V2 — Module 1 — P6 Discovery Result Capture Template

**For PJ:** run `supabase/verification/M1B_P6_discovery_readonly.sql` block-by-block on **V2 / yav2-dev
(`ogjrwemjefvccpyjwxuo`) only** and paste results below. **Counts / metadata only — no Aadhaar/PAN/personal
values** (the kit selects none). This is a read-only capture; nothing is written.

- **Governing HEAD:** `270da9e6c425a9bdc46276d659b7fed432ab7b53` · branch `ui/redesign-v1`
- **Run date / time (IST):** ____-__-__ __:__ IST · **Executed by:** PJ

> **MANDATORY BEFORE RUNNING B1..B20 — project-ref confirmation.**
> **SQL cannot prove the Supabase project reference** (`current_database()` returns `postgres` on both V2
> and V1/Production). PJ must read the **SQL Editor URL / dashboard** and confirm the project ref manually.
>
> ☐ **I have confirmed in the Supabase dashboard that the project ref = `ogjrwemjefvccpyjwxuo` (V2 / yav2-dev),
> and it is NOT `zcszesuvjrryxtigjglt` (V1 / Production).**  (This box MUST be ticked before B1..B20.)
> — confirmed by PJ: __________  at (IST): __________

- **B0 output (database_name / run_as / mandatory_manual_check):** __________________________

| Block | What it captures | Result (paste / summarise) | Notes / anomalies |
|---|---|---|---|
| B0 | environment attestation (manual project-ref confirm; SQL cannot prove ref) | | mandatory checkbox above ticked |
| B1 | table columns/types/defaults/nullability | **PARTIAL — Supabase UI truncated at 100 rows.** Captured accounting_tracker + audit_event_contract + audit_log + audit_tracker fully; remainder not returned. **Rerun via supplemental B1-S (per-table).** | must not be treated as complete |
| B2 | constraints (PK/UNIQUE/CHECK/FK) | | note any output UNIQUE keys |
| B3 | indexes (unique/partial) | | duplicate-prevention surfaces |
| B4 | RLS enabled/forced | | expect forced on applicability |
| B5 | RLS policies | | admin/manager gating |
| B6 | table grants (anon/auth/service_role) | **PARTIAL — Supabase UI truncated at 100 rows.** Grant list incomplete. **Rerun via supplemental B6-S(i) aggregate, B6-S(ii-a) app-facing roles (anon/authenticated/PUBLIC), B6-S(ii-b) service_role — each bounded < 100 rows.** | must not be treated as complete; material to T-08 |
| B7 | functions/RPCs (security/owner/search_path) | | legacy generators present? |
| B8 | EXECUTE privileges on those functions | | who can call legacy generators |
| B9 | triggers on P6 surfaces | | expect none auto-generating |
| B10 | applicability by status/service/frequency | | Approved candidate count |
| B10 (cont.) | Approved **aggregates only** (counts by service/frequency; incomplete-approval / missing-owner / required-registration-missing count; effective-date ranges; row_version aggregates) — **no row-level identifiers** | | eligibility inputs (counts only) |
| B11 | service_catalogue config | | requires_registration/default_frequency (D-01/D-02) |
| B12 | registration coverage + same-client integrity | | cross_client_link_violations must be 0 |
| B13 | FY coverage + current-year | | fy_current count should be 1 |
| B14 | tracker/calendar counts (BASELINE) | | expect 312/120/26/0 unchanged |
| B14b | status distribution | | |
| B15 | duplicate-risk groups | | all expect 0 |
| B16 | existing lineage columns | | expect none on outputs |
| B17 | status/frequency vocabularies | | enum values |
| B18 | assignment/owner availability (team) | | active admin/manager count |
| B19 | audit-event contracts + audit_log rows | | existing event vocabulary |
| B20 | clients.services + sample flags + name/number collisions | | 0023 free? P6 names free? |

## Captured results — 22 July 2026 IST (from the executed run; full JSON in `YAV2_P6_Readonly_Discovery_Execution_Capture_22_July_2026_IST.md`)
- **B0:** database=postgres, role=postgres; project ref NOT provable by SQL (PJ confirmed V2 in dashboard).
- **Applicability:** 2 Approved (INCOME_TAX/ANNUAL, OTHER/ANNUAL); 2 Inactive (OTHER/ANNUAL, TDS/MONTHLY); incomplete-approval 0; missing-owner 0; required-registration-missing 0; missing-effective_from 0; approved effective_to 0; approved dates 21–22 Jul 2026; row_version 2 both.
- **Catalogue:** 11 active; all requires_registration=false; all default_frequency=null.
- **Registrations:** 0 total; 0 linked; 0 cross-client violations.
- **FY:** 11 active (2020-21…2030-31); 2026-27 sole current.
- **Baseline:** accounting 312 · financials 120 · income_tax 26 · calendar 0; others 0; accounting+income_tax all Not Started.
- **Duplicates:** 0 groups (accounting / income_tax / calendar).
- **Tracker unique keys (B2):** present on all generation targets (accounting/income_tax/financials/gst/tds/roc/llp/audit/payroll + calendar).
- **Lineage:** only client_service_applicability.row_version; no output-tracker lineage.
- **Team:** total 8; active 7; active Admin/Manager 4; auth-linked 8.
- **Audit:** audit_log 33; service-applicability contracts present; NO compliance-generation contract.
- **Legacy/test:** clients 13; with services 2; is_test_client 2 (not proven same two).
- **Collisions:** P6 object names 0 rows (unused); migration 0023 free in repo.
- **Functions/security:** legacy write-capable generators + write-capable applicability RPCs exist; `authenticated` has EXECUTE on certain write-capable functions (MATERIAL); no triggers; all P6 tables RLS-enabled; FORCE RLS on audit_event_contract/audit_log/client_registrations/client_service_applicability/service_catalogue. **B6 partial.**

## Supplemental read-only reruns still required (PJ, V2 only — NOT executed by Claude)
- ☐ **B1-S** (per-table column inventory) — resolve B1 truncation. Result: __________
- ☐ **B6-S(i)** grant aggregate · **B6-S(ii-a)** app-facing roles (anon/authenticated/PUBLIC) write grants · **B6-S(ii-b)** service_role write grants — resolve B6 truncation (each < 100 rows); confirm which roles can directly write trackers. Result: __________
- ☐ **B7-S** (EXECUTE ACL on write-capable functions) — quantify the `authenticated` EXECUTE exposure (T-08). Result: __________
- These are **not** required to reach "READY FOR PJ BUSINESS DECISIONS"; they harden the security/DML picture before implementation authoring.

## Baseline confirmation (must match, else STOP and report)
- `accounting_tracker` = **312** ☑ · `financials_tracker` = **120** ☑ · `income_tax_tracker` = **26** ☑ · `compliance_calendar` = **0** ☑ (confirmed 22 Jul 2026)
- `client_service_applicability` Approved candidate count = **2**
- Tentative migration **0023** collision-free (B20) ☑ · P6 object names collision-free ☑

## Decisions unlocked by this capture
- D-01/D-02 (per-service config) informed by **B11**.
- D-05/D-06 (client/sample eligibility) informed by **B20**.
- T-08 (direct-DML hardening, technical rec) informed by **B6**.
- D-12 (due dates) still requires PJ domain input regardless of capture.

**Sign-off:** results captured truthfully, read-only, V2 only, no personal values recorded — PJ: __________ (IST timestamp: __________).
