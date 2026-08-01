-- ############################################################################
-- ##  0029 — PHASE 4C — CANONICAL WRITER INTEGRATION (reconcile: keep base)   ##
-- ##  Renumbered 0027->0029. public.audit_write_event(text,text,text,text,     ##
-- ##  uuid,jsonb) (base 0016) REMAINS canonical: SECURITY DEFINER, validates    ##
-- ##  via audit_validate_event, and base REVOKEs ALL FROM PUBLIC, anon,         ##
-- ##  authenticated, service_role. No competing writer is introduced.           ##
-- ##  FAIL-CLOSED assertion; changes NO object/privilege/row. yav2-dev ONLY.    ##
-- ############################################################################
BEGIN;
DO $assert$
DECLARE
  v_secdef boolean;
  v_bad text;
BEGIN
  -- 1) canonical writer present (any overload)
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='audit_write_event') THEN
    RAISE EXCEPTION '0029 ASSERTION FAILED: canonical writer public.audit_write_event is absent.';
  END IF;

  -- 2) SECURITY DEFINER
  SELECT bool_or(p.prosecdef) INTO v_secdef
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='audit_write_event';
  IF v_secdef IS NOT TRUE THEN
    RAISE EXCEPTION '0029 ASSERTION FAILED: audit_write_event must be SECURITY DEFINER.';
  END IF;

  -- 3) NO EXECUTE for anon / authenticated / service_role  AND  NO EXECUTE for PUBLIC.
  --    aclexplode yields grantee=0 for PUBLIC; a NULL proacl means the built-in
  --    default (PUBLIC has EXECUTE) — acldefault('f',owner) surfaces that so the
  --    PUBLIC-default case is caught too.
  SELECT string_agg(DISTINCT label, ', ') INTO v_bad
  FROM (
    SELECT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE r.rolname END AS label
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
    LEFT JOIN pg_roles r ON r.oid = a.grantee
    WHERE n.nspname='public' AND p.proname='audit_write_event'
      AND a.privilege_type='EXECUTE'
      AND (a.grantee = 0 OR r.rolname IN ('anon','authenticated','service_role'))
  ) s;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION '0029 ASSERTION FAILED: audit_write_event has EXECUTE for disallowed grantee(s): %.', v_bad;
  END IF;

  -- 4) no competing Phase 4C writer/reader introduced
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public'
               AND p.proname IN ('log_audit_event_trusted_backend','_write_read_audit','_record_audit_failure')) THEN
    RAISE EXCEPTION '0029 ASSERTION FAILED: a competing Phase 4C writer/reader exists; only audit_write_event is canonical.';
  END IF;
END
$assert$;
COMMIT;
-- ##  END 0029 — rollback: 0029_phase4c_canonical_writer_reconcile_rollback.sql (no-op) ##
