-- PACKAGE B — 03_VALIDATION.sql (READ-ONLY, after migration)
-- External readers are SECURITY DEFINER, owner postgres, authenticated has EXECUTE, anon does not.
SELECT 'readers are SECURITY DEFINER' AS chk,
  (SELECT bool_and(p.prosecdef)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('dkyc_list_activitywise','dkyc_list_clientwise','dkyc_din_documents')) AS got, 'true' AS expected;
SELECT 'readers owned by postgres' AS chk,
  (SELECT bool_and(pg_get_userbyid(p.proowner)='postgres')::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('dkyc_list_activitywise','dkyc_list_clientwise','dkyc_din_documents')) AS got, 'true' AS expected;
SELECT 'authenticated has EXECUTE on activitywise' AS chk,
  has_function_privilege('authenticated','public.dkyc_list_activitywise(text,text,dkyc_record_type_enum,uuid,date,date,text,int,int,date)','EXECUTE')::text AS got, 'true' AS expected;
SELECT 'anon LACKS EXECUTE on activitywise' AS chk,
  has_function_privilege('anon','public.dkyc_list_activitywise(text,text,dkyc_record_type_enum,uuid,date,date,text,int,int,date)','EXECUTE')::text AS got, 'false' AS expected;
SELECT 'authenticated LACKS EXECUTE on private compute_due' AS chk,
  has_function_privilege('authenticated','public.dkyc_compute_due(date,boolean,date)','EXECUTE')::text AS got, 'false' AS expected;
SELECT 'authenticated LACKS EXECUTE on record_status' AS chk,
  has_function_privilege('authenticated','public.dkyc_record_status(uuid,date)','EXECUTE')::text AS got, 'false' AS expected;
SELECT 'private helpers are present' AS chk,
  (SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
    AND p.proname IN ('dkyc_fy_start','dkyc_first_applicable_march','dkyc_compute_due','dkyc_has_prior_regime_evidence',
                      'dkyc_internal_control','dkyc_reminder_band','dkyc_record_status',
                      'dkyc_routine_obligation_status','dkyc_din_summary_status','dkyc_new_din_cutoff')) AS got, '10' AS expected;
SELECT 'new-DIN cutoff constant' AS chk,
  (SELECT public.dkyc_new_din_cutoff()::text) AS got, '2025-04-01' AS expected;
SELECT 'cutoff fn is private (no authenticated EXECUTE)' AS chk,
  has_function_privilege('authenticated','public.dkyc_new_din_cutoff()','EXECUTE')::text AS got, 'false' AS expected;
