-- ############################################################################
-- ##  0026 — PHASE 4C — EXTEND AUDIT TABLES IN PLACE (indexes only)           ##
-- ##  Renumbered 0024->0026 (T4 collision on 0023/0024). Adds the 8 Phase 4C  ##
-- ##  performance indexes the base (0005) lacks; all IF NOT EXISTS. NO table   ##
-- ##  DDL, NO column/privilege change, NO new public table. yav2-dev ONLY.     ##
-- ############################################################################
BEGIN;
DO $pre$
BEGIN
  IF to_regclass('public.audit_log') IS NULL OR to_regclass('public.audit_ingestion_failures') IS NULL THEN
    RAISE EXCEPTION '0026 PRECONDITION FAILED: base audit tables (0005) not present.';
  END IF;
END
$pre$;
CREATE INDEX IF NOT EXISTS idx_audit_log_actor       ON public.audit_log (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target      ON public.audit_log (target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_service     ON public.audit_log (actor_service);
CREATE INDEX IF NOT EXISTS idx_audit_log_client_uuid ON public.audit_log (client_uuid);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_name  ON public.audit_log (event_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_occurred    ON public.audit_log (occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_risk_time   ON public.audit_log (risk_tier, occurred_at DESC)
  WHERE risk_tier IN ('HIGH','CRITICAL');
CREATE INDEX IF NOT EXISTS idx_audit_fail_time ON public.audit_ingestion_failures (failed_at DESC);
DO $post$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_indexes WHERE schemaname='public'
    AND indexname IN ('idx_audit_log_actor','idx_audit_log_target','idx_audit_log_service',
                      'idx_audit_log_client_uuid','idx_audit_log_event_name','idx_audit_log_occurred',
                      'idx_audit_log_risk_time','idx_audit_fail_time');
  IF n <> 8 THEN RAISE EXCEPTION 'POST-CHECK FAILED: expected 8 Phase 4C audit indexes, found %.', n; END IF;
END
$post$;
COMMIT;
-- ##  END 0026 — rollback: 0026_phase4c_audit_indexes_rollback.sql            ##
