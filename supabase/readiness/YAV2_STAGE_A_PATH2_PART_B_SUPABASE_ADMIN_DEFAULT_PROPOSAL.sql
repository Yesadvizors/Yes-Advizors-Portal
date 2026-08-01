-- ############################################################################
-- ##  PATH 2 PART B                                                          ##
-- ##  PROPOSAL ONLY   NOT AUTHORISED   NOT EXECUTED                          ##
-- ##  CURRENT EXECUTION IDENTITY INELIGIBLE                                  ##
-- ##  SUPABASE-SUPPORTED MECHANISM REQUIRED                                  ##
-- ############################################################################
-- File: supabase/readiness/YAV2_STAGE_A_PATH2_PART_B_SUPABASE_ADMIN_DEFAULT_PROPOSAL.sql
--
-- PATH 2 (SPLIT EXECUTION) — PART B only: the supabase_admin-owned FUTURE default
-- object-privilege correction for anon. This is the ONLY statement in this file.
--
-- Live authority evidence F2 (2026-07-30):
--   eligible_for_supabase_admin_default_alter = FALSE  (cu_is_superuser = false).
--   => The CURRENT execution identity CANNOT perform this correction. It must be
--      applied through a separately authorised Supabase-supported mechanism
--      (platform role / dashboard / support), NOT through the current identity,
--      and NOT via SET ROLE or any privilege escalation.
--
--   * DO NOT run through the current ineligible identity.
--   * Requires a separately authorised Supabase-supported mechanism.
--   * Requires SEPARATE PJ approval.
--   * Requires SEPARATE evidence capture.
--   * PART A COMPLETION DOES NOT CLOSE PART B. Until Part B PASSES, FUTURE-table
--     protection remains INCOMPLETE for the supabase_admin owner scope.
--   * Future execution target: yav2-dev / ogjrwemjefvccpyjwxuo  ONLY.
--   * PROHIBITED: V1 / Production / zcszesuvjrryxtigjglt.
--   * NO SET ROLE. NO privilege escalation. NO Stage B. Only anon is affected.
--   * Contains NO existing-table REVOKE, NO postgres default correction, NO anon
--     data-privilege change, NO authenticated/service_role change.
-- ############################################################################


-- ── FAIL-FAST GUARD (proposal — do NOT execute through the current identity) ──
DO $guard$
BEGIN
  RAISE EXCEPTION
    'PATH 2 PART B is a PROPOSAL ONLY. The current execution identity is INELIGIBLE (F2 eligible_for_supabase_admin_default_alter=false). Apply via a separately authorised Supabase-supported mechanism under separate PJ approval. Do NOT SET ROLE or escalate.';
END
$guard$;


-- ── Part B: the ONLY correction — supabase_admin-owned future default (object-level) ──
--    To be applied by the authorised Supabase-supported mechanism, NOT the current identity.
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon;


-- ############################################################################
-- ##  POST-VERIFY (run the SELECT-only kit separately, read-only):          ##
-- ##  [DEF-POST-A] must then show 0 anon object default rows for            ##
-- ##  supabase_admin. Rollback: YAV2_STAGE_A_PATH2_PART_B_ROLLBACK_PROPOSAL.sql
-- ##  END OF PATH 2 PART B — PROPOSAL ONLY — NOT AUTHORISED — NOT EXECUTED   ##
-- ############################################################################
