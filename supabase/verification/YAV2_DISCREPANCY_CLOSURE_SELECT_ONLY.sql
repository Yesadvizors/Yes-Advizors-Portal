-- ============================================================================
-- YAV2 — Portal V2 — DISCREPANCY-CLOSURE  SELECT-ONLY VERIFICATION KIT
-- ----------------------------------------------------------------------------
-- File:    supabase/verification/YAV2_DISCREPANCY_CLOSURE_SELECT_ONLY.sql
-- Purpose: Read-only closure of the THREE specific discrepancies carried out of
--          the 28-Jul-2026 YAV2 reconciliation (decision: PASS WITH SPECIFIC
--          CORRECTIONS):
--            1. TABLE GRANT POSTURE  — why anon/authenticated/service_role show
--               broad table privileges; raw grants vs RLS/FORCE/policies vs
--               effective access; table-by-table classification.
--            2. TRACKER COUNT VARIANCE — reconcile accounting 312->360,
--               financials 120->135, income_tax 26->29, compliance_calendar 0->0
--               using aggregate, non-sensitive queries only.
--            3. SECURITY DEFINER search_path REVIEW — compare the 10 observed
--               functions' live proconfig against the governing repo source;
--               assess pinning pg_catalog first.
--
-- STATUS:  DRAFT — NOT EXECUTED. Authored locally. No SQL has been run.
--
-- ============================ SAFETY CONTRACT ===============================
--  * EVERY executable statement in this file begins with SELECT or WITH.
--  * ZERO writes: no INSERT/UPDATE/DELETE/UPSERT/MERGE, no DDL
--    (CREATE/ALTER/DROP/TRUNCATE/COMMENT/SECURITY LABEL), no GRANT/REVOKE,
--    no DO/CALL/COPY/VACUUM/ANALYZE/REFRESH, no SET ROLE / SET SESSION
--    AUTHORIZATION, no write transaction blocks.
--  * NO application function is invoked. In particular this kit does NOT call
--    public.get_current_fy() (owner-only, and it is application code); the
--    current FY is derived from public.financial_years by a pure SELECT.
--  * OUTPUT DISCIPLINE: catalog metadata, booleans, aggregate counts, function
--    proconfig/ACL, and non-sensitive integrity queries ONLY. No client value,
--    PII, PAN, Aadhaar, GSTIN, TAN, CIN, LLPIN or financial figure is selected
--    anywhere. Where GSTIN presence must be counted (Section T), only
--    COUNT(*) WHERE gstin IS NOT NULL is used — the value is never projected.
--    client_id (an internal surrogate uuid / YA-code) is used ONLY inside
--    GROUP BY / set-difference for grain reconciliation; it is never joined to
--    any name/identifier table.
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
--  Editor. Capture every result into the closure report. Blocks are independent;
--  a permission error in one does not invalidate others — label that block
--  UNKNOWN / NOT VISIBLE and continue.
--
--  Governing baseline commit: c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5
--  Governing branch:          sync/integration
--  Kit branch (local only):   verification/v2-0021-0024-reconciliation-kit
-- ============================================================================


-- ############################################################################
-- ## SECTION A — ENVIRONMENT FINGERPRINT & TARGET GATE
-- ############################################################################

-- [A1] Core session identity (database, roles, timestamp, IST clock).
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
  current_setting('server_version_num')                AS server_version_num,
  current_setting('search_path')                       AS session_search_path,
  current_setting('TimeZone')                          AS session_timezone;

-- [A5] OPERATOR CONFIRMATION GATE — project identity.
--      SQL cannot read the Supabase project ref. Look at the Supabase Editor
--      header NOW. If it does not read "yav2-dev" / "ogjrwemjefvccpyjwxuo",
--      STOP IMMEDIATELY and run nothing else.
SELECT
  'MANUAL CONFIRMATION REQUIRED'                        AS action,
  'ogjrwemjefvccpyjwxuo'                                AS required_project_ref_v2_yav2_dev,
  'zcszesuvjrryxtigjglt'                                AS prohibited_project_ref_v1_prod,
  'Confirm the Editor header shows yav2-dev before continuing. If not, STOP.'
                                                        AS operator_instruction;


-- ############################################################################
-- ## SECTION G — TABLE GRANT POSTURE  (Discrepancy Area 1)
-- ##   Distinguish RAW GRANTS from RLS / FORCE / POLICIES from EFFECTIVE ACCESS.
-- ##   "Do not assume broad grants are harmless merely because RLS exists."
-- ############################################################################

-- [G1] RAW TABLE GRANTS per role, table-by-table — the authoritative source of
--      the "broad privileges" observation. Uses aclexplode so PUBLIC (grantee
--      OID 0, which has NO pg_roles row) is NOT silently dropped: a LEFT JOIN to
--      pg_roles yields NULL -> COALESCE'd to 'PUBLIC'.
--      NOTE: relacl IS NULL means "owner-default only, no non-owner grant".
--      QUALIFIED ORIGIN: no ALTER DEFAULT PRIVILEGES / GRANT ON ALL TABLES exists
--      in the governing repository, so the broad grants are of LIKELY
--      platform/default-environment origin. [G11]/[G11b] (pg_default_acl) are
--      SUPPORTING evidence only: they show the CURRENT default-privilege
--      configuration and can support or weaken that hypothesis, but they CANNOT
--      by themselves prove the historical origin of ACLs already attached to
--      existing tables (default privileges may have changed before or after
--      those tables were created). FINAL CONCLUSION: LIKELY PLATFORM/DEFAULT-
--      ENVIRONMENT ORIGIN — HISTORICAL PROVENANCE NOT CONCLUSIVELY AVAILABLE FROM
--      THE CURRENT CATALOG EVIDENCE.
SELECT
  c.relname                                            AS table_name,
  COALESCE(r.rolname, 'PUBLIC')                         AS grantee,
  ae.privilege_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
LEFT JOIN pg_roles r ON r.oid = ae.grantee
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND COALESCE(r.rolname, 'PUBLIC') IN ('anon','authenticated','service_role','PUBLIC')
ORDER BY table_name, grantee, privilege_type;

-- [G2] RAW GRANTS pivoted to a per-table matrix for the three client roles +
--      PUBLIC. TRUE = that role holds that privilege directly (before RLS).
WITH g AS (
  SELECT c.relname AS table_name,
         COALESCE(r.rolname,'PUBLIC') AS grantee,
         ae.privilege_type AS priv
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
  LEFT JOIN pg_roles r ON r.oid = ae.grantee
  WHERE n.nspname='public' AND c.relkind='r'
)
SELECT
  table_name,
  bool_or(grantee='anon'          AND priv='SELECT') AS anon_select,
  bool_or(grantee='anon'          AND priv IN ('INSERT','UPDATE','DELETE')) AS anon_write,
  bool_or(grantee='authenticated' AND priv='SELECT') AS auth_select,
  bool_or(grantee='authenticated' AND priv='INSERT') AS auth_insert,
  bool_or(grantee='authenticated' AND priv='UPDATE') AS auth_update,
  bool_or(grantee='authenticated' AND priv='DELETE') AS auth_delete,
  bool_or(grantee='service_role'  AND priv IN ('INSERT','UPDATE','DELETE')) AS svc_write,
  bool_or(grantee='PUBLIC')                          AS public_any
FROM g
GROUP BY table_name
ORDER BY table_name;

-- [G3] RLS state per table: is Row-Level Security ENABLED, and is it FORCED?
--      ENABLE alone does NOT bind the table owner; FORCE does. Neither binds a
--      role holding BYPASSRLS (see [G7]).
SELECT
  c.relname                                            AS table_name,
  c.relrowsecurity                                     AS rls_enabled,
  c.relforcerowsecurity                                AS rls_forced,
  (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
ORDER BY table_name;

-- [G4] POLICY INVENTORY — role targets and command per policy. Predicate bodies
--      are NOT dumped (no need; and they may embed column names). We only need
--      WHO (roles) and WHICH command each policy permits.
SELECT
  tablename,
  policyname,
  permissive,
  cmd,
  roles
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename, policyname;

-- [G5] ANON / PUBLIC POLICY PROBE (design expectation: ZERO). CATALOG-SAFE:
--      reads pg_policy.polroles (oid[]) directly rather than the rendered
--      pg_policies.roles text. A policy that applies to PUBLIC is stored as
--      polroles = {0} (OID 0), which has NO pg_roles row and does NOT render as a
--      role name — so a text-only check silently misses it. Here OID 0 is mapped
--      explicitly to 'PUBLIC', and a zero-length polroles (also = all roles) is
--      surfaced too. Any row = anon or PUBLIC can reach rows on that table.
SELECT
  n.nspname                                            AS schemaname,
  c.relname                                            AS tablename,
  pol.polname                                          AS policyname,
  CASE pol.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                  WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
                  WHEN '*' THEN 'ALL' END               AS cmd,
  pol.polpermissive                                    AS permissive,
  COALESCE(r.rolname, CASE WHEN role_oid = 0 THEN 'PUBLIC' ELSE '(unknown)' END)
                                                        AS applies_to_role
FROM pg_policy pol
JOIN pg_class c     ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL unnest(
  CASE WHEN cardinality(pol.polroles) = 0 THEN ARRAY[0]::oid[] ELSE pol.polroles END
) AS role_oid
LEFT JOIN pg_roles r ON r.oid = role_oid
WHERE n.nspname = 'public'
  AND (role_oid = 0 OR r.rolname = 'anon')      -- 0 = PUBLIC (all roles), or explicit anon
ORDER BY tablename, policyname;

-- [G6] CRITICAL LEGACY-POLICY PROBE (must be ZERO rows). Migration 0006 shipped
--      an open "<table>_authenticated_all  FOR ALL TO authenticated USING(true)
--      WITH CHECK(true)" on the 20 operational tables; migration 0010 DROPS them
--      before applying the role model. If any *_authenticated_all survives live,
--      every authenticated user has full read/write on that table -> CRITICAL.
SELECT
  tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname='public'
  AND policyname LIKE '%\_authenticated\_all' ESCAPE '\'
ORDER BY tablename;

-- [G7] BYPASSRLS / SUPERUSER role attributes. Supabase service_role has
--      BYPASSRLS -> it reads/writes EVERY table regardless of RLS or FORCE. This
--      is why service_role's broad grant CANNOT be mitigated by RLS; the control
--      is secret-handling (keep the service_role key server/Edge-only).
SELECT
  rolname, rolsuper, rolbypassrls, rolcreatedb, rolcanlogin
FROM pg_roles
WHERE rolname IN ('anon','authenticated','service_role','authenticator',
                  'postgres','supabase_admin','pg_database_owner')
ORDER BY rolname;

-- [G8] public-schema CREATE privilege. A search_path pinned to 'public' (see
--      Section F) is only injection-safe if untrusted roles CANNOT create objects
--      in public to shadow what a function resolves. Expected: anon/authenticated
--      CANNOT CREATE in public (prior evidence: CREATE locked to
--      pg_database_owner). Both the named-role probe and the schema ACL are shown.
SELECT
  r.rolname,
  has_schema_privilege(r.rolname, 'public', 'CREATE') AS can_create_in_public,
  has_schema_privilege(r.rolname, 'public', 'USAGE')  AS can_use_public
FROM pg_roles r
WHERE r.rolname IN ('anon','authenticated','service_role')
ORDER BY r.rolname;

-- [G8b] Raw schema ACL for public (aclexplode; PUBLIC OID 0 preserved). Any row
--       granting 'CREATE' to anon/authenticated/PUBLIC contradicts [G8] and would
--       upgrade the Section-F bare-'public' concern from theoretical to live.
SELECT
  COALESCE(r.rolname,'PUBLIC') AS grantee,
  ae.privilege_type
FROM pg_namespace n
CROSS JOIN LATERAL aclexplode(n.nspacl) AS ae
LEFT JOIN pg_roles r ON r.oid = ae.grantee
WHERE n.nspname='public'
ORDER BY grantee, privilege_type;

-- [G9] EFFECTIVE-ACCESS SYNTHESIS for anon — PRIVILEGE-SPECIFIC. Each table
--      privilege is analysed separately (no single bool_or stands in for the
--      rest), then rolled into THREE independent verdicts:
--        * read_verdict            (governed by SELECT)
--        * data_write_verdict      (governed by INSERT / UPDATE / DELETE)
--        * object_admin_verdict    (TRUNCATE / REFERENCES / TRIGGER / MAINTAIN)
--      Inputs: raw anon grants (aclexplode, per privilege), RLS on/off ([G3]),
--      and catalog-safe anon/PUBLIC policy presence (pg_policy.polroles incl.
--      OID 0 = PUBLIC). Verdict legend:
--        BLOCKED_NO_GRANT     -> anon holds none of that privilege class
--        BLOCKED_BY_RLS       -> grant present, RLS on, no anon/PUBLIC policy
--        REVIEW_RLS_OFF       -> grant present but RLS disabled (investigate)
--        REVIEW_POLICY        -> an anon/PUBLIC policy exists (investigate)
--      NB: RLS only mediates SELECT/INSERT/UPDATE/DELETE. TRUNCATE/REFERENCES/
--      TRIGGER/MAINTAIN are NOT row-filtered by RLS, so any anon grant of those
--      is flagged directly (GRANT_PRESENT) regardless of RLS — they must simply
--      be absent.
--      POST-EXECUTION REVISION (2026-07-30): the PostgreSQL-17 MAINTAIN privilege
--      is now included in the object-admin rollup. The version EXECUTED on
--      2026-07-30 11:15 IST (kit SHA 1ea286666a79b9597c69dab15e4d52ed9b8b4d03cc16da98e5e7a7d67a9833d9)
--      rolled up TRUNCATE/REFERENCES/TRIGGER only; MAINTAIN was nonetheless
--      VISIBLE in the raw ACL evidence ([G1]/[G8b]/[G11]). The already-executed
--      evidence JSON is NOT altered; this is a future-verification improvement.
WITH ap AS (   -- per-table anon privilege booleans (privilege-specific)
  SELECT c.oid AS relid, c.relname,
         bool_or(ae.privilege_type='SELECT')     AS anon_select,
         bool_or(ae.privilege_type='INSERT')     AS anon_insert,
         bool_or(ae.privilege_type='UPDATE')     AS anon_update,
         bool_or(ae.privilege_type='DELETE')     AS anon_delete,
         bool_or(ae.privilege_type='TRUNCATE')   AS anon_truncate,
         bool_or(ae.privilege_type='REFERENCES') AS anon_references,
         bool_or(ae.privilege_type='TRIGGER')    AS anon_trigger,
         bool_or(ae.privilege_type='MAINTAIN')   AS anon_maintain
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) AS ae
  LEFT JOIN pg_roles r ON r.oid=ae.grantee
  WHERE n.nspname='public' AND c.relkind='r' AND r.rolname='anon'
  GROUP BY c.oid, c.relname
),
tbl AS (
  SELECT c.oid AS relid, c.relname, c.relrowsecurity AS rls_on
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'
),
anon_pub_pol AS (   -- catalog-safe: anon OR PUBLIC(OID 0 / empty polroles)
  SELECT DISTINCT pol.polrelid AS relid
  FROM pg_policy pol
  CROSS JOIN LATERAL unnest(
    CASE WHEN cardinality(pol.polroles)=0 THEN ARRAY[0]::oid[] ELSE pol.polroles END
  ) AS role_oid
  LEFT JOIN pg_roles r ON r.oid = role_oid
  WHERE role_oid = 0 OR r.rolname = 'anon'
)
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
  -- READ verdict (SELECT, RLS-mediated)
  CASE
    WHEN NOT COALESCE(ap.anon_select,false)        THEN 'BLOCKED_NO_GRANT'
    WHEN pp.relid IS NOT NULL                      THEN 'REVIEW_POLICY'
    WHEN NOT t.rls_on                              THEN 'REVIEW_RLS_OFF'
    ELSE 'BLOCKED_BY_RLS'
  END AS read_verdict,
  -- DATA-WRITE verdict (INSERT/UPDATE/DELETE, RLS-mediated)
  CASE
    WHEN NOT (COALESCE(ap.anon_insert,false) OR COALESCE(ap.anon_update,false)
              OR COALESCE(ap.anon_delete,false))   THEN 'BLOCKED_NO_GRANT'
    WHEN pp.relid IS NOT NULL                      THEN 'REVIEW_POLICY'
    WHEN NOT t.rls_on                              THEN 'REVIEW_RLS_OFF'
    ELSE 'BLOCKED_BY_RLS'
  END AS data_write_verdict,
  -- OBJECT/ADMIN verdict (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN, NOT RLS-mediated)
  CASE
    WHEN COALESCE(ap.anon_truncate,false) OR COALESCE(ap.anon_references,false)
         OR COALESCE(ap.anon_trigger,false) OR COALESCE(ap.anon_maintain,false)
                                                   THEN 'GRANT_PRESENT'
    ELSE 'BLOCKED_NO_GRANT'
  END AS object_admin_verdict
FROM tbl t
LEFT JOIN ap ON ap.relid = t.relid
LEFT JOIN anon_pub_pol pp ON pp.relid = t.relid
ORDER BY read_verdict DESC, data_write_verdict DESC, object_admin_verdict DESC, table_name;

-- [G10] Object inventory sanity — table / view / function counts (drift check
--       against prior evidence 39 tables / 51 functions / 3 views).
SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r')            AS tables,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='v')            AS views,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public')                              AS functions;

-- [G11] DEFAULT-PRIVILEGE (pg_default_acl) EVIDENCE — SUPPORTING evidence for the
--       grant-origin hypothesis (NOT a proof of historical origin). It shows the
--       CURRENT default-privilege configuration and can SUPPORT or WEAKEN the
--       platform/default-environment-origin hypothesis; it CANNOT by itself prove
--       how ACLs already attached to existing tables were acquired, because
--       default privileges may have changed before or after those tables were
--       created. Covers default privileges for TABLE objects ('r') scoped to
--       schema public OR all schemas (defaclnamespace=0). defaclrole = the
--       owner/role FOR WHOM the default applies (e.g. postgres, the table-owner
--       role). grantee is aclexplode'd with OID 0 preserved as PUBLIC. Rows
--       granting SELECT/INSERT/UPDATE/DELETE to anon/authenticated/service_role/
--       PUBLIC SUPPORT the likely-platform-default reading; NO such rows WEAKEN it
--       (origin would then be sought in explicit grants [G1], role membership, or
--       object-level ACL). Either way the final conclusion remains: LIKELY
--       PLATFORM/DEFAULT-ENVIRONMENT ORIGIN — HISTORICAL PROVENANCE NOT
--       CONCLUSIVELY AVAILABLE FROM THE CURRENT CATALOG EVIDENCE.
SELECT
  COALESCE(dr.rolname, '(owner-scope / unnamed)')      AS default_for_role,
  CASE WHEN d.defaclnamespace = 0 THEN '(all schemas)'
       ELSE ns.nspname END                             AS schema_scope,
  CASE d.defaclobjtype WHEN 'r' THEN 'table' WHEN 'S' THEN 'sequence'
                       WHEN 'f' THEN 'function' WHEN 'T' THEN 'type'
                       WHEN 'n' THEN 'schema' END       AS object_type,
  COALESCE(gr.rolname, 'PUBLIC')                        AS grantee,
  ae.privilege_type
FROM pg_default_acl d
LEFT JOIN pg_roles     dr ON dr.oid = d.defaclrole
LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
LEFT JOIN pg_roles     gr ON gr.oid = ae.grantee
WHERE d.defaclobjtype = 'r'                              -- TABLE default privileges
  AND (d.defaclnamespace = 0 OR ns.nspname = 'public')
ORDER BY default_for_role, schema_scope, grantee, privilege_type;

-- [G11b] DEFAULT-PRIVILEGE PRESENCE SUMMARY for the four client-relevant grantees.
--        Rolls [G11] up to a yes/no per grantee: does a standing TABLE default
--        privilege exist for public (or all schemas), and does it include any
--        write privilege? TRUE for anon here SUPPORTS (does not prove) the
--        platform/default-environment reading of anon's broad grant; zero rows
--        WEAKENS it. This is CURRENT-configuration evidence — it cannot establish
--        the historical origin of ACLs already on existing tables.
WITH da AS (
  SELECT COALESCE(gr.rolname, 'PUBLIC') AS grantee, ae.privilege_type AS priv
  FROM pg_default_acl d
  LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) AS ae
  LEFT JOIN pg_roles gr ON gr.oid = ae.grantee
  WHERE d.defaclobjtype = 'r'
    AND (d.defaclnamespace = 0 OR ns.nspname = 'public')
)
SELECT
  grantee,
  bool_or(priv='SELECT')                                   AS default_select,
  bool_or(priv IN ('INSERT','UPDATE','DELETE'))            AS default_data_write,
  bool_or(priv IN ('TRUNCATE','REFERENCES','TRIGGER'))     AS default_object_admin,
  count(*)                                                 AS default_priv_rows
FROM da
WHERE grantee IN ('anon','authenticated','service_role','PUBLIC')
GROUP BY grantee
ORDER BY grantee;


-- ############################################################################
-- ## SECTION T — TRACKER COUNT VARIANCE  (Discrepancy Area 2)
-- ##   PROVISIONAL — SUBJECT TO LIVE T2–T6 CONFIRMATION. The arithmetic below is
-- ##   SUPPORTING evidence only; FY rollover, new clients, absence of duplicates,
-- ##   the accounting/core asymmetry, and zero GSTIN population are NOT proven
-- ##   until these blocks are executed live.
-- ##   Aggregate, non-sensitive reconciliation ONLY. No PII / no values.
-- ##   Governing FROZEN baselines vs live counts:
-- ##     accounting_tracker  312 -> 360   (+48)
-- ##     financials_tracker  120 -> 135   (+15)
-- ##     income_tax_tracker   26 ->  29   (+3)
-- ##     compliance_calendar   0 ->   0   ( 0)
-- ##   Grain (from 0007 unique keys + 0014 generators):
-- ##     accounting  = 12 rows / (client_id, fy_label)   [per month]
-- ##     financials  =  5 rows / (client_id, fy_label)   [per doc_type]
-- ##     income_tax  =  1 row  / (client_id, fy_label)
-- ##     compliance_calendar = GST-derived only (0 if no GSTIN clients)
-- ############################################################################

-- [T1] LIVE TOTALS vs FROZEN BASELINE + expected grain decomposition of each
--      delta. A clean integer multiple of the grain => generation, not
--      duplication. A non-integer or off-grain remainder => investigate ([T4]).
SELECT 'accounting_tracker'  AS tracker,
       (SELECT count(*) FROM public.accounting_tracker) AS live_count,
       312 AS frozen_baseline,
       (SELECT count(*) FROM public.accounting_tracker) - 312 AS delta,
       12  AS rows_per_client_fy,
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
       NULL;

-- [T2] COUNTS BY FINANCIAL YEAR per tracker. Reveals whether the increase is a
--      new FY (expected 2026-27 for IST date 2026-07-30) rather than new clients.
SELECT 'accounting_tracker' AS tracker, fy_label, count(*) AS rows
FROM public.accounting_tracker GROUP BY fy_label
UNION ALL
SELECT 'financials_tracker', fy_label, count(*)
FROM public.financials_tracker GROUP BY fy_label
UNION ALL
SELECT 'income_tax_tracker', fy_label, count(*)
FROM public.income_tax_tracker GROUP BY fy_label
ORDER BY tracker, fy_label;

-- [T3] DISTINCT CLIENTS and DISTINCT (client, FY) PAIRS per tracker. Compare
--      pair counts to [T1] implied pairs; compare client counts to the frozen
--      client baseline (13) to separate "new client" from "new FY".
SELECT 'accounting_tracker' AS tracker,
       count(DISTINCT client_id) AS distinct_clients,
       count(DISTINCT (client_id, fy_label)) AS distinct_client_fy_pairs
FROM public.accounting_tracker
UNION ALL
SELECT 'financials_tracker', count(DISTINCT client_id), count(DISTINCT (client_id, fy_label))
FROM public.financials_tracker
UNION ALL
SELECT 'income_tax_tracker', count(DISTINCT client_id), count(DISTINCT (client_id, fy_label))
FROM public.income_tax_tracker;

-- [T4] GRAIN-INTEGRITY HISTOGRAM. For each tracker, how many (client, FY) pairs
--      carry N rows. EXPECTED: accounting all=12, financials all=5, income_tax
--      all=1. Any other bucket = partial or duplicate generation -> investigate.
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
ORDER BY tracker, rows_per_pair;

-- [T5] ACCOUNTING-vs-CORE ASYMMETRY. accounting_tracker is written by
--      activate_accounting_service; income_tax_tracker by
--      generate_client_compliance_core. Both use client_id uuid, so the pair
--      sets are directly comparable. The observed deltas imply 4 accounting
--      pairs vs 3 core pairs -> expect exactly 1 accounting-only pair (the
--      decoupled activation). This block enumerates the asymmetry as COUNTS only.
WITH acc AS (SELECT DISTINCT client_id, fy_label FROM public.accounting_tracker),
     inc AS (SELECT DISTINCT client_id, fy_label FROM public.income_tax_tracker)
SELECT
  (SELECT count(*) FROM acc)                                   AS accounting_pairs,
  (SELECT count(*) FROM inc)                                   AS income_tax_pairs,
  (SELECT count(*) FROM (SELECT * FROM acc EXCEPT SELECT * FROM inc) x) AS accounting_only_pairs,
  (SELECT count(*) FROM (SELECT * FROM inc EXCEPT SELECT * FROM acc) y) AS income_tax_only_pairs;

-- [T6] COMPLIANCE_CALENDAR = 0 EXPLANATION. The calendar is GST-derived only; it
--      stays 0 iff no active client carries a GSTIN (so gst_tracker is empty).
--      COUNTS ONLY — the GSTIN value itself is never selected.
SELECT
  (SELECT count(*) FROM public.compliance_calendar)                                  AS compliance_calendar_rows,
  (SELECT count(*) FROM public.gst_tracker)                                          AS gst_tracker_rows,
  (SELECT count(*) FROM public.gst_registration_details WHERE gstin IS NOT NULL)     AS client_gstins_present;

-- [T7] FY REFERENCE — current FY WITHOUT invoking get_current_fy(). Derived from
--      financial_years by (a) the is_current flag and (b) date containment of the
--      IST execution date. Both should agree and (for 2026-07-30) read 2026-27.
SELECT
  (SELECT fy_label FROM public.financial_years WHERE is_current = true LIMIT 1)      AS fy_by_flag,
  (SELECT fy_label FROM public.financial_years
     WHERE (now() AT TIME ZONE 'Asia/Kolkata')::date BETWEEN fy_start_date AND fy_end_date
     LIMIT 1)                                                                        AS fy_by_date,
  (SELECT count(*) FROM public.financial_years)                                      AS financial_years_rows;


-- ############################################################################
-- ## SECTION F — SECURITY DEFINER search_path REVIEW  (Discrepancy Area 3)
-- ##   Compare the 10 observed functions' LIVE proconfig to the governing repo
-- ##   source, and assess pinning pg_catalog first.
-- ##   Governing repo source (verified in migrations 0008 / 0014):
-- ##     ALL 10 pin  search_path = 'public', 'pg_temp'  (pg_catalog NOT first).
-- ############################################################################

-- [F1] LIVE proconfig for the 10 in-scope functions + owner + SECURITY DEFINER
--      flag + volatility + identity args. A function may be overloaded; args
--      disambiguate. proconfig NULL = NO search_path pinned (would be a defect).
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid)            AS identity_args,
  p.prosecdef                                          AS is_security_definer,
  CASE p.provolatile WHEN 'i' THEN 'IMMUTABLE'
                     WHEN 's' THEN 'STABLE'
                     WHEN 'v' THEN 'VOLATILE' END       AS volatility,
  o.rolname                                            AS owner,
  p.proconfig                                          AS proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN pg_roles o ON o.oid = p.proowner
WHERE n.nspname='public'
  AND p.proname IN (
    'activate_accounting_service','ensure_financial_year_horizon',
    'expected_backfill_start_fy','generate_client_compliance',
    'generate_client_compliance_core','get_current_fy','get_my_role',
    'get_my_team_id','is_admin','resolve_client_start_fy')
ORDER BY p.proname, identity_args;

-- [F2] search_path CLASSIFICATION per function. Extracts the search_path entry
--      from proconfig and classifies it against the governing repo value and the
--      pg_catalog-first hardening convention.
--        MATCH_REPO_PGTEMP    -> 'search_path=public, pg_temp'  (== repo source)
--        HARDENED_PGCATALOG   -> pg_catalog pinned first (stricter than repo)
--        UNPINNED             -> no search_path in proconfig (DEFECT)
--        DIVERGENT_OTHER      -> some other value (live/repo divergence)
WITH f AS (
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
)
SELECT
  proname, args, sp AS live_search_path,
  CASE
    WHEN sp IS NULL                                   THEN 'UNPINNED'
    WHEN sp LIKE 'search_path=pg_catalog%'            THEN 'HARDENED_PGCATALOG'
    WHEN sp = 'search_path=public, pg_temp'           THEN 'MATCH_REPO_PGTEMP'
    ELSE 'DIVERGENT_OTHER'
  END AS classification,
  (sp LIKE '%pg_catalog%') AS pg_catalog_present
FROM f
ORDER BY proname, args;

-- [F3] EXECUTE GRANTS on the 10 functions (aclexplode; PUBLIC OID 0 preserved).
--      Governing repo posture: only generate_client_compliance and
--      activate_accounting_service GRANT EXECUTE to authenticated + service_role;
--      the other 8 are REVOKE-ALL (owner-only). ANY anon/PUBLIC EXECUTE here is a
--      least-privilege variance to record (ties to the G-05 line of enquiry).
SELECT
  p.proname,
  COALESCE(r.rolname,'PUBLIC')                         AS grantee,
  ae.privilege_type
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
ORDER BY p.proname, grantee, privilege_type;

-- [F4] FLEET-WIDE search_path CONVENTION SCAN. Beyond the 10, show every
--      SECURITY DEFINER function whose search_path does NOT start with
--      pg_catalog. This scopes the "pin pg_catalog first" hardening across the
--      whole function fleet (read-only; recommendation only, no change proposed).
WITH f AS (
  SELECT p.proname,
         pg_get_function_identity_arguments(p.oid) AS args,
         p.prosecdef,
         (SELECT cfg FROM unnest(p.proconfig) AS cfg WHERE cfg LIKE 'search_path=%') AS sp
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
)
SELECT proname, args, sp AS live_search_path
FROM f
WHERE prosecdef
  AND (sp IS NULL OR sp NOT LIKE 'search_path=pg_catalog%')
ORDER BY (sp IS NULL) DESC, proname, args;


-- ############################################################################
-- ## END OF KIT — every executable statement above begins with SELECT or WITH.
-- ############################################################################
