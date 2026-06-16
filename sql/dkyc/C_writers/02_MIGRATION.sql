-- =====================================================================
-- PACKAGE C v2 — Workflow writers (REVIEW ARTIFACT — DO NOT RUN)
-- Corrections vs v1:
--  * dkyc_log is ONLY called with the three allowed table names
--    (din_holders, din_holder_companies, director_kyc_records) — its built-in guard
--    rejects anything else. Snapshot/document/intent audit logs use
--    p_table_name='director_kyc_records' with a specific action_type.
--  * Snapshot writer respects the dkyc_log guard.
--  * Canonical DIN-level document ownership: documents row carries the DIN holder via
--    director_name + compliance_ref_id (the KYC record), and client_id is set
--    DETERMINISTICALLY to the record's own din_holder_company_id->client (NOT an arbitrary
--    LIMIT 1 across companies). If the record is DIN-level (no company), client_id is the
--    sentinel 'DKYC-DIN-LEVEL' and the doc is shown across all linked companies via the
--    DIN-level read RPC (dkyc_din_documents). No arbitrary company assignment.
--  * Deletion protection trigger is ATTACHED, narrowly scoped to DIRECTOR_KYC rows.
--  * Finalize trust model: callable by Admin/Manager; verified size/MIME must come from the
--    intent (server-side), NOT self-declared by the client — the RPC re-derives bounds from
--    the intent and the Edge Function (Package E) supplies the trusted object metadata.
-- All new functions SECURITY DEFINER, owner postgres, search_path pinned, anon revoked.
-- =====================================================================

BEGIN;

DO $g$ BEGIN IF current_user <> 'postgres' THEN RAISE EXCEPTION 'ABORT: expected postgres'; END IF; END $g$;

-- dependency gate: dkyc_log must exist with the 6-arg signature and the table guard
DO $d$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='dkyc_log'
                   AND pg_get_function_identity_arguments(p.oid)=
                       'p_table_name text, p_record_id uuid, p_action_type text, p_description text, p_old jsonb, p_new jsonb')
    THEN RAISE EXCEPTION 'ABORT: dkyc_log signature mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='director_kyc_calc_snapshot')
    THEN RAISE EXCEPTION 'ABORT: apply Package A first (snapshot table missing)'; END IF;
END $d$;

-- ====================== C.0 snapshot writer (PRIVATE) ================
CREATE OR REPLACE FUNCTION public.dkyc_write_snapshot(
  p_din_holder_id uuid, p_record_id uuid, p_event text, p_as_of date, p_actor uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE v_allot date; v_prior boolean; c record;
BEGIN
  SELECT din_allotment_date INTO v_allot FROM public.din_holders WHERE id=p_din_holder_id;
  v_prior := public.dkyc_has_prior_regime_evidence(p_din_holder_id);
  SELECT * INTO c FROM public.dkyc_compute_due(v_allot, v_prior, p_as_of);
  INSERT INTO public.director_kyc_calc_snapshot(
    din_holder_id, director_kyc_record_id, snapshot_event,
    first_applicable_march, third_financial_year_start, due_year, due_date, compliance_cycle,
    reason_code, rule_version, interpretation_applied, admin_review_status, source_basis_note,
    computed_as_of, created_by)
  VALUES (p_din_holder_id, p_record_id, p_event,
    c.first_applicable_march, c.third_financial_year_start, c.due_year, c.due_date, c.compliance_cycle,
    c.reason_code, c.rule_version, c.interpretation_applied, c.admin_review_status, c.source_basis_note,
    p_as_of, p_actor)
  ON CONFLICT DO NOTHING;   -- idempotent via Package-A expression unique index
  -- audit via dkyc_log using an ALLOWED table name (director_kyc_records), action carries the snapshot detail
  PERFORM public.dkyc_log('director_kyc_records', p_record_id, 'KYC_CALC_SNAPSHOT_WRITTEN',
            'snapshot '||p_event, NULL,
            jsonb_build_object('event',p_event,'reason',c.reason_code,'rule_version',c.rule_version,'din_holder_id',p_din_holder_id));
END $f$;
ALTER FUNCTION public.dkyc_write_snapshot(uuid,uuid,text,date,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_write_snapshot(uuid,uuid,text,date,uuid) FROM PUBLIC, anon, authenticated;

-- ====================== C.1 record filing (Admin/Manager) ============
CREATE OR REPLACE FUNCTION public.dkyc_record_filing(
  p_record_id uuid, p_kyc_fy text, p_srn_or_ack text,
  p_registry_filing_date date, p_filing_result_status text, p_remarks text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE v_actor uuid; r record;
BEGIN
  IF NOT public.dkyc_is_admin_or_manager() THEN RAISE EXCEPTION 'FORBIDDEN_ROLE'; END IF;
  v_actor := public.dkyc_current_ct_member_id();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'NO_ACTOR_IDENTITY'; END IF;
  IF p_kyc_fy IS NOT NULL AND p_kyc_fy !~ '^[0-9]{4}-[0-9]{2}$' THEN RAISE EXCEPTION 'INVALID_FY_FORMAT'; END IF;
  IF p_filing_result_status NOT IN ('NOT_SUBMITTED','SUBMITTED','TAKEN_ON_FILE','CONFIRMATION_PENDING',
       'REJECTED','RESUBMISSION_REQUIRED','WITHDRAWN','UNKNOWN') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF p_filing_result_status IN ('SUBMITTED','TAKEN_ON_FILE','CONFIRMATION_PENDING')
     AND (p_srn_or_ack IS NULL OR length(btrim(p_srn_or_ack))=0) THEN RAISE EXCEPTION 'RESULT_REQUIRES_SRN'; END IF;
  SELECT * INTO r FROM public.director_kyc_records WHERE id=p_record_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'RECORD_NOT_FOUND'; END IF;
  IF r.verified_at IS NOT NULL AND r.filing_result_status='TAKEN_ON_FILE'
     AND p_filing_result_status='TAKEN_ON_FILE' AND r.srn_or_ack IS NOT DISTINCT FROM p_srn_or_ack
     AND r.kyc_fy IS NOT DISTINCT FROM p_kyc_fy THEN
    RETURN jsonb_build_object('status','noop','record_id',p_record_id); END IF;  -- idempotent
  UPDATE public.director_kyc_records
     SET kyc_fy=COALESCE(p_kyc_fy,kyc_fy), srn_or_ack=p_srn_or_ack,
         registry_filing_date=p_registry_filing_date, filing_result_status=p_filing_result_status,
         filed_date=COALESCE(filed_date, now()),
         resubmission_required=(p_filing_result_status='RESUBMISSION_REQUIRED'),
         remarks=COALESCE(p_remarks,remarks), updated_at=now()
   WHERE id=p_record_id;
  PERFORM public.dkyc_log('director_kyc_records', p_record_id, 'KYC_FILING_RECORDED', 'filing recorded',
            NULL, jsonb_build_object('result',p_filing_result_status,'srn',p_srn_or_ack,'kyc_fy',p_kyc_fy,'actor',v_actor));
  IF p_filing_result_status='REJECTED' THEN
    PERFORM public.dkyc_log('director_kyc_records', p_record_id, 'KYC_FILING_REJECTED', 'filing rejected',
              NULL, jsonb_build_object('srn',p_srn_or_ack,'actor',v_actor)); END IF;
  PERFORM public.dkyc_write_snapshot(r.din_holder_id, p_record_id, 'FILING_RECORDED', current_date, v_actor);
  RETURN jsonb_build_object('status','ok','record_id',p_record_id,'result',p_filing_result_status);
END $f$;
ALTER FUNCTION public.dkyc_record_filing(uuid,text,text,date,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_record_filing(uuid,text,text,date,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dkyc_record_filing(uuid,text,text,date,text,text) TO authenticated;

-- ====================== C.2 verify filing (Admin/Manager) ============
CREATE OR REPLACE FUNCTION public.dkyc_verify_filing(p_record_id uuid, p_remarks text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE v_actor uuid; r record;
BEGIN
  IF NOT public.dkyc_is_admin_or_manager() THEN RAISE EXCEPTION 'FORBIDDEN_ROLE'; END IF;
  v_actor := public.dkyc_current_ct_member_id();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'NO_ACTOR_IDENTITY'; END IF;
  SELECT * INTO r FROM public.director_kyc_records WHERE id=p_record_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'RECORD_NOT_FOUND'; END IF;
  IF r.verified_at IS NOT NULL THEN RETURN jsonb_build_object('status','noop','record_id',p_record_id); END IF;
  IF r.filing_result_status <> 'TAKEN_ON_FILE' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  UPDATE public.director_kyc_records SET verified_at=now(), verified_by=v_actor,
         remarks=COALESCE(p_remarks,remarks), updated_at=now() WHERE id=p_record_id;
  PERFORM public.dkyc_log('director_kyc_records', p_record_id, 'KYC_FILING_VERIFIED', 'filing verified',
            NULL, jsonb_build_object('record_id',p_record_id,'actor',v_actor));
  PERFORM public.dkyc_write_snapshot(r.din_holder_id, p_record_id, 'VERIFICATION_COMPLETED', current_date, v_actor);
  RETURN jsonb_build_object('status','ok','record_id',p_record_id);
END $f$;
ALTER FUNCTION public.dkyc_verify_filing(uuid,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_verify_filing(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dkyc_verify_filing(uuid,text) TO authenticated;

-- ====================== C.3 accept interpretation (Admin/Manager) ====
CREATE OR REPLACE FUNCTION public.dkyc_accept_interpretation(p_record_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE v_actor uuid; r record;
BEGIN
  IF NOT public.dkyc_is_admin_or_manager() THEN RAISE EXCEPTION 'FORBIDDEN_ROLE'; END IF;
  v_actor := public.dkyc_current_ct_member_id();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'NO_ACTOR_IDENTITY'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason))=0 THEN RAISE EXCEPTION 'INTERPRETATION_REASON_REQUIRED'; END IF;
  SELECT * INTO r FROM public.director_kyc_records WHERE id=p_record_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'RECORD_NOT_FOUND'; END IF;
  PERFORM public.dkyc_log('director_kyc_records', p_record_id, 'KYC_INTERPRETATION_ACCEPTED', 'interpretation accepted',
            NULL, jsonb_build_object('reason',p_reason,'actor',v_actor));
  PERFORM public.dkyc_write_snapshot(r.din_holder_id, p_record_id, 'INTERPRETATION_ACCEPTED', current_date, v_actor);
  RETURN jsonb_build_object('status','ok','record_id',p_record_id);
END $f$;
ALTER FUNCTION public.dkyc_accept_interpretation(uuid,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_accept_interpretation(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dkyc_accept_interpretation(uuid,text) TO authenticated;

-- ====================== C.4 prepare document upload (Admin/Manager) ==
CREATE OR REPLACE FUNCTION public.dkyc_prepare_document_upload(
  p_record_id uuid, p_doc_category text, p_doc_name text, p_mime_type text, p_file_size bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE v_actor uuid; r record; v_path text; v_intent uuid;
BEGIN
  IF NOT public.dkyc_is_admin_or_manager() THEN RAISE EXCEPTION 'FORBIDDEN_ROLE'; END IF;
  v_actor := public.dkyc_current_ct_member_id();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'NO_ACTOR_IDENTITY'; END IF;
  IF p_doc_category NOT IN ('KYC_FORM','SRN_ACKNOWLEDGEMENT','CHALLAN','FILING_CONFIRMATION',
       'CHANGE_SUPPORTING_DOCUMENT','REACTIVATION_DOCUMENT','REJECTION_NOTICE','RESUBMISSION_DOCUMENT','OTHER')
     THEN RAISE EXCEPTION 'INVALID_DOC_CATEGORY'; END IF;
  IF p_file_size IS NULL OR p_file_size<=0 OR p_file_size>5242880 THEN RAISE EXCEPTION 'UPLOAD_PATH_INVALID'; END IF;
  IF p_mime_type NOT IN ('application/pdf','image/jpeg','image/png') THEN RAISE EXCEPTION 'UPLOAD_PATH_INVALID'; END IF;
  SELECT * INTO r FROM public.director_kyc_records WHERE id=p_record_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARENT_NOT_AUTHORISED'; END IF;
  v_path := 'director-kyc/'||r.din_holder_id::text||'/'||p_record_id::text||'/'||p_doc_category||'/'||gen_random_uuid()::text;
  INSERT INTO public.director_kyc_upload_intents(
    director_kyc_record_id, approved_storage_path, doc_category, expected_mime_type,
    expected_file_size, created_by, expires_at)
  VALUES (p_record_id, v_path, p_doc_category, p_mime_type, p_file_size, v_actor, now()+interval '30 minutes')
  RETURNING id INTO v_intent;
  -- audit via allowed table name
  PERFORM public.dkyc_log('director_kyc_records', p_record_id, 'KYC_DOCUMENT_PREPARED', 'upload prepared',
            NULL, jsonb_build_object('intent',v_intent,'category',p_doc_category,'actor',v_actor));
  RETURN jsonb_build_object('status','ok','intent_id',v_intent,'bucket','secure-docs',
            'approved_storage_path',v_path,'expires_in_seconds',1800);
END $f$;
ALTER FUNCTION public.dkyc_prepare_document_upload(uuid,text,text,text,bigint) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_prepare_document_upload(uuid,text,text,text,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dkyc_prepare_document_upload(uuid,text,text,text,bigint) TO authenticated;

-- ====================== C.5 finalize document upload =================
-- BLOCKERS 1, 2, 8. TRUST MODEL (single architecture, no alternatives):
--  * Callable ONLY by service_role (the Edge Function's credential). authenticated EXECUTE is
--    REVOKED. A direct browser/authenticated call cannot reach this function.
--  * The service-role JWT has no auth.uid(), so the ORIGINATING actor (the Admin/Manager who
--    created the intent) is passed explicitly as p_verifier_actor and MUST equal intent.created_by.
--    The RPC re-validates that this actor is a currently-active Admin/Manager via the team table.
--  * The Edge Function supplies storage-REPORTED object_size/object_mime; the RPC re-checks them
--    against the intent bounds (never trusts client-declared values).
--  * Replay protection: the intent is single-use; status flips PREPARED->FINALIZED atomically. A
--    second call (same or different proof) returns the existing bridge row (idempotent) and writes
--    nothing new.
--  * Document ownership is canonical via director_kyc_documents BRIDGE (no fake client_id). The
--    documents row's client_id is set to the record's real company code when the record is tied to
--    a company, else left NULL (no sentinel); the bridge is the authoritative DIN-level link.
CREATE OR REPLACE FUNCTION public.dkyc_finalize_document_upload(
  p_intent_id uuid, p_verifier_actor uuid, p_doc_name text, p_object_size bigint, p_object_mime text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE i record; r record; v_doc uuid; v_existing uuid; v_client_id text; v_client_name text; v_dir text;
        v_actor_ok boolean;
BEGIN
  -- p_verifier_actor must be a currently-active Admin/Manager team member (team.id).
  SELECT EXISTS (
    SELECT 1 FROM public.team t
    WHERE t.id = p_verifier_actor AND t.is_active = true
      AND (t.is_admin = true OR t.portal_role IN ('Admin','Manager'))
  ) INTO v_actor_ok;
  IF NOT v_actor_ok THEN RAISE EXCEPTION 'FORBIDDEN_ROLE'; END IF;

  SELECT * INTO i FROM public.director_kyc_upload_intents WHERE id=p_intent_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'OBJECT_NOT_FOUND'; END IF;

  -- idempotent / replay: already finalized -> return existing bridge row, write nothing.
  IF i.status='FINALIZED' THEN
    SELECT document_id INTO v_existing FROM public.director_kyc_documents
      WHERE director_kyc_record_id=i.director_kyc_record_id
        AND document_id IN (SELECT id FROM public.documents WHERE file_path=i.approved_storage_path)
      LIMIT 1;
    RETURN jsonb_build_object('status','noop','document_id',v_existing);
  END IF;
  IF i.status='EXPIRED' OR i.expires_at < now() THEN
    UPDATE public.director_kyc_upload_intents SET status='EXPIRED' WHERE id=p_intent_id AND status<>'EXPIRED';
    RAISE EXCEPTION 'INTENT_EXPIRED'; END IF;
  IF i.status='CANCELLED' THEN RAISE EXCEPTION 'INTENT_CANCELLED'; END IF;

  -- actor binding: the verifier actor MUST be the intent creator (originating Admin/Manager).
  IF i.created_by <> p_verifier_actor THEN RAISE EXCEPTION 'PARENT_NOT_AUTHORISED'; END IF;

  -- object metadata re-validation against the intent (storage-reported values from the verifier).
  IF p_object_mime IS DISTINCT FROM i.expected_mime_type THEN RAISE EXCEPTION 'UPLOAD_PATH_INVALID'; END IF;
  IF p_object_size IS NULL OR p_object_size<=0 OR p_object_size>i.expected_file_size OR p_object_size>5242880 THEN
     RAISE EXCEPTION 'UPLOAD_PATH_INVALID'; END IF;

  SELECT * INTO r FROM public.director_kyc_records WHERE id=i.director_kyc_record_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARENT_NOT_AUTHORISED'; END IF;
  SELECT full_name INTO v_dir FROM public.din_holders WHERE id=r.din_holder_id;

  -- documents.client_id: real company code if the record is company-scoped, else NULL (no sentinel).
  IF r.din_holder_company_id IS NOT NULL THEN
    SELECT cl.client_id, cl.name INTO v_client_id, v_client_name
    FROM public.din_holder_companies dhc JOIN public.clients cl ON cl.id=dhc.client_id
    WHERE dhc.id=r.din_holder_company_id;
  ELSE
    v_client_id := NULL; v_client_name := NULL;   -- DIN-level; canonical link is the bridge
  END IF;

  INSERT INTO public.documents(
    client_id, client_name, doc_type, doc_name, file_path, mime_type, file_size,
    uploaded_by, scope, director_name, compliance_type, compliance_ref_id, doc_category, created_at)
  VALUES (v_client_id, v_client_name,
          'DIRECTOR_KYC', p_doc_name, i.approved_storage_path, p_object_mime, p_object_size::int,
          p_verifier_actor::text, 'DIRECTOR_KYC', v_dir, 'DIRECTOR_KYC', i.director_kyc_record_id, i.doc_category, now())
  RETURNING id INTO v_doc;

  -- canonical DIN-level bridge (authoritative cross-company link)
  INSERT INTO public.director_kyc_documents(
    document_id, din_holder_id, director_kyc_record_id, doc_category, created_by)
  VALUES (v_doc, r.din_holder_id, i.director_kyc_record_id, i.doc_category, p_verifier_actor);

  UPDATE public.director_kyc_upload_intents SET status='FINALIZED', finalized_at=now() WHERE id=p_intent_id;
  PERFORM public.dkyc_log('director_kyc_records', i.director_kyc_record_id, 'KYC_DOCUMENT_ATTACHED', 'document attached',
            NULL, jsonb_build_object('document_id',v_doc,'category',i.doc_category,'path',i.approved_storage_path,'actor',p_verifier_actor));
  RETURN jsonb_build_object('status','ok','document_id',v_doc);
END $f$;
ALTER FUNCTION public.dkyc_finalize_document_upload(uuid,uuid,text,bigint,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_finalize_document_upload(uuid,uuid,text,bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dkyc_finalize_document_upload(uuid,uuid,text,bigint,text) TO service_role;

-- ====================== C.6 deletion protection (ATTACHED) ===========
-- Narrowly scoped: only blocks deletes of DIRECTOR_KYC documents with a linked KYC record.
CREATE OR REPLACE FUNCTION public.dkyc_block_doc_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp
AS $f$
BEGIN
  IF OLD.compliance_type='DIRECTOR_KYC' AND OLD.compliance_ref_id IS NOT NULL THEN
    PERFORM public.dkyc_log('director_kyc_records', OLD.compliance_ref_id, 'KYC_DOCUMENT_DELETE_BLOCKED',
              'delete blocked', NULL, jsonb_build_object('document_id',OLD.id));
    RAISE EXCEPTION 'KYC document deletion blocked (append-only filing history)';
  END IF;
  RETURN OLD;  -- non-KYC rows delete normally
END $f$;
ALTER FUNCTION public.dkyc_block_doc_delete() OWNER TO postgres;

-- Attach the trigger (scoped via WHEN so non-KYC deletes are never touched).
DROP TRIGGER IF EXISTS trg_dkyc_block_doc_delete ON public.documents;
CREATE TRIGGER trg_dkyc_block_doc_delete
  BEFORE DELETE ON public.documents
  FOR EACH ROW WHEN (OLD.compliance_type='DIRECTOR_KYC' AND OLD.compliance_ref_id IS NOT NULL)
  EXECUTE FUNCTION public.dkyc_block_doc_delete();

-- ====================== C.7 cancel/expire intent (Admin/Manager) =====
CREATE OR REPLACE FUNCTION public.dkyc_cancel_upload_intent(p_intent_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE v_actor uuid; i record;
BEGIN
  IF NOT public.dkyc_is_admin_or_manager() THEN RAISE EXCEPTION 'FORBIDDEN_ROLE'; END IF;
  v_actor := public.dkyc_current_ct_member_id();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'NO_ACTOR_IDENTITY'; END IF;
  SELECT * INTO i FROM public.director_kyc_upload_intents WHERE id=p_intent_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'OBJECT_NOT_FOUND'; END IF;
  IF i.status='FINALIZED' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  UPDATE public.director_kyc_upload_intents SET status='CANCELLED' WHERE id=p_intent_id;
  RETURN jsonb_build_object('status','ok','intent_id',p_intent_id);
END $f$;
ALTER FUNCTION public.dkyc_cancel_upload_intent(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_cancel_upload_intent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dkyc_cancel_upload_intent(uuid) TO authenticated;

-- ====================== C.8 initial routine obligation (BLOCKER 6) ===
-- Safely creates ONE DIN-level routine (PERIODIC_KYC) obligation for a holder.
--  * Classifies via the engine (PRIOR_REGIME_VERIFIED / NEW_DIN / LEGACY / MANUAL_REVIEW).
--  * Only NEW_DIN and PRIOR_REGIME_VERIFIED produce a calculated obligation row.
--    LEGACY_HISTORY_UNRESOLVED and no-anchor return MANUAL_REVIEW and create NOTHING.
--  * Duplicate-safe: advisory lock on the holder + existence check on (holder, PERIODIC_KYC,
--    compliance_cycle); a second call returns the existing row (idempotent). A partial unique
--    index (Package A) is the hard backstop.
--  * Never reads/auto-imports last_kyc_month or kyc_change_done. din_holder_company_id is left NULL
--    (DIN-level). p_din_holder_company_id is intentionally NOT a parameter.
CREATE OR REPLACE FUNCTION public.dkyc_create_initial_obligation(p_din_holder_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE v_actor uuid; v_allot date; v_prior boolean; c record; v_existing uuid; v_new uuid;
BEGIN
  IF NOT public.dkyc_is_admin_or_manager() THEN RAISE EXCEPTION 'FORBIDDEN_ROLE'; END IF;
  v_actor := public.dkyc_current_ct_member_id();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'NO_ACTOR_IDENTITY'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.din_holders WHERE id=p_din_holder_id) THEN RAISE EXCEPTION 'HOLDER_NOT_FOUND'; END IF;

  -- serialise per-holder to prevent a concurrent duplicate (advisory xact lock)
  PERFORM pg_advisory_xact_lock(hashtextextended(p_din_holder_id::text, 0));

  SELECT din_allotment_date INTO v_allot FROM public.din_holders WHERE id=p_din_holder_id;
  v_prior := public.dkyc_has_prior_regime_evidence(p_din_holder_id);
  SELECT * INTO c FROM public.dkyc_compute_due(v_allot, v_prior, current_date);

  -- Only confirmed transition or genuine new-DIN create a calculated obligation.
  IF c.reason_code LIKE 'MANUAL_REVIEW%' THEN
    RETURN jsonb_build_object('status','manual_review','classification',c.classification_path,
                              'reason_code',c.reason_code,'created',false);
  END IF;

  -- duplicate check on the computed routine cycle
  SELECT id INTO v_existing FROM public.director_kyc_records
   WHERE din_holder_id=p_din_holder_id AND record_type='PERIODIC_KYC'
     AND compliance_cycle=c.compliance_cycle;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('status','exists','record_id',v_existing,
                              'compliance_cycle',c.compliance_cycle,'created',false);
  END IF;

  -- create exactly one DIN-level routine obligation (company NULL). No tracker import.
  INSERT INTO public.director_kyc_records(
    din_holder_id, din_holder_company_id, record_type, compliance_cycle, trigger_date,
    workflow_stage, standard_due_date, filing_result_status, created_at, updated_at)
  VALUES (p_din_holder_id, NULL, 'PERIODIC_KYC', c.compliance_cycle, NULL,
          'Assigned', c.due_date, 'NOT_SUBMITTED', now(), now())
  RETURNING id INTO v_new;

  PERFORM public.dkyc_log('director_kyc_records', v_new, 'KYC_RECORD_CREATED', 'initial routine obligation',
            NULL, jsonb_build_object('classification',c.classification_path,'cycle',c.compliance_cycle,
                                     'due',c.due_date,'interpretation',c.interpretation_applied,'actor',v_actor));
  PERFORM public.dkyc_write_snapshot(p_din_holder_id, v_new, 'OBLIGATION_CREATED', current_date, v_actor);
  RETURN jsonb_build_object('status','ok','record_id',v_new,'classification',c.classification_path,
                            'compliance_cycle',c.compliance_cycle,'due_date',c.due_date,
                            'interpretation_applied',c.interpretation_applied,'created',true);
END $f$;
ALTER FUNCTION public.dkyc_create_initial_obligation(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_create_initial_obligation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dkyc_create_initial_obligation(uuid) TO authenticated;

COMMIT;
