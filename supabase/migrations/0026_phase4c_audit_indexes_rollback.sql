-- ############################################################################
-- ##  0026 ROLLBACK — drops ONLY the 8 indexes 0026 added. Idempotent.        ##
-- ############################################################################
BEGIN;
DROP INDEX IF EXISTS public.idx_audit_log_actor;
DROP INDEX IF EXISTS public.idx_audit_log_target;
DROP INDEX IF EXISTS public.idx_audit_log_service;
DROP INDEX IF EXISTS public.idx_audit_log_client_uuid;
DROP INDEX IF EXISTS public.idx_audit_log_event_name;
DROP INDEX IF EXISTS public.idx_audit_log_occurred;
DROP INDEX IF EXISTS public.idx_audit_log_risk_time;
DROP INDEX IF EXISTS public.idx_audit_fail_time;
COMMIT;
