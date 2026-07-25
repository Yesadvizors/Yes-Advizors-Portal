# T4 — 0023 Execution-Readiness Report (post live PRE-checks)

**Input:** live PRE-check results (`PRE_CHECK_RESULTS_LIVE.md`) — all stop conditions CLEAR.
**Terminal 1 executed no SQL.** This is a readiness assessment only; PJ executes.

## 1. Final 0023 readiness decision: **READY / GO** (Group A `authenticated`-revoke confirmed safe)
The blocking condition for `0023` was whether any **INVOKER**/RLS/trigger path reaches the 6 Group-A helpers. Live PRE-3a/3b/3c returned **only DEFINER callers and 0 policy/trigger rows** → the `0023` design (including the Group-A `authenticated` + `service_role` revoke) is validated against live state. **No design change required.** `0023` may proceed under separate PJ execution authorisation.

## 2. Exact SQL proposed for execution
Run the committed file **`supabase/verification/remediation-t4/0023_grants_hardening.PROPOSED.sql`** verbatim (single `BEGIN; … COMMIT;`). Its statements:
- **Group A (6)** — `REVOKE ALL … FROM PUBLIC, anon, authenticated, service_role`: `_record_audit_failure`, `_write_read_audit`, `audit_contains_secret`, `audit_field_format_ok`, `audit_is_uuid`, `audit_validate_event`.
- **Group B (11)** — `REVOKE EXECUTE … FROM PUBLIC, anon, service_role` then `GRANT EXECUTE … TO authenticated` (idempotent re-assert): the 8 role helpers + `calc_gst_due_date`, `get_client_start_fy`, `get_sensitive_audit_logs`.
No other statements. Owner (`postgres`) privileges are untouched by design.

## 3. Exact post-0023 expected grants — all 17
| # | Function | Group | Expected EXECUTE grantees after 0023 |
|---|---|---|---|
| 1 | `_record_audit_failure` | A | **postgres** (owner only) |
| 2 | `_write_read_audit` | A | **postgres** |
| 3 | `audit_contains_secret` | A | **postgres** |
| 4 | `audit_field_format_ok` | A | **postgres** |
| 5 | `audit_is_uuid` | A | **postgres** |
| 6 | `audit_validate_event` | A | **postgres** |
| 7 | `get_app_role` | B | **authenticated, postgres** |
| 8 | `get_app_role_for_user` | B | **authenticated, postgres** |
| 9 | `get_my_role` | B | **authenticated, postgres** |
| 10 | `get_my_team_id` | B | **authenticated, postgres** |
| 11 | `get_portal_role` | B | **authenticated, postgres** |
| 12 | `is_active_user` | B | **authenticated, postgres** |
| 13 | `is_admin` | B | **authenticated, postgres** |
| 14 | `is_admin_or_manager` | B | **authenticated, postgres** |
| 15 | `calc_gst_due_date` | B | **authenticated, postgres** |
| 16 | `get_client_start_fy` | B | **authenticated, postgres** |
| 17 | `get_sensitive_audit_logs` | B | **authenticated, postgres** |
End-state: **no PUBLIC / anon / service_role EXECUTE on any of the 17**; Group A = owner-only (definer-chain); Group B retains `authenticated`.

## 4. get_sensitive_audit_logs retains authenticated — CONFIRMED
Row 17: post-0023 grantees = **`authenticated, postgres`** → the `AuditLog.jsx` call (as `authenticated`) continues to work; the in-body `auth.uid()`+`get_app_role()='admin'` gate still governs access.

## 5. No required caller loses access — CONFIRMED
- **App:** only `get_sensitive_audit_logs` touches the 17 → keeps `authenticated`. ✓ (`generate_client_compliance`, `activate_accounting_service` are not in the 17.)
- **RLS / role resolution:** role helpers keep `authenticated`. ✓ (PRE-3b: 0 policy rows.)
- **Compliance generation:** `calc_gst_due_date`, `get_client_start_fy` keep `authenticated` (called inside INVOKER `generate_client_compliance`). ✓
- **Group-A helpers:** reached only by DEFINER callers (`audit_write_event` postgres-only, `get_sensitive_audit_logs`) that run as owner → do not need `authenticated`. ✓ (PRE-3a: no INVOKER; PRE-3c: no trigger.)
- **service_role:** no server/Edge caller exists (0 Edge deployed) → revocation breaks nothing (§B2). ✓

## 6. Exact rollback boundary
- **File:** `0023_grants_hardening.ROLLBACK.PROPOSED.sql` — **EMERGENCY ROLLBACK ONLY, separate PJ approval, never automatic.**
- **Scope of reversal:** restores EXECUTE grants of **exactly the 17 functions** to the PRE-2 baseline (`PUBLIC, anon, authenticated, postgres, service_role`). **Nothing else** — no `search_path`, no data, no schema, no other function, no `0024`. Restores the known-insecure baseline; use only if a caller unexpectedly breaks.

## 7. Exact post-checks (after 0023, PJ-run, SELECT-only)
1. **Re-run PRE-2** (grantees of the 17) → must match the §3 table exactly (Group A = postgres; Group B = authenticated,postgres).
2. **POST guard query** (in `PRE_AND_POST_VERIFICATION.sql`, final block) → `get_sensitive_audit_logs` returns exactly one row `authenticated`.
3. **Runtime smoke** (T2/PJ, approved creds): Admin loads Audit Log (data returns); non-admin denied; no dashboard/compliance permission errors.
Record all in `EVIDENCE_TEMPLATE.md`.

## Readiness footer
```
0023 readiness: GO (live PRE-checks all CLEAR) · 0024 readiness: independent (LOW; PRE-4 baseline confirmed)
Execution authority: PJ only · Terminal 1 executed NO SQL · Rollback: EMERGENCY-ONLY (separate PJ approval)
Not executed: 0023, 0024, rollback · No commit/push/PR/merge/deploy by Terminal 1
```
