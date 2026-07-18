-- ============================================================================
--  YAV2 — Module 1 — M1-B D2b POST-EXECUTION VERIFICATION  (READ-ONLY)  Rev 2
--
--  Target : V2 / yav2-dev ONLY — ogjrwemjefvccpyjwxuo.  Run AFTER migration 0017.
--  Read-only: SELECTs + catalogue/privilege probes only. No writes; no RPC invoked.
--  NO sensitive values emitted.  ⚠ CONFIRM the project is ogjrwemjefvccpyjwxuo first.
--  Rev 2: 22 RPCs (registration create / create-with-gst / set_active added).
--         service_role EXECUTE is expected FALSE for every RPC.
--         V3 = complete operation-coverage matrix · V3b = registration-gap closure ·
--         V8 = protected counts vs governed baseline · V9 = no D3/D4 objects, FY intact.
--         Functional behaviour (locking, audit emission, denials) is exercised by the
--         SEPARATE transactional test kit M1B_D2b_transactional_functional_tests.sql.
-- ============================================================================

-- V1: per-RPC hardening inventory (22 rows). Expect for every row:
--   exists=t · security_definer=t · search_path_exact=t · owner=<audit_write_event owner>
--   · anon_execute=f · service_role_execute=f · authenticated_execute=t
SELECT r.sig,
       (p.oid IS NOT NULL)                                       AS exists,
       p.prosecdef                                               AS security_definer,
       (p.proconfig IS NOT DISTINCT FROM ARRAY['search_path=pg_catalog, public, pg_temp']) AS search_path_exact,
       pg_get_userbyid(p.proowner)                               AS owner,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_execute_expect_false,
       has_function_privilege('service_role',  p.oid, 'EXECUTE') AS service_role_execute_expect_false,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute_expect_true
FROM (VALUES
  ('public.client_person_create(uuid,text,text,text,text,text,text,text,text,boolean,date,date)'),
  ('public.client_person_update(uuid,integer,text,text,text,text,text,text,text,text,boolean,date,date)'),
  ('public.client_person_set_active(uuid,boolean,integer)'),
  ('public.client_identifier_create(uuid,text,text,date,text)'),
  ('public.client_identifier_update(uuid,integer,text,text,date,text)'),
  ('public.client_identifier_set_active(uuid,boolean,integer)'),
  ('public.client_contact_create(uuid,text,text,text,text,text,boolean,uuid)'),
  ('public.client_contact_update(uuid,integer,text,text,text,text,text,boolean,uuid)'),
  ('public.client_contact_set_active(uuid,boolean,integer)'),
  ('public.client_address_create(uuid,text,text,text,text,text,text,text,boolean,date,date)'),
  ('public.client_address_update(uuid,integer,text,text,text,text,text,text,text,boolean,date,date)'),
  ('public.client_address_set_active(uuid,boolean,integer)'),
  ('public.client_relationship_create(uuid,uuid,uuid,text,numeric,date,date)'),
  ('public.client_relationship_update(uuid,integer,uuid,uuid,text,numeric,date,date)'),
  ('public.client_relationship_set_active(uuid,boolean,integer)'),
  ('public.client_registration_create(uuid,text,text,text,text,date,date,date)'),
  ('public.client_registration_update(uuid,integer,text,text,text,text,date,date,date)'),
  ('public.client_registration_set_active(uuid,boolean,integer)'),
  ('public.gst_detail_create(uuid,text,text,text,boolean,date,date)'),
  ('public.gst_detail_update(uuid,integer,text,text,text,boolean,date,date)'),
  ('public.client_registration_create_with_gst(uuid,text,text,text,text,date,date,date,text,text,text,boolean,date,date)'),
  ('public.client_registration_update_with_gst(uuid,integer,text,text,text,text,date,date,date,integer,text,text,text,boolean,date,date)')
) AS r(sig)
LEFT JOIN pg_proc p ON p.oid = to_regprocedure(r.sig)
ORDER BY r.sig;


-- V2: NULL-safe roll-up. Expect count_present = 22 and all_22_rpcs_hardened = TRUE.
SELECT
  count(*) FILTER (WHERE p.oid IS NOT NULL)                      AS count_present_expect_22,
  bool_and(
        p.oid IS NOT NULL
    AND p.prosecdef IS NOT DISTINCT FROM TRUE
    AND p.proconfig IS NOT DISTINCT FROM ARRAY['search_path=pg_catalog, public, pg_temp']
    AND has_function_privilege('anon',          p.oid, 'EXECUTE') IS NOT DISTINCT FROM FALSE
    AND has_function_privilege('service_role',  p.oid, 'EXECUTE') IS NOT DISTINCT FROM FALSE
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE') IS NOT DISTINCT FROM TRUE
    AND pg_get_userbyid(p.proowner) = (
          SELECT pg_get_userbyid(proowner) FROM pg_proc
          WHERE oid = to_regprocedure('public.audit_write_event(text,text,text,text,uuid,jsonb)'))
  )                                                              AS all_22_rpcs_hardened_expect_true
FROM (VALUES
  ('public.client_person_create(uuid,text,text,text,text,text,text,text,text,boolean,date,date)'),
  ('public.client_person_update(uuid,integer,text,text,text,text,text,text,text,text,boolean,date,date)'),
  ('public.client_person_set_active(uuid,boolean,integer)'),
  ('public.client_identifier_create(uuid,text,text,date,text)'),
  ('public.client_identifier_update(uuid,integer,text,text,date,text)'),
  ('public.client_identifier_set_active(uuid,boolean,integer)'),
  ('public.client_contact_create(uuid,text,text,text,text,text,boolean,uuid)'),
  ('public.client_contact_update(uuid,integer,text,text,text,text,text,boolean,uuid)'),
  ('public.client_contact_set_active(uuid,boolean,integer)'),
  ('public.client_address_create(uuid,text,text,text,text,text,text,text,boolean,date,date)'),
  ('public.client_address_update(uuid,integer,text,text,text,text,text,text,text,boolean,date,date)'),
  ('public.client_address_set_active(uuid,boolean,integer)'),
  ('public.client_relationship_create(uuid,uuid,uuid,text,numeric,date,date)'),
  ('public.client_relationship_update(uuid,integer,uuid,uuid,text,numeric,date,date)'),
  ('public.client_relationship_set_active(uuid,boolean,integer)'),
  ('public.client_registration_create(uuid,text,text,text,text,date,date,date)'),
  ('public.client_registration_update(uuid,integer,text,text,text,text,date,date,date)'),
  ('public.client_registration_set_active(uuid,boolean,integer)'),
  ('public.gst_detail_create(uuid,text,text,text,boolean,date,date)'),
  ('public.gst_detail_update(uuid,integer,text,text,text,boolean,date,date)'),
  ('public.client_registration_create_with_gst(uuid,text,text,text,text,date,date,date,text,text,text,boolean,date,date)'),
  ('public.client_registration_update_with_gst(uuid,integer,text,text,text,text,date,date,date,integer,text,text,text,boolean,date,date)')
) AS r(sig)
LEFT JOIN pg_proc p ON p.oid = to_regprocedure(r.sig);


-- V3: COMPLETE OPERATION-COVERAGE MATRIX — every table whose direct INSERT/UPDATE is
--     revoked has a full RPC path for onboarding + maintenance. Expect for all 7 rows:
--     has_create=t · has_update=t · has_lifecycle=t OR lifecycle_note explains the
--     schema-grounded alternative (gst_registration_details has NO is_active column;
--     its lifecycle is cancellation_date via gst_detail_update + header set_active).
--     Optimistic locking: every update/lifecycle RPC requires expected row_version
--     (verified functionally by the transactional test kit, not derivable from catalog).
SELECT c.base_table,
       (to_regprocedure(c.create_sig)    IS NOT NULL) AS has_create_path_expect_true,
       (to_regprocedure(c.update_sig)    IS NOT NULL) AS has_update_path_expect_true,
       CASE WHEN c.lifecycle_sig IS NULL THEN NULL
            ELSE (to_regprocedure(c.lifecycle_sig) IS NOT NULL) END AS has_lifecycle_rpc,
       c.lifecycle_note,
       c.audit_events
FROM (VALUES
  ('client_persons',
     'public.client_person_create(uuid,text,text,text,text,text,text,text,text,boolean,date,date)',
     'public.client_person_update(uuid,integer,text,text,text,text,text,text,text,text,boolean,date,date)',
     'public.client_person_set_active(uuid,boolean,integer)',
     'is_active via set_active (ENABLED/DISABLED)',
     'person.changed CREATE/UPDATE'),
  ('client_identifiers',
     'public.client_identifier_create(uuid,text,text,date,text)',
     'public.client_identifier_update(uuid,integer,text,text,date,text)',
     'public.client_identifier_set_active(uuid,boolean,integer)',
     'is_active + status kept consistent by set_active',
     'identifier.changed CREATE/UPDATE'),
  ('client_contacts',
     'public.client_contact_create(uuid,text,text,text,text,text,boolean,uuid)',
     'public.client_contact_update(uuid,integer,text,text,text,text,text,boolean,uuid)',
     'public.client_contact_set_active(uuid,boolean,integer)',
     'is_active via set_active',
     'contact.changed CREATE/UPDATE'),
  ('client_addresses',
     'public.client_address_create(uuid,text,text,text,text,text,text,text,boolean,date,date)',
     'public.client_address_update(uuid,integer,text,text,text,text,text,text,text,boolean,date,date)',
     'public.client_address_set_active(uuid,boolean,integer)',
     'is_active via set_active',
     'address.changed CREATE/UPDATE'),
  ('client_relationships',
     'public.client_relationship_create(uuid,uuid,uuid,text,numeric,date,date)',
     'public.client_relationship_update(uuid,integer,uuid,uuid,text,numeric,date,date)',
     'public.client_relationship_set_active(uuid,boolean,integer)',
     'is_active via set_active',
     'relationship.changed CREATE/UPDATE'),
  ('client_registrations',
     'public.client_registration_create(uuid,text,text,text,text,date,date,date)',
     'public.client_registration_update(uuid,integer,text,text,text,text,date,date,date)',
     'public.client_registration_set_active(uuid,boolean,integer)',
     'is_active via set_active; status vocabulary via update',
     'registration.added CREATE; registration.updated UPDATE'),
  ('gst_registration_details',
     'public.gst_detail_create(uuid,text,text,text,boolean,date,date)',
     'public.gst_detail_update(uuid,integer,text,text,text,boolean,date,date)',
     NULL,
     'NO is_active column in 0015 (none invented); lifecycle = cancellation_date via gst_detail_update; header lifecycle via client_registration_set_active',
     'gst_detail.changed CREATE/UPDATE')
) AS c(base_table, create_sig, update_sig, lifecycle_sig, lifecycle_note, audit_events)
ORDER BY c.base_table;


-- V3b: registration-creation gap closure — the two Rev 2 gap-closing RPCs exist and the
--      combined ops exist. Expect all TRUE.
SELECT
  (to_regprocedure('public.client_registration_create(uuid,text,text,text,text,date,date,date)') IS NOT NULL)
    AS registration_create_exists_expect_true,
  (to_regprocedure('public.client_registration_create_with_gst(uuid,text,text,text,text,date,date,date,text,text,text,boolean,date,date)') IS NOT NULL)
    AS registration_create_with_gst_exists_expect_true,
  (to_regprocedure('public.client_registration_update_with_gst(uuid,integer,text,text,text,text,date,date,date,integer,text,text,text,boolean,date,date)') IS NOT NULL)
    AS registration_update_with_gst_exists_expect_true,
  (to_regprocedure('public.client_registration_set_active(uuid,boolean,integer)') IS NOT NULL)
    AS registration_set_active_exists_expect_true;


-- V4: bypass closure per base table (7 rows). Expect INSERT=f, UPDATE=f, DELETE=f, SELECT=t.
SELECT t AS base_table,
       has_table_privilege('authenticated', 'public.'||t, 'INSERT') AS auth_insert_expect_false,
       has_table_privilege('authenticated', 'public.'||t, 'UPDATE') AS auth_update_expect_false,
       has_table_privilege('authenticated', 'public.'||t, 'DELETE') AS auth_delete_expect_false,
       has_table_privilege('authenticated', 'public.'||t, 'SELECT') AS auth_select_expect_true
FROM unnest(ARRAY['client_persons','client_identifiers','client_contacts',
                  'client_addresses','client_relationships','client_registrations',
                  'gst_registration_details']) AS t
ORDER BY t;


-- V5: NULL-safe roll-up — no direct authenticated write path remains. Expect TRUE.
SELECT bool_and(
         has_table_privilege('authenticated', 'public.'||t, 'INSERT') IS NOT DISTINCT FROM FALSE
     AND has_table_privilege('authenticated', 'public.'||t, 'UPDATE') IS NOT DISTINCT FROM FALSE
     AND has_table_privilege('authenticated', 'public.'||t, 'DELETE') IS NOT DISTINCT FROM FALSE
       ) AS no_direct_authenticated_write_path_expect_true,
       bool_and(has_table_privilege('authenticated', 'public.'||t, 'SELECT') IS NOT DISTINCT FROM TRUE)
       AS authenticated_reads_retained_expect_true
FROM unnest(ARRAY['client_persons','client_identifiers','client_contacts',
                  'client_addresses','client_relationships','client_registrations',
                  'gst_registration_details']) AS t;


-- V6: audit events the RPCs emit are present (expect 8).
SELECT jsonb_pretty(jsonb_build_object(
  'events_present_expect_8', (
     SELECT count(*) FROM public.audit_event_contract
     WHERE event_name IN ('person.changed','identifier.changed','contact.changed',
       'address.changed','relationship.changed','gst_detail.changed',
       'registration.added','registration.updated')),
  'events_actions', (
     SELECT jsonb_object_agg(event_name, permitted_actions)
     FROM public.audit_event_contract
     WHERE event_name IN ('person.changed','identifier.changed','contact.changed',
       'address.changed','relationship.changed','gst_detail.changed',
       'registration.added','registration.updated'))
)) AS v6_audit_events;


-- V7: additive safety — counts unchanged by 0017 (helper never invoked by the migration).
SELECT jsonb_pretty(jsonb_build_object(
  'audit_log_rows',              (SELECT count(*) FROM public.audit_log),
  'clients_rows',                (SELECT count(*) FROM public.clients),
  'client_persons_rows',         (SELECT count(*) FROM public.client_persons),
  'client_identifiers_rows',     (SELECT count(*) FROM public.client_identifiers),
  'client_contacts_rows',        (SELECT count(*) FROM public.client_contacts),
  'client_addresses_rows',       (SELECT count(*) FROM public.client_addresses),
  'client_relationships_rows',   (SELECT count(*) FROM public.client_relationships),
  'client_registrations_rows',   (SELECT count(*) FROM public.client_registrations),
  'gst_registration_details_rows',(SELECT count(*) FROM public.gst_registration_details),
  'client_remediation_flags_rows',(SELECT count(*) FROM public.client_remediation_flags),
  'accounting_tracker',          (SELECT count(*) FROM public.accounting_tracker),
  'financials_tracker',          (SELECT count(*) FROM public.financials_tracker),
  'income_tax_tracker',          (SELECT count(*) FROM public.income_tax_tracker),
  'compliance_calendar',         (SELECT count(*) FROM public.compliance_calendar)
)) AS v7_counts_expect_unchanged;


-- V8: PROTECTED COUNTS vs the governed baseline (P0 register §0). Expect all TRUE
--     (assuming no governed writes occurred between 0016 verification and this run;
--     if a governed gate legitimately changed a count, reconcile against its evidence).
SELECT
  ((SELECT count(*) FROM public.clients)                  = 13)  AS clients_13,
  ((SELECT count(*) FROM public.accounting_tracker)       = 312) AS accounting_tracker_312,
  ((SELECT count(*) FROM public.financials_tracker)       = 120) AS financials_tracker_120,
  ((SELECT count(*) FROM public.income_tax_tracker)       = 26)  AS income_tax_tracker_26,
  ((SELECT count(*) FROM public.compliance_calendar)      = 0)   AS compliance_calendar_0,
  ((SELECT count(*) FROM public.client_persons)           = 0)   AS client_persons_0,
  ((SELECT count(*) FROM public.client_remediation_flags) = 0)   AS client_remediation_flags_0;


-- V9: NO D3/D4 OBJECTS and no FY/compliance interference. Expect:
--     d3_d4_function_count = 0 (no backfill/remediation-population RPCs exist),
--     lineage_columns_unpopulated = TRUE (D2a columns exist but D3 has not run),
--     financial_years_gte_11 = TRUE (0014 seeded FY 2020-21..2030-31; horizon fn may add).
SELECT
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proname ~* 'backfill' OR p.proname ~* 'remediation'))     AS d3_d4_function_count_expect_0,
  ((SELECT count(*) FROM public.client_persons WHERE backfill_batch_id IS NOT NULL) = 0
   AND (SELECT count(*) FROM public.client_remediation_flags WHERE batch_id IS NOT NULL) = 0)
                                                                        AS lineage_columns_unpopulated_expect_true,
  ((SELECT count(*) FROM public.financial_years) >= 11)                 AS financial_years_gte_11_expect_true;
