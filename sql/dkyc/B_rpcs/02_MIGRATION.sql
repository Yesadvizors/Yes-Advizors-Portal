-- =====================================================================
-- PACKAGE B v2 — Calculation, status & reader RPCs (REVIEW ARTIFACT — DO NOT RUN)
-- Corrections vs v1:
--  * External readers are SECURITY DEFINER (was missing) with pinned search_path,
--    owner postgres, anon/PUBLIC revoked, authenticated granted.
--  * Private helpers: plain (NOT security definer needed — only ever called by
--    definer wrappers) AND EXECUTE revoked from anon+authenticated.
--  * Hard dependency-abort gates (enum labels, columns, helper signatures).
--  * Record-type-specific branches (PERIODIC_KYC / EVENT_UPDATE / REACTIVATION / HISTORICAL).
--  * Access model uses existing dkyc_can_access_record / dkyc_staff_can_see_holder;
--    fail-closed with stable error NO_ACTOR_IDENTITY / FORBIDDEN_ROLE (no silent empty-set
--    for resolvable-but-unauthorised identity).
--  * Transition evidence tightened (verified + registry date + SRN + period/attestation).
-- compliance_cycle = DUE YEAR. No last_kyc_month+3. New-DIN flagged interpretation.
-- =====================================================================

BEGIN;

-- ---- GATE 0: role ----
DO $g$ BEGIN IF current_user <> 'postgres' THEN RAISE EXCEPTION 'ABORT: expected postgres'; END IF; END $g$;

-- ---- GATE 1: enum labels EXACT ----
DO $e$
DECLARE v text;
BEGIN
  SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) INTO v
    FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='dkyc_record_type_enum';
  IF v <> 'PERIODIC_KYC,EVENT_UPDATE,REACTIVATION,HISTORICAL'
    THEN RAISE EXCEPTION 'ABORT: dkyc_record_type_enum labels=%', v; END IF;
  SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) INTO v
    FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='dkyc_change_type_enum';
  IF v <> 'EMAIL,MOBILE,RESIDENTIAL_ADDRESS,MULTIPLE,OTHER'
    THEN RAISE EXCEPTION 'ABORT: dkyc_change_type_enum labels=%', v; END IF;
END $e$;

-- ---- GATE 2: required columns + helper signatures ----
DO $d$
BEGIN
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='director_kyc_records'
        AND column_name IN ('registry_filing_date','srn_or_ack','filing_result_status','verified_at','verified_by','kyc_fy')) <> 6
    THEN RAISE EXCEPTION 'ABORT: Package A columns missing (apply A first)'; END IF;
  IF (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='din_holder_companies' AND column_name='client_id') <> 'uuid'
    THEN RAISE EXCEPTION 'ABORT: din_holder_companies.client_id not uuid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='dkyc_can_access_record'
                   AND pg_get_function_identity_arguments(p.oid)='p_record_id uuid')
    THEN RAISE EXCEPTION 'ABORT: dkyc_can_access_record(uuid) signature mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='dkyc_staff_can_see_holder'
                   AND pg_get_function_identity_arguments(p.oid)='p_holder_id uuid')
    THEN RAISE EXCEPTION 'ABORT: dkyc_staff_can_see_holder(uuid) signature mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='dkyc_compute_standard_due_date')
    THEN RAISE EXCEPTION 'ABORT: dkyc_compute_standard_due_date missing'; END IF;
END $d$;

-- ====================== B.0 rule version =============================
CREATE OR REPLACE FUNCTION public.dkyc_rule_version()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public,pg_temp
AS $f$ SELECT 'DKYC-RULES-2026.1'::text $f$;
ALTER FUNCTION public.dkyc_rule_version() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_rule_version() FROM PUBLIC, anon, authenticated;

-- ====================== B.0b NEW_DIN cutoff =========================
-- Rule 12A is effective 31 March 2026; the new regime's first applicable 31 March is 31 Mar 2026.
-- A DIN allotted on/after 2025-04-01 (FY2025-26) is first held as on 31 Mar 2026 -> genuine NEW_DIN
-- (no prior KYC may exist). A DIN allotted on/before 2025-03-31 was already held as on 31 Mar 2025
-- under the PRIOR annual-KYC regime; its prior-regime completion can be neither assumed nor disproved
-- -> LEGACY_HISTORY_UNRESOLVED (MANUAL_REVIEW), NOT a new-DIN calculation.
-- Verified prior-regime evidence overrides the date test (handled in classify, below).
CREATE OR REPLACE FUNCTION public.dkyc_new_din_cutoff()
RETURNS date LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public,pg_temp
AS $f$ SELECT DATE '2025-04-01' $f$;   -- allotment >= cutoff => NEW_DIN
ALTER FUNCTION public.dkyc_new_din_cutoff() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_new_din_cutoff() FROM PUBLIC, anon, authenticated;

-- ====================== B.1 private FY helpers =======================
CREATE OR REPLACE FUNCTION public.dkyc_fy_start(p_d date)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public,pg_temp
AS $f$ SELECT CASE WHEN extract(month from p_d)>=4 THEN extract(year from p_d)::int
                   ELSE extract(year from p_d)::int - 1 END $f$;
ALTER FUNCTION public.dkyc_fy_start(date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_fy_start(date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dkyc_first_applicable_march(p_allotment_date date)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public,pg_temp
AS $f$ SELECT CASE WHEN p_allotment_date IS NULL THEN NULL
                   ELSE make_date(public.dkyc_fy_start(p_allotment_date)+1, 3, 31) END $f$;
ALTER FUNCTION public.dkyc_first_applicable_march(date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_first_applicable_march(date) FROM PUBLIC, anon, authenticated;

-- ====================== B.2 routine due (PRIVATE) ====================
-- ONLY for PERIODIC_KYC routine obligation. compliance_cycle = due year.
CREATE OR REPLACE FUNCTION public.dkyc_compute_due(
  p_allotment_date date, p_prior_regime_completed boolean, p_as_of_date date
) RETURNS TABLE (
  first_applicable_march date, third_financial_year_start smallint, due_year smallint,
  due_date date, compliance_cycle smallint, reason_code text, rule_version text,
  interpretation_applied boolean, admin_review_status text, source_basis_note text,
  classification_path text
) LANGUAGE plpgsql STABLE SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE v_fam date; v_tfys int; v_due_year int; v_cutoff date := public.dkyc_new_din_cutoff();
BEGIN
  rule_version := public.dkyc_rule_version();

  -- PATH 1 — PRIOR_REGIME_VERIFIED (precedence over the date test).
  -- Verified completed KYC under the previous regime -> confirmed transition due 30 June 2028.
  IF p_prior_regime_completed IS TRUE THEN
    classification_path:='PRIOR_REGIME_VERIFIED';
    due_year:=2028; due_date:=make_date(2028,6,30); compliance_cycle:=2028;
    reason_code:='TRANSITION_PRIOR_REGIME'; interpretation_applied:=false; admin_review_status:='NONE';
    source_basis_note:='PIB: prior-regime KYC-complete directors next due 30 June 2028 (evidence-verified)';
    RETURN NEXT; RETURN;
  END IF;

  -- No anchor at all -> cannot classify.
  IF p_allotment_date IS NULL THEN
    classification_path:='MANUAL_REVIEW';
    reason_code:='MANUAL_REVIEW_NO_ANCHOR_DATA'; interpretation_applied:=false;
    admin_review_status:='REVIEW_RECOMMENDED'; source_basis_note:='No allotment date, no verified prior-regime KYC';
    RETURN NEXT; RETURN;
  END IF;
  IF p_allotment_date > p_as_of_date THEN
    classification_path:='MANUAL_REVIEW';
    reason_code:='MANUAL_REVIEW_CONFLICTING_DATA'; interpretation_applied:=false;
    admin_review_status:='REVIEW_RECOMMENDED'; source_basis_note:='Allotment later than as-of date';
    RETURN NEXT; RETURN;
  END IF;

  -- PATH 3 — LEGACY_HISTORY_UNRESOLVED: allotted BEFORE the new-DIN cutoff (on/before 2025-03-31).
  -- Already held as on 31 March 2025 under the prior regime; completion neither verified nor
  -- safely disproved -> MANUAL_REVIEW. Do NOT calculate as a new DIN.
  IF p_allotment_date < v_cutoff THEN
    classification_path:='LEGACY_HISTORY_UNRESOLVED';
    reason_code:='MANUAL_REVIEW_LEGACY_HISTORY_UNRESOLVED'; interpretation_applied:=false;
    admin_review_status:='REVIEW_RECOMMENDED';
    source_basis_note:=format('DIN allotted %s is before new-DIN cutoff %s; prior-regime status unresolved',
                              p_allotment_date, v_cutoff);
    RETURN NEXT; RETURN;
  END IF;

  -- PATH 2 — NEW_DIN: allotted on/after cutoff (FY2025-26 onward). First held as on 31 Mar 2026+.
  -- No prior KYC evidence required (a genuine new DIN may have none). Interpreted first-cycle count.
  classification_path:='NEW_DIN';
  v_fam := public.dkyc_first_applicable_march(p_allotment_date);
  v_tfys := public.dkyc_fy_start(v_fam) + 3;
  v_due_year := v_tfys + 1;
  first_applicable_march:=v_fam; third_financial_year_start:=v_tfys::smallint;
  due_year:=v_due_year::smallint; due_date:=make_date(v_due_year,6,30); compliance_cycle:=v_due_year::smallint;
  reason_code:='NEW_DIN_FY_ANCHOR'; interpretation_applied:=true; admin_review_status:='REVIEW_RECOMMENDED';
  source_basis_note:='Rule 12A triennial; first-cycle count interpreted (not an express MCA worked formula)';
  RETURN NEXT;
END $f$;
ALTER FUNCTION public.dkyc_compute_due(date,boolean,date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_compute_due(date,boolean,date) FROM PUBLIC, anon, authenticated;

-- ====================== B.2b transition-evidence test (PRIVATE) ======
-- prior-regime completion requires VERIFIED filing + registry date + SRN on a
-- HISTORICAL/PERIODIC record (audited operator attestation flows through the same
-- verified record). Without ALL of these -> false (=> compute falls to new-DIN/MANUAL_REVIEW).
CREATE OR REPLACE FUNCTION public.dkyc_has_prior_regime_evidence(p_din_holder_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog,public,pg_temp
AS $f$
  SELECT EXISTS (
    SELECT 1 FROM public.director_kyc_records h
    WHERE h.din_holder_id = p_din_holder_id
      AND h.record_type IN ('HISTORICAL','PERIODIC_KYC')
      AND h.filing_result_status = 'TAKEN_ON_FILE'
      AND h.verified_at IS NOT NULL
      AND h.registry_filing_date IS NOT NULL
      AND h.srn_or_ack IS NOT NULL
  )
$f$;
ALTER FUNCTION public.dkyc_has_prior_regime_evidence(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_has_prior_regime_evidence(uuid) FROM PUBLIC, anon, authenticated;

-- ====================== B.3 internal-control advisory (PRIVATE) ======
CREATE OR REPLACE FUNCTION public.dkyc_internal_control(
  p_record_type public.dkyc_record_type_enum, p_change_type public.dkyc_change_type_enum, p_has_change_doc boolean
) RETURNS TABLE (
  internal_control_status text, internal_control_classification text,
  internal_control_reason_code text, internal_control_message text, internal_control_rule_version text
) LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,public,pg_temp
AS $f$
BEGIN
  internal_control_rule_version := public.dkyc_rule_version();
  IF p_record_type='EVENT_UPDATE' AND p_change_type IN ('RESIDENTIAL_ADDRESS','MULTIPLE') AND p_has_change_doc IS NOT TRUE THEN
    internal_control_status:='DOCUMENT_REVIEW_REQUIRED'; internal_control_classification:='INTERNAL_PRACTICE_REQUIRED';
    internal_control_reason_code:='ADDRESS_PROOF_INTERNAL_PRACTICE';
    internal_control_message:='Address proof pending — internal practice requirement'; RETURN NEXT; RETURN;
  END IF;
  IF ((p_record_type='EVENT_UPDATE' AND p_change_type IN ('MOBILE','EMAIL','OTHER')) OR p_record_type='REACTIVATION')
     AND p_has_change_doc IS NOT TRUE THEN
    internal_control_status:='UNRESOLVED_REQUIREMENT'; internal_control_classification:='UNRESOLVED';
    internal_control_reason_code:='DOC_REQ_UNCONFIRMED';
    internal_control_message:='Supporting document requirement not officially confirmed'; RETURN NEXT; RETURN;
  END IF;
  internal_control_status:='NONE'; internal_control_classification:='OPTIONAL';
  internal_control_reason_code:='DOCS_NONE_REQUIRED'; internal_control_message:=NULL; RETURN NEXT;
END $f$;
ALTER FUNCTION public.dkyc_internal_control(public.dkyc_record_type_enum,public.dkyc_change_type_enum,boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_internal_control(public.dkyc_record_type_enum,public.dkyc_change_type_enum,boolean) FROM PUBLIC, anon, authenticated;

-- ====================== B.4 reminder band (PRIVATE) ==================
CREATE OR REPLACE FUNCTION public.dkyc_reminder_band(p_due date, p_as_of date)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public,pg_temp
AS $f$
  SELECT CASE
    WHEN p_due IS NULL OR p_as_of IS NULL THEN 'NONE'
    WHEN p_as_of > p_due THEN 'OVERDUE'
    WHEN p_as_of = p_due THEN 'DUE_TODAY'
    WHEN p_due - p_as_of <= 7 THEN 'D7'
    WHEN p_due - p_as_of <= 30 THEN 'D30'
    WHEN p_due - p_as_of <= 60 THEN 'D60'
    ELSE 'NONE' END
$f$;
ALTER FUNCTION public.dkyc_reminder_band(date,date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_reminder_band(date,date) FROM PUBLIC, anon, authenticated;

-- ====================== B.5 record-level resolver (PRIVATE) ==========
-- Record-type-specific branches. Returns one compliance_status + parallel advisory.
CREATE OR REPLACE FUNCTION public.dkyc_record_status(p_record_id uuid, p_as_of_date date)
RETURNS TABLE (
  compliance_status text, reason_code text, rule_version text, due_date date,
  interpretation_applied boolean, admin_review_status text,
  internal_control_status text, internal_control_classification text,
  internal_control_reason_code text, internal_control_message text
) LANGUAGE plpgsql STABLE SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE r record; c record; ic record; v_band text; v_prior boolean; v_allot date; v_event_due date;
BEGIN
  SELECT dkr.*, dh.din_allotment_date AS allot INTO r
  FROM public.director_kyc_records dkr JOIN public.din_holders dh ON dh.id=dkr.din_holder_id
  WHERE dkr.id=p_record_id;
  IF NOT FOUND THEN
    compliance_status:='MANUAL_REVIEW'; reason_code:='RECORD_NOT_FOUND'; rule_version:=public.dkyc_rule_version();
    interpretation_applied:=false; admin_review_status:='REVIEW_RECOMMENDED';
    internal_control_status:='NONE'; internal_control_classification:='OPTIONAL';
    internal_control_reason_code:='NA'; internal_control_message:=NULL; RETURN NEXT; RETURN;
  END IF;
  rule_version:=public.dkyc_rule_version();
  -- advisory (parallel; never recolours)
  SELECT * INTO ic FROM public.dkyc_internal_control(r.record_type, r.change_type,
     EXISTS (SELECT 1 FROM public.documents d WHERE d.compliance_ref_id=r.id
              AND d.compliance_type='DIRECTOR_KYC' AND d.doc_category='CHANGE_SUPPORTING_DOCUMENT'));
  internal_control_status:=ic.internal_control_status; internal_control_classification:=ic.internal_control_classification;
  internal_control_reason_code:=ic.internal_control_reason_code; internal_control_message:=ic.internal_control_message;

  -- ============ RECORD-TYPE BRANCHES ============
  IF r.record_type = 'HISTORICAL' THEN
    -- history/evidence status; NOT a future periodic due calc.
    interpretation_applied:=false; admin_review_status:='NONE'; due_date:=NULL;
    IF r.filing_result_status='TAKEN_ON_FILE' AND r.verified_at IS NOT NULL THEN
      compliance_status:='FILED_VERIFIED'; reason_code:='HISTORICAL_VERIFIED';
    ELSE
      compliance_status:='MANUAL_REVIEW'; reason_code:='HISTORICAL_EVIDENCE_INCOMPLETE';
      admin_review_status:='REVIEW_RECOMMENDED';
    END IF;
    RETURN NEXT; RETURN;

  ELSIF r.record_type = 'REACTIVATION' THEN
    -- explicit record/evidence; cycle effect unresolved -> MANUAL_REVIEW unless fully completed.
    interpretation_applied:=false; due_date:=NULL;
    IF r.filing_result_status='TAKEN_ON_FILE' AND r.verified_at IS NOT NULL THEN
      compliance_status:='FILED_VERIFIED'; reason_code:='REACTIVATION_COMPLETED'; admin_review_status:='REVIEWED';
    ELSIF r.filing_result_status='REJECTED' AND r.resubmission_required THEN
      compliance_status:='OVERDUE'; reason_code:='REJECTED'; admin_review_status:='REVIEW_RECOMMENDED';
    ELSE
      compliance_status:='MANUAL_REVIEW'; reason_code:='MANUAL_REVIEW_REACTIVATION_CYCLE_EFFECT';
      admin_review_status:='REVIEW_RECOMMENDED';
    END IF;
    RETURN NEXT; RETURN;

  ELSIF r.record_type = 'EVENT_UPDATE' THEN
    -- 30-day deadline is confirmed by Rule 12A(2) ONLY for the enumerated personal-particulars
    -- changes: mobile, email, residential address (MULTIPLE = a combination of those). The 'OTHER'
    -- category is NOT a confirmed statutory 30-day event, so it FAILS CLOSED to MANUAL_REVIEW rather
    -- than being given an unproven trigger_date+30 deadline. A NULL change_type is likewise unclassifiable.
    interpretation_applied:=false; admin_review_status:='NONE';
    IF r.change_type IS NULL OR r.change_type = 'OTHER' THEN
      compliance_status:='MANUAL_REVIEW';
      reason_code:= CASE WHEN r.change_type IS NULL THEN 'MANUAL_REVIEW_EVENT_TYPE_UNSPECIFIED'
                         ELSE 'MANUAL_REVIEW_EVENT_OTHER_NOT_CLASSIFIED' END;
      admin_review_status:='REVIEW_RECOMMENDED'; due_date:=NULL; RETURN NEXT; RETURN;
    END IF;
    -- Confirmed 30-day categories only (MOBILE, EMAIL, RESIDENTIAL_ADDRESS, MULTIPLE).
    IF r.trigger_date IS NULL THEN
      compliance_status:='MANUAL_REVIEW'; reason_code:='MANUAL_REVIEW_NO_TRIGGER_DATE';
      admin_review_status:='REVIEW_RECOMMENDED'; due_date:=NULL; RETURN NEXT; RETURN;
    END IF;
    v_event_due := r.trigger_date + 30;  -- 30 days, confirmed (Rule 12A(2))
    due_date := v_event_due;
    IF r.filing_result_status='REJECTED' AND r.resubmission_required THEN
      compliance_status:='OVERDUE'; reason_code:='REJECTED'; RETURN NEXT; RETURN;
    END IF;
    IF r.filing_result_status='TAKEN_ON_FILE' AND r.verified_at IS NOT NULL THEN
      compliance_status:='FILED_VERIFIED'; reason_code:='FILED_VERIFIED'; RETURN NEXT; RETURN;
    END IF;
    IF r.filing_result_status IN ('SUBMITTED','CONFIRMATION_PENDING') AND r.verified_at IS NULL THEN
      compliance_status:='SUBMITTED_PENDING'; reason_code:='SUBMITTED_PENDING'; RETURN NEXT; RETURN;
    END IF;
    IF p_as_of_date > v_event_due THEN
      compliance_status:='OVERDUE'; reason_code:='EVENT_UPDATE_OVERDUE'; RETURN NEXT; RETURN;
    END IF;
    v_band := public.dkyc_reminder_band(v_event_due, p_as_of_date);
    IF v_band IN ('DUE_TODAY','D7','D30','D60') THEN
      compliance_status:='DUE_SOON'; reason_code:='DUE_SOON'; RETURN NEXT; RETURN;
    END IF;
    compliance_status:='NOT_YET_DUE'; reason_code:='NOT_YET_DUE'; RETURN NEXT; RETURN;

  ELSE  -- PERIODIC_KYC
    v_prior := public.dkyc_has_prior_regime_evidence(r.din_holder_id);
    v_allot := r.allot;
    SELECT * INTO c FROM public.dkyc_compute_due(v_allot, v_prior, p_as_of_date);
    interpretation_applied:=c.interpretation_applied; admin_review_status:=c.admin_review_status; due_date:=c.due_date;
    IF c.reason_code LIKE 'MANUAL_REVIEW%' THEN
      compliance_status:='MANUAL_REVIEW'; reason_code:=c.reason_code; RETURN NEXT; RETURN;
    END IF;
    IF r.filing_result_status='REJECTED' AND r.resubmission_required THEN
      compliance_status:='OVERDUE'; reason_code:='REJECTED'; RETURN NEXT; RETURN;
    END IF;
    IF c.due_date IS NOT NULL AND p_as_of_date > c.due_date AND r.filing_result_status<>'TAKEN_ON_FILE' THEN
      compliance_status:=CASE WHEN c.interpretation_applied THEN 'OVERDUE_INTERPRETED' ELSE 'OVERDUE' END;
      reason_code:=CASE WHEN c.interpretation_applied THEN 'OVERDUE_UNDER_INTERPRETED_RULE' ELSE c.reason_code END;
      RETURN NEXT; RETURN;
    END IF;
    v_band := public.dkyc_reminder_band(c.due_date, p_as_of_date);
    IF r.filing_result_status='NOT_SUBMITTED' AND v_band IN ('DUE_TODAY','D7','D30','D60') THEN
      compliance_status:='DUE_SOON'; reason_code:='DUE_SOON'; RETURN NEXT; RETURN;
    END IF;
    IF r.filing_result_status IN ('SUBMITTED','CONFIRMATION_PENDING') AND r.verified_at IS NULL THEN
      compliance_status:='SUBMITTED_PENDING'; reason_code:='SUBMITTED_PENDING'; RETURN NEXT; RETURN;
    END IF;
    IF r.filing_result_status='TAKEN_ON_FILE' AND r.verified_at IS NOT NULL THEN
      compliance_status:='FILED_VERIFIED'; reason_code:='FILED_VERIFIED'; RETURN NEXT; RETURN;
    END IF;
    compliance_status:='NOT_YET_DUE'; reason_code:='NOT_YET_DUE'; RETURN NEXT; RETURN;
  END IF;
END $f$;
ALTER FUNCTION public.dkyc_record_status(uuid,date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_record_status(uuid,date) FROM PUBLIC, anon, authenticated;

-- ====================== B.6 routine-obligation resolver (PRIVATE) ====
CREATE OR REPLACE FUNCTION public.dkyc_routine_obligation_status(p_din_holder_id uuid, p_as_of_date date)
RETURNS TABLE (
  compliance_status text, reason_code text, rule_version text, compliance_cycle smallint,
  due_date date, next_reminder_band text, interpretation_applied boolean, admin_review_status text
) LANGUAGE plpgsql STABLE SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE v_allot date; v_prior boolean; c record; v_rec uuid; rs record;
BEGIN
  SELECT din_allotment_date INTO v_allot FROM public.din_holders WHERE id=p_din_holder_id;
  v_prior := public.dkyc_has_prior_regime_evidence(p_din_holder_id);
  SELECT * INTO c FROM public.dkyc_compute_due(v_allot, v_prior, p_as_of_date);
  rule_version:=c.rule_version; compliance_cycle:=c.compliance_cycle; due_date:=c.due_date;
  interpretation_applied:=c.interpretation_applied; admin_review_status:=c.admin_review_status;
  next_reminder_band:=public.dkyc_reminder_band(c.due_date, p_as_of_date);
  SELECT id INTO v_rec FROM public.director_kyc_records
   WHERE din_holder_id=p_din_holder_id AND record_type='PERIODIC_KYC' AND compliance_cycle=c.compliance_cycle
   ORDER BY created_at DESC LIMIT 1;
  IF v_rec IS NOT NULL THEN
    SELECT * INTO rs FROM public.dkyc_record_status(v_rec, p_as_of_date);
    compliance_status:=rs.compliance_status; reason_code:=rs.reason_code;
    interpretation_applied:=rs.interpretation_applied; admin_review_status:=rs.admin_review_status;
    due_date:=COALESCE(rs.due_date, due_date); RETURN NEXT; RETURN;
  END IF;
  IF c.reason_code LIKE 'MANUAL_REVIEW%' THEN compliance_status:='MANUAL_REVIEW'; reason_code:=c.reason_code; RETURN NEXT; RETURN; END IF;
  IF c.due_date IS NOT NULL AND p_as_of_date > c.due_date THEN
    compliance_status:=CASE WHEN c.interpretation_applied THEN 'OVERDUE_INTERPRETED' ELSE 'OVERDUE' END;
    reason_code:=CASE WHEN c.interpretation_applied THEN 'OVERDUE_UNDER_INTERPRETED_RULE' ELSE c.reason_code END;
    RETURN NEXT; RETURN;
  END IF;
  IF next_reminder_band IN ('DUE_TODAY','D7','D30','D60') THEN compliance_status:='DUE_SOON'; reason_code:='DUE_SOON'; RETURN NEXT; RETURN; END IF;
  compliance_status:='NOT_YET_DUE'; reason_code:='NOT_YET_DUE'; RETURN NEXT;
END $f$;
ALTER FUNCTION public.dkyc_routine_obligation_status(uuid,date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_routine_obligation_status(uuid,date) FROM PUBLIC, anon, authenticated;

-- ====================== B.7 DIN-summary resolver (PRIVATE) ===========
CREATE OR REPLACE FUNCTION public.dkyc_din_summary_status(p_din_holder_id uuid, p_as_of_date date)
RETURNS TABLE (
  routine_status text, open_change_events int, change_overdue boolean,
  reactivation_required boolean, aggregate_status text, reason_code text, rule_version text
) LANGUAGE plpgsql STABLE SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE ro record;
BEGIN
  SELECT * INTO ro FROM public.dkyc_routine_obligation_status(p_din_holder_id, p_as_of_date);
  routine_status:=ro.compliance_status; rule_version:=ro.rule_version;
  open_change_events := (SELECT count(*) FROM public.director_kyc_records
     WHERE din_holder_id=p_din_holder_id AND record_type='EVENT_UPDATE'
       AND filing_result_status NOT IN ('TAKEN_ON_FILE','WITHDRAWN'));
  change_overdue := EXISTS (SELECT 1 FROM public.director_kyc_records
     WHERE din_holder_id=p_din_holder_id AND record_type='EVENT_UPDATE'
       AND filing_result_status NOT IN ('TAKEN_ON_FILE','WITHDRAWN')
       AND trigger_date IS NOT NULL AND (p_as_of_date - trigger_date) > 30);
  reactivation_required := EXISTS (SELECT 1 FROM public.director_kyc_records
     WHERE din_holder_id=p_din_holder_id AND record_type='REACTIVATION'
       AND filing_result_status NOT IN ('TAKEN_ON_FILE','WITHDRAWN'));
  aggregate_status := CASE
     WHEN reactivation_required THEN 'REACTIVATION_REQUIRED'
     WHEN change_overdue THEN 'OVERDUE'
     WHEN routine_status='MANUAL_REVIEW' THEN 'MANUAL_REVIEW'
     WHEN routine_status IN ('OVERDUE','OVERDUE_INTERPRETED') THEN routine_status
     WHEN open_change_events>0 THEN 'DUE_SOON'
     ELSE routine_status END;
  reason_code:='DIN_SUMMARY'; RETURN NEXT;
END $f$;
ALTER FUNCTION public.dkyc_din_summary_status(uuid,date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_din_summary_status(uuid,date) FROM PUBLIC, anon, authenticated;

-- ====================== B.8 EXTERNAL READERS (SECURITY DEFINER) ======
-- Access model: Admin/Manager see all; assigned staff see their assigned records
-- (via dkyc_can_access_record); unresolved identity -> stable NO_ACTOR_IDENTITY error.
CREATE OR REPLACE FUNCTION public.dkyc_list_activitywise(
  p_fy text DEFAULT NULL, p_status text DEFAULT NULL,
  p_record_type public.dkyc_record_type_enum DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL, p_due_from date DEFAULT NULL, p_due_to date DEFAULT NULL,
  p_search text DEFAULT NULL, p_limit int DEFAULT 100, p_offset int DEFAULT 0,
  p_as_of_date date DEFAULT current_date
) RETURNS TABLE (
  din_holder_id uuid, record_id uuid, client_id uuid, client_code text, company_name text,
  director_name text, din text, record_type public.dkyc_record_type_enum, kyc_fy text,
  compliance_cycle smallint, due_date date, next_reminder_band text,
  compliance_status text, reason_code text, rule_version text,
  interpretation_applied boolean, admin_review_status text,
  srn_or_ack text, registry_filing_date date, filed_date timestamptz, filing_result_status text,
  internal_control_status text, internal_control_classification text,
  internal_control_reason_code text, internal_control_message text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE v_like text; v_is_mgr boolean; v_member uuid;
BEGIN
  v_member := public.dkyc_current_ct_member_id();
  v_is_mgr := public.dkyc_is_admin_or_manager();
  IF v_member IS NULL AND NOT v_is_mgr THEN RAISE EXCEPTION 'NO_ACTOR_IDENTITY'; END IF;  -- fail-closed, explicit
  IF p_fy IS NOT NULL AND p_fy !~ '^[0-9]{4}-[0-9]{2}$' THEN RAISE EXCEPTION 'INVALID_FY_FORMAT'; END IF;
  IF p_limit < 1 OR p_limit > 200 THEN RAISE EXCEPTION 'PAGINATION_OUT_OF_RANGE'; END IF;
  IF p_offset < 0 THEN RAISE EXCEPTION 'PAGINATION_OUT_OF_RANGE'; END IF;
  IF p_due_from IS NOT NULL AND p_due_to IS NOT NULL AND p_due_from > p_due_to THEN RAISE EXCEPTION 'DUE_RANGE_INVALID'; END IF;
  IF p_search IS NOT NULL THEN
    IF length(btrim(p_search)) < 2 THEN RAISE EXCEPTION 'SEARCH_TOO_SHORT'; END IF;
    v_like := '%'||replace(replace(replace(btrim(p_search),'\','\\'),'%','\%'),'_','\_')||'%';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT dkr.id AS record_id, dkr.din_holder_id, dkr.record_type, dkr.kyc_fy,
           dkr.srn_or_ack, dkr.registry_filing_date, dkr.filed_date, dkr.filing_result_status,
           dh.din, dh.full_name AS director_name, dhc.client_id AS client_uuid
    FROM public.director_kyc_records dkr
    JOIN public.din_holders dh ON dh.id=dkr.din_holder_id
    LEFT JOIN public.din_holder_companies dhc ON dhc.id=dkr.din_holder_company_id
    WHERE (p_record_type IS NULL OR dkr.record_type=p_record_type)
      AND (p_assigned_to IS NULL OR dkr.assigned_to=p_assigned_to)
      AND (p_fy IS NULL OR dkr.kyc_fy=p_fy)
      -- ACCESS: managers see all; others only records they can access
      AND (v_is_mgr OR public.dkyc_can_access_record(dkr.id))
  ), enriched AS (
    SELECT b.*, cl.id AS client_id_real, cl.client_id AS client_code, cl.name AS company_name,
           rs.compliance_status, rs.reason_code, rs.rule_version, rs.due_date,
           rs.interpretation_applied, rs.admin_review_status,
           rs.internal_control_status, rs.internal_control_classification,
           rs.internal_control_reason_code, rs.internal_control_message,
           rob.compliance_cycle, rob.next_reminder_band
    FROM base b
    LEFT JOIN public.clients cl ON cl.id=b.client_uuid
    CROSS JOIN LATERAL public.dkyc_record_status(b.record_id, p_as_of_date) rs
    CROSS JOIN LATERAL public.dkyc_routine_obligation_status(b.din_holder_id, p_as_of_date) rob
  )
  SELECT din_holder_id, record_id, client_id_real, client_code, company_name, director_name, din,
         record_type, kyc_fy, compliance_cycle, due_date, next_reminder_band,
         compliance_status, reason_code, rule_version, interpretation_applied, admin_review_status,
         srn_or_ack, registry_filing_date, filed_date, filing_result_status,
         internal_control_status, internal_control_classification, internal_control_reason_code, internal_control_message
  FROM enriched
  WHERE (p_status IS NULL OR compliance_status=p_status)
    AND (p_due_from IS NULL OR due_date >= p_due_from)
    AND (p_due_to IS NULL OR due_date <= p_due_to)
    AND (v_like IS NULL OR director_name ILIKE v_like ESCAPE '\' OR company_name ILIKE v_like ESCAPE '\')
  ORDER BY company_name, director_name
  LIMIT p_limit OFFSET p_offset;
END $f$;
ALTER FUNCTION public.dkyc_list_activitywise(text,text,public.dkyc_record_type_enum,uuid,date,date,text,int,int,date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_list_activitywise(text,text,public.dkyc_record_type_enum,uuid,date,date,text,int,int,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dkyc_list_activitywise(text,text,public.dkyc_record_type_enum,uuid,date,date,text,int,int,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.dkyc_list_clientwise(
  p_client_id uuid, p_fy text DEFAULT NULL, p_status text DEFAULT NULL,
  p_record_type public.dkyc_record_type_enum DEFAULT NULL,
  p_search text DEFAULT NULL, p_limit int DEFAULT 100, p_offset int DEFAULT 0,
  p_as_of_date date DEFAULT current_date
) RETURNS TABLE (
  din_holder_id uuid, record_id uuid, client_id uuid, client_code text, company_name text,
  director_name text, din text, record_type public.dkyc_record_type_enum, kyc_fy text,
  compliance_cycle smallint, due_date date, next_reminder_band text,
  compliance_status text, reason_code text, rule_version text,
  interpretation_applied boolean, admin_review_status text,
  srn_or_ack text, registry_filing_date date, filed_date timestamptz, filing_result_status text,
  internal_control_status text, internal_control_classification text,
  internal_control_reason_code text, internal_control_message text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp
AS $f$
DECLARE v_like text; v_is_mgr boolean; v_member uuid;
BEGIN
  v_member := public.dkyc_current_ct_member_id();
  v_is_mgr := public.dkyc_is_admin_or_manager();
  IF v_member IS NULL AND NOT v_is_mgr THEN RAISE EXCEPTION 'NO_ACTOR_IDENTITY'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'CLIENT_NOT_FOUND'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id=p_client_id) THEN RAISE EXCEPTION 'CLIENT_NOT_FOUND'; END IF;
  -- BLOCKER 3: explicit client-level authorisation for THIS company.
  -- Record assignment alone must NOT grant visibility under every company linked to the DIN.
  -- staff_can_access_client(): Admin -> all; Manager/Executive/Staff -> only via team_client_access.
  IF NOT public.staff_can_access_client(p_client_id) THEN RAISE EXCEPTION 'CLIENT_FORBIDDEN'; END IF;
  IF p_fy IS NOT NULL AND p_fy !~ '^[0-9]{4}-[0-9]{2}$' THEN RAISE EXCEPTION 'INVALID_FY_FORMAT'; END IF;
  IF p_limit < 1 OR p_limit > 200 THEN RAISE EXCEPTION 'PAGINATION_OUT_OF_RANGE'; END IF;
  IF p_offset < 0 THEN RAISE EXCEPTION 'PAGINATION_OUT_OF_RANGE'; END IF;
  IF p_search IS NOT NULL THEN
    IF length(btrim(p_search)) < 2 THEN RAISE EXCEPTION 'SEARCH_TOO_SHORT'; END IF;
    v_like := '%'||replace(replace(replace(btrim(p_search),'\','\\'),'%','\%'),'_','\_')||'%';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT dkr.id AS record_id, dkr.din_holder_id, dkr.record_type, dkr.kyc_fy,
           dkr.srn_or_ack, dkr.registry_filing_date, dkr.filed_date, dkr.filing_result_status,
           dh.din, dh.full_name AS director_name
    FROM public.director_kyc_records dkr
    JOIN public.din_holders dh ON dh.id=dkr.din_holder_id
    JOIN public.din_holder_companies dhc ON dhc.din_holder_id=dkr.din_holder_id AND dhc.client_id=p_client_id
    WHERE (p_record_type IS NULL OR dkr.record_type=p_record_type)
      AND (p_fy IS NULL OR dkr.kyc_fy=p_fy)
      AND (v_is_mgr OR public.dkyc_can_access_record(dkr.id))
  ), enriched AS (
    SELECT b.*, cl.id AS client_id_real, cl.client_id AS client_code, cl.name AS company_name,
           rs.compliance_status, rs.reason_code, rs.rule_version, rs.due_date,
           rs.interpretation_applied, rs.admin_review_status,
           rs.internal_control_status, rs.internal_control_classification,
           rs.internal_control_reason_code, rs.internal_control_message,
           rob.compliance_cycle, rob.next_reminder_band
    FROM base b
    JOIN public.clients cl ON cl.id=p_client_id
    CROSS JOIN LATERAL public.dkyc_record_status(b.record_id, p_as_of_date) rs
    CROSS JOIN LATERAL public.dkyc_routine_obligation_status(b.din_holder_id, p_as_of_date) rob
  )
  SELECT din_holder_id, record_id, client_id_real, client_code, company_name, director_name, din,
         record_type, kyc_fy, compliance_cycle, due_date, next_reminder_band,
         compliance_status, reason_code, rule_version, interpretation_applied, admin_review_status,
         srn_or_ack, registry_filing_date, filed_date, filing_result_status,
         internal_control_status, internal_control_classification, internal_control_reason_code, internal_control_message
  FROM enriched
  WHERE (p_status IS NULL OR compliance_status=p_status)
    AND (v_like IS NULL OR director_name ILIKE v_like ESCAPE '\' OR company_name ILIKE v_like ESCAPE '\')
  ORDER BY director_name
  LIMIT p_limit OFFSET p_offset;
END $f$;
ALTER FUNCTION public.dkyc_list_clientwise(uuid,text,text,public.dkyc_record_type_enum,text,int,int,date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_list_clientwise(uuid,text,text,public.dkyc_record_type_enum,text,int,int,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dkyc_list_clientwise(uuid,text,text,public.dkyc_record_type_enum,text,int,int,date) TO authenticated;

-- ====================== B.9 DIN-level document read RPC (SECURITY DEFINER) ====
-- Reads the canonical director_kyc_documents BRIDGE (Blocker 4), not documents.client_id.
-- One canonical DIN-level set surfaces across all linked companies. Access-checked.
CREATE OR REPLACE FUNCTION public.dkyc_din_documents(p_din_holder_id uuid)
RETURNS TABLE (
  id uuid, doc_category text, doc_name text, file_path text, mime_type text,
  file_size int, created_at timestamptz, director_kyc_record_id uuid
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp
AS $f$
BEGIN
  IF NOT (public.dkyc_is_admin_or_manager() OR public.dkyc_staff_can_see_holder(p_din_holder_id)) THEN
    RAISE EXCEPTION 'FORBIDDEN_ROLE'; END IF;
  RETURN QUERY
  SELECT d.id, b.doc_category, d.doc_name, d.file_path, d.mime_type, d.file_size, d.created_at,
         b.director_kyc_record_id
  FROM public.director_kyc_documents b
  JOIN public.documents d ON d.id = b.document_id
  WHERE b.din_holder_id = p_din_holder_id
  ORDER BY d.created_at DESC;
END $f$;
ALTER FUNCTION public.dkyc_din_documents(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.dkyc_din_documents(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dkyc_din_documents(uuid) TO authenticated;

COMMIT;
