-- PACKAGE A — 04_ROLLBACK_PREDATA.sql. SAFE ONLY while snapshot/intents have no rows
-- and the new columns hold no production data. Aborts otherwise.
BEGIN;
DO $g$ BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'ABORT: expected postgres'; END IF;
  IF (SELECT count(*) FROM public.director_kyc_calc_snapshot) <> 0
     OR (SELECT count(*) FROM public.director_kyc_upload_intents) <> 0
     OR (SELECT count(*) FROM public.director_kyc_documents) <> 0
    THEN RAISE EXCEPTION 'ABORT: snapshot/intents/doc-bridge not empty -> use POSTDATA non-destructive rollback'; END IF;
  IF (SELECT count(*) FROM public.director_kyc_records
        WHERE srn_or_ack IS NOT NULL OR registry_filing_date IS NOT NULL OR kyc_fy IS NOT NULL
           OR filing_result_status <> 'NOT_SUBMITTED' OR verified_at IS NOT NULL) <> 0
    THEN RAISE EXCEPTION 'ABORT: evidence columns populated -> use POSTDATA rollback'; END IF;
END $g$;
DROP TABLE IF EXISTS public.director_kyc_documents;
DROP TABLE IF EXISTS public.director_kyc_upload_intents;
DROP TRIGGER IF EXISTS trg_dkyc_calc_snapshot_noupd ON public.director_kyc_calc_snapshot;
DROP TABLE IF EXISTS public.director_kyc_calc_snapshot;
DROP FUNCTION IF EXISTS public.dkyc_block_mutation();
ALTER TABLE public.director_kyc_records
  DROP CONSTRAINT IF EXISTS chk_dkyc_filing_result_status,
  DROP CONSTRAINT IF EXISTS chk_dkyc_kyc_fy_format,
  DROP COLUMN IF EXISTS registry_filing_date, DROP COLUMN IF EXISTS srn_or_ack,
  DROP COLUMN IF EXISTS filing_result_status, DROP COLUMN IF EXISTS rejection_date,
  DROP COLUMN IF EXISTS rejection_reason, DROP COLUMN IF EXISTS resubmission_required,
  DROP COLUMN IF EXISTS exception_code, DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS verified_by, DROP COLUMN IF EXISTS kyc_fy;
COMMIT;
