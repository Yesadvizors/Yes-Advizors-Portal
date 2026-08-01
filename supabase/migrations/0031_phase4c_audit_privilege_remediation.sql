-- ############################################################################
-- ##  0031 — PHASE 4C — AUDIT TABLE PRIVILEGE REMEDIATION (revoke prohibited) ##
-- ############################################################################
-- Live gate (2026-08-01) found 72 prohibited direct grants: anon, authenticated and
-- service_role each hold DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER,
-- TRUNCATE, UPDATE on public.audit_log / audit_event_contract / audit_ingestion_failures.
--
-- ROOT CAUSE: the schema-public DEFAULT PRIVILEGES for BOTH postgres AND supabase_admin
-- grant those 8 privileges to anon/authenticated/service_role on every new table; the
-- audit tables (0005) inherited them at creation. No base migration granted them
-- explicitly. FORCE RLS blocks row DML/SELECT, but the OBJECT privileges (TRUNCATE,
-- REFERENCES, TRIGGER, MAINTAIN) are NOT RLS-gated — e.g. anon could TRUNCATE the audit
-- log. The intended model (0005/0006/0010) is default-deny + SECURITY DEFINER access.
--
-- This migration REVOKEs ALL direct privileges from PUBLIC, anon, authenticated and
-- service_role on the three audit tables. It grants NO replacement access. The table
-- owner (postgres) retains full access, so the SECURITY DEFINER functions
-- (get_sensitive_audit_logs / audit_write_event / _write_read_audit, owned by the
-- owner) continue to operate unchanged — no FUNCTION grant is touched here.
--
-- SCOPE NOTE: this fixes the THREE EXISTING audit tables only. The DEFAULT PRIVILEGES
-- themselves (which would re-expose FUTURE tables) are the Stage A remediation scope
-- (on hold; supabase_admin scope needs a Supabase-supported mechanism). The merged
-- migration privilege-hygiene guard prevents NEW public tables from re-exposing anon.
-- Target: yav2-dev ONLY. PROHIBITED: V1/Prod.
-- ############################################################################

BEGIN;

-- ── Precondition: the three audit tables exist ──────────────────────────────
DO $pre$
BEGIN
  IF to_regclass('public.audit_log') IS NULL
     OR to_regclass('public.audit_event_contract') IS NULL
     OR to_regclass('public.audit_ingestion_failures') IS NULL THEN
    RAISE EXCEPTION '0031 PRECONDITION FAILED: an audit table (0005) is missing.';
  END IF;
END
$pre$;

-- ── Revoke ALL direct privileges from the prohibited grantees (no replacement) ──
REVOKE ALL ON TABLE public.audit_log               FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.audit_event_contract    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.audit_ingestion_failures FROM PUBLIC, anon, authenticated, service_role;

-- ── Postcondition (fail-closed): ZERO prohibited direct grants remain ───────
DO $post$
DECLARE
  n int;
  bad text;
BEGIN
  SELECT count(*),
         string_agg(DISTINCT c.relname || ':' ||
           (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.rolname END) || ':' || a.privilege_type, ', ')
    INTO n, bad
  FROM pg_class c
  JOIN pg_namespace nsp ON nsp.oid=c.relnamespace AND nsp.nspname='public'
  CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
  LEFT JOIN pg_roles r ON r.oid=a.grantee
  WHERE c.relname IN ('audit_log','audit_event_contract','audit_ingestion_failures')
    AND (a.grantee=0 OR r.rolname IN ('anon','authenticated','service_role'));
  IF n <> 0 THEN
    RAISE EXCEPTION '0031 POST-CHECK FAILED: % prohibited grant(s) remain: %.', n, bad;
  END IF;

  -- owner + SECURITY DEFINER access path must remain intact
  IF to_regprocedure('public.get_sensitive_audit_logs(timestamp with time zone, timestamp with time zone, integer, integer, text, uuid)') IS NULL
     OR to_regprocedure('public.audit_write_event(text, text, text, text, uuid, jsonb)') IS NULL THEN
    RAISE EXCEPTION '0031 POST-CHECK FAILED: a SECURITY DEFINER audit access function is missing.';
  END IF;
END
$post$;

COMMIT;
-- ##  END 0031 — rollback: 0031_phase4c_audit_privilege_remediation_rollback.sql ##
