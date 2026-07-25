-- PRE_AND_POST_VERIFICATION.sql — READ-ONLY (SELECT / catalog inspection only).
-- No INSERT/UPDATE/DELETE/CREATE/ALTER/DROP/GRANT/REVOKE/TRUNCATE. PJ-run on V2 (ogjrwemjefvccpyjwxuo) only.
-- Every statement below is a SELECT over pg_catalog. Any GRANT/REVOKE words appear ONLY inside comments.

-- =========================================================================
-- PRE-1 — environment sanity (identity is confirmed VISUALLY in the dashboard, not from SQL).
select current_database() as db;

-- =========================================================================
-- PRE-2 / POST (0023) — EXECUTE grantees of the 17 (run before AND after 0023).
--   Expected end-state: Group A -> no PUBLIC/anon/authenticated/service_role ; Group B -> no PUBLIC/anon (authenticated retained).
select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       coalesce((
         select string_agg(distinct case when a.grantee = 0 then 'PUBLIC' else r.rolname end, ',' order by 1)
         from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
         left join pg_roles r on r.oid = a.grantee
         where a.privilege_type = 'EXECUTE'
       ), '(default: PUBLIC)') as execute_grantees
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
where p.proname in (
  '_record_audit_failure','_write_read_audit','audit_contains_secret','audit_field_format_ok',
  'audit_is_uuid','audit_validate_event','get_app_role','get_app_role_for_user','get_my_role','get_my_team_id',
  'get_portal_role','is_active_user','is_admin','is_admin_or_manager','calc_gst_due_date','get_client_start_fy',
  'get_sensitive_audit_logs')
order by p.proname;

-- =========================================================================
-- PRE-3 (BLOCKING for Group A) — full dependency sweep for the 6 internal audit helpers.
-- If ANY row appears in 3a/3b/3c below, do NOT revoke EXECUTE from `authenticated` (and re-check service_role)
-- for the referenced helper — keep the minimum grant that the reachable caller requires.
-- (Note: a SECURITY DEFINER caller runs as its OWNER, so it does not require the end-caller to hold EXECUTE;
--  the rows are annotated with the caller's own security mode and grantees so the reachability can be judged.)

-- 3a — function-body callers (BOTH invoker and definer), with the caller's security mode and EXECUTE grantees:
select p.proname as caller_fn,
       case when p.prosecdef then 'DEFINER' else 'INVOKER' end as caller_security,
       coalesce((
         select string_agg(distinct case when a.grantee = 0 then 'PUBLIC' else r.rolname end, ',' order by 1)
         from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
         left join pg_roles r on r.oid = a.grantee
         where a.privilege_type = 'EXECUTE'), '(default: PUBLIC)') as caller_grantees,
       'function-body' as via
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
where p.prosrc ~ '(_record_audit_failure|_write_read_audit|audit_contains_secret|audit_field_format_ok|audit_is_uuid|audit_validate_event)'
  and p.proname not in ('_record_audit_failure','_write_read_audit','audit_contains_secret','audit_field_format_ok','audit_is_uuid','audit_validate_event');

-- 3b — RLS policies referencing any Group-A helper (USING or WITH CHECK):
select pol.polname as policy_name, cl.relname as on_table, 'rls-policy' as via
from pg_policy pol
join pg_class cl on cl.oid = pol.polrelid
where coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ~ '(_record_audit_failure|_write_read_audit|audit_contains_secret|audit_field_format_ok|audit_is_uuid|audit_validate_event)'
   or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ~ '(_record_audit_failure|_write_read_audit|audit_contains_secret|audit_field_format_ok|audit_is_uuid|audit_validate_event)';

-- 3c — triggers whose trigger-function body references any Group-A helper
--       (also covers the case where a Group-A helper were itself a trigger function — it is not; all return void/uuid/boolean/text):
select tg.tgname as trigger_name, cl.relname as on_table, pr.proname as trigger_fn,
       case when pr.prosecdef then 'DEFINER' else 'INVOKER' end as trigger_fn_security, 'trigger' as via
from pg_trigger tg
join pg_class cl on cl.oid = tg.tgrelid
join pg_proc pr on pr.oid = tg.tgfoid
where not tg.tgisinternal
  and pr.prosrc ~ '(_record_audit_failure|_write_read_audit|audit_contains_secret|audit_field_format_ok|audit_is_uuid|audit_validate_event)';

-- 3d — application RPC references: OUT OF SCOPE for SQL (the app is not in the DB). Confirmed separately by
--       a read-only repo scan (`grep -r "\.rpc(" src`) which found ONLY get_sensitive_audit_logs, generate_client_compliance,
--       activate_accounting_service called from the frontend — NONE of the 6 Group-A helpers.

-- =========================================================================
-- PRE-4 / POST (0024) — search_path of the 3 bare-'public' helpers.
--   Before: {search_path=public} ; After 0024: {search_path=pg_catalog, public, pg_temp}.
select p.proname, p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
where p.proname in ('get_portal_role','is_active_user','is_admin_or_manager')
order by p.proname;

-- =========================================================================
-- POST (0023) — app-dependency guard: get_sensitive_audit_logs must still be EXECUTE-able by `authenticated`
--   (the Audit Log UI calls it). Expect exactly one row: 'authenticated'.
select r.rolname as role_with_execute
from pg_proc p
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
join pg_roles r on r.oid = a.grantee
where p.proname = 'get_sensitive_audit_logs'
  and p.pronamespace = 'public'::regnamespace
  and a.privilege_type = 'EXECUTE'
  and r.rolname = 'authenticated';
