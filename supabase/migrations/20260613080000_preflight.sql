-- =====================================================================
-- Phase 4C v7 — 20260613080000_preflight.sql
-- STATUS: DRAFT / NOT APPLIED. Do not run. For review only.
-- =====================================================================
-- COMPLETE collision preflight (finding #9). Inventory generated from the
-- final package (see docs/PHASE4C_OBJECT_INVENTORY.md). Covers roles,
-- tables, every function signature, every index, and audit-table policy
-- names. Aborts before any object is created on collision. Also asserts
-- auth.uid() is callable (finding #12).
-- =====================================================================

DO $$
DECLARE v_dummy uuid;
BEGIN
  -- roles
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('audit_owner','audit_writer')) THEN
    RAISE EXCEPTION 'Phase 4C preflight: audit_owner/audit_writer already exist; aborting';
  END IF;

  -- tables
  IF to_regclass('public.audit_log') IS NOT NULL
     OR to_regclass('public.audit_ingestion_failures') IS NOT NULL
     OR to_regclass('public.audit_event_contract') IS NOT NULL THEN
    RAISE EXCEPTION 'Phase 4C preflight: an audit_* table already exists; aborting';
  END IF;

  -- functions (every proposed function name)
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
      'get_app_role','get_app_role_for_user','staff_can_access_client',
      'audit_contains_secret','audit_is_uuid','audit_field_format_ok','audit_validate_event',
      '_record_audit_failure','log_audit_event_trusted_backend',
      '_write_read_audit','get_sensitive_audit_logs')
  ) THEN
    RAISE EXCEPTION 'Phase 4C preflight: an audit_* function already exists; aborting';
  END IF;

  -- indexes (every proposed index name)
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='i' AND c.relname IN (
      'idx_audit_log_actor','idx_audit_log_target','idx_audit_log_service',
      'idx_audit_log_client_uuid','idx_audit_log_event_name','idx_audit_log_occurred',
      'idx_audit_log_risk_time','idx_audit_fail_time')
  ) THEN
    RAISE EXCEPTION 'Phase 4C preflight: an audit_* index already exists; aborting';
  END IF;

  -- policies on the audit tables (should not pre-exist)
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('audit_log','audit_ingestion_failures')
  ) THEN
    RAISE EXCEPTION 'Phase 4C preflight: a policy already exists on an audit table; aborting';
  END IF;

  -- required privilege: auth.uid() callable
  BEGIN
    v_dummy := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Phase 4C preflight: auth.uid() is not callable in this database; aborting';
  END;
END
$$;
