# YAV2 Portal V2 — Module 1 — P5 — PG-1 (Migration 0022) — Execution Evidence

**STATUS: AUTHORED / NOT EXECUTED / AWAITING REVIEW (2026-07-21).**
This is an **evidence template**. It is populated by PJ **after** manual execution on V2/yav2-dev. No
live database action has occurred. Do **not** mark PG-1 PASS or executed until this template is completed
from a real V2 run and independently reviewed.

- **Migration:** `supabase/migrations/0022_p5_pg1_other_notes_enforcement.sql` (PG-1).
- **Target:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` **only**. V1/Production `zcszesuvjrryxtigjglt` prohibited.
- **Executor:** PJ (manual, V2 SQL Editor). Claude authored only; ran no SQL and made no DB connection.
- **Branch / HEAD at authoring:** `ui/redesign-v1` @ `1c1c808267560f0fc73c07212d801bd47344531d`.

## A. Pre-execution (read-only) — to be recorded by PJ
Run `supabase/verification/M1B_P5_PG1_pre_execution_verification_readonly.sql`.

| Check | Expected | Actual | Pass |
|---|---|---|---|
| `p0_0021_tables_exist` | true | _tbd_ | _tbd_ |
| `p1_rpc_create_sig` / `p1_rpc_update_sig` / `p1_rpc_status_sig` | true | _tbd_ | _tbd_ |
| `p1_rpc_no_overloads` (rpc_count = 3) | true | _tbd_ | _tbd_ |
| `p2_pg1_constraint_absent` | true | _tbd_ | _tbd_ |
| `p3_catalogue_other_active` | true | _tbd_ | _tbd_ |
| `p4_no_unexpected_writer` (unexpected = none) | true | _tbd_ | _tbd_ |
| `p5_rls_applicability_forced` / `p5_rls_catalogue_forced` | true | _tbd_ | _tbd_ |
| `p6_grants_applicability_select_only` | true | _tbd_ | _tbd_ |
| `p6_grants_catalogue_select_only` | true | _tbd_ | _tbd_ |
| `p6_rpc_execute_posture` (authenticated yes; anon/service_role/PUBLIC no — both RPCs) | pass=true | _tbd_ | _tbd_ |
| **`AUTHORISATION_applicability_zero`** (applicability_rows = 0) | **true** | _tbd_ | _tbd_ |

**PG1_PRE_BASELINE (record all — these are the paired comparison values):**

| Column | Value |
|---|---|
| applicability_rows | _tbd (must be 0)_ |
| catalogue_rows | _tbd_ |
| clients_rows | _tbd_ |
| clients_services_elems | _tbd_ |
| registrations_rows | _tbd_ |
| audit_log_rows | _tbd_ |
| audit_contract_rows | _tbd_ |
| accounting_tracker | _tbd_ |
| financials_tracker | _tbd_ |
| income_tax_tracker | _tbd_ |
| compliance_calendar | _tbd_ |

## B. Execution — to be recorded by PJ
- Applied `0022_p5_pg1_other_notes_enforcement.sql` once (single transaction). COMMIT / error: _tbd_.
- `RAISE NOTICE` from SECTION H observed: _tbd_.

## C. Post-execution (read-only) — to be recorded by PJ
Run `supabase/verification/M1B_P5_PG1_post_execution_verification_readonly.sql`.

| Check | Expected | Actual | Pass |
|---|---|---|---|
| `v1_pg1_constraint_present` (+ definition; always exactly one row) | pass=true | _tbd_ | _tbd_ |
| `v2_rpc_*_sig` / `v2_rpc_no_overloads` | true | _tbd_ | _tbd_ |
| `v3_create_has_guard` / `v3_update_has_guard` | true | _tbd_ | _tbd_ |
| `v3_set_status_unchanged_no_guard` | true | _tbd_ | _tbd_ |
| `v4_rpc_execute_posture` (authenticated yes; anon/service_role/PUBLIC no — both RPCs) | pass=true | _tbd_ | _tbd_ |
| `v4_grants_applicability_select_only` / `v4_grants_catalogue_select_only` | true | _tbd_ | _tbd_ |
| `v5_rls_applicability_forced` / `v5_rls_catalogue_forced` | true | _tbd_ | _tbd_ |
| `v6_audit_events_present` (= 4) | true | _tbd_ | _tbd_ |
| `v7_applicability_empty` (= 0) | true | _tbd_ | _tbd_ |

**PG1_POST_BASELINE vs PG1_PRE_BASELINE (must match; applicability_rows still 0):**

| Column | Pre | Post | Δ | Note |
|---|---|---|---|---|
| applicability_rows | _tbd_ | _tbd_ | 0 | must stay 0 |
| catalogue_rows | _tbd_ | _tbd_ | 0 | unchanged |
| clients_rows | _tbd_ | _tbd_ | 0 | unchanged |
| clients_services_elems | _tbd_ | _tbd_ | 0 | unchanged |
| registrations_rows | _tbd_ | _tbd_ | 0 | unchanged |
| audit_log_rows | _tbd_ | _tbd_ | 0 | unchanged (RPCs replaced, not called) |
| audit_contract_rows | _tbd_ | _tbd_ | 0 | unchanged (no event seeded) |
| accounting_tracker | _tbd_ | _tbd_ | 0 | unchanged |
| financials_tracker | _tbd_ | _tbd_ | 0 | unchanged |
| income_tax_tracker | _tbd_ | _tbd_ | 0 | unchanged |
| compliance_calendar | _tbd_ | _tbd_ | 0 | unchanged |

## D. Transactional functional tests (optional; ends in ROLLBACK) — to be recorded by PJ
Run `supabase/verification/M1B_P5_PG1_transactional_functional_tests.sql`.

| Test | Expected | Result |
|---|---|---|
| STRUCT / PREREQ | PASS | _tbd_ |
| T1 create OTHER + NULL | `OTHER_NOTES_REQUIRED` | _tbd_ |
| T2 create OTHER + empty | `OTHER_NOTES_REQUIRED` | _tbd_ |
| T3 create OTHER + whitespace | `OTHER_NOTES_REQUIRED` | _tbd_ |
| T4 create OTHER + meaningful | success, trimmed | _tbd_ |
| T5 create GST + NULL notes | success | _tbd_ |
| T6 update OTHER clearing notes | `OTHER_NOTES_REQUIRED` | _tbd_ |
| T7 update OTHER whitespace | `OTHER_NOTES_REQUIRED` | _tbd_ |
| T8 update OTHER meaningful | success, trimmed | _tbd_ |
| T9 update non-OTHER + NULL notes | success | _tbd_ |
| T10 direct owner OTHER + NULL insert (all mandatory columns supplied) | `csa_other_notes_required_chk` violation (deterministic) | _tbd_ |
| T11 approve valid OTHER Draft | success (set_status unaffected) | _tbd_ |
| T12 rerun duplicate constraint | rejected | _tbd_ |
| post_rollback_applicability_rows | 0 | _tbd_ |

## E. Disposition
- **Result:** _tbd (PASS / HOLD / FAIL)_ — set only after a real V2 run + independent review.
- **Independent (ChatGPT) review:** _tbd_.
- **CP-5 gate:** remains **BLOCKED** until PG-1 is reviewed, executed by PJ on V2, and CLOSED PASS.
- **Rollback:** `supabase/verification/rollback_0022_p5_pg1_other_notes_manual.sql` — separate, manual,
  requires PJ + ChatGPT approval; not executed.
