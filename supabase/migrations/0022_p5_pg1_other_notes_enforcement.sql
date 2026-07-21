-- ============================================================================
--  YAV2 — Module 1 — P5 — MIGRATION 0022 — PG-1 OTHER-NOTES ENFORCEMENT
--                       (DRAFT — NOT EXECUTED / NOT APPROVED FOR APPLY)
--
--  STATUS: DRAFT for independent review. NOT approved for execution. PJ is the sole
--          manual executor on V2/yav2-dev. AUTHORED / NOT EXECUTED / AWAITING REVIEW.
--
--  PURPOSE (PG-1 — prerequisite backend gate before CP-5):
--    Establish AUTHORITATIVE enforcement that a service applicability row whose
--    service_code = 'OTHER' MUST carry meaningful (non-blank) notes. Two layers:
--      1. a table CHECK constraint csa_other_notes_required_chk (bypass-proof; the
--         true authority, protecting even the SECURITY DEFINER owner write path);
--      2. controlled guards in the create + update RPCs raising the mapped code
--         'OTHER_NOTES_REQUIRED' (so callers get a friendly error, not a raw CHECK
--         violation string the frontend cannot parse).
--
--  SCOPE (additive, minimal):
--    * ALTER TABLE public.client_service_applicability ADD CONSTRAINT
--        csa_other_notes_required_chk
--        CHECK (service_code <> 'OTHER' OR (notes IS NOT NULL AND btrim(notes) <> ''));
--    * CREATE OR REPLACE public.service_applicability_create  (guard added; body else
--        byte-faithful to Migration 0021; SAME signature/return/DEFINER/search_path);
--    * CREATE OR REPLACE public.service_applicability_update  (guard added; body else
--        byte-faithful to Migration 0021; SAME signature/return/DEFINER/search_path).
--
--  IT DOES NOT (fail-closed asserted in SECTION H):
--    * change public.service_applicability_set_status (approve/deactivate) — untouched;
--    * change RLS, policies, grants/privileges, or the service_catalogue reference data;
--    * change the audit_event_contract (no event added/removed/edited);
--    * insert/update/delete/approve/deactivate ANY client_service_applicability row;
--    * touch clients / clients.services / client_registrations DATA;
--    * generate compliance / tracker / due-date / calendar rows;
--    * change any frontend/source file (the code 'OTHER_NOTES_REQUIRED' is already
--      mapped in src/lib/serviceApplicabilityErrors.js).
--
--  AUTHORISATION CONDITION: client_service_applicability MUST be EMPTY (0 rows) at
--  execution (CP-5/CP-6 write UI is not yet enabled). Fail-closed in SECTION 0.
--
--  Target : V2 / yav2-dev ONLY (ogjrwemjefvccpyjwxuo). V1/Production
--           (zcszesuvjrryxtigjglt) is PROHIBITED. clients.id uuid stays the
--           authoritative client key.
--
--  Single transaction: any failed pre/post assertion rolls the whole migration back.
--  Not rerunnable: SECTION 0 stops if csa_other_notes_required_chk already exists.
-- ============================================================================

BEGIN;

-- ===== SECTION 0 — FAIL-CLOSED PRECONDITIONS + BASELINE ======================
DO $precheck$
DECLARE
  v_missing text;
  v_extra   text;
BEGIN
  -- 0021 base objects must exist (tables)
  IF to_regclass('public.service_catalogue') IS NULL
     OR to_regclass('public.client_service_applicability') IS NULL THEN
    RAISE EXCEPTION 'STOP: Migration 0021 tables missing (service_catalogue / client_service_applicability)';
  END IF;

  -- required helper functions at EXACT signatures (unchanged posture)
  SELECT string_agg(sig, E'\n  ') INTO v_missing
  FROM unnest(ARRAY[
    'public.audit_write_event(text,text,text,text,uuid,jsonb)',
    'public.is_active_user()',
    'public.is_admin_or_manager()'
  ]) AS sig
  WHERE to_regprocedure(sig) IS NULL;
  IF v_missing IS NOT NULL THEN RAISE EXCEPTION E'STOP: required function(s) missing:\n  %', v_missing; END IF;

  -- the THREE 0021 RPCs must exist at EXACT signatures, exactly once each
  SELECT string_agg(sig, E'\n  ') INTO v_missing
  FROM unnest(ARRAY[
    'public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)',
    'public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)',
    'public.service_applicability_set_status(uuid,integer,text,date)'
  ]) AS sig
  WHERE to_regprocedure(sig) IS NULL;
  IF v_missing IS NOT NULL THEN RAISE EXCEPTION E'STOP: expected 0021 RPC signature(s) missing:\n  %', v_missing; END IF;

  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN
        ('service_applicability_create','service_applicability_update','service_applicability_set_status')) <> 3 THEN
    RAISE EXCEPTION 'STOP: unexpected overload(s) of the service applicability RPCs (expected exactly 3)';
  END IF;

  -- NOT RERUNNABLE: the PG-1 constraint must be absent
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='csa_other_notes_required_chk') THEN
    RAISE EXCEPTION 'STOP: csa_other_notes_required_chk already exists (PG-1 not additive / rerun disallowed)';
  END IF;

  -- catalogue must contain an ACTIVE 'OTHER' code (the rule anchor)
  IF NOT EXISTS (SELECT 1 FROM public.service_catalogue WHERE code='OTHER' AND is_active) THEN
    RAISE EXCEPTION 'STOP: service_catalogue has no active OTHER code';
  END IF;

  -- AUTHORISATION: applicability table must be EMPTY (0 rows) at PG-1 execution
  IF (SELECT count(*) FROM public.client_service_applicability) <> 0 THEN
    RAISE EXCEPTION 'STOP: client_service_applicability is not empty; PG-1 is authorised only on an empty table';
  END IF;

  -- NO UNEXPECTED WRITER: only the 3 known RPCs may reference the applicability table
  SELECT string_agg(p.proname, ', ') INTO v_extra
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.prosrc LIKE '%client_service_applicability%'
    AND p.proname NOT IN
      ('service_applicability_create','service_applicability_update','service_applicability_set_status');
  IF v_extra IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: unexpected function(s) reference client_service_applicability: %', v_extra;
  END IF;

  -- RLS + grant posture must match the recorded 0021 posture (unchanged by PG-1)
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
          WHERE oid='public.client_service_applicability'::regclass) THEN
    RAISE EXCEPTION 'STOP: RLS not enabled+forced on client_service_applicability'; END IF;
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
          WHERE oid='public.service_catalogue'::regclass) THEN
    RAISE EXCEPTION 'STOP: RLS not enabled+forced on service_catalogue'; END IF;
  IF NOT ( has_table_privilege('authenticated','public.client_service_applicability','SELECT')
       AND NOT has_table_privilege('authenticated','public.client_service_applicability','INSERT')
       AND NOT has_table_privilege('authenticated','public.client_service_applicability','UPDATE')
       AND NOT has_table_privilege('authenticated','public.client_service_applicability','DELETE') ) THEN
    RAISE EXCEPTION 'STOP: applicability grant posture is not SELECT-only for authenticated'; END IF;
  IF NOT ( has_table_privilege('authenticated','public.service_catalogue','SELECT')
       AND NOT has_table_privilege('authenticated','public.service_catalogue','INSERT')
       AND NOT has_table_privilege('authenticated','public.service_catalogue','UPDATE')
       AND NOT has_table_privilege('authenticated','public.service_catalogue','DELETE') ) THEN
    RAISE EXCEPTION 'STOP: catalogue grant posture is not SELECT-only for authenticated'; END IF;
END $precheck$;

-- Baseline snapshot for the count-invariance postconditions (captured live, NOT hard-coded).
CREATE TEMP TABLE _m1b_pg1_baseline ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM public.clients)                                 AS clients_rows,
  (SELECT coalesce(sum(CASE WHEN jsonb_typeof(services)='array'
                            THEN jsonb_array_length(services) ELSE 0 END),0)
     FROM public.clients)                                              AS clients_services_elems,
  (SELECT count(*) FROM public.client_registrations)                   AS registrations_rows,
  (SELECT count(*) FROM public.client_service_applicability)           AS applicability_rows,
  (SELECT count(*) FROM public.service_catalogue)                      AS catalogue_rows,
  (SELECT count(*) FROM public.audit_log)                              AS audit_log_rows,
  (SELECT count(*) FROM public.audit_event_contract)                   AS audit_contract_rows,
  (SELECT count(*) FROM public.accounting_tracker)                     AS accounting_tracker,
  (SELECT count(*) FROM public.financials_tracker)                     AS financials_tracker,
  (SELECT count(*) FROM public.income_tax_tracker)                     AS income_tax_tracker,
  (SELECT count(*) FROM public.compliance_calendar)                    AS compliance_calendar;


-- ===== SECTION A — authoritative table CHECK constraint =====================
-- Same-row enforcement: service_code is stored directly on the row (text FK to the
-- catalogue code), so this is a valid single-row CHECK — no cross-table reference,
-- no trigger. The table is empty (asserted in SECTION 0) so validation is instant
-- and risk-free. The literal 'OTHER' is the stable, PJ-approved catalogue code.
ALTER TABLE public.client_service_applicability
  ADD CONSTRAINT csa_other_notes_required_chk
  CHECK (service_code <> 'OTHER' OR (notes IS NOT NULL AND btrim(notes) <> ''));


-- ===== SECTION B — service_applicability_create (guard added) ===============
-- Body is byte-faithful to Migration 0021 EXCEPT the single PG-1 guard block
-- (marked "-- PG-1"). Signature, return type, SECURITY DEFINER, search_path,
-- audit behaviour, optimistic locking and notes normalisation are UNCHANGED.
-- CREATE OR REPLACE preserves existing privileges (EXECUTE to authenticated only);
-- PG-1 issues no GRANT/REVOKE (grant posture unchanged; verified in SECTION H).
CREATE OR REPLACE FUNCTION public.service_applicability_create(
  p_client_id uuid, p_service_code text, p_effective_from date, p_effective_to date,
  p_frequency text, p_linked_registration_id uuid, p_owner_team_id uuid, p_notes text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_id uuid; v_rv integer; v_code text; v_freq text; v_requires boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'CLIENT_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id=p_client_id) THEN RAISE EXCEPTION 'CLIENT_NOT_FOUND: %', p_client_id; END IF;

  v_code := nullif(upper(btrim(p_service_code)),'');
  IF v_code IS NULL THEN RAISE EXCEPTION 'SERVICE_CODE_REQUIRED'; END IF;
  SELECT requires_registration INTO v_requires FROM public.service_catalogue WHERE code=v_code AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_OR_INACTIVE_SERVICE_CODE: %', v_code; END IF;

  -- PG-1: authoritative OTHER-notes enforcement (controlled error, resolved service code).
  IF v_code = 'OTHER' AND nullif(btrim(p_notes),'') IS NULL THEN
    RAISE EXCEPTION 'OTHER_NOTES_REQUIRED'; END IF;

  v_freq := nullif(upper(btrim(p_frequency)),'');
  IF v_freq IS NOT NULL AND v_freq NOT IN ('MONTHLY','QUARTERLY','HALF_YEARLY','ANNUAL','EVENT_BASED','ONE_TIME','AS_REQUIRED') THEN
    RAISE EXCEPTION 'INVALID_FREQUENCY'; END IF;

  IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN
    RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM'; END IF;

  IF p_owner_team_id IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM public.team WHERE id=p_owner_team_id AND coalesce(is_active,false)=true) THEN
    RAISE EXCEPTION 'OWNER_NOT_ACTIVE_TEAM_MEMBER'; END IF;

  -- registration linkage: mandatory only when requires_registration; must be same client
  IF v_requires AND p_linked_registration_id IS NULL THEN RAISE EXCEPTION 'REGISTRATION_REQUIRED_FOR_SERVICE'; END IF;
  IF p_linked_registration_id IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM public.client_registrations WHERE id=p_linked_registration_id AND client_id=p_client_id) THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_SAME_CLIENT'; END IF;

  -- Always created in Draft (approval is a separate governed transition).
  INSERT INTO public.client_service_applicability
    (client_id, service_code, effective_from, effective_to, frequency,
     linked_registration_id, owner_team_id, status, notes, created_by, updated_by)
  VALUES
    (p_client_id, v_code, p_effective_from, p_effective_to, v_freq,
     p_linked_registration_id, p_owner_team_id, 'Draft', nullif(btrim(p_notes),''), auth.uid(), auth.uid())
  RETURNING id, row_version INTO v_id, v_rv;

  PERFORM public.audit_write_event('service_applicability.added','CREATE','client_service_applicability',
            v_id::text, p_client_id, jsonb_build_object('change_type_code','CREATED'));
  RETURN jsonb_build_object('id', v_id, 'row_version', v_rv);
END $fn$;


-- ===== SECTION C — service_applicability_update (guard added) ===============
-- Body is byte-faithful to Migration 0021 EXCEPT the single PG-1 guard block
-- (marked "-- PG-1"). The guard reads the AUTHORITATIVE stored service_code of the
-- existing row (v_code, fetched below) — NOT the caller payload — and rejects a
-- resulting OTHER row with blank notes. service_code is immutable via this RPC, so a
-- non-OTHER -> OTHER transition is impossible; the guard closes the "clear notes on an
-- existing OTHER row" path. Signature/return/DEFINER/search_path/audit/locking/notes
-- normalisation UNCHANGED. Privileges preserved by CREATE OR REPLACE (no GRANT/REVOKE).
CREATE OR REPLACE FUNCTION public.service_applicability_update(
  p_id uuid, p_expected_row_version integer, p_effective_from date, p_effective_to date,
  p_frequency text, p_linked_registration_id uuid, p_owner_team_id uuid, p_notes text
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_status text; v_new_rv integer; v_freq text; v_requires boolean; v_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;

  SELECT client_id, status, service_code INTO v_client, v_status, v_code
  FROM public.client_service_applicability WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  IF v_status = 'Inactive' THEN RAISE EXCEPTION 'ROW_INACTIVE_NOT_EDITABLE'; END IF;  -- restart = new row
  -- effective_to is set ONLY by governed deactivation; not editable on an Approved row.
  IF v_status = 'Approved' AND p_effective_to IS NOT NULL THEN
    RAISE EXCEPTION 'EFFECTIVE_TO_NOT_ALLOWED_FOR_APPROVED'; END IF;

  -- PG-1: authoritative OTHER-notes enforcement (controlled error, stored service code).
  IF v_code = 'OTHER' AND nullif(btrim(p_notes),'') IS NULL THEN
    RAISE EXCEPTION 'OTHER_NOTES_REQUIRED'; END IF;

  v_freq := nullif(upper(btrim(p_frequency)),'');
  IF v_freq IS NOT NULL AND v_freq NOT IN ('MONTHLY','QUARTERLY','HALF_YEARLY','ANNUAL','EVENT_BASED','ONE_TIME','AS_REQUIRED') THEN
    RAISE EXCEPTION 'INVALID_FREQUENCY'; END IF;
  IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN
    RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM'; END IF;
  -- keeping an Approved row Approved still requires effective_from
  IF v_status='Approved' AND p_effective_from IS NULL THEN RAISE EXCEPTION 'EFFECTIVE_FROM_REQUIRED_FOR_APPROVED'; END IF;

  IF p_owner_team_id IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM public.team WHERE id=p_owner_team_id AND coalesce(is_active,false)=true) THEN
    RAISE EXCEPTION 'OWNER_NOT_ACTIVE_TEAM_MEMBER'; END IF;

  SELECT requires_registration INTO v_requires FROM public.service_catalogue WHERE code=v_code;
  IF v_requires AND p_linked_registration_id IS NULL THEN RAISE EXCEPTION 'REGISTRATION_REQUIRED_FOR_SERVICE'; END IF;
  IF p_linked_registration_id IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM public.client_registrations WHERE id=p_linked_registration_id AND client_id=v_client) THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_SAME_CLIENT'; END IF;

  UPDATE public.client_service_applicability SET
    effective_from=p_effective_from, effective_to=p_effective_to, frequency=v_freq,
    linked_registration_id=p_linked_registration_id, owner_team_id=p_owner_team_id,
    notes=nullif(btrim(p_notes),''), row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING row_version INTO v_new_rv;
  IF NOT FOUND THEN RAISE EXCEPTION 'STALE_ROW_VERSION'; END IF;

  PERFORM public.audit_write_event('service_applicability.updated','UPDATE','client_service_applicability',
            p_id::text, v_client, jsonb_build_object('change_type_code','UPDATED'));
  RETURN v_new_rv;
END $fn$;


-- ===== SECTION H — FAIL-CLOSED POSTCONDITIONS ===============================
DO $postcheck$
DECLARE b _m1b_pg1_baseline%ROWTYPE; v_def text;
BEGIN
  SELECT * INTO b FROM _m1b_pg1_baseline;

  -- (1) the PG-1 constraint now exists, with the exact intended definition
  SELECT pg_get_constraintdef(c.oid) INTO v_def
  FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
  JOIN pg_namespace nsp ON nsp.oid=r.relnamespace
  WHERE nsp.nspname='public' AND r.relname='client_service_applicability'
    AND c.conname='csa_other_notes_required_chk';
  IF v_def IS NULL THEN RAISE EXCEPTION 'POST: csa_other_notes_required_chk missing'; END IF;
  IF v_def !~ 'OTHER' OR v_def !~ 'btrim' THEN
    RAISE EXCEPTION 'POST: csa_other_notes_required_chk definition unexpected: %', v_def; END IF;

  -- (2) exactly the 3 RPCs still present, at exact signatures (set_status untouched)
  IF to_regprocedure('public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)') IS NULL
     OR to_regprocedure('public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)') IS NULL
     OR to_regprocedure('public.service_applicability_set_status(uuid,integer,text,date)') IS NULL THEN
    RAISE EXCEPTION 'POST: a service applicability RPC signature is missing'; END IF;
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN
        ('service_applicability_create','service_applicability_update','service_applicability_set_status')) <> 3 THEN
    RAISE EXCEPTION 'POST: expected exactly 3 service RPCs'; END IF;

  -- (3) grant posture UNCHANGED: EXECUTE only to authenticated. Prove for BOTH replaced
  --     RPCs that authenticated HAS EXECUTE and anon / service_role / PUBLIC do NOT.
  --     Named roles via has_function_privilege; PUBLIC via the catalogue (proacl IS NULL
  --     => the function default grants EXECUTE to PUBLIC; otherwise an aclexplode entry
  --     with grantee = 0 and privilege_type = 'EXECUTE' would mean PUBLIC has it).
  IF NOT ( has_function_privilege('authenticated','public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)','EXECUTE')
       AND has_function_privilege('authenticated','public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)','EXECUTE') ) THEN
    RAISE EXCEPTION 'POST: authenticated lost EXECUTE on a replaced RPC'; END IF;
  IF has_function_privilege('anon','public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)','EXECUTE')
     OR has_function_privilege('anon','public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)','EXECUTE')
     OR has_function_privilege('service_role','public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)','EXECUTE')
     OR has_function_privilege('service_role','public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)','EXECUTE') THEN
    RAISE EXCEPTION 'POST: anon/service_role must NOT have EXECUTE on a replaced RPC'; END IF;
  IF (SELECT p.proacl IS NULL OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
        FROM pg_proc p WHERE p.oid='public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)'::regprocedure)
     OR (SELECT p.proacl IS NULL OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
        FROM pg_proc p WHERE p.oid='public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)'::regprocedure) THEN
    RAISE EXCEPTION 'POST: PUBLIC must NOT have EXECUTE on a replaced RPC'; END IF;

  -- (4) NO client/applicability data change; applicability still EMPTY
  IF (SELECT count(*) FROM public.client_service_applicability) <> 0 THEN
    RAISE EXCEPTION 'POST: client_service_applicability must remain EMPTY (0 rows)'; END IF;
  IF (SELECT count(*) FROM public.clients) <> b.clients_rows THEN
    RAISE EXCEPTION 'POST: clients row count changed'; END IF;
  IF (SELECT coalesce(sum(CASE WHEN jsonb_typeof(services)='array'
                               THEN jsonb_array_length(services) ELSE 0 END),0)
      FROM public.clients) <> b.clients_services_elems THEN
    RAISE EXCEPTION 'POST: clients.services legacy JSONB element-count changed'; END IF;
  IF (SELECT count(*) FROM public.client_registrations) <> b.registrations_rows THEN
    RAISE EXCEPTION 'POST: client_registrations row count changed'; END IF;

  -- (5) reference data UNCHANGED; audit contract UNCHANGED (no event seeded/removed)
  IF (SELECT count(*) FROM public.service_catalogue) <> b.catalogue_rows THEN
    RAISE EXCEPTION 'POST: service_catalogue row count changed'; END IF;
  IF (SELECT count(*) FROM public.audit_event_contract) <> b.audit_contract_rows THEN
    RAISE EXCEPTION 'POST: audit_event_contract changed (PG-1 must not seed/remove events)'; END IF;

  -- (6) NO compliance generation; audit_log unchanged (RPCs replaced, not called here)
  IF (SELECT count(*) FROM public.accounting_tracker)  <> b.accounting_tracker
     OR (SELECT count(*) FROM public.financials_tracker) <> b.financials_tracker
     OR (SELECT count(*) FROM public.income_tax_tracker) <> b.income_tax_tracker
     OR (SELECT count(*) FROM public.compliance_calendar) <> b.compliance_calendar THEN
    RAISE EXCEPTION 'POST: a tracker/calendar row count changed (no compliance generation allowed)'; END IF;
  IF (SELECT count(*) FROM public.audit_log) <> b.audit_log_rows THEN
    RAISE EXCEPTION 'POST: audit_log changed during migration'; END IF;

  -- (7) RLS + table grant posture UNCHANGED on both tables
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
          WHERE oid='public.client_service_applicability'::regclass) THEN
    RAISE EXCEPTION 'POST: RLS not enabled+forced on client_service_applicability'; END IF;
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
          WHERE oid='public.service_catalogue'::regclass) THEN
    RAISE EXCEPTION 'POST: RLS not enabled+forced on service_catalogue'; END IF;
  IF NOT ( has_table_privilege('authenticated','public.client_service_applicability','SELECT')
       AND NOT has_table_privilege('authenticated','public.client_service_applicability','INSERT')
       AND NOT has_table_privilege('authenticated','public.client_service_applicability','UPDATE')
       AND NOT has_table_privilege('authenticated','public.client_service_applicability','DELETE') ) THEN
    RAISE EXCEPTION 'POST: applicability grant posture changed'; END IF;
  IF NOT ( has_table_privilege('authenticated','public.service_catalogue','SELECT')
       AND NOT has_table_privilege('authenticated','public.service_catalogue','INSERT')
       AND NOT has_table_privilege('authenticated','public.service_catalogue','UPDATE')
       AND NOT has_table_privilege('authenticated','public.service_catalogue','DELETE') ) THEN
    RAISE EXCEPTION 'POST: catalogue grant posture changed'; END IF;

  RAISE NOTICE 'P5 Migration 0022 (PG-1) postconditions passed (constraint + guarded RPCs; no data, no compliance, posture unchanged).';
END $postcheck$;

COMMIT;

-- ============================================================================
--  END MIGRATION 0022 (DRAFT / NOT EXECUTED / NOT APPROVED FOR APPLY).
--  Manual rollback (NOT a forward migration; outside the apply-path):
--    supabase/verification/rollback_0022_p5_pg1_other_notes_manual.sql
-- ============================================================================
