-- ############################################################################
-- ##  PATH 2 PART A                                                          ##
-- ##  NOT AUTHORISED   NOT EXECUTED   YAV2-DEV ONLY   STAGE B EXCLUDED       ##
-- ############################################################################
-- File: supabase/readiness/YAV2_STAGE_A_PATH2_PART_A_EXISTING_TABLES_AND_POSTGRES_DEFAULT_CANDIDATE.sql
--
-- PATH 2 (SPLIT EXECUTION) — PART A only:
--   (A) existing-table remediation: revoke anon OBJECT-LEVEL privileges
--       (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) on the 28 in-scope tables;
--   (B) postgres-owned FUTURE default correction (object-level, anon).
--
-- Selected by live authority evidence F2 (2026-07-30):
--   cu_is_superuser = false; eligible_for_postgres_default_alter = TRUE;
--   eligible_for_supabase_admin_default_alter = FALSE.
--   => The supabase_admin-owned default correction is NOT in this file; it is
--      Part B (a separate Supabase-supported mechanism). See:
--      supabase/readiness/YAV2_STAGE_A_PATH2_PART_B_SUPABASE_ADMIN_DEFAULT_PROPOSAL.sql
--
--   * DO NOT EXECUTE without separate, explicit PJ authorisation.
--   * Future execution target: yav2-dev / ogjrwemjefvccpyjwxuo  ONLY.
--   * PROHIBITED: V1 / Production / zcszesuvjrryxtigjglt.
--   * Governing merged commit: 370dd95d470bf1baa096f61a64409dd1259e2a04.
--   * NO SET ROLE. NO privilege escalation. NO Stage B.
--   * PRESERVED, untouched: anon SELECT/INSERT/UPDATE/DELETE; ALL authenticated
--     and service_role privileges; the supabase_admin-owned default (Part B).
--   * PART A IS NOT FULL STAGE A CLOSURE: while Part B (supabase_admin default) is
--     open, FUTURE-table protection is incomplete.
-- ############################################################################


-- ── FAIL-FAST GUARD (remove ONLY under explicit PJ authorisation) ──
DO $guard$
BEGIN
  RAISE EXCEPTION
    'PATH 2 PART A is NOT AUTHORISED to execute. Remove this guard only under explicit PJ authorisation (yav2-dev only). Part B (supabase_admin default) is separate and NOT in this file.';
END
$guard$;


BEGIN;  -- Part A transaction (atomic; a failed check or STOP rolls everything back)

-- ── PRECONDITIONS (fail-fast STOP conditions) ──
DO $precheck$
DECLARE
  v_tables    integer;
  v_anon_obj  integer;
  v_min_priv  integer;
  v_data      integer;
  v_auth_obj  integer;
  v_svc_obj   integer;
  v_pg_defobj integer;
  v_cu_pg     boolean;
BEGIN
  -- (P1) exactly 28 in-scope base tables exist
  SELECT count(*) INTO v_tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN (
    'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
    'claude_usage_log','client_directors','client_financials','clients','completed_documents',
    'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
    'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
    'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_tables <> 28 THEN RAISE EXCEPTION 'STOP (P1): expected 28 tables, found %.', v_tables; END IF;

  -- (P2) anon currently holds exactly 112 object-level rows (28 x 4)
  SELECT count(*) INTO v_anon_obj FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='anon'
    WHERE n.nspname='public' AND c.relkind='r' AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
      'claude_usage_log','client_directors','client_financials','clients','completed_documents',
      'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
      'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
      'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_anon_obj <> 112 THEN RAISE EXCEPTION 'STOP (P2): expected 112 anon object rows, found %.', v_anon_obj; END IF;

  -- (P3) all 4 Stage A privileges present on EACH of the 28 tables (min per-table = 4)
  SELECT min(cnt) INTO v_min_priv FROM (
    SELECT c.relname, count(*) AS cnt
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='anon'
    WHERE n.nspname='public' AND c.relkind='r' AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
      AND c.relname IN (
        'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
        'claude_usage_log','client_directors','client_financials','clients','completed_documents',
        'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
        'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
        'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker')
    GROUP BY c.relname) t;
  IF v_min_priv IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION 'STOP (P3): not all 4 Stage A object privileges present on every table (min per-table=%).', v_min_priv;
  END IF;

  -- (P4) anon DATA rows baseline (must be UNCHANGED — preserved)
  SELECT count(*) INTO v_data FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='anon'
    WHERE n.nspname='public' AND c.relkind='r' AND ae.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
      'claude_usage_log','client_directors','client_financials','clients','completed_documents',
      'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
      'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
      'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_data <> 112 THEN RAISE EXCEPTION 'STOP (P4): expected 112 anon data rows pre-run, found %.', v_data; END IF;

  -- (P5) authenticated + service_role object baseline (must be UNCHANGED = 112 each)
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
    RAISE EXCEPTION 'STOP (P5): auth/svc object baseline not 112/112 (got %/%).', v_auth_obj, v_svc_obj;
  END IF;

  -- (P6) postgres-owned anon object-level default rows exist as expected (4)
  SELECT count(*) INTO v_pg_defobj FROM pg_default_acl d
    LEFT JOIN pg_roles dr ON dr.oid=d.defaclrole
    LEFT JOIN pg_namespace ns ON ns.oid=d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) ae JOIN pg_roles gr ON gr.oid=ae.grantee AND gr.rolname='anon'
    WHERE d.defaclobjtype='r' AND (d.defaclnamespace=0 OR ns.nspname='public')
      AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN') AND dr.rolname='postgres';
  IF v_pg_defobj < 1 THEN
    RAISE EXCEPTION 'STOP (P6): expected postgres-owned anon object default rows, found %.', v_pg_defobj;
  END IF;

  -- (P7) current-user authority for the postgres default correction MUST be
  --      reconfirmed at run (F2 eligible_for_postgres_default_alter must be true).
  SELECT ( (SELECT rolsuper FROM pg_roles WHERE rolname=current_user)
           OR pg_has_role(current_user,'postgres','MEMBER') ) INTO v_cu_pg;
  IF NOT v_cu_pg THEN
    RAISE EXCEPTION 'STOP (P7): current_user % is NOT eligible to alter postgres default privileges (superuser OR member of postgres required).', current_user;
  END IF;

  RAISE NOTICE 'PART A PRECONDITIONS PASSED: 28 tables; anon object=112 (all 4 each); data=112 preserved; auth/svc object=112/112; postgres default present; current_user eligible for postgres scope.';
END
$precheck$;

-- ── (A) EXISTING-TABLE REVOKE (object-level only; anon only; 28 explicit tables) ──
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

-- ── (B) postgres-owned FUTURE default correction (ONE owner scope only) ──
--    supabase_admin scope is deliberately ABSENT (Part B). Only anon is removed.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon;

-- ── POSTCONDITIONS (abort/rollback on any deviation) ──
DO $postcheck$
DECLARE
  v_anon_obj  integer;
  v_data      integer;
  v_auth_obj  integer;
  v_svc_obj   integer;
  v_pg_defobj integer;
  v_sa_defobj integer;
BEGIN
  -- (Q1) anon object rows now ZERO on the 28 existing tables
  SELECT count(*) INTO v_anon_obj FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='anon'
    WHERE n.nspname='public' AND c.relkind='r' AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
      'claude_usage_log','client_directors','client_financials','clients','completed_documents',
      'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
      'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
      'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_anon_obj <> 0 THEN RAISE EXCEPTION 'POST (Q1) FAILED: anon still holds % object-level row(s).', v_anon_obj; END IF;

  -- (Q2) postgres-owned anon object default rows now ZERO
  SELECT count(*) INTO v_pg_defobj FROM pg_default_acl d
    LEFT JOIN pg_roles dr ON dr.oid=d.defaclrole
    LEFT JOIN pg_namespace ns ON ns.oid=d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) ae JOIN pg_roles gr ON gr.oid=ae.grantee AND gr.rolname='anon'
    WHERE d.defaclobjtype='r' AND (d.defaclnamespace=0 OR ns.nspname='public')
      AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN') AND dr.rolname='postgres';
  IF v_pg_defobj <> 0 THEN RAISE EXCEPTION 'POST (Q2) FAILED: postgres default still grants anon object-level (% rows).', v_pg_defobj; END IF;

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
    RAISE EXCEPTION 'POST (Q3) FAILED: auth/svc object rows changed (got %/%, expected 112/112).', v_auth_obj, v_svc_obj;
  END IF;

  -- (Q4) anon DATA rows UNCHANGED (SELECT/INSERT/UPDATE/DELETE preserved = 112)
  SELECT count(*) INTO v_data FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='anon'
    WHERE n.nspname='public' AND c.relkind='r' AND ae.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
      'claude_usage_log','client_directors','client_financials','clients','completed_documents',
      'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
      'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
      'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_data <> 112 THEN RAISE EXCEPTION 'POST (Q4) FAILED: anon data rows changed to % (expected 112 preserved).', v_data; END IF;

  -- (Q5) supabase_admin-owned default remains OUTSIDE Part A (still present > 0).
  --      This is EXPECTED: Part A does not touch it. It is closed by Part B.
  SELECT count(*) INTO v_sa_defobj FROM pg_default_acl d
    LEFT JOIN pg_roles dr ON dr.oid=d.defaclrole
    LEFT JOIN pg_namespace ns ON ns.oid=d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) ae JOIN pg_roles gr ON gr.oid=ae.grantee AND gr.rolname='anon'
    WHERE d.defaclobjtype='r' AND (d.defaclnamespace=0 OR ns.nspname='public')
      AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN') AND dr.rolname='supabase_admin';
  RAISE NOTICE 'PART A POSTCONDITIONS PASSED: anon object(existing)=0; postgres default anon object=0; auth/svc object=112/112; anon data=112 preserved. supabase_admin default anon object rows still OPEN=% (Part B closes this).', v_sa_defobj;
END
$postcheck$;

COMMIT;  -- end Part A


-- ############################################################################
-- ##  PART A DOES NOT CLOSE STAGE A.                                         ##
-- ##  supabase_admin FUTURE default is still OPEN -> see Part B proposal:    ##
-- ##    supabase/readiness/YAV2_STAGE_A_PATH2_PART_B_SUPABASE_ADMIN_DEFAULT_PROPOSAL.sql
-- ##  Rollback: YAV2_STAGE_A_PATH2_PART_A_ROLLBACK_CANDIDATE.sql             ##
-- ##  END OF PATH 2 PART A — NOT AUTHORISED — NOT EXECUTED                   ##
-- ############################################################################
