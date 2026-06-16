-- PACKAGE A — 01_PREFLIGHT.sql (READ-ONLY). Each check: got must equal expected.
SELECT 'role_is_postgres' AS chk, current_user AS got, 'postgres' AS expected;
SELECT 'gen_random_uuid_available' AS chk,
  (SELECT (count(*)>0)::text FROM pg_proc WHERE proname='gen_random_uuid') AS got, 'true' AS expected;
SELECT 'base_table_present' AS chk,
  (SELECT (count(*)=1)::text FROM information_schema.tables WHERE table_schema='public' AND table_name='director_kyc_records') AS got, 'true' AS expected;
SELECT 'compute_fn_present' AS chk,
  (SELECT (count(*)>0)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_compute_standard_due_date') AS got, 'true' AS expected;
SELECT 'new_columns_absent' AS chk,
  (SELECT count(*)::text FROM information_schema.columns WHERE table_schema='public' AND table_name='director_kyc_records'
     AND column_name IN ('registry_filing_date','srn_or_ack','filing_result_status','kyc_fy','verified_at')) AS got, '0' AS expected;
SELECT 'target_tables_absent' AS chk,
  (SELECT count(*)::text FROM information_schema.tables WHERE table_schema='public'
     AND table_name IN ('director_kyc_calc_snapshot','director_kyc_upload_intents','director_kyc_documents')) AS got, '0' AS expected;
SELECT 'records_table_empty' AS chk,
  (SELECT count(*)::text FROM public.director_kyc_records) AS got, '0' AS expected;  -- pre-data regime confirmation
