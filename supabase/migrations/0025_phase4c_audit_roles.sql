-- ############################################################################
-- ##  0025 — PHASE 4C — AUDIT ROLES (extend-in-place; additive; idempotent)   ##
-- ############################################################################
-- Renumbered 0023->0025 to avoid the T4 remediation package that has already
-- claimed logical migration numbers 0023 (grants) and 0024 (search_path) under
-- supabase/verification/remediation-t4/. Numbers 0025-0030 are free everywhere.
--
-- Creates the two dedicated NON-LOGIN audit roles WITHOUT changing any existing
-- ownership, grant or behaviour. Authority discovery (yav2-dev, read-only, PASS):
-- postgres, rolsuper=false, rolcreaterole=true, eligible=true, both roles absent.
-- Target (future run): yav2-dev / ogjrwemjefvccpyjwxuo ONLY. PROHIBITED: V1/Prod.
-- ############################################################################
BEGIN;

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_owner') THEN
    CREATE ROLE audit_owner  NOLOGIN NOINHERIT NOCREATEROLE NOCREATEDB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_writer') THEN
    CREATE ROLE audit_writer NOLOGIN NOINHERIT NOCREATEROLE NOCREATEDB;
  END IF;
END
$roles$;

DO $post$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_owner'  AND rolcanlogin = false AND rolsuper = false)
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_writer' AND rolcanlogin = false AND rolsuper = false) THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: audit_owner/audit_writer must exist as NOLOGIN, non-superuser roles.';
  END IF;
END
$post$;

COMMIT;
-- ##  END 0025 — rollback: 0025_phase4c_audit_roles_rollback.sql              ##
