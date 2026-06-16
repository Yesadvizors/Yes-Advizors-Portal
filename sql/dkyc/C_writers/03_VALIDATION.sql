-- PACKAGE C — 03_VALIDATION.sql (READ-ONLY, after migration)
SELECT 'writers are SECURITY DEFINER' AS chk,
  (SELECT bool_and(p.prosecdef)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('dkyc_record_filing','dkyc_verify_filing','dkyc_accept_interpretation',
     'dkyc_prepare_document_upload','dkyc_finalize_document_upload','dkyc_cancel_upload_intent','dkyc_write_snapshot','dkyc_create_initial_obligation')) AS got, 'true' AS expected;
SELECT 'writers owned by postgres' AS chk,
  (SELECT bool_and(pg_get_userbyid(p.proowner)='postgres')::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname LIKE 'dkyc_%' AND p.proname IN
     ('dkyc_record_filing','dkyc_verify_filing','dkyc_accept_interpretation','dkyc_prepare_document_upload',
      'dkyc_finalize_document_upload','dkyc_cancel_upload_intent','dkyc_write_snapshot','dkyc_create_initial_obligation')) AS got, 'true' AS expected;
SELECT 'anon LACKS EXECUTE on record_filing' AS chk,
  has_function_privilege('anon','public.dkyc_record_filing(uuid,text,text,date,text,text)','EXECUTE')::text AS got, 'false' AS expected;
SELECT 'BLOCKER1: authenticated LACKS EXECUTE on finalize' AS chk,
  has_function_privilege('authenticated','public.dkyc_finalize_document_upload(uuid,uuid,text,bigint,text)','EXECUTE')::text AS got, 'false' AS expected;
SELECT 'BLOCKER1: service_role HAS EXECUTE on finalize' AS chk,
  has_function_privilege('service_role','public.dkyc_finalize_document_upload(uuid,uuid,text,bigint,text)','EXECUTE')::text AS got, 'true' AS expected;
SELECT 'BLOCKER1: anon LACKS EXECUTE on finalize' AS chk,
  has_function_privilege('anon','public.dkyc_finalize_document_upload(uuid,uuid,text,bigint,text)','EXECUTE')::text AS got, 'false' AS expected;
SELECT 'BLOCKER6: initial-obligation RPC present' AS chk,
  (SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='dkyc_create_initial_obligation') AS got, '1' AS expected;
SELECT 'BLOCKER6: periodic dup unique index present' AS chk,
  (SELECT count(*)::text FROM pg_indexes WHERE schemaname='public' AND indexname='uq_dkyc_periodic_holder_cycle') AS got, '1' AS expected;
SELECT 'authenticated has EXECUTE on record_filing' AS chk,
  has_function_privilege('authenticated','public.dkyc_record_filing(uuid,text,text,date,text,text)','EXECUTE')::text AS got, 'true' AS expected;
SELECT 'write_snapshot is private (no authenticated EXECUTE)' AS chk,
  has_function_privilege('authenticated','public.dkyc_write_snapshot(uuid,uuid,text,date,uuid)','EXECUTE')::text AS got, 'false' AS expected;
SELECT 'delete-block trigger attached' AS chk,
  (SELECT count(*)::text FROM pg_trigger WHERE tgname='trg_dkyc_block_doc_delete' AND NOT tgisinternal) AS got, '1' AS expected;
