-- ============================================================================
--  YAV2 — P5 — MIGRATION 0021 PRE-EXECUTION VERIFICATION (READ-ONLY)
--
--  STATUS: DRAFT / NOT EXECUTED. READ-ONLY — every statement begins SELECT/WITH;
--          zero writes. Run IMMEDIATELY BEFORE Migration 0021, in the authorised
--          V2 SQL Editor, to (a) confirm the environment, (b) confirm 0021's
--          preconditions hold, and (c) CAPTURE the protected pre-execution snapshot
--          (PRE-6) for later manual comparison with the post-execution values (V8).
--
--  Target : V2 / yav2-dev ONLY — project ref ogjrwemjefvccpyjwxuo. If any other
--           project (V1/Production zcszesuvjrryxtigjglt), STOP — do not run.
--
--  OUTPUT: counts / booleans / catalog metadata ONLY. No personal data values.
-- ============================================================================

-- ---- PRE-0: connection / project identity (as far as safely possible) -------
--  NOTE: Supabase does not expose the project ref via SQL. This reports
--  non-sensitive connection facts ONLY. The executor MUST confirm out-of-band that
--  the connection targets V2/yav2-dev (ogjrwemjefvccpyjwxuo) and NOT V1/Production
--  (zcszesuvjrryxtigjglt) BEFORE running anything else.
SELECT jsonb_pretty(jsonb_build_object(
  'current_database', current_database(),
  'current_user',     current_user,
  'server_version',   current_setting('server_version'),
  'search_path',      current_setting('search_path'),
  'EXECUTOR_MUST_CONFIRM_PROJECT_REF_OUT_OF_BAND', 'ogjrwemjefvccpyjwxuo (V2/yav2-dev) — NOT zcszesuvjrryxtigjglt'
)) AS p5_0021_pre0_identity;

-- ---- PRE-1: required base tables exist --------------------------------------
SELECT jsonb_pretty(jsonb_build_object(
  'present',
     (SELECT count(*) FROM (VALUES
        ('clients'),('client_registrations'),('team'),('audit_log'),('audit_event_contract'),
        ('accounting_tracker'),('financials_tracker'),('income_tax_tracker'),('compliance_calendar')) AS t(n)
      WHERE to_regclass('public.'||t.n) IS NOT NULL),
  'expected', 9,
  'PASS_pre1',
     ((SELECT count(*) FROM (VALUES
        ('clients'),('client_registrations'),('team'),('audit_log'),('audit_event_contract'),
        ('accounting_tracker'),('financials_tracker'),('income_tax_tracker'),('compliance_calendar')) AS t(n)
       WHERE to_regclass('public.'||t.n) IS NOT NULL) = 9)
)) AS p5_0021_pre1_base_tables;

-- ---- PRE-2: required helper functions exist at EXACT signatures -------------
SELECT jsonb_pretty(jsonb_build_object(
  'audit_write_event',   (to_regprocedure('public.audit_write_event(text,text,text,text,uuid,jsonb)') IS NOT NULL),
  'is_active_user',      (to_regprocedure('public.is_active_user()') IS NOT NULL),
  'is_admin_or_manager', (to_regprocedure('public.is_admin_or_manager()') IS NOT NULL),
  'PASS_pre2',
     (to_regprocedure('public.audit_write_event(text,text,text,text,uuid,jsonb)') IS NOT NULL
      AND to_regprocedure('public.is_active_user()') IS NOT NULL
      AND to_regprocedure('public.is_admin_or_manager()') IS NOT NULL)
)) AS p5_0021_pre2_helpers;

-- ---- PRE-3: Migration 0021 objects do NOT already exist (additive guard) -----
SELECT jsonb_pretty(jsonb_build_object(
  'service_catalogue_exists',            (to_regclass('public.service_catalogue') IS NOT NULL),
  'client_service_applicability_exists', (to_regclass('public.client_service_applicability') IS NOT NULL),
  'rpc_create_exists',      (to_regprocedure('public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)') IS NOT NULL),
  'rpc_update_exists',      (to_regprocedure('public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)') IS NOT NULL),
  'rpc_set_status_exists',  (to_regprocedure('public.service_applicability_set_status(uuid,integer,text,date)') IS NOT NULL),
  'PASS_pre3_all_absent',
     (to_regclass('public.service_catalogue') IS NULL
      AND to_regclass('public.client_service_applicability') IS NULL
      AND to_regprocedure('public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)') IS NULL
      AND to_regprocedure('public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)') IS NULL
      AND to_regprocedure('public.service_applicability_set_status(uuid,integer,text,date)') IS NULL)
)) AS p5_0021_pre3_objects_absent;

-- ---- PRE-4: the 4 audit-event names do NOT already exist --------------------
SELECT jsonb_pretty(jsonb_build_object(
  'existing_count',
     (SELECT count(*) FROM public.audit_event_contract
      WHERE event_name IN ('service_applicability.added','service_applicability.updated',
                           'service_applicability.approved','service_applicability.deactivated')),
  'PASS_pre4_absent',
     ((SELECT count(*) FROM public.audit_event_contract
       WHERE event_name IN ('service_applicability.added','service_applicability.updated',
                            'service_applicability.approved','service_applicability.deactivated')) = 0)
)) AS p5_0021_pre4_events_absent;

-- ---- PRE-5: client_registrations_id_client_uq does NOT already exist --------
--  Scoped precisely: schema public, table client_registrations, UNIQUE (contype 'u'),
--  exact constraint name.
SELECT jsonb_pretty(jsonb_build_object(
  'existing_count',
     (SELECT count(*) FROM pg_constraint c
      JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
      WHERE n.nspname='public' AND r.relname='client_registrations'
        AND c.conname='client_registrations_id_client_uq' AND c.contype='u'),
  'PASS_pre5_absent',
     ((SELECT count(*) FROM pg_constraint c
       JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
       WHERE n.nspname='public' AND r.relname='client_registrations'
         AND c.conname='client_registrations_id_client_uq' AND c.contype='u') = 0)
)) AS p5_0021_pre5_unique_absent;

-- ---- PRE-6: PROTECTED PRE-EXECUTION SNAPSHOT (record these; compare with V8) --
--  clients.id must be uuid (authoritative key). clients.services aggregate is a
--  CASE-guarded element count (evaluation-order-safe). No personal values.
SELECT jsonb_pretty(jsonb_build_object(
  'clients_id_is_uuid',
     ((SELECT data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name='clients' AND column_name='id') = 'uuid'),
  'clients_rows',              (SELECT count(*) FROM public.clients),
  'clients_services_elems',    (SELECT coalesce(sum(CASE WHEN jsonb_typeof(services)='array'
                                                    THEN jsonb_array_length(services) ELSE 0 END),0)
                                 FROM public.clients),
  'client_registrations_rows', (SELECT count(*) FROM public.client_registrations),
  'audit_log_rows',            (SELECT count(*) FROM public.audit_log),
  'audit_event_contract_rows', (SELECT count(*) FROM public.audit_event_contract),
  'accounting_tracker',        (SELECT count(*) FROM public.accounting_tracker),
  'financials_tracker',        (SELECT count(*) FROM public.financials_tracker),
  'income_tax_tracker',        (SELECT count(*) FROM public.income_tax_tracker),
  'compliance_calendar',       (SELECT count(*) FROM public.compliance_calendar)
)) AS p5_0021_pre6_protected_snapshot;

-- ---- PRE-7: overall readiness (all gates must be true) ----------------------
SELECT jsonb_pretty(jsonb_build_object(
  'PASS_pre_execution_ready',
     ((SELECT count(*) FROM (VALUES
        ('clients'),('client_registrations'),('team'),('audit_log'),('audit_event_contract'),
        ('accounting_tracker'),('financials_tracker'),('income_tax_tracker'),('compliance_calendar')) AS t(n)
       WHERE to_regclass('public.'||t.n) IS NOT NULL) = 9
      AND to_regprocedure('public.audit_write_event(text,text,text,text,uuid,jsonb)') IS NOT NULL
      AND to_regprocedure('public.is_active_user()') IS NOT NULL
      AND to_regprocedure('public.is_admin_or_manager()') IS NOT NULL
      AND to_regclass('public.service_catalogue') IS NULL
      AND to_regclass('public.client_service_applicability') IS NULL
      AND to_regprocedure('public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)') IS NULL
      AND to_regprocedure('public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)') IS NULL
      AND to_regprocedure('public.service_applicability_set_status(uuid,integer,text,date)') IS NULL
      AND (SELECT count(*) FROM public.audit_event_contract
           WHERE event_name IN ('service_applicability.added','service_applicability.updated',
                                'service_applicability.approved','service_applicability.deactivated')) = 0
      AND (SELECT count(*) FROM pg_constraint c
           JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
           WHERE n.nspname='public' AND r.relname='client_registrations'
             AND c.conname='client_registrations_id_client_uq' AND c.contype='u') = 0
      AND (SELECT data_type FROM information_schema.columns
           WHERE table_schema='public' AND table_name='clients' AND column_name='id') = 'uuid')
)) AS p5_0021_pre7_ready;
-- ============================================================================
--  END PRE-EXECUTION VERIFICATION (READ-ONLY). No writes. If PASS_pre_execution_ready
--  is not true, DO NOT run Migration 0021 — report to ChatGPT.
-- ============================================================================
