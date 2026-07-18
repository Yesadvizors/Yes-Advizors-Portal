-- ============================================================================
--  YAV2 — Module 1 — M1-B D2b TRANSACTIONAL FUNCTIONAL TEST KIT          Rev 2
--  File: supabase/verification/M1B_D2b_transactional_functional_tests.sql
--
--  TARGET  : V2 / yav2-dev ONLY — ogjrwemjefvccpyjwxuo.
--  RUN ONLY: after migration 0017 is installed AND with explicit gate approval.
--  RUNTIME : Supabase SQL Editor, connected as postgres (BYPASSRLS — asserted).
--
--  DESIGN (fail-safe by construction):
--    * Section S0 (pre-run snapshot) and the GUARD run BEFORE the transaction, so a
--      guard failure leaves NO open transaction.
--    * ALL test activity happens inside ONE transaction that ALWAYS ends in ROLLBACK
--      — the script contains no COMMIT. Nothing persists: not the synthetic team
--      rows, not the test clients, not one audit_log row.
--    * Every test records PASS/FAIL into a temp results table; expected-error tests
--      PASS only on the EXACT expected error; any unexpected outcome records FAIL
--      with the real SQLERRM (fail closed — nothing is silently swallowed).
--    * The script never RAISEs at top level after BEGIN (a mid-script exception in
--      the SQL Editor would strand an aborted transaction); the VERDICT row + the
--      post-rollback snapshot S9 are the authoritative outputs.
--
--  SYNTHETIC DATA ONLY: principals are generated UUIDs with @example.invalid emails;
--  clients are named 'YAV2 D2B TEST …' with is_test_client = true, is_draft = true.
--  No real business row is read for writes; protected rows are never modified.
--
--  IDENTITY SIMULATION: auth.uid() is driven via transaction-local
--  set_config('request.jwt.claim.sub' / 'request.jwt.claims'), and privilege closure
--  via SET LOCAL ROLE authenticated/anon. This exercises the RPC guards and grants
--  EXACTLY as PostgREST would resolve them, but it is NOT a real GoTrue JWT flow —
--  the residual runtime cases are listed in the MANUAL RUNTIME TEST MATRIX at the
--  bottom and are NOT claimed as executed here.
--
--  ⚠ PROJECT GUARD — VISUALLY CONFIRM the dashboard shows ogjrwemjefvccpyjwxuo, then:
--        SET yav2.confirm_project = 'ogjrwemjefvccpyjwxuo';
-- ============================================================================

-- ---------------------------------------------------------------------------
-- S0 — PRE-RUN SNAPSHOT (read-only, outside the transaction).
--      Record these numbers; S9 after the rollback MUST be identical.
-- ---------------------------------------------------------------------------
SELECT 'S0_PRE_RUN_SNAPSHOT' AS marker,
       (SELECT count(*) FROM public.audit_log)               AS audit_log_rows,
       (SELECT count(*) FROM public.clients)                 AS clients_rows,
       (SELECT count(*) FROM public.team)                    AS team_rows,
       (SELECT count(*) FROM public.client_persons)          AS client_persons_rows,
       (SELECT count(*) FROM public.client_identifiers)      AS client_identifiers_rows,
       (SELECT count(*) FROM public.client_contacts)         AS client_contacts_rows,
       (SELECT count(*) FROM public.client_addresses)        AS client_addresses_rows,
       (SELECT count(*) FROM public.client_relationships)    AS client_relationships_rows,
       (SELECT count(*) FROM public.client_registrations)    AS client_registrations_rows,
       (SELECT count(*) FROM public.gst_registration_details) AS gst_rows,
       (SELECT count(*) FROM public.accounting_tracker)      AS accounting_tracker,
       (SELECT count(*) FROM public.financials_tracker)      AS financials_tracker,
       (SELECT count(*) FROM public.income_tax_tracker)      AS income_tax_tracker,
       (SELECT count(*) FROM public.compliance_calendar)     AS compliance_calendar;

-- ---------------------------------------------------------------------------
-- GUARD (outside the transaction; a failure here leaves nothing open).
-- ---------------------------------------------------------------------------
DO $guard$
DECLARE v_missing text;
BEGIN
  IF current_setting('yav2.confirm_project', true) IS DISTINCT FROM 'ogjrwemjefvccpyjwxuo' THEN
    RAISE EXCEPTION E'STOP: project not attested.\nRun:  SET yav2.confirm_project = ''ogjrwemjefvccpyjwxuo'';';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolbypassrls) THEN
    RAISE EXCEPTION 'STOP: current_user % lacks BYPASSRLS; run as postgres in the SQL Editor.', current_user;
  END IF;
  -- 0017 must be installed: all 22 RPCs at exact signatures.
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
    RAISE EXCEPTION E'STOP: 0017 not (fully) installed — missing:\n  %', v_missing;
  END IF;
  -- The 8 audit events the RPCs emit must be in the contract.
  SELECT string_agg(e, ', ') INTO v_missing
  FROM unnest(ARRAY['person.changed','identifier.changed','contact.changed','address.changed',
                    'relationship.changed','gst_detail.changed','registration.added',
                    'registration.updated']) AS e
  WHERE NOT EXISTS (SELECT 1 FROM public.audit_event_contract WHERE event_name = e);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: audit event(s) missing from contract: %', v_missing;
  END IF;
  RAISE NOTICE 'D2b test-kit guard passed (attestation, BYPASSRLS, 22 RPCs, 8 events).';
END
$guard$;

-- ---------------------------------------------------------------------------
-- THE TEST TRANSACTION — everything below until ROLLBACK is discarded.
-- ---------------------------------------------------------------------------
BEGIN;

CREATE TEMP TABLE _t_results (
  seq      integer PRIMARY KEY,
  test_id  text NOT NULL,
  name     text NOT NULL,
  outcome  text NOT NULL CHECK (outcome IN ('PASS','FAIL')),
  detail   text
) ON COMMIT DROP;

-- Identity helper: transaction-local JWT-claim simulation.
CREATE FUNCTION pg_temp.d2b_as_user(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $h$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', p_uid::text, true);
END $h$;

DO $tests$
DECLARE
  -- principals
  u_admin uuid := gen_random_uuid(); u_mgr   uuid := gen_random_uuid();
  u_staff uuid := gen_random_uuid(); u_exec  uuid := gen_random_uuid();
  u_view  uuid := gen_random_uuid(); u_inact uuid := gen_random_uuid();
  -- data ids
  c1 uuid; c2 uuid; p1 uuid; p2 uuid; p3 uuid; ct1 uuid; ad1 uuid; rel1 uuid;
  reg1 jsonb; reg2 jsonb; reg_lic jsonb; idf1 uuid;
  v_seq int := 0; v_rv int; v_cnt int; v_base_audit bigint; v_js jsonb;
  v_expected_ct int;
BEGIN
  SELECT count(*) INTO v_base_audit FROM public.audit_log;

  -- ---- synthetic principals (team) — rolled back with everything else ------
  INSERT INTO public.team (name, email, portal_role, is_active, auth_user_id) VALUES
    ('YAV2 D2B TEST ADMIN',    'yav2.d2b.admin@example.invalid',    'Admin',     true,  u_admin),
    ('YAV2 D2B TEST MANAGER',  'yav2.d2b.manager@example.invalid',  'Manager',   true,  u_mgr),
    ('YAV2 D2B TEST STAFF',    'yav2.d2b.staff@example.invalid',    'Staff',     true,  u_staff),
    ('YAV2 D2B TEST EXEC',     'yav2.d2b.exec@example.invalid',     'Executive', true,  u_exec),
    ('YAV2 D2B TEST VIEWER',   'yav2.d2b.viewer@example.invalid',   'Viewer',    true,  u_view),
    ('YAV2 D2B TEST INACTIVE', 'yav2.d2b.inactive@example.invalid', 'Admin',     false, u_inact);

  -- ---- synthetic clients ---------------------------------------------------
  INSERT INTO public.clients (name, is_test_client, is_draft)
  VALUES ('YAV2 D2B TEST CLIENT ONE', true, true) RETURNING id INTO c1;
  INSERT INTO public.clients (name, is_test_client, is_draft)
  VALUES ('YAV2 D2B TEST CLIENT TWO', true, true) RETURNING id INTO c2;

  PERFORM pg_temp.d2b_as_user(u_admin);

  -- =========================================================================
  -- Item 1 — Admin valid create for each RPC family (T01..T08)
  -- =========================================================================
  v_seq := v_seq + 1;
  BEGIN
    p1 := public.client_person_create(c1,'Director','Test Person One','Director',
            'ABCDE1234F','12345678','9876543210','person.one@example.invalid','Indian',true,DATE '2020-04-01',NULL);
    SELECT row_version INTO v_rv FROM public.client_persons WHERE id = p1;
    IF v_rv = 1 THEN INSERT INTO _t_results VALUES (v_seq,'T01','person create (admin)','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T01','person create (admin)','FAIL','row_version='||coalesce(v_rv::text,'null')); END IF;
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T01','person create (admin)','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;
  BEGIN
    idf1 := public.client_identifier_create(c1,'CIN','U12345MH2020PTC123456',DATE '2020-04-01','Active');
    INSERT INTO _t_results VALUES (v_seq,'T02','identifier create CIN (admin)','PASS',NULL);
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T02','identifier create CIN (admin)','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;
  BEGIN
    ct1 := public.client_contact_create(c1,'Primary','Contact One','Accounts',
             'contact.one@example.invalid','9876500000',true,p1);
    INSERT INTO _t_results VALUES (v_seq,'T03','contact create linked person (admin)','PASS',NULL);
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T03','contact create linked person (admin)','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;
  BEGIN
    ad1 := public.client_address_create(c1,'Registered','1 Test Street','Area','Mumbai','Maharashtra','India','400001',true,DATE '2020-04-01',NULL);
    INSERT INTO _t_results VALUES (v_seq,'T04','address create (admin)','PASS',NULL);
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T04','address create (admin)','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;
  BEGIN
    rel1 := public.client_relationship_create(c1,c2,NULL,'Holding',51.00,DATE '2020-04-01',NULL);
    INSERT INTO _t_results VALUES (v_seq,'T05','relationship create (admin)','PASS',NULL);
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T05','relationship create (admin)','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;
  BEGIN
    reg1 := public.client_registration_create(c1,'IN_GST','IN','TEST-GST-1','Active',DATE '2020-04-01',NULL,DATE '2020-04-01');
    IF (reg1->>'id') IS NOT NULL AND (reg1->>'row_version')::int = 1 THEN
      INSERT INTO _t_results VALUES (v_seq,'T06','registration create returns {id,row_version} (admin)','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T06','registration create returns {id,row_version} (admin)','FAIL',reg1::text); END IF;
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T06','registration create returns {id,row_version} (admin)','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM public.gst_detail_create((reg1->>'id')::uuid,'27ABCDE1234F1Z5','27','Monthly',false,DATE '2020-04-01',NULL);
    INSERT INTO _t_results VALUES (v_seq,'T07','gst_detail create on IN_GST header (admin)','PASS',NULL);
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T07','gst_detail create on IN_GST header (admin)','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;   -- Item 16: atomic registration + GST creation
  BEGIN
    reg2 := public.client_registration_create_with_gst(c1,'IN_GST','IN','TEST-GST-2','Active',
              DATE '2021-04-01',NULL,DATE '2021-04-01','29ABCDE1234F1Z3','29','Quarterly_QRMP',false,DATE '2021-04-01',NULL);
    IF (reg2->>'registration_id') IS NOT NULL
       AND (reg2->>'header_row_version')::int = 1 AND (reg2->>'gst_row_version')::int = 1
       AND EXISTS (SELECT 1 FROM public.gst_registration_details WHERE registration_id = (reg2->>'registration_id')::uuid) THEN
      INSERT INTO _t_results VALUES (v_seq,'T08','create_with_gst atomic both rows + both versions','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T08','create_with_gst atomic both rows + both versions','FAIL',reg2::text); END IF;
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T08','create_with_gst atomic both rows + both versions','FAIL',SQLERRM); END;

  -- =========================================================================
  -- Items 2/3 — update + row_version increment; lifecycle (T09..T11)
  -- =========================================================================
  v_seq := v_seq + 1;
  BEGIN
    v_rv := public.client_person_update(p1,1,'Director','Test Person One Renamed','Director',
              'ABCDE1234F','12345678','9876543210','person.one@example.invalid','Indian',true,DATE '2020-04-01',NULL);
    SELECT row_version INTO v_cnt FROM public.client_persons WHERE id = p1;
    IF v_rv = 2 AND v_cnt = 2 THEN INSERT INTO _t_results VALUES (v_seq,'T09','person update increments row_version exactly once','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T09','person update increments row_version exactly once','FAIL','returned='||v_rv||' stored='||v_cnt); END IF;
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T09','person update increments row_version exactly once','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;
  BEGIN
    v_rv := public.client_person_set_active(p1,false,2);
    IF v_rv = 3 AND EXISTS (SELECT 1 FROM public.client_persons WHERE id=p1 AND is_active=false) THEN
      INSERT INTO _t_results VALUES (v_seq,'T10','person set_active(false) lifecycle DISABLE','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T10','person set_active(false) lifecycle DISABLE','FAIL','rv='||v_rv); END IF;
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T10','person set_active(false) lifecycle DISABLE','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;
  BEGIN
    v_rv := public.client_registration_set_active((reg1->>'id')::uuid,false,1);
    v_rv := public.client_registration_set_active((reg1->>'id')::uuid,true,2);
    IF v_rv = 3 THEN INSERT INTO _t_results VALUES (v_seq,'T11','registration set_active DISABLE then ENABLE','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T11','registration set_active DISABLE then ENABLE','FAIL','rv='||v_rv); END IF;
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T11','registration set_active DISABLE then ENABLE','FAIL',SQLERRM); END;

  -- =========================================================================
  -- Items 4/5/24 — stale version, missing row, simulated concurrency (T12..T13b)
  -- =========================================================================
  v_seq := v_seq + 1;
  BEGIN
    PERFORM public.client_person_update(p1,1,'Director','X','D',NULL,NULL,NULL,NULL,'Indian',true,NULL,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T12','stale row_version rejected','FAIL','no error raised');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'STALE_ROW_VERSION' THEN INSERT INTO _t_results VALUES (v_seq,'T12','stale row_version rejected','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T12','stale row_version rejected','FAIL',SQLERRM); END IF; END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM public.client_person_update(gen_random_uuid(),1,'Director','X','D',NULL,NULL,NULL,NULL,'Indian',true,NULL,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T13','missing row rejected (ROW_NOT_FOUND)','FAIL','no error raised');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'ROW_NOT_FOUND' THEN INSERT INTO _t_results VALUES (v_seq,'T13','missing row rejected (ROW_NOT_FOUND)','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T13','missing row rejected (ROW_NOT_FOUND)','FAIL',SQLERRM); END IF; END;

  v_seq := v_seq + 1;   -- Item 24: two-writer simulation on a fresh row
  BEGIN
    p3 := public.client_person_create(c1,'Director','Concurrency Probe',NULL,NULL,NULL,NULL,NULL,'Indian',false,NULL,NULL);
    v_rv := public.client_person_update(p3,1,'Director','Writer A wins',NULL,NULL,NULL,NULL,NULL,'Indian',false,NULL,NULL); -- rv 1->2
    BEGIN
      PERFORM public.client_person_update(p3,1,'Director','Writer B stale',NULL,NULL,NULL,NULL,NULL,'Indian',false,NULL,NULL);
      INSERT INTO _t_results VALUES (v_seq,'T13b','simulated concurrent stale update rejected','FAIL','second writer succeeded');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM ~ 'STALE_ROW_VERSION' AND v_rv = 2 THEN INSERT INTO _t_results VALUES (v_seq,'T13b','simulated concurrent stale update rejected','PASS',NULL);
      ELSE INSERT INTO _t_results VALUES (v_seq,'T13b','simulated concurrent stale update rejected','FAIL',SQLERRM); END IF; END;
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T13b','simulated concurrent stale update rejected','FAIL',SQLERRM); END;

  -- =========================================================================
  -- Items 6-13 — validation rejections (T14..T23)
  -- =========================================================================
  v_seq := v_seq + 1;
  BEGIN
    PERFORM public.client_person_create(c1,'Director','Bad PAN Person',NULL,'BADPAN',NULL,NULL,NULL,'Indian',false,NULL,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T14','invalid PAN rejected','FAIL','no error raised');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'INVALID_PAN_FORMAT' THEN INSERT INTO _t_results VALUES (v_seq,'T14','invalid PAN rejected','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T14','invalid PAN rejected','FAIL',SQLERRM); END IF; END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM public.client_identifier_create(c1,'AADHAAR','XX99',NULL,'Active');
    INSERT INTO _t_results VALUES (v_seq,'T15','Aadhaar identifier TYPE rejected','FAIL','no error raised');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'AADHAAR_IDENTIFIER_NOT_ALLOWED' THEN INSERT INTO _t_results VALUES (v_seq,'T15','Aadhaar identifier TYPE rejected','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T15','Aadhaar identifier TYPE rejected','FAIL',SQLERRM); END IF; END;

  -- T16 (final ruling): a 12-digit value under a NON-Aadhaar id_type is ACCEPTED —
  -- there is no length-only Aadhaar heuristic (former AADHAAR_VALUE_NOT_ALLOWED removed).
  v_seq := v_seq + 1;
  BEGIN
    PERFORM public.client_identifier_create(c1,'OTHER','1234 5678 9012',NULL,'Active');
    INSERT INTO _t_results VALUES (v_seq,'T16','12-digit value under non-Aadhaar type ACCEPTED (no length-only reject)','PASS',NULL);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _t_results VALUES (v_seq,'T16','12-digit value under non-Aadhaar type ACCEPTED (no length-only reject)','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM public.gst_detail_update((reg1->>'id')::uuid,1,'NOT-A-GSTIN','27','Monthly',false,NULL,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T17','invalid GSTIN rejected','FAIL','no error raised');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'INVALID_GSTIN_FORMAT' THEN INSERT INTO _t_results VALUES (v_seq,'T17','invalid GSTIN rejected','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T17','invalid GSTIN rejected','FAIL',SQLERRM); END IF; END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM public.gst_detail_update((reg1->>'id')::uuid,1,'29ABCDE1234F1Z3','27','Monthly',false,NULL,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T18','GSTIN/state_code mismatch rejected','FAIL','no error raised');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'GSTIN_STATE_CODE_MISMATCH' THEN INSERT INTO _t_results VALUES (v_seq,'T18','GSTIN/state_code mismatch rejected','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T18','GSTIN/state_code mismatch rejected','FAIL',SQLERRM); END IF; END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM public.client_address_create(c1,'Registered','2 Test Street',NULL,'Mumbai','MH','India','400001',false,DATE '2024-01-01',DATE '2023-01-01');
    INSERT INTO _t_results VALUES (v_seq,'T19','address effective_to < effective_from rejected','FAIL','no error raised');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'EFFECTIVE_TO_BEFORE_FROM' THEN INSERT INTO _t_results VALUES (v_seq,'T19','address effective_to < effective_from rejected','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T19','address effective_to < effective_from rejected','FAIL',SQLERRM); END IF; END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM public.client_relationship_create(c1,c2,NULL,'Holding',150,NULL,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T20','ownership_pct > 100 rejected','FAIL','no error raised');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'OWNERSHIP_PCT_OUT_OF_RANGE' THEN INSERT INTO _t_results VALUES (v_seq,'T20','ownership_pct > 100 rejected','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T20','ownership_pct > 100 rejected','FAIL',SQLERRM); END IF; END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM public.client_relationship_create(c1,c1,NULL,'Group',NULL,NULL,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T21','self-relationship rejected','FAIL','no error raised');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'SELF_RELATIONSHIP_NOT_ALLOWED' THEN INSERT INTO _t_results VALUES (v_seq,'T21','self-relationship rejected','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T21','self-relationship rejected','FAIL',SQLERRM); END IF; END;

  v_seq := v_seq + 1;
  BEGIN
    p2 := public.client_person_create(c2,'Director','Client Two Person',NULL,NULL,NULL,NULL,NULL,'Indian',false,NULL,NULL);
    BEGIN
      PERFORM public.client_contact_create(c1,'Primary','Cross Link',NULL,NULL,'9876511111',false,p2);
      INSERT INTO _t_results VALUES (v_seq,'T22','linked person from ANOTHER client rejected','FAIL','no error raised');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM ~ 'LINKED_PERSON_NOT_FOUND_FOR_CLIENT' THEN INSERT INTO _t_results VALUES (v_seq,'T22','linked person from ANOTHER client rejected','PASS',NULL);
      ELSE INSERT INTO _t_results VALUES (v_seq,'T22','linked person from ANOTHER client rejected','FAIL',SQLERRM); END IF; END;
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T22','linked person from ANOTHER client rejected','FAIL','setup: '||SQLERRM); END;

  v_seq := v_seq + 1;   -- P14: GST detail on a non-GST header
  BEGIN
    reg_lic := public.client_registration_create(c1,'LICENCE','IN','TEST-LIC-1','Active',NULL,NULL,NULL);
    BEGIN
      PERFORM public.gst_detail_create((reg_lic->>'id')::uuid,'27ABCDE1234F1Z5','27','Monthly',false,NULL,NULL);
      INSERT INTO _t_results VALUES (v_seq,'T23','GST detail on non-IN_GST header rejected','FAIL','no error raised');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM ~ 'GST_HEADER_TYPE_MISMATCH' THEN INSERT INTO _t_results VALUES (v_seq,'T23','GST detail on non-IN_GST header rejected','PASS',NULL);
      ELSE INSERT INTO _t_results VALUES (v_seq,'T23','GST detail on non-IN_GST header rejected','FAIL',SQLERRM); END IF; END;
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T23','GST detail on non-IN_GST header rejected','FAIL','setup: '||SQLERRM); END;

  -- =========================================================================
  -- Item 14 — audit events + change_type_code correctness (T24)
  -- =========================================================================
  v_seq := v_seq + 1;
  BEGIN
    -- Successful ops so far and their expected (event, action, change_type):
    --  T01 person.changed/CREATE/CREATED · T02 identifier.changed/CREATE/CREATED
    --  T03 contact.changed/CREATE/CREATED · T04 address.changed/CREATE/CREATED
    --  T05 relationship.changed/CREATE/CREATED · T06 registration.added/CREATE/CREATED
    --  T07 gst_detail.changed/CREATE/CREATED · T08 registration.added + gst_detail.changed (CREATED x2)
    --  T09 person.changed/UPDATE/UPDATED · T10 person.changed/UPDATE/DISABLED
    --  T11 registration.updated/UPDATE/DISABLED + ENABLED · T13b person.changed CREATE + UPDATE
    --  T22 setup person.changed/CREATE (client c2) · T23 setup registration.added/CREATE
    SELECT count(*) INTO v_cnt FROM public.audit_log a
    WHERE a.client_uuid IN (c1,c2)
      AND a.event_name IN ('person.changed','identifier.changed','contact.changed','address.changed',
                           'relationship.changed','gst_detail.changed','registration.added','registration.updated')
      AND a.actor_user_id IN (u_admin)
      AND a.action IN ('CREATE','UPDATE')
      AND (a.metadata->>'change_type_code') IN ('CREATED','UPDATED','ENABLED','DISABLED');
    -- T01..T07 = 7 · T08 = 2 · T09 = 1 · T10 = 1 · T11 = 2 · T13b = 2 (create+update)
    -- · T22 setup = 1 · T23 setup = 1  →  17 audited writes in total.
    v_expected_ct := 17;
    IF v_cnt = v_expected_ct
       AND EXISTS (SELECT 1 FROM public.audit_log WHERE client_uuid=c1 AND event_name='person.changed'
                     AND action='UPDATE' AND metadata->>'change_type_code'='DISABLED' AND resource_id=p1::text)
       AND EXISTS (SELECT 1 FROM public.audit_log WHERE client_uuid=c1 AND event_name='registration.updated'
                     AND action='UPDATE' AND metadata->>'change_type_code'='ENABLED')
       AND EXISTS (SELECT 1 FROM public.audit_log WHERE client_uuid=c1 AND event_name='registration.added'
                     AND action='CREATE' AND metadata->>'change_type_code'='CREATED') THEN
      INSERT INTO _t_results VALUES (v_seq,'T24','audit events/action/change_type_code correct (18 rows)','PASS',NULL);
    ELSE
      INSERT INTO _t_results VALUES (v_seq,'T24','audit events/action/change_type_code correct (18 rows)','FAIL',
        'expected '||v_expected_ct||' matching rows, found '||v_cnt);
    END IF;
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T24','audit events/action/change_type_code correct (18 rows)','FAIL',SQLERRM); END;

  -- =========================================================================
  -- Items 15/17 — atomicity when the audit layer rejects (T25, T26)
  -- =========================================================================
  v_seq := v_seq + 1;
  BEGIN
    BEGIN
      DELETE FROM public.audit_event_contract WHERE event_name = 'person.changed';
      PERFORM public.client_person_create(c1,'Director','ATOMIC PROBE',NULL,NULL,NULL,NULL,NULL,'Indian',false,NULL,NULL);
      RAISE EXCEPTION 'D2B_TEST_NO_ERROR';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'D2B_TEST_NO_ERROR' THEN
        INSERT INTO _t_results VALUES (v_seq,'T25','audit rejection rolls back the data write','FAIL','create succeeded without contract');
      ELSE
        -- sub-block rolled back: contract row restored AND person row must NOT exist
        IF NOT EXISTS (SELECT 1 FROM public.client_persons WHERE full_name='ATOMIC PROBE')
           AND EXISTS (SELECT 1 FROM public.audit_event_contract WHERE event_name='person.changed') THEN
          INSERT INTO _t_results VALUES (v_seq,'T25','audit rejection rolls back the data write','PASS',NULL);
        ELSE
          INSERT INTO _t_results VALUES (v_seq,'T25','audit rejection rolls back the data write','FAIL','partial state survived');
        END IF;
      END IF;
    END;
  END;

  v_seq := v_seq + 1;
  BEGIN
    BEGIN
      DELETE FROM public.audit_event_contract WHERE event_name = 'gst_detail.changed';
      PERFORM public.client_registration_create_with_gst(c1,'IN_GST','IN','TEST-GST-3','Active',
                NULL,NULL,NULL,'27ABCDE1234F1Z5','27','Monthly',false,NULL,NULL);
      RAISE EXCEPTION 'D2B_TEST_NO_ERROR';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'D2B_TEST_NO_ERROR' THEN
        INSERT INTO _t_results VALUES (v_seq,'T26','create_with_gst leaves NO partial header on GST/audit failure','FAIL','succeeded without contract');
      ELSE
        IF NOT EXISTS (SELECT 1 FROM public.client_registrations WHERE reg_number='TEST-GST-3')
           AND EXISTS (SELECT 1 FROM public.audit_event_contract WHERE event_name='gst_detail.changed') THEN
          INSERT INTO _t_results VALUES (v_seq,'T26','create_with_gst leaves NO partial header on GST/audit failure','PASS',NULL);
        ELSE
          INSERT INTO _t_results VALUES (v_seq,'T26','create_with_gst leaves NO partial header on GST/audit failure','FAIL','partial header row survived');
        END IF;
      END IF;
    END;
  END;

  -- =========================================================================
  -- Items 18-23 — privilege closure and role guards (T27..T33)
  -- =========================================================================
  v_seq := v_seq + 1;
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    INSERT INTO public.client_persons (client_id, full_name) VALUES (c1,'DIRECT INSERT PROBE');
    EXECUTE 'RESET ROLE';
    INSERT INTO _t_results VALUES (v_seq,'T27','direct authenticated INSERT denied','FAIL','insert succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO _t_results VALUES (v_seq,'T27','direct authenticated INSERT denied','PASS',NULL);
  WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T27','direct authenticated INSERT denied','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    UPDATE public.client_persons SET designation='DIRECT UPDATE PROBE' WHERE id = p1;
    EXECUTE 'RESET ROLE';
    INSERT INTO _t_results VALUES (v_seq,'T28','direct authenticated UPDATE denied','FAIL','update succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO _t_results VALUES (v_seq,'T28','direct authenticated UPDATE denied','PASS',NULL);
  WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T28','direct authenticated UPDATE denied','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;
  BEGIN
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM public.client_person_set_active(p1,true,3);
    EXECUTE 'RESET ROLE';
    INSERT INTO _t_results VALUES (v_seq,'T29','anon RPC EXECUTE denied','FAIL','call succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO _t_results VALUES (v_seq,'T29','anon RPC EXECUTE denied','PASS',NULL);
  WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T29','anon RPC EXECUTE denied','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM pg_temp.d2b_as_user(u_inact);
    PERFORM public.client_contact_create(c1,'Primary','Inactive Probe',NULL,NULL,'9876522222',false,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T30','inactive user denied','FAIL','call succeeded');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'NOT_AUTHORISED_INACTIVE' THEN INSERT INTO _t_results VALUES (v_seq,'T30','inactive user denied','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T30','inactive user denied','FAIL',SQLERRM); END IF; END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM pg_temp.d2b_as_user(u_staff);
    PERFORM public.client_contact_create(c1,'Primary','Staff Probe',NULL,NULL,'9876533333',false,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T31a','Staff denied','FAIL','call succeeded');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'NOT_AUTHORISED' AND SQLERRM !~ 'INACTIVE' THEN INSERT INTO _t_results VALUES (v_seq,'T31a','Staff denied','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T31a','Staff denied','FAIL',SQLERRM); END IF; END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM pg_temp.d2b_as_user(u_exec);
    PERFORM public.client_contact_create(c1,'Primary','Exec Probe',NULL,NULL,'9876544444',false,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T31b','Executive denied','FAIL','call succeeded');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'NOT_AUTHORISED' AND SQLERRM !~ 'INACTIVE' THEN INSERT INTO _t_results VALUES (v_seq,'T31b','Executive denied','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T31b','Executive denied','FAIL',SQLERRM); END IF; END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM pg_temp.d2b_as_user(u_view);
    PERFORM public.client_contact_create(c1,'Primary','Viewer Probe',NULL,NULL,'9876555555',false,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T31c','Viewer denied','FAIL','call succeeded');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'NOT_AUTHORISED' AND SQLERRM !~ 'INACTIVE' THEN INSERT INTO _t_results VALUES (v_seq,'T31c','Viewer denied','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T31c','Viewer denied','FAIL',SQLERRM); END IF; END;

  v_seq := v_seq + 1;
  BEGIN
    PERFORM pg_temp.d2b_as_user(u_mgr);
    PERFORM public.client_contact_create(c1,'Accounts','Manager Allowed Probe',NULL,NULL,'9876566666',false,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T32','Manager allowed (create succeeds)','PASS',NULL);
  EXCEPTION WHEN OTHERS THEN INSERT INTO _t_results VALUES (v_seq,'T32','Manager allowed (create succeeds)','FAIL',SQLERRM); END;

  v_seq := v_seq + 1;   -- null auth context: clear identity entirely
  BEGIN
    PERFORM set_config('request.jwt.claims','',true);
    PERFORM set_config('request.jwt.claim.sub','',true);
    PERFORM public.client_contact_create(c1,'Primary','NoAuth Probe',NULL,NULL,'9876577777',false,NULL);
    INSERT INTO _t_results VALUES (v_seq,'T33','null auth.uid() rejected (NO_AUTH_CONTEXT)','FAIL','call succeeded');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ 'NO_AUTH_CONTEXT' THEN INSERT INTO _t_results VALUES (v_seq,'T33','null auth.uid() rejected (NO_AUTH_CONTEXT)','PASS',NULL);
    ELSE INSERT INTO _t_results VALUES (v_seq,'T33','null auth.uid() rejected (NO_AUTH_CONTEXT)','FAIL',SQLERRM); END IF; END;

  RAISE NOTICE 'D2b functional tests recorded: % tests.', v_seq;
END
$tests$;

-- ---------------------------------------------------------------------------
-- RESULTS (visible before rollback) — the authoritative outcome of this run.
-- ---------------------------------------------------------------------------
SELECT seq, test_id, name, outcome, detail FROM _t_results ORDER BY seq;

SELECT 'D2B_TEST_VERDICT' AS marker,
       count(*)                                   AS total,
       count(*) FILTER (WHERE outcome = 'PASS')   AS passed,
       count(*) FILTER (WHERE outcome = 'FAIL')   AS failed,
       CASE WHEN count(*) FILTER (WHERE outcome = 'FAIL') = 0
            AND count(*) = 36   -- exact expected test count; fewer/more = FAIL (fail closed)
            THEN 'PASS' ELSE 'FAIL' END           AS verdict
FROM _t_results;

-- ---------------------------------------------------------------------------
-- MANDATORY ROLLBACK — nothing this kit did may persist.
-- ---------------------------------------------------------------------------
ROLLBACK;

-- ---------------------------------------------------------------------------
-- S9 — POST-ROLLBACK SNAPSHOT (must equal S0 exactly; compare before accepting
--      the run as evidence). Any difference = the run is INVALID evidence and the
--      discrepancy must be escalated.
-- ---------------------------------------------------------------------------
SELECT 'S9_POST_ROLLBACK_SNAPSHOT' AS marker,
       (SELECT count(*) FROM public.audit_log)               AS audit_log_rows,
       (SELECT count(*) FROM public.clients)                 AS clients_rows,
       (SELECT count(*) FROM public.team)                    AS team_rows,
       (SELECT count(*) FROM public.client_persons)          AS client_persons_rows,
       (SELECT count(*) FROM public.client_identifiers)      AS client_identifiers_rows,
       (SELECT count(*) FROM public.client_contacts)         AS client_contacts_rows,
       (SELECT count(*) FROM public.client_addresses)        AS client_addresses_rows,
       (SELECT count(*) FROM public.client_relationships)    AS client_relationships_rows,
       (SELECT count(*) FROM public.client_registrations)    AS client_registrations_rows,
       (SELECT count(*) FROM public.gst_registration_details) AS gst_rows,
       (SELECT count(*) FROM public.accounting_tracker)      AS accounting_tracker,
       (SELECT count(*) FROM public.financials_tracker)      AS financials_tracker,
       (SELECT count(*) FROM public.income_tax_tracker)      AS income_tax_tracker,
       (SELECT count(*) FROM public.compliance_calendar)     AS compliance_calendar;

-- ============================================================================
--  MANUAL RUNTIME TEST MATRIX — cases NOT executed by this kit (do not claim them):
--    M-1 Real-JWT admin login via the Preview app (P2) performs each RPC family
--        once against a PILOT/test client; verify audit rows appear.
--    M-2 REST probe with the anon key: POST /rest/v1/rpc/client_person_create
--        → expect 401/permission denied (gateway + EXECUTE closure).
--    M-3 Real Staff/Executive/Viewer JWT calling any D2b RPC → guard denial
--        surfaced to the UI as an authorization error (no write, no audit row
--        beyond denial semantics).
--    M-4 Two real browser sessions editing the same person → second save shows
--        the optimistic-lock conflict UX (STALE_ROW_VERSION surfaced).
--    M-5 service_role key REST probe → EXECUTE denied (not granted).
--  These belong to the P2 frontend checkpoint / UAT (P12) evidence, not to this
--  SQL kit; simulating them here would misrepresent gateway behaviour.
-- ============================================================================
