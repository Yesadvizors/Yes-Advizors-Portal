-- 0023_grants_hardening.ROLLBACK.PROPOSED.sql
-- EMERGENCY ROLLBACK ONLY — separate PJ approval required. MUST NOT be executed automatically.
-- PROPOSED — NOT APPLIED. Restores the PRE-remediation grant baseline (the KNOWN-INSECURE default) for the 17 functions.
-- Use only to reverse 0023 if a caller unexpectedly breaks, and only under explicit PJ authorisation. Target V2 only.

BEGIN;

-- Group A — restore prior grantees (PUBLIC + anon + authenticated + service_role held EXECUTE):
GRANT EXECUTE ON FUNCTION public._record_audit_failure(text, text, text[], text)                 TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._write_read_audit(text, uuid, jsonb)                            TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audit_contains_secret(text)                                     TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audit_field_format_ok(text, jsonb)                              TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audit_is_uuid(text)                                             TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audit_validate_event(text, text, text, text, uuid, uuid, jsonb) TO PUBLIC, anon, authenticated, service_role;

-- Group B — restore the PUBLIC + anon + service_role grants removed by 0023:
GRANT EXECUTE ON FUNCTION public.get_app_role()                                                  TO PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_app_role_for_user(uuid)                                     TO PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role()                                                   TO PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_team_id()                                                TO PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_portal_role()                                               TO PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_user()                                                TO PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin()                                                      TO PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager()                                           TO PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.calc_gst_due_date(text, public.month_enum, integer)             TO PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_start_fy(date)                                       TO PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_sensitive_audit_logs(timestamptz, timestamptz, integer, integer, text, uuid) TO PUBLIC, anon, service_role;

COMMIT;
-- NOTE: this restores the KNOWN-INSECURE baseline (the G-05 variance). Use only as an emergency reversal.
