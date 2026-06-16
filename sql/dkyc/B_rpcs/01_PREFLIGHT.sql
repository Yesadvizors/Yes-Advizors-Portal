-- =====================================================================
-- PACKAGE B — 01_PREFLIGHT.sql (READ-ONLY). Verifies EVERY dependency B uses.
-- Abort intent: if any row's got<>expected, DO NOT proceed to B migration.
-- (This script only reports; the migration's own guards enforce hard abort.)
-- =====================================================================

-- enum labels (exact)
SELECT 'enum dkyc_record_type_enum' AS chk,
  string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS got,
  'PERIODIC_KYC,EVENT_UPDATE,REACTIVATION,HISTORICAL' AS expected
FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname='dkyc_record_type_enum';

SELECT 'enum dkyc_change_type_enum' AS chk,
  string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS got,
  'EMAIL,MOBILE,RESIDENTIAL_ADDRESS,MULTIPLE,OTHER' AS expected
FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname='dkyc_change_type_enum';

-- din_holders anchor columns
SELECT 'din_holders.din_allotment_date' AS chk,
  (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='din_holders' AND column_name='din_allotment_date') AS got,
  'date' AS expected;
SELECT 'din_holders.is_active' AS chk,
  (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='din_holders' AND column_name='is_active') AS got,
  'boolean' AS expected;

-- din_holder_companies columns used by readers
SELECT 'dhc.client_id is uuid' AS chk,
  (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='din_holder_companies' AND column_name='client_id') AS got, 'uuid' AS expected;
SELECT 'dhc.is_active present' AS chk,
  (SELECT count(*)::text FROM information_schema.columns WHERE table_schema='public' AND table_name='din_holder_companies' AND column_name='is_active') AS got, '1' AS expected;

-- director_kyc_records columns added by Package A (B reads these)
SELECT 'dkr new columns present (A applied)' AS chk,
  (SELECT count(*)::text FROM information_schema.columns WHERE table_schema='public' AND table_name='director_kyc_records'
     AND column_name IN ('registry_filing_date','srn_or_ack','filing_result_status','verified_at','kyc_fy')) AS got, '5' AS expected;

-- access + identity helpers (exact signatures)
SELECT 'fn dkyc_is_admin_or_manager()' AS chk,
  (SELECT pg_get_function_identity_arguments(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_is_admin_or_manager') AS got, '' AS expected;
SELECT 'fn dkyc_current_ct_member_id()' AS chk,
  (SELECT pg_get_function_identity_arguments(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_current_ct_member_id') AS got, '' AS expected;
SELECT 'fn dkyc_can_access_record(uuid)' AS chk,
  (SELECT pg_get_function_identity_arguments(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_can_access_record') AS got, 'p_record_id uuid' AS expected;
SELECT 'fn dkyc_staff_can_see_holder(uuid)' AS chk,
  (SELECT pg_get_function_identity_arguments(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_staff_can_see_holder') AS got, 'p_holder_id uuid' AS expected;

-- standard due date helper (reused)
SELECT 'fn dkyc_compute_standard_due_date present' AS chk,
  (SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_compute_standard_due_date') AS got, '1' AS expected;

-- documents columns used by the advisory read
SELECT 'documents advisory columns' AS chk,
  (SELECT count(*)::text FROM information_schema.columns WHERE table_schema='public' AND table_name='documents'
     AND column_name IN ('compliance_ref_id','compliance_type','doc_category')) AS got, '3' AS expected;
