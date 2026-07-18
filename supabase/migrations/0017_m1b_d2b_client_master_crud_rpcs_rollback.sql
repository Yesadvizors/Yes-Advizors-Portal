-- ============================================================================
--  0017_m1b_d2b_client_master_crud_rpcs_ROLLBACK.sql          (M1-B / D2b — Rev 2)
--
--  TARGET : V2 / yav2-dev ONLY — ogjrwemjefvccpyjwxuo
--  RUNTIME: Supabase SQL Editor compatible (no psql meta-commands).
--
--  Reverses ONLY what 0017 created/changed, restoring the exact prior (post-0016)
--  state:
--    * DROPs the 22 D2b RPCs at their EXACT Rev 2 signatures (fail-closed: every
--      signature must exist, and no OTHER overload of these names may exist);
--    * RE-GRANTs INSERT, UPDATE on the seven affected base tables TO authenticated
--      (restoring the M1-A grant posture removed by 0017's bypass closure).
--
--  Changes NO data row and NO audit_log row; does not touch 0014/0015/0016,
--  V1/Production, trackers, overdue, compliance_calendar or FY logic. The audit
--  events and the audit_write_event helper (0016/M1-A) are NOT dropped.
--
--  ⚠ SECURITY CONSEQUENCE OF THIS ROLLBACK — read before running:
--    Restoring direct authenticated INSERT/UPDATE REOPENS the unaudited write path
--    that 0017 deliberately closed. RLS still restricts rows to active Admin/Manager
--    (0015 policies are unchanged), but direct writes made after this rollback will
--    NOT emit audit events, will NOT be format-validated, and will NOT be protected
--    by optimistic locking. This is a deliberate security REGRESSION to the M1-A
--    posture, acceptable only as a rollback position. Any rows already written via
--    the RPCs remain (data is never rolled back by this script) — only the write
--    PATH reverts.
--
--  Project guard: human attestation only — VISUALLY confirm ogjrwemjefvccpyjwxuo first.
--  ONE transaction; every check fail-closed.
-- ============================================================================

BEGIN;

DO $guard$
DECLARE v_missing text; v_unexpected text;
BEGIN
  IF current_setting('yav2.confirm_project', true) IS DISTINCT FROM 'ogjrwemjefvccpyjwxuo' THEN
    RAISE EXCEPTION E'STOP: run  SET yav2.confirm_project = ''ogjrwemjefvccpyjwxuo'';  first.';
  END IF;

  -- Fail closed: all 22 expected signatures must exist exactly as authored.
  SELECT string_agg(sig, E'\n  ') INTO v_missing FROM unnest(ARRAY[
    'public.client_person_create(uuid,text,text,text,text,text,text,text,text,boolean,date,date)',
    'public.client_person_update(uuid,integer,text,text,text,text,text,text,text,text,boolean,date,date)',
    'public.client_person_set_active(uuid,boolean,integer)',
    'public.client_identifier_create(uuid,text,text,date,text)',
    'public.client_identifier_update(uuid,integer,text,text,date,text)',
    'public.client_identifier_set_active(uuid,boolean,integer)',
    'public.client_contact_create(uuid,text,text,text,text,text,boolean,uuid)',
    'public.client_contact_update(uuid,integer,text,text,text,text,text,boolean,uuid)',
    'public.client_contact_set_active(uuid,boolean,integer)',
    'public.client_address_create(uuid,text,text,text,text,text,text,text,boolean,date,date)',
    'public.client_address_update(uuid,integer,text,text,text,text,text,text,text,boolean,date,date)',
    'public.client_address_set_active(uuid,boolean,integer)',
    'public.client_relationship_create(uuid,uuid,uuid,text,numeric,date,date)',
    'public.client_relationship_update(uuid,integer,uuid,uuid,text,numeric,date,date)',
    'public.client_relationship_set_active(uuid,boolean,integer)',
    'public.client_registration_create(uuid,text,text,text,text,date,date,date)',
    'public.client_registration_update(uuid,integer,text,text,text,text,date,date,date)',
    'public.client_registration_set_active(uuid,boolean,integer)',
    'public.gst_detail_create(uuid,text,text,text,boolean,date,date)',
    'public.gst_detail_update(uuid,integer,text,text,text,boolean,date,date)',
    'public.client_registration_create_with_gst(uuid,text,text,text,text,date,date,date,text,text,text,boolean,date,date)',
    'public.client_registration_update_with_gst(uuid,integer,text,text,text,text,date,date,date,integer,text,text,text,boolean,date,date)'
  ]) AS sig WHERE to_regprocedure(sig) IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION E'STOP: expected 0017 RPC signature(s) NOT found — state is not the authored Rev 2; reconcile under review before rollback:\n  %', v_missing;
  END IF;

  -- Fail closed: the 22 names must have EXACTLY 22 functions among them
  -- (no unexpected overloads/variants that this script would silently leave behind).
  SELECT string_agg(DISTINCT p.proname || ' (' || cnt || ' overloads)', ', ') INTO v_unexpected
  FROM (
    SELECT p.proname, count(*) OVER (PARTITION BY p.proname) AS cnt, p.oid
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'client_person_create','client_person_update','client_person_set_active',
      'client_identifier_create','client_identifier_update','client_identifier_set_active',
      'client_contact_create','client_contact_update','client_contact_set_active',
      'client_address_create','client_address_update','client_address_set_active',
      'client_relationship_create','client_relationship_update','client_relationship_set_active',
      'client_registration_create','client_registration_update','client_registration_set_active',
      'gst_detail_create','gst_detail_update',
      'client_registration_create_with_gst','client_registration_update_with_gst')
  ) p JOIN pg_proc pp ON pp.oid = p.oid
  WHERE p.cnt > 1;
  IF v_unexpected IS NOT NULL THEN
    RAISE EXCEPTION E'STOP: unexpected overload(s) of D2b RPC name(s) exist — reconcile under review:\n  %', v_unexpected;
  END IF;

  RAISE NOTICE 'D2b rollback preconditions passed: all 22 exact signatures present, no unexpected overloads.';
END
$guard$;

-- 1) Drop the 22 RPCs (exact signatures; existence proven above).
DROP FUNCTION public.client_person_create(uuid,text,text,text,text,text,text,text,text,boolean,date,date);
DROP FUNCTION public.client_person_update(uuid,integer,text,text,text,text,text,text,text,text,boolean,date,date);
DROP FUNCTION public.client_person_set_active(uuid,boolean,integer);
DROP FUNCTION public.client_identifier_create(uuid,text,text,date,text);
DROP FUNCTION public.client_identifier_update(uuid,integer,text,text,date,text);
DROP FUNCTION public.client_identifier_set_active(uuid,boolean,integer);
DROP FUNCTION public.client_contact_create(uuid,text,text,text,text,text,boolean,uuid);
DROP FUNCTION public.client_contact_update(uuid,integer,text,text,text,text,text,boolean,uuid);
DROP FUNCTION public.client_contact_set_active(uuid,boolean,integer);
DROP FUNCTION public.client_address_create(uuid,text,text,text,text,text,text,text,boolean,date,date);
DROP FUNCTION public.client_address_update(uuid,integer,text,text,text,text,text,text,text,boolean,date,date);
DROP FUNCTION public.client_address_set_active(uuid,boolean,integer);
DROP FUNCTION public.client_relationship_create(uuid,uuid,uuid,text,numeric,date,date);
DROP FUNCTION public.client_relationship_update(uuid,integer,uuid,uuid,text,numeric,date,date);
DROP FUNCTION public.client_relationship_set_active(uuid,boolean,integer);
DROP FUNCTION public.client_registration_create(uuid,text,text,text,text,date,date,date);
DROP FUNCTION public.client_registration_update(uuid,integer,text,text,text,text,date,date,date);
DROP FUNCTION public.client_registration_set_active(uuid,boolean,integer);
DROP FUNCTION public.gst_detail_create(uuid,text,text,text,boolean,date,date);
DROP FUNCTION public.gst_detail_update(uuid,integer,text,text,text,boolean,date,date);
DROP FUNCTION public.client_registration_create_with_gst(uuid,text,text,text,text,date,date,date,text,text,text,boolean,date,date);
DROP FUNCTION public.client_registration_update_with_gst(uuid,integer,text,text,text,text,date,date,date,integer,text,text,text,boolean,date,date);

-- 2) Restore ONLY the grants intentionally changed by 0017's bypass closure
--    (M1-A posture: authenticated may INSERT/UPDATE, still gated by unchanged RLS;
--    see the SECURITY CONSEQUENCE note in the header).
DO $restore$
DECLARE t text;
  affected text[] := ARRAY['client_persons','client_identifiers','client_contacts',
                           'client_addresses','client_relationships','client_registrations',
                           'gst_registration_details'];
BEGIN
  FOREACH t IN ARRAY affected LOOP
    EXECUTE format('GRANT INSERT, UPDATE ON public.%I TO authenticated', t);
  END LOOP;
END
$restore$;

-- 3) Post-conditions (fail closed): RPCs gone; M1-A grant posture restored; no data touched.
DO $post$
DECLARE v_left int; t text;
BEGIN
  SELECT count(*) INTO v_left
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN (
    'client_person_create','client_person_update','client_person_set_active',
    'client_identifier_create','client_identifier_update','client_identifier_set_active',
    'client_contact_create','client_contact_update','client_contact_set_active',
    'client_address_create','client_address_update','client_address_set_active',
    'client_relationship_create','client_relationship_update','client_relationship_set_active',
    'client_registration_create','client_registration_update','client_registration_set_active',
    'gst_detail_create','gst_detail_update',
    'client_registration_create_with_gst','client_registration_update_with_gst');
  IF v_left <> 0 THEN RAISE EXCEPTION 'ROLLBACK POST-CHECK FAILED: % D2b function(s) still present.', v_left; END IF;

  FOREACH t IN ARRAY ARRAY['client_persons','client_identifiers','client_contacts',
                           'client_addresses','client_relationships','client_registrations',
                           'gst_registration_details'] LOOP
    IF has_table_privilege('authenticated', ('public.'||t)::regclass, 'INSERT') IS DISTINCT FROM TRUE
       OR has_table_privilege('authenticated', ('public.'||t)::regclass, 'UPDATE') IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'ROLLBACK POST-CHECK FAILED: M1-A grant posture not restored on %.', t;
    END IF;
  END LOOP;

  RAISE NOTICE '=== D2b ROLLBACK COMPLETE: 22 RPCs dropped; authenticated INSERT/UPDATE restored on 7 tables (unaudited direct-write path is OPEN again — M1-A posture). ===';
END
$post$;

COMMIT;
