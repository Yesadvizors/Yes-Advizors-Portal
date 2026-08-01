-- ############################################################################
-- ##  0025 ROLLBACK — PHASE 4C AUDIT ROLES                                     ##
-- ##  Inverse of 0025: drops audit_writer, audit_owner IF present. DROP ROLE   ##
-- ##  errors if the role still owns objects — run later rollbacks first.       ##
-- ############################################################################
BEGIN;
DO $rb$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_writer') THEN DROP ROLE audit_writer; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_owner')  THEN DROP ROLE audit_owner;  END IF;
END
$rb$;
DO $post$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('audit_owner','audit_writer')) THEN
    RAISE EXCEPTION 'ROLLBACK POST-CHECK FAILED: an audit role still exists (owns objects?).';
  END IF;
END
$post$;
COMMIT;
