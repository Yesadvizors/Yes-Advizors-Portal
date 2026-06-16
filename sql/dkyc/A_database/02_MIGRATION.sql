-- =====================================================================
-- PACKAGE A — Director KYC statutory foundation (REVIEW ARTIFACT — DO NOT RUN)
-- Additive only. No change to Phase-1 objects, RLS, roles, or data.
-- Adds: evidence/result columns on director_kyc_records; CHECK catalogues;
--       director_kyc_calc_snapshot (append-only, expression-unique);
--       director_kyc_upload_intents (short-lived). All postgres-owned.
-- compliance_cycle continues to mean the DUE YEAR (per live
-- dkyc_compute_standard_due_date: make_date(compliance_cycle, 6, 30)).
-- =====================================================================

BEGIN;

-- ---- GATE 0: role guard (hosted; no rolsuper) ----------------------
DO $g$ BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'ABORT: expected postgres, got %', current_user; END IF;
  IF NOT has_schema_privilege(current_user,'public','CREATE') THEN RAISE EXCEPTION 'ABORT: no CREATE on public'; END IF;
END $g$;

-- ---- GATE 1: clean-install guard (new columns/tables absent) --------
DO $c$
DECLARE col_n int; tbl_n int;
BEGIN
  SELECT count(*) INTO col_n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='director_kyc_records'
     AND column_name IN ('registry_filing_date','srn_or_ack','filing_result_status',
                         'rejection_date','rejection_reason','resubmission_required',
                         'exception_code','verified_at','verified_by','kyc_fy');
  IF col_n <> 0 THEN RAISE EXCEPTION 'ABORT: % new column(s) already present', col_n; END IF;
  SELECT count(*) INTO tbl_n FROM information_schema.tables
   WHERE table_schema='public' AND table_name IN ('director_kyc_calc_snapshot','director_kyc_upload_intents','director_kyc_documents');
  IF tbl_n <> 0 THEN RAISE EXCEPTION 'ABORT: target table(s) already present (%)', tbl_n; END IF;
END $c$;

-- ---- GATE 2: dependency guard (base table + compute fn exist) -------
DO $d$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='director_kyc_records')
    THEN RAISE EXCEPTION 'ABORT: director_kyc_records missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='dkyc_compute_standard_due_date')
    THEN RAISE EXCEPTION 'ABORT: dkyc_compute_standard_due_date missing'; END IF;
END $d$;

-- ---- A.1 additive evidence/result columns on director_kyc_records ---
-- (Reuses existing filed_date/workflow_stage/due-date-override columns; no duplicates.)
ALTER TABLE public.director_kyc_records
  ADD COLUMN registry_filing_date date,                 -- date filing made at MCA (source); distinct from filed_date
  ADD COLUMN srn_or_ack          text,
  ADD COLUMN filing_result_status text NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN rejection_date      date,
  ADD COLUMN rejection_reason    text,
  ADD COLUMN resubmission_required boolean NOT NULL DEFAULT false,
  ADD COLUMN exception_code      text,
  ADD COLUMN verified_at         timestamptz,
  ADD COLUMN verified_by         uuid,
  ADD COLUMN kyc_fy              text;                    -- FY the routine filing is FOR (YYYY-YY)
-- NOTE: form_type intentionally NOT added (legally gated; lookup/CHECK later).

-- CHECK catalogues (non-enum, so future values are non-destructive to add).
ALTER TABLE public.director_kyc_records
  ADD CONSTRAINT chk_dkyc_filing_result_status CHECK (
    filing_result_status IN ('NOT_SUBMITTED','SUBMITTED','TAKEN_ON_FILE','CONFIRMATION_PENDING',
                             'REJECTED','RESUBMISSION_REQUIRED','WITHDRAWN','UNKNOWN')),
  ADD CONSTRAINT chk_dkyc_kyc_fy_format CHECK (kyc_fy IS NULL OR kyc_fy ~ '^[0-9]{4}-[0-9]{2}$');

-- Hard duplicate backstop (BLOCKER 6): at most one PERIODIC_KYC obligation per (holder, cycle).
-- Partial unique index; does not constrain EVENT_UPDATE/REACTIVATION/HISTORICAL records.
CREATE UNIQUE INDEX uq_dkyc_periodic_holder_cycle
  ON public.director_kyc_records (din_holder_id, compliance_cycle)
  WHERE record_type = 'PERIODIC_KYC';

-- ---- A.2 immutable calculation snapshot ----------------------------
CREATE TABLE public.director_kyc_calc_snapshot (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  din_holder_id              uuid NOT NULL,                       -- logical ref to din_holders.id (validated in RPC)
  director_kyc_record_id     uuid,                                -- logical ref to director_kyc_records.id; NULL = DIN-level
  snapshot_event             text NOT NULL,
  first_applicable_march     date,
  third_financial_year_start smallint,
  due_year                   smallint,
  due_date                   date,
  compliance_cycle           smallint,
  reason_code                text NOT NULL,
  rule_version               text NOT NULL,
  interpretation_applied     boolean NOT NULL DEFAULT false,
  admin_review_status        text NOT NULL DEFAULT 'NONE',
  source_basis_note          text,
  computed_as_of             date NOT NULL,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  created_by                 uuid NOT NULL,
  CONSTRAINT chk_dkyc_snap_event CHECK (snapshot_event IN
    ('OBLIGATION_CREATED','INTERPRETATION_ACCEPTED','FILING_RECORDED',
     'DUE_OVERRIDDEN','VERIFICATION_COMPLETED','RULE_VERSION_RECALC')),
  CONSTRAINT chk_dkyc_snap_admin_review CHECK (admin_review_status IN ('NONE','REVIEW_RECOMMENDED','REVIEWED'))
);

-- Expression-based idempotency index: normalise nullable record id + due_date,
-- include reason_code so distinct unresolved outcomes stay separate.
CREATE UNIQUE INDEX uq_dkyc_calc_snapshot ON public.director_kyc_calc_snapshot (
  din_holder_id,
  COALESCE(director_kyc_record_id, '00000000-0000-0000-0000-000000000000'::uuid),
  snapshot_event,
  rule_version,
  COALESCE(due_date, '0001-01-01'::date),
  reason_code
);

-- Append-only protection (block UPDATE/DELETE at the table).
CREATE OR REPLACE FUNCTION public.dkyc_block_mutation()
RETURNS trigger LANGUAGE plpgsql AS $b$
BEGIN RAISE EXCEPTION 'append-only table: % not allowed', TG_OP; END $b$;
ALTER FUNCTION public.dkyc_block_mutation() OWNER TO postgres;

CREATE TRIGGER trg_dkyc_calc_snapshot_noupd
  BEFORE UPDATE OR DELETE ON public.director_kyc_calc_snapshot
  FOR EACH ROW EXECUTE FUNCTION public.dkyc_block_mutation();

ALTER TABLE public.director_kyc_calc_snapshot ENABLE ROW LEVEL SECURITY;  -- deny-all; RPC-only via SECURITY DEFINER
ALTER TABLE public.director_kyc_calc_snapshot OWNER TO postgres;
REVOKE ALL ON public.director_kyc_calc_snapshot FROM PUBLIC, anon, authenticated;

-- ---- A.3 short-lived upload intents --------------------------------
CREATE TABLE public.director_kyc_upload_intents (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  director_kyc_record_id uuid NOT NULL,                 -- logical ref (validated in RPC)
  approved_storage_path  text NOT NULL,
  doc_category           text NOT NULL,
  expected_mime_type     text NOT NULL,
  expected_file_size     bigint NOT NULL,
  created_by             uuid NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  expires_at             timestamptz NOT NULL,
  finalized_at           timestamptz,
  status                 text NOT NULL DEFAULT 'PREPARED',
  CONSTRAINT chk_dkyc_intent_status CHECK (status IN ('PREPARED','FINALIZED','EXPIRED','CANCELLED')),
  CONSTRAINT chk_dkyc_intent_doc_category CHECK (doc_category IN
    ('KYC_FORM','SRN_ACKNOWLEDGEMENT','CHALLAN','FILING_CONFIRMATION','CHANGE_SUPPORTING_DOCUMENT',
     'REACTIVATION_DOCUMENT','REJECTION_NOTICE','RESUBMISSION_DOCUMENT','OTHER')),
  CONSTRAINT chk_dkyc_intent_size CHECK (expected_file_size > 0 AND expected_file_size <= 5242880)  -- <= 5 MB
);
CREATE INDEX ix_dkyc_intent_open ON public.director_kyc_upload_intents (status, expires_at);

ALTER TABLE public.director_kyc_upload_intents ENABLE ROW LEVEL SECURITY;  -- deny-all; RPC-only
ALTER TABLE public.director_kyc_upload_intents OWNER TO postgres;
REVOKE ALL ON public.director_kyc_upload_intents FROM PUBLIC, anon, authenticated;

-- ---- A.4 canonical DIN/KYC document bridge (BLOCKER 4) -------------
-- Replaces the 'DKYC-DIN-LEVEL' fake client_id. A document row is created in `documents`
-- as normal; this bridge is the AUTHORITATIVE link tying a document to a DIN holder and KYC
-- record, independent of documents.client_id. The DIN-level read RPC reads THIS table, so a
-- single canonical document set surfaces across every linked company without inventing a
-- client code. Narrowly scoped: only DIRECTOR_KYC documents are bridged here.
CREATE TABLE public.director_kyc_documents (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id             uuid NOT NULL,                 -- logical ref to documents.id (validated in RPC; no FK auto-added)
  din_holder_id           uuid NOT NULL,                 -- canonical owner (DIN-level)
  director_kyc_record_id  uuid NOT NULL,                 -- the KYC obligation/filing the doc evidences
  doc_category            text NOT NULL,
  created_by              uuid NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_dkyc_docbridge_category CHECK (doc_category IN
    ('KYC_FORM','SRN_ACKNOWLEDGEMENT','CHALLAN','FILING_CONFIRMATION','CHANGE_SUPPORTING_DOCUMENT',
     'REACTIVATION_DOCUMENT','REJECTION_NOTICE','RESUBMISSION_DOCUMENT','OTHER')),
  CONSTRAINT uq_dkyc_documents_document UNIQUE (document_id)   -- one bridge row per document (idempotent finalize)
);
CREATE INDEX ix_dkyc_documents_holder ON public.director_kyc_documents (din_holder_id);
CREATE INDEX ix_dkyc_documents_record ON public.director_kyc_documents (director_kyc_record_id);

ALTER TABLE public.director_kyc_documents ENABLE ROW LEVEL SECURITY;  -- deny-all; RPC-only
ALTER TABLE public.director_kyc_documents OWNER TO postgres;
REVOKE ALL ON public.director_kyc_documents FROM PUBLIC, anon, authenticated;

-- ---- IN-TRANSACTION VERIFY -----------------------------------------
DO $v$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='director_kyc_records'
     AND column_name IN ('registry_filing_date','srn_or_ack','filing_result_status','rejection_date',
                         'rejection_reason','resubmission_required','exception_code','verified_at','verified_by','kyc_fy');
  IF n <> 10 THEN RAISE EXCEPTION 'VERIFY FAIL: expected 10 new columns, got %', n; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='director_kyc_records' AND column_name='form_type')
    THEN RAISE EXCEPTION 'VERIFY FAIL: form_type must NOT exist yet'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uq_dkyc_calc_snapshot')
    THEN RAISE EXCEPTION 'VERIFY FAIL: snapshot unique index missing'; END IF;
  IF (SELECT count(*) FROM information_schema.role_table_grants
      WHERE table_schema='public' AND table_name='director_kyc_calc_snapshot' AND grantee='authenticated') <> 0
    THEN RAISE EXCEPTION 'VERIFY FAIL: authenticated has grants on snapshot'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='director_kyc_documents')
    THEN RAISE EXCEPTION 'VERIFY FAIL: director_kyc_documents bridge missing'; END IF;
  IF (SELECT count(*) FROM information_schema.role_table_grants
      WHERE table_schema='public' AND table_name='director_kyc_documents' AND grantee='authenticated') <> 0
    THEN RAISE EXCEPTION 'VERIFY FAIL: authenticated has grants on document bridge'; END IF;
  RAISE NOTICE 'VERIFY OK: Package A objects present; form_type absent; snapshot + bridge RPC-only.';
END $v$;

COMMIT;
