-- =====================================================================
-- Phase 4C v7 — 20260613080002_schema_grants.sql
-- STATUS: DRAFT / NOT APPLIED. Do not run. For review only.
-- =====================================================================
-- Explicit minimum schema/function privileges (finding #12). No reliance
-- on broad PUBLIC defaults. No CREATE on either schema for either role.
-- =====================================================================
GRANT USAGE ON SCHEMA public TO audit_owner, audit_writer;
GRANT USAGE ON SCHEMA auth   TO audit_owner, audit_writer;

REVOKE CREATE ON SCHEMA public FROM audit_owner, audit_writer;
REVOKE CREATE ON SCHEMA auth   FROM audit_owner, audit_writer;

GRANT EXECUTE ON FUNCTION auth.uid() TO audit_owner, audit_writer;
