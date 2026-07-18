-- ============================================================================
--  0017_m1b_d2b_client_master_crud_rpcs.sql            (M1-B / D2b — Rev 2)
--
--  YAV2 Portal V2 — Module 1 (Client Master) — M1-B step D2b.
--  Hardened, audited CRUD RPCs for the M1-A client-master child tables + registration
--  header, PLUS the mandatory bypass closure (direct authenticated INSERT/UPDATE on
--  the affected base tables is revoked; the RPCs become the ONLY write path).
--
--  TARGET   : V2 / yav2-dev ONLY — Supabase project ref ogjrwemjefvccpyjwxuo
--  BASIS    : LIVE catalogue of migrations 0005/0007/0008/0015 + D2a helper 0016
--             (audit_write_event). NUMBER 0017 (0014 FY repair; 0015 M1-A; 0016 D2a).
--  RUNTIME  : Supabase SQL Editor compatible (no psql meta-commands).
--
--  REV 2 (P1-governed revision of the Rev 1 HOLD draft):
--    (A) Registration creation gap CLOSED —
--          public.client_registration_create           (registration.added / CREATE / CREATED;
--                                                       returns jsonb {id, row_version})
--          public.client_registration_create_with_gst  (header + GST detail in ONE transaction;
--                                                       registration.added + gst_detail.changed
--                                                       atomically; returns jsonb {registration_id,
--                                                       header_row_version, gst_row_version})
--          public.client_registration_set_active        (registration.updated / ENABLED|DISABLED;
--                                                       client_registrations.is_active EXISTS in
--                                                       0015 — no column invented)
--        Every table whose direct INSERT/UPDATE is revoked has a complete RPC path
--        for its onboarding + maintenance operations (22 RPCs total; matrix in the
--        D2b implementation report and verification V3).
--    (C) Validation hardening (this revision adds, on top of the Rev 1 rule set):
--          * Aadhaar identifier types AND Aadhaar-shaped values are EXPLICITLY
--            REJECTED in client_identifier_create/update (GOVERNANCE rule G1 — master
--            Rule 6 / R-6 ruling; not optional);
--          * per-type identifier format validation for PAN / TAN / CIN / LLPIN / DIN
--            (P11, PROPOSED — enforced, listed for approval);
--          * GSTIN state-prefix must equal state_code when both present (P13);
--          * GST detail is allowed ONLY on an 'IN_GST' registration header (P14,
--            grounded in the 0015 reg_type vocabulary comment);
--          * reg_type restricted to the 0015 vocabulary IN_GST|AE_VAT|AE_CT|LICENCE|
--            OTHER, upper-normalised (P15, PROPOSED);
--          * jurisdiction upper-normalised, 2-letter code when provided (P16, PROPOSED).
--    All Rev 1 controls are retained: exact live table shapes; NULL-safe active
--    Admin/Manager (`fn() IS DISTINCT FROM TRUE`); SECURITY DEFINER + pinned
--    search_path; optimistic locking (row_version, exactly-once increment, ROW_NOT_FOUND
--    vs STALE_ROW_VERSION distinguished); atomic audit_write_event in the same
--    transaction (audit rejection rolls back the data change); no swallowed errors;
--    clients.id UUID keys; NO Aadhaar parameter accepted or stored anywhere; bypass
--    closure preserved; no service_role EXECUTE; no caller-controlled audit event
--    name/resource/change type; no D3/D4/frontend/compliance; nothing executed.
--
--  VALIDATION RULE SET (item 3 — grounded, not invented):
--    Required / enum / uniqueness / date-order — GROUNDED in live schema (0015):
--      * client_registrations.status ∈ Applied|Active|Suspended|Cancelled  [CHECK]
--      * client_identifiers.status   ∈ Active|Inactive                     [CHECK]
--      * gst_registration_details.filing_frequency ∈ Monthly|Quarterly_QRMP[CHECK]
--      * effective_to ≥ effective_from (registrations/addresses/relationships)[CHECK]
--      * gst cancellation_date ≥ registration_date                          [CHECK]
--      * client_relationships: exactly one of related_client_id XOR related_person_id[CHECK]
--      * client_relationships.ownership_pct ∈ [0,100]                       [CHECK]
--      * NOT NULL: client_id, full_name, id_type/id_value, reg_type, relationship_type[NOT NULL]
--      * uniqueness: (client_id,reg_type,upper(reg_number)) / (client_id,id_type,upper(id_value))[UNIQUE IDX]
--    PAN format  ^[A-Z]{5}[0-9]{4}[A-Z]$              — DISCOVERY (M1-B pre-discovery Block 6/7).
--    GOVERNANCE rule (NOT optional; master Rule 6 + P0 R-6 ruling 2026-07-18):
--      G1 Aadhaar rejection in client_identifiers (FINAL RULING):
--           * id_type matching AADHAAR/AADHAR/ADHAR/UIDAI (any case) or equal to UID
--             -> AADHAAR_IDENTIFIER_NOT_ALLOWED. (mandatory)
--           * a value is NOT rejected solely for being 12 digits — the length-only
--             Aadhaar heuristic (former AADHAAR_VALUE_NOT_ALLOWED) is REMOVED, so a
--             legitimate 12-digit non-Aadhaar identifier under another type is allowed.
--         Portal V2 must not capture, accept, backfill or newly store Aadhaar digits,
--         including last-four; person RPCs accept no Aadhaar parameter of any kind.
--    The following are ENFORCED and EXPLICITLY LISTED FOR APPROVAL (PROPOSED — not in
--    schema/frontend; reviewer to confirm or relax). They fail closed only when a
--    value is PROVIDED (NULLs pass unless the column is required):
--      P1 DIN            ^[0-9]{8}$                        (MCA DIN = 8 digits)
--      P2 GSTIN          ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$ (standard GSTIN)
--      P3 GST state_code ^[0-9]{2}$                        (GST state code = 2 digits)
--      P4 pincode        ^[0-9]{6}$                        (Indian PIN = 6 digits)
--      P5 email          ^[^@ ]+@[^@ ]+\.[^@ ]+$           (basic shape; stored lower-trimmed)
--      P6 mobile         ^[0-9]{10}$                       (10-digit; frontend shows '+91 '+mobile)
--      P7 person cessation_date ≥ appointment_date          (no schema CHECK on persons)
--      P8 self-relationship: related_client_id <> client_id (a client is not its own relation)
--      P9 contact: at least one of person_name/email/phone present (a contact must be reachable/named)
--      P10 address: line1 required (a usable address needs a first line)
--      P11 identifier per-type formats, applied when id_type matches (value upper-normalised):
--            PAN ^[A-Z]{5}[0-9]{4}[A-Z]$ · TAN ^[A-Z]{4}[0-9]{5}[A-Z]$ · DIN ^[0-9]{8}$
--            CIN ^[LUF][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$ · LLPIN ^[A-Z]{3}-?[0-9]{4}$
--            (UDYAM/IEC/PF/ESI/OTHER intentionally NOT format-validated — AQ-1)
--      P13 GSTIN state prefix = state_code when BOTH provided (GSTIN structure embeds the
--            state code; instructed "where feasible")
--      P14 GST detail only on an IN_GST registration header (0015 reg_type vocabulary)
--      P15 reg_type ∈ IN_GST|AE_VAT|AE_CT|LICENCE|OTHER, upper-normalised (FINAL RULING —
--            these five allowed; OTHER is the extensible catch-all bucket)
--      P16 jurisdiction (FINAL RULING): trimmed non-empty text, char_length <= 64; default
--            'IN'; NOT restricted to two letters and NOT upper-forced
--    Normalization: PAN/GSTIN/id_type/reg_type upper+trim; jurisdiction trim (not upper);
--    id_value upper+trim for PAN/TAN/CIN/LLPIN/DIN types; DIN/state_code/pincode/email/mobile trim (email
--    lower-cased); blank strings normalized to NULL. Reviewer may adjust any PROPOSED
--    rule; they are isolated to the per-RPC validation blocks.
--    APPROVAL REQUIRED (AQ — enforced-or-open items for the independent reviewer):
--      AQ-1 confirm/adjust P11 formats and the unvalidated types (UDYAM/IEC/PF/ESI/OTHER);
--      AQ-2 confirm P15 vocabulary lock (or revert reg_type to free text);
--      AQ-3 confirm P16 two-letter jurisdiction rule;
--      AQ-4 confirm the pure-12-digit Aadhaar-shape value heuristic (G1) scope;
--      AQ-5 reg_number requirements (NOT enforced: schema permits NULL for 'Applied';
--           should 'Active' require a number per reg_type?);
--      AQ-6 primary-contact/primary-address uniqueness per client (NOT enforced: schema
--           allows multiple is_primary rows; enforcing would need a demote-or-reject rule);
--      AQ-7 person_type vocabulary (0015 comment lists Director|Partner|Proprietor|Trustee|
--           Member|Karta|Authorised Signatory|Other — NOT enforced in Rev 2).
--
--  SCOPE FENCE — this migration does NOT: author D3/D4; touch 0014/0016, V1/Production
--    (zcszesuvjrryxtigjglt), trackers, overdue, compliance_calendar or FY logic; change
--    any frontend or generate compliance; write any client-master data row or audit_log
--    row (it only defines functions + adjusts grants; no RPC is invoked here); accept
--    or store any Aadhaar digit/last-four.
--
--  ⚠ PROJECT GUARD — HUMAN CONFIRMATION, NOT AUTOMATIC IDENTITY VERIFICATION.
--    VISUALLY CONFIRM the dashboard shows ogjrwemjefvccpyjwxuo, then run:
--        SET yav2.confirm_project = 'ogjrwemjefvccpyjwxuo';
--
--  ONE transaction (BEGIN/COMMIT). Every check is fail-closed.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SECTION 0 — PRECONDITIONS (fail closed)
-- ---------------------------------------------------------------------------
DO $precheck$
DECLARE
  v_confirm text := current_setting('yav2.confirm_project', true);
  v_missing text;
  v_exists  text;
BEGIN
  IF v_confirm IS DISTINCT FROM 'ogjrwemjefvccpyjwxuo' THEN
    RAISE EXCEPTION
      E'STOP: project not attested.\n'
       'VISUALLY CONFIRM the dashboard shows ogjrwemjefvccpyjwxuo, then run:\n'
       '  SET yav2.confirm_project = ''ogjrwemjefvccpyjwxuo'';';
  END IF;

  SELECT string_agg(r, ', ') INTO v_missing
  FROM unnest(ARRAY['anon','authenticated','service_role']) AS r
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: expected Supabase role(s) missing: %', v_missing;
  END IF;

  -- Function owner (current_user) must hold BYPASSRLS: the base tables use FORCE RLS
  -- with policies scoped TO authenticated, so a SECURITY DEFINER RPC owned by a
  -- non-BYPASSRLS role could not write to them. (Proven live: audit_write_event writes
  -- the FORCE-RLS, policy-less audit_log.)
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolbypassrls) THEN
    RAISE EXCEPTION
      E'STOP: function owner % (current_user) lacks BYPASSRLS; SECURITY DEFINER RPCs\n'
       'could not write the FORCE-RLS client-master tables. Reconcile under review.', current_user;
  END IF;

  SELECT string_agg(t, ', ') INTO v_missing
  FROM unnest(ARRAY['clients','client_persons','client_identifiers','client_contacts',
                    'client_addresses','client_relationships','client_registrations',
                    'gst_registration_details']) AS t
  WHERE to_regclass('public.'||t) IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: expected base table missing: %', v_missing;
  END IF;

  SELECT string_agg(sig, E'\n  ') INTO v_missing
  FROM unnest(ARRAY[
    'public.audit_write_event(text,text,text,text,uuid,jsonb)',
    'public.is_active_user()',
    'public.is_admin_or_manager()'
  ]) AS sig
  WHERE to_regprocedure(sig) IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION E'STOP: required function(s) missing at the EXACT signature:\n  %', v_missing;
  END IF;

  -- Required audit events (D2a family events + M1-A registration.added/updated).
  SELECT string_agg(e, ', ') INTO v_missing
  FROM unnest(ARRAY['person.changed','identifier.changed','contact.changed','address.changed',
                    'relationship.changed','gst_detail.changed','registration.added',
                    'registration.updated']) AS e
  WHERE NOT EXISTS (SELECT 1 FROM public.audit_event_contract WHERE event_name = e);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: required audit event(s) not present: %', v_missing;
  END IF;

  -- Additive guard: none of the 22 RPC names may already exist at ANY signature.
  SELECT string_agg(DISTINCT p.proname, ', ') INTO v_exists
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN (
    'client_person_create','client_person_update','client_person_set_active',
    'client_identifier_create','client_identifier_update','client_identifier_set_active',
    'client_contact_create','client_contact_update','client_contact_set_active',
    'client_address_create','client_address_update','client_address_set_active',
    'client_relationship_create','client_relationship_update','client_relationship_set_active',
    'gst_detail_create','gst_detail_update',
    'client_registration_create','client_registration_create_with_gst',
    'client_registration_update','client_registration_set_active',
    'client_registration_update_with_gst');
  IF v_exists IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: RPC name(s) already exist (not additive; rerun disallowed): %', v_exists;
  END IF;

  RAISE NOTICE 'M1-B D2b Rev 2 preconditions passed (owner BYPASSRLS + exact deps + 8 events verified).';
END
$precheck$;

CREATE TEMP TABLE _m1b_d2b_baseline ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM public.audit_log)                    AS audit_log_rows,
  (SELECT count(*) FROM public.clients)                      AS clients_rows,
  (SELECT count(*) FROM public.client_persons)               AS persons_rows,
  (SELECT count(*) FROM public.client_identifiers)           AS identifiers_rows,
  (SELECT count(*) FROM public.client_contacts)              AS contacts_rows,
  (SELECT count(*) FROM public.client_addresses)             AS addresses_rows,
  (SELECT count(*) FROM public.client_relationships)         AS relationships_rows,
  (SELECT count(*) FROM public.client_registrations)         AS registrations_rows,
  (SELECT count(*) FROM public.gst_registration_details)     AS gst_rows,
  (SELECT count(*) FROM public.accounting_tracker)           AS accounting_tracker,
  (SELECT count(*) FROM public.financials_tracker)           AS financials_tracker,
  (SELECT count(*) FROM public.income_tax_tracker)           AS income_tax_tracker,
  (SELECT count(*) FROM public.compliance_calendar)          AS compliance_calendar;


-- ===========================================================================
-- SECTION A — RPCs (22). Shared guard (before any DML) in every body:
--   IF auth.uid() IS NULL THEN RAISE 'NO_AUTH_CONTEXT'; END IF;
--   IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE 'NOT_AUTHORISED_INACTIVE'; END IF;
--   IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE 'NOT_AUTHORISED'; END IF;
-- ===========================================================================

-- ---- client_persons -------------------------------------------------------
CREATE FUNCTION public.client_person_create(
  p_client_id uuid, p_person_type text, p_full_name text, p_designation text,
  p_pan text, p_din text, p_mobile text, p_email text, p_nationality text,
  p_is_primary_contact boolean, p_appointment_date date, p_cessation_date date
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_id uuid; v_pan text; v_din text; v_email text; v_mobile text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'CLIENT_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN RAISE EXCEPTION 'CLIENT_NOT_FOUND: %', p_client_id; END IF;
  IF p_full_name IS NULL OR btrim(p_full_name) = '' THEN RAISE EXCEPTION 'FULL_NAME_REQUIRED'; END IF;
  v_pan    := nullif(upper(btrim(p_pan)),'');
  v_din    := nullif(btrim(p_din),'');
  v_email  := nullif(lower(btrim(p_email)),'');
  v_mobile := nullif(btrim(p_mobile),'');
  IF v_pan    IS NOT NULL AND v_pan    !~ '^[A-Z]{5}[0-9]{4}[A-Z]$'      THEN RAISE EXCEPTION 'INVALID_PAN_FORMAT'; END IF;   -- DISCOVERY
  IF v_din    IS NOT NULL AND v_din    !~ '^[0-9]{8}$'                   THEN RAISE EXCEPTION 'INVALID_DIN_FORMAT'; END IF;   -- P1
  IF v_email  IS NOT NULL AND v_email  !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'      THEN RAISE EXCEPTION 'INVALID_EMAIL_FORMAT'; END IF; -- P5
  IF v_mobile IS NOT NULL AND v_mobile !~ '^[0-9]{10}$'                  THEN RAISE EXCEPTION 'INVALID_MOBILE_FORMAT'; END IF;-- P6
  IF p_appointment_date IS NOT NULL AND p_cessation_date IS NOT NULL AND p_cessation_date < p_appointment_date THEN
    RAISE EXCEPTION 'CESSATION_BEFORE_APPOINTMENT'; END IF;  -- P7

  INSERT INTO public.client_persons
    (client_id, person_type, full_name, designation, pan, din, mobile, email, nationality,
     is_primary_contact, appointment_date, cessation_date, created_by, updated_by)
  VALUES
    (p_client_id, coalesce(nullif(btrim(p_person_type),''),'Director'), btrim(p_full_name),
     p_designation, v_pan, v_din, v_mobile, v_email, coalesce(nullif(btrim(p_nationality),''),'Indian'),
     coalesce(p_is_primary_contact,false), p_appointment_date, p_cessation_date, auth.uid(), auth.uid())
  RETURNING id INTO v_id;

  PERFORM public.audit_write_event('person.changed','CREATE','client_persons',
            v_id::text, p_client_id, jsonb_build_object('change_type_code','CREATED'));
  RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION public.client_person_create(uuid,text,text,text,text,text,text,text,text,boolean,date,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_person_create(uuid,text,text,text,text,text,text,text,text,boolean,date,date) TO authenticated;

CREATE FUNCTION public.client_person_update(
  p_id uuid, p_expected_row_version integer,
  p_person_type text, p_full_name text, p_designation text, p_pan text, p_din text,
  p_mobile text, p_email text, p_nationality text, p_is_primary_contact boolean,
  p_appointment_date date, p_cessation_date date
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer; v_pan text; v_din text; v_email text; v_mobile text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  IF p_full_name IS NULL OR btrim(p_full_name) = '' THEN RAISE EXCEPTION 'FULL_NAME_REQUIRED'; END IF;
  v_pan    := nullif(upper(btrim(p_pan)),'');
  v_din    := nullif(btrim(p_din),'');
  v_email  := nullif(lower(btrim(p_email)),'');
  v_mobile := nullif(btrim(p_mobile),'');
  IF v_pan    IS NOT NULL AND v_pan    !~ '^[A-Z]{5}[0-9]{4}[A-Z]$'      THEN RAISE EXCEPTION 'INVALID_PAN_FORMAT'; END IF;
  IF v_din    IS NOT NULL AND v_din    !~ '^[0-9]{8}$'                   THEN RAISE EXCEPTION 'INVALID_DIN_FORMAT'; END IF;
  IF v_email  IS NOT NULL AND v_email  !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'      THEN RAISE EXCEPTION 'INVALID_EMAIL_FORMAT'; END IF;
  IF v_mobile IS NOT NULL AND v_mobile !~ '^[0-9]{10}$'                  THEN RAISE EXCEPTION 'INVALID_MOBILE_FORMAT'; END IF;
  IF p_appointment_date IS NOT NULL AND p_cessation_date IS NOT NULL AND p_cessation_date < p_appointment_date THEN
    RAISE EXCEPTION 'CESSATION_BEFORE_APPOINTMENT'; END IF;

  UPDATE public.client_persons SET
    person_type=coalesce(nullif(btrim(p_person_type),''),person_type), full_name=btrim(p_full_name),
    designation=p_designation, pan=v_pan, din=v_din, mobile=v_mobile, email=v_email,
    nationality=coalesce(nullif(btrim(p_nationality),''),nationality),
    is_primary_contact=coalesce(p_is_primary_contact,is_primary_contact),
    appointment_date=p_appointment_date, cessation_date=p_cessation_date,
    row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING client_id, row_version INTO v_client, v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_persons WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;

  PERFORM public.audit_write_event('person.changed','UPDATE','client_persons',
            p_id::text, v_client, jsonb_build_object('change_type_code','UPDATED'));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.client_person_update(uuid,integer,text,text,text,text,text,text,text,text,boolean,date,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_person_update(uuid,integer,text,text,text,text,text,text,text,text,boolean,date,date) TO authenticated;

CREATE FUNCTION public.client_person_set_active(p_id uuid, p_is_active boolean, p_expected_row_version integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  IF p_is_active IS NULL THEN RAISE EXCEPTION 'IS_ACTIVE_REQUIRED'; END IF;
  UPDATE public.client_persons SET is_active=p_is_active, row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING client_id, row_version INTO v_client, v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_persons WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  PERFORM public.audit_write_event('person.changed','UPDATE','client_persons',
            p_id::text, v_client, jsonb_build_object('change_type_code', CASE WHEN p_is_active THEN 'ENABLED' ELSE 'DISABLED' END));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.client_person_set_active(uuid,boolean,integer) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_person_set_active(uuid,boolean,integer) TO authenticated;


-- ---- client_identifiers ---------------------------------------------------
CREATE FUNCTION public.client_identifier_create(
  p_client_id uuid, p_id_type text, p_id_value text, p_issued_on date, p_status text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_id uuid; v_type text; v_value text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'CLIENT_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN RAISE EXCEPTION 'CLIENT_NOT_FOUND: %', p_client_id; END IF;
  IF p_id_type  IS NULL OR btrim(p_id_type)  = '' THEN RAISE EXCEPTION 'ID_TYPE_REQUIRED'; END IF;
  IF p_id_value IS NULL OR btrim(p_id_value) = '' THEN RAISE EXCEPTION 'ID_VALUE_REQUIRED'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('Active','Inactive') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  v_type  := upper(btrim(p_id_type));
  v_value := btrim(p_id_value);
  -- G1 (final ruling): Aadhaar identifier TYPES are prohibited (Rule 6 / R-6). A value is
  --     NOT rejected solely for being 12 digits — there is no length-only Aadhaar heuristic.
  IF v_type ~ '(AADHAAR|AADHAR|ADHAR|UIDAI)' OR v_type = 'UID' THEN RAISE EXCEPTION 'AADHAAR_IDENTIFIER_NOT_ALLOWED'; END IF;
  -- P11: per-type format validation (value upper-normalised for these types).
  IF v_type IN ('PAN','TAN','CIN','LLPIN','DIN') THEN
    v_value := upper(v_value);
    IF v_type = 'PAN'   AND v_value !~ '^[A-Z]{5}[0-9]{4}[A-Z]$'                    THEN RAISE EXCEPTION 'INVALID_PAN_FORMAT'; END IF;
    IF v_type = 'TAN'   AND v_value !~ '^[A-Z]{4}[0-9]{5}[A-Z]$'                    THEN RAISE EXCEPTION 'INVALID_TAN_FORMAT'; END IF;
    IF v_type = 'CIN'   AND v_value !~ '^[LUF][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$' THEN RAISE EXCEPTION 'INVALID_CIN_FORMAT'; END IF;
    IF v_type = 'LLPIN' AND v_value !~ '^[A-Z]{3}-?[0-9]{4}$'                       THEN RAISE EXCEPTION 'INVALID_LLPIN_FORMAT'; END IF;
    IF v_type = 'DIN'   AND v_value !~ '^[0-9]{8}$'                                 THEN RAISE EXCEPTION 'INVALID_DIN_FORMAT'; END IF;
  END IF;

  INSERT INTO public.client_identifiers (client_id, id_type, id_value, issued_on, status, created_by, updated_by)
  VALUES (p_client_id, v_type, v_value, p_issued_on,
          coalesce(nullif(btrim(p_status),''),'Active'), auth.uid(), auth.uid())
  RETURNING id INTO v_id;

  PERFORM public.audit_write_event('identifier.changed','CREATE','client_identifiers',
            v_id::text, p_client_id, jsonb_build_object('change_type_code','CREATED'));
  RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION public.client_identifier_create(uuid,text,text,date,text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_identifier_create(uuid,text,text,date,text) TO authenticated;

CREATE FUNCTION public.client_identifier_update(
  p_id uuid, p_expected_row_version integer, p_id_type text, p_id_value text, p_issued_on date, p_status text
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer; v_type text; v_value text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  IF p_id_type  IS NULL OR btrim(p_id_type)  = '' THEN RAISE EXCEPTION 'ID_TYPE_REQUIRED'; END IF;
  IF p_id_value IS NULL OR btrim(p_id_value) = '' THEN RAISE EXCEPTION 'ID_VALUE_REQUIRED'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('Active','Inactive') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  v_type  := upper(btrim(p_id_type));
  v_value := btrim(p_id_value);
  -- G1 (final ruling): Aadhaar identifier TYPES are prohibited (Rule 6 / R-6). A value is
  --     NOT rejected solely for being 12 digits — there is no length-only Aadhaar heuristic.
  IF v_type ~ '(AADHAAR|AADHAR|ADHAR|UIDAI)' OR v_type = 'UID' THEN RAISE EXCEPTION 'AADHAAR_IDENTIFIER_NOT_ALLOWED'; END IF;
  -- P11: per-type format validation (value upper-normalised for these types).
  IF v_type IN ('PAN','TAN','CIN','LLPIN','DIN') THEN
    v_value := upper(v_value);
    IF v_type = 'PAN'   AND v_value !~ '^[A-Z]{5}[0-9]{4}[A-Z]$'                    THEN RAISE EXCEPTION 'INVALID_PAN_FORMAT'; END IF;
    IF v_type = 'TAN'   AND v_value !~ '^[A-Z]{4}[0-9]{5}[A-Z]$'                    THEN RAISE EXCEPTION 'INVALID_TAN_FORMAT'; END IF;
    IF v_type = 'CIN'   AND v_value !~ '^[LUF][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$' THEN RAISE EXCEPTION 'INVALID_CIN_FORMAT'; END IF;
    IF v_type = 'LLPIN' AND v_value !~ '^[A-Z]{3}-?[0-9]{4}$'                       THEN RAISE EXCEPTION 'INVALID_LLPIN_FORMAT'; END IF;
    IF v_type = 'DIN'   AND v_value !~ '^[0-9]{8}$'                                 THEN RAISE EXCEPTION 'INVALID_DIN_FORMAT'; END IF;
  END IF;

  UPDATE public.client_identifiers SET
    id_type=v_type, id_value=v_value, issued_on=p_issued_on,
    status=coalesce(nullif(btrim(p_status),''),status),
    row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING client_id, row_version INTO v_client, v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_identifiers WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  PERFORM public.audit_write_event('identifier.changed','UPDATE','client_identifiers',
            p_id::text, v_client, jsonb_build_object('change_type_code','UPDATED'));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.client_identifier_update(uuid,integer,text,text,date,text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_identifier_update(uuid,integer,text,text,date,text) TO authenticated;

CREATE FUNCTION public.client_identifier_set_active(p_id uuid, p_is_active boolean, p_expected_row_version integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  IF p_is_active IS NULL THEN RAISE EXCEPTION 'IS_ACTIVE_REQUIRED'; END IF;
  UPDATE public.client_identifiers SET
    is_active=p_is_active, status=CASE WHEN p_is_active THEN 'Active' ELSE 'Inactive' END,
    row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING client_id, row_version INTO v_client, v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_identifiers WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  PERFORM public.audit_write_event('identifier.changed','UPDATE','client_identifiers',
            p_id::text, v_client, jsonb_build_object('change_type_code', CASE WHEN p_is_active THEN 'ENABLED' ELSE 'DISABLED' END));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.client_identifier_set_active(uuid,boolean,integer) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_identifier_set_active(uuid,boolean,integer) TO authenticated;


-- ---- client_contacts ------------------------------------------------------
CREATE FUNCTION public.client_contact_create(
  p_client_id uuid, p_contact_type text, p_person_name text, p_designation text,
  p_email text, p_phone text, p_is_primary boolean, p_linked_person_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_id uuid; v_email text; v_phone text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'CLIENT_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN RAISE EXCEPTION 'CLIENT_NOT_FOUND: %', p_client_id; END IF;
  v_email := nullif(lower(btrim(p_email)),'');
  v_phone := nullif(btrim(p_phone),'');
  -- P9: a contact must carry at least one meaningful field.
  IF nullif(btrim(p_person_name),'') IS NULL AND v_email IS NULL AND v_phone IS NULL THEN
    RAISE EXCEPTION 'CONTACT_FIELD_REQUIRED'; END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' THEN RAISE EXCEPTION 'INVALID_EMAIL_FORMAT'; END IF;
  IF v_phone IS NOT NULL AND v_phone !~ '^[0-9]{10}$'             THEN RAISE EXCEPTION 'INVALID_PHONE_FORMAT'; END IF;
  IF p_linked_person_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.client_persons WHERE id = p_linked_person_id AND client_id = p_client_id) THEN
    RAISE EXCEPTION 'LINKED_PERSON_NOT_FOUND_FOR_CLIENT'; END IF;

  INSERT INTO public.client_contacts (client_id, contact_type, person_name, designation, email, phone, is_primary, linked_person_id, created_by, updated_by)
  VALUES (p_client_id, coalesce(nullif(btrim(p_contact_type),''),'Primary'), p_person_name, p_designation,
          v_email, v_phone, coalesce(p_is_primary,false), p_linked_person_id, auth.uid(), auth.uid())
  RETURNING id INTO v_id;

  PERFORM public.audit_write_event('contact.changed','CREATE','client_contacts',
            v_id::text, p_client_id, jsonb_build_object('change_type_code','CREATED'));
  RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION public.client_contact_create(uuid,text,text,text,text,text,boolean,uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_contact_create(uuid,text,text,text,text,text,boolean,uuid) TO authenticated;

CREATE FUNCTION public.client_contact_update(
  p_id uuid, p_expected_row_version integer, p_contact_type text, p_person_name text,
  p_designation text, p_email text, p_phone text, p_is_primary boolean, p_linked_person_id uuid
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer; v_email text; v_phone text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  SELECT client_id INTO v_client FROM public.client_contacts WHERE id = p_id;
  IF v_client IS NULL THEN RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  v_email := nullif(lower(btrim(p_email)),'');
  v_phone := nullif(btrim(p_phone),'');
  IF nullif(btrim(p_person_name),'') IS NULL AND v_email IS NULL AND v_phone IS NULL THEN
    RAISE EXCEPTION 'CONTACT_FIELD_REQUIRED'; END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' THEN RAISE EXCEPTION 'INVALID_EMAIL_FORMAT'; END IF;
  IF v_phone IS NOT NULL AND v_phone !~ '^[0-9]{10}$'             THEN RAISE EXCEPTION 'INVALID_PHONE_FORMAT'; END IF;
  IF p_linked_person_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.client_persons WHERE id = p_linked_person_id AND client_id = v_client) THEN
    RAISE EXCEPTION 'LINKED_PERSON_NOT_FOUND_FOR_CLIENT'; END IF;

  UPDATE public.client_contacts SET
    contact_type=coalesce(nullif(btrim(p_contact_type),''),contact_type), person_name=p_person_name,
    designation=p_designation, email=v_email, phone=v_phone,
    is_primary=coalesce(p_is_primary,is_primary), linked_person_id=p_linked_person_id,
    row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING row_version INTO v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_contacts WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  PERFORM public.audit_write_event('contact.changed','UPDATE','client_contacts',
            p_id::text, v_client, jsonb_build_object('change_type_code','UPDATED'));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.client_contact_update(uuid,integer,text,text,text,text,text,boolean,uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_contact_update(uuid,integer,text,text,text,text,text,boolean,uuid) TO authenticated;

CREATE FUNCTION public.client_contact_set_active(p_id uuid, p_is_active boolean, p_expected_row_version integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  IF p_is_active IS NULL THEN RAISE EXCEPTION 'IS_ACTIVE_REQUIRED'; END IF;
  UPDATE public.client_contacts SET is_active=p_is_active, row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING client_id, row_version INTO v_client, v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_contacts WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  PERFORM public.audit_write_event('contact.changed','UPDATE','client_contacts',
            p_id::text, v_client, jsonb_build_object('change_type_code', CASE WHEN p_is_active THEN 'ENABLED' ELSE 'DISABLED' END));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.client_contact_set_active(uuid,boolean,integer) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_contact_set_active(uuid,boolean,integer) TO authenticated;


-- ---- client_addresses -----------------------------------------------------
CREATE FUNCTION public.client_address_create(
  p_client_id uuid, p_address_type text, p_line1 text, p_line2 text, p_city text,
  p_state text, p_country text, p_pincode text, p_is_primary boolean, p_effective_from date, p_effective_to date
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_id uuid; v_pincode text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'CLIENT_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN RAISE EXCEPTION 'CLIENT_NOT_FOUND: %', p_client_id; END IF;
  IF p_line1 IS NULL OR btrim(p_line1) = '' THEN RAISE EXCEPTION 'ADDRESS_LINE1_REQUIRED'; END IF;  -- P10
  v_pincode := nullif(btrim(p_pincode),'');
  IF v_pincode IS NOT NULL AND v_pincode !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'INVALID_PINCODE_FORMAT'; END IF;  -- P4
  IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN
    RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM'; END IF;

  INSERT INTO public.client_addresses (client_id, address_type, line1, line2, city, state, country, pincode, is_primary, effective_from, effective_to, created_by, updated_by)
  VALUES (p_client_id, coalesce(nullif(btrim(p_address_type),''),'Registered'), btrim(p_line1), p_line2, p_city,
          p_state, coalesce(nullif(btrim(p_country),''),'India'), v_pincode, coalesce(p_is_primary,false),
          p_effective_from, p_effective_to, auth.uid(), auth.uid())
  RETURNING id INTO v_id;

  PERFORM public.audit_write_event('address.changed','CREATE','client_addresses',
            v_id::text, p_client_id, jsonb_build_object('change_type_code','CREATED'));
  RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION public.client_address_create(uuid,text,text,text,text,text,text,text,boolean,date,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_address_create(uuid,text,text,text,text,text,text,text,boolean,date,date) TO authenticated;

CREATE FUNCTION public.client_address_update(
  p_id uuid, p_expected_row_version integer, p_address_type text, p_line1 text, p_line2 text,
  p_city text, p_state text, p_country text, p_pincode text, p_is_primary boolean, p_effective_from date, p_effective_to date
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer; v_pincode text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  IF p_line1 IS NULL OR btrim(p_line1) = '' THEN RAISE EXCEPTION 'ADDRESS_LINE1_REQUIRED'; END IF;
  v_pincode := nullif(btrim(p_pincode),'');
  IF v_pincode IS NOT NULL AND v_pincode !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'INVALID_PINCODE_FORMAT'; END IF;
  IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN
    RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM'; END IF;

  UPDATE public.client_addresses SET
    address_type=coalesce(nullif(btrim(p_address_type),''),address_type), line1=btrim(p_line1), line2=p_line2,
    city=p_city, state=p_state, country=coalesce(nullif(btrim(p_country),''),country), pincode=v_pincode,
    is_primary=coalesce(p_is_primary,is_primary), effective_from=p_effective_from, effective_to=p_effective_to,
    row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING client_id, row_version INTO v_client, v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_addresses WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  PERFORM public.audit_write_event('address.changed','UPDATE','client_addresses',
            p_id::text, v_client, jsonb_build_object('change_type_code','UPDATED'));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.client_address_update(uuid,integer,text,text,text,text,text,text,text,boolean,date,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_address_update(uuid,integer,text,text,text,text,text,text,text,boolean,date,date) TO authenticated;

CREATE FUNCTION public.client_address_set_active(p_id uuid, p_is_active boolean, p_expected_row_version integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  IF p_is_active IS NULL THEN RAISE EXCEPTION 'IS_ACTIVE_REQUIRED'; END IF;
  UPDATE public.client_addresses SET is_active=p_is_active, row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING client_id, row_version INTO v_client, v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_addresses WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  PERFORM public.audit_write_event('address.changed','UPDATE','client_addresses',
            p_id::text, v_client, jsonb_build_object('change_type_code', CASE WHEN p_is_active THEN 'ENABLED' ELSE 'DISABLED' END));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.client_address_set_active(uuid,boolean,integer) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_address_set_active(uuid,boolean,integer) TO authenticated;


-- ---- client_relationships -------------------------------------------------
CREATE FUNCTION public.client_relationship_create(
  p_client_id uuid, p_related_client_id uuid, p_related_person_id uuid,
  p_relationship_type text, p_ownership_pct numeric, p_effective_from date, p_effective_to date
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'CLIENT_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN RAISE EXCEPTION 'CLIENT_NOT_FOUND: %', p_client_id; END IF;
  IF p_relationship_type IS NULL OR btrim(p_relationship_type) = '' THEN RAISE EXCEPTION 'RELATIONSHIP_TYPE_REQUIRED'; END IF;
  IF (p_related_client_id IS NOT NULL) = (p_related_person_id IS NOT NULL) THEN RAISE EXCEPTION 'EXACTLY_ONE_TARGET_REQUIRED'; END IF;
  IF p_related_client_id = p_client_id THEN RAISE EXCEPTION 'SELF_RELATIONSHIP_NOT_ALLOWED'; END IF;  -- P8
  IF p_ownership_pct IS NOT NULL AND (p_ownership_pct < 0 OR p_ownership_pct > 100) THEN RAISE EXCEPTION 'OWNERSHIP_PCT_OUT_OF_RANGE'; END IF;
  IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM'; END IF;
  IF p_related_client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_related_client_id) THEN RAISE EXCEPTION 'RELATED_CLIENT_NOT_FOUND'; END IF;
  IF p_related_person_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.client_persons WHERE id = p_related_person_id) THEN RAISE EXCEPTION 'RELATED_PERSON_NOT_FOUND'; END IF;

  INSERT INTO public.client_relationships (client_id, related_client_id, related_person_id, relationship_type, ownership_pct, effective_from, effective_to, created_by, updated_by)
  VALUES (p_client_id, p_related_client_id, p_related_person_id, btrim(p_relationship_type), p_ownership_pct, p_effective_from, p_effective_to, auth.uid(), auth.uid())
  RETURNING id INTO v_id;

  PERFORM public.audit_write_event('relationship.changed','CREATE','client_relationships',
            v_id::text, p_client_id, jsonb_build_object('change_type_code','CREATED'));
  RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION public.client_relationship_create(uuid,uuid,uuid,text,numeric,date,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_relationship_create(uuid,uuid,uuid,text,numeric,date,date) TO authenticated;

CREATE FUNCTION public.client_relationship_update(
  p_id uuid, p_expected_row_version integer, p_related_client_id uuid, p_related_person_id uuid,
  p_relationship_type text, p_ownership_pct numeric, p_effective_from date, p_effective_to date
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  IF p_relationship_type IS NULL OR btrim(p_relationship_type) = '' THEN RAISE EXCEPTION 'RELATIONSHIP_TYPE_REQUIRED'; END IF;
  IF (p_related_client_id IS NOT NULL) = (p_related_person_id IS NOT NULL) THEN RAISE EXCEPTION 'EXACTLY_ONE_TARGET_REQUIRED'; END IF;
  IF p_ownership_pct IS NOT NULL AND (p_ownership_pct < 0 OR p_ownership_pct > 100) THEN RAISE EXCEPTION 'OWNERSHIP_PCT_OUT_OF_RANGE'; END IF;
  IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM'; END IF;
  SELECT client_id INTO v_client FROM public.client_relationships WHERE id = p_id;
  IF v_client IS NULL THEN RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  IF p_related_client_id = v_client THEN RAISE EXCEPTION 'SELF_RELATIONSHIP_NOT_ALLOWED'; END IF;  -- P8
  IF p_related_client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_related_client_id) THEN RAISE EXCEPTION 'RELATED_CLIENT_NOT_FOUND'; END IF;
  IF p_related_person_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.client_persons WHERE id = p_related_person_id) THEN RAISE EXCEPTION 'RELATED_PERSON_NOT_FOUND'; END IF;

  UPDATE public.client_relationships SET
    related_client_id=p_related_client_id, related_person_id=p_related_person_id, relationship_type=btrim(p_relationship_type),
    ownership_pct=p_ownership_pct, effective_from=p_effective_from, effective_to=p_effective_to,
    row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING row_version INTO v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_relationships WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  PERFORM public.audit_write_event('relationship.changed','UPDATE','client_relationships',
            p_id::text, v_client, jsonb_build_object('change_type_code','UPDATED'));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.client_relationship_update(uuid,integer,uuid,uuid,text,numeric,date,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_relationship_update(uuid,integer,uuid,uuid,text,numeric,date,date) TO authenticated;

CREATE FUNCTION public.client_relationship_set_active(p_id uuid, p_is_active boolean, p_expected_row_version integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  IF p_is_active IS NULL THEN RAISE EXCEPTION 'IS_ACTIVE_REQUIRED'; END IF;
  UPDATE public.client_relationships SET is_active=p_is_active, row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING client_id, row_version INTO v_client, v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_relationships WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  PERFORM public.audit_write_event('relationship.changed','UPDATE','client_relationships',
            p_id::text, v_client, jsonb_build_object('change_type_code', CASE WHEN p_is_active THEN 'ENABLED' ELSE 'DISABLED' END));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.client_relationship_set_active(uuid,boolean,integer) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_relationship_set_active(uuid,boolean,integer) TO authenticated;


-- ---- client_registrations (header) : create · update · set_active ---------
CREATE FUNCTION public.client_registration_create(
  p_client_id uuid, p_reg_type text, p_jurisdiction text, p_reg_number text, p_status text,
  p_effective_from date, p_effective_to date, p_registered_on date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_id uuid; v_rv integer; v_reg_type text; v_jur text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'CLIENT_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN RAISE EXCEPTION 'CLIENT_NOT_FOUND: %', p_client_id; END IF;
  IF p_reg_type IS NULL OR btrim(p_reg_type) = '' THEN RAISE EXCEPTION 'REG_TYPE_REQUIRED'; END IF;
  v_reg_type := upper(btrim(p_reg_type));
  IF v_reg_type NOT IN ('IN_GST','AE_VAT','AE_CT','LICENCE','OTHER') THEN RAISE EXCEPTION 'INVALID_REG_TYPE'; END IF;  -- P15
  v_jur := coalesce(nullif(btrim(p_jurisdiction),''),'IN');
  IF char_length(v_jur) > 64 THEN RAISE EXCEPTION 'INVALID_JURISDICTION_LENGTH'; END IF;  -- P16 (final ruling: trimmed non-empty text, <=64 chars; NOT restricted to two letters)
  IF p_status IS NOT NULL AND p_status NOT IN ('Applied','Active','Suspended','Cancelled') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM'; END IF;

  INSERT INTO public.client_registrations
    (client_id, reg_type, jurisdiction, reg_number, status, effective_from, effective_to, registered_on, created_by, updated_by)
  VALUES
    (p_client_id, v_reg_type, v_jur, nullif(btrim(p_reg_number),''),
     coalesce(nullif(btrim(p_status),''),'Active'), p_effective_from, p_effective_to, p_registered_on, auth.uid(), auth.uid())
  RETURNING id, row_version INTO v_id, v_rv;

  PERFORM public.audit_write_event('registration.added','CREATE','client_registrations',
            v_id::text, p_client_id, jsonb_build_object('change_type_code','CREATED'));
  RETURN jsonb_build_object('id', v_id, 'row_version', v_rv);
END $fn$;
REVOKE ALL ON FUNCTION public.client_registration_create(uuid,text,text,text,text,date,date,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_registration_create(uuid,text,text,text,text,date,date,date) TO authenticated;

CREATE FUNCTION public.client_registration_update(
  p_id uuid, p_expected_row_version integer, p_reg_type text, p_jurisdiction text,
  p_reg_number text, p_status text, p_effective_from date, p_effective_to date, p_registered_on date
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer; v_reg_type text; v_jur text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  v_reg_type := nullif(upper(btrim(p_reg_type)),'');
  IF v_reg_type IS NOT NULL AND v_reg_type NOT IN ('IN_GST','AE_VAT','AE_CT','LICENCE','OTHER') THEN RAISE EXCEPTION 'INVALID_REG_TYPE'; END IF;  -- P15
  v_jur := nullif(btrim(p_jurisdiction),'');
  IF v_jur IS NOT NULL AND char_length(v_jur) > 64 THEN RAISE EXCEPTION 'INVALID_JURISDICTION_LENGTH'; END IF;  -- P16 (final ruling: trimmed non-empty text, <=64 chars; NOT restricted to two letters)
  IF p_status IS NOT NULL AND p_status NOT IN ('Applied','Active','Suspended','Cancelled') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM'; END IF;

  UPDATE public.client_registrations SET
    reg_type=coalesce(v_reg_type,reg_type), jurisdiction=coalesce(v_jur,jurisdiction),
    reg_number=nullif(btrim(p_reg_number),''), status=coalesce(nullif(btrim(p_status),''),status),
    effective_from=p_effective_from, effective_to=p_effective_to, registered_on=p_registered_on,
    row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING client_id, row_version INTO v_client, v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_registrations WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  PERFORM public.audit_write_event('registration.updated','UPDATE','client_registrations',
            p_id::text, v_client, jsonb_build_object('change_type_code','UPDATED'));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.client_registration_update(uuid,integer,text,text,text,text,date,date,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_registration_update(uuid,integer,text,text,text,text,date,date,date) TO authenticated;

CREATE FUNCTION public.client_registration_set_active(p_id uuid, p_is_active boolean, p_expected_row_version integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  IF p_is_active IS NULL THEN RAISE EXCEPTION 'IS_ACTIVE_REQUIRED'; END IF;
  UPDATE public.client_registrations SET is_active=p_is_active, row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING client_id, row_version INTO v_client, v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_registrations WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  PERFORM public.audit_write_event('registration.updated','UPDATE','client_registrations',
            p_id::text, v_client, jsonb_build_object('change_type_code', CASE WHEN p_is_active THEN 'ENABLED' ELSE 'DISABLED' END));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.client_registration_set_active(uuid,boolean,integer) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_registration_set_active(uuid,boolean,integer) TO authenticated;


-- ---- gst_registration_details (1:1 with header; client derived from header) --
CREATE FUNCTION public.gst_detail_create(
  p_registration_id uuid, p_gstin text, p_state_code text, p_filing_frequency text,
  p_composition boolean, p_registration_date date, p_cancellation_date date
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_reg_type text; v_gstin text; v_state text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_registration_id IS NULL THEN RAISE EXCEPTION 'REGISTRATION_REQUIRED'; END IF;
  SELECT client_id, upper(btrim(reg_type)) INTO v_client, v_reg_type FROM public.client_registrations WHERE id = p_registration_id;
  IF v_client IS NULL THEN RAISE EXCEPTION 'REGISTRATION_NOT_FOUND: %', p_registration_id; END IF;
  IF v_reg_type IS DISTINCT FROM 'IN_GST' THEN RAISE EXCEPTION 'GST_HEADER_TYPE_MISMATCH'; END IF;  -- P14
  IF EXISTS (SELECT 1 FROM public.gst_registration_details WHERE registration_id = p_registration_id) THEN RAISE EXCEPTION 'GST_DETAIL_EXISTS'; END IF;
  v_gstin := nullif(upper(btrim(p_gstin)),'');
  v_state := nullif(btrim(p_state_code),'');
  IF p_filing_frequency IS NOT NULL AND p_filing_frequency NOT IN ('Monthly','Quarterly_QRMP') THEN RAISE EXCEPTION 'INVALID_FILING_FREQUENCY'; END IF;
  IF v_gstin IS NOT NULL AND v_gstin !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' THEN RAISE EXCEPTION 'INVALID_GSTIN_FORMAT'; END IF;  -- P2
  IF v_state IS NOT NULL AND v_state !~ '^[0-9]{2}$' THEN RAISE EXCEPTION 'INVALID_STATE_CODE'; END IF;  -- P3
  IF v_gstin IS NOT NULL AND v_state IS NOT NULL AND substring(v_gstin FROM 1 FOR 2) <> v_state THEN RAISE EXCEPTION 'GSTIN_STATE_CODE_MISMATCH'; END IF;  -- P13
  IF p_registration_date IS NOT NULL AND p_cancellation_date IS NOT NULL AND p_cancellation_date < p_registration_date THEN RAISE EXCEPTION 'CANCELLATION_BEFORE_REGISTRATION'; END IF;

  INSERT INTO public.gst_registration_details
    (registration_id, gstin, state_code, filing_frequency, composition, registration_date, cancellation_date, created_by, updated_by)
  VALUES
    (p_registration_id, v_gstin, v_state, p_filing_frequency, coalesce(p_composition,false), p_registration_date, p_cancellation_date, auth.uid(), auth.uid());

  PERFORM public.audit_write_event('gst_detail.changed','CREATE','gst_registration_details',
            p_registration_id::text, v_client, jsonb_build_object('change_type_code','CREATED'));
  RETURN p_registration_id;
END $fn$;
REVOKE ALL ON FUNCTION public.gst_detail_create(uuid,text,text,text,boolean,date,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.gst_detail_create(uuid,text,text,text,boolean,date,date) TO authenticated;

CREATE FUNCTION public.gst_detail_update(
  p_registration_id uuid, p_expected_row_version integer, p_gstin text, p_state_code text,
  p_filing_frequency text, p_composition boolean, p_registration_date date, p_cancellation_date date
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_new_rv integer; v_reg_type text; v_gstin text; v_state text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_registration_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  SELECT client_id, upper(btrim(reg_type)) INTO v_client, v_reg_type FROM public.client_registrations WHERE id = p_registration_id;
  IF v_client IS NULL THEN RAISE EXCEPTION 'REGISTRATION_NOT_FOUND: %', p_registration_id; END IF;
  IF v_reg_type IS DISTINCT FROM 'IN_GST' THEN RAISE EXCEPTION 'GST_HEADER_TYPE_MISMATCH'; END IF;  -- P14
  v_gstin := nullif(upper(btrim(p_gstin)),'');
  v_state := nullif(btrim(p_state_code),'');
  IF p_filing_frequency IS NOT NULL AND p_filing_frequency NOT IN ('Monthly','Quarterly_QRMP') THEN RAISE EXCEPTION 'INVALID_FILING_FREQUENCY'; END IF;
  IF v_gstin IS NOT NULL AND v_gstin !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' THEN RAISE EXCEPTION 'INVALID_GSTIN_FORMAT'; END IF;
  IF v_state IS NOT NULL AND v_state !~ '^[0-9]{2}$' THEN RAISE EXCEPTION 'INVALID_STATE_CODE'; END IF;
  IF v_gstin IS NOT NULL AND v_state IS NOT NULL AND substring(v_gstin FROM 1 FOR 2) <> v_state THEN RAISE EXCEPTION 'GSTIN_STATE_CODE_MISMATCH'; END IF;  -- P13
  IF p_registration_date IS NOT NULL AND p_cancellation_date IS NOT NULL AND p_cancellation_date < p_registration_date THEN RAISE EXCEPTION 'CANCELLATION_BEFORE_REGISTRATION'; END IF;

  UPDATE public.gst_registration_details SET
    gstin=v_gstin, state_code=v_state, filing_frequency=p_filing_frequency, composition=coalesce(p_composition,composition),
    registration_date=p_registration_date, cancellation_date=p_cancellation_date,
    row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE registration_id=p_registration_id AND row_version=p_expected_row_version
  RETURNING row_version INTO v_new_rv;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.gst_registration_details WHERE registration_id=p_registration_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  PERFORM public.audit_write_event('gst_detail.changed','UPDATE','gst_registration_details',
            p_registration_id::text, v_client, jsonb_build_object('change_type_code','UPDATED'));
  RETURN v_new_rv;
END $fn$;
REVOKE ALL ON FUNCTION public.gst_detail_update(uuid,integer,text,text,text,boolean,date,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.gst_detail_update(uuid,integer,text,text,text,boolean,date,date) TO authenticated;


-- ---- combined header + GST (atomic, BOTH events) --------------------------
-- CREATE-with-GST: new header (registration.added) + new GST detail (gst_detail.changed).
CREATE FUNCTION public.client_registration_create_with_gst(
  p_client_id uuid, p_reg_type text, p_jurisdiction text, p_reg_number text, p_status text,
  p_effective_from date, p_effective_to date, p_registered_on date,
  p_gstin text, p_state_code text, p_filing_frequency text, p_composition boolean,
  p_registration_date date, p_cancellation_date date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_id uuid; v_hdr_rv integer; v_gst_rv integer; v_reg_type text; v_jur text; v_gstin text; v_state text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'CLIENT_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN RAISE EXCEPTION 'CLIENT_NOT_FOUND: %', p_client_id; END IF;
  IF p_reg_type IS NULL OR btrim(p_reg_type) = '' THEN RAISE EXCEPTION 'REG_TYPE_REQUIRED'; END IF;
  v_reg_type := upper(btrim(p_reg_type));
  IF v_reg_type IS DISTINCT FROM 'IN_GST' THEN RAISE EXCEPTION 'GST_HEADER_TYPE_MISMATCH'; END IF;  -- P14 (GST detail requires an IN_GST header)
  v_jur := coalesce(nullif(btrim(p_jurisdiction),''),'IN');
  IF char_length(v_jur) > 64 THEN RAISE EXCEPTION 'INVALID_JURISDICTION_LENGTH'; END IF;  -- P16 (final ruling: trimmed non-empty text, <=64 chars; NOT restricted to two letters)
  IF p_status IS NOT NULL AND p_status NOT IN ('Applied','Active','Suspended','Cancelled') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM'; END IF;
  v_gstin := nullif(upper(btrim(p_gstin)),'');
  v_state := nullif(btrim(p_state_code),'');
  IF p_filing_frequency IS NOT NULL AND p_filing_frequency NOT IN ('Monthly','Quarterly_QRMP') THEN RAISE EXCEPTION 'INVALID_FILING_FREQUENCY'; END IF;
  IF v_gstin IS NOT NULL AND v_gstin !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' THEN RAISE EXCEPTION 'INVALID_GSTIN_FORMAT'; END IF;
  IF v_state IS NOT NULL AND v_state !~ '^[0-9]{2}$' THEN RAISE EXCEPTION 'INVALID_STATE_CODE'; END IF;
  IF v_gstin IS NOT NULL AND v_state IS NOT NULL AND substring(v_gstin FROM 1 FOR 2) <> v_state THEN RAISE EXCEPTION 'GSTIN_STATE_CODE_MISMATCH'; END IF;  -- P13
  IF p_registration_date IS NOT NULL AND p_cancellation_date IS NOT NULL AND p_cancellation_date < p_registration_date THEN RAISE EXCEPTION 'CANCELLATION_BEFORE_REGISTRATION'; END IF;

  INSERT INTO public.client_registrations
    (client_id, reg_type, jurisdiction, reg_number, status, effective_from, effective_to, registered_on, created_by, updated_by)
  VALUES
    (p_client_id, v_reg_type, v_jur, nullif(btrim(p_reg_number),''),
     coalesce(nullif(btrim(p_status),''),'Active'), p_effective_from, p_effective_to, p_registered_on, auth.uid(), auth.uid())
  RETURNING id, row_version INTO v_id, v_hdr_rv;

  INSERT INTO public.gst_registration_details
    (registration_id, gstin, state_code, filing_frequency, composition, registration_date, cancellation_date, created_by, updated_by)
  VALUES
    (v_id, v_gstin, v_state, p_filing_frequency, coalesce(p_composition,false), p_registration_date, p_cancellation_date, auth.uid(), auth.uid())
  RETURNING row_version INTO v_gst_rv;

  PERFORM public.audit_write_event('registration.added','CREATE','client_registrations',
            v_id::text, p_client_id, jsonb_build_object('change_type_code','CREATED'));
  PERFORM public.audit_write_event('gst_detail.changed','CREATE','gst_registration_details',
            v_id::text, p_client_id, jsonb_build_object('change_type_code','CREATED'));

  RETURN jsonb_build_object('registration_id', v_id, 'header_row_version', v_hdr_rv, 'gst_row_version', v_gst_rv);
END $fn$;
REVOKE ALL ON FUNCTION public.client_registration_create_with_gst(uuid,text,text,text,text,date,date,date,text,text,text,boolean,date,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_registration_create_with_gst(uuid,text,text,text,text,date,date,date,text,text,text,boolean,date,date) TO authenticated;

-- UPDATE-with-GST: header (registration.updated) + upsert GST detail (gst_detail.changed).
CREATE FUNCTION public.client_registration_update_with_gst(
  p_id uuid, p_expected_row_version integer,
  p_reg_type text, p_jurisdiction text, p_reg_number text, p_status text,
  p_effective_from date, p_effective_to date, p_registered_on date,
  p_gst_expected_row_version integer, p_gstin text, p_state_code text,
  p_filing_frequency text, p_composition boolean, p_registration_date date, p_cancellation_date date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_hdr_rv integer; v_gst_rv integer; v_gst_code text; v_gst_exists boolean; v_reg_type text; v_final_reg_type text; v_jur text; v_gstin text; v_state text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;
  v_reg_type := nullif(upper(btrim(p_reg_type)),'');
  IF v_reg_type IS NOT NULL AND v_reg_type NOT IN ('IN_GST','AE_VAT','AE_CT','LICENCE','OTHER') THEN RAISE EXCEPTION 'INVALID_REG_TYPE'; END IF;  -- P15
  v_jur := nullif(btrim(p_jurisdiction),'');
  IF v_jur IS NOT NULL AND char_length(v_jur) > 64 THEN RAISE EXCEPTION 'INVALID_JURISDICTION_LENGTH'; END IF;  -- P16 (final ruling: trimmed non-empty text, <=64 chars; NOT restricted to two letters)
  IF p_status IS NOT NULL AND p_status NOT IN ('Applied','Active','Suspended','Cancelled') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM'; END IF;
  v_gstin := nullif(upper(btrim(p_gstin)),'');
  v_state := nullif(btrim(p_state_code),'');
  IF p_filing_frequency IS NOT NULL AND p_filing_frequency NOT IN ('Monthly','Quarterly_QRMP') THEN RAISE EXCEPTION 'INVALID_FILING_FREQUENCY'; END IF;
  IF v_gstin IS NOT NULL AND v_gstin !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' THEN RAISE EXCEPTION 'INVALID_GSTIN_FORMAT'; END IF;
  IF v_state IS NOT NULL AND v_state !~ '^[0-9]{2}$' THEN RAISE EXCEPTION 'INVALID_STATE_CODE'; END IF;
  IF v_gstin IS NOT NULL AND v_state IS NOT NULL AND substring(v_gstin FROM 1 FOR 2) <> v_state THEN RAISE EXCEPTION 'GSTIN_STATE_CODE_MISMATCH'; END IF;  -- P13
  IF p_registration_date IS NOT NULL AND p_cancellation_date IS NOT NULL AND p_cancellation_date < p_registration_date THEN RAISE EXCEPTION 'CANCELLATION_BEFORE_REGISTRATION'; END IF;

  UPDATE public.client_registrations SET
    reg_type=coalesce(v_reg_type,reg_type), jurisdiction=coalesce(v_jur,jurisdiction),
    reg_number=nullif(btrim(p_reg_number),''), status=coalesce(nullif(btrim(p_status),''),status),
    effective_from=p_effective_from, effective_to=p_effective_to, registered_on=p_registered_on,
    row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING client_id, row_version, upper(btrim(reg_type)) INTO v_client, v_hdr_rv, v_final_reg_type;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.client_registrations WHERE id=p_id) THEN RAISE EXCEPTION 'STALE_ROW_VERSION';
    ELSE RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  END IF;
  -- P14: the (post-update) header must be IN_GST to carry/receive a GST detail.
  IF v_final_reg_type IS DISTINCT FROM 'IN_GST' THEN RAISE EXCEPTION 'GST_HEADER_TYPE_MISMATCH'; END IF;

  v_gst_exists := EXISTS (SELECT 1 FROM public.gst_registration_details WHERE registration_id = p_id);
  IF v_gst_exists THEN
    IF p_gst_expected_row_version IS NULL THEN RAISE EXCEPTION 'GST_VERSION_REQUIRED'; END IF;
    UPDATE public.gst_registration_details SET
      gstin=v_gstin, state_code=v_state, filing_frequency=p_filing_frequency, composition=coalesce(p_composition,composition),
      registration_date=p_registration_date, cancellation_date=p_cancellation_date,
      row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
    WHERE registration_id=p_id AND row_version=p_gst_expected_row_version
    RETURNING row_version INTO v_gst_rv;
    IF NOT FOUND THEN RAISE EXCEPTION 'GST_STALE_ROW_VERSION'; END IF;
    v_gst_code := 'UPDATED';
  ELSE
    INSERT INTO public.gst_registration_details
      (registration_id, gstin, state_code, filing_frequency, composition, registration_date, cancellation_date, created_by, updated_by)
    VALUES (p_id, v_gstin, v_state, p_filing_frequency, coalesce(p_composition,false), p_registration_date, p_cancellation_date, auth.uid(), auth.uid())
    RETURNING row_version INTO v_gst_rv;
    v_gst_code := 'CREATED';
  END IF;

  PERFORM public.audit_write_event('registration.updated','UPDATE','client_registrations',
            p_id::text, v_client, jsonb_build_object('change_type_code','UPDATED'));
  PERFORM public.audit_write_event('gst_detail.changed',
            CASE WHEN v_gst_code='CREATED' THEN 'CREATE' ELSE 'UPDATE' END,
            'gst_registration_details', p_id::text, v_client, jsonb_build_object('change_type_code', v_gst_code));

  RETURN jsonb_build_object('header_row_version', v_hdr_rv, 'gst_row_version', v_gst_rv, 'gst_change_type_code', v_gst_code);
END $fn$;
REVOKE ALL ON FUNCTION public.client_registration_update_with_gst(uuid,integer,text,text,text,text,date,date,date,integer,text,text,text,boolean,date,date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.client_registration_update_with_gst(uuid,integer,text,text,text,text,date,date,date,integer,text,text,text,boolean,date,date) TO authenticated;


-- ===========================================================================
-- SECTION C — MANDATORY BYPASS CLOSURE (revoke direct authenticated INSERT/UPDATE)
-- ===========================================================================
DO $closure$
DECLARE t text;
  affected text[] := ARRAY['client_persons','client_identifiers','client_contacts',
                           'client_addresses','client_relationships','client_registrations',
                           'gst_registration_details'];
BEGIN
  FOREACH t IN ARRAY affected LOOP
    EXECUTE format('REVOKE INSERT, UPDATE ON public.%I FROM authenticated', t);
  END LOOP;
END
$closure$;


-- ===========================================================================
-- SECTION D — POST-CONDITIONS (roll back on any violation)
-- ===========================================================================
DO $postcheck$
DECLARE
  b _m1b_d2b_baseline%ROWTYPE;
  v_rpc text; v_oid oid; v_tab text; v_count int; v_owner name; v_approved_owner name;
  rpcs text[] := ARRAY[
    'public.client_person_create(uuid,text,text,text,text,text,text,text,text,boolean,date,date)',
    'public.client_person_update(uuid,integer,text,text,text,text,text,text,text,text,boolean,date,date)',
    'public.client_person_set_active(uuid,boolean,integer)',
    'public.client_identifier_create(uuid,text,text,date,text)',
    'public.client_identifier_update(uuid,integer,text,text,date,text)',
    'public.client_identifier_set_active(uuid,boolean,integer)',
    'public.client_contact_create(uuid,text,text,text,text,text,boolean,uuid)',
    'public.client_contact_update(uuid,integer,text,text,text,text,text,boolean,uuid)',
    'public.client_contact_set_active(uuid,boolean,integer)',
    'public.client_address_create(uuid,text,text,text,text,text,text,text,boolean,date,date)',
    'public.client_address_update(uuid,integer,text,text,text,text,text,text,text,boolean,date,date)',
    'public.client_address_set_active(uuid,boolean,integer)',
    'public.client_relationship_create(uuid,uuid,uuid,text,numeric,date,date)',
    'public.client_relationship_update(uuid,integer,uuid,uuid,text,numeric,date,date)',
    'public.client_relationship_set_active(uuid,boolean,integer)',
    'public.client_registration_create(uuid,text,text,text,text,date,date,date)',
    'public.client_registration_update(uuid,integer,text,text,text,text,date,date,date)',
    'public.client_registration_set_active(uuid,boolean,integer)',
    'public.gst_detail_create(uuid,text,text,text,boolean,date,date)',
    'public.gst_detail_update(uuid,integer,text,text,text,boolean,date,date)',
    'public.client_registration_create_with_gst(uuid,text,text,text,text,date,date,date,text,text,text,boolean,date,date)',
    'public.client_registration_update_with_gst(uuid,integer,text,text,text,text,date,date,date,integer,text,text,text,boolean,date,date)'
  ];
  tabs text[] := ARRAY['client_persons','client_identifiers','client_contacts',
                       'client_addresses','client_relationships','client_registrations',
                       'gst_registration_details'];
BEGIN
  SELECT * INTO b FROM _m1b_d2b_baseline;

  SELECT pg_get_userbyid(p.proowner) INTO v_approved_owner
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.audit_write_event(text,text,text,text,uuid,jsonb)');
  IF v_approved_owner IS NULL THEN RAISE EXCEPTION 'POST-CHECK FAILED: could not resolve approved owner.'; END IF;

  FOREACH v_rpc IN ARRAY rpcs LOOP
    v_oid := to_regprocedure(v_rpc);
    IF v_oid IS NULL THEN RAISE EXCEPTION 'POST-CHECK FAILED: RPC not created: %', v_rpc; END IF;
    SELECT pg_get_userbyid(p.proowner) INTO v_owner FROM pg_proc p WHERE p.oid = v_oid;
    IF (SELECT p.prosecdef FROM pg_proc p WHERE p.oid = v_oid) IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: not SECURITY DEFINER: %', v_rpc; END IF;
    IF (SELECT p.proconfig FROM pg_proc p WHERE p.oid = v_oid) IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, pg_temp'] THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: search_path not exact-pinned: %', v_rpc; END IF;
    IF v_owner IS DISTINCT FROM v_approved_owner THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: owner % not approved owner % for %', v_owner, v_approved_owner, v_rpc; END IF;
    IF has_function_privilege('anon', v_oid, 'EXECUTE') IS DISTINCT FROM FALSE THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: anon EXECUTE not provably denied: %', v_rpc; END IF;
    IF has_function_privilege('authenticated', v_oid, 'EXECUTE') IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: authenticated EXECUTE not granted: %', v_rpc; END IF;
    IF has_function_privilege('service_role', v_oid, 'EXECUTE') IS DISTINCT FROM FALSE THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: service_role EXECUTE not denied (must not be granted): %', v_rpc; END IF;
  END LOOP;

  FOREACH v_tab IN ARRAY tabs LOOP
    IF has_table_privilege('authenticated', ('public.'||v_tab)::regclass, 'INSERT') IS DISTINCT FROM FALSE THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: authenticated still has INSERT on %', v_tab; END IF;
    IF has_table_privilege('authenticated', ('public.'||v_tab)::regclass, 'UPDATE') IS DISTINCT FROM FALSE THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: authenticated still has UPDATE on %', v_tab; END IF;
    IF has_table_privilege('authenticated', ('public.'||v_tab)::regclass, 'SELECT') IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: authenticated lost SELECT on %', v_tab; END IF;
  END LOOP;

  IF (SELECT count(*) FROM public.audit_log) <> b.audit_log_rows
     OR (SELECT count(*) FROM public.clients) <> b.clients_rows
     OR (SELECT count(*) FROM public.client_persons) <> b.persons_rows
     OR (SELECT count(*) FROM public.client_identifiers) <> b.identifiers_rows
     OR (SELECT count(*) FROM public.client_contacts) <> b.contacts_rows
     OR (SELECT count(*) FROM public.client_addresses) <> b.addresses_rows
     OR (SELECT count(*) FROM public.client_relationships) <> b.relationships_rows
     OR (SELECT count(*) FROM public.client_registrations) <> b.registrations_rows
     OR (SELECT count(*) FROM public.gst_registration_details) <> b.gst_rows THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: a client-master or audit_log row count changed (D2b writes no data).';
  END IF;
  IF (SELECT count(*) FROM public.accounting_tracker) <> b.accounting_tracker
     OR (SELECT count(*) FROM public.financials_tracker) <> b.financials_tracker
     OR (SELECT count(*) FROM public.income_tax_tracker) <> b.income_tax_tracker
     OR (SELECT count(*) FROM public.compliance_calendar) <> b.compliance_calendar THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: a tracker/calendar row count changed.';
  END IF;

  SELECT count(*) INTO v_count FROM unnest(rpcs) r WHERE to_regprocedure(r) IS NOT NULL;
  RAISE NOTICE '=== M1-B D2b Rev 2 COMPLETE ===';
  RAISE NOTICE 'RPCs created: % / 22 · SECURITY DEFINER, owner %, search_path pinned, anon+service_role EXECUTE denied, authenticated granted.', v_count, v_approved_owner;
  RAISE NOTICE 'Bypass closure: authenticated INSERT/UPDATE revoked on 7 base tables; SELECT retained.';
  RAISE NOTICE 'No data/audit rows changed. audit_log rows: %', b.audit_log_rows;
END
$postcheck$;

COMMIT;
