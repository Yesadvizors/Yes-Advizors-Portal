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

## 4. Apply 0024 (search_path) — **NOT DONE** (V-4 remains OPEN; out of this closeout's scope)
- [ ] 0024 applied.

## 5. POST 0024 verification — **NOT DONE** (V-4 OPEN)
- [ ] `PRE-4` re-run: 3 helpers = `pg_catalog, public, pg_temp`.

## 6. Runtime smoke (PJ, approved creds) — **PASS**
- [x] **Admin:** Dashboard PASS · Compliance PASS · **Audit Log PASS** (audit rows loaded; no visible 42501/permission error).
- [x] **Non-admin:** Dashboard PASS · Compliance PASS · Documents PASS · Audit Log tab **hidden** in UI; **direct DB test as approved non-admin UID `94187bf5-d163-4763-adc4-ebfa52871686` → `ERROR 42501: not authorised`** (server-side denial confirmed); temporary test transaction **rolled back** successfully.
- [x] No console/Network permission errors on dashboard/compliance.

## 7. Result — **G-05 / V-5: REMEDIATED & RUNTIME-VERIFIED on V2** (see `EXECUTION_CLOSEOUT_0023.md`)
- [x] All expected end-states met → **G-05/V-5 CLOSED (remediated + runtime-verified)**.
- Still open (unchanged by 0023): **V-4** (bare-`'public'` search_path — 0024 not run), **G-11** (`v_team_workload` still 404 — pre-existing; not caused by 0023).
