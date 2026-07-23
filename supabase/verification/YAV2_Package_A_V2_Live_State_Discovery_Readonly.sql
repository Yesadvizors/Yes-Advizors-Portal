-- ============================================================================
-- YAV2 — Package A — Supabase V2 LIVE-STATE DISCOVERY (READ-ONLY)
-- Issue #23 · Package A · governing HEAD b2ceb30edccc7a209c4459fdb5c9df7caa51bcfb
-- ============================================================================
-- AUTHORISED TARGET (V2 / yav2-dev) ONLY: ogjrwemjefvccpyjwxuo
-- STRICTLY PROHIBITED (V1 / Production):  zcszesuvjrryxtigjglt  -- DO NOT RUN HERE
--
-- WHO RUNS THIS: PJ executes manually in the Supabase V2 SQL editor. Claude does
--   NOT execute SQL and does not touch the database. Copy the FULL sectioned
--   output back to Claude + ChatGPT for the Package A / Package B registers.
--
-- SAFETY CONTRACT (verify before running):
--   * READ-ONLY. SELECT only. No DDL, no DML, no COPY, no function calls that
--     mutate, no role/grant changes, no security bypass, no VACUUM/ANALYZE.
--   * The session is forced READ ONLY below; any accidental write will error.
--   * No password hashes, tokens, OTPs or secret values are selected. Auth/user
--     queries return counts/status/metadata only.
--   * If your editor runs statements in one session, the READ ONLY setting
--     protects the whole run. If it errors on SET, run each SELECT as-is — they
--     are all read-only regardless.
--
-- PRECONDITION CHECK — abort if this is not V2:
--   Section 0 prints the project ref hint. If it is NOT ogjrwemjefvccpyjwxuo,
--   STOP immediately and run nothing further.
-- ============================================================================

SET TRANSACTION READ ONLY;
SET statement_timeout = '120s';

-- ========================= SECTION 0 — ENVIRONMENT IDENTITY =================
SELECT '0. ENVIRONMENT IDENTITY' AS section;
SELECT current_database()                         AS current_database,
       current_user                              AS current_user,
       version()                                 AS pg_version,
       current_setting('app.settings.project_ref', true) AS project_ref_setting_hint,
       inet_server_addr()::text                  AS server_addr_hint;
-- Project-ref confirmation: compare the Supabase dashboard URL / project settings
-- to ogjrwemjefvccpyjwxuo. If it does not match, STOP.
SELECT name, default_version, installed_version
FROM pg_available_extensions
WHERE installed_version IS NOT NULL
ORDER BY name;

-- ========================= SECTION 1 — SCHEMAS & OBJECT COUNTS ==============
SELECT '1. SCHEMAS & OBJECT COUNTS' AS section;
SELECT nspname AS schema,
       (SELECT count(*) FROM pg_class c WHERE c.relnamespace = n.oid AND c.relkind='r') AS tables,
       (SELECT count(*) FROM pg_class c WHERE c.relnamespace = n.oid AND c.relkind='v') AS views,
       (SELECT count(*) FROM pg_class c WHERE c.relnamespace = n.oid AND c.relkind='m') AS matviews,
       (SELECT count(*) FROM pg_class c WHERE c.relnamespace = n.oid AND c.relkind='S') AS sequences
FROM pg_namespace n
WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'
ORDER BY nspname;

-- ========================= SECTION 2 — TABLES & COLUMNS ====================
SELECT '2. TABLES & COLUMNS (public)' AS section;
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public'
ORDER BY table_name, ordinal_position;

-- ========================= SECTION 3 — KEYS & CONSTRAINTS ==================
SELECT '3. CONSTRAINTS (PK/FK/UNIQUE/CHECK)' AS section;
SELECT n.nspname AS schema, rel.relname AS table_name, con.conname AS constraint_name,
       CASE con.contype WHEN 'p' THEN 'PK' WHEN 'f' THEN 'FK' WHEN 'u' THEN 'UNIQUE'
            WHEN 'c' THEN 'CHECK' ELSE con.contype::text END AS type,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace n ON n.oid = rel.relnamespace
WHERE n.nspname = 'public'
ORDER BY rel.relname, type, con.conname;

-- ========================= SECTION 4 — INDEXES (incl. partial/unique) ======
SELECT '4. INDEXES' AS section;
SELECT schemaname AS schema, tablename AS table_name, indexname AS index_name, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ========================= SECTION 5 — ENUMS ===============================
SELECT '5. ENUMS' AS section;
SELECT t.typname AS enum_type, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS labels
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- ========================= SECTION 6 — VIEWS & MATVIEWS ====================
SELECT '6. VIEWS' AS section;
SELECT table_name AS view_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
SELECT '6b. MATERIALIZED VIEWS' AS section;
SELECT matviewname, ispopulated FROM pg_matviews WHERE schemaname='public' ORDER BY matviewname;

-- ========================= SECTION 7 — FUNCTIONS (security mode/owner/path) =
SELECT '7. FUNCTIONS' AS section;
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security,
       pg_get_userbyid(p.proowner) AS owner,
       (SELECT string_agg(cfg, ', ') FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%') AS search_path,
       l.lanname AS language,
       t.typname AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
JOIN pg_type t ON t.oid = p.prorettype
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- ========================= SECTION 8 — TRIGGERS ============================
SELECT '8. TRIGGERS' AS section;
SELECT event_object_table AS table_name, trigger_name, action_timing, event_manipulation,
       action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ========================= SECTION 9 — MIGRATION RECONCILIATION ============
SELECT '9. MIGRATION RECORDS (supabase_migrations.schema_migrations)' AS section;
-- Supabase stores applied migrations here when the CLI is used. If empty, this
-- project was migrated by direct SQL (expected for this project) — rely on
-- object existence (Section 2/3) instead.
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;

SELECT '9b. EXPECTED-OBJECT EXISTENCE (governing migrations 0001-0022)' AS section;
WITH expected(obj, kind) AS (VALUES
  ('clients','table'), ('client_persons','table'), ('client_directors','table'),
  ('client_identifiers','table'), ('client_addresses','table'), ('client_contacts','table'),
  ('client_registrations','table'), ('gst_registration_details','table'),
  ('client_service_applicability','table'), ('service_catalogue','table'),
  ('client_financials','table'), ('financials_tracker','table'), ('financial_years','table'),
  ('tasks','table'), ('follow_ups','table'), ('documents','table'), ('completed_documents','table'),
  ('extracted_document_data','table'), ('team','table'), ('claude_usage_log','table'),
  ('compliance_calendar','table'), ('accounting_tracker','table'), ('gst_tracker','table'),
  ('tds_tracker','table'), ('income_tax_tracker','table'), ('roc_tracker','table'),
  ('llp_tracker','table'), ('audit_tracker','table'), ('notice_tracker','table'),
  ('v_firm_dashboard','view'), ('v_client_compliance_summary','view'),
  ('v_team_workload','view'), ('v_overdue_ageing','view')
)
SELECT e.obj, e.kind,
       CASE WHEN c.relname IS NOT NULL THEN 'PRESENT' ELSE 'MISSING' END AS live_state,
       CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' WHEN 'm' THEN 'matview' END AS actual_kind
FROM expected e
LEFT JOIN pg_class c ON c.relname = e.obj
   AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
ORDER BY e.kind, e.obj;
-- Note re migration numbering: 0012 (secure-docs) has no repo file (provenance
-- gap R-9); 0013/0019/0020 unused/never-assigned; 0014 (FY repair) must remain
-- unchanged; confirm 0021/0022 objects (client_service_applicability etc.) exist.

-- ========================= SECTION 10 — RLS & PRIVILEGES ===================
SELECT '10. RLS ENABLED / FORCE RLS' AS section;
SELECT n.nspname AS schema, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
ORDER BY c.relname;

SELECT '10b. RLS POLICIES' AS section;
SELECT schemaname, tablename AS table_name, policyname, cmd AS command, roles::text AS roles,
       qual AS using_expr, with_check AS with_check_expr
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename, policyname;

SELECT '10c. TABLE GRANTS (public)' AS section;
SELECT grantee, table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role')
GROUP BY grantee, table_name
ORDER BY table_name, grantee;

SELECT '10d. FUNCTION EXECUTE GRANTS (anon/authenticated/service_role)' AS section;
SELECT r.rolname AS grantee, p.proname AS function_name,
       has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
CROSS JOIN (SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')) r
WHERE n.nspname='public'
  AND p.proname IN ('activate_accounting_service','generate_client_compliance','get_sensitive_audit_logs')
ORDER BY p.proname, grantee;

-- ========================= SECTION 11 — AUTH & TEAM MAPPING (metadata) =====
SELECT '11. AUTH USERS (metadata only — no secrets)' AS section;
SELECT count(*) AS auth_users_total,
       count(*) FILTER (WHERE email_confirmed_at IS NOT NULL) AS confirmed,
       count(*) FILTER (WHERE email_confirmed_at IS NULL)     AS unconfirmed,
       count(*) FILTER (WHERE banned_until IS NOT NULL AND banned_until > now()) AS currently_banned
FROM auth.users;

SELECT '11b. TEAM ROWS & ROLES' AS section;
SELECT count(*) AS team_total,
       count(*) FILTER (WHERE is_active) AS active,
       count(*) FILTER (WHERE NOT is_active) AS inactive
FROM team;
SELECT COALESCE(portal_role,'(null)') AS portal_role,
       count(*) AS n,
       count(*) FILTER (WHERE is_admin) AS admins
FROM team GROUP BY portal_role ORDER BY portal_role;

SELECT '11c. AUTH<->TEAM MAPPING INTEGRITY' AS section;
SELECT
  (SELECT count(*) FROM team WHERE auth_user_id IS NOT NULL) AS team_with_auth,
  (SELECT count(*) FROM team WHERE auth_user_id IS NULL)     AS team_without_auth,
  (SELECT count(*) FROM (SELECT auth_user_id FROM team WHERE auth_user_id IS NOT NULL
                          GROUP BY auth_user_id HAVING count(*)>1) d) AS duplicate_auth_mappings,
  (SELECT count(*) FROM auth.users u WHERE NOT EXISTS
       (SELECT 1 FROM team t WHERE t.auth_user_id = u.id))   AS orphan_auth_users,
  (SELECT count(*) FROM team t WHERE t.auth_user_id IS NOT NULL AND NOT EXISTS
       (SELECT 1 FROM auth.users u WHERE u.id = t.auth_user_id)) AS orphan_team_rows;
-- Emails may be listed for the approved test users ONLY, if PJ needs them for the
-- Auth/RBAC evidence template (A5). Uncomment intentionally if approved:
-- SELECT email, is_admin, portal_role, is_active FROM team WHERE email ILIKE '%yesadvizors%' ORDER BY email;

-- ========================= SECTION 12 — BUSINESS/MODULE COUNTS =============
SELECT '12. MODULE DATA COUNTS (counts only)' AS section;
SELECT 'clients' AS table, count(*) FROM clients
UNION ALL SELECT 'client_persons', count(*) FROM client_persons
UNION ALL SELECT 'client_directors', count(*) FROM client_directors
UNION ALL SELECT 'client_service_applicability', count(*) FROM client_service_applicability
UNION ALL SELECT 'tasks', count(*) FROM tasks
UNION ALL SELECT 'compliance_calendar', count(*) FROM compliance_calendar
UNION ALL SELECT 'documents', count(*) FROM documents
UNION ALL SELECT 'completed_documents', count(*) FROM completed_documents
UNION ALL SELECT 'team', count(*) FROM team
UNION ALL SELECT 'audit_tracker', count(*) FROM audit_tracker
ORDER BY 1;
-- If any table above does not exist, comment that line and re-run (existence is
-- authoritatively reported in Section 9b).

-- ========================= SECTION 13 — STORAGE ============================
SELECT '13. STORAGE BUCKETS' AS section;
SELECT id, name, public, created_at FROM storage.buckets ORDER BY name;
SELECT '13b. STORAGE OBJECT COUNTS PER BUCKET' AS section;
SELECT bucket_id, count(*) AS objects FROM storage.objects GROUP BY bucket_id ORDER BY bucket_id;
SELECT '13c. STORAGE RLS POLICIES' AS section;
SELECT tablename, policyname, cmd, roles::text FROM pg_policies
WHERE schemaname='storage' ORDER BY tablename, policyname;

-- ========================= SECTION 14 — EDGE FUNCTION REFERENCES ===========
SELECT '14. EDGE FUNCTION / SECRET-CONFIG NAME HINTS (no values)' AS section;
-- Deployed Edge Functions are NOT listed in the SQL catalog; confirm the deployed
-- set + versions from the Supabase Dashboard (Edge Functions) or CLI:
--   supabase functions list --project-ref ogjrwemjefvccpyjwxuo
-- Expected by governing source: ai-agent, extract-financial, scan-document.
-- Expected by dKYC branch (#10, not in governing): dkyc-verify-upload.
-- Record NAMES and versions only; never paste secret values.
SELECT 'confirm via dashboard/CLI — see comment' AS edge_function_discovery;

-- ========================= SECTION 15 — AUDIT & SECURITY ===================
SELECT '15. AUDIT TABLES / OBJECTS' AS section;
SELECT c.relname AS object, c.relkind, c.relrowsecurity AS rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND (c.relname ILIKE '%audit%' OR c.relname ILIKE '%event%')
ORDER BY c.relname;
SELECT '15b. AUDIT-RELATED FUNCTIONS' AS section;
SELECT p.proname, CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND (p.proname ILIKE '%audit%' OR p.proname ILIKE '%event%')
ORDER BY p.proname;

SELECT 'END OF PACKAGE A DISCOVERY — copy ALL sections back to Claude + ChatGPT' AS done;
