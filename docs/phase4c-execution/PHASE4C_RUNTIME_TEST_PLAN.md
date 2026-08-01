# YAV2 Phase 4C — Runtime Verification Test Plan (yav2-dev only; NOT yet executed)

**Status:** design only. **No runtime test has been executed.** Target for future run: **yav2-dev /
`ogjrwemjefvccpyjwxuo`** ONLY. **PROHIBITED:** V1 / Production / `zcszesuvjrryxtigjglt`.
**Governing SHA:** `4b84c0269857b14bb52a141e805e6b137a75e842`.

## Guardrails (apply to every test)
- yav2-dev only; no V1/Production; no deployment; no rollback files; **do not restore the 72 grants**.
- Do not alter migrations, roles, grants, RLS, contracts or production code.
- Use **dedicated test identities/data**; **no real client-sensitive data**. Synthetic markers use the prefix
  `ZZZ_PH4C_` so they are unambiguous and searchable.
- **Every mutation runs inside `BEGIN … ROLLBACK`** so all inserted rows (incl. SECURITY DEFINER writes to
  `audit_log`) are discarded — the standing state stays exactly as the execution evidence records it.

### SET LOCAL ROLE governance
Future runtime execution may use `SET LOCAL ROLE` **only**: (a) in **yav2-dev**; (b) **inside `BEGIN … ROLLBACK`**;
(c) by the **authorised `postgres` operator**; (d) for **negative privilege verification** (proving a role is
denied); (e) **never** to bypass an application or security gate or to grant a test a capability it would not
have in production; (f) **only** under the future runtime-execution authorisation. `SET LOCAL` (not `SET`) is
mandatory so the role reverts at transaction end.

## Section 0 — MANDATORY pre-runtime identity discovery (must PASS before any auth-gated test)
Auth-gated tests (T4, T5b, T8, T10) require real, pre-existing Supabase identities. **Supabase Auth users
(`auth.users`) are managed by GoTrue and CANNOT be created or removed inside a single PostgreSQL transaction**,
so test identities MUST already exist and be mapped as active `team` members. Role is derived by
`public.get_app_role()`: `auth.uid()` must have **exactly one** active `team` row; `team.is_admin=true` (or
`team.portal_role='Admin'`) ⇒ `'admin'`; other active `portal_role` ⇒ `manager/staff/viewer`.

The operator MUST run these SELECT-only discovery queries and record the results:
```sql
-- D-1: candidate ACTIVE ADMIN test identities (get_app_role => 'admin')
SELECT t.auth_user_id, t.portal_role, t.is_admin, t.is_active
FROM public.team t
WHERE t.is_active = true AND (t.is_admin = true OR t.portal_role = 'Admin')
ORDER BY t.auth_user_id;                      -- need >= 1 dedicated (non-real-person) test admin

-- D-2: candidate ACTIVE NON-ADMIN test identities (get_app_role in staff/viewer/manager)
SELECT t.auth_user_id, t.portal_role, t.is_admin, t.is_active
FROM public.team t
WHERE t.is_active = true AND coalesce(t.is_admin,false) = false
  AND t.portal_role IN ('Manager','Executive','Staff','Viewer')
ORDER BY t.auth_user_id;                       -- need >= 1 dedicated non-admin test identity
```
**HALT rule:** if a **dedicated** active admin AND a **dedicated** active non-admin test identity do not both
already exist (must not be real users), **runtime execution HALTS pending a separately governed identity
provisioning package** (GoTrue user creation + `team` mapping is out of scope here and cannot be transaction-
scoped). Record the chosen `TEST_ADMIN_UUID` and `TEST_NONADMIN_UUID` (their `auth_user_id`) for use below.

## Contract facts used by the tests
- `audit_validate_event(event,initiated_by_type,action,resource_type,client_uuid,target_user_id,metadata jsonb) → text` — **NULL on accept**, else a code (`UNKNOWN_EVENT`, `ACTOR_TYPE_NOT_PERMITTED`, `ACTION_NOT_PERMITTED`, `CLIENT_PROHIBITED`, `TARGET_USER_REQUIRED`, `METADATA_NOT_OBJECT`, …). No auth gate.
- `audit_contains_secret(text) → boolean` — redaction guard (IMMUTABLE SECURITY DEFINER).
- `audit_write_event(text,text,text,text,uuid,jsonb) → uuid` — canonical writer; fail-closed on `auth.uid()` (`NO_AUTH_CONTEXT`), `is_active_user()` (`NOT_AUTHORISED_INACTIVE`), `is_admin_or_manager()` (`NOT_AUTHORISED`); not EXECUTE-granted to app roles.
- `get_sensitive_audit_logs(timestamptz,timestamptz,int,int,text,uuid) → jsonb` — reader; fail-closed on `auth.uid() IS NULL` (`not authenticated`, 42501) and `get_app_role() <> 'admin'` (`not authorised`, 42501); emits `audit.log.read_requested` then `audit.log.read_completed` via `_write_read_audit`; the completed row's metadata carries `read_request_audit_id` = the request row's id.
- `_write_read_audit(text,uuid,jsonb) → uuid`, `_record_audit_failure(text,text,text[],text) → void` — base helpers (SECURITY DEFINER), retained.
- `service_applicability_create(p_client_id uuid, p_service_code text, p_effective_from date, p_effective_to date, p_frequency text, p_linked_registration_id uuid, p_owner_team_id uuid, p_notes text) → jsonb` — SECURITY DEFINER; gated on `auth.uid()`/`is_active_user()`/`is_admin_or_manager()`; requires an existing `clients.id` and an active `service_catalogue.code`; if the code's `requires_registration=true`, a linked registration is required (all seeded codes have `requires_registration=false`); emits `audit_write_event('service_applicability.added','CREATE','client_service_applicability', <new id>, p_client_id, {"change_type_code":"CREATED"})`; returns `{"id":<uuid>,"row_version":<int>}`.

## Runtime-test matrix

### T1 — Valid audit event accepted (SQL editor; no auth)
```sql
SELECT public.audit_validate_event('user.role.changed','service','UPDATE','team_member',NULL,gen_random_uuid(),
  '{"old_role_code":"A","new_role_code":"B","change_reason_code":"ZZZ_PH4C"}'::jsonb) AS reject_code;
```
Expected: `reject_code = NULL`. Cleanup: none (read-only).

### T2 — Unknown event rejected (SQL editor)
```sql
SELECT public.audit_validate_event('zzz.ph4c.does_not_exist','service','X','y',NULL,NULL,'{}'::jsonb) AS reject_code;
```
Expected: `reject_code = 'UNKNOWN_EVENT'`. Cleanup: none.

### T3 — Prohibited secret detected (SQL editor)
```sql
SELECT public.audit_contains_secret('login password: hunter2') AS is_secret_1,
       public.audit_contains_secret('routine status note')      AS is_secret_2;
```
Expected: `is_secret_1 = true`, `is_secret_2 = false`. Cleanup: none.

### T4 — Authorised reader succeeds + emits exactly 2 read rows (auth session, admin) — DETERMINISTIC
```sql
BEGIN;
-- baseline: capture the exact existing read-row id set
CREATE TEMP TABLE zzz_ph4c_baseline ON COMMIT DROP AS
  SELECT id FROM public.audit_log WHERE event_name IN ('audit.log.read_requested','audit.log.read_completed');
SELECT set_config('request.jwt.claims', json_build_object('sub','<TEST_ADMIN_UUID>','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.get_sensitive_audit_logs(now()-interval '7 days', now(), 1, 10) AS reader_result;   -- expect a JSONB page object, no exception
RESET ROLE;
-- delta: exactly the 2 new rows produced by THIS call
CREATE TEMP TABLE zzz_ph4c_delta ON COMMIT DROP AS
  SELECT id, event_name, metadata FROM public.audit_log
  WHERE event_name IN ('audit.log.read_requested','audit.log.read_completed')
    AND id NOT IN (SELECT id FROM zzz_ph4c_baseline);
SELECT count(*) AS delta_count,
       count(*) FILTER (WHERE event_name='audit.log.read_requested') AS n_req,
       count(*) FILTER (WHERE event_name='audit.log.read_completed') AS n_cmp
FROM zzz_ph4c_delta;                                  -- expect delta_count=2, n_req=1, n_cmp=1
-- link: read_completed.metadata->>'read_request_audit_id' = the read_requested row id
SELECT (cmp.metadata->>'read_request_audit_id') = req.id::text AS linked_ok
FROM zzz_ph4c_delta req
JOIN zzz_ph4c_delta cmp ON cmp.event_name='audit.log.read_completed'
WHERE req.event_name='audit.log.read_requested';      -- expect linked_ok = true
ROLLBACK;
-- after rollback, prove the 2 delta rows are ABSENT (run as a fresh statement):
-- (there must be NO audit_log row whose metadata references a read_request created above; and the
--  standing count of read events must equal the pre-test count = 34 per the execution evidence)
SELECT count(*) AS read_events_after FROM public.audit_log
WHERE event_name IN ('audit.log.read_requested','audit.log.read_completed');   -- expect 34
```
Expected: reader returns a page object; `delta_count=2` (`n_req=1`, `n_cmp=1`); `linked_ok=true`; after rollback `read_events_after=34`. Cleanup: `ROLLBACK` (delta rows discarded).

### T5 — Unauthorised reader denied (SQL editor + auth session)
```sql
-- (a) no auth context (postgres / auth.uid() NULL):
SELECT public.get_sensitive_audit_logs(now()-interval '1 day', now(),1,10);   -- expect ERROR 42501 'not authenticated'
-- (b) authenticated NON-admin:
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub','<TEST_NONADMIN_UUID>','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.get_sensitive_audit_logs(now()-interval '1 day', now(),1,10);   -- expect ERROR 42501 'not authorised'
ROLLBACK;
```
Expected: (a) 42501 `not authenticated`; (b) 42501 `not authorised`. Cleanup: `ROLLBACK`.

### T6 — anon/authenticated/service_role cannot directly access/mutate the 3 audit tables (role probe) — VALID INSERTS
For each role R in (`anon`,`authenticated`,`service_role`), run SELECT and a **fully-valid** INSERT per table
inside `BEGIN … ROLLBACK`; the ONLY acceptable failure is **privilege denial (SQLSTATE 42501 / "permission
denied for table …")**. NOT NULL (23502), CHECK (23514), FK (23503) or format errors do NOT count as proof.
```sql
-- example for R = anon (repeat for authenticated, service_role):
BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM public.audit_log;                ROLLBACK;   -- expect 42501
BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM public.audit_event_contract;     ROLLBACK;   -- expect 42501
BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM public.audit_ingestion_failures; ROLLBACK;   -- expect 42501
-- VALID inserts (all mandatory fields populated with synthetic, constraint-satisfying values):
BEGIN; SET LOCAL ROLE anon;
  INSERT INTO public.audit_log (initiated_by_type, event_name, risk_tier)
  VALUES ('service','zzz.ph4c.privilege_probe','LOW');                              ROLLBACK;   -- expect 42501
BEGIN; SET LOCAL ROLE anon;
  INSERT INTO public.audit_event_contract
    (event_name, risk_tier, sensitivity, client_requirement, target_user_requirement, permitted_actor_types)
  VALUES ('zzz.ph4c.probe','LOW','S1','prohibited','prohibited', ARRAY['service']); ROLLBACK;   -- expect 42501
BEGIN; SET LOCAL ROLE anon;
  INSERT INTO public.audit_ingestion_failures (failure_reason_code)
  VALUES ('ZZZ_PH4C_PROBE');                                                        ROLLBACK;   -- expect 42501
```
Expected: **every** SELECT and INSERT (3 roles × 3 tables × {SELECT, INSERT}) fails with **42501**. Cleanup:
`ROLLBACK` (nothing committed). Cross-check: PC-7/V7 already show 0 direct grants + FORCE RLS.

### T7 — Audit-ingestion failure recorded (SQL editor)
```sql
BEGIN;
SELECT public._record_audit_failure('audit.ingestion.failed','ZZZ_PH4C_REASON', ARRAY['field_a','field_b'], 'P0001');
SELECT count(*) AS n FROM public.audit_ingestion_failures WHERE failure_reason_code='ZZZ_PH4C_REASON';  -- expect 1
ROLLBACK;
SELECT count(*) AS n_after FROM public.audit_ingestion_failures WHERE failure_reason_code='ZZZ_PH4C_REASON'; -- expect 0
```
Expected: `n=1` in-txn, `n_after=0`. Cleanup: `ROLLBACK`.

### T8 — get_sensitive_audit_logs emits read_requested + read_completed, linked — DETERMINISTIC
Same construction as **T4** (T4 already proves the exact delta=2 and the `read_request_audit_id` linkage). T8 is
satisfied by T4's `delta_count=2`, `n_req=1`, `n_cmp=1`, and `linked_ok=true`, plus the post-rollback
`read_events_after=34`. No `occurred_at > now()-interval` heuristic is used; identity is by explicit id-set delta.

### T9 — _write_read_audit / _record_audit_failure functional (SQL editor) — EXACT-ROW
```sql
BEGIN;
-- capture the exact UUID returned by _write_read_audit and find that exact row
SELECT public._write_read_audit('audit.log.read_requested', NULL,
  '{"requested_page_number":1,"requested_page_size":10,"filter_applied":false,"access_method_code":"ZZZ_PH4C",
    "filter_date_start":"2026-08-01T00:00:00.000Z","filter_date_end":"2026-08-01T23:59:59.000Z"}'::jsonb) AS req_id \gset
SELECT count(*) AS n_write FROM public.audit_log WHERE id = :'req_id';               -- expect exactly 1
-- record a failure with a unique synthetic marker and find that exact row
SELECT public._record_audit_failure('audit.ingestion.failed','ZZZ_PH4C_T9_MARKER', ARRAY['x'], 'P0001');
SELECT count(*) AS n_fail FROM public.audit_ingestion_failures WHERE failure_reason_code='ZZZ_PH4C_T9_MARKER'; -- expect 1
ROLLBACK;
-- prove both are absent afterward:
SELECT (SELECT count(*) FROM public.audit_log WHERE id = :'req_id') AS n_write_after,
       (SELECT count(*) FROM public.audit_ingestion_failures WHERE failure_reason_code='ZZZ_PH4C_T9_MARKER') AS n_fail_after;
```
Expected: `req_id` non-null; `n_write=1`, `n_fail=1` in-txn; `n_write_after=0`, `n_fail_after=0`. (If the client
does not support `\gset`, capture `req_id` into a `TEMP TABLE` instead.) Cleanup: `ROLLBACK`.

### T10 — Existing audited CRUD workflow still functional (auth session, admin) — EXACT FIXTURE
Prerequisite: **T4/Section 0 admin identity** (`TEST_ADMIN_UUID`). Uses a synthetic client and any seeded active
service code (`requires_registration=false`); everything is rolled back.
```sql
BEGIN;
-- synthetic client fixture (clients requires only 'name'); capture its id
INSERT INTO public.clients (name) VALUES ('ZZZ_PH4C_RUNTIME_TEST_CLIENT') RETURNING id \gset client_id
-- pick a seeded active, no-registration service code deterministically
SELECT code FROM public.service_catalogue
 WHERE is_active AND requires_registration=false ORDER BY sort_order LIMIT 1 \gset svc_code
-- act as the admin identity and call the real RPC
SELECT set_config('request.jwt.claims', json_build_object('sub','<TEST_ADMIN_UUID>','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.service_applicability_create(
         :'client_id'::uuid, :'svc_code'::text, current_date, NULL, NULL, NULL, NULL, 'ZZZ_PH4C_RUNTIME_TEST'
       ) AS rpc_result \gset
RESET ROLE;
-- rpc_result is jsonb {"id":<uuid>,"row_version":1}; capture the new applicability id
SELECT (:'rpc_result'::jsonb ->> 'id') AS applicability_id \gset
-- verify the canonical writer emitted EXACTLY the expected audit row for this id
SELECT count(*) AS n_audit FROM public.audit_log
WHERE event_name = 'service_applicability.added'
  AND action = 'CREATE'
  AND resource_type = 'client_service_applicability'
  AND resource_id = :'applicability_id'
  AND client_uuid = :'client_id'::uuid
  AND metadata->>'change_type_code' = 'CREATED';                                    -- expect exactly 1
ROLLBACK;
-- prove both the applicability row and its audit row are absent afterward:
SELECT (SELECT count(*) FROM public.client_service_applicability WHERE id = :'applicability_id'::uuid) AS app_after,
       (SELECT count(*) FROM public.audit_log WHERE resource_id = :'applicability_id') AS audit_after;   -- expect 0, 0
```
- **Exact function signature:** `service_applicability_create(uuid, text, date, date, text, uuid, uuid, text) → jsonb`.
- **Exact synthetic arguments:** `(<synthetic client id>, <seeded code e.g. 'ACCOUNTING'>, current_date, NULL, NULL, NULL, NULL, 'ZZZ_PH4C_RUNTIME_TEST')`.
- **Exact prerequisite fixture:** a synthetic `clients` row (`name='ZZZ_PH4C_RUNTIME_TEST_CLIENT'`) + a seeded active `requires_registration=false` `service_catalogue` code + the admin identity active in `team`.
- **Expected RPC result:** `{"id":<uuid>,"row_version":1}`.
- **Expected audit:** event `service_applicability.added`, action `CREATE`, resource `client_service_applicability`, `resource_id` = returned id, `client_uuid` = synthetic client, metadata `{"change_type_code":"CREATED"}`.
- **Verification SQL / rollback:** as above; `n_audit=1` in-txn; `app_after=0`, `audit_after=0`. **No real client data.**

## Per-test evidence requirements (record for every test)
For each of T1–T10, capture: the **exact SQL** run; the **SQLSTATE** (and message) of any raised error; the
**returned values**; **before / inside-transaction / after-rollback** evidence (e.g. baseline vs delta vs
post-rollback counts); and the explicit **PASS / HALT** decision. Store as a structured evidence block per test
(date/IST, operator, project ref, governing SHA, test id, raw output, decision).

## Cleanup plan (summary)
Every mutating test is `BEGIN … ROLLBACK`-scoped; nothing is committed. After the full run, re-run the verifier
V1–V7 and confirm identical values to the execution evidence (23 events, 34 preserved read rows, 0 prohibited
grants, roles/indexes intact). If any synthetic identity had to be provisioned out-of-band (Section 0), remove
it under its own governed cleanup.

## Risks & HALT conditions
- **HALT** if any fail-closed path instead **succeeds** (anon/authenticated/service_role SELECT/INSERT on an
  audit table returns success; an unauthenticated/non-admin read returns data; an unknown event validates) —
  a live security regression.
- **HALT** if a table INSERT in T6 fails with a **non-42501** error (constraint/format) — the probe is invalid
  and must be corrected before it can prove privilege denial.
- **HALT** if the delta in T4/T8 ≠ 2 or the `read_request_audit_id` linkage is false.
- **HALT** if any test cannot be cleanly rolled back, or if the post-run verifier V1–V7 drifts from the evidence.
- **HALT** (per Section 0) if dedicated active admin AND non-admin test identities do not already exist.

## Recommendation
**HOLD — TEST IDENTITIES AND EXACT CRUD FIXTURE REQUIRED.** The commands above are now exact and executable, but
runtime execution depends on (1) Section 0 identity discovery confirming dedicated active admin + non-admin test
identities exist (GoTrue users cannot be transaction-scoped), and (2) the synthetic CRUD fixture. Once identity
discovery PASSES and the fixture is confirmed against live yav2-dev, this document may be upgraded to
**READY FOR RUNTIME EXECUTION, SUBJECT TO IDENTITY DISCOVERY PASS** under a separate runtime-execution
authorisation. No runtime test has been run in this package.
