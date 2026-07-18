-- ============================================================================
--  YAV2 — Module 1 — M1-B D2a POST-EXECUTION VERIFICATION  (READ-ONLY)  Rev 2.2
--
--  Rev 2.1: every function-identity lookup resolves by EXACT OID via
--  to_regprocedure('public.fn(argtypes)') (p.oid = …), not by string-matching
--  pg_get_function_identity_arguments(...).
--  Rev 2.2: NULL-safe fail-closed authorization is enforced in the migration
--  (IS DISTINCT FROM TRUE/FALSE). This read-only kit contains NO IF-based security
--  gate — its Boolean outputs (security_definer, execute_privileges, …) are
--  evidence values for the human reviewer, not control flow; unchanged.
--
--  Target : V2 / yav2-dev ONLY — ogjrwemjefvccpyjwxuo.  Run AFTER migration 0016.
--  Read-only: SELECTs + calls to the STABLE audit_validate_event (no writes).
--  NO sensitive values emitted (no PAN / Aadhaar / GSTIN / contact / names). Client
--  UUIDs (opaque PK ids) are used only to satisfy client_requirement in V4 — they
--  are not PII. Preserve the output as D2a evidence.
--  ⚠ CONFIRM the project is ogjrwemjefvccpyjwxuo before running.
--
--  It does NOT call public.audit_write_event (that would INSERT an audit_log row).
--  The write helper is evidenced structurally (existence, SECURITY DEFINER, exact
--  search_path, owner, grants), not by execution.
-- ============================================================================

-- V1: write-audit helper — resolved by EXACT OID (to_regprocedure), SECURITY DEFINER,
--     exact pinned search_path, approved owner, and EXECUTE denied to every role.
SELECT jsonb_pretty(jsonb_build_object(
  'audit_write_event', (
    SELECT jsonb_build_object(
      'exists',            count(*) > 0,
      'identity_arguments',max(pg_get_function_identity_arguments(p.oid)),
      'result_type',       max(pg_get_function_result(p.oid)),
      'language',          max(l.lanname),
      'security_definer',  bool_and(p.prosecdef),
      'search_path_config',max(array_to_string(p.proconfig, ', ')),
      'search_path_is_exact', bool_and(p.proconfig IS NOT DISTINCT FROM ARRAY['search_path=pg_catalog, public, pg_temp']),
      'owner',             max(pg_get_userbyid(p.proowner)),
      'owner_matches_validator',
        bool_and(pg_get_userbyid(p.proowner) = (
          SELECT pg_get_userbyid(vp.proowner)
          FROM pg_proc vp
          WHERE vp.oid = to_regprocedure('public.audit_validate_event(text,text,text,text,uuid,uuid,jsonb)')))
    )
    FROM pg_proc p
    JOIN pg_language  l ON l.oid=p.prolang
    WHERE p.oid = to_regprocedure('public.audit_write_event(text,text,text,text,uuid,jsonb)')),
  -- EXECUTE grants: anon / authenticated / service_role must ALL be FALSE (internal
  -- helper; the definer owner executes regardless of grants). All three false also
  -- proves PUBLIC holds no EXECUTE.
  'execute_privileges_expect_all_false', jsonb_build_object(
    'anon',          has_function_privilege('anon',          'public.audit_write_event(text,text,text,text,uuid,jsonb)','EXECUTE'),
    'authenticated', has_function_privilege('authenticated', 'public.audit_write_event(text,text,text,text,uuid,jsonb)','EXECUTE'),
    'service_role',  has_function_privilege('service_role',  'public.audit_write_event(text,text,text,text,uuid,jsonb)','EXECUTE')),
  -- NULL-safe roll-up (mirrors the migration's IS DISTINCT FROM FALSE posture):
  -- TRUE only if EXECUTE is provably denied (= FALSE) for all three roles.
  'execute_all_denied_nullsafe_expect_true',
    (has_function_privilege('anon',         'public.audit_write_event(text,text,text,text,uuid,jsonb)','EXECUTE') IS NOT DISTINCT FROM FALSE)
    AND (has_function_privilege('authenticated','public.audit_write_event(text,text,text,text,uuid,jsonb)','EXECUTE') IS NOT DISTINCT FROM FALSE)
    AND (has_function_privilege('service_role', 'public.audit_write_event(text,text,text,text,uuid,jsonb)','EXECUTE') IS NOT DISTINCT FROM FALSE)
)) AS v1_write_helper;


-- V2: six family audit events present with the correct definition.
SELECT event_name,
       risk_tier, sensitivity,
       required_keys, optional_keys,
       allow_empty_metadata, client_requirement, target_user_requirement,
       permitted_actor_types, permitted_actions, permitted_resource_types
FROM public.audit_event_contract
WHERE event_name IN ('person.changed','identifier.changed','contact.changed',
                     'address.changed','relationship.changed','gst_detail.changed')
ORDER BY event_name;


-- V3: presence counts — 6 family events added; 12 M1-A events intact; read events present.
SELECT jsonb_pretty(jsonb_build_object(
  'm1b_family_events_present_expect_6', (
     SELECT count(*) FROM public.audit_event_contract
     WHERE event_name IN ('person.changed','identifier.changed','contact.changed',
       'address.changed','relationship.changed','gst_detail.changed')),
  'm1a_events_intact_expect_12', (
     SELECT count(*) FROM public.audit_event_contract
     WHERE event_name IN ('client.created','client.updated','client.status_transition',
       'client.duplicate_override','registration.added','registration.updated','identifier.added',
       'person.kyc_verified','person.kyc_exception_approved','document.signed_url_issued',
       'document.verified','remediation.resolved')),
  'read_events_present_expect_2', (
     SELECT count(*) FROM public.audit_event_contract
     WHERE event_name IN ('audit.log.read_requested','audit.log.read_completed')),
  'family_events_use_change_verb_expect_none', (
     SELECT coalesce(jsonb_agg(event_name), '[]'::jsonb)
     FROM public.audit_event_contract
     WHERE event_name IN ('person.changed','identifier.changed','contact.changed',
       'address.changed','relationship.changed','gst_detail.changed')
       AND 'CHANGE' = ANY(permitted_actions))
)) AS v3_event_presence;


-- V4: validator accepts a well-formed family event and rejects malformed metadata.
-- audit_validate_event RETURNS a code (NULL/empty on success) — it does not raise.
-- (Pure validation; no row is written.)
--
-- (Review 8) The family events set client_requirement='required'. The validator
-- checks only that the client UUID is NON-NULL (existence is enforced by the WRITER
-- audit_write_event, not by audit_validate_event — see 0007). Per the review, the
-- valid tests nonetheless bind a REAL client UUID selected READ-ONLY from
-- public.clients (opaque PK id; not PII). If no client exists the subquery returns
-- NULL and the row would report CLIENT_REQUIRED instead of NULL — that itself is
-- evidence the fixture is empty, not a helper fault.

-- V4a — VALID person.changed (action UPDATE, change_type_code UPDATED): expect NULL/empty.
SELECT public.audit_validate_event('person.changed','user','UPDATE','client_persons',
         (SELECT id FROM public.clients ORDER BY id LIMIT 1), NULL,
         '{"change_type_code":"UPDATED"}'::jsonb)
       AS v4a_valid_person_update_expect_null;

-- V4b — VALID gst_detail.changed (action CREATE, change_type_code CREATED): expect NULL/empty.
SELECT public.audit_validate_event('gst_detail.changed','user','CREATE','gst_registration_details',
         (SELECT id FROM public.clients ORDER BY id LIMIT 1), NULL,
         '{"change_type_code":"CREATED"}'::jsonb)
       AS v4b_valid_gst_create_expect_null;

-- V4c — MISSING required key change_type_code: expect MISSING_REQUIRED_KEY:change_type_code.
SELECT public.audit_validate_event('identifier.changed','user','UPDATE','client_identifiers',
         (SELECT id FROM public.clients ORDER BY id LIMIT 1), NULL,
         '{"old_value_code":"OLDVAL"}'::jsonb)
       AS v4c_missing_change_type_code_expect_reject;

-- V4d — DISALLOWED action CHANGE (not in live vocabulary): expect ACTION_NOT_PERMITTED.
SELECT public.audit_validate_event('contact.changed','user','CHANGE','client_contacts',
         (SELECT id FROM public.clients ORDER BY id LIMIT 1), NULL,
         '{"change_type_code":"UPDATED"}'::jsonb)
       AS v4d_change_verb_expect_reject;


-- V5: lineage columns on client_persons + partial unique index present; types correct.
SELECT jsonb_pretty(jsonb_build_object(
  'client_persons_lineage_columns', (
    SELECT jsonb_object_agg(column_name, data_type)
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='client_persons'
      AND column_name IN ('source_system','source_ref','source_hash','backfill_batch_id')),
  'client_persons_source_uq', (
    SELECT jsonb_agg(indexdef) FROM pg_indexes
    WHERE schemaname='public' AND indexname='client_persons_source_uq')
)) AS v5_client_persons_lineage;


-- V6: rule-identity columns on client_remediation_flags + open-flag index present.
SELECT jsonb_pretty(jsonb_build_object(
  'client_remediation_flags_rule_columns', (
    SELECT jsonb_object_agg(column_name, data_type)
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='client_remediation_flags'
      AND column_name IN ('rule_code','rule_version','batch_id')),
  'client_remediation_flags_open_uq', (
    SELECT jsonb_agg(indexdef) FROM pg_indexes
    WHERE schemaname='public' AND indexname='client_remediation_flags_open_uq')
)) AS v6_remediation_rule_identity;


-- V7: additive safety — counts unchanged; no data written by D2a; legacy intact.
SELECT jsonb_pretty(jsonb_build_object(
  'audit_log_rows',            (SELECT count(*) FROM public.audit_log),          -- unchanged by D2a
  'client_persons_rows',       (SELECT count(*) FROM public.client_persons),     -- expect 0 (pre-backfill)
  'client_remediation_rows',   (SELECT count(*) FROM public.client_remediation_flags), -- expect 0
  'clients_all',               (SELECT count(*) FROM public.clients),
  'clients_active',            (SELECT count(*) FROM public.clients WHERE status='Active' AND coalesce(is_draft,false)=false),
  'accounting_tracker',        (SELECT count(*) FROM public.accounting_tracker),
  'financials_tracker',        (SELECT count(*) FROM public.financials_tracker),
  'income_tax_tracker',        (SELECT count(*) FROM public.income_tax_tracker),
  'compliance_calendar',       (SELECT count(*) FROM public.compliance_calendar),
  -- D2b RPCs must NOT exist yet (D2a authors only the shared helper).
  'd2b_rpcs_present_expect_none', (
    SELECT coalesce(jsonb_agg(p.proname ORDER BY p.proname), '[]'::jsonb)
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('client_person_create','client_person_update','client_person_deactivate',
        'client_registration_add','client_registration_update','gst_detail_upsert',
        'client_identifier_change','client_contact_upsert','client_address_upsert',
        'client_relationship_upsert'))
)) AS v7_additive_safety;


-- V8: event_category is DERIVED, not caller-controlled — confirm the live column is
--     text + nullable (the derivation supplies a non-null family value at write time)
--     and that the helper exposes NO event_category parameter.
SELECT jsonb_pretty(jsonb_build_object(
  'audit_log_event_category_column', (
    SELECT jsonb_build_object('data_type', data_type, 'is_nullable', is_nullable)
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_log' AND column_name='event_category'),
  'helper_identity_arguments_expect_no_event_category', (
    SELECT pg_get_function_identity_arguments(p.oid)
    FROM pg_proc p
    WHERE p.oid = to_regprocedure('public.audit_write_event(text,text,text,text,uuid,jsonb)')),
  'derived_categories_expect_family_prefixes', (
    SELECT jsonb_object_agg(event_name, split_part(event_name,'.',1))
    FROM public.audit_event_contract
    WHERE event_name IN ('person.changed','identifier.changed','contact.changed',
      'address.changed','relationship.changed','gst_detail.changed'))
)) AS v8_event_category_derivation;
