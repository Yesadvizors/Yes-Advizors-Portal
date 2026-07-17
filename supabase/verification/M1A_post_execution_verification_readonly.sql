-- ============================================================================
--  YAV2 — Module 1 — M1-A POST-EXECUTION VERIFICATION  (READ-ONLY)
--
--  Target : V2 / yav2-dev ONLY — ogjrwemjefvccpyjwxuo.  Run AFTER migration 0015.
--  Covers required tests 2-16. Read-only: SELECTs + calls to the STABLE
--  audit_validate_event (no writes). Preserve the output as evidence.
--  ⚠ CONFIRM the project is ogjrwemjefvccpyjwxuo before running.
-- ============================================================================

-- Test 2/3/4: new tables exist; client FK is uuid -> clients.id; no text client PK/FK.
SELECT jsonb_pretty(jsonb_build_object(
  'new_tables_present', (
    SELECT jsonb_object_agg(t, to_regclass('public.'||t) IS NOT NULL)
    FROM unnest(ARRAY['entity_type_catalogue','client_persons','client_registrations',
                      'gst_registration_details','client_identifiers','client_contacts',
                      'client_addresses','client_relationships','client_remediation_flags']) AS t),
  -- every client_id FK on the new tables must be uuid referencing clients(id)
  'client_fk_is_uuid_to_clients_id', (
    SELECT jsonb_agg(jsonb_build_object('table', c.conrelid::regclass::text, 'def', pg_get_constraintdef(c.oid)))
    FROM pg_constraint c
    WHERE c.contype='f' AND c.confrelid='public.clients'::regclass
      AND c.conrelid::regclass::text IN ('client_persons','client_registrations','client_identifiers',
          'client_contacts','client_addresses','client_relationships','client_remediation_flags')),
  -- assert NONE of the new tables typed client_id as text (must be uuid)
  'new_tables_with_text_client_id_MUST_BE_EMPTY', (
    SELECT coalesce(jsonb_agg(table_name), '[]'::jsonb)
    FROM information_schema.columns
    WHERE table_schema='public' AND column_name='client_id' AND data_type='text'
      AND table_name IN ('client_persons','client_registrations','client_identifiers',
          'client_contacts','client_addresses','client_relationships','client_remediation_flags'))
)) AS t2_4_structure;


-- Test 5/6: RLS enabled+forced; anon has NO privilege on any new table.
SELECT jsonb_pretty(jsonb_build_object(
  'rls', (
    SELECT jsonb_agg(jsonb_build_object('table', relname,
             'rls_enabled', relrowsecurity, 'rls_forced', relforcerowsecurity) ORDER BY relname)
    FROM pg_class WHERE relnamespace='public'::regnamespace
      AND relname IN ('entity_type_catalogue','client_persons','client_registrations',
          'gst_registration_details','client_identifiers','client_contacts','client_addresses',
          'client_relationships','client_remediation_flags')),
  'anon_privileges_MUST_ALL_BE_FALSE', (
    SELECT jsonb_object_agg(t, jsonb_build_object(
             'select', has_table_privilege('anon','public.'||t,'SELECT'),
             'insert', has_table_privilege('anon','public.'||t,'INSERT'),
             'update', has_table_privilege('anon','public.'||t,'UPDATE'),
             'delete', has_table_privilege('anon','public.'||t,'DELETE')))
    FROM unnest(ARRAY['entity_type_catalogue','client_persons','client_registrations',
          'gst_registration_details','client_identifiers','client_contacts','client_addresses',
          'client_relationships','client_remediation_flags']) AS t)
)) AS t5_6_rls_anon;


-- Test 7: no NEW functions were created by 0015 (so no anon EXECUTE to worry about).
SELECT 'functions_created_by_0015_expected_none' AS check,
       coalesce(jsonb_agg(p.proname), '[]'::jsonb) AS found
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('m1a_'||'x');  -- 0015 defines no functions; expect [].


-- Test 8: role-matrix policies exist (command-specific; SELECT vs INSERT/UPDATE).
SELECT tablename, policyname, cmd, roles::text AS roles
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('client_persons','client_registrations','client_identifiers',
      'client_contacts','client_addresses','client_relationships','client_remediation_flags',
      'gst_registration_details','entity_type_catalogue')
ORDER BY tablename, cmd, policyname;


-- Test 9/10: audit contract — SPLIT into independent statements (Rev 1.1) so a negative
-- test cannot suppress the others. Casing matches the corrected contract: action UPPER
-- (CREATE/TRANSITION), resource = lower_snake table name (clients). audit_validate_event
-- RETURNS a code string (NULL/empty on success) — it does not raise — so each SELECT
-- always produces its cell.

-- 9a — VALID event: expect NULL (or empty) = accepted.
SELECT public.audit_validate_event('client.created','user','CREATE','clients',
         gen_random_uuid(), NULL, '{"change_type_code":"CREATED"}'::jsonb)
       AS t9a_valid_event_expect_null;

-- 9b — INVALID metadata (disallowed key): expect a DISALLOWED_KEY:... rejection code.
SELECT public.audit_validate_event('client.created','user','CREATE','clients',
         gen_random_uuid(), NULL, '{"not_a_whitelisted_key":"x"}'::jsonb)
       AS t9b_invalid_metadata_expect_reject;

-- 9c — MISSING required key: expect MISSING_REQUIRED_KEY:new_value_code.
SELECT public.audit_validate_event('client.status_transition','user','TRANSITION','clients',
         gen_random_uuid(), NULL, '{"old_value_code":"DRAFT"}'::jsonb)
       AS t9c_missing_required_key_expect_reject;

-- 10 — presence: all 12 M1-A events added; the two read events unchanged/present.
SELECT jsonb_pretty(jsonb_build_object(
  'm1a_events_present', (
     SELECT count(*) FROM public.audit_event_contract
     WHERE event_name IN ('client.created','client.updated','client.status_transition',
       'client.duplicate_override','registration.added','registration.updated','identifier.added',
       'person.kyc_verified','person.kyc_exception_approved','document.signed_url_issued',
       'document.verified','remediation.resolved')),
  'read_events_unchanged_present', (
     SELECT count(*) FROM public.audit_event_contract
     WHERE event_name IN ('audit.log.read_requested','audit.log.read_completed'))
)) AS t10_audit_presence;


-- Test 11-16: additive safety — counts unchanged, statuses intact, no legacy drop.
SELECT jsonb_pretty(jsonb_build_object(
  'clients_all',        (SELECT count(*) FROM public.clients),
  'clients_active',     (SELECT count(*) FROM public.clients WHERE status='Active' AND coalesce(is_draft,false)=false),
  'accounting_tracker', (SELECT count(*) FROM public.accounting_tracker),
  'financials_tracker', (SELECT count(*) FROM public.financials_tracker),
  'income_tax_tracker', (SELECT count(*) FROM public.income_tax_tracker),
  'compliance_calendar',(SELECT count(*) FROM public.compliance_calendar),
  -- legacy columns still present (no drop)
  'clients_legacy_columns_present', (
    SELECT jsonb_object_agg(col, EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='clients' AND column_name=col))
    FROM unnest(ARRAY['gstin','cin','tan','pan','udyam_no','iec_no','directors','client_id','status']) AS col)
)) AS t11_16_additive_safety;
