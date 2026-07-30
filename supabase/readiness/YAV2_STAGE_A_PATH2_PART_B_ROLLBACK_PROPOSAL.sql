-- ############################################################################
-- ##  PATH 2 PART B ROLLBACK — PROPOSAL ONLY — NOT AUTHORISED — NOT EXECUTED ##
-- ##  CURRENT EXECUTION IDENTITY INELIGIBLE                                  ##
-- ##  SUPABASE-SUPPORTED MECHANISM REQUIRED                                  ##
-- ############################################################################
-- File: supabase/readiness/YAV2_STAGE_A_PATH2_PART_B_ROLLBACK_PROPOSAL.sql
--
-- EXACT INVERSE of PATH 2 PART B only: restores the supabase_admin-owned default
-- OBJECT-level privileges (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) to anon.
--
--   * Applies ONLY to the supabase_admin owner scope default privilege.
--   * Contains NO existing-table GRANT, NO postgres scope, NO Stage B, NO data
--     privileges, NO authenticated/service_role change.
--   * The current execution identity is INELIGIBLE (F2). Apply only via the
--     separately authorised Supabase-supported mechanism, under separate PJ
--     approval. NO SET ROLE, NO escalation.
--   * Future execution target: yav2-dev / ogjrwemjefvccpyjwxuo  ONLY.
--   * PROHIBITED: V1 / Production / zcszesuvjrryxtigjglt.
-- ############################################################################


-- ── FAIL-FAST GUARD (proposal — do NOT execute through the current identity) ──
DO $guard$
BEGIN
  RAISE EXCEPTION
    'PATH 2 PART B ROLLBACK is a PROPOSAL ONLY and the current identity is INELIGIBLE. Apply via the authorised Supabase-supported mechanism under separate PJ approval. Do NOT SET ROLE or escalate.';
END
$guard$;


-- ── Part B rollback: the ONLY statement — restore supabase_admin-owned default ──
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO anon;


-- ############################################################################
-- ##  END OF PATH 2 PART B ROLLBACK — PROPOSAL ONLY — NOT AUTHORISED         ##
-- ############################################################################
