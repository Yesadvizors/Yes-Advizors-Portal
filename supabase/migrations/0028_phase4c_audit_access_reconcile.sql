-- ############################################################################
-- ##  0028 — PHASE 4C — RECONCILE ACCESS FUNCTIONS (collisions: retain base)  ##
-- ##  Renumbered 0026->0028. get_app_role() / get_app_role_for_user(uuid) /    ##
-- ##  get_sensitive_audit_logs(...) already exist and are load-bearing (0008); ##
-- ##  base versions RETAINED (no CREATE OR REPLACE). FAIL-CLOSED assertion.     ##
-- ##  Changes NO object/privilege/row. yav2-dev ONLY. PROHIBITED: V1/Prod.      ##
-- ############################################################################
BEGIN;
DO $assert$
DECLARE missing text := '';
BEGIN
  IF to_regprocedure('public.get_app_role()') IS NULL THEN missing := missing || ' get_app_role()'; END IF;
  IF to_regprocedure('public.get_app_role_for_user(uuid)') IS NULL THEN missing := missing || ' get_app_role_for_user(uuid)'; END IF;
  IF to_regprocedure('public.get_sensitive_audit_logs(timestamp with time zone, timestamp with time zone, integer, integer, text, uuid)') IS NULL THEN
    missing := missing || ' get_sensitive_audit_logs(...)'; END IF;
  IF length(missing) > 0 THEN
    RAISE EXCEPTION '0028 ASSERTION FAILED: base access function(s) with expected signature missing:%. Base 0008 required unchanged.', missing;
  END IF;
END
$assert$;
COMMIT;
-- ##  END 0028 — rollback: 0028_phase4c_audit_access_reconcile_rollback.sql (no-op) ##
