-- ============================================================================
-- YAV2 — Portal V2 — DISCREPANCY-CLOSURE  CONSOLIDATED SINGLE-JSON VARIANT
-- ----------------------------------------------------------------------------
-- File:    supabase/verification/YAV2_DISCREPANCY_CLOSURE_CONSOLIDATED_JSON.sql
-- Purpose: A CONVENIENCE variant of the approved kit
--          supabase/verification/YAV2_DISCREPANCY_CLOSURE_SELECT_ONLY.sql
--          that returns ONE JSON object (one result row, one column) so the
--          Supabase SQL Editor shows a SINGLE result. It preserves EVERY block
--          from the approved kit (A1, A2, A5, G1–G11b, T1–T7, F1–F4) as a keyed
--          member of that JSON object. The approved multi-block kit remains the
--          governing source of truth; this file adds nothing new and changes no
--          check logic — it only re-shapes identical read-only queries into one
--          aggregate JSON projection.
--
-- STATUS:  DRAFT — NOT EXECUTED. Authored locally. No SQL has been run. No
--          Supabase access. The approved kit file is UNCHANGED.
--
-- ============================ SAFETY CONTRACT ===============================
--  * The file contains EXACTLY ONE executable statement; it begins with WITH.
--  * ZERO writes: no INSERT/UPDATE/DELETE/UPSERT/MERGE, no DDL, no GRANT/REVOKE,
--    no DO/CALL/COPY/VACUUM/ANALYZE/REFRESH, no SET ROLE / SET SESSION AUTH.
--  * NO application function is invoked (no public.<fn>() call). get_current_fy()
--    is NOT called; the current FY is read from public.financial_years.
--  * OUTPUT DISCIPLINE: catalog metadata, booleans, aggregate counts, function
--    proconfig/ACL and non-sensitive integrity aggregates ONLY. No client value,
--    PII, PAN, Aadhaar, GSTIN, TAN, CIN, LLPIN or financial figure is projected.
--    GSTIN is only COUNTed (WHERE gstin IS NOT NULL); client_id is used ONLY in
--    GROUP BY / set-difference and is NOT projected into the JSON.
--
-- ============================ TARGET DISCIPLINE =============================
--  AUTHORISED TARGET (only): Supabase project  yav2-dev / ref ogjrwemjefvccpyjwxuo
--  STRICTLY PROHIBITED:      V1 / Production    / ref zcszesuvjrryxtigjglt
--  SQL cannot prove the project ref. The JSON's A5_operator_gate member repeats
--  the manual confirmation requirement; confirm the Editor header reads yav2-dev
--  BEFORE running. If it does not, STOP — run nothing.
--
--  Governing baseline commit: c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5
-- ============================================================================

WITH
-- [A1] session identity
a1 AS (
  SELECT current_database()                    AS db_name,
         current_user                          AS run_as,
         session_user                          AS session_user,
         now()                                 AS executed_at_utc,
         (now() AT TIME ZONE 'Asia/Kolkata')   AS executed_at_ist,
         (now() AT TIME ZONE 'Asia/Kolkata')::date AS ist_date_for_fy
),
-- [A2] server identity
a2 AS (
  SELECT current_setting('server_version_num') AS server_version_num,
         current_setting('search_path')        AS session_search_path,
         current_setting('TimeZone')           AS session_timezone
),

-- ===================== SECTION G — GRANT POSTURE =====================
-- [G1] raw table grants per role
g1 AS (
  SELECT c.relname AS table_name,
         COALESCE(r.rolname,'PUBLIC') AS grantee,
         ae.privilege_type
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
  LEFT JOIN pg_roles r ON r.oid = ae.grantee
  WHERE n.nspname='public' AND c.relkind='r'
    AND COALESCE(r.rolname,'PUBLIC') IN ('anon','authenticated','service_role','PUBLIC')
),
-- [G2] raw-grant pivot matrix
g2 AS (
  SELECT table_name,
         bool_or(grantee='anon'          AND priv='SELECT') AS anon_select,
         bool_or(grantee='anon'          AND priv IN ('INSERT','UPDATE','DELETE')) AS anon_write,
         bool_or(grantee='authenticated' AND priv='SELECT') AS auth_select,
         bool_or(grantee='authenticated' AND priv='INSERT') AS auth_insert,
         bool_or(grantee='authenticated' AND priv='UPDATE') AS auth_update,
         bool_or(grantee='authenticated' AND priv='DELETE') AS auth_delete,
         bool_or(grantee='service_role'  AND priv IN ('INSERT','UPDATE','DELETE')) AS svc_write,
         bool_or(grantee='PUBLIC')                          AS public_any
  FROM (
    SELECT c.relname AS table_name,
           COALESCE(r.rolname,'PUBLIC') AS grantee,
           ae.privilege_type AS priv
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
    LEFT JOIN pg_roles r ON r.oid = ae.grantee
    WHERE n.nspname='public' AND c.relkind='r'
  ) g
  GROUP BY table_name
),
-- [G3] RLS / FORCE per table
g3 AS (
  SELECT c.relname AS table_name,
         c.relrowsecurity     AS rls_enabled,
         c.relforcerowsecurity AS rls_forced,
         (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'
),
-- [G4] policy inventory (role targets + command)
g4 AS (
  SELECT tablename, policyname, permissive, cmd, roles
  FROM pg_policies
  WHERE schemaname='public'
),
-- [G5] anon / PUBLIC policy probe (catalog-safe; expect zero)
g5 AS (
  SELECT n.nspname AS schemaname, c.relname AS tablename, pol.polname AS policyname,
         CASE pol.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                         WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
                         WHEN '*' THEN 'ALL' END AS cmd,
         pol.polpermissive AS permissive,
         COALESCE(r.rolname, CASE WHEN role_oid = 0 THEN 'PUBLIC' ELSE '(unknown)' END) AS applies_to_role
  FROM pg_policy pol
  JOIN pg_class c     ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL unnest(
    CASE WHEN cardinality(pol.polroles)=0 THEN ARRAY[0]::oid[] ELSE pol.polroles END
  ) AS role_oid
  LEFT JOIN pg_roles r ON r.oid = role_oid
  WHERE n.nspname='public' AND (role_oid = 0 OR r.rolname = 'anon')
),
-- [G6] legacy *_authenticated_all probe (expect zero)
g6 AS (
  SELECT tablename, policyname, cmd, roles
  FROM pg_policies
  WHERE schemaname='public'
    AND policyname LIKE '%\_authenticated\_all' ESCAPE '\'
),
-- [G7] BYPASSRLS / superuser role attributes
g7 AS (
  SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcanlogin
  FROM pg_roles
  WHERE rolname IN ('anon','authenticated','service_role','authenticator',
                    'postgres','supabase_admin','pg_database_owner')
),
-- [G8] public-schema CREATE privilege (named roles)
g8 AS (
  SELECT r.rolname,
         has_schema_privilege(r.rolname,'public','CREATE') AS can_create_in_public,
         has_schema_privilege(r.rolname,'public','USAGE')  AS can_use_public
  FROM pg_roles r
  WHERE r.rolname IN ('anon','authenticated','service_role')
),
-- [G8b] public-schema raw ACL (PUBLIC OID 0 preserved)
g8b AS (
  SELECT COALESCE(r.rolname,'PUBLIC') AS grantee, ae.privilege_type
  FROM pg_namespace n
  CROSS JOIN LATERAL aclexplode(n.nspacl) AS ae
  LEFT JOIN pg_roles r ON r.oid = ae.grantee
  WHERE n.nspname='public'
),
-- [G9] anon effective-access — privilege-specific (helper CTEs promoted)
g9_ap AS (
  SELECT c.oid AS relid, c.relname,
         bool_or(ae.privilege_type='SELECT')     AS anon_select,
         bool_or(ae.privilege_type='INSERT')     AS anon_insert,
         bool_or(ae.privilege_type='UPDATE')     AS anon_update,
         bool_or(ae.privilege_type='DELETE')     AS anon_delete,
         bool_or(ae.privilege_type='TRUNCATE')   AS anon_truncate,
         bool_or(ae.privilege_type='REFERENCES') AS anon_references,
         bool_or(ae.privilege_type='TRIGGER')    AS anon_trigger,
         bool_or(ae.privilege_type='MAINTAIN')   AS anon_maintain   -- PG-17 (added post-execution; see kit [G9] note)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
  LEFT JOIN pg_roles r ON r.oid=ae.grantee
  WHERE n.nspname='public' AND c.relkind='r' AND r.rolname='anon'
  GROUP BY c.oid, c.relname
),
g9_tbl AS (
  SELECT c.oid AS relid, c.relname, c.relrowsecurity AS rls_on
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'
),
g9_pol AS (
  SELECT DISTINCT pol.polrelid AS relid
  FROM pg_policy pol
  CROSS JOIN LATERAL unnest(
    CASE WHEN cardinality(pol.polroles)=0 THEN ARRAY[0]::oid[] ELSE pol.polroles END
  ) AS role_oid
  LEFT JOIN pg_roles r ON r.oid = role_oid
  WHERE role_oid = 0 OR r.rolname = 'anon'
),
g9 AS (
  SELECT
    t.relname AS table_name,
    t.rls_on,
    COALESCE(ap.anon_select,false)     AS g_select,
    COALESCE(ap.anon_insert,false)     AS g_insert,
    COALESCE(ap.anon_update,false)     AS g_update,
    COALESCE(ap.anon_delete,false)     AS g_delete,
    COALESCE(ap.anon_truncate,false)   AS g_truncate,
    COALESCE(ap.anon_references,false) AS g_references,
    COALESCE(ap.anon_trigger,false)    AS g_trigger,
    COALESCE(ap.anon_maintain,false)   AS g_maintain,
    (pp.relid IS NOT NULL)             AS anon_or_public_policy,
    CASE
      WHEN NOT COALESCE(ap.anon_select,false)        THEN 'BLOCKED_NO_GRANT'
      WHEN pp.relid IS NOT NULL                      THEN 'REVIEW_POLICY'
      WHEN NOT t.rls_on                              THEN 'REVIEW_RLS_OFF'
      ELSE 'BLOCKED_BY_RLS'
    END AS read_verdict,
    CASE
      WHEN NOT (COALESCE(ap.anon_insert,false) OR COALESCE(ap.anon_update,false)
                OR COALESCE(ap.anon_delete,false))   THEN 'BLOCKED_NO_GRANT'
      WHEN pp.relid IS NOT NULL                      THEN 'REVIEW_POLICY'
      WHEN NOT t.rls_on                              THEN 'REVIEW_RLS_OFF'
      ELSE 'BLOCKED_BY_RLS'
    END AS data_write_verdict,
    CASE
      WHEN COALESCE(ap.anon_truncate,false) OR COALESCE(ap.anon_references,false)
           OR COALESCE(ap.anon_trigger,false) OR COALESCE(ap.anon_maintain,false)
                                                     THEN 'GRANT_PRESENT'
      ELSE 'BLOCKED_NO_GRANT'
    END AS object_admin_verdict
  FROM g9_tbl t
  LEFT JOIN g9_ap ap ON ap.relid = t.relid
  LEFT JOIN g9_pol pp ON pp.relid = t.relid
),
-- [G10] object inventory
g10 AS (
  SELECT
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind='r') AS tables,
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind='v') AS views,
    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public') AS functions
),
-- [G11] pg_default_acl evidence (supporting only)
g11 AS (
  SELECT COALESCE(dr.rolname,'(owner-scope / unnamed)') AS default_for_role,
         CASE WHEN d.defaclnamespace = 0 THEN '(all schemas)' ELSE ns.nspname END AS schema_scope,
         CASE d.defaclobjtype WHEN 'r' THEN 'table' WHEN 'S' THEN 'sequence'
                              WHEN 'f' THEN 'function' WHEN 'T' THEN 'type'
                              WHEN 'n' THEN 'schema' END AS object_type,
         COALESCE(gr.rolname,'PUBLIC') AS grantee,
         ae.privilege_type
  FROM pg_default_acl d
  LEFT JOIN pg_roles     dr ON dr.oid = d.defaclrole
  LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
  LEFT JOIN pg_roles     gr ON gr.oid = ae.grantee
  WHERE d.defaclobjtype = 'r'
    AND (d.defaclnamespace = 0 OR ns.nspname = 'public')
),
-- [G11b] pg_default_acl presence summary (supporting only)
g11b AS (
  SELECT grantee,
         bool_or(priv='SELECT')                               AS default_select,
         bool_or(priv IN ('INSERT','UPDATE','DELETE'))        AS default_data_write,
         bool_or(priv IN ('TRUNCATE','REFERENCES','TRIGGER')) AS default_object_admin,
         count(*)                                             AS default_priv_rows
  FROM (
    SELECT COALESCE(gr.rolname,'PUBLIC') AS grantee, ae.privilege_type AS priv
    FROM pg_default_acl d
    LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
    LEFT JOIN pg_roles gr ON gr.oid = ae.grantee
    WHERE d.defaclobjtype = 'r'
      AND (d.defaclnamespace = 0 OR ns.nspname = 'public')
  ) da
  WHERE grantee IN ('anon','authenticated','service_role','PUBLIC')
  GROUP BY grantee
),

-- ===================== SECTION T — TRACKER VARIANCE (PROVISIONAL) =====================
-- [T1] live totals vs frozen baseline + grain decomposition
t1 AS (
  SELECT 'accounting_tracker' AS tracker,
         (SELECT count(*) FROM public.accounting_tracker) AS live_count,
         312 AS frozen_baseline,
         (SELECT count(*) FROM public.accounting_tracker) - 312 AS delta,
         12 AS rows_per_client_fy,
         ((SELECT count(*) FROM public.accounting_tracker) - 312) / 12.0 AS implied_new_client_fy_pairs
  UNION ALL
  SELECT 'financials_tracker',
         (SELECT count(*) FROM public.financials_tracker), 120,
         (SELECT count(*) FROM public.financials_tracker) - 120, 5,
         ((SELECT count(*) FROM public.financials_tracker) - 120) / 5.0
  UNION ALL
  SELECT 'income_tax_tracker',
         (SELECT count(*) FROM public.income_tax_tracker), 26,
         (SELECT count(*) FROM public.income_tax_tracker) - 26, 1,
         ((SELECT count(*) FROM public.income_tax_tracker) - 26) / 1.0
  UNION ALL
  SELECT 'compliance_calendar',
         (SELECT count(*) FROM public.compliance_calendar), 0,
         (SELECT count(*) FROM public.compliance_calendar) - 0, 0,
         NULL
),
-- [T2] counts by financial year
t2 AS (
  SELECT 'accounting_tracker' AS tracker, fy_label, count(*) AS rows
  FROM public.accounting_tracker GROUP BY fy_label
  UNION ALL
  SELECT 'financials_tracker', fy_label, count(*)
  FROM public.financials_tracker GROUP BY fy_label
  UNION ALL
  SELECT 'income_tax_tracker', fy_label, count(*)
  FROM public.income_tax_tracker GROUP BY fy_label
),
-- [T3] distinct clients and (client, FY) pairs
t3 AS (
  SELECT 'accounting_tracker' AS tracker,
         count(DISTINCT client_id) AS distinct_clients,
         count(DISTINCT (client_id, fy_label)) AS distinct_client_fy_pairs
  FROM public.accounting_tracker
  UNION ALL
  SELECT 'financials_tracker', count(DISTINCT client_id), count(DISTINCT (client_id, fy_label))
  FROM public.financials_tracker
  UNION ALL
  SELECT 'income_tax_tracker', count(DISTINCT client_id), count(DISTINCT (client_id, fy_label))
  FROM public.income_tax_tracker
),
-- [T4] grain-integrity histogram (no client_id projected)
t4 AS (
  SELECT 'accounting_tracker' AS tracker, rows_per_pair, count(*) AS num_pairs FROM (
    SELECT client_id, fy_label, count(*) AS rows_per_pair
    FROM public.accounting_tracker GROUP BY client_id, fy_label
  ) a GROUP BY rows_per_pair
  UNION ALL
  SELECT 'financials_tracker', rows_per_pair, count(*) FROM (
    SELECT client_id, fy_label, count(*) AS rows_per_pair
    FROM public.financials_tracker GROUP BY client_id, fy_label
  ) f GROUP BY rows_per_pair
  UNION ALL
  SELECT 'income_tax_tracker', rows_per_pair, count(*) FROM (
    SELECT client_id, fy_label, count(*) AS rows_per_pair
    FROM public.income_tax_tracker GROUP BY client_id, fy_label
  ) i GROUP BY rows_per_pair
),
-- [T5] accounting-vs-core asymmetry (counts only; helper CTEs promoted)
t5_acc AS (SELECT DISTINCT client_id, fy_label FROM public.accounting_tracker),
t5_inc AS (SELECT DISTINCT client_id, fy_label FROM public.income_tax_tracker),
t5 AS (
  SELECT
    (SELECT count(*) FROM t5_acc) AS accounting_pairs,
    (SELECT count(*) FROM t5_inc) AS income_tax_pairs,
    (SELECT count(*) FROM (SELECT * FROM t5_acc EXCEPT SELECT * FROM t5_inc) x) AS accounting_only_pairs,
    (SELECT count(*) FROM (SELECT * FROM t5_inc EXCEPT SELECT * FROM t5_acc) y) AS income_tax_only_pairs
),
-- [T6] compliance_calendar = 0 explanation (counts only; GSTIN never projected)
t6 AS (
  SELECT
    (SELECT count(*) FROM public.compliance_calendar) AS compliance_calendar_rows,
    (SELECT count(*) FROM public.gst_tracker)         AS gst_tracker_rows,
    (SELECT count(*) FROM public.gst_registration_details WHERE gstin IS NOT NULL) AS client_gstins_present
),
-- [T7] current FY without invoking get_current_fy()
t7 AS (
  SELECT
    (SELECT fy_label FROM public.financial_years WHERE is_current = true LIMIT 1) AS fy_by_flag,
    (SELECT fy_label FROM public.financial_years
       WHERE (now() AT TIME ZONE 'Asia/Kolkata')::date BETWEEN fy_start_date AND fy_end_date
       LIMIT 1) AS fy_by_date,
    (SELECT count(*) FROM public.financial_years) AS financial_years_rows
),

-- ===================== SECTION F — SECURITY DEFINER search_path =====================
-- [F1] live proconfig for the 10 in-scope functions
f1 AS (
  SELECT p.proname,
         pg_get_function_identity_arguments(p.oid) AS identity_args,
         p.prosecdef AS is_security_definer,
         CASE p.provolatile WHEN 'i' THEN 'IMMUTABLE' WHEN 's' THEN 'STABLE'
                            WHEN 'v' THEN 'VOLATILE' END AS volatility,
         o.rolname AS owner,
         p.proconfig AS proconfig
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  LEFT JOIN pg_roles o ON o.oid = p.proowner
  WHERE n.nspname='public'
    AND p.proname IN (
      'activate_accounting_service','ensure_financial_year_horizon',
      'expected_backfill_start_fy','generate_client_compliance',
      'generate_client_compliance_core','get_current_fy','get_my_role',
      'get_my_team_id','is_admin','resolve_client_start_fy')
),
-- [F2] search_path classification for the 10
f2 AS (
  SELECT proname, args, sp AS live_search_path,
         CASE
           WHEN sp IS NULL                        THEN 'UNPINNED'
           WHEN sp LIKE 'search_path=pg_catalog%' THEN 'HARDENED_PGCATALOG'
           WHEN sp = 'search_path=public, pg_temp' THEN 'MATCH_REPO_PGTEMP'
           ELSE 'DIVERGENT_OTHER'
         END AS classification,
         (sp LIKE '%pg_catalog%') AS pg_catalog_present
  FROM (
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           (SELECT cfg FROM unnest(p.proconfig) AS cfg WHERE cfg LIKE 'search_path=%') AS sp
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN (
        'activate_accounting_service','ensure_financial_year_horizon',
        'expected_backfill_start_fy','generate_client_compliance',
        'generate_client_compliance_core','get_current_fy','get_my_role',
        'get_my_team_id','is_admin','resolve_client_start_fy')
  ) f
),
-- [F3] EXECUTE grants on the 10 (PUBLIC OID 0 preserved)
f3 AS (
  SELECT p.proname, COALESCE(r.rolname,'PUBLIC') AS grantee, ae.privilege_type
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  CROSS JOIN LATERAL aclexplode(p.proacl) AS ae
  LEFT JOIN pg_roles r ON r.oid = ae.grantee
  WHERE n.nspname='public'
    AND p.proname IN (
      'activate_accounting_service','ensure_financial_year_horizon',
      'expected_backfill_start_fy','generate_client_compliance',
      'generate_client_compliance_core','get_current_fy','get_my_role',
      'get_my_team_id','is_admin','resolve_client_start_fy')
),
-- [F4] fleet-wide: SECURITY DEFINER fns not pinning pg_catalog first
f4 AS (
  SELECT proname, args, sp AS live_search_path
  FROM (
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           p.prosecdef,
           (SELECT cfg FROM unnest(p.proconfig) AS cfg WHERE cfg LIKE 'search_path=%') AS sp
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
  ) f
  WHERE f.prosecdef
    AND (f.sp IS NULL OR f.sp NOT LIKE 'search_path=pg_catalog%')
)

-- ===================== SINGLE CONSOLIDATED JSON RESULT =====================
SELECT jsonb_build_object(
  'meta', jsonb_build_object(
    'kit',                          'YAV2_DISCREPANCY_CLOSURE_CONSOLIDATED_JSON',
    'derived_from',                 'supabase/verification/YAV2_DISCREPANCY_CLOSURE_SELECT_ONLY.sql',
    'governing_baseline_commit',    'c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5',
    'required_project_ref',         'ogjrwemjefvccpyjwxuo',
    'prohibited_project_ref',       'zcszesuvjrryxtigjglt',
    'output_discipline',            'catalog / aggregate / boolean only — no PII, no client values, no GSTIN/PAN/etc.',
    'grant_origin_conclusion',      'LIKELY PLATFORM/DEFAULT-ENVIRONMENT ORIGIN — HISTORICAL PROVENANCE NOT CONCLUSIVELY AVAILABLE FROM THE CURRENT CATALOG EVIDENCE',
    'tracker_status',               'PROVISIONAL — SUBJECT TO LIVE T2-T6 CONFIRMATION',
    'note',                         'Single-result JSON consolidation of all G/T/F blocks; block IDs preserved as keys; logic identical to the approved kit.'
  ),
  'A1_session',        (SELECT to_jsonb(x) FROM a1 x),
  'A2_server',         (SELECT to_jsonb(x) FROM a2 x),
  'A5_operator_gate',  jsonb_build_object(
    'action',                'MANUAL CONFIRMATION REQUIRED',
    'required_project_ref',  'ogjrwemjefvccpyjwxuo',
    'prohibited_project_ref','zcszesuvjrryxtigjglt',
    'operator_instruction',  'Confirm the Editor header shows yav2-dev before running. If not, STOP.'
  ),

  'G1_raw_grants',            (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.table_name, x.grantee, x.privilege_type), '[]'::jsonb) FROM g1 x),
  'G2_grant_matrix',          (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.table_name), '[]'::jsonb) FROM g2 x),
  'G3_rls_force',             (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.table_name), '[]'::jsonb) FROM g3 x),
  'G4_policy_inventory',      (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.tablename, x.policyname), '[]'::jsonb) FROM g4 x),
  'G5_anon_public_policies',  (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.tablename, x.policyname), '[]'::jsonb) FROM g5 x),
  'G6_authenticated_all',     (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.tablename), '[]'::jsonb) FROM g6 x),
  'G7_bypassrls_roles',       (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.rolname), '[]'::jsonb) FROM g7 x),
  'G8_public_create_named',   (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.rolname), '[]'::jsonb) FROM g8 x),
  'G8b_public_schema_acl',    (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.grantee, x.privilege_type), '[]'::jsonb) FROM g8b x),
  'G9_anon_effective_access', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.read_verdict DESC, x.data_write_verdict DESC, x.object_admin_verdict DESC, x.table_name), '[]'::jsonb) FROM g9 x),
  'G10_object_inventory',     (SELECT to_jsonb(x) FROM g10 x),
  'G11_default_acl',          (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.default_for_role, x.schema_scope, x.grantee, x.privilege_type), '[]'::jsonb) FROM g11 x),
  'G11b_default_acl_summary', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.grantee), '[]'::jsonb) FROM g11b x),

  'T1_totals_vs_baseline',    (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.tracker), '[]'::jsonb) FROM t1 x),
  'T2_counts_by_fy',          (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.tracker, x.fy_label), '[]'::jsonb) FROM t2 x),
  'T3_distinct_clients_pairs',(SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.tracker), '[]'::jsonb) FROM t3 x),
  'T4_grain_histogram',       (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.tracker, x.rows_per_pair), '[]'::jsonb) FROM t4 x),
  'T5_accounting_vs_core',    (SELECT to_jsonb(x) FROM t5 x),
  'T6_calendar_gstin',        (SELECT to_jsonb(x) FROM t6 x),
  'T7_current_fy',            (SELECT to_jsonb(x) FROM t7 x),

  'F1_proconfig',             (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.proname, x.identity_args), '[]'::jsonb) FROM f1 x),
  'F2_search_path_class',     (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.proname, x.args), '[]'::jsonb) FROM f2 x),
  'F3_execute_grants',        (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.proname, x.grantee, x.privilege_type), '[]'::jsonb) FROM f3 x),
  'F4_fleet_not_pgcatalog',   (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY (x.live_search_path IS NULL) DESC, x.proname, x.args), '[]'::jsonb) FROM f4 x)
) AS discrepancy_closure_json;
