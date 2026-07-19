-- ============================================================================
--  YAV2 — Module 1 — P5 — MIGRATION 0021 — SERVICE APPLICABILITY
--                       (DRAFT — NOT EXECUTED / NOT APPROVED FOR APPLY)
--
--  STATUS: DRAFT for independent review. NOT approved for execution. PJ is the sole
--          manual executor. Placed at the migration path per the P5 task, but it
--          must NOT be applied until ChatGPT review + PJ approval.
--
--  SCOPE : SCHEMA AND CONTROLLED REFERENCE DATA ONLY.
--    * creates public.service_catalogue (+ seeds ONLY the 11 PJ-approved codes);
--    * creates public.client_service_applicability (+ constraints/indexes);
--    * adds UNIQUE (id, client_id) to public.client_registrations for the composite
--      same-client FK;
--    * RLS + policies; least-privilege grants (RPC-only writes on the applicability
--      table; the reference catalogue is READ-ONLY to authenticated — fail-closed);
--    * audited SECURITY DEFINER RPCs (create/update/set_status);
--    * registers 4 additive lifecycle audit events (added/updated/approved/deactivated).
--
--  IT DOES NOT (fail-closed asserted in SECTION H):
--    * migrate/backfill/copy/delete/modify public.clients.services (legacy JSONB);
--    * create ANY client_service_applicability rows from current clients (0 rows);
--    * perform client-data cleanup or treat sample/testing data as production;
--    * generate compliance rows, FY obligations, due dates, overdue status or
--      calendar entries; it never calls activate_accounting_service /
--      generate_client_compliance and never touches the trackers/calendar.
--
--  Target : V2 / yav2-dev ONLY (ogjrwemjefvccpyjwxuo). V1/Production
--           (zcszesuvjrryxtigjglt) is PROHIBITED. clients.id uuid stays the
--           authoritative client key.
--
--  Single transaction: any failed pre/post assertion rolls the whole migration back.
-- ============================================================================

BEGIN;

-- ===== SECTION 0 — FAIL-CLOSED PRECONDITIONS + BASELINE ======================
DO $precheck$
DECLARE
  v_missing text;
  v_exists  text;
BEGIN
  -- required base tables
  SELECT string_agg(t, ', ') INTO v_missing
  FROM unnest(ARRAY['clients','client_registrations','team','audit_log','audit_event_contract',
                    'accounting_tracker','financials_tracker','income_tax_tracker','compliance_calendar']) AS t
  WHERE to_regclass('public.'||t) IS NULL;
  IF v_missing IS NOT NULL THEN RAISE EXCEPTION 'STOP: base table(s) missing: %', v_missing; END IF;

  -- required functions at EXACT signatures
  SELECT string_agg(sig, E'\n  ') INTO v_missing
  FROM unnest(ARRAY[
    'public.audit_write_event(text,text,text,text,uuid,jsonb)',
    'public.is_active_user()',
    'public.is_admin_or_manager()'
  ]) AS sig
  WHERE to_regprocedure(sig) IS NULL;
  IF v_missing IS NOT NULL THEN RAISE EXCEPTION E'STOP: required function(s) missing:\n  %', v_missing; END IF;

  -- clients.id must be uuid (authoritative key)
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='clients' AND column_name='id') <> 'uuid' THEN
    RAISE EXCEPTION 'STOP: clients.id is not uuid';
  END IF;

  -- ADDITIVE guard: new objects must NOT already exist (rerun disallowed)
  IF to_regclass('public.service_catalogue') IS NOT NULL
     OR to_regclass('public.client_service_applicability') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: service_catalogue/client_service_applicability already exist (not additive)';
  END IF;
  SELECT string_agg(DISTINCT p.proname, ', ') INTO v_exists
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN
    ('service_applicability_create','service_applicability_update','service_applicability_set_status');
  IF v_exists IS NOT NULL THEN RAISE EXCEPTION 'STOP: RPC name(s) already exist: %', v_exists; END IF;

  IF EXISTS (SELECT 1 FROM public.audit_event_contract
             WHERE event_name IN ('service_applicability.added','service_applicability.updated',
                                  'service_applicability.approved','service_applicability.deactivated')) THEN
    RAISE EXCEPTION 'STOP: service_applicability audit events already present (not additive)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
             JOIN pg_namespace nsp ON nsp.oid=r.relnamespace
             WHERE nsp.nspname='public' AND r.relname='client_registrations'
               AND c.conname='client_registrations_id_client_uq') THEN
    RAISE EXCEPTION 'STOP: client_registrations_id_client_uq already exists';
  END IF;
END $precheck$;

CREATE TEMP TABLE _m1b_p5_baseline ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM public.clients)                                 AS clients_rows,
  (SELECT coalesce(sum(CASE WHEN jsonb_typeof(services)='array'
                            THEN jsonb_array_length(services) ELSE 0 END),0)
     FROM public.clients)                                              AS clients_services_elems,
  (SELECT count(*) FROM public.client_registrations)                   AS registrations_rows,
  (SELECT count(*) FROM public.audit_log)                              AS audit_log_rows,
  (SELECT count(*) FROM public.audit_event_contract)                   AS audit_contract_rows,
  (SELECT count(*) FROM public.accounting_tracker)                     AS accounting_tracker,
  (SELECT count(*) FROM public.financials_tracker)                     AS financials_tracker,
  (SELECT count(*) FROM public.income_tax_tracker)                     AS income_tax_tracker,
  (SELECT count(*) FROM public.compliance_calendar)                    AS compliance_calendar;


-- ===== SECTION A — service_catalogue (reference) + PJ-approved seed ==========
CREATE TABLE public.service_catalogue (
  code                  text PRIMARY KEY,
  label                 text NOT NULL,
  requires_registration boolean NOT NULL DEFAULT false,
  default_frequency     text
      CHECK (default_frequency IS NULL OR default_frequency IN
             ('MONTHLY','QUARTERLY','HALF_YEARLY','ANNUAL','EVENT_BASED','ONE_TIME','AS_REQUIRED')),
  sort_order            integer NOT NULL DEFAULT 0,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.service_catalogue IS
  'P5 controlled service reference codes (PJ-approved). requires_registration and default_frequency are neutral defaults (false/NULL) pending separate PJ per-service rulings; no client data.';

-- Seed ONLY the 11 PJ-approved codes. requires_registration=false and
-- default_frequency=NULL are neutral (NOT presumed). There is NO runtime catalogue
-- write path in Migration 0021; per-service values (and any code changes) require a
-- SEPARATE PJ-approved migration or a future governed audited RPC.
INSERT INTO public.service_catalogue (code, label, sort_order) VALUES
  ('ACCOUNTING',      'Accounting',      10),
  ('GST',             'GST',             20),
  ('TDS',             'TDS',             30),
  ('PAYROLL',         'Payroll',         40),
  ('INCOME_TAX',      'Income Tax',      50),
  ('ROC',             'ROC',             60),
  ('LLP',             'LLP',             70),
  ('STATUTORY_AUDIT', 'Statutory Audit', 80),
  ('TAX_AUDIT',       'Tax Audit',       90),
  ('SECRETARIAL',     'Secretarial',    100),
  ('OTHER',           'Other',          110);


-- ===== SECTION B — client_registrations composite-FK prerequisite ===========
-- Additive UNIQUE(id, client_id) so the applicability composite FK can enforce
-- same-client linkage. (id is already PK; this pairs it with client_id.)
ALTER TABLE public.client_registrations
  ADD CONSTRAINT client_registrations_id_client_uq UNIQUE (id, client_id);


-- ===== SECTION C — client_service_applicability (core layer) =================
CREATE TABLE public.client_service_applicability (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  service_code          text NOT NULL REFERENCES public.service_catalogue(code) ON DELETE RESTRICT,
  effective_from        date,
  effective_to          date,
  frequency             text
      CHECK (frequency IS NULL OR frequency IN
             ('MONTHLY','QUARTERLY','HALF_YEARLY','ANNUAL','EVENT_BASED','ONE_TIME','AS_REQUIRED')),
  linked_registration_id uuid,
  owner_team_id         uuid REFERENCES public.team(id),
  status                text NOT NULL DEFAULT 'Draft'
      CHECK (status IN ('Draft','Approved','Inactive')),
  approved_by           uuid,
  approved_at           timestamptz,
  notes                 text,
  row_version           integer NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid,
  -- effective_to may not precede effective_from
  CONSTRAINT csa_dates_chk
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
  -- effective_from is required once Approved (may be NULL in Draft)
  CONSTRAINT csa_effective_from_gate_chk
    CHECK (status <> 'Approved' OR effective_from IS NOT NULL),
  -- effective_to must be NULL while Approved: it is set ONLY by the governed
  -- deactivation transition (which simultaneously flips status to Inactive). A
  -- Draft may carry a proposed effective_to, but approval requires it cleared first.
  CONSTRAINT csa_effective_to_null_when_approved_chk
    CHECK (status <> 'Approved' OR effective_to IS NULL),
  -- approval fields are required when Approved; retained (not cleared) if later Inactive
  CONSTRAINT csa_approval_actor_chk
    CHECK (status <> 'Approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  -- same-client registration linkage, DB-enforced; RESTRICT (never nulls client_id)
  CONSTRAINT csa_registration_same_client_fk
    FOREIGN KEY (linked_registration_id, client_id)
    REFERENCES public.client_registrations (id, client_id) ON DELETE RESTRICT
);
COMMENT ON TABLE public.client_service_applicability IS
  'P5 per-client approved service applicability (entitlement/scope only). status is the single lifecycle authority. Records NO due dates/FY obligations/tracker/calendar rows and generates NO compliance. Writes ONLY via audited SECURITY DEFINER RPCs.';

CREATE INDEX idx_csa_client        ON public.client_service_applicability (client_id);
CREATE INDEX idx_csa_service       ON public.client_service_applicability (service_code);
-- At most one LIVE (Draft/Approved) applicability per (client, service); Inactive
-- history rows are excluded, so stop→restart keeps history.
CREATE UNIQUE INDEX client_service_applicability_live_uq
  ON public.client_service_applicability (client_id, service_code)
  WHERE status <> 'Inactive';


-- ===== SECTION D — RLS (enable + FORCE) =====================================
ALTER TABLE public.client_service_applicability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_service_applicability FORCE ROW LEVEL SECURITY;
-- Admin/Manager SELECT only; writes are RPC-only (SECURITY DEFINER owner bypasses RLS).
CREATE POLICY client_service_applicability_select ON public.client_service_applicability
  FOR SELECT TO authenticated USING (public.is_active_user() AND public.is_admin_or_manager());
-- No INSERT/UPDATE/DELETE policy: direct writes are denied; RPCs are the only path.

ALTER TABLE public.service_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalogue FORCE ROW LEVEL SECURITY;
-- FAIL-CLOSED reference governance: readable by all active users; NO runtime write
-- path is granted in 0021. The catalogue is seeded ONLY by this migration (as the
-- migration owner). Adding/altering service codes, requires_registration or
-- default_frequency, and any DELETE, are DEFERRED to a separate PJ-approved
-- migration (or a future governed audited RPC). 0021 adds no new write authority.
CREATE POLICY service_catalogue_select ON public.service_catalogue
  FOR SELECT TO authenticated USING (public.is_active_user());
-- No INSERT/UPDATE/DELETE policy: direct catalogue writes are denied.


-- ===== SECTION E — PRIVILEGES (no anon; RPC-only writes on applicability) ====
REVOKE ALL ON public.client_service_applicability FROM PUBLIC, anon;
GRANT SELECT ON public.client_service_applicability TO authenticated, service_role;
-- Belt-and-suspenders: ensure NO direct write grant to authenticated (RPC-only).
REVOKE INSERT, UPDATE, DELETE ON public.client_service_applicability FROM authenticated;

REVOKE ALL ON public.service_catalogue FROM PUBLIC, anon;
-- Fail-closed: reference catalogue is READ-ONLY to authenticated/service_role.
GRANT SELECT ON public.service_catalogue TO authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.service_catalogue FROM authenticated, service_role;


-- ===== SECTION F — 4 additive lifecycle audit events ========================
--  Distinct events per lifecycle stage (NOT compressed): added (CREATE), updated
--  (field edit, UPDATE), approved (Draft->Approved, UPDATE) and deactivated
--  (->Inactive, UPDATE). change_type_code uses the existing 0007 whitelist
--  (CREATED/UPDATED/DELETED/ENABLED/DISABLED/GRANTED/REVOKED): approval->ENABLED
--  (brought into force), deactivation->DISABLED. resource is the applicability
--  table; actor 'user'; MEDIUM/S2 mirrors the D2a/D2b master-write family.
INSERT INTO public.audit_event_contract
  (event_name, risk_tier, sensitivity, required_keys, optional_keys, allow_empty_metadata,
   client_requirement, target_user_requirement, permitted_actor_types, permitted_actions,
   permitted_resource_types)
VALUES
  ('service_applicability.added','MEDIUM','S2',
     ARRAY['change_type_code'], ARRAY[]::text[], false,
     'required','prohibited', ARRAY['user'], ARRAY['CREATE'], ARRAY['client_service_applicability']),
  ('service_applicability.updated','MEDIUM','S2',
     ARRAY['change_type_code'], ARRAY[]::text[], false,
     'required','prohibited', ARRAY['user'], ARRAY['UPDATE'], ARRAY['client_service_applicability']),
  ('service_applicability.approved','MEDIUM','S2',
     ARRAY['change_type_code'], ARRAY[]::text[], false,
     'required','prohibited', ARRAY['user'], ARRAY['UPDATE'], ARRAY['client_service_applicability']),
  ('service_applicability.deactivated','MEDIUM','S2',
     ARRAY['change_type_code'], ARRAY[]::text[], false,
     'required','prohibited', ARRAY['user'], ARRAY['UPDATE'], ARRAY['client_service_applicability']);


-- ===== SECTION G — audited SECURITY DEFINER RPCs (create/update/set_status) ==
-- Shared guard (every body): auth.uid() present; is_active_user(); is_admin_or_manager().
-- created_by/updated_by/approved_by := auth.uid(); optimistic locking via row_version.

CREATE FUNCTION public.service_applicability_create(
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
REVOKE ALL ON FUNCTION public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text) TO authenticated;

CREATE FUNCTION public.service_applicability_update(
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
REVOKE ALL ON FUNCTION public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text) TO authenticated;

-- Lifecycle transitions: Draft->Approved (system-controlled approval actor/time),
-- Draft->Inactive, Approved->Inactive (stop, sets effective_to). No reopen.
CREATE FUNCTION public.service_applicability_set_status(
  p_id uuid, p_expected_row_version integer, p_new_status text, p_effective_to date
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_cur text; v_eff_from date; v_cur_eff_to date; v_eff_to date; v_new_rv integer; v_new text; v_ctc text; v_event text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  v_new := nullif(btrim(p_new_status),'');
  IF v_new IS NULL OR v_new NOT IN ('Draft','Approved','Inactive') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  SELECT client_id, status, effective_from, effective_to INTO v_client, v_cur, v_eff_from, v_cur_eff_to
  FROM public.client_service_applicability WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;

  -- allowed transitions only
  IF NOT ( (v_cur='Draft'    AND v_new='Approved')
        OR (v_cur='Draft'    AND v_new='Inactive')
        OR (v_cur='Approved' AND v_new='Inactive') ) THEN
    RAISE EXCEPTION 'ILLEGAL_STATUS_TRANSITION: % -> %', v_cur, v_new;
  END IF;

  IF v_new='Approved' THEN
    IF v_eff_from IS NULL THEN RAISE EXCEPTION 'EFFECTIVE_FROM_REQUIRED_FOR_APPROVAL'; END IF;
    -- Approval requires effective_to cleared (deactivation is the only path that sets it).
    IF v_cur_eff_to IS NOT NULL THEN RAISE EXCEPTION 'EFFECTIVE_TO_NOT_ALLOWED_FOR_APPROVED'; END IF;
    v_event := 'service_applicability.approved'; v_ctc := 'ENABLED';   -- approval brought into force
    UPDATE public.client_service_applicability SET
      status='Approved', approved_by=auth.uid(), approved_at=now(),   -- system-controlled
      row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
    WHERE id=p_id AND row_version=p_expected_row_version
    RETURNING row_version INTO v_new_rv;
  ELSE  -- v_new='Inactive' (stop): set effective_to; PRESERVE approval evidence
    v_event := 'service_applicability.deactivated'; v_ctc := 'DISABLED';
    -- Proposed stop date; default to current_date only when not supplied.
    v_eff_to := coalesce(p_effective_to, current_date);
    -- FAIL-CLOSED, explicit (NOT a generic CHECK failure): reject a stop date that
    -- precedes effective_from — e.g. an Approved, future-dated row deactivated with
    -- p_effective_to = NULL where current_date < effective_from. We do NOT silently
    -- move the business date to effective_from (that would need separate PJ approval).
    IF v_eff_from IS NOT NULL AND v_eff_to < v_eff_from THEN
      RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM';
    END IF;
    UPDATE public.client_service_applicability SET
      status='Inactive', effective_to=v_eff_to,
      row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
    WHERE id=p_id AND row_version=p_expected_row_version
    RETURNING row_version INTO v_new_rv;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'STALE_ROW_VERSION'; END IF;

  PERFORM public.audit_write_event(v_event,'UPDATE','client_service_applicability',
            p_id::text, v_client, jsonb_build_object('change_type_code', v_ctc));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.service_applicability_set_status(uuid,integer,text,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.service_applicability_set_status(uuid,integer,text,date) TO authenticated;


-- ===== SECTION H — FAIL-CLOSED POSTCONDITIONS ===============================
DO $postcheck$
DECLARE b _m1b_p5_baseline%ROWTYPE;
BEGIN
  SELECT * INTO b FROM _m1b_p5_baseline;

  -- NEW objects exist
  IF to_regclass('public.service_catalogue') IS NULL
     OR to_regclass('public.client_service_applicability') IS NULL THEN
    RAISE EXCEPTION 'POST: new table(s) missing'; END IF;
  IF (SELECT count(*) FROM public.service_catalogue) <> 11 THEN
    RAISE EXCEPTION 'POST: service_catalogue seed <> 11'; END IF;
  IF (SELECT count(*) FROM public.client_service_applicability) <> 0 THEN
    RAISE EXCEPTION 'POST: client_service_applicability must be EMPTY (no client data created)'; END IF;

  -- NO client-data migration. NOTE: these are ROW-COUNT / ELEMENT-COUNT invariance
  -- checks — they detect additions/removals, NOT a count-preserving content edit.
  -- Content invariance rests on STATIC NO-WRITE ANALYSIS: this migration issues no
  -- UPDATE/DELETE against public.clients and never writes clients.services.
  IF (SELECT count(*) FROM public.clients) <> b.clients_rows THEN
    RAISE EXCEPTION 'POST: clients row count changed'; END IF;
  IF (SELECT coalesce(sum(CASE WHEN jsonb_typeof(services)='array'
                               THEN jsonb_array_length(services) ELSE 0 END),0)
      FROM public.clients) <> b.clients_services_elems THEN
    RAISE EXCEPTION 'POST: clients.services legacy JSONB element-count changed'; END IF;
  IF (SELECT count(*) FROM public.client_registrations) <> b.registrations_rows THEN
    RAISE EXCEPTION 'POST: client_registrations row count changed'; END IF;

  -- NO compliance generation: tracker/calendar ROW COUNTS unchanged (again a
  -- count check; content invariance is by static no-write analysis — the migration
  -- never writes these tables). audit_log unchanged (RPCs defined, not called here).
  IF (SELECT count(*) FROM public.accounting_tracker)  <> b.accounting_tracker
     OR (SELECT count(*) FROM public.financials_tracker) <> b.financials_tracker
     OR (SELECT count(*) FROM public.income_tax_tracker) <> b.income_tax_tracker
     OR (SELECT count(*) FROM public.compliance_calendar) <> b.compliance_calendar THEN
    RAISE EXCEPTION 'POST: a tracker/calendar row count changed (no compliance generation allowed)'; END IF;
  IF (SELECT count(*) FROM public.audit_log) <> b.audit_log_rows THEN
    RAISE EXCEPTION 'POST: audit_log changed during migration'; END IF;

  -- audit contract +4 (added/updated/approved/deactivated), composite-FK prereq, RPCs
  IF (SELECT count(*) FROM public.audit_event_contract) <> b.audit_contract_rows + 4 THEN
    RAISE EXCEPTION 'POST: audit_event_contract delta <> +4'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='client_registrations_id_client_uq') THEN
    RAISE EXCEPTION 'POST: client_registrations_id_client_uq missing'; END IF;
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN
        ('service_applicability_create','service_applicability_update','service_applicability_set_status')) <> 3 THEN
    RAISE EXCEPTION 'POST: expected 3 service RPCs'; END IF;

  -- RLS enabled+forced on BOTH new tables
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
          WHERE oid='public.client_service_applicability'::regclass) THEN
    RAISE EXCEPTION 'POST: RLS not enabled+forced on client_service_applicability'; END IF;
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
          WHERE oid='public.service_catalogue'::regclass) THEN
    RAISE EXCEPTION 'POST: RLS not enabled+forced on service_catalogue'; END IF;

  -- Catalogue is fail-closed read-only: authenticated has NO INSERT/UPDATE/DELETE,
  -- and there is NO non-SELECT (write) policy.
  IF has_table_privilege('authenticated','public.service_catalogue','INSERT')
     OR has_table_privilege('authenticated','public.service_catalogue','UPDATE')
     OR has_table_privilege('authenticated','public.service_catalogue','DELETE') THEN
    RAISE EXCEPTION 'POST: service_catalogue must be read-only to authenticated (no write privilege)'; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
             AND tablename='service_catalogue' AND cmd <> 'SELECT') THEN
    RAISE EXCEPTION 'POST: service_catalogue has a non-SELECT (write) policy'; END IF;

  RAISE NOTICE 'P5 Migration 0021 postconditions passed (schema+reference-only; no client data; no compliance generation).';
END $postcheck$;

COMMIT;

-- ============================================================================
--  END MIGRATION 0021 (DRAFT / NOT EXECUTED / NOT APPROVED FOR APPLY).
--  Manual rollback (NOT a forward migration; outside the apply-path):
--    supabase/verification/rollback_0021_service_applicability_manual.sql
-- ============================================================================
