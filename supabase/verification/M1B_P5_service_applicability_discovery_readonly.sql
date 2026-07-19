-- ============================================================================
--  YAV2 — M1-B P5 — SERVICE-APPLICABILITY DISCOVERY (READ-ONLY)
--
--  STATUS: DRAFT / NOT EXECUTED. READ-ONLY — every statement begins with SELECT or
--          WITH; there are ZERO writes (no INSERT/UPDATE/DELETE/MERGE/DDL/GRANT/
--          REVOKE/function creation). Discovery/design only — NO table/RPC/row is
--          created; NO compliance is generated.
--
--  Target : V2 / yav2-dev ONLY — project ref ogjrwemjefvccpyjwxuo. If any other
--           project (V1/Production zcszesuvjrryxtigjglt), STOP — do not run.
--
--  Purpose: let PJ confirm, live and read-only, the P5 design assumptions BEFORE any
--           migration is authored: (a) NO service-applicability table/RPC exists;
--           (b) the legacy clients.services JSONB shape (counts only); (c) reusable
--           catalogue/helper/audit infrastructure is present.
--
--  OUTPUT DISCIPLINE — AGGREGATE COUNTS + BOOLEAN/CATALOGUE/SCHEMA METADATA ONLY.
--  NEVER emits client UUIDs, names, PAN/GSTIN/CIN/TAN, mobile, email, Aadhaar, or
--  raw JSON. reg_type / catalogue codes are non-personal category labels.
--
--  Production-eligibility predicate (identical to D4), used for the legacy-services
--  scope split:
--        coalesce(is_test_client,false)=false
--    AND coalesce(is_draft,false)=false
--    AND coalesce(status,'')='Active'
-- ============================================================================

-- ---- P5-DISC-01: absence of any service-applicability table ----------------
SELECT jsonb_pretty(jsonb_build_object(
  'client_service_applicability_exists', (to_regclass('public.client_service_applicability') IS NOT NULL),
  'service_applicability_exists',        (to_regclass('public.service_applicability') IS NOT NULL),
  'client_services_table_exists',        (to_regclass('public.client_services') IS NOT NULL),
  'service_catalogue_exists',            (to_regclass('public.service_catalogue') IS NOT NULL),
  'PASS_no_preexisting_service_table',
     (to_regclass('public.client_service_applicability') IS NULL
      AND to_regclass('public.service_applicability') IS NULL
      AND to_regclass('public.client_services') IS NULL
      AND to_regclass('public.service_catalogue') IS NULL)
)) AS p5_disc_01_no_service_table;


-- ---- P5-DISC-02: service-RPC landscape (legacy generators noted, not reused) --
SELECT jsonb_pretty(jsonb_build_object(
  'service_applicability_named_functions',
     (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND (p.proname ILIKE '%service_applicab%' OR p.proname ILIKE '%applicab%')),
  'legacy_activate_accounting_service_present',
     (to_regprocedure('public.activate_accounting_service(uuid,character varying)') IS NOT NULL),
  'legacy_generate_client_compliance_present',
     (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname ILIKE '%generate_client_compliance%'),
  'note', 'Legacy generators COUPLE activation with compliance generation; P5 supersedes (does not call) them. Name-only checks — not a proof of absence of a differently-named writer.'
)) AS p5_disc_02_rpc_landscape;


-- ---- P5-DISC-03: legacy clients.services JSONB shape (counts only) ----------
--  CASE guard (NOT reliant on AND short-circuit): jsonb_array_length is only called
--  when the value is a JSON array. Current data is PJ-confirmed sample/testing data.
WITH b AS (
  SELECT
    CASE WHEN jsonb_typeof(services) = 'array'
         THEN jsonb_array_length(services) > 0
         ELSE false END AS nonempty,
    CASE WHEN jsonb_typeof(services) = 'array'
         THEN jsonb_array_length(services)
         ELSE 0 END AS n_elem,
    (coalesce(is_test_client,false)=false AND coalesce(is_draft,false)=false AND coalesce(status,'')='Active') AS prod_elig
  FROM public.clients
)
SELECT jsonb_pretty(jsonb_build_object(
  'clients_all_current',                             (SELECT count(*) FROM b),
  'nonempty_services_all_current',                   (SELECT count(*) FROM b WHERE nonempty),
  'nonempty_services_production_eligible',           (SELECT count(*) FROM b WHERE nonempty AND prod_elig),
  'nonempty_services_sample_test_draft_or_inactive', (SELECT count(*) FROM b WHERE nonempty AND NOT prod_elig),
  'total_service_elements_all_current',              (SELECT coalesce(sum(n_elem),0) FROM b),
  'PASS_scope_reconciliation',
     ((SELECT count(*) FROM b WHERE nonempty)
      = (SELECT count(*) FROM b WHERE nonempty AND prod_elig) + (SELECT count(*) FROM b WHERE nonempty AND NOT prod_elig))
)) AS p5_disc_03_legacy_services_jsonb;


-- ---- P5-DISC-04: owner/assignee source (team) counts -----------------------
SELECT jsonb_pretty(jsonb_build_object(
  'team_all',            (SELECT count(*) FROM public.team),
  'team_active',         (SELECT count(*) FROM public.team WHERE coalesce(is_active,false)=true),
  'team_with_auth_user', (SELECT count(*) FROM public.team WHERE auth_user_id IS NOT NULL)
)) AS p5_disc_04_team;


-- ---- P5-DISC-05: registration linkage source counts by type (category only) --
SELECT reg_type, count(*) AS n
FROM public.client_registrations
GROUP BY reg_type
ORDER BY reg_type;


-- ---- P5-DISC-06: reusable infrastructure presence --------------------------
SELECT jsonb_pretty(jsonb_build_object(
  'entity_type_catalogue_present', (to_regclass('public.entity_type_catalogue') IS NOT NULL),
  'entity_type_catalogue_rows',    (SELECT count(*) FROM public.entity_type_catalogue),
  'is_active_user_present',        (to_regprocedure('public.is_active_user()') IS NOT NULL),
  'is_admin_or_manager_present',   (to_regprocedure('public.is_admin_or_manager()') IS NOT NULL),
  'audit_write_event_present',
     (to_regprocedure('public.audit_write_event(text,text,text,text,uuid,jsonb)') IS NOT NULL),
  'client_registrations_present',  (to_regclass('public.client_registrations') IS NOT NULL),
  'financial_years_present',       (to_regclass('public.financial_years') IS NOT NULL),
  'gen_random_uuid_present',       (to_regprocedure('pg_catalog.gen_random_uuid()') IS NOT NULL),
  -- composite same-client FK (design §3.3-C) needs a UNIQUE(id, client_id) on
  -- client_registrations; expected ABSENT today (only PK on id) => additive later.
  'client_registrations_id_client_unique_present',
     (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename='client_registrations'
        AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%(id, client_id)%')
)) AS p5_disc_06_reusable_infra;


-- ---- P5-DISC-07: clients + legacy services column metadata -----------------
SELECT jsonb_pretty(jsonb_build_object(
  'clients_rows',            (SELECT count(*) FROM public.clients),
  'clients_services_column', (SELECT data_type FROM information_schema.columns
                              WHERE table_schema='public' AND table_name='clients' AND column_name='services'),
  'clients_id_type',         (SELECT data_type FROM information_schema.columns
                              WHERE table_schema='public' AND table_name='clients' AND column_name='id')
)) AS p5_disc_07_clients_metadata;
-- ============================================================================
--  END P5 DISCOVERY (READ-ONLY / DRAFT / NOT EXECUTED). No writes. Aggregate
--  counts + catalogue/schema metadata only. No table/RPC/row/compliance created.
-- ============================================================================
