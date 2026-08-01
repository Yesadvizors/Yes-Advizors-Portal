# YAV2 Phase 4C — Runtime Verification Test Plan (yav2-dev only; NOT yet executed)

**Status:** design only. **No runtime test has been executed.** Target for future run: **yav2-dev /
`ogjrwemjefvccpyjwxuo`** ONLY. **PROHIBITED:** V1 / Production / `zcszesuvjrryxtigjglt`.
**Governing SHA:** `4b84c0269857b14bb52a141e805e6b137a75e842`.

## Guardrails (apply to every test)
- yav2-dev only; no V1/Production; no deployment; no rollback files; **do not restore the 72 grants**.
- Do not alter migrations, roles, grants, RLS, contracts or production code.
- Use **dedicated test identities/data**; **no real client-sensitive data**.
- **Every mutation runs inside `BEGIN … ROLLBACK`** so all inserted rows (incl. SECURITY DEFINER writes to
  `audit_log`) are discarded — the standing state stays exactly as the execution evidence records it.
- Auth-gated paths simulate a Supabase session in the SQL editor via
  `SELECT set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true);` + `SET LOCAL ROLE
  authenticated;` — never a real user's JWT. A **test admin** must exist in the app's role mapping (`team`) for
  the `sub` used in T4/T8/T10; provision it inside the same rolled-back transaction where possible, else via a
  clearly-labelled dedicated test user removed in cleanup.

## Contract facts used by the tests
- `public.audit_validate_event(event,initiated_by_type,action,resource_type,client_uuid,target_user_id,metadata jsonb) → text` — returns **NULL on accept**, else a code (`UNKNOWN_EVENT`, `ACTOR_TYPE_NOT_PERMITTED`, `ACTION_NOT_PERMITTED`, `CLIENT_PROHIBITED`, `TARGET_USER_REQUIRED`, `METADATA_NOT_OBJECT`, `METADATA_OVERSIZE`, …). No auth gate.
- `public.audit_contains_secret(text) → boolean` — redaction guard (IMMUTABLE SECURITY DEFINER).
- `public.audit_write_event(text,text,text,text,uuid,jsonb) → uuid` — canonical writer; fail-closed: `auth.uid()` (`NO_AUTH_CONTEXT`), `is_active_user()` (`NOT_AUTHORISED_INACTIVE`), `is_admin_or_manager()` (`NOT_AUTHORISED`); not EXECUTE-granted to app roles.
- `public.get_sensitive_audit_logs(timestamptz,timestamptz,int,int,text,uuid) → jsonb` — reader; fail-closed on `auth.uid() IS NULL` (`not authenticated`) and `get_app_role() <> 'admin'` (`not authorised`); emits `audit.log.read_requested` + `audit.log.read_completed` via `_write_read_audit`.
- `public._write_read_audit(text,uuid,jsonb) → uuid`, `public._record_audit_failure(text,text,text[],text) → void` — base helpers (SECURITY DEFINER), retained.

## Runtime-test matrix

| # | Test | Mode | Proposed SQL / call | Expected | Cleanup |
|---|---|---|---|---|---|
| 1 | Valid audit event **accepted** | SQL editor (no auth needed) | `SELECT public.audit_validate_event('user.role.changed','service','UPDATE','team_member',NULL,gen_random_uuid(),'{"old_role_code":"A","new_role_code":"B","change_reason_code":"TEST"}'::jsonb);` | **NULL** (accepted; contract-conforming) | none (read-only) |
| 2 | **Unknown** event rejected | SQL editor | `SELECT public.audit_validate_event('does.not.exist','service','X','y',NULL,NULL,'{}'::jsonb);` | `UNKNOWN_EVENT` | none |
| 3 | Prohibited **secret** detected/redacted | SQL editor | `SELECT public.audit_contains_secret('login password: hunter2') AS is_secret;` and `SELECT public.audit_contains_secret('routine status note') AS is_secret;` | `true` then `false` (guard fires on secret patterns) | none |
| 4 | **Authorised** audit reader succeeds | Auth session (admin) | `BEGIN; SELECT set_config('request.jwt.claims', '{"sub":"<TEST_ADMIN_UUID>","role":"authenticated"}', true); SET LOCAL ROLE authenticated; SELECT public.get_sensitive_audit_logs(now()-interval '7 days', now(), 1, 10); ROLLBACK;` | returns a JSONB page object (`items`,`total_count`,…); no exception | `ROLLBACK` discards the 2 emitted read events |
| 5 | **Unauthorised** reader denied | SQL editor + auth session | (a) as postgres/no-auth: `SELECT public.get_sensitive_audit_logs(now()-interval '1 day', now(),1,10);` → **`not authenticated`**. (b) `BEGIN; SELECT set_config('request.jwt.claims','{"sub":"<TEST_NONADMIN_UUID>","role":"authenticated"}',true); SET LOCAL ROLE authenticated; SELECT public.get_sensitive_audit_logs(now()-interval '1 day', now(),1,10); ROLLBACK;` → **`not authorised`** | both raise `42501` | `ROLLBACK` |
| 6 | anon/authenticated/service_role **cannot directly access/mutate** the 3 audit tables | SQL editor (role probe) | For each role R in (anon, authenticated, service_role) and each table T in (audit_log, audit_event_contract, audit_ingestion_failures): `BEGIN; SET LOCAL ROLE R; SELECT count(*) FROM public.T; ROLLBACK;` and `BEGIN; SET LOCAL ROLE R; INSERT INTO public.T DEFAULT VALUES; ROLLBACK;` | **permission denied** (no grant) on every combination; plus PC-7 already shows 0 direct grants + FORCE RLS | `ROLLBACK` (nothing committed) |
| 7 | Audit-**ingestion failure** recorded | SQL editor | `BEGIN; SELECT public._record_audit_failure('test.ingestion.failure','TEST_REASON', ARRAY['field_a','field_b'], 'P0001'); SELECT count(*) FROM public.audit_ingestion_failures WHERE failure_reason_code='TEST_REASON'; ROLLBACK;` | count = 1 within the txn (row written) | `ROLLBACK` |
| 8 | `get_sensitive_audit_logs` **emits** read_requested + read_completed | Auth session (admin) | `BEGIN; SELECT set_config('request.jwt.claims','{"sub":"<TEST_ADMIN_UUID>","role":"authenticated"}',true); SET LOCAL ROLE authenticated; SELECT public.get_sensitive_audit_logs(now()-interval '7 days', now(),1,5); RESET ROLE; SELECT count(*) FROM public.audit_log WHERE event_name IN ('audit.log.read_requested','audit.log.read_completed') AND occurred_at > now()-interval '1 minute'; ROLLBACK;` | +2 new rows (one request, one completed) inside the txn | `ROLLBACK` |
| 9 | `_write_read_audit` / `_record_audit_failure` **functional** | SQL editor | `BEGIN; SELECT public._write_read_audit('audit.log.read_requested', NULL, '{"requested_page_number":1,"requested_page_size":10,"filter_applied":false,"access_method_code":"TEST","filter_date_start":"2026-08-01T00:00:00.000Z","filter_date_end":"2026-08-01T23:59:59.000Z"}'::jsonb) AS req_id; SELECT public._record_audit_failure('audit.ingestion.failed','TEST',ARRAY['x'],'P0001'); ROLLBACK;` | `_write_read_audit` returns a non-null uuid; `_record_audit_failure` returns void; both rows present in-txn | `ROLLBACK` |
| 10 | Existing **audited CRUD** workflow still functional | Auth session (admin) | `BEGIN; SELECT set_config('request.jwt.claims','{"sub":"<TEST_ADMIN_UUID>","role":"authenticated"}',true); SET LOCAL ROLE authenticated; SELECT public.service_applicability_create(<test args>); RESET ROLE; SELECT count(*) FROM public.audit_log WHERE occurred_at > now()-interval '1 minute'; ROLLBACK;` | RPC succeeds and writes ≥1 audit_log row via `audit_write_event` (the canonical writer path still works post-remediation) | `ROLLBACK` |

## Cleanup plan (summary)
- **Every mutating test is wrapped in `BEGIN … ROLLBACK`** — no runtime test leaves any row, role, grant, or
  contract change. The post-test state must equal the execution-evidence state (23 events, 34 preserved read
  rows, 0 prohibited grants). A dedicated post-run reconciliation query re-runs the verifier V1–V7 and confirms
  identical values.
- If a **dedicated test admin/non-admin user** must persist across a test (only if in-txn provisioning is not
  possible), record its id and remove it in a final, clearly-labelled cleanup step; never use a real user.

## Risks & HALT conditions
- **HALT** if any test that must fail-closed instead **succeeds** (e.g. anon can SELECT/INSERT into an audit
  table; an unauthenticated/non-admin read returns data; an unknown event validates) — that is a live security
  regression; capture evidence and escalate before any further test.
- **HALT** if a test cannot be cleanly rolled back, or if the post-run verifier V1–V7 differs from the recorded
  execution evidence.
- **HALT** if provisioning a test identity would require touching real client data or Production.
- Do not proceed to close Phase 4C until tests 1–10 pass and the post-run verifier matches.

## Recommendation
**READY FOR RUNTIME EXECUTION** — the ten tests are designed to be non-destructive (rollback-scoped), yav2-dev
only, and use synthetic identities/data. Execution requires a **separate PJ authorisation** and a provisioned
test admin/non-admin identity in yav2-dev; no runtime test has been run in this package.
