-- 0023_grants_hardening.PROPOSED.sql
-- PROPOSED — NOT APPLIED. G-05/V-5 remediation: remove PUBLIC/anon (and service_role, per §B2) EXECUTE from the 17 functions.
-- Target: V2 / yav2-dev (ogjrwemjefvccpyjwxuo) ONLY. PJ executes; T4 executes nothing.
-- Run PRE-checks (PRE_AND_POST_VERIFICATION.sql) first; abort if PRE-3 finds an INVOKER/policy/trigger caller of a Group-A helper.
-- NOTE: REVOKE removes grants ONLY from the named roles/PUBLIC. The function OWNER retains full privileges implicitly
--       (owner rights are not ACL grants), so the SECURITY DEFINER chain (runs as owner) is unaffected. Ownership is not changed.

BEGIN;

-- ── Group A — internal audit-pipeline helpers (DEFINER; caller-unreachable) ──
-- Callable only via the SECURITY DEFINER chain → revoke ALL from PUBLIC/anon/authenticated/service_role.
REVOKE ALL ON FUNCTION public._record_audit_failure(text, text, text[], text)                         FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._write_read_audit(text, uuid, jsonb)                                    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.audit_contains_secret(text)                                             FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.audit_field_format_ok(text, jsonb)                                      FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.audit_is_uuid(text)                                                     FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.audit_validate_event(text, text, text, text, uuid, uuid, jsonb)         FROM PUBLIC, anon, authenticated, service_role;

-- ── Group B — role/calc/sensitive functions (must remain callable by authenticated) ──
-- Remove PUBLIC + anon + service_role (per §B2 per-function justification: no server caller; owner retained implicitly).
-- authenticated is retained (re-asserted below).
REVOKE EXECUTE ON FUNCTION public.get_app_role()                                                      FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.get_app_role_for_user(uuid)                                         FROM PUBLIC, anon, service_role; -- §B2: re-grant service_role only if a future admin/server tool needs it
REVOKE EXECUTE ON FUNCTION public.get_my_role()                                                       FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.get_my_team_id()                                                    FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.get_portal_role()                                                   FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.is_active_user()                                                    FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.is_admin()                                                          FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager()                                               FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.calc_gst_due_date(text, public.month_enum, integer)                 FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.get_client_start_fy(date)                                           FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.get_sensitive_audit_logs(timestamptz, timestamptz, integer, integer, text, uuid) FROM PUBLIC, anon, service_role;

-- Explicit re-assert of the intended Group-B end-state (idempotent; harmless if already present):
GRANT  EXECUTE ON FUNCTION public.get_app_role()                                                      TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_app_role_for_user(uuid)                                         TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_my_role()                                                       TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_my_team_id()                                                    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_portal_role()                                                   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_active_user()                                                    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_admin()                                                          TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_admin_or_manager()                                               TO authenticated;
GRANT  EXECUTE ON FUNCTION public.calc_gst_due_date(text, public.month_enum, integer)                 TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_client_start_fy(date)                                           TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_sensitive_audit_logs(timestamptz, timestamptz, integer, integer, text, uuid) TO authenticated;

COMMIT;
-- Expected end-state: Group A → no PUBLIC/anon/authenticated/service_role EXECUTE (owner-only, definer-chain).
--                     Group B → no PUBLIC/anon/service_role EXECUTE; authenticated retained; owner retained.
