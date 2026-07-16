-- ============================================================================
--  0015_m1a_client_master_foundation.sql
--
--  YAV2 Portal V2 — Module 1 (Client Master) — M1-A additive schema & security.
--
--  TARGET   : V2 / yav2-dev ONLY — Supabase project ref ogjrwemjefvccpyjwxuo
--  BASIS    : Technical Design v1.1 + M1-A0 Diagnostics + ChatGPT M1-A Release v1.1
--  NUMBER   : 0015.  0012 = secure-docs (live).  0013 = RESERVED (R3).  0014 = FY repair.
--
--  ⚠ CONFIRM THE PROJECT. Refuses to run without:
--        SET yav2.confirm_project = 'ogjrwemjefvccpyjwxuo';
--
--  STRICTLY ADDITIVE. This migration:
--    * creates NEW tables only (uuid PK, uuid client FK -> clients.id);
--    * enables + FORCES RLS with command-specific policies; no anon access;
--    * adds additive audit_event_contract rows (ON CONFLICT DO NOTHING);
--    * seeds a NEW entity_type_catalogue reference table.
--
--  It does NOT: drop/alter any legacy column; change any client status; touch any
--  tracker/financial/compliance_calendar row; generate compliance; alter migration
--  0014 or its functions; alter existing audit events; modify clients.directors jsonb;
--  rewrite text-keyed tables; or allocate/regenerate client codes.
--
--  ONE transaction. Post-conditions assert the client and tracker row counts are
--  unchanged and roll everything back on any violation.
-- ============================================================================

\set ON_ERROR_STOP on

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
      E'STOP: project not confirmed.\n'
       'Run:  SET yav2.confirm_project = ''ogjrwemjefvccpyjwxuo'';\n'
       'This migration is for V2 / yav2-dev ONLY.';
  END IF;

  -- Roles required by SECTION 8 (explicit REVOKE targets).
  SELECT string_agg(r, ', ') INTO v_missing
  FROM unnest(ARRAY['anon','authenticated','service_role']) AS r
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: expected Supabase role(s) missing: %', v_missing;
  END IF;

  -- Dependencies we read/extend.
  SELECT string_agg(t, ', ') INTO v_missing
  FROM unnest(ARRAY['clients','audit_event_contract','audit_validate_event']) AS t
  WHERE to_regclass('public.'||t) IS NULL
    AND NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                     WHERE n.nspname='public' AND p.proname=t);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: expected dependency missing: %', v_missing;
  END IF;

  -- Additive guard: none of the new tables may already exist.
  SELECT string_agg(t, ', ') INTO v_exists
  FROM unnest(ARRAY['entity_type_catalogue','client_persons','client_registrations',
                    'gst_registration_details','client_identifiers','client_contacts',
                    'client_addresses','client_relationships','client_remediation_flags']) AS t
  WHERE to_regclass('public.'||t) IS NOT NULL;
  IF v_exists IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: table(s) already exist (not additive): %', v_exists;
  END IF;

  RAISE NOTICE 'M1-A preconditions passed.';
END
$precheck$;

-- Capture baseline counts for the post-condition (start == end within the txn).
CREATE TEMP TABLE _m1a_baseline ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM public.clients)                                          AS clients_all,
  (SELECT count(*) FROM public.clients WHERE status='Active' AND coalesce(is_draft,false)=false) AS clients_active,
  (SELECT count(*) FROM public.accounting_tracker)                              AS accounting_tracker,
  (SELECT count(*) FROM public.financials_tracker)                             AS financials_tracker,
  (SELECT count(*) FROM public.income_tax_tracker)                             AS income_tax_tracker,
  (SELECT count(*) FROM public.compliance_calendar)                            AS compliance_calendar;


-- ---------------------------------------------------------------------------
-- SECTION 1 — entity_type_catalogue (reference; prepares entity support, G)
--   Seeded with the 11 approved types. Does NOT constrain or update
--   clients.client_type (no mass-update; grandfathering preserved).
-- ---------------------------------------------------------------------------
CREATE TABLE public.entity_type_catalogue (
  code        text PRIMARY KEY,
  label       text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.entity_type_catalogue (code, label, sort_order) VALUES
  ('INDIVIDUAL',        'Individual',              10),
  ('PROPRIETORSHIP',    'Proprietorship',          20),
  ('PARTNERSHIP_FIRM',  'Partnership Firm',        30),
  ('LLP',               'LLP',                     40),
  ('PVT_LTD',           'Private Limited Company', 50),
  ('PUB_LTD',           'Public Limited Company',  60),
  ('SECTION_8',         'Section 8 Company',       70),
  ('HUF',               'HUF',                     80),
  ('TRUST',             'Trust',                   90),
  ('SOCIETY',           'Society',                100),
  ('OTHER',             'Other',                  110);


-- ---------------------------------------------------------------------------
-- SECTION 2 — client_persons (canonical, UUID-keyed; legacy jsonb untouched)
--   Aadhaar: NO digits, NO new last-four. Verification metadata only (F).
-- ---------------------------------------------------------------------------
CREATE TABLE public.client_persons (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  person_type   text NOT NULL DEFAULT 'Director',   -- Director|Partner|Proprietor|Trustee|Member|Karta|Authorised Signatory|Other
  full_name     text NOT NULL,
  designation   text,
  pan           text,                                -- masked at app layer; format-validated by RPC (M1-B), not a hard DB check
  din           text,
  mobile        text,
  email         text,
  nationality   text DEFAULT 'Indian',
  is_primary_contact boolean NOT NULL DEFAULT false,
  appointment_date date,
  cessation_date   date,
  -- Aadhaar VERIFICATION metadata only (no digits, no last-four here):
  aadhaar_verification_status text NOT NULL DEFAULT 'Not Provided'
      CHECK (aadhaar_verification_status IN ('Not Provided','Masked Only','Verified','Exception')),
  aadhaar_evidence_ref        text,                  -- secure-docs path; never digits
  aadhaar_verified_by         uuid,
  aadhaar_verified_at         timestamptz,
  aadhaar_exception_reason    text,
  aadhaar_exception_approved_by uuid,
  aadhaar_exception_approved_at timestamptz,
  is_active     boolean NOT NULL DEFAULT true,
  row_version   integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid
);
CREATE INDEX idx_client_persons_client   ON public.client_persons (client_id);
CREATE INDEX idx_client_persons_active   ON public.client_persons (client_id) WHERE is_active;
COMMENT ON TABLE public.client_persons IS
  'M1-A canonical UUID-keyed person record. Legacy clients.directors jsonb + client_directors(text) are NOT migrated here in M1-A. No Aadhaar digits/last-four; verification metadata only.';


-- ---------------------------------------------------------------------------
-- SECTION 3 — client_registrations (jurisdiction-neutral header) + GST detail
-- ---------------------------------------------------------------------------
CREATE TABLE public.client_registrations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  reg_type       text NOT NULL,       -- IN_GST | AE_VAT | AE_CT | LICENCE | OTHER
  jurisdiction   text NOT NULL DEFAULT 'IN',
  reg_number     text,
  status         text NOT NULL DEFAULT 'Active'
      CHECK (status IN ('Applied','Active','Suspended','Cancelled')),
  effective_from date,
  effective_to   date,
  registered_on  date,
  is_active      boolean NOT NULL DEFAULT true,
  row_version    integer NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid,
  CONSTRAINT client_registrations_uq UNIQUE (client_id, reg_type, reg_number)
);
CREATE INDEX idx_client_registrations_client ON public.client_registrations (client_id);
CREATE INDEX idx_client_registrations_type   ON public.client_registrations (reg_type);

CREATE TABLE public.gst_registration_details (
  registration_id  uuid PRIMARY KEY REFERENCES public.client_registrations(id) ON DELETE CASCADE,
  gstin            text,
  state_code       text,
  filing_frequency text CHECK (filing_frequency IN ('Monthly','Quarterly_QRMP')),
  composition      boolean NOT NULL DEFAULT false,
  registration_date date,
  cancellation_date date,
  row_version      integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid
);
-- gst_registration_details CASCADEs from its header only (a 1:1 typed detail),
-- not from clients; the header itself is ON DELETE RESTRICT to clients.


-- ---------------------------------------------------------------------------
-- SECTION 4 — client_identifiers (normalised; legacy clients columns untouched)
-- ---------------------------------------------------------------------------
CREATE TABLE public.client_identifiers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  id_type     text NOT NULL,     -- CIN | LLPIN | TAN | UDYAM | IEC | PF | ESI | OTHER
  id_value    text NOT NULL,
  issued_on   date,
  status      text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  is_active   boolean NOT NULL DEFAULT true,
  row_version integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid,
  CONSTRAINT client_identifiers_uq UNIQUE (client_id, id_type, id_value)
);
CREATE INDEX idx_client_identifiers_client ON public.client_identifiers (client_id);
CREATE INDEX idx_client_identifiers_type   ON public.client_identifiers (id_type);


-- ---------------------------------------------------------------------------
-- SECTION 5 — contacts / addresses / relationships
-- ---------------------------------------------------------------------------
CREATE TABLE public.client_contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  contact_type  text NOT NULL DEFAULT 'Primary',   -- Primary|Accounts|Authorised Signatory|Director/Partner|Other
  person_name   text,
  designation   text,
  email         text,
  phone         text,
  is_primary    boolean NOT NULL DEFAULT false,
  linked_person_id uuid REFERENCES public.client_persons(id) ON DELETE SET NULL,
  is_active     boolean NOT NULL DEFAULT true,
  row_version   integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid
);
CREATE INDEX idx_client_contacts_client ON public.client_contacts (client_id);

CREATE TABLE public.client_addresses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  address_type  text NOT NULL DEFAULT 'Registered', -- Registered|Principal Place of Business|Correspondence|Branch
  line1         text, line2 text, city text, state text,
  country       text DEFAULT 'India', pincode text,
  is_primary    boolean NOT NULL DEFAULT false,
  effective_from date, effective_to date,
  is_active     boolean NOT NULL DEFAULT true,
  row_version   integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid
);
CREATE INDEX idx_client_addresses_client ON public.client_addresses (client_id);

CREATE TABLE public.client_relationships (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  related_client_id  uuid REFERENCES public.clients(id) ON DELETE RESTRICT,
  related_person_id  uuid REFERENCES public.client_persons(id) ON DELETE RESTRICT,
  relationship_type  text NOT NULL,   -- Holding|Subsidiary|Group|Partner|Proprietor|Director|KMP
  ownership_pct      numeric(5,2),
  effective_from     date, effective_to date,
  is_active          boolean NOT NULL DEFAULT true,
  row_version        integer NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid,
  CONSTRAINT client_relationships_target_chk
    CHECK (related_client_id IS NOT NULL OR related_person_id IS NOT NULL)
);
CREATE INDEX idx_client_relationships_client ON public.client_relationships (client_id);


-- ---------------------------------------------------------------------------
-- SECTION 6 — client_remediation_flags (grandfathering support, C)
-- ---------------------------------------------------------------------------
CREATE TABLE public.client_remediation_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  flag_type   text NOT NULL,    -- MISSING_INCORP_DATE | MALFORMED_PAN | UNMAPPED_ENTITY_TYPE | DUP_IDENTIFIER | LEGACY_JSONB_DIRECTORS | GSTIN_NOT_MIGRATED | ...
  severity    text NOT NULL DEFAULT 'warn' CHECK (severity IN ('info','warn','block-on-edit')),
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid,
  resolved_by uuid,
  resolved_at timestamptz
);
CREATE INDEX idx_remediation_client   ON public.client_remediation_flags (client_id);
CREATE INDEX idx_remediation_open     ON public.client_remediation_flags (client_id) WHERE NOT resolved;


-- ---------------------------------------------------------------------------
-- SECTION 7 — RLS (enable + FORCE) with command-specific policies
--   SELECT: any active user.  INSERT/UPDATE: Admin/Manager only (M1-A conservative;
--   assigned-staff writes deferred to M1-B).  No DELETE policy => physical delete
--   denied (soft-delete via is_active).  Reference catalogue: read-all, admin-write.
-- ---------------------------------------------------------------------------
DO $rls$
DECLARE
  t text;
  master text[] := ARRAY['client_persons','client_registrations','gst_registration_details',
                         'client_identifiers','client_contacts','client_addresses',
                         'client_relationships','client_remediation_flags'];
BEGIN
  FOREACH t IN ARRAY master LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);

    EXECUTE format($p$CREATE POLICY %1$s_select ON public.%1$I
      FOR SELECT TO authenticated USING (public.is_active_user())$p$, t);

    EXECUTE format($p$CREATE POLICY %1$s_insert ON public.%1$I
      FOR INSERT TO authenticated WITH CHECK (public.is_active_user() AND public.is_admin_or_manager())$p$, t);

    EXECUTE format($p$CREATE POLICY %1$s_update ON public.%1$I
      FOR UPDATE TO authenticated
      USING (public.is_active_user() AND public.is_admin_or_manager())
      WITH CHECK (public.is_active_user() AND public.is_admin_or_manager())$p$, t);
    -- No DELETE policy: physical deletion is denied by default.
  END LOOP;
END
$rls$;

-- Reference catalogue: readable by all active users, writable by Admin/Manager.
ALTER TABLE public.entity_type_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_type_catalogue FORCE ROW LEVEL SECURITY;
CREATE POLICY entity_type_catalogue_select ON public.entity_type_catalogue
  FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY entity_type_catalogue_write ON public.entity_type_catalogue
  FOR ALL TO authenticated
  USING (public.is_active_user() AND public.is_admin_or_manager())
  WITH CHECK (public.is_active_user() AND public.is_admin_or_manager());


-- ---------------------------------------------------------------------------
-- SECTION 8 — PRIVILEGES (no anon; least privilege; no DELETE grant)
-- ---------------------------------------------------------------------------
DO $grants$
DECLARE
  t text;
  all_new text[] := ARRAY['entity_type_catalogue','client_persons','client_registrations',
                          'gst_registration_details','client_identifiers','client_contacts',
                          'client_addresses','client_relationships','client_remediation_flags'];
BEGIN
  FOREACH t IN ARRAY all_new LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', t);
    -- RLS gates the rows; grant only the DML the app needs (no DELETE).
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO authenticated', t);
    -- service_role retained (backend/admin tooling) — matches existing convention.
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO service_role', t);
  END LOOP;
END
$grants$;
-- NOTE: this migration creates NO functions, so there is no new function EXECUTE to
-- revoke from anon. The standing schema-wide ALTER DEFAULT PRIVILEGES (which would grant
-- future functions to anon) is unchanged; any M1-B function MUST REVOKE explicitly.


-- ---------------------------------------------------------------------------
-- SECTION 9 — AUDIT CONTRACT (additive rows only; existing rows untouched)
--   Metadata keys are drawn ONLY from the existing audit_field_format_ok whitelist,
--   because that function returns FALSE for any unknown key (fail-closed). Extending
--   the whitelist is out of M1-A scope. ON CONFLICT DO NOTHING => cannot alter
--   audit.log.read_requested / read_completed or any existing event.
-- ---------------------------------------------------------------------------
INSERT INTO public.audit_event_contract
  (event_name, risk_tier, sensitivity, required_keys, optional_keys, allow_empty_metadata,
   client_requirement, target_user_requirement, permitted_actor_types, permitted_actions,
   permitted_resource_types)
VALUES
  ('client.created','MEDIUM','S2', ARRAY['change_type_code'], ARRAY['table_name','record_count'],
     false,'required','prohibited', ARRAY['user'], ARRAY['create'], ARRAY['client']),
  ('client.updated','MEDIUM','S2', ARRAY['change_type_code'], ARRAY['setting_name_code','old_value_code','new_value_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['update'], ARRAY['client']),
  ('client.status_transition','MEDIUM','S2', ARRAY['old_value_code','new_value_code'], ARRAY['change_reason_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['transition'], ARRAY['client']),
  ('client.duplicate_override','HIGH','S3', ARRAY['change_reason_code'], ARRAY['record_count','detection_method_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['override'], ARRAY['client']),
  ('registration.added','MEDIUM','S2', ARRAY['change_type_code'], ARRAY['table_name'],
     false,'required','prohibited', ARRAY['user'], ARRAY['create'], ARRAY['registration']),
  ('registration.updated','MEDIUM','S2', ARRAY['change_type_code'], ARRAY['setting_name_code','old_value_code','new_value_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['update'], ARRAY['registration']),
  ('identifier.added','MEDIUM','S2', ARRAY['change_type_code'], ARRAY['table_name'],
     false,'required','prohibited', ARRAY['user'], ARRAY['create'], ARRAY['identifier']),
  ('person.kyc_verified','HIGH','S4', ARRAY['completion_status_code'], ARRAY['access_method_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['verify'], ARRAY['person']),
  ('person.kyc_exception_approved','CRITICAL','S4', ARRAY['change_reason_code'], ARRAY['new_value_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['approve'], ARRAY['person']),
  ('document.signed_url_issued','HIGH','S3', ARRAY['requested_operation_code'], ARRAY['document_count','download_channel_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['issue'], ARRAY['document']),
  ('document.verified','MEDIUM','S2', ARRAY['completion_status_code'], ARRAY['document_count'],
     false,'required','prohibited', ARRAY['user'], ARRAY['verify'], ARRAY['document']),
  ('remediation.resolved','LOW','S1', ARRAY['change_reason_code'], ARRAY['table_name','record_count'],
     false,'required','prohibited', ARRAY['user'], ARRAY['resolve'], ARRAY['remediation'])
ON CONFLICT (event_name) DO NOTHING;


-- ---------------------------------------------------------------------------
-- SECTION 10 — POST-CONDITIONS (roll back on any violation)
-- ---------------------------------------------------------------------------
DO $postcheck$
DECLARE
  b _m1a_baseline%ROWTYPE;
  v_new_tables int;
  v_added_contract int;
BEGIN
  SELECT * INTO b FROM _m1a_baseline;

  -- Additive: NONE of the pre-existing counts may change.
  IF (SELECT count(*) FROM public.clients) <> b.clients_all
     OR (SELECT count(*) FROM public.clients WHERE status='Active' AND coalesce(is_draft,false)=false) <> b.clients_active THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: client counts changed (was all=% active=%).', b.clients_all, b.clients_active;
  END IF;
  IF (SELECT count(*) FROM public.accounting_tracker)  <> b.accounting_tracker
     OR (SELECT count(*) FROM public.financials_tracker) <> b.financials_tracker
     OR (SELECT count(*) FROM public.income_tax_tracker) <> b.income_tax_tracker
     OR (SELECT count(*) FROM public.compliance_calendar) <> b.compliance_calendar THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: a tracker/calendar row count changed. Migration must be additive.';
  END IF;

  -- All 9 new tables must exist.
  SELECT count(*) INTO v_new_tables
  FROM unnest(ARRAY['entity_type_catalogue','client_persons','client_registrations',
                    'gst_registration_details','client_identifiers','client_contacts',
                    'client_addresses','client_relationships','client_remediation_flags']) AS t
  WHERE to_regclass('public.'||t) IS NOT NULL;
  IF v_new_tables <> 9 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: expected 9 new tables, found %.', v_new_tables;
  END IF;

  SELECT count(*) INTO v_added_contract FROM public.audit_event_contract
  WHERE event_name IN ('client.created','client.updated','client.status_transition',
    'client.duplicate_override','registration.added','registration.updated','identifier.added',
    'person.kyc_verified','person.kyc_exception_approved','document.signed_url_issued',
    'document.verified','remediation.resolved');
  IF v_added_contract <> 12 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: expected 12 M1-A audit events, found %.', v_added_contract;
  END IF;

  -- SECURITY SELF-VERIFICATION (fail-closed): every new table must have RLS enabled
  -- AND forced, and anon must hold NO table privilege of any kind.
  DECLARE
    tt text;
    all_new text[] := ARRAY['entity_type_catalogue','client_persons','client_registrations',
                            'gst_registration_details','client_identifiers','client_contacts',
                            'client_addresses','client_relationships','client_remediation_flags'];
    priv text;
  BEGIN
    FOREACH tt IN ARRAY all_new LOOP
      IF NOT (SELECT relrowsecurity AND relforcerowsecurity
              FROM pg_class WHERE oid = ('public.'||tt)::regclass) THEN
        RAISE EXCEPTION 'POST-CHECK FAILED: RLS not enabled+forced on %.', tt;
      END IF;
      FOREACH priv IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
        IF has_table_privilege('anon', ('public.'||tt)::regclass, priv) THEN
          RAISE EXCEPTION 'POST-CHECK FAILED: anon has % on %.', priv, tt;
        END IF;
      END LOOP;
      -- authenticated must be able to attempt SELECT/INSERT/UPDATE (RLS then gates rows).
      IF NOT has_table_privilege('authenticated', ('public.'||tt)::regclass, 'SELECT') THEN
        RAISE EXCEPTION 'POST-CHECK FAILED: authenticated cannot SELECT %.', tt;
      END IF;
    END LOOP;
  END;

  RAISE NOTICE '=== M1-A COMPLETE ===';
  RAISE NOTICE 'clients: all=% active=% (unchanged)', b.clients_all, b.clients_active;
  RAISE NOTICE 'trackers unchanged: accounting=% financials=% income_tax=% calendar=%',
    b.accounting_tracker, b.financials_tracker, b.income_tax_tracker, b.compliance_calendar;
  RAISE NOTICE 'new tables: 9 · audit contract events present: %', v_added_contract;
END
$postcheck$;

COMMIT;
