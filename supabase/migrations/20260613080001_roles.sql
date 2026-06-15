-- =====================================================================
-- Phase 4C v7 — 20260613080001_roles.sql
-- STATUS: DRAFT / NOT APPLIED. Do not run. For review only.
-- =====================================================================
CREATE ROLE audit_owner  NOLOGIN NOINHERIT NOCREATEROLE NOCREATEDB;
CREATE ROLE audit_writer NOLOGIN NOINHERIT NOCREATEROLE NOCREATEDB;

COMMENT ON ROLE audit_owner  IS 'Phase 4C v7: NOLOGIN owner of audit tables + read/resolver/validation functions. No CREATE on any schema.';
COMMENT ON ROLE audit_writer IS 'Phase 4C v7: NOLOGIN owner of the trusted-backend writer; INSERT-only on audit tables. No CREATE on any schema.';
