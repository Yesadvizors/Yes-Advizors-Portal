# T4 — Live PRE-check Results (recorded) + stop-condition evaluation

**Environment:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` (PJ-confirmed visually). **V1 never queried.**
**Nature:** PJ-executed SELECT-only PRE-checks from `PRE_AND_POST_VERIFICATION.sql`. **Terminal 1 executed no SQL** — this file records the results PJ returned.
**Basis:** current governing integration HEAD `9b6a077e445736cfed3c973b6f23a4b76586816f` → design committed `2d1258a`.

## Recorded results
| Check | Result | Expected (design) | Verdict |
|---|---|---|---|
| **PRE-1** | `current_database() = postgres` | a db name; identity confirmed visually | ✅ (project ref confirmed V2) |
| **PRE-2** | 17 functions; all EXECUTE = `PUBLIC, anon, authenticated, postgres, service_role`; **15 DEFINER + 2 INVOKER** (INVOKER = `calc_gst_due_date`, `get_client_start_fy`) | exactly 17; all carry PUBLIC+anon; the 2 INVOKER-in-17 are the calc helpers | ✅ MATCH (baseline variance unchanged; INVOKER set = the 2 Group-B calc helpers) |
| **PRE-3a** | 2 callers of Group-A helpers: `audit_write_event` (DEFINER, grantees=`postgres`), `get_sensitive_audit_logs` (DEFINER, grantees=`PUBLIC,anon,authenticated,postgres,service_role`). **No INVOKER caller.** | only DEFINER callers; no INVOKER | ✅ SAFE — both callers DEFINER (run as owner → do not require end-caller EXECUTE) |
| **PRE-3b** | 0 rows | 0 rows | ✅ no RLS policy references Group-A |
| **PRE-3c** | 0 rows | 0 rows (or DEFINER only) | ✅ no trigger references Group-A |
| **PRE-3d** | n/a (repo scan) | app calls none of the 6 | ✅ confirmed by repo scan |
| **PRE-4** | 3 rows: `get_portal_role`, `is_active_user`, `is_admin_or_manager` all `{search_path=public}` | exactly those 3, bare `public` | ✅ MATCH — V-4 baseline confirmed |

## Stop-condition evaluation (all CLEAR)
1. Project ref = V2 `ogjrwemjefvccpyjwxuo`, not V1 → **CLEAR**.
2. PRE-2 returned exactly **17** → **CLEAR**.
3. PRE-3a **no INVOKER caller** of any Group-A helper → **CLEAR** (Group-A `authenticated` revoke is safe).
4. PRE-3b **0 rows** → **CLEAR**.
5. PRE-3c **0 rows** (no INVOKER trigger) → **CLEAR**.
6. No errors / no ambiguity → **CLEAR**.

**Key confirmation:** the only two paths that reach the 6 Group-A helpers are **SECURITY DEFINER** functions (`audit_write_event`, `get_sensitive_audit_logs`) which execute as the **owner** — so revoking `authenticated` (and `service_role`) from Group A cannot break them. `get_sensitive_audit_logs` is itself a Group-B function that **retains `authenticated`**, so the app path (`AuditLog.jsx` → `get_sensitive_audit_logs` → audit helpers) stays intact end-to-end.

## Provenance
```
Environment: V2 ogjrwemjefvccpyjwxuo ONLY · V1 zcszesuvjrryxtigjglt never queried
Executed by: PJ (SELECT-only). Terminal 1 executed NO SQL. No REVOKE/GRANT/ALTER/DDL/DML.
```
