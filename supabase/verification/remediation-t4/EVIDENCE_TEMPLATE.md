# T4 Remediation — Evidence Template (to be filled by PJ on V2, read-only capture)

Environment: V2 / yav2-dev `ogjrwemjefvccpyjwxuo`. Tag every capture `Sb-Project-Ref: ogjrwemjefvccpyjwxuo` + timestamp. No secrets.

## 0. Pre-flight
- [x] Dashboard shows project ref `ogjrwemjefvccpyjwxuo` — **DONE** (PJ visual confirmation).

## 1. PRE snapshots (before any change) — **COMPLETE** (recorded in `PRE_CHECK_RESULTS_LIVE.md`)
- [x] `PRE-1` `current_database() = postgres`.
- [x] `PRE-2` grantees of the 17 — all show `PUBLIC,anon,authenticated,postgres,service_role`; 15 DEFINER + 2 INVOKER (`calc_gst_due_date`, `get_client_start_fy`).
- [x] `PRE-3a` Group-A callers — **only DEFINER** (`audit_write_event` postgres; `get_sensitive_audit_logs`); **no INVOKER** → Group-A `authenticated` revoke is SAFE.
- [x] `PRE-3b` RLS policies — **0 rows**.
- [x] `PRE-3c` triggers — **0 rows**.
- [x] `PRE-4` search_path of the 3 helpers — all `{search_path=public}` (V-4 baseline).
- **All stop conditions CLEAR → 0023 readiness = GO (`EXECUTION_READINESS_0023.md`).**

## 2. Apply 0023 (grants) — PJ authorised
- [ ] 0023 applied (transaction committed) — capture success/notice output.

## 3. POST 0023 verification
- [ ] `PRE-2` re-run: Group A → no PUBLIC/anon/authenticated; Group B → no PUBLIC/anon, authenticated present.
- [ ] `get_sensitive_audit_logs` authenticated_can_execute = true.

## 4. Apply 0024 (search_path) — PJ authorised
- [ ] 0024 applied.

## 5. POST 0024 verification
- [ ] `PRE-4` re-run: 3 helpers = `pg_catalog, public, pg_temp`.

## 6. Runtime smoke (T2/PJ, approved creds)
- [ ] Admin: Audit Log tab loads and returns data.
- [ ] Non-admin: Audit Log denied (server-enforced).
- [ ] No console/Network 42xxx/permission errors on dashboard/compliance.

## 7. Result
- [ ] All expected end-states met → G-05/V-5 CLOSED. Else → attach failing output + rollback decision.
