-- PACKAGE C — 04_ROLLBACK_PREDATA.sql. Safe only while NO documents/intents/snapshots exist.
BEGIN;
DO $g$ BEGIN
  IF current_user<>'postgres' THEN RAISE EXCEPTION 'ABORT: expected postgres'; END IF;
  IF (SELECT count(*) FROM public.director_kyc_upload_intents) <> 0
     OR (SELECT count(*) FROM public.director_kyc_calc_snapshot) <> 0
     OR (SELECT count(*) FROM public.documents WHERE compliance_type='DIRECTOR_KYC') <> 0
     OR (SELECT count(*) FROM public.director_kyc_documents) <> 0
    THEN RAISE EXCEPTION 'ABORT: data present -> use POSTDATA rollback'; END IF;
END $g$;
DROP TRIGGER IF EXISTS trg_dkyc_block_doc_delete ON public.documents;
DROP FUNCTION IF EXISTS public.dkyc_block_doc_delete();
DROP FUNCTION IF EXISTS public.dkyc_cancel_upload_intent(uuid);
DROP FUNCTION IF EXISTS public.dkyc_finalize_document_upload(uuid,uuid,text,bigint,text);
DROP FUNCTION IF EXISTS public.dkyc_prepare_document_upload(uuid,text,text,text,bigint);
DROP FUNCTION IF EXISTS public.dkyc_accept_interpretation(uuid,text);
DROP FUNCTION IF EXISTS public.dkyc_verify_filing(uuid,text);
DROP FUNCTION IF EXISTS public.dkyc_record_filing(uuid,text,text,date,text,text);
DROP FUNCTION IF EXISTS public.dkyc_create_initial_obligation(uuid);
DROP FUNCTION IF EXISTS public.dkyc_write_snapshot(uuid,uuid,text,date,uuid);
COMMIT;
