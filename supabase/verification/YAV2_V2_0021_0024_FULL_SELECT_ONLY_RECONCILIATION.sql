-- ============================================================================
-- YAV2 — Portal V2 — FULL SELECT-ONLY LIVE-STATE RECONCILIATION KIT (0021–0024)
-- ----------------------------------------------------------------------------
-- File:    supabase/verification/YAV2_V2_0021_0024_FULL_SELECT_ONLY_RECONCILIATION.sql
-- Purpose: Read-only reconciliation of live V2 state against the governing repo
--          for objects/migrations 0021, 0022, 0023, 0024 and their dependencies
--          (P5 Service Applicability, T4 grants/search_path hardening, P6 FY
--          generation, get_current_fy, financial years, RLS/FORCE, grants,
--          Compliance Tracker posture, G-11 non-impact protected counts).
--
-- STATUS:  DRAFT — NOT EXECUTED. Authored locally. No SQL has been run.
--
-- ============================ SAFETY CONTRACT ===============================
--  * EVERY executable statement in this file begins with SELECT or WITH.
--  * ZERO writes: no INSERT/UPDATE/DELETE/UPSERT/MERGE, no DDL
--    (CREATE/ALTER/DROP/TRUNCATE/COMMENT/SECURITY LABEL), no GRANT/REVOKE,
--    no DO/CALL/COPY/VACUUM/ANALYZE/REFRESH, no SET ROLE / SET SESSION
--    AUTHORIZATION, no write transaction blocks.
--  * It performs read-only catalog inspection, controlled reference-data
--    inspection (e.g. service_catalogue codes), aggregate row counts, and
--    non-sensitive integrity/anomaly queries against application tables ONLY.
--    It does NOT invoke any application function. In particular it does NOT call
--    public.get_current_fy() (which is owner-only and STABLE); the current FY is
--    derived from public.financial_years by a pure SELECT so no application code
--    is executed. No sensitive client values are selected anywhere.
--  * OUTPUT DISCIPLINE: counts, booleans, catalog metadata and function/policy
--    definitions ONLY. No client PII, PAN, Aadhaar, GSTIN or financial values
--    are selected anywhere.
--
-- ============================ TARGET DISCIPLINE =============================
--  AUTHORISED TARGET (only): Supabase project  yav2-dev
--                            project ref        ogjrwemjefvccpyjwxuo   (V2 / dev)
--  STRICTLY PROHIBITED:      V1 / Production
--                            project ref        zcszesuvjrryxtigjglt
--  SQL cannot prove the Supabase project ref. Block [A5] forces the operator to
--  confirm the project name+ref in the Supabase Editor header BEFORE running any
--  further block. If identity cannot be established, STOP — do not run.
--
-- ============================ HOW TO RUN ====================================
--  Run each numbered block independently, top to bottom, in the yav2-dev SQL
--  Editor. Capture every result into the evidence template. Blocks are
--  independent; a failure/permission error in one does not invalidate others —
--  label that block UNKNOWN / NOT VISIBLE and continue. See the Execution Guide:
--  docs/v2-reconciliation/YAV2_V2_RECONCILIATION_EXECUTION_GUIDE.md
--
--  Governing baseline commit: c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5
--  Governing branch:          sync/integration
--  Kit branch (local only):   verification/v2-0021-0024-reconciliation-kit
-- ============================================================================


-- ############################################################################
-- ## SECTION A — ENVIRONMENT FINGERPRINT
-- ##   Prove WHERE you are before you read anything else.
-- ############################################################################

-- [A1] Core session identity (database, users, timestamp, IST clock).
--      EXPECTED: db_name = 'postgres' (Supabase default). run_as is the Editor
--      role. executed_at_utc / executed_at_ist show the run time (drives the
--      current-FY assertion in Section G).
SELECT
  current_database()                                   AS db_name,
  current_user                                         AS run_as,
  session_user                                         AS session_user,
  now()                                                AS executed_at_utc,
  (now() AT TIME ZONE 'Asia/Kolkata')                  AS executed_at_ist,
  (now() AT TIME ZONE 'Asia/Kolkata')::date            AS ist_date_for_fy;

-- [A2] Server/version identification (safe, non-secret).
SELECT
  version()                                            AS pg_version,
  current_setting('server_version')                    AS server_version,
  current_setting('server_version_num')                AS server_version_num,
  current_setting('search_path')                       AS session_search_path,
  current_setting('TimeZone')                          AS session_timezone;

-- [A3] Server address fingerprint (may be NULL on pooled/managed connections —
--      that is acceptable, it is only a weak locator, never a project-ref proof).
SELECT
  inet_server_addr()                                   AS server_ip_nullable,
  inet_server_port()                                   AS server_port_nullable;

-- [A4] Installed extensions (fingerprint; helps distinguish environments).
SELECT name, default_version, installed_version
FROM pg_available_extensions
WHERE installed_version IS NOT NULL
ORDER BY name;

-- [A5] OPERATOR CONFIRMATION GATE — project identity.
--      SQL cannot read the Supabase project ref. Look at the Supabase Editor
--      header NOW and confirm it reads project "yav2-dev" / ref
--      "ogjrwemjefvccpyjwxuo". If it shows "zcszesuvjrryxtigjglt" or any other
--      project: STOP IMMEDIATELY and run nothing else.
SELECT
  'MANUAL CONFIRMATION REQUIRED'                        AS action,
  'ogjrwemjefvccpyjwxuo'                                AS required_project_ref_V2_yav2_dev,
  'zcszesuvjrryxtigjglt'                                AS prohibited_project_ref_V1_prod,
  'Confirm the Editor header shows yav2-dev before continuing. If not, STOP.'
                                                        AS operator_instruction;


-- ############################################################################
-- ## SECTION B — MIGRATION-LEDGER VISIBILITY
-- ##   Discover the ledger honestly. Do NOT infer applied status from filenames.
-- ############################################################################

-- [B1] Is the Supabase migration-ledger schema present at all?
--      EXPECTED (per prior evidence): schema often ABSENT on this project
--      (migrations applied by direct SQL). If 0 rows -> ledger NOT VISIBLE ->
--      applied-status of every migration remains UNKNOWN from the ledger.
SELECT n.nspname AS schema_name
FROM pg_namespace n
WHERE n.nspname IN ('supabase_migrations')
ORDER BY 1;

-- [B2] Is the ledger table present, and what columns does it carry?
SELECT table_schema, table_name, column_name, data_type, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'supabase_migrations'
  AND table_name   = 'schema_migrations'
ORDER BY ordinal_position;

-- [B3] Ledger entries.
--      >>> PREREQUISITE GATE: run this block ONLY IF [B2] confirmed BOTH:
--          (a) supabase_migrations.schema_migrations exists, AND
--          (b) the 'version' and 'name' columns are present in [B2]'s output.
--          If [B1]/[B2] were empty or permission-denied, DO NOT run [B3];
--          label it 'SKIPPED — PREREQUISITE NOT MET' (ledger -> NOT VISIBLE).
--      Look for versions/names referencing 0021, 0022, 0023, 0024. Their
--      ABSENCE does NOT prove non-application; their PRESENCE is positive
--      ledger evidence.
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- [B4] Fallback provenance signal — do ANY of the 0021/0022 hallmark objects
--      exist? (This is object-existence, NOT ledger proof. It only tells you
--      whether the schema effect of a migration is present, never that the
--      migration "was applied" via a runner.)
SELECT
  (to_regclass('public.service_catalogue')             IS NOT NULL) AS svc_catalogue_present,
  (to_regclass('public.client_service_applicability')  IS NOT NULL) AS csa_present,
  (to_regprocedure('public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)') IS NOT NULL) AS rpc_create_present;


-- ############################################################################
-- ## SECTION C — OBJECT INVENTORY FOR 0021–0024
-- ##   Existence / schema / type / owner / definition-fingerprint / metadata.
-- ############################################################################

-- [C1] Expected-object PRESENT/MISSING matrix (0021/0022 material objects).
--      catalog-safe: reports state as data, never errors on a missing object.
WITH expected(obj, kind, source_migration) AS (
  VALUES
    ('service_catalogue',                'table', '0021'),
    ('client_service_applicability',     'table', '0021')
)
SELECT
  e.source_migration,
  e.obj,
  e.kind                                               AS expected_kind,
  CASE WHEN c.relname IS NOT NULL THEN 'PRESENT' ELSE 'MISSING' END AS live_state,
  CASE c.relkind
       WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' WHEN 'm' THEN 'matview'
       WHEN 'S' THEN 'sequence' WHEN 'i' THEN 'index' ELSE c.relkind::text END AS actual_kind,
  pg_get_userbyid(c.relowner)                          AS owner
FROM expected e
LEFT JOIN pg_class c
       ON c.relname = e.obj
      AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY e.obj;

-- [C2] Column inventory for the two P5 tables (types/nullability/defaults).
--      Compare against 0021 source. No data values, columns only.
SELECT c.table_name, c.ordinal_position, c.column_name, c.data_type,
       c.character_maximum_length, c.is_nullable, c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN ('service_catalogue', 'client_service_applicability')
ORDER BY c.table_name, c.ordinal_position;

-- [C3] Named constraints attributable to 0021/0022 — existence + exact definition.
--      EXPECTED names: client_registrations_id_client_uq (UNIQUE, 0021),
--      csa_dates_chk, csa_effective_from_gate_chk,
--      csa_effective_to_null_when_approved_chk, csa_approval_actor_chk,
--      csa_registration_same_client_fk (FK, 0021),
--      csa_other_notes_required_chk (CHECK, 0022).
SELECT r.relname AS table_name,
       con.conname AS constraint_name,
       CASE con.contype WHEN 'p' THEN 'PK' WHEN 'f' THEN 'FK'
                        WHEN 'u' THEN 'UNIQUE' WHEN 'c' THEN 'CHECK'
                        ELSE con.contype::text END AS constraint_type,
       con.confdeltype AS fk_on_delete,        -- 'r' = RESTRICT (expected on FKs)
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class     r ON r.oid = con.conrelid
JOIN pg_namespace n ON n.oid = r.relnamespace
WHERE n.nspname = 'public'
  AND con.conname IN (
    'client_registrations_id_client_uq',
    'csa_dates_chk',
    'csa_effective_from_gate_chk',
    'csa_effective_to_null_when_approved_chk',
    'csa_approval_actor_chk',
    'csa_registration_same_client_fk',
    'csa_other_notes_required_chk')
ORDER BY r.relname, con.conname;

-- [C4] Indexes on the two P5 tables — existence + exact indexdef.
--      EXPECTED: idx_csa_client, idx_csa_service,
--      client_service_applicability_live_uq (UNIQUE partial WHERE status<>'Inactive'),
--      plus the PK indexes.
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('service_catalogue', 'client_service_applicability')
ORDER BY tablename, indexname;

-- [C5] Triggers on the P5 tables. EXPECTED: NONE (0021/0022 author no triggers).
--      Any row here is a DIVERGENCE to record.
SELECT event_object_table AS table_name, trigger_name, action_timing,
       event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('service_catalogue', 'client_service_applicability')
ORDER BY event_object_table, trigger_name;

-- [C6] Table comments (metadata) for the P5 tables.
SELECT c.relname AS table_name,
       obj_description(c.oid, 'pg_class') AS table_comment
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('service_catalogue', 'client_service_applicability')
ORDER BY c.relname;

-- [C7] Reference-data shape for service_catalogue (COUNT + code list only —
--      these are non-sensitive controlled reference codes, not client data).
--      EXPECTED: 11 codes (ACCOUNTING, GST, TDS, PAYROLL, INCOME_TAX, ROC, LLP,
--      STATUTORY_AUDIT, TAX_AUDIT, SECRETARIAL, OTHER).
SELECT
  (SELECT count(*) FROM public.service_catalogue)                    AS service_catalogue_rows,
  (SELECT string_agg(code, ', ' ORDER BY sort_order)
     FROM public.service_catalogue)                                 AS service_codes;

-- [C8] Audit event-contract rows introduced by 0021 (names only, no payloads).
--      EXPECTED present: service_applicability.added / .updated / .approved /
--      .deactivated.
SELECT event_name
FROM public.audit_event_contract
WHERE event_name IN (
  'service_applicability.added',
  'service_applicability.updated',
  'service_applicability.approved',
  'service_applicability.deactivated')
ORDER BY event_name;


-- ############################################################################
-- ## SECTION D — FUNCTIONS (P5 / T4 / P6)
-- ##   Exact definition, identity args, return, owner, prosecdef, volatility,
-- ##   proconfig (search_path), EXECUTE grants and role exposure.
-- ############################################################################

-- [D1] Full metadata for every relevant P5/P6/T4 function (one row each).
--      Compare owner / security / volatility / search_path against the repo.
--      EXPECTED (governing): all owner = postgres; P5 RPCs & FY generators
--      SECURITY DEFINER; get_current_fy STABLE DEFINER; service_applicability_*
--      search_path = pg_catalog, public, pg_temp; FY generators search_path =
--      public, pg_temp; 0024 targets (get_portal_role/is_active_user/
--      is_admin_or_manager) EXPECTED (post-0024) = pg_catalog, public, pg_temp.
SELECT
  p.proname                                            AS function_name,
  pg_get_function_identity_arguments(p.oid)            AS identity_args,
  pg_get_function_result(p.oid)                        AS returns,
  pg_get_userbyid(p.proowner)                          AS owner,
  CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security_mode,
  CASE p.provolatile WHEN 'i' THEN 'IMMUTABLE'
                     WHEN 's' THEN 'STABLE'
                     ELSE 'VOLATILE' END               AS volatility,
  COALESCE(array_to_string(p.proconfig, ' | '), '(none)') AS proconfig_search_path,
  l.lanname                                            AS language
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language  l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.proname IN (
    -- P5 service-applicability RPCs (0021/0022)
    'service_applicability_create','service_applicability_update','service_applicability_set_status',
    -- P6 FY generation / activation / resolution (0014)
    'get_current_fy','ensure_financial_year_horizon','get_unknown_incorporation_start_fy',
    'resolve_client_start_fy','expected_backfill_start_fy','get_client_start_fy',
    'activate_accounting_service','generate_client_compliance','generate_client_compliance_core',
    -- Role / audit helpers targeted by 0023 (grants) and 0024 (search_path)
    'get_app_role','get_app_role_for_user','get_my_role','get_my_team_id','get_portal_role',
    'is_active_user','is_admin','is_admin_or_manager','calc_gst_due_date',
    'get_sensitive_audit_logs','audit_write_event','audit_validate_event',
    'audit_contains_secret','audit_field_format_ok','audit_is_uuid',
    '_write_read_audit','_record_audit_failure')
ORDER BY p.proname, identity_args;

-- [D2] EXACT definition dump for the P5 RPCs (function-level comparison vs repo).
--      Diff pg_get_functiondef output against 0021/0022 source. In particular
--      confirm service_applicability_create/_update bodies contain the 0022
--      guard token 'OTHER_NOTES_REQUIRED'.
SELECT n.nspname AS schema, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       (p.prosrc LIKE '%OTHER_NOTES_REQUIRED%')  AS has_other_notes_guard_0022,
       pg_get_functiondef(p.oid)                 AS full_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('service_applicability_create','service_applicability_update',
                    'service_applicability_set_status')
ORDER BY p.proname, identity_args;

-- [D3] EXACT definition dump for get_current_fy() and the P6 generators.
--      Confirm ceiling derives from get_current_fy() (source token) and that
--      NO active generator hard-caps at 2025-26 as an UPPER bound (see [I2]).
SELECT n.nspname AS schema, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       pg_get_functiondef(p.oid)                 AS full_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_current_fy','activate_accounting_service',
                    'generate_client_compliance','generate_client_compliance_core',
                    'resolve_client_start_fy','expected_backfill_start_fy',
                    'get_unknown_incorporation_start_fy')
ORDER BY p.proname, identity_args;

-- [D4] EXECUTE-grant matrix per relevant function per web role.
--      TRUE = that role can EXECUTE the function.
--      EXPECTED (post-0023/0024 intended state):
--        * Group A audit helpers (_record_audit_failure, _write_read_audit,
--          audit_contains_secret, audit_field_format_ok, audit_is_uuid,
--          audit_validate_event) -> FALSE for anon/authenticated/service_role.
--        * Group B (get_app_role, get_app_role_for_user, get_my_role,
--          get_my_team_id, get_portal_role, is_active_user, is_admin,
--          is_admin_or_manager, calc_gst_due_date, get_client_start_fy,
--          get_sensitive_audit_logs) -> authenticated TRUE; anon/service_role FALSE.
--        * P5 RPCs -> authenticated TRUE; anon/service_role FALSE.
--        * FY generators get_current_fy/core/resolve/etc -> all FALSE (owner-only);
--          generate_client_compliance & activate_accounting_service ->
--          authenticated & service_role TRUE, anon FALSE.
SELECT
  p.proname                                            AS function_name,
  pg_get_function_identity_arguments(p.oid)            AS identity_args,
  r.rolname                                            AS grantee_role,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE')  AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (SELECT rolname FROM pg_roles
            WHERE rolname IN ('anon','authenticated','service_role')) r
WHERE n.nspname = 'public'
  AND p.proname IN (
    'service_applicability_create','service_applicability_update','service_applicability_set_status',
    'get_app_role','get_app_role_for_user','get_my_role','get_my_team_id','get_portal_role',
    'is_active_user','is_admin','is_admin_or_manager','calc_gst_due_date','get_client_start_fy',
    'get_sensitive_audit_logs','audit_write_event','audit_validate_event','audit_contains_secret',
    'audit_field_format_ok','audit_is_uuid','_write_read_audit','_record_audit_failure',
    'get_current_fy','generate_client_compliance','generate_client_compliance_core',
    'activate_accounting_service','resolve_client_start_fy','expected_backfill_start_fy',
    'ensure_financial_year_horizon','get_unknown_incorporation_start_fy')
ORDER BY p.proname, identity_args, r.rolname;

-- [D5] PUBLIC EXECUTE exposure via aclexplode (grantee 0 = PUBLIC).
--      has_function_privilege has no PUBLIC pseudo-role, so inspect the ACL.
--      EXPECTED (post-0023): NO function below grants EXECUTE to PUBLIC.
--      A NULL proacl means DEFAULT privileges — which on Supabase can mean
--      PUBLIC/anon EXECUTE — so NULL proacl on a helper is itself a flag.
SELECT
  p.proname                                            AS function_name,
  pg_get_function_identity_arguments(p.oid)            AS identity_args,
  (p.proacl IS NULL)                                   AS acl_is_default_null,
  EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
          WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')
                                                       AS public_has_execute,
  COALESCE(array_to_string(p.proacl, E'\n'), '(default: inherits PUBLIC)') AS raw_acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_app_role','get_app_role_for_user','get_my_role','get_my_team_id','get_portal_role',
    'is_active_user','is_admin','is_admin_or_manager','calc_gst_due_date','get_client_start_fy',
    'get_sensitive_audit_logs','audit_write_event','audit_validate_event','audit_contains_secret',
    'audit_field_format_ok','audit_is_uuid','_write_read_audit','_record_audit_failure',
    'service_applicability_create','service_applicability_update','service_applicability_set_status')
ORDER BY p.proname, identity_args;

-- [D6] 0024 focused check — search_path (proconfig) of the 3 hardened helpers.
--      EXPECTED (post-0024): search_path = pg_catalog, public, pg_temp for all
--      three. If it reads bare 'public' -> 0024 NOT applied live (V-4 open).
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       COALESCE(array_to_string(p.proconfig, ' | '), '(none)') AS proconfig,
       (EXISTS (SELECT 1 FROM unnest(p.proconfig) c
                WHERE c = 'search_path=pg_catalog, public, pg_temp'))
                                                   AS hardened_0024
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_portal_role','is_active_user','is_admin_or_manager')
ORDER BY p.proname, identity_args;


-- ############################################################################
-- ## SECTION E — RLS AND FORCE RLS
-- ##   For every protected table: relrowsecurity, relforcerowsecurity, owner,
-- ##   policies (cmd/roles/USING/WITH CHECK), and table privileges.
-- ############################################################################

-- [E1] RLS + FORCE-RLS flags for the protected/core table set.
--      EXPECTED: FORCE on audit_log, audit_event_contract, audit_ingestion_failures,
--      the 8 M1-A master tables, entity_type_catalogue, and the 2 P5 tables
--      (service_catalogue, client_service_applicability). Operational/tracker
--      tables are ENABLE-only by design (record, do not fail, that asymmetry).
SELECT n.nspname AS schema, c.relname AS table_name,
       pg_get_userbyid(c.relowner)  AS owner,
       c.relrowsecurity             AS rls_enabled,
       c.relforcerowsecurity        AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname IN (
    'service_catalogue','client_service_applicability',
    'client_persons','client_registrations','gst_registration_details',
    'client_identifiers','client_contacts','client_addresses','client_relationships',
    'client_remediation_flags','entity_type_catalogue',
    'audit_log','audit_event_contract','audit_ingestion_failures',
    'clients','team','tasks','accounting_tracker','financials_tracker',
    'income_tax_tracker','compliance_calendar','financial_years')
ORDER BY c.relname;

-- [E2] Policy inventory for the protected tables (cmd / roles / expressions).
SELECT schemaname, tablename, policyname, cmd, roles,
       qual        AS using_expr,
       with_check  AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'service_catalogue','client_service_applicability',
    'client_persons','client_registrations','gst_registration_details',
    'client_identifiers','client_contacts','client_addresses','client_relationships',
    'client_remediation_flags','entity_type_catalogue',
    'audit_log','audit_event_contract','audit_ingestion_failures')
ORDER BY tablename, policyname;

-- [E3] Table privilege grants for the protected tables (role_table_grants).
--      Watch for any PUBLIC/anon write grant, or authenticated INSERT/UPDATE/
--      DELETE on RPC-only tables.
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon','authenticated','service_role','PUBLIC')
  AND table_name IN (
    'service_catalogue','client_service_applicability',
    'client_persons','client_registrations','gst_registration_details',
    'client_identifiers','client_contacts','client_addresses','client_relationships',
    'client_remediation_flags','entity_type_catalogue',
    'audit_log','audit_event_contract','audit_ingestion_failures')
ORDER BY table_name, grantee, privilege_type;

-- [E4] Sequence privileges in public (relevant where sequences back writes).
--      Reports any PUBLIC/anon USAGE/UPDATE on sequences (should be none granted
--      broadly). Sequences here are implicit identity sequences only.
SELECT c.relname AS sequence_name, r.rolname AS grantee,
       has_sequence_privilege(r.rolname, c.oid, 'USAGE')  AS can_usage,
       has_sequence_privilege(r.rolname, c.oid, 'UPDATE') AS can_update
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN (SELECT rolname FROM pg_roles
            WHERE rolname IN ('anon','authenticated','service_role')) r
WHERE n.nspname = 'public' AND c.relkind = 'S'
ORDER BY c.relname, r.rolname;


-- ############################################################################
-- ## SECTION F — COMPLIANCE TRACKER GRANTS & POLICY POSTURE
-- ##   Who can SELECT vs write; confirm writes route only through RPC/policy;
-- ##   confirm direct table mutation is blocked as designed.
-- ############################################################################

-- [F1] Tracker + calendar table privilege posture per web role.
--      EXPECTED (0010 design): admin/manager write via policy; executive roles
--      SELECT + UPDATE via policy; no INSERT/DELETE broadly to anon/PUBLIC.
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon','authenticated','service_role','PUBLIC')
  AND table_name IN (
    'accounting_tracker','financials_tracker','income_tax_tracker','gst_tracker',
    'tds_tracker','roc_tracker','llp_tracker','audit_tracker','payroll_tracker',
    'notice_tracker','trust_ngo_tracker','compliance_calendar','client_financials')
ORDER BY table_name, grantee, privilege_type;

-- [F2] Tracker RLS + FORCE flags and policy commands (posture summary).
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
       (SELECT string_agg(DISTINCT pol.cmd, ',' ORDER BY pol.cmd)
          FROM pg_policies pol
         WHERE pol.schemaname = 'public' AND pol.tablename = c.relname) AS policy_cmds
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname IN (
    'accounting_tracker','financials_tracker','income_tax_tracker','gst_tracker',
    'tds_tracker','roc_tracker','llp_tracker','audit_tracker','payroll_tracker',
    'notice_tracker','trust_ngo_tracker','compliance_calendar')
ORDER BY c.relname;

-- [F3] Anon exposure sweep — any table in public where 'anon' holds any privilege
--      (should be empty; anon is unauthenticated). Any row is a flag.
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee = 'anon'
ORDER BY table_name, privilege_type;


-- ############################################################################
-- ## SECTION G — FINANCIAL YEARS  (drives get_current_fy and P6 ceiling)
-- ############################################################################

-- [G1] Full financial_years inventory (labels/ranges/flags). Non-sensitive.
--      EXPECTED: contiguous FY rows; live prior evidence observed FY 2022-23 ..
--      2030-31; exactly one current FY. No PII.
SELECT fy_label, fy_start_date, fy_end_date, assessment_year, is_current, is_active
FROM public.financial_years
ORDER BY fy_start_date;

-- [G2] Current-FY derivation WITHOUT invoking get_current_fy() — pure SELECT
--      replicating the function's logic (active row whose date range covers the
--      IST 'today'). This is what get_current_fy() would return, computed safely.
--      EXPECTED: exactly ONE row; as of a 2026-27 execution date, fy_label='2026-27'.
SELECT fy_label AS derived_current_fy, fy_start_date, fy_end_date, is_active
FROM public.financial_years
WHERE COALESCE(is_active, true)
  AND (now() AT TIME ZONE 'Asia/Kolkata')::date BETWEEN fy_start_date AND fy_end_date
ORDER BY fy_start_date;

-- [G3] Current-FY uniqueness / integrity checks (all counts EXPECTED as noted).
SELECT
  (SELECT count(*) FROM public.financial_years)                                   AS total_fy_rows,
  (SELECT count(*) FROM public.financial_years WHERE is_current = true)           AS is_current_flag_count,      -- EXPECT 1
  (SELECT count(*) FROM public.financial_years
     WHERE COALESCE(is_active,true)
       AND (now() AT TIME ZONE 'Asia/Kolkata')::date BETWEEN fy_start_date AND fy_end_date) AS date_covered_current_count, -- EXPECT 1
  (SELECT count(*) FROM (SELECT fy_label FROM public.financial_years
                          GROUP BY fy_label HAVING count(*) > 1) d)               AS duplicate_fy_label_count,  -- EXPECT 0
  (SELECT count(*) FROM public.financial_years
     WHERE fy_label !~ '^[0-9]{4}-[0-9]{2}$')                                     AS malformed_fy_label_count;  -- EXPECT 0

-- [G4] Date-range continuity / overlap check. Each FY should start exactly one
--      day after the prior FY ends. Rows returned = anomalies (EXPECT 0 rows).
WITH ordered AS (
  SELECT fy_label, fy_start_date, fy_end_date,
         lag(fy_end_date) OVER (ORDER BY fy_start_date) AS prev_end
  FROM public.financial_years
  WHERE COALESCE(is_active, true)
)
SELECT fy_label, prev_end, fy_start_date,
       (fy_start_date - prev_end) AS gap_days
FROM ordered
WHERE prev_end IS NOT NULL
  AND fy_start_date <> prev_end + INTERVAL '1 day'
ORDER BY fy_start_date;

-- [G5] Consistency between is_current flag and date-derived current FY.
--      EXPECTED: the flagged current row equals the date-covered row.
SELECT
  (SELECT fy_label FROM public.financial_years WHERE is_current = true
    ORDER BY fy_start_date LIMIT 1)                                              AS flagged_current_fy,
  (SELECT fy_label FROM public.financial_years
     WHERE COALESCE(is_active,true)
       AND (now() AT TIME ZONE 'Asia/Kolkata')::date BETWEEN fy_start_date AND fy_end_date
     ORDER BY fy_start_date LIMIT 1)                                            AS date_derived_current_fy;


-- ############################################################################
-- ## SECTION H — P5 SERVICE APPLICABILITY (backend consistency)
-- ##
-- ##  >>> PREREQUISITE GATE for ALL of [H1]-[H5]: run these blocks ONLY IF [C1]
-- ##      confirmed BOTH public.service_catalogue AND
-- ##      public.client_service_applicability are PRESENT. [H3]/[H4] additionally
-- ##      reference public.clients and public.client_registrations (governed,
-- ##      expected present). If either P5 table is MISSING in [C1]:
-- ##        - do NOT run [H1]-[H5];
-- ##        - label them 'SKIPPED — PREREQUISITE NOT MET'; and
-- ##        - record the missing P5 table itself as a FAIL/discrepancy in [C1]
-- ##          per the Expected-State Matrix (0021 objects are governed, not optional).
-- ############################################################################

-- [H1] Applicability row counts by status (counts only, no client values).
--      PREREQUISITE: [C1] shows both P5 tables PRESENT (see Section H gate above).
--      EXPECTED (prior live evidence): client_service_applicability total = 4.
SELECT
  (SELECT count(*) FROM public.client_service_applicability)                       AS csa_total,
  (SELECT count(*) FROM public.client_service_applicability WHERE status='Draft')    AS csa_draft,
  (SELECT count(*) FROM public.client_service_applicability WHERE status='Approved') AS csa_approved,
  (SELECT count(*) FROM public.client_service_applicability WHERE status='Inactive') AS csa_inactive;

-- [H2] Per-status/service distribution (aggregate; codes are reference values).
SELECT service_code, status, count(*) AS n
FROM public.client_service_applicability
GROUP BY service_code, status
ORDER BY service_code, status;

-- [H3] Orphan / contradictory applicability records (all EXPECT 0).
SELECT
  -- service_code not in catalogue (FK should prevent; 0 confirms integrity)
  (SELECT count(*) FROM public.client_service_applicability a
     LEFT JOIN public.service_catalogue s ON s.code = a.service_code
    WHERE s.code IS NULL)                                                          AS csa_orphan_service_code,
  -- client_id not in clients (FK should prevent)
  (SELECT count(*) FROM public.client_service_applicability a
     LEFT JOIN public.clients c ON c.id = a.client_id
    WHERE c.id IS NULL)                                                            AS csa_orphan_client,
  -- Approved rows missing approver metadata (csa_approval_actor_chk should prevent)
  (SELECT count(*) FROM public.client_service_applicability
    WHERE status='Approved' AND (approved_by IS NULL OR approved_at IS NULL))       AS csa_approved_missing_actor,
  -- Approved rows missing effective_from (csa_effective_from_gate_chk should prevent)
  (SELECT count(*) FROM public.client_service_applicability
    WHERE status='Approved' AND effective_from IS NULL)                            AS csa_approved_missing_eff_from,
  -- OTHER rows with blank notes (csa_other_notes_required_chk / 0022 should prevent)
  (SELECT count(*) FROM public.client_service_applicability
    WHERE service_code='OTHER' AND (notes IS NULL OR btrim(notes)=''))             AS csa_other_blank_notes;

-- [H4] Cross-client linkage integrity — a linked_registration must belong to the
--      same client (csa_registration_same_client_fk enforces this). EXPECT 0.
SELECT count(*) AS csa_cross_client_registration
FROM public.client_service_applicability a
JOIN public.client_registrations r ON r.id = a.linked_registration_id
WHERE r.client_id <> a.client_id;

-- [H5] Duplicate live applicability grain (client_id, service_code) among
--      non-Inactive rows — the partial unique index should force EXPECT 0.
SELECT count(*) AS duplicate_live_applicability
FROM (
  SELECT client_id, service_code
  FROM public.client_service_applicability
  WHERE status <> 'Inactive'
  GROUP BY client_id, service_code
  HAVING count(*) > 1
) d;


-- ############################################################################
-- ## SECTION I — P6 GENERATORS (backend FY-ceiling correctness)
-- ############################################################################

-- [I1] Ceiling-source proof: does each active generator derive its ceiling from
--      get_current_fy()? Screens the function source for the call token.
--      EXPECTED: TRUE for generate_client_compliance_core and
--      activate_accounting_service.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       (p.prosrc LIKE '%get_current_fy()%') AS calls_get_current_fy
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('generate_client_compliance_core','activate_accounting_service',
                    'generate_client_compliance')
ORDER BY p.proname, identity_args;

-- [I2] Stale-ceiling screen: does any active generator hard-cap at 2025-26 as an
--      UPPER bound? EXPECTED: NO rows with an upper-bound '<= 2025-26' pattern.
--      (2025-26 legitimately appears only as a START floor via
--      get_unknown_incorporation_start_fy — that is NOT a ceiling.)
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       (p.prosrc ~ '<=\s*''2025-26''')                          AS has_upper_ceiling_2025_26_literal,
       (p.prosrc LIKE '%v_current%2025-26%')                    AS assigns_current_to_2025_26
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('generate_client_compliance','generate_client_compliance_core',
                    'activate_accounting_service')
ORDER BY p.proname, identity_args;

-- [I3] Fail-loud screen: do the generators raise on an empty FY range rather
--      than silently succeeding? Screen source for the no_data_found guard.
--      EXPECTED: TRUE for both core generator and activation function.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       (p.prosrc LIKE '%no_data_found%') AS raises_on_empty_range
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('generate_client_compliance_core','activate_accounting_service')
ORDER BY p.proname, identity_args;

-- [I4] Start-policy anchor distinctness: get_unknown_incorporation_start_fy is a
--      START floor (expected literal '2025-26'), NOT the generation ceiling.
--      Confirm it exists and returns a start-side literal.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       (p.prosrc LIKE '%2025-26%')  AS references_2025_26_floor,
       pg_get_functiondef(p.oid)    AS full_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_unknown_incorporation_start_fy'
ORDER BY identity_args;

-- [I5] Generation-target coverage sanity — distinct FY labels present in a core
--      generated tracker vs the current FY. Counts only; confirms generation
--      reached current FY and is not frozen at 2025-26.
SELECT
  (SELECT count(DISTINCT fy_label) FROM public.accounting_tracker)  AS acc_distinct_fy,
  (SELECT max(fy_label) FROM public.accounting_tracker)             AS acc_max_fy_label,
  (SELECT min(fy_label) FROM public.accounting_tracker)             AS acc_min_fy_label;


-- ############################################################################
-- ## SECTION J — P6A DEPENDENCY VALIDATION (backend evidence only)
-- ##   Backend facts P6A (frontend FY-warning correction / PR #35) relies on.
-- ##   No frontend runtime is exercised here.
-- ############################################################################

-- [J1] P6A backend-fact bundle (single consolidated row).
--      P6A asserts: (a) current FY is derived live (not fixed at 2025-26),
--      (b) active FY range extends past 2025-26, (c) NO active generation ceiling
--      at 2025-26. This bundles the evidence.
SELECT
  -- (a) live current FY, derived by pure SELECT (see [G2])
  (SELECT fy_label FROM public.financial_years
     WHERE COALESCE(is_active,true)
       AND (now() AT TIME ZONE 'Asia/Kolkata')::date BETWEEN fy_start_date AND fy_end_date
     ORDER BY fy_start_date LIMIT 1)                                  AS live_current_fy,
  -- (b) highest active FY available for generation
  (SELECT max(fy_label) FROM public.financial_years WHERE COALESCE(is_active,true)) AS max_active_fy,
  -- (b) is a FY strictly later than 2025-26 present & active?
  (SELECT (count(*) > 0) FROM public.financial_years
     WHERE COALESCE(is_active,true) AND fy_label > '2025-26')         AS has_active_fy_beyond_2025_26,
  -- (c) does any active generator carry an upper 2025-26 ceiling? EXPECT false
  (SELECT bool_or(p.prosrc ~ '<=\s*''2025-26''')
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('generate_client_compliance','generate_client_compliance_core',
                        'activate_accounting_service'))               AS any_generator_capped_2025_26;

-- [J2] Deployed generation-function definitions available to P6A (fingerprint).
--      P6A depends on these being the get_current_fy()-driven bodies.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       (p.prosrc LIKE '%get_current_fy()%') AS ceiling_from_get_current_fy,
       md5(pg_get_functiondef(p.oid))       AS definition_md5_fingerprint
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('generate_client_compliance','generate_client_compliance_core',
                    'activate_accounting_service')
ORDER BY p.proname, identity_args;


-- ############################################################################
-- ## SECTION K — G-11 NON-IMPACT & PROTECTED COUNTS
-- ##   Counts ONLY. The numbers beside each table are GUARD BASELINES from the
-- ##   Master Completion Register — they are NOT automatically permanent exact
-- ##   expectations. Interpret every count as follows:
-- ##     * a HIGHER count can be legitimate operational growth (e.g. new clients,
-- ##       new audit_log rows) -> not a failure by itself;
-- ##     * a LOWER count requires INVESTIGATION for deletion, data loss or scope
-- ##       change -> raise a discrepancy;
-- ##     * EXACT EQUALITY is required only where a separately governed FROZEN-COUNT
-- ##       condition applies (currently: the M1-A person tables client_persons=0
-- ##       and client_remediation_flags=0, and the closed R4-DB tracker baselines
-- ##       accounting_tracker=312 / financials_tracker=120 / income_tax_tracker=26
-- ##       / compliance_calendar=0 as guarded by the register);
-- ##     * decide PASS/FAIL using EXPECTED BUSINESS MOVEMENT and the governing
-- ##       evidence, NOT mechanical equality alone.
-- ##   G-11 (v_team_workload frontend defect / Option A) is frontend-only and
-- ##   must NOT have moved any of these beyond expected movement.
-- ##   Mandatory (governed) relations are bundled per block; optional/legacy
-- ##   relations are isolated so their absence cannot fail a valid bundle.
-- ############################################################################

-- [K1] MANDATORY protected core counts (single row; all relations governed and
--      expected PRESENT). Guard baselines shown; apply the interpretation above.
--      clients ~13 · team ~8 · service_catalogue 11 (frozen seed) ·
--      client_service_applicability ~4 · client_persons 0 (frozen) ·
--      client_remediation_flags 0 (frozen).
SELECT
  (SELECT count(*) FROM public.clients)                        AS clients,                  -- guard ~13 (growth OK)
  (SELECT count(*) FROM public.team)                           AS team,                     -- guard ~8  (growth OK)
  (SELECT count(*) FROM public.service_catalogue)              AS service_catalogue,        -- 11 frozen seed
  (SELECT count(*) FROM public.client_service_applicability)   AS client_service_applicability, -- guard ~4 (growth OK)
  (SELECT count(*) FROM public.client_persons)                 AS client_persons,           -- 0 frozen
  (SELECT count(*) FROM public.client_remediation_flags)       AS client_remediation_flags; -- 0 frozen

-- [K1b] OPTIONAL / LEGACY relation — public.client_directors (0002 legacy table,
--       superseded by client_persons; NOT in the governed frozen-count set).
--       Run separately so its potential absence cannot fail [K1]. If the table
--       does not exist, this block errors -> label it 'NOT PRESENT' (not a FAIL).
SELECT (SELECT count(*) FROM public.client_directors)          AS client_directors_legacy;

-- [K2] MANDATORY tracker + calendar counts (single row; all governed, present).
--      Frozen guards (exact-equality expected): accounting_tracker 312 ·
--      financials_tracker 120 · income_tax_tracker 26 · compliance_calendar 0.
--      tasks: growth OK (operational). Apply the Section K interpretation.
SELECT
  (SELECT count(*) FROM public.accounting_tracker)             AS accounting_tracker,       -- 312 frozen
  (SELECT count(*) FROM public.financials_tracker)             AS financials_tracker,       -- 120 frozen
  (SELECT count(*) FROM public.income_tax_tracker)             AS income_tax_tracker,       -- 26 frozen
  (SELECT count(*) FROM public.compliance_calendar)            AS compliance_calendar,      -- 0 frozen
  (SELECT count(*) FROM public.tasks)                          AS tasks;                    -- growth OK

-- [K3] MANDATORY audit counts (single row; all governed, present).
--      audit_event_contract ~24 (grows only if the contract is extended) ·
--      audit_log ~33 (append-only, GROWTH EXPECTED — a LOWER value is the concern) ·
--      audit_ingestion_failures 0 (should stay 0; >0 -> investigate) ·
--      financial_years: growth OK (horizon self-maintained). Interpret per Section K.
SELECT
  (SELECT count(*) FROM public.audit_event_contract)           AS audit_event_contract,     -- guard ~24
  (SELECT count(*) FROM public.audit_log)                      AS audit_log,                -- guard ~33 (growth OK)
  (SELECT count(*) FROM public.audit_ingestion_failures)       AS audit_ingestion_failures, -- 0 (stay 0)
  (SELECT count(*) FROM public.financial_years)                AS financial_years;          -- growth OK

-- [K4] G-11 object non-existence confirmation. v_team_workload is unauthored and
--      expected ABSENT; its absence is the designed state (Option A frontend-only).
--      EXPECTED: v_team_workload_present = false.
SELECT
  (to_regclass('public.v_team_workload') IS NOT NULL)          AS v_team_workload_present,   -- false
  (to_regclass('public.v_firm_dashboard') IS NOT NULL)         AS v_firm_dashboard_present,  -- true
  (to_regclass('public.v_client_compliance_summary') IS NOT NULL) AS v_client_compliance_summary_present, -- true
  (to_regclass('public.v_overdue_ageing') IS NOT NULL)         AS v_overdue_ageing_present;  -- true


-- ############################################################################
-- ## SECTION L — INTEGRITY & ANOMALY SWEEP  (all EXPECT 0 / empty unless noted)
-- ############################################################################

-- [L1] Missing FORCE-RLS on tables that should force it (returns offenders).
--      EXPECTED: 0 rows. Any row = a protected table missing FORCE RLS.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname IN (
    'service_catalogue','client_service_applicability',
    'client_persons','client_registrations','gst_registration_details',
    'client_identifiers','client_contacts','client_addresses','client_relationships',
    'client_remediation_flags','entity_type_catalogue',
    'audit_log','audit_event_contract','audit_ingestion_failures')
  AND c.relforcerowsecurity = false
ORDER BY c.relname;

-- [L2] Unexpected PUBLIC EXECUTE on any public function (broad sweep).
--      Returns every public function whose ACL grants EXECUTE to PUBLIC.
--      EXPECTED (post-0023): the 17 T4-targeted helpers do NOT appear.
--      Any hit on a role/audit helper = 0023 gap or a new unhardened function.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       pg_get_userbyid(p.proowner) AS owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
              WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')
ORDER BY p.proname, identity_args;

-- [L3] SECURITY DEFINER functions with a NON-pinned / risky search_path.
--      Returns any DEFINER function whose proconfig does not pin search_path.
--      EXPECTED (post-0024): the 3 hardened helpers no longer appear with bare
--      'public'; record any remaining bare-'public' DEFINER functions.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       COALESCE(array_to_string(p.proconfig,' | '), '(NONE — inherits session search_path)') AS proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND (p.proconfig IS NULL
       OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%pg_catalog%'))
ORDER BY p.proname, identity_args;

-- [L4] Duplicate function signatures (unexpected overloads) among P5 RPCs.
--      EXPECTED: exactly 1 each of create/update/set_status (total 3).
SELECT p.proname AS function_name, count(*) AS overload_count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('service_applicability_create','service_applicability_update',
                    'service_applicability_set_status')
GROUP BY p.proname
ORDER BY p.proname;

-- [L5] Object-count snapshot for the public schema (drift detector).
--      Compare tables/views/functions to prior evidence (39 tables, 51 functions,
--      3 authored views were the T3 live figures).
SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r')          AS public_tables,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='v')          AS public_views,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='m')          AS public_matviews,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.prokind='f')          AS public_functions,
  (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
     WHERE n.nspname='public' AND t.typtype='e')          AS public_enum_types;

-- [L6] Inactive-referenced integrity: applicability rows pointing at an inactive
--      service_catalogue code (reference is_active=false). Returns offenders.
--      EXPECTED: 0 rows (or a documented, intended exception).
SELECT a.service_code, count(*) AS n
FROM public.client_service_applicability a
JOIN public.service_catalogue s ON s.code = a.service_code
WHERE s.is_active = false AND a.status <> 'Inactive'
GROUP BY a.service_code
ORDER BY a.service_code;

-- ============================================================================
-- END — SELECT-ONLY RECONCILIATION KIT. No writes were issued by this file.
-- If any block errored on permissions, mark it UNKNOWN / NOT VISIBLE and
-- continue. Do NOT commit, push, deploy, or alter any object as a result of
-- running this kit. Return captured results per the Evidence Template.
-- ============================================================================
