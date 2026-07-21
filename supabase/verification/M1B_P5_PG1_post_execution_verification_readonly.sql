-- ============================================================================
--  YAV2 — P5 — PG-1 (Migration 0022) — POST-EXECUTION VERIFICATION (READ-ONLY)
--
--  READ-ONLY. Every statement is a SELECT. No DML, no DDL, no temp tables, no writes.
--  Run by PJ on V2/yav2-dev AFTER applying 0022. Confirm every `pass` is true, and
--  compare the PG1_POST_BASELINE row against the PG1_PRE_BASELINE recorded before
--  execution: applicability_rows must stay 0; catalogue/clients/registrations/
--  trackers/calendar/audit_log/audit_contract must be UNCHANGED (paired comparison).
--  Target V2 ONLY (ogjrwemjefvccpyjwxuo).
-- ============================================================================

-- V1 — PG-1 constraint now PRESENT with the intended definition --------------
--  ALWAYS returns exactly one row (scalar subqueries; no FROM). definition is NULL when
--  the constraint is absent; pass is false when absent (COALESCE) and true ONLY when the
--  constraint exists on public.client_service_applicability and its definition contains
--  both the 'OTHER' anchor and the 'btrim' rule.
SELECT 'v1_pg1_constraint_present' AS check,
  (SELECT pg_get_constraintdef(c.oid)
     FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
     JOIN pg_namespace nsp ON nsp.oid=r.relnamespace
     WHERE nsp.nspname='public' AND r.relname='client_service_applicability'
       AND c.conname='csa_other_notes_required_chk') AS definition,
  COALESCE((SELECT (pg_get_constraintdef(c.oid) ~ 'OTHER' AND pg_get_constraintdef(c.oid) ~ 'btrim')
     FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
     JOIN pg_namespace nsp ON nsp.oid=r.relnamespace
     WHERE nsp.nspname='public' AND r.relname='client_service_applicability'
       AND c.conname='csa_other_notes_required_chk'), false) AS pass;

-- V2 — the three RPCs still present at EXACT signatures (set_status untouched) -
SELECT 'v2_rpc_create_sig'  AS check, to_regprocedure('public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)')  IS NOT NULL AS pass;
SELECT 'v2_rpc_update_sig'  AS check, to_regprocedure('public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)') IS NOT NULL AS pass;
SELECT 'v2_rpc_status_sig'  AS check, to_regprocedure('public.service_applicability_set_status(uuid,integer,text,date)')                IS NOT NULL AS pass;
SELECT 'v2_rpc_no_overloads' AS check,
       (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname IN
          ('service_applicability_create','service_applicability_update','service_applicability_set_status')) = 3 AS pass;

-- V3 — create + update RPC bodies now contain the guard; set_status does NOT ---
SELECT 'v3_create_has_guard' AS check,
       (SELECT prosrc LIKE '%OTHER_NOTES_REQUIRED%' FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='service_applicability_create') AS pass;
SELECT 'v3_update_has_guard' AS check,
       (SELECT prosrc LIKE '%OTHER_NOTES_REQUIRED%' FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='service_applicability_update') AS pass;
SELECT 'v3_set_status_unchanged_no_guard' AS check,
       (SELECT prosrc NOT LIKE '%OTHER_NOTES_REQUIRED%' FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='service_applicability_set_status') AS pass;

-- V4 — grant / EXECUTE posture UNCHANGED ------------------------------------
-- Complete EXECUTE posture (unchanged by PG-1) for BOTH replaced RPCs: authenticated YES;
-- anon / service_role / PUBLIC NO. Named roles via has_function_privilege; PUBLIC via the
-- catalogue (proacl IS NULL => default EXECUTE to PUBLIC; else aclexplode grantee=0 EXECUTE).
SELECT 'v4_rpc_execute_posture' AS check,
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
SELECT 'v4_grants_applicability_select_only' AS check,
       ( has_table_privilege('authenticated','public.client_service_applicability','SELECT')
         AND NOT has_table_privilege('authenticated','public.client_service_applicability','INSERT')
         AND NOT has_table_privilege('authenticated','public.client_service_applicability','UPDATE')
         AND NOT has_table_privilege('authenticated','public.client_service_applicability','DELETE') ) AS pass;
SELECT 'v4_grants_catalogue_select_only' AS check,
       ( has_table_privilege('authenticated','public.service_catalogue','SELECT')
         AND NOT has_table_privilege('authenticated','public.service_catalogue','INSERT')
         AND NOT has_table_privilege('authenticated','public.service_catalogue','UPDATE')
         AND NOT has_table_privilege('authenticated','public.service_catalogue','DELETE') ) AS pass;

-- V5 — RLS enabled + FORCED on both tables (unchanged) -----------------------
SELECT 'v5_rls_applicability_forced' AS check,
       (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
        WHERE oid='public.client_service_applicability'::regclass) AS pass;
SELECT 'v5_rls_catalogue_forced' AS check,
       (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
        WHERE oid='public.service_catalogue'::regclass) AS pass;

-- V6 — audit-event contract UNCHANGED (the 4 P5 events present; none added) ---
SELECT 'v6_audit_events_present' AS check,
       (SELECT count(*) FROM public.audit_event_contract
        WHERE event_name IN ('service_applicability.added','service_applicability.updated',
                             'service_applicability.approved','service_applicability.deactivated')) = 4 AS pass;

-- V7 — applicability still EMPTY (no data created by the migration) -----------
SELECT 'v7_applicability_empty' AS check,
       (SELECT count(*) FROM public.client_service_applicability) AS applicability_rows,
       (SELECT count(*) FROM public.client_service_applicability) = 0 AS pass;

-- V8 — POST-EXECUTION BASELINE (compare each column to PG1_PRE_BASELINE) ------
--      applicability_rows must be 0; every other column must equal the recorded pre value.
SELECT 'PG1_POST_BASELINE' AS label,
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
--  END POST-EXECUTION VERIFICATION (READ-ONLY). PG-1 PASSES only if every pass=true
--  AND PG1_POST_BASELINE matches PG1_PRE_BASELINE (applicability_rows still 0).
-- ============================================================================
