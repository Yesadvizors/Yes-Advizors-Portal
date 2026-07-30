-- ############################################################################
-- ##  STAGE A ROLLBACK CANDIDATE — NOT AUTHORISED — NOT EXECUTED  ###########
-- ############################################################################
-- File: supabase/readiness/YAV2_STAGE_A_ANON_OBJECT_PRIVILEGES_ROLLBACK_CANDIDATE.sql
--       (readiness folder — NOT the live migration sequence.)
--
-- EXACT INVERSE of YAV2_STAGE_A_ANON_OBJECT_PRIVILEGES_MIGRATION_CANDIDATE.sql.
-- Restores anon OBJECT-LEVEL privileges (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN)
-- on the same 28 tables, and restores the owner-scoped default OBJECT-level
-- privileges for postgres and supabase_admin. Returns the catalog to the
-- pre-Stage-A object-level state.
--
--   * DO NOT EXECUTE without separate, explicit PJ authorisation.
--   * Future execution target: yav2-dev / ogjrwemjefvccpyjwxuo  ONLY.
--   * PROHIBITED: V1 / Production / zcszesuvjrryxtigjglt.
--   * NO SET ROLE. NO privilege escalation. Data privileges (SELECT/INSERT/
--     UPDATE/DELETE) and authenticated/service_role are NOT referenced (Stage A
--     never touched them, so rollback does not either).
--   * Use ONLY to undo Stage A. Restores anon object privileges to their prior
--     GRANT-ALL state; the finding R-ANON-OBJECT-PRIVILEGES re-opens on rollback.
-- ############################################################################


-- ── FAIL-FAST GUARD (remove ONLY under explicit PJ authorisation) ──
DO $guard$
BEGIN
  RAISE EXCEPTION
    'STAGE A ROLLBACK CANDIDATE is NOT AUTHORISED to execute. Remove this guard only under explicit PJ authorisation (yav2-dev only).';
END
$guard$;


BEGIN;  -- Stage A rollback transaction (atomic)

-- ── Restore anon OBJECT-LEVEL privileges on the 28 tables (exact inverse) ──
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.accounting_tracker        TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.audit_event_contract      TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.audit_ingestion_failures  TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.audit_log                 TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.audit_tracker             TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.claude_usage_log          TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.client_directors          TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.client_financials         TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.clients                   TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.completed_documents       TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.compliance_calendar       TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.ct_team_members           TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.documents                 TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.extracted_document_data   TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.financial_years           TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.financials_tracker        TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.follow_ups                TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.gst_tracker               TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.income_tax_tracker        TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.llp_tracker               TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.notice_tracker            TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.payroll_tracker           TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.roc_tracker               TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.tasks                     TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.tds_client_config         TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.tds_tracker               TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.team                      TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.trust_ngo_tracker         TO anon;

-- ── Restore owner-scoped default OBJECT-level privileges (both owner scopes) ──
--    Only needed if the Stage A default correction was applied for that scope.
--    Subject to the same owner-execution authority as the forward migration.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres       IN SCHEMA public
  GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO anon;

-- ── ROLLBACK POST-CHECK (assert anon object rows restored to 112) ──
DO $rbcheck$
DECLARE v_anon_obj integer;
BEGIN
  SELECT count(*) INTO v_anon_obj FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) ae JOIN pg_roles r ON r.oid=ae.grantee AND r.rolname='anon'
    WHERE n.nspname='public' AND c.relkind='r' AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
    AND c.relname IN (
      'accounting_tracker','audit_event_contract','audit_ingestion_failures','audit_log','audit_tracker',
      'claude_usage_log','client_directors','client_financials','clients','completed_documents',
      'compliance_calendar','ct_team_members','documents','extracted_document_data','financial_years',
      'financials_tracker','follow_ups','gst_tracker','income_tax_tracker','llp_tracker','notice_tracker',
      'payroll_tracker','roc_tracker','tasks','tds_client_config','tds_tracker','team','trust_ngo_tracker');
  IF v_anon_obj <> 112 THEN
    RAISE EXCEPTION 'ROLLBACK CHECK FAILED: expected 112 anon object rows restored, found %.', v_anon_obj;
  END IF;
  RAISE NOTICE 'ROLLBACK POST-CHECK PASSED: anon object-level rows restored to 112.';
END
$rbcheck$;

COMMIT;  -- end Stage A rollback


-- ############################################################################
-- ##  END OF STAGE A ROLLBACK CANDIDATE — NOT AUTHORISED — NOT EXECUTED      ##
-- ############################################################################
