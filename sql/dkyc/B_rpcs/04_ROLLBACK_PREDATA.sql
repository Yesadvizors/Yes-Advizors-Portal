-- PACKAGE B — 04_ROLLBACK_PREDATA.sql. Functions only; safe pre-data (B writes no data).
BEGIN;
DO $g$ BEGIN IF current_user<>'postgres' THEN RAISE EXCEPTION 'ABORT: expected postgres'; END IF; END $g$;
DROP FUNCTION IF EXISTS public.dkyc_list_activitywise(text,text,dkyc_record_type_enum,uuid,date,date,text,int,int,date);
DROP FUNCTION IF EXISTS public.dkyc_list_clientwise(uuid,text,text,dkyc_record_type_enum,text,int,int,date);
DROP FUNCTION IF EXISTS public.dkyc_din_documents(uuid);
DROP FUNCTION IF EXISTS public.dkyc_din_summary_status(uuid,date);
DROP FUNCTION IF EXISTS public.dkyc_routine_obligation_status(uuid,date);
DROP FUNCTION IF EXISTS public.dkyc_record_status(uuid,date);
DROP FUNCTION IF EXISTS public.dkyc_reminder_band(date,date);
DROP FUNCTION IF EXISTS public.dkyc_internal_control(dkyc_record_type_enum,dkyc_change_type_enum,boolean);
DROP FUNCTION IF EXISTS public.dkyc_has_prior_regime_evidence(uuid);
DROP FUNCTION IF EXISTS public.dkyc_compute_due(date,boolean,date);
DROP FUNCTION IF EXISTS public.dkyc_first_applicable_march(date);
DROP FUNCTION IF EXISTS public.dkyc_fy_start(date);
DROP FUNCTION IF EXISTS public.dkyc_new_din_cutoff();
DROP FUNCTION IF EXISTS public.dkyc_rule_version();
COMMIT;
