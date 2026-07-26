-- =====================================================================================
-- YAV2 Portal V2 — Module 1 — P6 (Controlled Compliance Generation)
-- READ-ONLY V2 DISCOVERY KIT  —  FOR MANUAL PJ EXECUTION ONLY
-- =====================================================================================
-- STATUS: DISCOVERY / DESIGN. NOT an implementation. NOT approved for any write.
-- Authored by: Claude Code (documentation). Executor: PJ (human), in the V2 SQL Editor.
--
-- >>> AUTHORISED TARGET: Supabase V2 / yav2-dev  (project ref ogjrwemjefvccpyjwxuo) ONLY. <<<
-- >>> PROHIBITED:        V1/Production ref zcszesuvjrryxtigjglt — DO NOT RUN THERE.        <<<
--
-- SAFETY CONTRACT (every statement below honours it):
--   * READ-ONLY: only SELECT / WITH / information_schema / pg_catalog inspection.
--   * NO DDL, NO DML, NO temp tables, NO mutation, NO write-RPC call, NO trigger firing,
--     NO transactional functional test. Nothing here changes a single row or object.
--   * Claude Code has NOT executed this file. It is authored for PJ to run manually.
--
-- HOW TO USE: run block-by-block (B0..B20) in the V2 SQL Editor; paste each result into the
-- companion capture template (docs/M1B_P6_Discovery_Result_Capture_Template.md). Report
-- counts/metadata only. Do NOT paste any Aadhaar/PAN/personal values (none are selected here).
-- =====================================================================================

-- ---------------------------------------------------------------------------
-- B0 — Environment attestation (MANDATORY, MANUAL — must precede B1..B20)
-- ---------------------------------------------------------------------------
-- IMPORTANT: SQL CANNOT independently prove the Supabase PROJECT REFERENCE.
--   * current_database() / current_user do NOT reveal the project ref: both V2
--     (ogjrwemjefvccpyjwxuo) and V1/Production (zcszesuvjrryxtigjglt) report the
--     same database name ('postgres') and similar roles. The project ref lives ONLY
--     in the Supabase SQL Editor URL / dashboard, not in any value queryable here.
--   * This block therefore echoes non-identifying context plus a REMINDER only; it is
--     NOT and cannot be proof of the target project.
-- >>> BEFORE running B1..B20, PJ MUST manually confirm the SQL Editor / dashboard
-- >>> project ref = ogjrwemjefvccpyjwxuo (V2 / yav2-dev), NOT zcszesuvjrryxtigjglt
-- >>> (V1 / Production). Tick the mandatory confirmation box in the capture template.
SELECT current_database() AS database_name_NOT_a_project_ref,
       current_user       AS run_as,
       'SQL CANNOT PROVE THE PROJECT REF — PJ MUST manually confirm dashboard ref = ogjrwemjefvccpyjwxuo (V2) before B1..B20' AS mandatory_manual_check;

-- ---------------------------------------------------------------------------
-- B1 — Table inventory: columns, types, defaults, nullability
--      (P6 input + output surfaces)
-- ---------------------------------------------------------------------------
SELECT c.table_name, c.ordinal_position, c.column_name, c.data_type,
       c.character_maximum_length, c.numeric_precision, c.numeric_scale,
       c.is_nullable, c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'service_catalogue','client_service_applicability','clients','client_registrations',
    'financial_years','accounting_tracker','financials_tracker','income_tax_tracker',
    'gst_tracker','tds_tracker','roc_tracker','llp_tracker','audit_tracker',
    'payroll_tracker','trust_ngo_tracker','notice_tracker','compliance_calendar',
    'tasks','team','audit_log','audit_event_contract')
ORDER BY c.table_name, c.ordinal_position;

-- ---------------------------------------------------------------------------
-- B2 — Constraints (PK / UNIQUE / CHECK / FK) on the P6 surfaces
-- ---------------------------------------------------------------------------
SELECT tc.table_name, tc.constraint_type, tc.constraint_name,
       pg_get_constraintdef(pc.oid) AS definition
FROM information_schema.table_constraints tc
JOIN pg_constraint pc ON pc.conname = tc.constraint_name
JOIN pg_class cl ON cl.oid = pc.conrelid AND cl.relname = tc.table_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'service_catalogue','client_service_applicability','clients','client_registrations',
    'financial_years','accounting_tracker','financials_tracker','income_tax_tracker',
    'gst_tracker','tds_tracker','roc_tracker','llp_tracker','audit_tracker',
    'payroll_tracker','trust_ngo_tracker','notice_tracker','compliance_calendar',
    'tasks','audit_log','audit_event_contract')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- ---------------------------------------------------------------------------
-- B3 — Indexes (esp. UNIQUE / partial) — duplicate-prevention surfaces
-- ---------------------------------------------------------------------------
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'client_service_applicability','client_registrations','compliance_calendar',
    'accounting_tracker','financials_tracker','income_tax_tracker','gst_tracker',
    'tds_tracker','roc_tracker','llp_tracker','audit_tracker','payroll_tracker',
    'trust_ngo_tracker','notice_tracker')
ORDER BY tablename, indexname;

-- ---------------------------------------------------------------------------
-- B4 — RLS enabled / forced status on every P6 surface
-- ---------------------------------------------------------------------------
SELECT n.nspname AS schema, c.relname AS table_name,
       c.relrowsecurity  AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'service_catalogue','client_service_applicability','clients','client_registrations',
    'financial_years','accounting_tracker','financials_tracker','income_tax_tracker',
    'gst_tracker','tds_tracker','roc_tracker','llp_tracker','audit_tracker',
    'payroll_tracker','trust_ngo_tracker','notice_tracker','compliance_calendar',
    'tasks','audit_log','audit_event_contract')
ORDER BY c.relname;

-- ---------------------------------------------------------------------------
-- B5 — RLS policies (command, roles, USING/WITH CHECK) on the P6 surfaces
-- ---------------------------------------------------------------------------
SELECT schemaname, tablename, policyname, cmd, roles,
       pg_get_expr(pol.polqual,  pol.polrelid) AS using_expr,
       pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr
FROM pg_policies p
JOIN pg_policy  pol ON pol.polname = p.policyname
JOIN pg_class   cl  ON cl.oid = pol.polrelid AND cl.relname = p.tablename
WHERE schemaname = 'public'
  AND tablename IN (
    'service_catalogue','client_service_applicability','clients','client_registrations',
    'accounting_tracker','financials_tracker','income_tax_tracker','gst_tracker',
    'tds_tracker','roc_tracker','llp_tracker','audit_tracker','payroll_tracker',
    'trust_ngo_tracker','notice_tracker','compliance_calendar','tasks')
ORDER BY tablename, policyname;

-- ---------------------------------------------------------------------------
-- B6 — Table-level grants to anon / authenticated / service_role
-- ---------------------------------------------------------------------------
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon','authenticated','service_role','PUBLIC')
  AND table_name IN (
    'service_catalogue','client_service_applicability','accounting_tracker',
    'financials_tracker','income_tax_tracker','gst_tracker','tds_tracker',
    'roc_tracker','llp_tracker','audit_tracker','payroll_tracker','trust_ngo_tracker',
    'notice_tracker','compliance_calendar','tasks','audit_log','audit_event_contract')
ORDER BY table_name, grantee, privilege_type;

-- ---------------------------------------------------------------------------
-- B7 — Functions/RPCs: signatures, security, owner, volatility, search_path
--      (generation-related + role/audit helpers)
-- ---------------------------------------------------------------------------
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid)             AS returns,
       CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security,
       pg_get_userbyid(p.proowner)               AS owner,
       CASE p.provolatile WHEN 'i' THEN 'IMMUTABLE' WHEN 's' THEN 'STABLE' ELSE 'VOLATILE' END AS volatility,
       (SELECT string_agg(cfg, ', ') FROM unnest(p.proconfig) AS cfg) AS settings
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname ~* 'generate|compliance|activate_accounting|service_applicability|calc_.*_due|start_fy|resolve_client|is_active_user|is_admin|get_portal_role|get_app_role|audit_write_event|audit_validate')
ORDER BY p.proname;

-- ---------------------------------------------------------------------------
-- B8 — EXECUTE privileges on those functions (who can call them)
-- ---------------------------------------------------------------------------
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       COALESCE(array_to_string(p.proacl, ' | '), '(default: PUBLIC)') AS acl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname ~* 'generate|compliance|activate_accounting|service_applicability|audit_write_event')
ORDER BY p.proname;

-- ---------------------------------------------------------------------------
-- B9 — Triggers on the P6 surfaces (any auto-generation / side effects)
-- ---------------------------------------------------------------------------
SELECT event_object_table AS table_name, trigger_name, action_timing,
       event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN (
    'client_service_applicability','accounting_tracker','financials_tracker',
    'income_tax_tracker','gst_tracker','tds_tracker','roc_tracker','llp_tracker',
    'audit_tracker','payroll_tracker','trust_ngo_tracker','notice_tracker',
    'compliance_calendar','tasks','clients')
ORDER BY table_name, trigger_name;

-- ---------------------------------------------------------------------------
-- B10 — Applicability population by status / service / frequency
-- ---------------------------------------------------------------------------
SELECT status, service_code, COALESCE(frequency,'(null)') AS frequency, count(*) AS n
FROM public.client_service_applicability
GROUP BY status, service_code, COALESCE(frequency,'(null)')
ORDER BY status, service_code, frequency;

-- (B10 continued) — Approved-row AGGREGATES ONLY.
--   NO row-level identifiers: no id / client_id / linked_registration_id / owner_team_id /
--   approved_by / names / emails are selected — counts, ranges and version aggregates only.
-- (i) approved counts by service + frequency
SELECT service_code, COALESCE(frequency,'(null)') AS frequency, count(*) AS approved_n
FROM public.client_service_applicability
WHERE status = 'Approved'
GROUP BY service_code, COALESCE(frequency,'(null)')
ORDER BY service_code, frequency;
-- (ii) approval-completeness / owner / registration coverage (counts only)
--   required_registration_missing_n counts ONLY Approved rows whose service actually
--   requires a registration (service_catalogue.requires_registration = true) AND that
--   have no linked_registration_id — not every Approved row lacking a registration.
SELECT count(*)                                                             AS approved_total,
       count(*) FILTER (WHERE a.approved_by IS NULL OR a.approved_at IS NULL) AS incomplete_approval_n,
       count(*) FILTER (WHERE a.owner_team_id IS NULL)                      AS missing_owner_n,
       count(*) FILTER (WHERE sc.requires_registration = true
                              AND a.linked_registration_id IS NULL)        AS required_registration_missing_n,
       count(*) FILTER (WHERE a.effective_from IS NULL)                     AS missing_effective_from_n,
       count(*) FILTER (WHERE a.effective_to IS NOT NULL)                   AS has_effective_to_n
FROM public.client_service_applicability a
JOIN public.service_catalogue sc ON sc.code = a.service_code
WHERE a.status = 'Approved';
-- (iii) effective-date ranges + row_version aggregate info (no per-row values)
SELECT min(effective_from) AS earliest_effective_from,
       max(effective_from) AS latest_effective_from,
       min(effective_to)   AS earliest_effective_to,
       max(effective_to)   AS latest_effective_to,
       min(row_version)    AS min_row_version,
       max(row_version)    AS max_row_version,
       round(avg(row_version), 2) AS avg_row_version
FROM public.client_service_applicability
WHERE status = 'Approved';

-- ---------------------------------------------------------------------------
-- B11 — Service catalogue configuration (drives frequency / registration rules)
-- ---------------------------------------------------------------------------
SELECT code, label, requires_registration, default_frequency, sort_order, is_active
FROM public.service_catalogue
ORDER BY sort_order, code;

-- ---------------------------------------------------------------------------
-- B12 — Registration coverage + same-client integrity for linked applicability
-- ---------------------------------------------------------------------------
SELECT (SELECT count(*) FROM public.client_registrations)                       AS registrations_total,
       (SELECT count(*) FROM public.client_service_applicability
          WHERE linked_registration_id IS NOT NULL)                             AS applicability_with_link,
       (SELECT count(*) FROM public.client_service_applicability a
          JOIN public.client_registrations r ON r.id = a.linked_registration_id
          WHERE r.client_id <> a.client_id)                                     AS cross_client_link_violations_expect_0;

-- ---------------------------------------------------------------------------
-- B13 — Financial-year coverage + current-year designation
-- ---------------------------------------------------------------------------
SELECT fy_label, fy_start_date, fy_end_date, assessment_year, is_current, is_active
FROM public.financial_years
ORDER BY fy_start_date;
SELECT count(*) AS fy_total,
       count(*) FILTER (WHERE is_active)  AS fy_active,
       count(*) FILTER (WHERE is_current) AS fy_current_flag_count_expect_1
FROM public.financial_years;

-- ---------------------------------------------------------------------------
-- B14 — Tracker + calendar counts and category/status distribution (PROTECTED BASELINE)
-- ---------------------------------------------------------------------------
SELECT 'accounting_tracker' AS t, count(*) FROM public.accounting_tracker
UNION ALL SELECT 'financials_tracker', count(*) FROM public.financials_tracker
UNION ALL SELECT 'income_tax_tracker', count(*) FROM public.income_tax_tracker
UNION ALL SELECT 'gst_tracker',        count(*) FROM public.gst_tracker
UNION ALL SELECT 'tds_tracker',        count(*) FROM public.tds_tracker
UNION ALL SELECT 'roc_tracker',        count(*) FROM public.roc_tracker
UNION ALL SELECT 'llp_tracker',        count(*) FROM public.llp_tracker
UNION ALL SELECT 'audit_tracker',      count(*) FROM public.audit_tracker
UNION ALL SELECT 'payroll_tracker',    count(*) FROM public.payroll_tracker
UNION ALL SELECT 'trust_ngo_tracker',  count(*) FROM public.trust_ngo_tracker
UNION ALL SELECT 'notice_tracker',     count(*) FROM public.notice_tracker
UNION ALL SELECT 'compliance_calendar',count(*) FROM public.compliance_calendar
ORDER BY 1;
-- Expected protected baseline: accounting 312 · financials 120 · income_tax 26 · compliance_calendar 0.

-- (B14 continued) — status distribution per tracker family (sample: accounting + income tax + calendar)
SELECT 'accounting_tracker' AS t, status::text, count(*) FROM public.accounting_tracker GROUP BY status
UNION ALL SELECT 'income_tax_tracker', status::text, count(*) FROM public.income_tax_tracker GROUP BY status
UNION ALL SELECT 'compliance_calendar', status::text, count(*) FROM public.compliance_calendar GROUP BY status
ORDER BY 1,2;

-- ---------------------------------------------------------------------------
-- B15 — Duplicate-risk probes (generation-target trackers already have business-unique keys;
--        this confirms zero existing duplicates on the intended grain before any generation design)
-- ---------------------------------------------------------------------------
-- accounting: intended grain (client_id, fy_label, month)
SELECT count(*) AS accounting_dup_groups FROM (
  SELECT client_id, fy_label, month FROM public.accounting_tracker
  GROUP BY client_id, fy_label, month HAVING count(*) > 1) d;
-- income tax: intended grain (client_id, fy_label)
SELECT count(*) AS income_tax_dup_groups FROM (
  SELECT client_id, fy_label FROM public.income_tax_tracker
  GROUP BY client_id, fy_label HAVING count(*) > 1) d;
-- calendar: intended grain (client_id, compliance_tracker_id)
SELECT count(*) AS calendar_dup_groups FROM (
  SELECT client_id, compliance_tracker_id FROM public.compliance_calendar
  GROUP BY client_id, compliance_tracker_id HAVING count(*) > 1) d;

-- ---------------------------------------------------------------------------
-- B16 — Lineage / source-reference / generated-by columns already present?
--      (does any output table carry generation lineage today?)
-- ---------------------------------------------------------------------------
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name ~* 'generated_by|generated_at|generation_run|source_system|source_ref|source_hash|batch_id|run_id|row_version'
  AND table_name IN (
    'accounting_tracker','financials_tracker','income_tax_tracker','gst_tracker',
    'tds_tracker','roc_tracker','llp_tracker','audit_tracker','payroll_tracker',
    'trust_ngo_tracker','notice_tracker','compliance_calendar','tasks',
    'client_service_applicability')
ORDER BY table_name, column_name;

-- ---------------------------------------------------------------------------
-- B17 — Status + frequency vocabularies (enums + CHECKs)
-- ---------------------------------------------------------------------------
SELECT t.typname AS enum_type, e.enumsortorder AS ord, e.enumlabel AS value
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace AND n.nspname = 'public'
WHERE t.typname IN ('compliance_status_enum','workflow_stage_enum','month_enum',
                    'quarter_enum','gst_frequency_enum','gst_return_type_enum')
ORDER BY t.typname, e.enumsortorder;
-- frequency vocabulary is a CHECK on service_catalogue.default_frequency /
-- client_service_applicability.frequency (see B2): MONTHLY/QUARTERLY/HALF_YEARLY/
-- ANNUAL/EVENT_BASED/ONE_TIME/AS_REQUIRED.

-- ---------------------------------------------------------------------------
-- B18 — Assignment / owner availability (team roster for owner_team_id / assigned_to)
-- ---------------------------------------------------------------------------
SELECT count(*) AS team_total,
       count(*) FILTER (WHERE is_active) AS team_active,
       count(*) FILTER (WHERE is_active AND portal_role IN ('Admin','Manager')) AS active_admin_or_manager,
       count(*) FILTER (WHERE auth_user_id IS NOT NULL) AS with_auth_link
FROM public.team;

-- ---------------------------------------------------------------------------
-- B19 — Existing audit-event contracts (what event vocabulary already exists)
-- ---------------------------------------------------------------------------
SELECT event_name, risk_tier, sensitivity, required_keys, permitted_actions,
       permitted_resource_types, client_requirement
FROM public.audit_event_contract
ORDER BY event_name;
SELECT count(*) AS audit_log_rows FROM public.audit_log;

-- ---------------------------------------------------------------------------
-- B20 — Legacy clients.services + sample/test indicators + numbering/name collisions
-- ---------------------------------------------------------------------------
-- legacy clients.services jsonb footprint (count only; no values)
SELECT count(*) FILTER (WHERE services IS NOT NULL
         AND jsonb_typeof(services)='array' AND jsonb_array_length(services) > 0) AS clients_with_services,
       count(*) AS clients_total,
       count(*) FILTER (WHERE is_test_client) AS is_test_client_flagged
FROM public.clients;
-- object-name collision check for the tentative P6 objects (expect all absent → free to create)
SELECT 'proc' AS kind, proname AS name
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace AND n.nspname='public'
WHERE proname IN ('compliance_generation_preview','compliance_generation_execute',
                  'compliance_generation_verify','service_applicability_generate')
UNION ALL
SELECT 'table', relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
WHERE relname IN ('compliance_generation_run','compliance_generation_line','generation_run')
UNION ALL
SELECT 'event', event_name FROM public.audit_event_contract
WHERE event_name ~* 'compliance.generat|generation';
-- If B20 returns zero rows for the object-name block, the tentative P6 names (and migration
-- 0023) are collision-free. Confirm 0023 is unused: no supabase/migrations/0023_* file exists.

-- =====================================================================================
-- SUPPLEMENTAL (post-execution) — resolve B1 / B6 100-row UI truncation.
--   Added after the 22-Jul-2026 IST run, in which B1 and B6 were captured PARTIAL because
--   the Supabase result grid was limited to 100 rows. These queries are metadata-only,
--   aggregate-only, or batched per table so no result set exceeds ~100 rows. STILL READ-ONLY:
--   only SELECT / information_schema — NO DDL/DML/temp/mutation/RPC/trigger/transaction test.
--   NOT executed by Claude; for PJ to run on V2 only (after the B0 manual project-ref confirm).
-- =====================================================================================

-- B1-S(i) — per-table column COUNT (tiny result; proves total inventory size, no truncation)
SELECT table_name, count(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'service_catalogue','client_service_applicability','clients','client_registrations',
    'financial_years','accounting_tracker','financials_tracker','income_tax_tracker',
    'gst_tracker','tds_tracker','roc_tracker','llp_tracker','audit_tracker',
    'payroll_tracker','trust_ngo_tracker','notice_tracker','compliance_calendar',
    'tasks','team','audit_log','audit_event_contract')
GROUP BY table_name
ORDER BY table_name;

-- B1-S(ii) — full column inventory, ONE TABLE AT A TIME (each result < 100 rows; no truncation).
--   Run once per table by editing :tbl; do NOT run all-at-once (that is the truncated B1).
--   Suggested order (largest first): gst_tracker, income_tax_tracker, roc_tracker, tds_tracker,
--   audit_tracker, accounting_tracker, notice_tracker, payroll_tracker, financials_tracker,
--   compliance_calendar, client_service_applicability, client_registrations, clients, tasks,
--   team, service_catalogue, financial_years, audit_log, audit_event_contract, trust_ngo_tracker.
SELECT ordinal_position, column_name, data_type, character_maximum_length,
       numeric_precision, numeric_scale, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gst_tracker'   -- <<< edit this one identifier per table, then re-run
ORDER BY ordinal_position;

-- B6-S(i) — grant COUNTS per table + grantee (aggregate; no truncation)
SELECT table_name, grantee, count(*) AS privilege_count
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon','authenticated','service_role','PUBLIC')
  AND table_name IN (
    'service_catalogue','client_service_applicability','accounting_tracker',
    'financials_tracker','income_tax_tracker','gst_tracker','tds_tracker',
    'roc_tracker','llp_tracker','audit_tracker','payroll_tracker','trust_ngo_tracker',
    'notice_tracker','compliance_calendar','tasks','audit_log','audit_event_contract')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- B6-S(ii-a) — APPLICATION-FACING roles (anon / authenticated / PUBLIC): write privileges on the
--   generation-target trackers + calendar, AGGREGATED one row per (table, grantee) so the result is
--   bounded at 12 tables x 3 roles = 36 rows max (well under the 100-row UI limit; no truncation).
--   This is the surface T-08 would harden for INSERT/DELETE (UPDATE noted separately, not broadly revoked).
SELECT table_name, grantee,
       string_agg(privilege_type, ',' ORDER BY privilege_type) AS write_privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon','authenticated','PUBLIC')
  AND privilege_type IN ('INSERT','UPDATE','DELETE')
  AND table_name IN (
    'accounting_tracker','financials_tracker','income_tax_tracker','gst_tracker',
    'tds_tracker','roc_tracker','llp_tracker','audit_tracker','payroll_tracker',
    'trust_ngo_tracker','notice_tracker','compliance_calendar')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- B6-S(ii-b) — SERVICE_ROLE only: write privileges on the same tables, aggregated one row per table
--   (12 rows max; no truncation). Kept separate so the service_role boundary is assessed on its own.
SELECT table_name, 'service_role' AS grantee,
       string_agg(privilege_type, ',' ORDER BY privilege_type) AS write_privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'service_role'
  AND privilege_type IN ('INSERT','UPDATE','DELETE')
  AND table_name IN (
    'accounting_tracker','financials_tracker','income_tax_tracker','gst_tracker',
    'tds_tracker','roc_tracker','llp_tracker','audit_tracker','payroll_tracker',
    'trust_ngo_tracker','notice_tracker','compliance_calendar')
GROUP BY table_name
ORDER BY table_name;

-- B7-S — EXECUTE-privilege surface on write-capable generation/applicability functions
--   (companion to the B7/B8 finding that `authenticated` holds EXECUTE on write-capable
--   functions — the material security item). Metadata-only, small result.
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security,
       pg_get_userbyid(p.proowner) AS owner,
       COALESCE(array_to_string(p.proacl, ' | '), '(default: PUBLIC)') AS acl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname ~* 'generate_client_compliance|activate_accounting_service|service_applicability_(create|update|set_status)'
ORDER BY p.proname;

-- =====================================================================================
-- END OF READ-ONLY DISCOVERY KIT (incl. supplemental B1-S/B6-S/B7-S). Nothing writes.
-- =====================================================================================
