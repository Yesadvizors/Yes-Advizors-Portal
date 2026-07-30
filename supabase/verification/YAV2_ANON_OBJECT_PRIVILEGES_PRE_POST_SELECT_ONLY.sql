-- ============================================================================
-- YAV2 — Anon Object-Privileges — PRE/POST SELECT-ONLY VERIFICATION KIT
-- ----------------------------------------------------------------------------
-- File:    supabase/verification/YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql
-- Purpose: Confirm the EXACT current anon grants on the 28 in-scope tables, and
--          the EXPECTED post-migration state, for the R-ANON-OBJECT-PRIVILEGES
--          hardening. DESIGN/VERIFICATION ONLY — read-only.
--
-- STATUS:  DRAFT — NOT EXECUTED. No SQL run. No Supabase access.
--
-- ============================ SAFETY CONTRACT ===============================
--  * EVERY executable statement begins with SELECT or WITH.
--  * ZERO writes / ZERO DDL / ZERO GRANT/REVOKE / no ALTER DEFAULT PRIVILEGES.
--  * NO SET ROLE / SET SESSION AUTHORIZATION. NO application-function execution.
--  * OUTPUT: catalog metadata, booleans, and aggregate counts ONLY. No client
--    value, PII, PAN, GSTIN, TAN, CIN, LLPIN or financial figure is selected.
--  * PostgreSQL-17 MAINTAIN is included in every anon privilege rollup.
--
-- ============================ TARGET DISCIPLINE =============================
--  AUTHORISED (future exec only): yav2-dev / ogjrwemjefvccpyjwxuo
--  PROHIBITED:                    V1 / Production / zcszesuvjrryxtigjglt
--  Governing commit: 231fa39b608f6def9e6ed4b45ce5feb417c6f74f
--
--  HOW TO READ: run PRE blocks before any future migration; run POST blocks after.
--  POST blocks are written so a correctly-hardened DB yields the "expected post"
--  values noted in each header. NOTHING here mutates state.
-- ============================================================================


-- ############################################################################
-- ## SECTION S — SCOPE (the 28 tables, from the exact live evidence)
-- ############################################################################

-- [S0] SCOPE-INTEGRITY: all 28 named tables exist as base tables in public.
--      EXPECTED: found_base_tables = 28, missing = 0.
WITH scope(t) AS (VALUES
  ('accounting_tracker'),('audit_event_contract'),('audit_ingestion_failures'),
  ('audit_log'),('audit_tracker'),('claude_usage_log'),('client_directors'),
  ('client_financials'),('clients'),('completed_documents'),('compliance_calendar'),
  ('ct_team_members'),('documents'),('extracted_document_data'),('financial_years'),
  ('financials_tracker'),('follow_ups'),('gst_tracker'),('income_tax_tracker'),
  ('llp_tracker'),('notice_tracker'),('payroll_tracker'),('roc_tracker'),('tasks'),
  ('tds_client_config'),('tds_tracker'),('team'),('trust_ngo_tracker'))
SELECT
  count(*)                                                          AS scope_rows,
  count(*) FILTER (WHERE c.oid IS NOT NULL)                         AS found_base_tables,
  count(*) FILTER (WHERE c.oid IS NULL)                             AS missing
FROM scope s
LEFT JOIN pg_namespace n ON n.nspname = 'public'
LEFT JOIN pg_class c ON c.relname = s.t AND c.relnamespace = n.oid AND c.relkind = 'r';


-- ############################################################################
-- ## SECTION PRE — CURRENT STATE (run BEFORE any future migration)
-- ############################################################################

-- [PRE1] ANON privilege matrix per in-scope table (aclexplode; MAINTAIN incl.).
--        EXPECTED (current): every column TRUE, anon_priv_count = 8, for all 28.
WITH scope(t) AS (VALUES
  ('accounting_tracker'),('audit_event_contract'),('audit_ingestion_failures'),
  ('audit_log'),('audit_tracker'),('claude_usage_log'),('client_directors'),
  ('client_financials'),('clients'),('completed_documents'),('compliance_calendar'),
  ('ct_team_members'),('documents'),('extracted_document_data'),('financial_years'),
  ('financials_tracker'),('follow_ups'),('gst_tracker'),('income_tax_tracker'),
  ('llp_tracker'),('notice_tracker'),('payroll_tracker'),('roc_tracker'),('tasks'),
  ('tds_client_config'),('tds_tracker'),('team'),('trust_ngo_tracker')),
anon_privs AS (
  SELECT c.relname AS table_name, ae.privilege_type AS priv
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
  LEFT JOIN pg_roles r ON r.oid = ae.grantee
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND r.rolname = 'anon'
)
SELECT
  s.t AS table_name,
  bool_or(p.priv = 'SELECT')     AS anon_select,
  bool_or(p.priv = 'INSERT')     AS anon_insert,
  bool_or(p.priv = 'UPDATE')     AS anon_update,
  bool_or(p.priv = 'DELETE')     AS anon_delete,
  bool_or(p.priv = 'TRUNCATE')   AS anon_truncate,
  bool_or(p.priv = 'REFERENCES') AS anon_references,
  bool_or(p.priv = 'TRIGGER')    AS anon_trigger,
  bool_or(p.priv = 'MAINTAIN')   AS anon_maintain,
  count(p.priv)                  AS anon_priv_count
FROM scope s
LEFT JOIN anon_privs p ON p.table_name = s.t
GROUP BY s.t
ORDER BY s.t;

-- [PRE2] ANON rollup across the 28. EXPECTED (current): tables_with_any_anon = 28,
--        tables_with_object_priv = 28, total_anon_priv_rows = 224 (28 x 8).
WITH scope(t) AS (VALUES
  ('accounting_tracker'),('audit_event_contract'),('audit_ingestion_failures'),
  ('audit_log'),('audit_tracker'),('claude_usage_log'),('client_directors'),
  ('client_financials'),('clients'),('completed_documents'),('compliance_calendar'),
  ('ct_team_members'),('documents'),('extracted_document_data'),('financial_years'),
  ('financials_tracker'),('follow_ups'),('gst_tracker'),('income_tax_tracker'),
  ('llp_tracker'),('notice_tracker'),('payroll_tracker'),('roc_tracker'),('tasks'),
  ('tds_client_config'),('tds_tracker'),('team'),('trust_ngo_tracker')),
ap AS (
  SELECT c.relname AS table_name, ae.privilege_type AS priv
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
  LEFT JOIN pg_roles r ON r.oid = ae.grantee
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND r.rolname = 'anon'
),
per AS (
  SELECT s.t AS table_name,
         count(a.priv) AS n,
         bool_or(a.priv IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')) AS has_obj
  FROM scope s LEFT JOIN ap a ON a.table_name = s.t
  GROUP BY s.t
)
SELECT
  count(*) FILTER (WHERE n > 0)      AS tables_with_any_anon,
  count(*) FILTER (WHERE has_obj)    AS tables_with_object_priv,
  sum(n)                             AS total_anon_priv_rows
FROM per;

-- [PRE3] BASELINE for authenticated / service_role (to compare POST — must be
--        UNCHANGED by the hardening). Counts of held privileges per table+role.
WITH scope(t) AS (VALUES
  ('accounting_tracker'),('audit_event_contract'),('audit_ingestion_failures'),
  ('audit_log'),('audit_tracker'),('claude_usage_log'),('client_directors'),
  ('client_financials'),('clients'),('completed_documents'),('compliance_calendar'),
  ('ct_team_members'),('documents'),('extracted_document_data'),('financial_years'),
  ('financials_tracker'),('follow_ups'),('gst_tracker'),('income_tax_tracker'),
  ('llp_tracker'),('notice_tracker'),('payroll_tracker'),('roc_tracker'),('tasks'),
  ('tds_client_config'),('tds_tracker'),('team'),('trust_ngo_tracker'))
SELECT
  COALESCE(r.rolname, 'PUBLIC') AS grantee,
  count(*)                      AS privilege_rows
FROM scope s
JOIN pg_namespace n ON n.nspname = 'public'
JOIN pg_class c ON c.relname = s.t AND c.relnamespace = n.oid AND c.relkind = 'r'
CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
LEFT JOIN pg_roles r ON r.oid = ae.grantee
WHERE COALESCE(r.rolname, 'PUBLIC') IN ('authenticated','service_role','PUBLIC')
GROUP BY COALESCE(r.rolname, 'PUBLIC')
ORDER BY grantee;

-- [PRE4] DEFAULT-PRIVILEGE state — does a standing TABLE default grant anon
--        (for owners postgres / supabase_admin)? EXPECTED (current): rows present.
SELECT
  COALESCE(dr.rolname, '(unnamed)') AS default_for_role,
  COALESCE(gr.rolname, 'PUBLIC')    AS grantee,
  count(*)                          AS default_priv_rows
FROM pg_default_acl d
LEFT JOIN pg_roles     dr ON dr.oid = d.defaclrole
LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
LEFT JOIN pg_roles     gr ON gr.oid = ae.grantee
WHERE d.defaclobjtype = 'r'
  AND (d.defaclnamespace = 0 OR ns.nspname = 'public')
  AND COALESCE(gr.rolname, 'PUBLIC') = 'anon'
GROUP BY COALESCE(dr.rolname, '(unnamed)'), COALESCE(gr.rolname, 'PUBLIC')
ORDER BY default_for_role;


-- ############################################################################
-- ## SECTION POST — EXPECTED STATE (run AFTER a future authorised migration)
-- ############################################################################

-- [POST1] ANON residual privileges on the 28 tables. EXPECTED (post-hardening):
--         ZERO rows. Any row = a table where anon still holds a privilege.
WITH scope(t) AS (VALUES
  ('accounting_tracker'),('audit_event_contract'),('audit_ingestion_failures'),
  ('audit_log'),('audit_tracker'),('claude_usage_log'),('client_directors'),
  ('client_financials'),('clients'),('completed_documents'),('compliance_calendar'),
  ('ct_team_members'),('documents'),('extracted_document_data'),('financial_years'),
  ('financials_tracker'),('follow_ups'),('gst_tracker'),('income_tax_tracker'),
  ('llp_tracker'),('notice_tracker'),('payroll_tracker'),('roc_tracker'),('tasks'),
  ('tds_client_config'),('tds_tracker'),('team'),('trust_ngo_tracker'))
SELECT s.t AS table_name, ae.privilege_type AS anon_residual_privilege
FROM scope s
JOIN pg_namespace n ON n.nspname = 'public'
JOIN pg_class c ON c.relname = s.t AND c.relnamespace = n.oid AND c.relkind = 'r'
CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
JOIN pg_roles r ON r.oid = ae.grantee AND r.rolname = 'anon'
ORDER BY table_name, anon_residual_privilege;

-- [POST2] AUTHENTICATED / SERVICE_ROLE unchanged check. EXPECTED (post): the two
--         counts equal the [PRE3] baseline (hardening touches anon only).
WITH scope(t) AS (VALUES
  ('accounting_tracker'),('audit_event_contract'),('audit_ingestion_failures'),
  ('audit_log'),('audit_tracker'),('claude_usage_log'),('client_directors'),
  ('client_financials'),('clients'),('completed_documents'),('compliance_calendar'),
  ('ct_team_members'),('documents'),('extracted_document_data'),('financial_years'),
  ('financials_tracker'),('follow_ups'),('gst_tracker'),('income_tax_tracker'),
  ('llp_tracker'),('notice_tracker'),('payroll_tracker'),('roc_tracker'),('tasks'),
  ('tds_client_config'),('tds_tracker'),('team'),('trust_ngo_tracker'))
SELECT r.rolname AS grantee, count(*) AS privilege_rows
FROM scope s
JOIN pg_namespace n ON n.nspname = 'public'
JOIN pg_class c ON c.relname = s.t AND c.relnamespace = n.oid AND c.relkind = 'r'
CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
JOIN pg_roles r ON r.oid = ae.grantee
WHERE r.rolname IN ('authenticated','service_role')
GROUP BY r.rolname
ORDER BY grantee;

-- [POST3] DEFAULT-PRIVILEGE anon residual. EXPECTED (post): ZERO rows (no default
--         TABLE grant to anon for postgres OR supabase_admin).
SELECT
  COALESCE(dr.rolname, '(unnamed)') AS default_for_role,
  ae.privilege_type                 AS anon_default_privilege
FROM pg_default_acl d
LEFT JOIN pg_roles     dr ON dr.oid = d.defaclrole
LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
JOIN pg_roles gr ON gr.oid = ae.grantee AND gr.rolname = 'anon'
WHERE d.defaclobjtype = 'r'
  AND (d.defaclnamespace = 0 OR ns.nspname = 'public')
ORDER BY default_for_role, anon_default_privilege;

-- [POST4] RLS / policy hygiene unchanged. EXPECTED (post): rls_enabled_tables = 39,
--         anon_or_public_policies = 0, authenticated_all_policies = 0 (unchanged).
SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity)          AS rls_enabled_tables,
  (SELECT count(*) FROM pg_policy pol
     CROSS JOIN LATERAL unnest(
       CASE WHEN cardinality(pol.polroles)=0 THEN ARRAY[0]::oid[] ELSE pol.polroles END) AS ro
     LEFT JOIN pg_roles r ON r.oid = ro
     WHERE ro = 0 OR r.rolname = 'anon')                                       AS anon_or_public_policy_targets,
  (SELECT count(*) FROM pg_policies
     WHERE schemaname='public' AND policyname LIKE '%\_authenticated\_all' ESCAPE '\') AS authenticated_all_policies;

-- ############################################################################
-- ## END — every executable statement above begins with SELECT or WITH.
-- ############################################################################
