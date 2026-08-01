-- ############################################################################
-- ##  YAV2 — PHASE 4C — AUDIT ROLE AUTHORITY DISCOVERY (SELECT ONLY)          ##
-- ##  READ-ONLY. Every executable statement begins SELECT or WITH.           ##
-- ##  NO DDL/DML/GRANT/REVOKE/CREATE ROLE/DO/SET ROLE/CALL.                   ##
-- ##  NO application-function calls. No sensitive values. Changes nothing.   ##
-- ##  Target (future run): yav2-dev / ogjrwemjefvccpyjwxuo ONLY.             ##
-- ##  PROHIBITED: V1 / Production / zcszesuvjrryxtigjglt.                    ##
-- ############################################################################
--
-- Purpose: before any Phase 4C implementation, confirm READ-ONLY whether the
-- executing identity can create and administer the two Phase 4C roles
-- (audit_owner, audit_writer), whether they already exist, and what the
-- service_role platform constraint looks like. This mirrors the Stage A
-- authority-discovery discipline. It CREATES no role and changes no privilege.


-- ── [P1] Session identity ───────────────────────────────────────────────────
SELECT
  current_user   AS current_user,
  session_user   AS session_user,
  current_role   AS current_role;


-- ── [P2] Current role attributes (createrole is the decisive one) ───────────
SELECT
  r.rolname,
  r.rolsuper,
  r.rolcreaterole,
  r.rolcreatedb,
  r.rolinherit,
  r.rolbypassrls,
  r.rolcanlogin
FROM pg_roles r
WHERE r.rolname = current_user;


-- ── [P3] Current role memberships (pg_auth_members / pg_has_role) ───────────
SELECT
  m.rolname                                              AS member_of,
  pg_has_role(current_user, m.rolname, 'USAGE')          AS has_usage,
  pg_has_role(current_user, m.rolname, 'MEMBER')         AS is_member
FROM pg_roles m
WHERE pg_has_role(current_user, m.rolname, 'USAGE')
ORDER BY m.rolname;


-- ── [P4] Do the Phase 4C roles already exist? (expect none in a clean env) ──
SELECT
  x.expected_role,
  (r.rolname IS NOT NULL)                                AS already_exists,
  r.rolsuper,
  r.rolcanlogin
FROM (VALUES ('audit_owner'), ('audit_writer')) AS x(expected_role)
LEFT JOIN pg_roles r ON r.rolname = x.expected_role
ORDER BY x.expected_role;


-- ── [P5] Could the current identity CREATE these roles? (capability facts) ──
-- CREATE ROLE requires the executing role to be a superuser OR to have
-- rolcreaterole = true. NOINHERIT/NOLOGIN roles impose no extra requirement to
-- create. This block reports the capability inputs; it does NOT attempt creation.
SELECT
  (SELECT rolsuper       FROM pg_roles WHERE rolname = current_user) AS cu_is_superuser,
  (SELECT rolcreaterole  FROM pg_roles WHERE rolname = current_user) AS cu_can_create_role,
  (SELECT rolcreaterole OR rolsuper FROM pg_roles WHERE rolname = current_user)
                                                                     AS eligible_to_create_audit_roles,
  NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_owner')  AS audit_owner_absent,
  NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_writer') AS audit_writer_absent;


-- ── [P6] service_role platform constraint (read-only facts) ─────────────────
-- Phase 4C REVOKEs audit privileges FROM service_role. service_role is a
-- Supabase-managed platform role; you can GRANT/REVOKE object privileges to it
-- but should not attempt to own/alter it. This reports its attributes and whether
-- the current identity is a member (which would be unusual).
SELECT
  r.rolname,
  r.rolsuper,
  r.rolbypassrls,
  r.rolcanlogin,
  pg_has_role(current_user, 'service_role', 'MEMBER')   AS cu_is_member_of_service_role
FROM pg_roles r
WHERE r.rolname IN ('service_role', 'authenticated', 'anon', 'authenticator')
ORDER BY r.rolname;


-- ── [P7] Consolidated eligibility summary (single row) ──────────────────────
SELECT
  (SELECT rolsuper      FROM pg_roles WHERE rolname = current_user)      AS cu_is_superuser,
  (SELECT rolcreaterole FROM pg_roles WHERE rolname = current_user)      AS cu_can_create_role,
  (SELECT rolcreaterole OR rolsuper FROM pg_roles WHERE rolname = current_user)
                                                                         AS eligible_to_create_audit_roles,
  EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_owner')          AS audit_owner_exists,
  EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_writer')         AS audit_writer_exists,
  EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')         AS service_role_present;

-- ############################################################################
-- ##  END — SELECT-ONLY PHASE 4C AUDIT AUTHORITY DISCOVERY                    ##
-- ##  Interpretation: eligible_to_create_audit_roles = true AND both roles    ##
-- ##  absent  ->  the current identity can create audit_owner/audit_writer.   ##
-- ##  If false -> STOP; escalate (Supabase-supported mechanism / PJ) as for   ##
-- ##  Stage A. NO role was created and no privilege changed by this kit.      ##
-- ############################################################################
