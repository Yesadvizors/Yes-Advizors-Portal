-- ############################################################################
-- ##  0027 — PHASE 4C — VALIDATION & REDACTION FUNCTIONS (reconcile: retain)  ##
-- ##  Renumbered 0025->0027. The merged base (0007) ALREADY implements the     ##
-- ##  validation/redaction chain and it is load-bearing (audit_write_event ->  ##
-- ##  audit_validate_event). Base versions are RETAINED UNCHANGED. This is a    ##
-- ##  FAIL-CLOSED assertion; it changes NO object/privilege/row. yav2-dev ONLY.##
-- ############################################################################
BEGIN;
DO $assert$
DECLARE
  missing text := '';
  v_isuuid oid := to_regprocedure('public.audit_is_uuid(text)');
  r RECORD;
BEGIN
  IF to_regprocedure('public.audit_contains_secret(text)') IS NULL THEN missing := missing || ' audit_contains_secret(text)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='audit_field_format_ok') THEN missing := missing || ' audit_field_format_ok'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='audit_validate_event') THEN missing := missing || ' audit_validate_event'; END IF;

  -- EXACT audit_is_uuid signature: public.audit_is_uuid(p_text text) RETURNS boolean,
  -- LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER, search_path pinned (base 0007).
  -- text and uuid are NOT interchangeable: the (text) overload MUST exist.
  IF v_isuuid IS NULL THEN
    missing := missing || ' audit_is_uuid(text)';
  ELSE
    SELECT p.prorettype::regtype::text AS rettype, p.prosecdef, p.provolatile,
           COALESCE(array_to_string(p.proconfig, ','), '') AS cfg
      INTO r
    FROM pg_proc p WHERE p.oid = v_isuuid;
    IF r.rettype <> 'boolean' THEN missing := missing || ' audit_is_uuid:return<>boolean'; END IF;
    IF r.prosecdef IS NOT TRUE THEN missing := missing || ' audit_is_uuid:not_security_definer'; END IF;
    IF r.provolatile <> 'i' THEN missing := missing || ' audit_is_uuid:not_immutable'; END IF;
    IF position('search_path=' in r.cfg) = 0 THEN missing := missing || ' audit_is_uuid:search_path_not_pinned'; END IF;
  END IF;

  IF length(missing) > 0 THEN
    RAISE EXCEPTION '0027 ASSERTION FAILED: base validation/redaction requirement(s) unmet:%. Base 0007 chain required.', missing;
  END IF;
END
$assert$;
COMMIT;
-- ##  END 0027 — rollback: 0027_phase4c_audit_validation_reconcile_rollback.sql (no-op) ##
