-- ============================================================================
-- YAV2 — Anon Object-Privileges — PRE/POST SELECT-ONLY VERIFICATION KIT
-- ----------------------------------------------------------------------------
-- File:    supabase/verification/YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql
-- Purpose: Confirm EXACT current anon grants on the 28 in-scope tables and the
--          EXPECTED post-state, reported SEPARATELY for the two hardening stages:
--            STAGE A (object-level: TRUNCATE/REFERENCES/TRIGGER/MAINTAIN)
--            STAGE B (data-level:   SELECT/INSERT/UPDATE/DELETE)
--          plus owner-scoped pg_default_acl rows for postgres AND supabase_admin.
--          DESIGN/VERIFICATION ONLY — read-only.
--
-- STATUS:  DRAFT — NOT EXECUTED. No SQL run. No Supabase access.
--
-- ============================ SAFETY CONTRACT ===============================
--  * EVERY executable statement begins with SELECT or WITH.
--  * ZERO writes / ZERO DDL / ZERO GRANT/REVOKE / no ALTER DEFAULT PRIVILEGES.
--  * NO SET ROLE / SET SESSION AUTHORIZATION. NO application-function execution.
--  * OUTPUT: catalog metadata, booleans, aggregate counts ONLY. No client value,
--    PII, PAN, GSTIN, TAN, CIN, LLPIN or financial figure is selected.
--  * PostgreSQL-17 MAINTAIN is included explicitly.
--
-- ============================ TARGET DISCIPLINE =============================
--  AUTHORISED (future exec only): yav2-dev / ogjrwemjefvccpyjwxuo
--  PROHIBITED:                    V1 / Production / zcszesuvjrryxtigjglt
--  Governing commit: 231fa39b608f6def9e6ed4b45ce5feb417c6f74f
--  Proposal: supabase/design/YAV2_ANON_OBJECT_PRIVILEGES_HARDENING_PROPOSED.sql
--
--  Run [S0]+PRE blocks before any future migration; run POST blocks after each
--  stage (A-POST after Stage A; B-POST after Stage B). NOTHING here mutates state.
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
-- ## SECTION A-PRE — STAGE A OBJECT-LEVEL CURRENT STATE (run before Stage A)
-- ##   Object-level privileges are NOT mediated by RLS. MAINTAIN is PG-17.
-- ############################################################################

-- [A-PRE1] anon OBJECT-LEVEL matrix per in-scope table.
--          EXPECTED (current): every column TRUE, object_priv_count = 4, all 28.
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
  bool_or(p.priv = 'TRUNCATE')   AS anon_truncate,
  bool_or(p.priv = 'REFERENCES') AS anon_references,
  bool_or(p.priv = 'TRIGGER')    AS anon_trigger,
  bool_or(p.priv = 'MAINTAIN')   AS anon_maintain,
  count(*) FILTER (WHERE p.priv IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')) AS object_priv_count
FROM scope s
LEFT JOIN anon_privs p ON p.table_name = s.t
GROUP BY s.t
ORDER BY s.t;

-- [A-PRE2] Stage A rollup. EXPECTED (current): tables_with_object_priv = 28,
--          total_object_priv_rows = 112 (28 x 4).
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
    AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
)
SELECT
  count(DISTINCT a.table_name) AS tables_with_object_priv,
  count(a.priv)                AS total_object_priv_rows
FROM scope s LEFT JOIN ap a ON a.table_name = s.t;


-- ############################################################################
-- ## SECTION A-POST — STAGE A EXPECTED STATE (run AFTER Stage A)
-- ############################################################################

-- [A-POST1] anon OBJECT-LEVEL residual on the 28. EXPECTED (post-Stage-A): ZERO
--           rows. (Data privileges may still exist until Stage B — see B-POST.)
WITH scope(t) AS (VALUES
  ('accounting_tracker'),('audit_event_contract'),('audit_ingestion_failures'),
  ('audit_log'),('audit_tracker'),('claude_usage_log'),('client_directors'),
  ('client_financials'),('clients'),('completed_documents'),('compliance_calendar'),
  ('ct_team_members'),('documents'),('extracted_document_data'),('financial_years'),
  ('financials_tracker'),('follow_ups'),('gst_tracker'),('income_tax_tracker'),
  ('llp_tracker'),('notice_tracker'),('payroll_tracker'),('roc_tracker'),('tasks'),
  ('tds_client_config'),('tds_tracker'),('team'),('trust_ngo_tracker'))
SELECT s.t AS table_name, ae.privilege_type AS anon_object_residual
FROM scope s
JOIN pg_namespace n ON n.nspname = 'public'
JOIN pg_class c ON c.relname = s.t AND c.relnamespace = n.oid AND c.relkind = 'r'
CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
JOIN pg_roles r ON r.oid = ae.grantee AND r.rolname = 'anon'
WHERE ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
ORDER BY table_name, anon_object_residual;


-- ############################################################################
-- ## SECTION B-PRE — STAGE B DATA-LEVEL CURRENT STATE (run before Stage B)
-- ##   Data privileges ARE RLS-mediated; anon already denied at row level.
-- ############################################################################

-- [B-PRE1] anon DATA-LEVEL matrix per in-scope table.
--          EXPECTED (current): every column TRUE, data_priv_count = 4, all 28.
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
  bool_or(p.priv = 'SELECT') AS anon_select,
  bool_or(p.priv = 'INSERT') AS anon_insert,
  bool_or(p.priv = 'UPDATE') AS anon_update,
  bool_or(p.priv = 'DELETE') AS anon_delete,
  count(*) FILTER (WHERE p.priv IN ('SELECT','INSERT','UPDATE','DELETE')) AS data_priv_count
FROM scope s
LEFT JOIN anon_privs p ON p.table_name = s.t
GROUP BY s.t
ORDER BY s.t;

-- [B-PRE2] Stage B rollup. EXPECTED (current): tables_with_data_priv = 28,
--          total_data_priv_rows = 112 (28 x 4).
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
    AND ae.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
)
SELECT
  count(DISTINCT a.table_name) AS tables_with_data_priv,
  count(a.priv)                AS total_data_priv_rows
FROM scope s LEFT JOIN ap a ON a.table_name = s.t;


-- ############################################################################
-- ## SECTION B-POST — STAGE B EXPECTED STATE (run AFTER Stage B)
-- ############################################################################

-- [B-POST1] anon TOTAL residual on the 28 (all 8 privileges). EXPECTED (post-
--           Stage-B): ZERO rows — anon holds nothing on any in-scope table.
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


-- ############################################################################
-- ## SECTION BASE — AUTHENTICATED / SERVICE_ROLE (must be UNCHANGED by A or B)
-- ############################################################################

-- [BASE1] Baseline & post-comparison for authenticated / service_role. Capture
--         BEFORE, and re-run AFTER each stage — the two counts must be IDENTICAL
--         (the hardening touches anon only). EXPECTED: same value pre and post.
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


-- ############################################################################
-- ## SECTION DEF — OWNER-SCOPED DEFAULT PRIVILEGES (postgres + supabase_admin)
-- ##   Split object-level vs data-level, per owner scope.
-- ############################################################################

-- [DEF-PRE1] Current default TABLE privileges granting anon, per owner scope,
--            split object vs data. EXPECTED (current): rows for BOTH
--            default_for_role = postgres AND supabase_admin, with object and data
--            privileges present (MAINTAIN included in object).
SELECT
  COALESCE(dr.rolname, '(unnamed)') AS default_for_role,
  count(*) FILTER (WHERE ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')) AS anon_object_default_rows,
  count(*) FILTER (WHERE ae.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE'))          AS anon_data_default_rows
FROM pg_default_acl d
LEFT JOIN pg_roles     dr ON dr.oid = d.defaclrole
LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
JOIN pg_roles gr ON gr.oid = ae.grantee AND gr.rolname = 'anon'
WHERE d.defaclobjtype = 'r'
  AND (d.defaclnamespace = 0 OR ns.nspname = 'public')
GROUP BY COALESCE(dr.rolname, '(unnamed)')
ORDER BY default_for_role;

-- [DEF-POST-A] After Stage A: no anon OBJECT-level default rows for EITHER owner.
--              EXPECTED (post-Stage-A): ZERO rows. (Data-level defaults may remain
--              until Stage B.)
SELECT
  COALESCE(dr.rolname, '(unnamed)') AS default_for_role,
  ae.privilege_type                 AS anon_object_default_residual
FROM pg_default_acl d
LEFT JOIN pg_roles     dr ON dr.oid = d.defaclrole
LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
JOIN pg_roles gr ON gr.oid = ae.grantee AND gr.rolname = 'anon'
WHERE d.defaclobjtype = 'r'
  AND (d.defaclnamespace = 0 OR ns.nspname = 'public')
  AND ae.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
ORDER BY default_for_role, anon_object_default_residual;

-- [DEF-POST-B] After Stage B: no anon default rows AT ALL for EITHER owner.
--              EXPECTED (post-Stage-B): ZERO rows.
SELECT
  COALESCE(dr.rolname, '(unnamed)') AS default_for_role,
  ae.privilege_type                 AS anon_default_residual
FROM pg_default_acl d
LEFT JOIN pg_roles     dr ON dr.oid = d.defaclrole
LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
JOIN pg_roles gr ON gr.oid = ae.grantee AND gr.rolname = 'anon'
WHERE d.defaclobjtype = 'r'
  AND (d.defaclnamespace = 0 OR ns.nspname = 'public')
ORDER BY default_for_role, anon_default_residual;


-- ############################################################################
-- ## SECTION HYG — RLS / POLICY HYGIENE (must be UNCHANGED by A or B)
-- ############################################################################

-- [HYG1] EXPECTED (pre and post, unchanged): rls_enabled_tables = 39,
--        anon_or_public_policy_targets = 0, authenticated_all_policies = 0.
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
