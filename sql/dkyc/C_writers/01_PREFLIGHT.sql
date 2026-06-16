-- =====================================================================
-- PACKAGE C — 01_PREFLIGHT.sql (READ-ONLY). Verifies every dependency C uses.
-- =====================================================================
SELECT 'dkyc_log signature' AS chk,
  (SELECT pg_get_function_identity_arguments(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='dkyc_log') AS got,
  'p_table_name text, p_record_id uuid, p_action_type text, p_description text, p_old jsonb, p_new jsonb' AS expected;

SELECT 'dkyc_log table guard (only 3 tables)' AS chk,
  (SELECT (position('din_holders' in pg_get_functiondef(p.oid))>0
       AND position('director_kyc_records' in pg_get_functiondef(p.oid))>0)::text
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_log') AS got,
  'true' AS expected;  -- NOTE: documents/snapshot/intents are NOT valid dkyc_log targets

SELECT 'dkyc_current_ct_member_id present' AS chk,
  (SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_current_ct_member_id') AS got, '1' AS expected;
SELECT 'dkyc_is_admin_or_manager present' AS chk,
  (SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_is_admin_or_manager') AS got, '1' AS expected;

-- reused write functions (exact signatures, preserved by rollback)
SELECT 'dkyc_create_kyc_record sig' AS chk,
  (SELECT pg_get_function_identity_arguments(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_create_kyc_record') AS got,
  'p_din_holder_id uuid, p_record_type dkyc_record_type_enum, p_compliance_cycle smallint, p_trigger_date date, p_change_type dkyc_change_type_enum, p_change_summary text, p_historical_completed_date date, p_reactivation_due_date date, p_din_holder_company_id uuid' AS expected;
SELECT 'dkyc_override_due_date sig' AS chk,
  (SELECT pg_get_function_identity_arguments(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_override_due_date') AS got,
  'p_record_id uuid, p_due_date date, p_reason text' AS expected;
SELECT 'dkyc_advance_stage sig' AS chk,
  (SELECT pg_get_function_identity_arguments(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_advance_stage') AS got,
  'p_record_id uuid, p_to_stage workflow_stage_enum' AS expected;
SELECT 'dkyc_assign_record sig' AS chk,
  (SELECT pg_get_function_identity_arguments(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_assign_record') AS got,
  'p_record_id uuid, p_assignee_id uuid' AS expected;

-- Package A objects (C depends on them)
SELECT 'snapshot table present' AS chk,
  (SELECT count(*)::text FROM information_schema.tables WHERE table_schema='public' AND table_name='director_kyc_calc_snapshot') AS got, '1' AS expected;
SELECT 'intents table present' AS chk,
  (SELECT count(*)::text FROM information_schema.tables WHERE table_schema='public' AND table_name='director_kyc_upload_intents') AS got, '1' AS expected;

-- documents columns used by finalize INSERT (note file_size is integer)
SELECT 'documents.file_size type' AS chk,
  (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='documents' AND column_name='file_size') AS got, 'integer' AS expected;
SELECT 'documents.client_id type' AS chk,
  (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='documents' AND column_name='client_id') AS got, 'text' AS expected;

-- v3: finalize trust model dependencies
SELECT 'service_role exists' AS chk,
  (SELECT count(*)::text FROM pg_roles WHERE rolname='service_role') AS got, '1' AS expected;
SELECT 'team table (verifier-actor source) present' AS chk,
  (SELECT count(*)::text FROM information_schema.tables WHERE table_schema='public' AND table_name='team') AS got, '1' AS expected;
SELECT 'doc bridge present (Package A applied)' AS chk,
  (SELECT count(*)::text FROM information_schema.tables WHERE table_schema='public' AND table_name='director_kyc_documents') AS got, '1' AS expected;
