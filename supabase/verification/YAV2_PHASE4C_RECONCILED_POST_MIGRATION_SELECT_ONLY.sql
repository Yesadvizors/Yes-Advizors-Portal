-- ############################################################################
-- ##  YAV2 — PHASE 4C RECONCILED — POST-MIGRATION VERIFICATION (SELECT ONLY)  ##
-- ##  READ-ONLY. Every executable statement begins SELECT or WITH.           ##
-- ##  No DDL/DML/GRANT/REVOKE/DO/SET ROLE/CALL. No app-function calls.        ##
-- ##  Target (future run): yav2-dev / ogjrwemjefvccpyjwxuo ONLY. PROHIBITED:  ##
-- ##  V1 / Production / zcszesuvjrryxtigjglt.                                 ##
-- ############################################################################
-- Run AFTER 0025–0030 to confirm the reconciled state. Changes nothing.


-- ── [V1] audit roles exist as NOLOGIN non-superuser (0025) ──────────────────
SELECT rolname, rolcanlogin, rolsuper, rolinherit
FROM pg_roles
WHERE rolname IN ('audit_owner','audit_writer')
ORDER BY rolname;


-- ── [V2] the 8 Phase 4C indexes exist (0026) ────────────────────────────────
SELECT indexname
FROM pg_indexes
WHERE schemaname='public'
  AND indexname IN ('idx_audit_log_actor','idx_audit_log_target','idx_audit_log_service',
                    'idx_audit_log_client_uuid','idx_audit_log_event_name','idx_audit_log_occurred',
                    'idx_audit_log_risk_time','idx_audit_fail_time')
ORDER BY indexname;


-- ── [V3] base validation/access/writer chain intact (0027/0028/0029) ────────
SELECT
  (to_regprocedure('public.audit_contains_secret(text)') IS NOT NULL)                                  AS has_contains_secret,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='audit_validate_event')  AS has_validate_event,
  (to_regprocedure('public.get_app_role()') IS NOT NULL)                                               AS has_get_app_role,
  (to_regprocedure('public.get_app_role_for_user(uuid)') IS NOT NULL)                                  AS has_get_app_role_for_user,
  (to_regprocedure('public.get_sensitive_audit_logs(timestamp with time zone, timestamp with time zone, integer, integer, text, uuid)') IS NOT NULL) AS has_get_sensitive_audit_logs,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='audit_write_event' AND p.prosecdef) AS writer_is_secdef;


-- ── [V4] no competing Phase 4C writer/reader was introduced (0029) ──────────
SELECT count(*) AS competing_writer_count
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('log_audit_event_trusted_backend','_write_read_audit','_record_audit_failure');
-- PASS when competing_writer_count = 0.


-- ── [V5] the 23 Phase 4C security/auth events are present (0030) ─────────────
SELECT count(*) AS phase4c_events_present
FROM public.audit_event_contract
WHERE event_name LIKE 'auth.%' OR event_name LIKE 'user.%' OR event_name LIKE 'access.%'
   OR event_name LIKE 'data.%' OR event_name LIKE 'security.%'
   OR event_name IN ('audit.log.read_requested','audit.log.read_completed','audit.log.exported',
                     'audit.ingestion.failed','whatsapp.access.denied');
-- PASS when phase4c_events_present >= 23.


-- ── [V6] access posture preserved: audit_* FORCE RLS, no anon/service_role priv
SELECT
  c.relname,
  c.relrowsecurity  AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  (SELECT count(*) FROM information_schema.role_table_grants g
     WHERE g.table_schema='public' AND g.table_name=c.relname
       AND g.grantee IN ('anon','service_role')) AS anon_or_service_grants
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('audit_log','audit_event_contract','audit_ingestion_failures')
ORDER BY c.relname;
-- PASS when rls_enabled=true, rls_forced=true, anon_or_service_grants=0 for all three.

-- ############################################################################
-- ##  END — SELECT-ONLY POST-MIGRATION VERIFICATION (PHASE 4C RECONCILED)     ##
-- ############################################################################
