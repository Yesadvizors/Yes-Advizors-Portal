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

## 2. Apply 0023 (grants) — PJ authorised — **DONE**
- [x] 0023 applied — **migration block completed successfully** (single transaction committed) on V2 `ogjrwemjefvccpyjwxuo`.

## 3. POST 0023 verification — **PASS** (full detail in `POST_EXECUTION_RESULTS_0023.md`)
- [x] `POST-1` grantees of the 17 → **exact expected end-state**: Group A (6) = `postgres` only; Group B (11) = `authenticated,postgres`; **no PUBLIC/anon/service_role on any of the 17**.
- [x] `POST-2` `get_sensitive_audit_logs` → returned **`authenticated`** (app retains access).

## 4. Apply 0024 (search_path) — **DONE** (full detail in `0024-execution-readiness/POST_EXECUTION_RESULTS_0024.md`)
- [x] PRE-4a: 3 helpers = `{search_path=public}`; PRE-4b: public-schema CREATE — PUBLIC/anon/authenticated = **false**.
- [x] **0024 applied** — one transaction, completed successfully on V2 `ogjrwemjefvccpyjwxuo`.

## 5. POST 0024 verification — **PASS**
- [x] `POST-4`: all 3 helpers now `{search_path=pg_catalog, public, pg_temp}`.
- [x] Runtime regression PASS: **admin** onboarding succeeded (client YA-012 created; compliance generated; no 42501); **non-admin** restricted onboarding **denied server-side 42501** (no records created). Dashboard/Compliance/Documents/Audit-Log load correctly.

## 6. Runtime smoke (PJ, approved creds) — **PASS**
- [x] **Admin:** Dashboard PASS · Compliance PASS · **Audit Log PASS** (audit rows loaded; no visible 42501/permission error).
- [x] **Non-admin:** Dashboard PASS · Compliance PASS · Documents PASS · Audit Log tab **hidden** in UI; **direct DB test as approved non-admin UID `94187bf5-d163-4763-adc4-ebfa52871686` → `ERROR 42501: not authorised`** (server-side denial confirmed); temporary test transaction **rolled back** successfully.
- [x] No console/Network permission errors on dashboard/compliance.

## 7. Result
- [x] **G-05 / V-5: CLOSED PASS** (remediated + runtime-verified via 0023 — `EXECUTION_CLOSEOUT_0023.md`).
- [x] **V-4: CLOSED PASS** (repinned + runtime-verified via 0024 — `0024-execution-readiness/EXECUTION_CLOSEOUT_0024.md`).
- Still open (unrelated to 0023/0024): **G-11** (`v_team_workload` empty-panel 404 — Option A approved, not yet implemented).
