# YAV2 Portal V2 — Module 1 — P5 — PG-1 (Migration 0022) — Execution Evidence

**STATUS: EXECUTED / CLOSED PASS (2026-07-21).**
Migration 0022 (PG-1) was executed once, successfully, by PJ on V2/yav2-dev in the SQL Editor. All
pre-execution (14/14) and post-execution (15/15) read-only checks PASSED; the post baseline matched the
pre baseline exactly; the applicability table remained empty; the transactional functional tests
completed (ending in ROLLBACK). This document records that evidence.

- **Migration:** `supabase/migrations/0022_p5_pg1_other_notes_enforcement.sql` (PG-1).
- **Target:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` **only**. V1/Production `zcszesuvjrryxtigjglt` untouched.
- **Executor:** PJ (manual, V2 SQL Editor). Claude authored + recorded evidence only; ran **no** SQL and
  made **no** database connection during authoring, execution, or this closure.
- **Governing commit:** `6a96b3d5bd7203daf2c421169ca0261a8435b505` (branch `ui/redesign-v1`).
- **Independent review:** ChatGPT — **PASS FOR COMMIT** (Rev 2 package).

## A. Pre-execution (read-only) — 14/14 PASS
Ran `supabase/verification/M1B_P5_PG1_pre_execution_verification_readonly.sql`.

| Check | Expected | Actual | Pass |
|---|---|---|---|
| `p0_0021_tables_exist` | true | true | ✅ |
| `p1_rpc_create_sig` / `p1_rpc_update_sig` / `p1_rpc_status_sig` | true | true | ✅ |
| `p1_rpc_no_overloads` (rpc_count = 3) | true | true | ✅ |
| `p2_pg1_constraint_absent` | true | true | ✅ |
| `p3_catalogue_other_active` | true | true | ✅ |
| `p4_no_unexpected_writer` (unexpected = none) | true | true | ✅ |
| `p5_rls_applicability_forced` / `p5_rls_catalogue_forced` | true | true | ✅ |
| `p6_grants_applicability_select_only` | true | true | ✅ |
| `p6_grants_catalogue_select_only` | true | true | ✅ |
| `p6_rpc_execute_posture` (authenticated yes; anon/service_role/PUBLIC no — both RPCs) | pass=true | pass=true | ✅ |
| **`AUTHORISATION_applicability_zero`** (applicability_rows = 0) | **true** | true | ✅ |

**Total: 14/14 PASS.**

**PG1_PRE_BASELINE (recorded):**

| Column | Value |
|---|---|
| applicability_rows | 0 |
| catalogue_rows | 11 |
| clients_rows | 13 |
| clients_services_elems | 3 |
| registrations_rows | 0 |
| audit_log_rows | 22 |
| audit_contract_rows | 24 |
| accounting_tracker | 312 |
| financials_tracker | 120 |
| income_tax_tracker | 26 |
| compliance_calendar | 0 |

## B. Execution
- Applied `0022_p5_pg1_other_notes_enforcement.sql` **once** (single transaction) — **COMMIT; no error.**
- SECTION H `RAISE NOTICE` observed: *"P5 Migration 0022 (PG-1) postconditions passed (constraint +
  guarded RPCs; no data, no compliance, posture unchanged)."*
- **Rerun attempt blocked:** a second execution was **stopped by the migration's fail-closed rerun guard**
  because `csa_other_notes_required_chk` already existed (SECTION 0: *"STOP: csa_other_notes_required_chk
  already exists (PG-1 not additive / rerun disallowed)"*). The migration is confirmed **not rerunnable**.

## C. Post-execution (read-only) — 15/15 PASS
Ran `supabase/verification/M1B_P5_PG1_post_execution_verification_readonly.sql`.

| Check | Expected | Actual | Pass |
|---|---|---|---|
| `v1_pg1_constraint_present` (+ definition; always one row) | pass=true | `CHECK (service_code <> 'OTHER' OR (notes IS NOT NULL AND btrim(notes) <> ''))`; pass=true | ✅ |
| `v2_rpc_create_sig` / `v2_rpc_update_sig` / `v2_rpc_status_sig` | true | true | ✅ |
| `v2_rpc_no_overloads` (= 3) | true | true | ✅ |
| `v3_create_has_guard` | true | true | ✅ |
| `v3_update_has_guard` | true | true | ✅ |
| `v3_set_status_unchanged_no_guard` | true | true | ✅ |
| `v4_rpc_execute_posture` (authenticated yes; anon/service_role/PUBLIC no — both RPCs) | pass=true | pass=true | ✅ |
| `v4_grants_applicability_select_only` / `v4_grants_catalogue_select_only` | true | true | ✅ |
| `v5_rls_applicability_forced` / `v5_rls_catalogue_forced` | true | true | ✅ |
| `v6_audit_events_present` (= 4) | true | true | ✅ |
| `v7_applicability_empty` (= 0) | true | true | ✅ |

**Total: 15/15 PASS.** Constraint present with the intended definition; create + update guards present;
`set_status` unchanged; RLS enabled + forced; `authenticated` retains EXECUTE while `anon`,
`service_role` and PUBLIC are denied; applicability table remained empty.

**PG1_POST_BASELINE vs PG1_PRE_BASELINE — matched exactly (every Δ = 0):**

| Column | Pre | Post | Δ | Note |
|---|---|---|---|---|
| applicability_rows | 0 | 0 | 0 | remained empty |
| catalogue_rows | 11 | 11 | 0 | unchanged |
| clients_rows | 13 | 13 | 0 | unchanged |
| clients_services_elems | 3 | 3 | 0 | unchanged |
| registrations_rows | 0 | 0 | 0 | unchanged |
| audit_log_rows | 22 | 22 | 0 | unchanged (RPCs replaced, not called) |
| audit_contract_rows | 24 | 24 | 0 | unchanged (no event seeded) |
| accounting_tracker | 312 | 312 | 0 | unchanged |
| financials_tracker | 120 | 120 | 0 | unchanged |
| income_tax_tracker | 26 | 26 | 0 | unchanged |
| compliance_calendar | 0 | 0 | 0 | unchanged |

## D. Transactional functional tests (ended in ROLLBACK) — PASS
Ran `supabase/verification/M1B_P5_PG1_transactional_functional_tests.sql`.

| Test | Expected | Result |
|---|---|---|
| STRUCT / PREREQ | PASS | ✅ PASS |
| T1 create OTHER + NULL | `OTHER_NOTES_REQUIRED` | ✅ |
| T2 create OTHER + empty | `OTHER_NOTES_REQUIRED` | ✅ |
| T3 create OTHER + whitespace | `OTHER_NOTES_REQUIRED` | ✅ |
| T4 create OTHER + meaningful | success, trimmed | ✅ |
| T5 create GST + NULL notes | success | ✅ |
| T6 update OTHER clearing notes | `OTHER_NOTES_REQUIRED` | ✅ |
| T7 update OTHER whitespace | `OTHER_NOTES_REQUIRED` | ✅ |
| T8 update OTHER meaningful | success, trimmed | ✅ |
| T9 update non-OTHER + NULL notes | success | ✅ |
| T10 direct owner OTHER + NULL insert (all mandatory columns supplied) | `csa_other_notes_required_chk` violation (deterministic) | ✅ |
| T11 approve valid OTHER Draft | success (set_status unaffected) | ✅ |
| T12 rerun duplicate constraint | rejected | ✅ |
| post_rollback_applicability_rows | 0 | ✅ applicability_rows = 0, pass = true |

All fixture rows and audit rows created by the tests were reverted by ROLLBACK; the final post-rollback
check confirmed `applicability_rows = 0, pass = true`.

## E. Disposition
- **Result: EXECUTED / CLOSED PASS.** ChatGPT independent review: **PASS FOR COMMIT**.
- **Migration 0022 must NOT be rerun** — confirmed not rerunnable (SECTION 0 rerun guard fired on the
  second attempt).
- **Rollback remains UNAUTHORISED** and was **not executed**;
  `supabase/verification/rollback_0022_p5_pg1_other_notes_manual.sql` stays separate/manual and requires
  a distinct PJ + ChatGPT approval before any use.
- **CP-5 is now UNBLOCKED for separate authorisation.** **CP-5 has NOT started** (nor CP-6 or P6).
- **V1/Production untouched.** No SQL was executed and no Supabase connection was made during this
  documentation closure step.
