# YAV2 Portal V2 — Module 1 — P5 — PG-1 Implementation Plan

**PG-1 = prerequisite backend gate before CP-5.** Authoritative enforcement that a
`client_service_applicability` row whose `service_code = 'OTHER'` must carry meaningful
(non-blank) notes.

- **Status:** **AUTHORED / NOT EXECUTED / AWAITING REVIEW** (2026-07-21).
- **Repository / branch:** `D:\Claude\Claude Code\Yes-Advizors-Portal` · `ui/redesign-v1` @ `1c1c808267560f0fc73c07212d801bd47344531d`.
- **Migration number:** **0022** (PG-1). The tentative **P6** compliance-generation migration
  number shifts to **0023** (documentation only; see the register numbering table).
- **Target:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` **only**. V1/Production `zcszesuvjrryxtigjglt`
  prohibited. Claude authors and collects evidence only; **PJ is the sole manual executor**.
- **Governance:** no live SQL executed, no Supabase MCP connection, no database mutation, no migration
  execution, no frontend/source change, no CP-5/CP-6/P6 work, no commit/push by this authoring step.

## 1. Objective & authority model
Enforce, authoritatively (not UI-only), that `OTHER` service applicability rows have non-blank notes,
using **two layers**:
1. **Table CHECK** `csa_other_notes_required_chk` — `service_code <> 'OTHER' OR (notes IS NOT NULL AND
   btrim(notes) <> '')`. Bypass-proof authority; validates even the SECURITY DEFINER owner write path.
   Valid as a **single-row same-table** CHECK because `service_code` is stored directly on the row
   (`0021` line 149, text FK to `service_catalogue(code)`) — no cross-table reference, no trigger.
2. **RPC guards** in `service_applicability_create` and `service_applicability_update` raising the
   controlled code **`OTHER_NOTES_REQUIRED`**, so callers receive the mapped, user-facing message
   (already present in `src/lib/serviceApplicabilityErrors.js:44`) instead of a raw CHECK-violation string.

The update guard reads the **stored** `service_code` of the existing row (not the caller payload), and
`service_code` is immutable via the update RPC — so a non-`OTHER` → `OTHER` transition is impossible and
the "clear notes on an existing `OTHER` row" path is closed.

## 2. Package (all DRAFT / NOT EXECUTED)
| # | File | Purpose |
|---|---|---|
| 1 | `supabase/migrations/0022_p5_pg1_other_notes_enforcement.sql` | Forward migration (constraint + 2 replaced RPCs) |
| 2 | `supabase/verification/rollback_0022_p5_pg1_other_notes_manual.sql` | Manual, conditional, unauthorised-by-default rollback |
| 3 | `supabase/verification/M1B_P5_PG1_pre_execution_verification_readonly.sql` | Read-only pre-exec checks + baseline capture |
| 4 | `supabase/verification/M1B_P5_PG1_post_execution_verification_readonly.sql` | Read-only post-exec checks + paired baseline |
| 5 | `supabase/verification/M1B_P5_PG1_transactional_functional_tests.sql` | Rollback-only functional tests |
| 6 | `docs/M1B_P5_PG1_Implementation_Plan.md` | This plan |
| 7 | `docs/M1B_P5_PG1_Execution_Evidence.md` | Execution-evidence template (PJ fills at execution) |
| — | `docs/YAV2_Master_Completion_Register.md`, `docs/M1B_P5_UI_Discovery_Design_And_Implementation_Plan.md` | Minimum status updates |

## 3. Migration structure (0022)
- **Single transaction** `BEGIN … COMMIT`.
- **SECTION 0 — fail-closed preconditions:** 0021 tables present; helper functions present; the three
  0021 RPCs present at exact signatures, exactly 3 (no unexpected overloads); PG-1 constraint **absent**
  (not rerunnable); catalogue has active `OTHER`; **applicability table empty (0 rows)** — the only
  zero-row authorisation gate; **no unexpected applicability writer** (only the 3 RPCs reference the
  table); RLS forced + grant posture match the recorded 0021 posture. Captures a **live baseline** temp
  table (no hard-coded counts).
- **SECTION A:** `ALTER TABLE … ADD CONSTRAINT csa_other_notes_required_chk CHECK (…)` (empty table →
  instant validation).
- **SECTION B / C:** `CREATE OR REPLACE FUNCTION` for create + update — bodies **byte-faithful** to 0021
  plus one guard block each; signatures, return types, `SECURITY DEFINER`, `search_path`, audit calls,
  optimistic locking and notes normalisation unchanged. No `GRANT`/`REVOKE` issued (privileges preserved
  by `CREATE OR REPLACE`).
- **SECTION H — fail-closed postconditions:** constraint present with expected definition; exactly 3
  RPCs at exact signatures; EXECUTE posture unchanged (authenticated yes, anon no); applicability still
  0; clients / clients.services element count / registrations unchanged; catalogue and audit_event_contract
  unchanged; trackers/calendar and audit_log unchanged; RLS forced + grant posture unchanged (all vs the
  captured baseline). Then `COMMIT`.
- **Not rerunnable:** SECTION 0 stops if the constraint already exists.

## 4. Exact RPC changes
Guard inserted into **create** (after catalogue validation, using the resolved `v_code`) and **update**
(after the row fetch and status checks, using the stored `v_code`):
```sql
IF v_code = 'OTHER' AND nullif(btrim(p_notes),'') IS NULL THEN
  RAISE EXCEPTION 'OTHER_NOTES_REQUIRED'; END IF;
```
`service_applicability_set_status` is **not modified**.

## 5. Constraint definition
```sql
CONSTRAINT csa_other_notes_required_chk
  CHECK (service_code <> 'OTHER' OR (notes IS NOT NULL AND btrim(notes) <> ''))
```

## 6. Pre / post verification logic
- **Pre (read-only):** each check returns a `pass` boolean; the authorisation gate
  `AUTHORISATION_applicability_zero.pass` MUST be true; `PG1_PRE_BASELINE` returns current protected
  counts for PJ to **record** (not hard-coded). No temp tables, no writes.
- **Post (read-only):** constraint present with expected definition; create/update contain the guard,
  set_status does not; RPC signatures/EXECUTE posture, RLS, grants and the 4 audit events unchanged;
  applicability still 0; `PG1_POST_BASELINE` for **paired comparison** vs `PG1_PRE_BASELINE`.
  - **Constraint check (V1) always returns exactly one row** — scalar subqueries with no `FROM`; a
    missing constraint yields `definition = NULL` and `pass = false` (never zero output rows).
  - **RPC EXECUTE posture (pre `p6_rpc_execute_posture`, post `v4_rpc_execute_posture`) is complete for
    BOTH replaced RPCs:** `authenticated` HAS EXECUTE; `anon`, `service_role` and `PUBLIC` do NOT
    (named roles via `has_function_privilege`; PUBLIC via `pg_proc.proacl`/`aclexplode`, treating a NULL
    `proacl` as the function default that would grant EXECUTE to PUBLIC). The migration's SECTION H
    proves the same posture is preserved after `CREATE OR REPLACE`. No `GRANT`/`REVOKE` is issued.

## 7. Transactional-test fixture & identity strategy
Single transaction ending in **ROLLBACK**. Prerequisites are asserted, not assumed:
- **Actor:** an existing active Admin/Manager `team` row with non-null `auth_user_id`; its `auth_user_id`
  is injected as the transaction-local JWT `sub` and `SET LOCAL ROLE authenticated` is used for RPC calls
  (RPCs are SECURITY DEFINER; role helpers resolve `team.auth_user_id = auth.uid()`).
- **Fixture transport (no temp-table privilege dependency):** the actor UUID and two client UUIDs are
  stored in **transaction-local config values** via `set_config('pg1.*', …, is_local => true)` and read
  back with `current_setting()` after `SET LOCAL ROLE authenticated`. This avoids relying on `authenticated`
  having SELECT/USAGE on a temp object, and the values revert at transaction end — **no object and no
  grant survive `ROLLBACK`**.
- **Clients:** two existing `public.clients` (A for the main flow; B for the isolated CHECK backstop).
- **Catalogue:** `OTHER`, `GST`, `TDS` (all `requires_registration = false` → no registration/owner
  fixtures; `owner_team_id` and `linked_registration_id` are NULL throughout).
- **Live-uniqueness handling:** at most one live row per `(client, service)`; the OTHER slot on client A
  is freed (deactivate) between the create-success test and the update tests; distinct service codes and
  the second client avoid collisions.
- **Rollback safety:** every fixture row and every `audit_write_event` row is created inside the
  transaction and reverted by `ROLLBACK`; a post-rollback read-only SELECT confirms 0 applicability rows.

Coverage: structural constraint verification; controlled RPC error tests (T1–T3, T6–T7); successful RPC
cases (T4, T5, T8, T9); set_status compatibility (deactivate in T4; approve in T11); owner-level CHECK
backstop (T10 — the privileged direct INSERT supplies **every** mandatory column with a valid value, so
the ONLY constraint that can fail is `csa_other_notes_required_chk`, making the expected `check_violation`
deterministic); rerun/fail-closed guard (T12).

## 8. Rollback guards (manual, unauthorised by default)
Separate, outside `supabase/migrations/`, requires **separate PJ + ChatGPT approval**. It reports total
and `OTHER` row counts; **fails only if any `OTHER` row has blank notes** (not a blanket "any row"
abort); restores the exact pre-PG-1 create/update bodies; drops only `csa_other_notes_required_chk`;
makes no data change; and warns explicitly that it **weakens authoritative enforcement**.

## 9. Migration-number documentation correction
0022 = PG-1 (this package). The tentative **P6** controlled-compliance-generation migration moves from
0022 to **0023** in the register numbering table and dependency notes. Documentation only — no code.

## 10. Acceptance criteria
`OTHER` + null/empty/whitespace notes rejected (`OTHER_NOTES_REQUIRED`) on **create and update**; `OTHER`
+ meaningful notes accepted (trimmed); non-`OTHER` unaffected; table CHECK present; **0** applicability
rows created/changed; no client-row/`clients.services`/registration change; no compliance/tracker/calendar
generation; RLS/grants/audit-contract/set_status unchanged; V1/Production untouched; rollback separate and
not auto-run; migration not rerunnable.

## 11. Risks / open items
- **R-PG1-1:** table CHECK hard-codes literal `'OTHER'` — acceptable (stable seeded PK code); a future
  catalogue rename would require a paired migration.
- **R-PG1-2:** functional tests depend on an authenticated-context simulation and ≥2 existing clients +
  an Admin/Manager with `auth_user_id`; the script asserts these and fails clearly if absent.
- **R-PG1-3:** the owner-level backstop (T10) assumes the executing role bypasses RLS (owner/postgres);
  documented in the test header.
- No unresolved blocking issues.

## 12. Execution sequence (PJ, on V2 — NOT performed here)
1. Run the **pre-execution** read-only script; confirm every `pass=true` and record `PG1_PRE_BASELINE`.
2. Apply **0022** once (single transaction) in the V2 SQL Editor.
3. Run the **post-execution** read-only script; confirm every `pass=true` and `PG1_POST_BASELINE` matches
   `PG1_PRE_BASELINE` (applicability still 0).
4. Optionally run the **transactional functional tests** (ends in ROLLBACK).
5. Record results in `docs/M1B_P5_PG1_Execution_Evidence.md`; independent (ChatGPT) review; then CLOSE.
6. **CP-5 remains blocked** until PG-1 is reviewed, executed by PJ on V2, and CLOSED PASS.
