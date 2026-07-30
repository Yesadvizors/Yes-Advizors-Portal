-- ############################################################################
-- ##  DESIGN PROPOSAL ONLY — NOT AUTHORISED — NOT EXECUTED  #################
-- ############################################################################
-- File: supabase/design/YAV2_ANON_OBJECT_PRIVILEGES_HARDENING_PROPOSED.sql
--       (moved out of supabase/migrations/ — a design proposal containing REVOKE
--        / ALTER DEFAULT PRIVILEGES / DO must NOT sit in the migration sequence
--        before separate execution approval.)
--
-- THIS FILE IS A DESIGN PROPOSAL. It has NOT been run, is NOT a migration, and is
-- NOT in the applied sequence. It exists for review of R-ANON-OBJECT-PRIVILEGES.
--
--   * DO NOT EXECUTE without separate, explicit PJ authorisation.
--   * Future execution target: yav2-dev / ogjrwemjefvccpyjwxuo  ONLY.
--   * PROHIBITED: V1 / Production / zcszesuvjrryxtigjglt.
--   * Governing commit: 231fa39b608f6def9e6ed4b45ce5feb417c6f74f.
--   * NO SET ROLE. NO dynamic privilege escalation. The only DO blocks are a
--     fail-fast guard and post-check assertions (justified; they raise, they do
--     not escalate).
--
-- TWO STAGES — Stage A must NOT silently include Stage B:
--   STAGE A (REQUIRED, HIGH): revoke anon object-level TRUNCATE/REFERENCES/
--     TRIGGER/MAINTAIN on the 28 tables + correct FUTURE default OBJECT-level
--     privileges. RLS does not mediate these; this is the core remediation.
--   STAGE B (OPTIONAL, defence-in-depth): revoke anon SELECT/INSERT/UPDATE/DELETE
--     + correct FUTURE default DATA privileges. Runtime-neutral (RLS already
--     denies anon), but MUST NOT run until the runtime test plan proves no
--     legitimate public flow depends on them AND PJ separately approves.
--
-- Each stage is its own transaction with its own guard, so Stage A can be applied
-- without Stage B. Design: docs/yav2-security-hardening/
-- YAV2_ANON_OBJECT_PRIVILEGES_MIGRATION_DESIGN.md
-- ############################################################################


-- ============================================================================
-- STAGE A — REQUIRED HIGH CORRECTION  (object-level; RLS cannot mediate)
-- ============================================================================

-- ── STAGE-A FAIL-FAST GUARD (remove ONLY under explicit PJ authorisation) ──
DO $guard_a$
BEGIN
  RAISE EXCEPTION
    'STAGE A is a DESIGN PROPOSAL and is NOT AUTHORISED to execute. Remove this guard only under explicit PJ authorisation (yav2-dev only).';
END
$guard_a$;

BEGIN;  -- Stage A transaction (atomic)

-- (A.1) Revoke anon OBJECT-LEVEL privileges on the 28 in-scope tables.
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

-- (A.2) Correct FUTURE default OBJECT-LEVEL privileges so new tables do not
--       re-grant anon TRUNCATE/REFERENCES/TRIGGER/MAINTAIN. See owner-execution
--       gate below (§ OWNER-EXECUTION DESIGN) — both owner scopes are required.
--       postgres scope:
ALTER DEFAULT PRIVILEGES FOR ROLE postgres       IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon;
--       supabase_admin scope (see gate: may require the Supabase mechanism):
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon;

-- (A.3) STAGE-A POST-CHECK (justified DO: assert; abort → rollback if residual).
--       Stage A must NOT touch data privileges, so it checks OBJECT-level only.
DO $postcheck_a$
DECLARE v_obj integer; v_defobj integer;
BEGIN
  SELECT count(*) INTO v_obj
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
  JOIN pg_roles r ON r.oid = ae.grantee AND r.rolname = 'anon'
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log',
      'audit_tracker','claude_usage_log','client_directors','client_financials','clients',
      'completed_documents','compliance_calendar','ct_team_members','documents',
      'extracted_document_data','financial_years','financials_tracker','follow_ups','gst_tracker',
      'income_tax_tracker','llp_tracker','notice_tracker','payroll_tracker','roc_tracker','tasks',
      'tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_obj <> 0 THEN
    RAISE EXCEPTION 'STAGE A POST-CHECK FAILED: anon still holds % object-level privilege row(s).', v_obj;
  END IF;

  SELECT count(*) INTO v_defobj
  FROM pg_default_acl d
  LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
  JOIN pg_roles gr ON gr.oid = ae.grantee AND gr.rolname = 'anon'
  WHERE d.defaclobjtype = 'r' AND (d.defaclnamespace = 0 OR ns.nspname = 'public')
    AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN');
  IF v_defobj <> 0 THEN
    RAISE EXCEPTION 'STAGE A POST-CHECK FAILED: default privileges still grant anon object-level (% rows). Check both postgres and supabase_admin scopes.', v_defobj;
  END IF;

  RAISE NOTICE 'STAGE A POST-CHECK PASSED: anon holds no object-level privilege on the 28 tables or table defaults.';
END
$postcheck_a$;

COMMIT;  -- end Stage A


-- ============================================================================
-- STAGE B — OPTIONAL DEFENCE-IN-DEPTH  (data-level; runtime-neutral)
--   DO NOT RUN until: (i) the runtime test plan proves no legitimate public flow
--   depends on anon SELECT/INSERT/UPDATE/DELETE, AND (ii) PJ separately approves.
--   Separate guard below keeps Stage B blocked even if Stage A's guard is removed.
-- ============================================================================

DO $guard_b$
BEGIN
  RAISE EXCEPTION
    'STAGE B is OPTIONAL and separately gated. Remove this guard ONLY after the runtime test plan passes AND PJ separately approves (yav2-dev only).';
END
$guard_b$;

BEGIN;  -- Stage B transaction (atomic)

-- (B.1) Revoke anon DATA privileges on the 28 tables (RLS already denies anon).
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.accounting_tracker        FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.audit_event_contract      FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.audit_ingestion_failures  FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.audit_log                 FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.audit_tracker             FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.claude_usage_log          FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.client_directors          FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.client_financials         FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.clients                   FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.completed_documents       FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.compliance_calendar       FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.ct_team_members           FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.documents                 FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.extracted_document_data   FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.financial_years           FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.financials_tracker        FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.follow_ups                FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.gst_tracker               FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.income_tax_tracker        FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.llp_tracker               FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.notice_tracker            FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.payroll_tracker           FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.roc_tracker               FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.tasks                     FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.tds_client_config         FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.tds_tracker               FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.team                      FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.trust_ngo_tracker         FROM anon;

-- (B.2) Correct FUTURE default DATA privileges (both owner scopes).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres       IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon;

-- (B.3) STAGE-B POST-CHECK — after B, anon must hold NOTHING on the 28 tables.
DO $postcheck_b$
DECLARE v_any integer; v_defany integer;
BEGIN
  SELECT count(*) INTO v_any
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
  JOIN pg_roles r ON r.oid = ae.grantee AND r.rolname = 'anon'
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log',
      'audit_tracker','claude_usage_log','client_directors','client_financials','clients',
      'completed_documents','compliance_calendar','ct_team_members','documents',
      'extracted_document_data','financial_years','financials_tracker','follow_ups','gst_tracker',
      'income_tax_tracker','llp_tracker','notice_tracker','payroll_tracker','roc_tracker','tasks',
      'tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_any <> 0 THEN
    RAISE EXCEPTION 'STAGE B POST-CHECK FAILED: anon still holds % privilege row(s).', v_any;
  END IF;

  SELECT count(*) INTO v_defany
  FROM pg_default_acl d
  LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
  JOIN pg_roles gr ON gr.oid = ae.grantee AND gr.rolname = 'anon'
  WHERE d.defaclobjtype = 'r' AND (d.defaclnamespace = 0 OR ns.nspname = 'public');
  IF v_defany <> 0 THEN
    RAISE EXCEPTION 'STAGE B POST-CHECK FAILED: default privileges still grant anon (% rows).', v_defany;
  END IF;

  RAISE NOTICE 'STAGE B POST-CHECK PASSED: anon holds no privilege on the 28 tables or table defaults.';
END
$postcheck_b$;

COMMIT;  -- end Stage B


-- ############################################################################
-- ##  OWNER-EXECUTION DESIGN (deterministic gate; execution-time — NOT run)  ##
-- ############################################################################
-- Two default-ACL owner scopes exist (evidence pg_default_acl / block G11):
--   postgres        -> default TABLE grant to anon  (needs correction)
--   supabase_admin  -> default TABLE grant to anon  (needs correction)
--
-- For EACH scope the deterministic decision flow is:
--   scope = postgres
--     evidence          : G11 row (default_for_role=postgres, grantee=anon, table)
--     executing role    : the migration role, IF it is a member of / owns postgres
--     required authority: ability to ALTER DEFAULT PRIVILEGES FOR ROLE postgres
--     success condition : ALTER returns without error; POST-check default rows = 0
--     STOP condition    : permission error -> abort the whole stage (transaction
--                         rolls back); do NOT attempt SET ROLE or any escalation
--     fallback          : none needed if migration role has authority; else treat
--                         as the supabase_admin fallback below
--   scope = supabase_admin
--     evidence          : G11 row (default_for_role=supabase_admin, grantee=anon)
--     executing role    : requires membership of / running as supabase_admin
--     required authority: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
--     success condition : ALTER returns without error; POST-check default rows = 0
--     STOP condition    : if the migration role lacks authority, the ALTER fails;
--                         the Stage transaction MUST abort/rollback rather than
--                         proceed partially. Do NOT SET ROLE, do NOT escalate.
--     fallback (deterministic): apply the supabase_admin-scope default correction
--                         via the Supabase-supported mechanism (dashboard/support/
--                         platform role), as a SEPARATE PJ-authorised step, then
--                         re-run the SELECT-only POST checks. Until then the
--                         supabase_admin default remains a KNOWN OPEN GATE and the
--                         finding is only partially closed for FUTURE tables
--                         (existing-table REVOKEs A.1/B.1 are unaffected).
--
-- Rule: permission is NOT assumed. If either ALTER cannot execute under the
-- migration role's real authority, the operator STOPS and escalates the decision
-- to PJ; nothing is forced. Existing-table REVOKEs (A.1/B.1) are independent of
-- this gate and succeed on their own.
-- ############################################################################


-- ############################################################################
-- ##  ROLLBACK (comments only — author as paired scripts; do NOT run here)   ##
-- ############################################################################
-- STAGE A rollback:
--   GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.<table> TO anon;  -- x28
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres       IN SCHEMA public GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO anon;
--   ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO anon;
-- STAGE B rollback:
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO anon;           -- x28
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres       IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;
--   ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;
-- ############################################################################
-- ##  END OF DESIGN PROPOSAL — NOT AUTHORISED — NOT EXECUTED                 ##
-- ############################################################################
