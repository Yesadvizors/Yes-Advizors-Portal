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


-- ── [V4] no competing Phase 4C ALTERNATIVE writer was introduced (0029) ──────
--    Only log_audit_event_trusted_backend is a competing writer. _write_read_audit
--    and _record_audit_failure are LOAD-BEARING BASE helpers (0007) — asserted PRESENT.
SELECT
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='log_audit_event_trusted_backend')            AS competing_writer_count, -- expect 0
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname IN ('_write_read_audit','_record_audit_failure')) AS base_helpers_present;  -- expect 2


-- ── [V5] EXACTLY the 23 named events; 2 read events are S4; no duplicates (0030) ─
SELECT
  (SELECT count(*) FROM public.audit_event_contract WHERE event_name = ANY (ARRAY[
     'auth.session.login_success','auth.session.login_failed','auth.session.logout','auth.session.revoked',
     'auth.password_reset.requested','auth.password_reset.completed','auth.mfa.changed',
     'user.account.created','user.account.deactivated','user.account.reactivated','user.role.changed','user.permission.changed',
     'access.client.denied','access.cross_client.attempted','data.bulk_export','data.mass_download',
     'security.setting.changed','security.rls_policy.changed','audit.log.read_requested','audit.log.read_completed',
     'audit.log.exported','audit.ingestion.failed','whatsapp.access.denied'])) AS phase4c_events_exact,   -- expect exactly 23
  (SELECT count(*) FROM public.audit_event_contract
     WHERE event_name IN ('audit.log.read_requested','audit.log.read_completed')
       AND risk_tier='HIGH' AND sensitivity='S4')                                                        AS read_events_s4,   -- expect 2
  (SELECT count(*) FROM (
     SELECT event_name FROM public.audit_event_contract GROUP BY event_name HAVING count(*) > 1) d)      AS duplicate_event_names; -- expect 0


-- ── [V6] access posture preserved: audit_* FORCE RLS (0030) ─────────────────
SELECT c.relname, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('audit_log','audit_event_contract','audit_ingestion_failures')
ORDER BY c.relname;
-- PASS when rls_enabled=true and rls_forced=true for all three.


-- ── [V7] ZERO prohibited direct grants for PUBLIC/anon/authenticated/service_role (0031) ─
SELECT count(*) AS prohibited_grants
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
LEFT JOIN pg_roles r ON r.oid=a.grantee
WHERE c.relname IN ('audit_log','audit_event_contract','audit_ingestion_failures')
  AND (a.grantee=0 OR r.rolname IN ('anon','authenticated','service_role'));
-- PASS when prohibited_grants = 0.

-- ############################################################################
-- ##  END — SELECT-ONLY POST-MIGRATION VERIFICATION (PHASE 4C RECONCILED)     ##
-- ############################################################################
