-- ============================================================================
--  YAV2 — P5 — MIGRATION 0021 POST-EXECUTION VERIFICATION (READ-ONLY)
--
--  STATUS: DRAFT / NOT EXECUTED. READ-ONLY — every statement begins SELECT/WITH;
--          zero writes. Run AFTER an approved 0021 execution. Aggregate counts +
--          catalogue/schema metadata + booleans only; no personal values.
--  Target : V2 / yav2-dev ONLY (ogjrwemjefvccpyjwxuo). V1/Production prohibited.
-- ============================================================================

-- ---- V1: new objects + seed + EMPTY applicability (no client data) ----------
SELECT jsonb_pretty(jsonb_build_object(
  'service_catalogue_present',              (to_regclass('public.service_catalogue') IS NOT NULL),
  'client_service_applicability_present',   (to_regclass('public.client_service_applicability') IS NOT NULL),
  'service_catalogue_rows',                 (SELECT count(*) FROM public.service_catalogue),
  'client_service_applicability_rows',      (SELECT count(*) FROM public.client_service_applicability),
  'PASS_v1',
     (to_regclass('public.service_catalogue') IS NOT NULL
      AND to_regclass('public.client_service_applicability') IS NOT NULL
      AND (SELECT count(*) FROM public.service_catalogue) = 11
      AND (SELECT count(*) FROM public.client_service_applicability) = 0)
)) AS p5_0021_v1_objects_and_empty;

-- ---- V2: catalogue codes exactly match the PJ-approved set -------------------
WITH approved(code) AS (VALUES
  ('ACCOUNTING'),('GST'),('TDS'),('PAYROLL'),('INCOME_TAX'),('ROC'),('LLP'),
  ('STATUTORY_AUDIT'),('TAX_AUDIT'),('SECRETARIAL'),('OTHER'))
SELECT jsonb_pretty(jsonb_build_object(
  'catalogue_count',      (SELECT count(*) FROM public.service_catalogue),
  'approved_count',       (SELECT count(*) FROM approved),
  'catalogue_not_in_approved', (SELECT count(*) FROM public.service_catalogue s
                                LEFT JOIN approved a ON a.code=s.code WHERE a.code IS NULL),
  'approved_not_in_catalogue', (SELECT count(*) FROM approved a
                                LEFT JOIN public.service_catalogue s ON s.code=a.code WHERE s.code IS NULL),
  'PASS_v2_exact_codes',
     ((SELECT count(*) FROM public.service_catalogue s LEFT JOIN approved a ON a.code=s.code WHERE a.code IS NULL)=0
      AND (SELECT count(*) FROM approved a LEFT JOIN public.service_catalogue s ON s.code=a.code WHERE s.code IS NULL)=0)
)) AS p5_0021_v2_catalogue_codes;

-- ---- V3: constraints + composite same-client FK + indexes -------------------
SELECT jsonb_pretty(jsonb_build_object(
  'check_constraints_present',
     (SELECT count(*) FROM pg_constraint con JOIN pg_class r ON r.oid=con.conrelid
      JOIN pg_namespace n ON n.oid=r.relnamespace
      WHERE n.nspname='public' AND r.relname='client_service_applicability' AND con.contype='c'
        AND con.conname IN ('csa_dates_chk','csa_effective_from_gate_chk','csa_approval_actor_chk')),
  'status_check_present',
     (SELECT count(*) FROM pg_constraint con JOIN pg_class r ON r.oid=con.conrelid
      JOIN pg_namespace n ON n.oid=r.relnamespace
      WHERE n.nspname='public' AND r.relname='client_service_applicability' AND con.contype='c'
        AND pg_get_constraintdef(con.oid) ILIKE '%status%Draft%Approved%Inactive%'),
  'composite_same_client_fk_present',
     (SELECT count(*) FROM pg_constraint WHERE conname='csa_registration_same_client_fk' AND contype='f'),
  'composite_fk_on_delete_restrict',
     (SELECT count(*) FROM pg_constraint WHERE conname='csa_registration_same_client_fk' AND confdeltype='r'),
  'client_registrations_id_client_uq_present',
     (SELECT count(*) FROM pg_constraint WHERE conname='client_registrations_id_client_uq' AND contype='u'),
  'live_partial_unique_present',
     (SELECT count(*) FROM pg_indexes WHERE schemaname='public'
        AND tablename='client_service_applicability' AND indexname='client_service_applicability_live_uq'),
  'live_partial_unique_def',
     (SELECT indexdef FROM pg_indexes WHERE schemaname='public'
        AND tablename='client_service_applicability' AND indexname='client_service_applicability_live_uq')
)) AS p5_0021_v3_constraints;

-- ---- V4: RLS enabled + forced (both new tables) + catalogue read-only -------
SELECT jsonb_pretty(jsonb_build_object(
  'csa_rls_enabled',  (SELECT relrowsecurity     FROM pg_class WHERE oid='public.client_service_applicability'::regclass),
  'csa_rls_forced',   (SELECT relforcerowsecurity FROM pg_class WHERE oid='public.client_service_applicability'::regclass),
  'cat_rls_enabled',  (SELECT relrowsecurity     FROM pg_class WHERE oid='public.service_catalogue'::regclass),
  'cat_rls_forced',   (SELECT relforcerowsecurity FROM pg_class WHERE oid='public.service_catalogue'::regclass),
  'csa_policy_cmds',  (SELECT jsonb_agg(DISTINCT cmd ORDER BY cmd) FROM pg_policies
                       WHERE schemaname='public' AND tablename='client_service_applicability'),
  'cat_policy_cmds',  (SELECT jsonb_agg(DISTINCT cmd ORDER BY cmd) FROM pg_policies
                       WHERE schemaname='public' AND tablename='service_catalogue'),
  'cat_authenticated_select', has_table_privilege('authenticated','public.service_catalogue','SELECT'),
  'cat_authenticated_insert', has_table_privilege('authenticated','public.service_catalogue','INSERT'),
  'cat_authenticated_update', has_table_privilege('authenticated','public.service_catalogue','UPDATE'),
  'cat_authenticated_delete', has_table_privilege('authenticated','public.service_catalogue','DELETE'),
  'PASS_v4_catalogue_readonly',
     (has_table_privilege('authenticated','public.service_catalogue','SELECT') = true
      AND has_table_privilege('authenticated','public.service_catalogue','INSERT') = false
      AND has_table_privilege('authenticated','public.service_catalogue','UPDATE') = false
      AND has_table_privilege('authenticated','public.service_catalogue','DELETE') = false)
)) AS p5_0021_v4_rls;

-- ---- V5: privileges — RPC-only writes on applicability ----------------------
SELECT jsonb_pretty(jsonb_build_object(
  'anon_select',           has_table_privilege('anon','public.client_service_applicability','SELECT'),
  'authenticated_select',  has_table_privilege('authenticated','public.client_service_applicability','SELECT'),
  'authenticated_insert',  has_table_privilege('authenticated','public.client_service_applicability','INSERT'),
  'authenticated_update',  has_table_privilege('authenticated','public.client_service_applicability','UPDATE'),
  'authenticated_delete',  has_table_privilege('authenticated','public.client_service_applicability','DELETE'),
  'PASS_v5_rpc_only_writes',
     (has_table_privilege('authenticated','public.client_service_applicability','SELECT') = true
      AND has_table_privilege('authenticated','public.client_service_applicability','INSERT') = false
      AND has_table_privilege('authenticated','public.client_service_applicability','UPDATE') = false
      AND has_table_privilege('authenticated','public.client_service_applicability','DELETE') = false
      AND has_table_privilege('anon','public.client_service_applicability','SELECT') = false)
)) AS p5_0021_v5_privileges;

-- ---- V6: ALL 3 RPCs — signature exists, SECURITY DEFINER, EXECUTE only to -----
--         authenticated (anon / service_role / PUBLIC denied). PUBLIC is checked
--         via aclexplode grantee=0 (has_function_privilege has no PUBLIC role);
--         has_function_privilege is guarded by to_regprocedure so a missing RPC
--         reports as a failing row rather than erroring.
WITH rpc(sig) AS (VALUES
  ('public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)'),
  ('public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)'),
  ('public.service_applicability_set_status(uuid,integer,text,date)')
),
chk AS (
  SELECT sig,
    (to_regprocedure(sig) IS NOT NULL) AS exists,
    (SELECT p.prosecdef FROM pg_proc p WHERE p.oid=to_regprocedure(sig)) AS security_definer,
    CASE WHEN to_regprocedure(sig) IS NOT NULL THEN has_function_privilege('authenticated', to_regprocedure(sig), 'EXECUTE') END AS exec_authenticated,
    CASE WHEN to_regprocedure(sig) IS NOT NULL THEN has_function_privilege('anon',          to_regprocedure(sig), 'EXECUTE') END AS exec_anon,
    CASE WHEN to_regprocedure(sig) IS NOT NULL THEN has_function_privilege('service_role',  to_regprocedure(sig), 'EXECUTE') END AS exec_service_role,
    ( (SELECT p.proacl FROM pg_proc p WHERE p.oid=to_regprocedure(sig)) IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM aclexplode((SELECT p.proacl FROM pg_proc p WHERE p.oid=to_regprocedure(sig))) a
                      WHERE a.grantee = 0 AND a.privilege_type='EXECUTE') ) AS public_no_execute
  FROM rpc
)
SELECT jsonb_pretty(jsonb_build_object(
  'per_rpc', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.sig) FROM chk c),
  'PASS_v6_all_rpc_security',
     (SELECT bool_and(coalesce(
        exists AND security_definer
        AND exec_authenticated = true
        AND exec_anon = false AND exec_service_role = false
        AND public_no_execute = true, false)) FROM chk)
)) AS p5_0021_v6_rpcs;

-- ---- V7: audit events registered (4 lifecycle events) -----------------------
SELECT event_name, risk_tier, sensitivity, permitted_actions, permitted_resource_types
FROM public.audit_event_contract
WHERE event_name IN ('service_applicability.added','service_applicability.updated',
                     'service_applicability.approved','service_applicability.deactivated')
ORDER BY event_name;

-- ---- V8: protected-table POST-EXECUTION values (for manual comparison) -------
--  These are the CURRENT post-execution counts ONLY. This block makes NO PASS
--  claim: invariance is established by comparing these values, by hand, against the
--  separately recorded PRE-EXECUTION snapshot (the migration's SECTION 0 baseline /
--  the reviewer's captured pre-run numbers). Expectation on comparison: only
--  service_catalogue (+11) and audit_event_contract (+4) differ; clients /
--  clients.services element total / client_registrations / trackers / calendar /
--  audit_log are unchanged; client_service_applicability = 0. Counts alone do not
--  prove content invariance (see the migration's static no-write analysis).
SELECT jsonb_pretty(jsonb_build_object(
  'clients_rows',              (SELECT count(*) FROM public.clients),
  'clients_services_elems',    (SELECT coalesce(sum(CASE WHEN jsonb_typeof(services)='array'
                                                    THEN jsonb_array_length(services) ELSE 0 END),0)
                                 FROM public.clients),
  'client_registrations_rows', (SELECT count(*) FROM public.client_registrations),
  'accounting_tracker',        (SELECT count(*) FROM public.accounting_tracker),
  'financials_tracker',        (SELECT count(*) FROM public.financials_tracker),
  'income_tax_tracker',        (SELECT count(*) FROM public.income_tax_tracker),
  'compliance_calendar',       (SELECT count(*) FROM public.compliance_calendar),
  'client_service_applicability_rows', (SELECT count(*) FROM public.client_service_applicability)
)) AS p5_0021_v8_protected_baselines;
-- ============================================================================
--  END READ-ONLY VERIFICATION. No writes.
-- ============================================================================
