-- ############################################################################
-- ##  YAV2 — MIGRATION HYGIENE — POST-MIGRATION VERIFICATION (SELECT ONLY)    ##
-- ##  READ-ONLY. Every statement begins SELECT/WITH. No DDL/DML/GRANT/REVOKE. ##
-- ##  No SET ROLE. No application-function calls. No sensitive values.        ##
-- ##  Target (future run): yav2-dev / ogjrwemjefvccpyjwxuo ONLY.              ##
-- ##  PROHIBITED: V1 / Production / zcszesuvjrryxtigjglt.                     ##
-- ############################################################################
--
-- Purpose: after a migration that creates public tables is applied, confirm the
-- hygiene convention held live: anon holds ZERO object-level privileges and RLS is
-- enabled. This is READ-ONLY verification; it changes nothing. Supply the new table
-- names via the VALUES list in [H0].


-- ── [H0] The tables to verify (edit the VALUES list to the new tables) ──────
WITH target_tables(table_name) AS (
  VALUES
    ('service_catalogue'),
    ('client_service_applicability')
    -- ('<new_table_1>'), ('<new_table_2>')
)
SELECT table_name
FROM target_tables
ORDER BY table_name;


-- ── [H1] anon object-level privileges on the target tables (expect 0 rows) ──
WITH target_tables(table_name) AS (
  VALUES ('service_catalogue'), ('client_service_applicability')
)
SELECT
  t.table_name,
  g.privilege_type,
  g.grantee
FROM target_tables t
JOIN information_schema.role_table_grants g
  ON g.table_schema = 'public'
 AND g.table_name   = t.table_name
WHERE g.grantee = 'anon'
  AND g.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','INSERT','UPDATE','DELETE','SELECT')
ORDER BY t.table_name, g.privilege_type;
-- PASS when this returns NO rows for the object privileges (TRUNCATE/REFERENCES/TRIGGER).
-- If a documented anon read path exists, SELECT may legitimately appear — record it.


-- ── [H2] MAINTAIN (PG-17) held by anon on the target tables (expect 0 rows) ─
WITH target_tables(table_name) AS (
  VALUES ('service_catalogue'), ('client_service_applicability')
)
SELECT
  t.table_name,
  a.privilege_type,
  a.is_grantable
FROM target_tables t
JOIN LATERAL aclexplode(
       COALESCE(c.relacl, acldefault('r', c.relowner))
     ) a ON true
JOIN pg_class      c ON c.relname = t.table_name
JOIN pg_namespace  n ON n.oid = c.relnamespace AND n.nspname = 'public'
JOIN pg_roles      r ON r.oid = a.grantee
WHERE r.rolname = 'anon'
  AND a.privilege_type = 'MAINTAIN'
ORDER BY t.table_name;
-- PASS when NO rows (anon holds no MAINTAIN default/explicit on the new tables).


-- ── [H3] RLS enabled (and forced) on the target tables (expect all true) ────
WITH target_tables(table_name) AS (
  VALUES ('service_catalogue'), ('client_service_applicability')
)
SELECT
  t.table_name,
  c.relrowsecurity  AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM target_tables t
JOIN pg_class     c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
ORDER BY t.table_name;
-- PASS when rls_enabled = true for every new table (rls_forced = true recommended).


-- ── [H4] Summary counts (expect anon_object_priv_rows = 0) ──────────────────
WITH target_tables(table_name) AS (
  VALUES ('service_catalogue'), ('client_service_applicability')
),
obj AS (
  SELECT t.table_name, g.privilege_type
  FROM target_tables t
  JOIN information_schema.role_table_grants g
    ON g.table_schema = 'public' AND g.table_name = t.table_name
  WHERE g.grantee = 'anon'
    AND g.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER')
)
SELECT
  (SELECT count(*) FROM target_tables)                        AS tables_checked,
  (SELECT count(*) FROM obj)                                  AS anon_object_priv_rows,
  (SELECT count(*) FROM target_tables t
     JOIN pg_class c ON c.relname = t.table_name
     JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname='public'
     WHERE c.relrowsecurity)                                  AS tables_with_rls_enabled;
-- PASS when anon_object_priv_rows = 0 AND tables_with_rls_enabled = tables_checked.

-- ############################################################################
-- ##  END — SELECT-ONLY POST-MIGRATION HYGIENE VERIFICATION                   ##
-- ############################################################################
