-- PACKAGE A — 03_VALIDATION.sql (READ-ONLY, run AFTER migration).
SELECT 'new_columns_present' AS chk,
  (SELECT count(*)::text FROM information_schema.columns WHERE table_schema='public' AND table_name='director_kyc_records'
     AND column_name IN ('registry_filing_date','srn_or_ack','filing_result_status','rejection_date','rejection_reason',
                         'resubmission_required','exception_code','verified_at','verified_by','kyc_fy')) AS got, '10' AS expected;
SELECT 'form_type_absent' AS chk,
  (SELECT count(*)::text FROM information_schema.columns WHERE table_schema='public' AND table_name='director_kyc_records' AND column_name='form_type') AS got, '0' AS expected;
SELECT 'filing_result_check_present' AS chk,
  (SELECT count(*)::text FROM pg_constraint WHERE conname='chk_dkyc_filing_result_status') AS got, '1' AS expected;
SELECT 'snapshot_table_present' AS chk,
  (SELECT count(*)::text FROM information_schema.tables WHERE table_schema='public' AND table_name='director_kyc_calc_snapshot') AS got, '1' AS expected;
SELECT 'snapshot_unique_index_present' AS chk,
  (SELECT count(*)::text FROM pg_indexes WHERE schemaname='public' AND indexname='uq_dkyc_calc_snapshot') AS got, '1' AS expected;
SELECT 'snapshot_append_only_trigger' AS chk,
  (SELECT count(*)::text FROM pg_trigger WHERE tgname='trg_dkyc_calc_snapshot_noupd' AND NOT tgisinternal) AS got, '1' AS expected;
SELECT 'snapshot_rls_enabled' AS chk,
  (SELECT relrowsecurity::text FROM pg_class WHERE relname='director_kyc_calc_snapshot') AS got, 'true' AS expected;
SELECT 'intents_table_present' AS chk,
  (SELECT count(*)::text FROM information_schema.tables WHERE table_schema='public' AND table_name='director_kyc_upload_intents') AS got, '1' AS expected;
SELECT 'snapshot_no_authenticated_grant' AS chk,
  (SELECT count(*)::text FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='director_kyc_calc_snapshot' AND grantee='authenticated') AS got, '0' AS expected;
SELECT 'doc bridge table present' AS chk,
  (SELECT count(*)::text FROM information_schema.tables WHERE table_schema='public' AND table_name='director_kyc_documents') AS got, '1' AS expected;
SELECT 'doc bridge no authenticated grant' AS chk,
  (SELECT count(*)::text FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='director_kyc_documents' AND grantee='authenticated') AS got, '0' AS expected;
SELECT 'doc bridge unique on document_id' AS chk,
  (SELECT count(*)::text FROM pg_constraint WHERE conname='uq_dkyc_documents_document') AS got, '1' AS expected;
