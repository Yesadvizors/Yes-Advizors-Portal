-- ============================================================================
--  YAV2 — P5 — PG-1 (Migration 0022) — PRE-EXECUTION VERIFICATION (READ-ONLY)
--
--  READ-ONLY. Every statement is a SELECT. No DML, no DDL, no temp tables, no writes.
--  Run by PJ on V2/yav2-dev BEFORE applying 0022. Each check returns a `pass` boolean;
--  the BASELINE query returns current protected counts for PJ to RECORD and later
--  compare against the post-execution baseline. Target V2 ONLY (ogjrwemjefvccpyjwxuo).
--
--  Authorisation gate: AUTHORISATION_applicability_zero.pass MUST be true.
--  Proceed to apply 0022 only when every `pass` below is true.
-- ============================================================================

-- P0 — Migration 0021 objects exist -----------------------------------------
SELECT 'p0_0021_tables_exist' AS check,
       (to_regclass('public.service_catalogue') IS NOT NULL
        AND to_regclass('public.client_service_applicability') IS NOT NULL) AS pass;

-- P1 — the three 0021 RPCs exist at EXACT signatures, exactly once each ------
SELECT 'p1_rpc_create_sig'  AS check, to_regprocedure('public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)')  IS NOT NULL AS pass;
SELECT 'p1_rpc_update_sig'  AS check, to_regprocedure('public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)') IS NOT NULL AS pass;
SELECT 'p1_rpc_status_sig'  AS check, to_regprocedure('public.service_applicability_set_status(uuid,integer,text,date)')                IS NOT NULL AS pass;
SELECT 'p1_rpc_no_overloads' AS check,
       (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname IN
          ('service_applicability_create','service_applicability_update','service_applicability_set_status')) AS rpc_count,
       (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname IN
          ('service_applicability_create','service_applicability_update','service_applicability_set_status')) = 3 AS pass;

-- P2 — PG-1 constraint is ABSENT (not yet applied / not rerun) ---------------
SELECT 'p2_pg1_constraint_absent' AS check,
       NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='csa_other_notes_required_chk') AS pass;

-- P3 — catalogue contains an ACTIVE OTHER code ------------------------------
SELECT 'p3_catalogue_other_active' AS check,
       EXISTS (SELECT 1 FROM public.service_catalogue WHERE code='OTHER' AND is_active) AS pass;

-- P4 — NO unexpected applicability writer (only the 3 known RPCs) -------------
SELECT 'p4_no_unexpected_writer' AS check,
       coalesce(string_agg(p.proname, ', '), '(none)') AS unexpected_functions,
       (count(*) = 0) AS pass
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.prosrc LIKE '%client_service_applicability%'
  AND p.proname NOT IN
    ('service_applicability_create','service_applicability_update','service_applicability_set_status');

-- P5 — RLS enabled + FORCED on both tables ----------------------------------
SELECT 'p5_rls_applicability_forced' AS check,
       (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
        WHERE oid='public.client_service_applicability'::regclass) AS pass;
SELECT 'p5_rls_catalogue_forced' AS check,
       (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
        WHERE oid='public.service_catalogue'::regclass) AS pass;

-- P6 — grant posture matches recorded 0021 posture (authenticated SELECT-only)
SELECT 'p6_grants_applicability_select_only' AS check,
       has_table_privilege('authenticated','public.client_service_applicability','SELECT') AS sel_true,
       has_table_privilege('authenticated','public.client_service_applicability','INSERT') AS ins_true,
       has_table_privilege('authenticated','public.client_service_applicability','UPDATE') AS upd_true,
       has_table_privilege('authenticated','public.client_service_applicability','DELETE') AS del_true,
       ( has_table_privilege('authenticated','public.client_service_applicability','SELECT')
         AND NOT has_table_privilege('authenticated','public.client_service_applicability','INSERT')
         AND NOT has_table_privilege('authenticated','public.client_service_applicability','UPDATE')
         AND NOT has_table_privilege('authenticated','public.client_service_applicability','DELETE') ) AS pass;
SELECT 'p6_grants_catalogue_select_only' AS check,
       ( has_table_privilege('authenticated','public.service_catalogue','SELECT')
         AND NOT has_table_privilege('authenticated','public.service_catalogue','INSERT')
         AND NOT has_table_privilege('authenticated','public.service_catalogue','UPDATE')
         AND NOT has_table_privilege('authenticated','public.service_catalogue','DELETE') ) AS pass;
-- Complete EXECUTE posture for BOTH replaced RPCs: authenticated YES; anon / service_role
-- / PUBLIC NO. Named roles via has_function_privilege; PUBLIC via the catalogue (proacl
-- IS NULL => default EXECUTE to PUBLIC; else an aclexplode grantee=0 EXECUTE entry).
SELECT 'p6_rpc_execute_posture' AS check,
       has_function_privilege('authenticated','public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)','EXECUTE')  AS auth_create,
       has_function_privilege('authenticated','public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)','EXECUTE') AS auth_update,
       has_function_privilege('anon','public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)','EXECUTE')  AS anon_create,
       has_function_privilege('anon','public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)','EXECUTE') AS anon_update,
       has_function_privilege('service_role','public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)','EXECUTE')  AS srole_create,
       has_function_privilege('service_role','public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)','EXECUTE') AS srole_update,
       (SELECT p.proacl IS NULL OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
          FROM pg_proc p WHERE p.oid='public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)'::regprocedure)  AS public_create,
       (SELECT p.proacl IS NULL OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
          FROM pg_proc p WHERE p.oid='public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)'::regprocedure) AS public_update,
       ( has_function_privilege('authenticated','public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)','EXECUTE')
         AND has_function_privilege('authenticated','public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)','EXECUTE')
         AND NOT has_function_privilege('anon','public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)','EXECUTE')
         AND NOT has_function_privilege('anon','public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)','EXECUTE')
         AND NOT has_function_privilege('service_role','public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)','EXECUTE')
         AND NOT has_function_privilege('service_role','public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)','EXECUTE')
         AND NOT (SELECT p.proacl IS NULL OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
                    FROM pg_proc p WHERE p.oid='public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)'::regprocedure)
         AND NOT (SELECT p.proacl IS NULL OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
                    FROM pg_proc p WHERE p.oid='public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)'::regprocedure) ) AS pass;

-- P7 — AUTHORISATION: applicability table is EMPTY (the only zero-row gate) ---
SELECT 'AUTHORISATION_applicability_zero' AS check,
       (SELECT count(*) FROM public.client_service_applicability) AS applicability_rows,
       (SELECT count(*) FROM public.client_service_applicability) = 0 AS pass;

-- P8 — PRE-EXECUTION BASELINE (RECORD these values; compare post-execution) ---
--      Current live values captured here; NOT hard-coded expectations.
SELECT 'PG1_PRE_BASELINE' AS label,
  (SELECT count(*) FROM public.client_service_applicability)            AS applicability_rows,
  (SELECT count(*) FROM public.service_catalogue)                       AS catalogue_rows,
  (SELECT count(*) FROM public.clients)                                 AS clients_rows,
  (SELECT coalesce(sum(CASE WHEN jsonb_typeof(services)='array'
                            THEN jsonb_array_length(services) ELSE 0 END),0)
     FROM public.clients)                                               AS clients_services_elems,
  (SELECT count(*) FROM public.client_registrations)                    AS registrations_rows,
  (SELECT count(*) FROM public.audit_log)                              AS audit_log_rows,
  (SELECT count(*) FROM public.audit_event_contract)                   AS audit_contract_rows,
  (SELECT count(*) FROM public.accounting_tracker)                     AS accounting_tracker,
  (SELECT count(*) FROM public.financials_tracker)                     AS financials_tracker,
  (SELECT count(*) FROM public.income_tax_tracker)                     AS income_tax_tracker,
  (SELECT count(*) FROM public.compliance_calendar)                    AS compliance_calendar;
-- ============================================================================
--  END PRE-EXECUTION VERIFICATION (READ-ONLY). Apply 0022 only if every pass=true.
-- ============================================================================
