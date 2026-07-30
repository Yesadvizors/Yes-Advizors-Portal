-- ############################################################################
-- ##  STAGE A MIGRATION CANDIDATE — NOT AUTHORISED — NOT EXECUTED  ##########
-- ############################################################################
-- File: supabase/readiness/YAV2_STAGE_A_ANON_OBJECT_PRIVILEGES_MIGRATION_CANDIDATE.sql
--       (readiness folder — NOT the live migration sequence; no numbered prefix.)
--
-- STAGE A ONLY. Revokes anon OBJECT-LEVEL privileges on the 28 in-scope tables:
--   TRUNCATE, REFERENCES, TRIGGER, MAINTAIN   (RLS does not mediate these)
-- and corrects the FUTURE default OBJECT-LEVEL privileges for both owner scopes.
--
--   * DO NOT EXECUTE without separate, explicit PJ authorisation.
--   * Future execution target: yav2-dev / ogjrwemjefvccpyjwxuo  ONLY.
--   * PROHIBITED: V1 / Production / zcszesuvjrryxtigjglt.
--   * Governing merged commit: 370dd95d470bf1baa096f61a64409dd1259e2a04.
--   * NO SET ROLE. NO dynamic privilege escalation. The only DO blocks are a
--     fail-fast guard and pre/post-condition assertions (they raise, not escalate).
--   * STAGE B (SELECT/INSERT/UPDATE/DELETE) is OUT OF SCOPE and NOT present here.
--   * PRESERVED, untouched: anon SELECT/INSERT/UPDATE/DELETE; all authenticated
--     and service_role privileges.
--
-- Evidence basis (merged exact live result, sha256 8fe16665...):
--   28 tables; anon holds all 4 object privileges on each => 112 object rows;
--   default OBJECT-level anon grant present for BOTH postgres and supabase_admin.
-- ############################################################################


-- ── FAIL-FAST GUARD (remove ONLY under explicit PJ authorisation) ──
DO $guard$
BEGIN
  RAISE EXCEPTION
    'STAGE A MIGRATION CANDIDATE is NOT AUTHORISED to execute. Remove this guard only under explicit PJ authorisation (yav2-dev only).';
END
$guard$;


BEGIN;  -- Stage A transaction (atomic; a failed check or STOP rolls everything back)

-- ── PRECONDITION CHECKS (fail-fast STOP conditions) ──
DO $precheck$
DECLARE
  v_tables       integer;
  v_anon_obj     integer;
  v_anon_data    integer;
  v_auth_obj     integer;
  v_svc_obj      integer;
  v_def_owners   integer;
BEGIN
  -- (P1) exactly 28 in-scope base tables exist
  SELECT count(*) INTO v_tables
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN (
    'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log',
    'audit_tracker','claude_usage_log','client_directors','client_financials','clients',
    'completed_documents','compliance_calendar','ct_team_members','documents',
    'extracted_document_data','financial_years','financials_tracker','follow_ups','gst_tracker',
    'income_tax_tracker','llp_tracker','notice_tracker','payroll_tracker','roc_tracker','tasks',
    'tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_tables <> 28 THEN
    RAISE EXCEPTION 'STOP (P1): expected 28 in-scope tables, found %.', v_tables;
  END IF;

  -- (P2) anon currently holds exactly 112 object-level rows (28 x 4)
  SELECT count(*) INTO v_anon_obj
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='anon'
  WHERE n.nspname='public' AND c.relkind='r'
    AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log',
      'audit_tracker','claude_usage_log','client_directors','client_financials','clients',
      'completed_documents','compliance_calendar','ct_team_members','documents',
      'extracted_document_data','financial_years','financials_tracker','follow_ups','gst_tracker',
      'income_tax_tracker','llp_tracker','notice_tracker','payroll_tracker','roc_tracker','tasks',
      'tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_anon_obj <> 112 THEN
    RAISE EXCEPTION 'STOP (P2): expected 112 anon object-level rows, found % (catalog drift).', v_anon_obj;
  END IF;

  -- (P3) capture anon DATA rows (must be UNCHANGED by Stage A — preserved)
  SELECT count(*) INTO v_anon_data
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='anon'
  WHERE n.nspname='public' AND c.relkind='r'
    AND ae.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log',
      'audit_tracker','claude_usage_log','client_directors','client_financials','clients',
      'completed_documents','compliance_calendar','ct_team_members','documents',
      'extracted_document_data','financial_years','financials_tracker','follow_ups','gst_tracker',
      'income_tax_tracker','llp_tracker','notice_tracker','payroll_tracker','roc_tracker','tasks',
      'tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_anon_data <> 112 THEN
    RAISE EXCEPTION 'STOP (P3): expected 112 anon data-level rows pre-run, found %.', v_anon_data;
  END IF;

  -- (P4) authenticated + service_role object baseline (must be UNCHANGED)
  SELECT count(*) INTO v_auth_obj FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='authenticated'
    WHERE n.nspname='public' AND c.relkind='r' AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
      'claude_usage_log','client_directors','client_financials','clients','completed_documents',
      'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
      'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
      'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker');
  SELECT count(*) INTO v_svc_obj FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='service_role'
    WHERE n.nspname='public' AND c.relkind='r' AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
      'claude_usage_log','client_directors','client_financials','clients','completed_documents',
      'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
      'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
      'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_auth_obj <> 112 OR v_svc_obj <> 112 THEN
    RAISE EXCEPTION 'STOP (P4): authenticated/service_role object baseline not 112/112 (got %/%).', v_auth_obj, v_svc_obj;
  END IF;

  -- (P5) default OBJECT-level anon grant present for both owner scopes
  SELECT count(DISTINCT dr.rolname) INTO v_def_owners
  FROM pg_default_acl d LEFT JOIN pg_roles dr ON dr.oid=d.defaclrole
  LEFT JOIN pg_namespace ns ON ns.oid=d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) ae JOIN pg_roles gr ON gr.oid=ae.grantee AND gr.rolname='anon'
  WHERE d.defaclobjtype='r' AND (d.defaclnamespace=0 OR ns.nspname='public')
    AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
    AND dr.rolname IN ('postgres','supabase_admin');
  IF v_def_owners < 2 THEN
    RAISE EXCEPTION 'STOP (P5): expected anon object default for BOTH postgres and supabase_admin, found % owner(s). See execution-role authority decision.', v_def_owners;
  END IF;

  RAISE NOTICE 'PRECONDITIONS PASSED: 28 tables; anon object=112, data=112 (preserved); auth/svc object=112/112; default owners=2.';
END
$precheck$;

-- ── STAGE A REVOKE (object-level only; anon only; 28 explicit tables) ──
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.accounting_tracker        FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.audit_event_contract      FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.audit_ingestion_failures  FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.audit_log                 FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.audit_tracker             FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.claude_usage_log          FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.client_directors          FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.client_financials         FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.clients                   FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.completed_documents       FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.compliance_calendar       FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.ct_team_members           FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.documents                 FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.extracted_document_data   FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.financial_years           FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.financials_tracker        FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.follow_ups                FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.gst_tracker               FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.income_tax_tracker        FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.llp_tracker               FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.notice_tracker            FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.payroll_tracker           FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.roc_tracker               FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.tasks                     FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.tds_client_config         FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.tds_tracker               FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.team                      FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.trust_ngo_tracker         FROM anon;

-- ── STAGE A default correction (object-level only, both owner scopes) ──
--    See YAV2_STAGE_A_EXECUTION_ROLE_AND_AUTHORITY_DECISION.md for the owner gate.
--    If either ALTER cannot run under the executing role's real authority, the
--    statement errors and this whole transaction rolls back (no partial state).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres       IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon;

-- ── POSTCONDITION CHECKS (abort/rollback on any deviation) ──
DO $postcheck$
DECLARE
  v_anon_obj  integer;
  v_anon_data integer;
  v_auth_obj  integer;
  v_svc_obj   integer;
  v_def_obj   integer;
BEGIN
  -- (Q1) anon object-level rows now ZERO on the 28
  SELECT count(*) INTO v_anon_obj FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='anon'
    WHERE n.nspname='public' AND c.relkind='r' AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
      'claude_usage_log','client_directors','client_financials','clients','completed_documents',
      'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
      'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
      'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_anon_obj <> 0 THEN
    RAISE EXCEPTION 'POST (Q1) FAILED: anon still holds % object-level row(s).', v_anon_obj;
  END IF;

  -- (Q2) anon DATA rows UNCHANGED (Stage A must preserve SELECT/INSERT/UPDATE/DELETE)
  SELECT count(*) INTO v_anon_data FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='anon'
    WHERE n.nspname='public' AND c.relkind='r' AND ae.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
      'claude_usage_log','client_directors','client_financials','clients','completed_documents',
      'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
      'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
      'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_anon_data <> 112 THEN
    RAISE EXCEPTION 'POST (Q2) FAILED: anon data-level rows changed to % (expected 112 preserved).', v_anon_data;
  END IF;

  -- (Q3) authenticated + service_role object rows UNCHANGED (112 each)
  SELECT count(*) INTO v_auth_obj FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='authenticated'
    WHERE n.nspname='public' AND c.relkind='r' AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
      'claude_usage_log','client_directors','client_financials','clients','completed_documents',
      'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
      'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
      'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker');
  SELECT count(*) INTO v_svc_obj FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='service_role'
    WHERE n.nspname='public' AND c.relkind='r' AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
      'claude_usage_log','client_directors','client_financials','clients','completed_documents',
      'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
      'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
      'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_auth_obj <> 112 OR v_svc_obj <> 112 THEN
    RAISE EXCEPTION 'POST (Q3) FAILED: authenticated/service_role object rows changed (got %/%, expected 112/112).', v_auth_obj, v_svc_obj;
  END IF;

  -- (Q4) default OBJECT-level anon rows now ZERO for both owners
  SELECT count(*) INTO v_def_obj FROM pg_default_acl d
    LEFT JOIN pg_namespace ns ON ns.oid=d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) ae JOIN pg_roles gr ON gr.oid=ae.grantee AND gr.rolname='anon'
    WHERE d.defaclobjtype='r' AND (d.defaclnamespace=0 OR ns.nspname='public')
      AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN');
  IF v_def_obj <> 0 THEN
    RAISE EXCEPTION 'POST (Q4) FAILED: default privileges still grant anon object-level (% rows).', v_def_obj;
  END IF;

  RAISE NOTICE 'STAGE A POSTCONDITIONS PASSED: anon object=0, anon data=112 (preserved), auth/svc object=112/112, default object anon=0.';
END
$postcheck$;

COMMIT;  -- end Stage A


-- ############################################################################
-- ##  STAGE B IS NOT PRESENT IN THIS FILE (out of scope).                    ##
-- ##  Rollback: supabase/readiness/                                          ##
-- ##    YAV2_STAGE_A_ANON_OBJECT_PRIVILEGES_ROLLBACK_CANDIDATE.sql           ##
-- ##  END OF STAGE A CANDIDATE — NOT AUTHORISED — NOT EXECUTED               ##
-- ############################################################################
