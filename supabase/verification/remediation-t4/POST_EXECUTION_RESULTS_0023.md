# T4 — Migration 0023 Post-Execution Results (recorded)

**Environment:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` (PJ-executed manually). **V1 never touched.**
**Terminal 1 executed no SQL** — this file records the results PJ returned after running the committed handoff.
**Design commit:** `6d6f18176a0e970436881e1817636ac57c088144`.

## 1. Migration execution
- **`0023_grants_hardening.PROPOSED.sql` — completed successfully** (single `BEGIN; … COMMIT;` transaction; no error).

## 2. POST-1 — grantees of the 17 (exact expected end-state achieved)
| Group | Functions | Result |
|---|---|---|
| A (6 internal helpers) | `_record_audit_failure`, `_write_read_audit`, `audit_contains_secret`, `audit_field_format_ok`, `audit_is_uuid`, `audit_validate_event` | **`postgres` only** ✓ |
| B (11 role/calc/sensitive) | `get_app_role`, `get_app_role_for_user`, `get_my_role`, `get_my_team_id`, `get_portal_role`, `is_active_user`, `is_admin`, `is_admin_or_manager`, `calc_gst_due_date`, `get_client_start_fy`, `get_sensitive_audit_logs` | **`authenticated,postgres`** ✓ |
- **No `PUBLIC`, `anon`, or `service_role` EXECUTE remained on any of the 17** — matches the design end-state exactly.

## 3. POST-2 — app-dependency guard
- `get_sensitive_audit_logs` → returned **`authenticated`** → the Audit Log UI retains access. ✓

## 4. Admin runtime smoke (approved admin account) — PASS
- Dashboard **PASS** · Compliance **PASS** · **Audit Log PASS** (audit rows loaded successfully). No visible `42501`/permission error.

## 5. Non-admin runtime smoke (approved non-admin) — PASS (server-side denial confirmed)
- Dashboard **PASS** · Compliance **PASS** · Documents **PASS** · Audit Log tab **hidden** in UI.
- **Direct DB test** as approved non-admin UID **`94187bf5-d163-4763-adc4-ebfa52871686`** (P5 Non-Admin Test User, Staff) → **`ERROR 42501: not authorised`** — the in-body `get_app_role() <> 'admin'` gate refused server-side, exactly as designed. **Temporary test transaction rolled back successfully** → no persistent change.

## 6. Separate known issue (NOT caused by 0023)
- `v_team_workload` still returns **404** — this is the **pre-existing G-11** source-completeness variance (relation absent live & unauthored), **independent of 0023** (0023 only changed EXECUTE grants on 17 functions). **G-11 remains OPEN.**

## Interpretation
0023's end-state is exactly as designed, and both the **admin allow** and **non-admin server-side deny** paths for `get_sensitive_audit_logs` are **runtime-verified on V2**. No caller lost required access (admin Audit Log works; dashboard/compliance/documents unaffected).

## Provenance
```
Environment: V2 ogjrwemjefvccpyjwxuo ONLY · V1 never queried
Executed by: PJ. Terminal 1 executed NO SQL. Non-admin UID from committed evidence (Master Completion Register L205 / P5 interim evidence L76).
Not done: 0024 (V-4), G-11 remediation · No V1, PR, merge, deployment.
```
