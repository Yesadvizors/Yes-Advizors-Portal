# 0024 (V-4 search_path hardening) — Execution-Readiness Report

**Status:** READINESS ASSESSMENT — read-only. No SQL executed, no Supabase access. `0024` remains PROPOSED / NOT APPLIED.
**Owner/editor:** Terminal 1 (Control Tower, sole editor). **Basis:** committed evidence `05b` + migrations at governing HEAD `4e4d5abd3d376623bd5577718c4ea8a0bb4c5542`.
**Target (for eventual PJ execution):** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` ONLY. **Prohibited:** V1 `zcszesuvjrryxtigjglt`.
**Independent of 0023** (0023 already CLOSED PASS). This package is separate from G-11.

## 1. Exact source findings
V-4 = 3 SECURITY DEFINER functions pin a **bare** `search_path=public` (all others pin `pg_catalog, public, pg_temp`). Live-confirmed in the T3 reconciliation (PRE-4). Bodies (from committed `05b`) reference only **`public.team`** (unqualified) + **schema-qualified `auth.uid()`** + built-ins:
| Function | Signature | Lang / Vol / Sec | Current search_path | Body references |
|---|---|---|---|---|
| `get_portal_role()` | `() → text` | sql / STABLE / DEFINER | `public` | `SELECT portal_role FROM team WHERE auth_user_id=auth.uid() AND is_active=true LIMIT 1` |
| `is_active_user()` | `() → boolean` | sql / STABLE / DEFINER | `public` | `SELECT EXISTS(SELECT 1 FROM team WHERE auth_user_id=auth.uid() AND is_active=true)` |
| `is_admin_or_manager()` | `() → boolean` | sql / STABLE / DEFINER | `public` | `SELECT EXISTS(SELECT 1 FROM team WHERE auth_user_id=auth.uid() AND portal_role IN ('Admin','Manager') AND is_active=true)` |

**Why the repin is behaviour-neutral:** each function resolves only `public.team` (via search_path) and the fully-qualified `auth.uid()`; `EXISTS`/`IN`/`SELECT` are `pg_catalog` built-ins. Adding `pg_catalog` (first) + `pg_temp` changes nothing about resolution — there is no `team` in `pg_catalog`/`pg_temp` to shadow it. Post-0023 EXECUTE grants (`authenticated,postgres`) are unaffected by an `ALTER FUNCTION … SET search_path`.

## 2. Exact callers & dependencies (repin must not disturb them)
These 3 are **heavily used server-side** (so correctness matters — but the repin changes only the internal GUC, not signature/return/behaviour):
- `get_portal_role()` — `0008_functions_rpc.sql`, `0010_rls_refined_phase4b.sql`.
- `is_active_user()` — `0008`, `0010`, `0015`, `0016`, `0017`, `0021`, `0022` (RLS gates + CRUD RPCs).
- `is_admin_or_manager()` — `0008`, `0010`, `0015`, `0016`, `0017`, `0021`, `0022` (RLS write-gates + 22 CRUD RPCs + `secure-docs` storage policy).
- **Frontend:** none call these as RPCs (the app reads `user.is_admin`/`portal_role` fields; it never `.rpc()`s these). Confirmed by repo scan.
Because `ALTER FUNCTION … SET search_path` preserves the signature/OID/body, **every caller (RLS policy, CRUD RPC, storage policy) continues to bind the same function** — no dependency is invalidated.

## 3. V-4 safety precondition (confirms this is defence-in-depth, not a live vulnerability)
T3 live evidence: **public-schema `CREATE` is granted only to `pg_database_owner`; PUBLIC/anon/authenticated hold `USAGE`, not `CREATE`.** So an untrusted role cannot plant a shadowing object in `public` today → V-4 is **benign now**; `0024` is **defence-in-depth hardening** (LOW-severity), condition-independent.

## 4. Exact PRE checks (SELECT-only, PJ-run on V2)
```sql
-- PRE-4a: current search_path of the 3 (expect {search_path=public})
select p.proname, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
where p.proname in ('get_portal_role','is_active_user','is_admin_or_manager')
order by p.proname;

-- PRE-4b: confirm public-schema CREATE is NOT held by PUBLIC/anon/authenticated (V-4 precondition)
select nsp.nspname,
       coalesce((select string_agg(distinct case when a.grantee=0 then 'PUBLIC' else r.rolname end||':'||a.privilege_type, ',' order by 1)
                 from aclexplode(nsp.nspacl) a left join pg_roles r on r.oid=a.grantee
                 where a.privilege_type='CREATE'), '(no explicit CREATE grants)') as create_grantees
from pg_namespace nsp where nsp.nspname='public';
```
**Expected:** PRE-4a → 3 rows all `{search_path=public}`; PRE-4b → no `PUBLIC`/`anon`/`authenticated` with `CREATE`.

## 5. Exact proposed execution SQL (committed `../0024_search_path_hardening.PROPOSED.sql`, one transaction)
```sql
BEGIN;
ALTER FUNCTION public.get_portal_role()       SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.is_active_user()        SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.is_admin_or_manager()   SET search_path = pg_catalog, public, pg_temp;
COMMIT;
```

## 6. Exact POST checks (SELECT-only)
```sql
-- POST-4: re-run PRE-4a — expect all 3 = {search_path=pg_catalog, public, pg_temp}
select p.proname, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
where p.proname in ('get_portal_role','is_active_user','is_admin_or_manager')
order by p.proname;
```
**Pass:** all 3 `proconfig` = `{search_path=pg_catalog, public, pg_temp}`.

## 7. Rollback boundary (EMERGENCY ONLY — separate PJ approval; never automatic)
`../0024_search_path_hardening.ROLLBACK.PROPOSED.sql` resets exactly the 3 functions' `search_path` back to `public`. Touches **only** those 3 functions' `search_path` — no grants, no body, no data, no other object.

## 8. Runtime smoke plan (regression check; PJ, approved creds)
Behaviour must be unchanged after repin:
- **Admin:** client-master/service-applicability write works (`is_admin_or_manager` gate); Audit Log loads; dashboard/compliance load. PASS = no new permission errors.
- **Non-admin:** write actions denied server-side; read paths unchanged. PASS = same gating as before.
(These functions drive RLS/CRUD gates, so the smoke confirms the gates still behave identically.)

## 9. Risk matrix
| Change | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Repin 3 helpers to `pg_catalog, public, pg_temp` | **VERY LOW** | none expected (resolution unchanged; only-`public.team`+qualified `auth.uid()`) | POST-4 confirms; §8 smoke confirms RLS/CRUD gates unaffected; EMERGENCY rollback available |

## 10. Stop conditions
1. Pre-flight: dashboard not `ogjrwemjefvccpyjwxuo` → ABORT.
2. PRE-4a shows a helper **already** `pg_catalog, public, pg_temp` (already hardened) → note; the `ALTER` is idempotent-safe but report before proceeding.
3. PRE-4b shows `PUBLIC`/`anon`/`authenticated` **with `CREATE` on public** → this would upgrade V-4 from benign to a real exposure → still repin, but flag for a separate schema-ACL fix.
4. §5 `ALTER` errors (signature not found) → transaction auto-aborts; report.
5. §8 smoke regression (any RLS/CRUD gate misbehaves) → EMERGENCY rollback (§7) under PJ approval.

## 11. Evidence template
- [ ] Pre-flight project ref `ogjrwemjefvccpyjwxuo`.
- [ ] PRE-4a (3 = `public`) · [ ] PRE-4b (no PUBLIC/anon/authenticated CREATE).
- [ ] `0024` applied (committed).
- [ ] POST-4 (3 = `pg_catalog, public, pg_temp`).
- [ ] Admin smoke PASS · [ ] Non-admin smoke PASS.
- [ ] Result: V-4 CLOSED, or attach failure + rollback decision.

## 12. Final readiness decision: **READY / GO** (LOW-severity defence-in-depth)
`0024` is behaviour-neutral, dependency-safe (all callers rebind the same OID), and reversible. It may proceed under separate PJ execution authorisation, independently of G-11.

```
0024 readiness: GO · Severity: LOW defence-in-depth · Independent of 0023 (closed) and G-11
SQL executed: NONE · Supabase access: NONE · V1: NONE · This is a readiness assessment only.
```
