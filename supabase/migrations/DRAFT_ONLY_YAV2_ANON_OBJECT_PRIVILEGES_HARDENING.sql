-- ############################################################################
-- ##  DRAFT — NOT AUTHORISED — NOT EXECUTED  ################################
-- ############################################################################
-- File: supabase/migrations/DRAFT_ONLY_YAV2_ANON_OBJECT_PRIVILEGES_HARDENING.sql
--
-- THIS IS A DESIGN DRAFT. It has NOT been run and is NOT part of the migration
-- sequence (the `DRAFT_ONLY_` prefix keeps it out of ordered application). It
-- contains PROPOSED statements only, for review under R-ANON-OBJECT-PRIVILEGES.
--
--   * DO NOT EXECUTE without separate, explicit PJ authorisation.
--   * Target for any future execution: yav2-dev / ogjrwemjefvccpyjwxuo  ONLY.
--   * PROHIBITED: V1 / Production / zcszesuvjrryxtigjglt.
--   * Governing commit: 231fa39b608f6def9e6ed4b45ce5feb417c6f74f.
--   * A fail-fast guard (first statement) aborts the whole script if run. It must
--     be removed ONLY as a deliberate, PJ-authorised act.
--
-- Scope: revoke ALL anon privileges on the 28 tables that currently grant anon
-- object-level TRUNCATE/REFERENCES/TRIGGER/MAINTAIN (and the co-granted
-- SELECT/INSERT/UPDATE/DELETE), and correct the standing default privileges so
-- future tables do not re-grant anon. `authenticated` and `service_role` are
-- PRESERVED (not referenced by any GRANT/REVOKE here).
--
-- Rationale summary: anon is NOT BYPASSRLS and has no anon policy (G5=0), so its
-- row access is already fully denied by RLS; this change removes the object-level
-- surface RLS cannot mediate and makes the data-level block explicit. See design:
--   docs/yav2-security-hardening/YAV2_ANON_OBJECT_PRIVILEGES_MIGRATION_DESIGN.md
-- ############################################################################


-- ── FAIL-FAST GUARD (justified dynamic SQL: prevents accidental execution) ──
-- Remove this block ONLY under explicit PJ authorisation for yav2-dev.
DO $guard$
BEGIN
  RAISE EXCEPTION
    'DRAFT_ONLY_YAV2_ANON_OBJECT_PRIVILEGES_HARDENING.sql is NOT AUTHORISED and must NOT be executed. Remove the guard only under explicit PJ authorisation (yav2-dev only).';
END
$guard$;


-- ============================================================================
-- PROPOSED TRANSACTION (all-or-nothing).  ==> Runs only if the guard is removed.
-- Pre/post SELECT-only assertions live in:
--   supabase/verification/YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql
-- ============================================================================
BEGIN;

-- ── (A.1) OBJECT-LEVEL privileges — the core remediation (NOT RLS-mediated) ──
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

-- ── (A.2) DATA-LEVEL privileges — defence-in-depth (runtime-neutral: RLS already
--        denies anon; this makes the block explicit) ──
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

-- ── (B) DEFAULT-PRIVILEGE correction for FUTURE tables (both owner roles) ──
--    Defaults are owned by BOTH postgres AND supabase_admin (evidence G11); both
--    must be corrected or a future CREATE TABLE re-grants anon. Only anon is
--    removed; authenticated/service_role defaults are preserved.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres       IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
-- NOTE (open execution question): altering supabase_admin's defaults may require
-- executing as / membership of supabase_admin. If the migration role cannot do
-- so, apply that one correction via the Supabase-supported mechanism instead.

-- ── (C) POST-CHECK (justified dynamic SQL: abort if any anon privilege remains) ──
DO $postcheck$
DECLARE
  v_anon_rows   integer;
  v_default_anon integer;
BEGIN
  SELECT count(*) INTO v_anon_rows
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
  IF v_anon_rows <> 0 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: anon still holds % privilege row(s) on the 28 tables.', v_anon_rows;
  END IF;

  SELECT count(*) INTO v_default_anon
  FROM pg_default_acl d
  LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
  JOIN pg_roles gr ON gr.oid = ae.grantee AND gr.rolname = 'anon'
  WHERE d.defaclobjtype = 'r' AND (d.defaclnamespace = 0 OR ns.nspname = 'public');
  IF v_default_anon <> 0 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: default privileges still grant anon (% row(s)).', v_default_anon;
  END IF;

  RAISE NOTICE 'POST-CHECK PASSED: anon holds no privilege on the 28 tables and no table default.';
END
$postcheck$;

COMMIT;


-- ############################################################################
-- ##  ROLLBACK (comments only — author as a paired script; do NOT run here)  ##
-- ############################################################################
-- BEGIN;
--   -- Re-grant anon the prior full privileges on each of the 28 tables:
--   -- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
--   --   ON public.accounting_tracker TO anon;      -- ... repeat for all 28 tables
--   -- Restore the default privileges for BOTH owner roles:
--   -- ALTER DEFAULT PRIVILEGES FOR ROLE postgres       IN SCHEMA public GRANT ALL ON TABLES TO anon;
--   -- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
-- COMMIT;
-- (The forward data-privilege revoke is runtime-neutral, so rollback is mainly a
--  safety net for the object-privilege revoke and the default correction.)
-- ############################################################################
-- ##  END OF DRAFT — NOT AUTHORISED — NOT EXECUTED                          ##
-- ############################################################################
