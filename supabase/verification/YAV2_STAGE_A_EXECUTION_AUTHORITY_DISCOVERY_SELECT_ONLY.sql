-- ============================================================================
-- YAV2 — Stage A — EXECUTION-AUTHORITY DISCOVERY (SELECT-ONLY)
-- ----------------------------------------------------------------------------
-- File:    supabase/verification/YAV2_STAGE_A_EXECUTION_AUTHORITY_DISCOVERY_SELECT_ONLY.sql
-- Purpose: Determine the REAL execution authority for the Stage A default-
--          privilege corrections (ALTER DEFAULT PRIVILEGES FOR ROLE postgres /
--          supabase_admin), from READ-ONLY catalog evidence, BEFORE any migration
--          is authorised. Reports facts; makes NO change and TESTS NO permission.
--
-- STATUS:  DRAFT — NOT EXECUTED by Claude. Read-only. Run by PJ in yav2-dev only.
--
-- ============================ SAFETY CONTRACT ===============================
--  * EVERY executable statement begins with SELECT or WITH.
--  * ZERO writes / ZERO DDL / ZERO GRANT/REVOKE / no ALTER DEFAULT PRIVILEGES.
--  * NO SET ROLE. NO SET SESSION AUTHORIZATION. NO DO block. NO DML/DDL.
--  * NO application-function execution (only read-only system catalog functions:
--    pg_has_role, has_schema_privilege, aclexplode, current_setting, etc.).
--  * Does NOT attempt ALTER DEFAULT PRIVILEGES to probe permission.
--  * OUTPUT: role/catalog metadata and booleans ONLY. No table data, no client
--    value, no PII/PAN/GSTIN/financial figure.
--
-- ============================ AUTHORITY NOTE ================================
--  To run  ALTER DEFAULT PRIVILEGES FOR ROLE X ...  the executing identity must
--  be a MEMBER of role X (able to act as X) OR a SUPERUSER. Having CREATE on a
--  schema, or OWNING the schema/tables, does NOT by itself confer authority to
--  alter another role's default privileges. This kit therefore reports role
--  MEMBERSHIP and superuser status as the decisive facts — it does NOT infer
--  authority from CREATE or ownership.
--
-- ============================ TARGET DISCIPLINE =============================
--  AUTHORISED: yav2-dev / ogjrwemjefvccpyjwxuo   PROHIBITED: V1/Prod zcszesuvjrryxtigjglt
--  Governing commit: 370dd95d470bf1baa096f61a64409dd1259e2a04
-- ============================================================================


-- ############################################################################
-- ## SECTION A — SESSION IDENTITY
-- ############################################################################

-- [A1] Who am I, where am I, what version.
SELECT
  current_user                               AS current_user,
  session_user                               AS session_user,
  current_role                               AS current_role,
  current_database()                         AS current_database,
  current_setting('server_version')          AS server_version,
  current_setting('server_version_num')      AS server_version_num,
  current_setting('is_superuser')            AS is_superuser_setting;

-- [A2] Weak server-address locator (may be NULL on pooled connections; never a
--      project-ref proof).
SELECT inet_server_addr() AS server_ip_nullable, inet_server_port() AS server_port_nullable;

-- [A3] PROJECT/REF GATE — SQL cannot read the Supabase project ref. Confirm the
--      Editor header reads yav2-dev / ogjrwemjefvccpyjwxuo before trusting output.
SELECT
  'MANUAL CONFIRMATION REQUIRED'             AS action,
  'ogjrwemjefvccpyjwxuo'                     AS required_ref_yav2_dev,
  'zcszesuvjrryxtigjglt'                     AS prohibited_ref_v1_prod;


-- ############################################################################
-- ## SECTION B — ROLE ATTRIBUTES (facts only)
-- ############################################################################

-- [B1] Attributes for the executing identity and the relevant platform roles.
SELECT
  rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolbypassrls
FROM pg_roles
WHERE rolname = current_user
   OR rolname IN ('postgres','supabase_admin','authenticator','service_role','anon','authenticated')
ORDER BY rolname;


-- ############################################################################
-- ## SECTION C — ROLE MEMBERSHIPS
-- ############################################################################

-- [C1] Direct membership edges (member -> is a member of) that involve
--      current_user, postgres, or supabase_admin (either side of the edge).
SELECT
  m.rolname                                  AS member_role,
  r.rolname                                  AS is_member_of,
  am.admin_option                            AS with_admin_option,
  r.rolinherit                               AS target_rolinherit
FROM pg_auth_members am
JOIN pg_roles m ON m.oid = am.member
JOIN pg_roles r ON r.oid = am.roleid
WHERE m.rolname = current_user OR r.rolname = current_user
   OR m.rolname IN ('postgres','supabase_admin')
   OR r.rolname IN ('postgres','supabase_admin')
ORDER BY member_role, is_member_of;

-- [C2] Membership summary for the two default-owner roles (facts; MEMBER = can
--      act as that role; USAGE = inherits its privileges). Also whether postgres /
--      supabase_admin are themselves members of another role.
SELECT
  current_user                                                  AS current_user,
  pg_has_role(current_user, 'postgres', 'MEMBER')               AS cu_is_member_of_postgres,
  pg_has_role(current_user, 'supabase_admin', 'MEMBER')         AS cu_is_member_of_supabase_admin,
  (SELECT count(*) FROM pg_auth_members am JOIN pg_roles m ON m.oid=am.member
     WHERE m.rolname='postgres')                                AS postgres_is_member_of_n_roles,
  (SELECT count(*) FROM pg_auth_members am JOIN pg_roles m ON m.oid=am.member
     WHERE m.rolname='supabase_admin')                          AS supabase_admin_is_member_of_n_roles;


-- ############################################################################
-- ## SECTION D — DEFAULT-ACL OWNERSHIP EVIDENCE
-- ############################################################################

-- [D1] ALL default privileges for TABLE objects ('r'): owner role, schema,
--      grantee (PUBLIC OID-0 preserved), privilege, and object-level flag.
SELECT
  COALESCE(dr.rolname, '(unnamed)')                          AS default_owner,
  CASE WHEN d.defaclnamespace = 0 THEN '(all schemas)' ELSE ns.nspname END AS schema,
  COALESCE(gr.rolname, 'PUBLIC')                             AS grantee,
  ae.privilege_type                                          AS privilege_type,
  (ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')) AS is_object_level
FROM pg_default_acl d
LEFT JOIN pg_roles     dr ON dr.oid = d.defaclrole
LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
LEFT JOIN pg_roles     gr ON gr.oid = ae.grantee
WHERE d.defaclobjtype = 'r'
ORDER BY default_owner, schema, grantee, privilege_type;

-- [D2] Focused: anon OBJECT-LEVEL default privileges, separated by owner scope.
--      EXPECTED (from merged evidence): postgres AND supabase_admin each grant
--      anon TRUNCATE/REFERENCES/TRIGGER/MAINTAIN (4 each) for schema public.
SELECT
  COALESCE(dr.rolname, '(unnamed)')                          AS default_owner,
  bool_or(ae.privilege_type = 'TRUNCATE')                    AS anon_truncate,
  bool_or(ae.privilege_type = 'REFERENCES')                  AS anon_references,
  bool_or(ae.privilege_type = 'TRIGGER')                     AS anon_trigger,
  bool_or(ae.privilege_type = 'MAINTAIN')                    AS anon_maintain,
  count(*)                                                   AS anon_object_default_rows
FROM pg_default_acl d
LEFT JOIN pg_roles     dr ON dr.oid = d.defaclrole
LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
JOIN pg_roles          gr ON gr.oid = ae.grantee AND gr.rolname = 'anon'
WHERE d.defaclobjtype = 'r'
  AND (d.defaclnamespace = 0 OR ns.nspname = 'public')
  AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
GROUP BY COALESCE(dr.rolname, '(unnamed)')
ORDER BY default_owner;


-- ############################################################################
-- ## SECTION E — OBJECT OWNERSHIP OF THE 28 IN-SCOPE TABLES
-- ############################################################################

-- [E1] Owner of the 28 tables, count by owner, and whether current_user owns any.
--      No table data or sensitive values are selected.
WITH scope(t) AS (VALUES
  ('accounting_tracker'),('audit_event_contract'),('audit_ingestion_failures'),
  ('audit_log'),('audit_tracker'),('claude_usage_log'),('client_directors'),
  ('client_financials'),('clients'),('completed_documents'),('compliance_calendar'),
  ('ct_team_members'),('documents'),('extracted_document_data'),('financial_years'),
  ('financials_tracker'),('follow_ups'),('gst_tracker'),('income_tax_tracker'),
  ('llp_tracker'),('notice_tracker'),('payroll_tracker'),('roc_tracker'),('tasks'),
  ('tds_client_config'),('tds_tracker'),('team'),('trust_ngo_tracker'))
SELECT
  o.rolname                                                  AS table_owner,
  count(*)                                                   AS tables_owned_in_scope,
  count(*) FILTER (WHERE o.rolname = current_user)           AS owned_by_current_user
FROM scope s
JOIN pg_namespace n ON n.nspname = 'public'
JOIN pg_class c ON c.relname = s.t AND c.relnamespace = n.oid AND c.relkind = 'r'
JOIN pg_roles o ON o.oid = c.relowner
GROUP BY o.rolname
ORDER BY table_owner;


-- ############################################################################
-- ## SECTION F — AUTHORITY INFERENCE INPUTS (facts only; no permission test)
-- ############################################################################

-- [F1] Decisive read-only facts. NOTE: authority to ALTER DEFAULT PRIVILEGES FOR
--      ROLE X = (cu_is_superuser) OR (member of X). CREATE-on-public and
--      owns-public are reported for completeness but DO NOT imply that authority.
SELECT
  current_user                                               AS current_user,
  pg_has_role(current_user, 'postgres', 'MEMBER')            AS cu_member_of_postgres,
  pg_has_role(current_user, 'postgres', 'USAGE')             AS cu_usage_of_postgres,
  pg_has_role(current_user, 'supabase_admin', 'MEMBER')      AS cu_member_of_supabase_admin,
  pg_has_role(current_user, 'supabase_admin', 'USAGE')       AS cu_usage_of_supabase_admin,
  (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS cu_is_superuser,
  has_schema_privilege(current_user, 'public', 'CREATE')     AS cu_has_create_on_public_NON_DECISIVE,
  ((SELECT n.nspowner FROM pg_namespace n WHERE n.nspname = 'public')
     = (SELECT oid FROM pg_roles WHERE rolname = current_user)) AS cu_owns_public_schema_NON_DECISIVE,
  (SELECT r.rolname FROM pg_namespace n JOIN pg_roles r ON r.oid = n.nspowner
     WHERE n.nspname = 'public')                             AS public_schema_owner;

-- [F2] AUTHORITY-INPUT SUMMARY for the two owner scopes (derived from F1 facts;
--      still no permission test). eligible = superuser OR member of that owner.
SELECT
  (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS cu_is_superuser,
  ( (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)
    OR pg_has_role(current_user, 'postgres', 'MEMBER') )       AS eligible_for_postgres_default_alter,
  ( (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)
    OR pg_has_role(current_user, 'supabase_admin', 'MEMBER') ) AS eligible_for_supabase_admin_default_alter;

-- ############################################################################
-- ## END — every executable statement above begins with SELECT or WITH.
-- ############################################################################
