-- ############################################################################
-- ##  REUSABLE SNIPPET — NEW PUBLIC TABLE PRIVILEGE HYGIENE                   ##
-- ##  TEMPLATE ONLY — this file lives under docs/ and is NOT a migration.     ##
-- ##  Copy the relevant block into your real migration under                  ##
-- ##  supabase/migrations/ and replace <TABLE> with your table name.          ##
-- ############################################################################
--
-- Convention: docs/yav2-migration-hygiene/YAV2_MIGRATION_PRIVILEGE_HYGIENE_CONVENTION.md
-- Enforced by: .github/scripts/check_migration_hygiene.mjs
--
-- Rule for every  CREATE TABLE public.<TABLE>  in the SAME migration file:
--   (1) REVOKE anon object privileges (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) — REQUIRED
--   (2) DISPOSE anon data privileges (SELECT, INSERT, UPDATE, DELETE) — REQUIRED, by EITHER
--         revoking all four from anon, OR the exact marker (Option C) + RLS enabled
--   (3) ENABLE ROW LEVEL SECURITY                                              — REQUIRED
--   (4) FORCE ROW LEVEL SECURITY                                               — recommended
--   (5) anon post-check that RAISES on any residual anon privilege             — recommended
-- Dynamic loops: the loop's table list must be statically resolvable (inline ARRAY[...] or
--   a named text[] := ARRAY[...] variable) and cover EVERY created table; otherwise add a
--   residual post-check (Option D) that iterates a resolvable array over every created table.
-- Ownership: create as the standard migration role (owner = postgres) in schema public.
-- Do NOT rely on ALTER DEFAULT PRIVILEGES to protect new tables (the postgres AND
-- supabase_admin default ACLs still re-grant anon on future tables — the Stage A finding).


-- ── OPTION A — static, per table (mirrors 0021) ─────────────────────────────
-- CREATE TABLE public.<TABLE> ( ... );

ALTER TABLE public.<TABLE> ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.<TABLE> FORCE  ROW LEVEL SECURITY;

-- REVOKE ALL covers the four object privileges AND the four data privileges from anon
-- (and PUBLIC). If a specific anon read path is intended, replace with an explicit
-- object-only REVOKE and document the retained data grant in the PR REVIEW PACK.
REVOKE ALL ON public.<TABLE> FROM PUBLIC, anon;

-- Add your RLS policies here (authenticated / role-scoped), e.g.:
-- CREATE POLICY <TABLE>_sel ON public.<TABLE> FOR SELECT TO authenticated USING ( ... );


-- ── OPTION C — intentional, RLS-governed anon DATA access (object still revoked) ─
-- Use ONLY when anonymous read access is deliberate and RLS gates the rows. The exact
-- TABLE-SPECIFIC marker below waives the DATA revoke for THAT ONE table only (never the
-- object revoke, never another table). RLS on that table is mandatory here.
--
-- -- YAV2-ANON-DATA-ACCESS: public.<TABLE> INTENTIONAL-RLS-GOVERNED
-- CREATE TABLE public.<TABLE> ( ... );
-- ALTER TABLE public.<TABLE> ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.<TABLE> FORCE  ROW LEVEL SECURITY;
-- REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.<TABLE> FROM anon;  -- object only
-- CREATE POLICY <TABLE>_anon_read ON public.<TABLE> FOR SELECT TO anon USING ( <predicate> );


-- ── OPTION B — dynamic loop over several new tables (mirrors 0015) ───────────
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOREACH t IN ARRAY ARRAY['<TABLE_1>','<TABLE_2>'] LOOP
--     EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
--     EXECUTE format('ALTER TABLE public.%I FORCE  ROW LEVEL SECURITY', t);
--     EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', t);
--   END LOOP;
-- END $$;


-- ── OPTION D — residual post-check (mirrors 0015); REQUIRED to prove coverage ─
--    when a dynamic loop's table list is not statically resolvable. Iterate a
--    resolvable array over EVERY created table and RAISE on any residual anon priv.
DO $$
DECLARE
  bad text;
BEGIN
  FOR bad IN
    SELECT unnest(ARRAY['<TABLE>'])          -- add every new table here
  LOOP
    IF has_table_privilege('anon', ('public.'||bad)::regclass, 'TRUNCATE')
       OR has_table_privilege('anon', ('public.'||bad)::regclass, 'REFERENCES')
       OR has_table_privilege('anon', ('public.'||bad)::regclass, 'TRIGGER')
       OR has_table_privilege('anon', ('public.'||bad)::regclass, 'INSERT')
       OR has_table_privilege('anon', ('public.'||bad)::regclass, 'UPDATE')
       OR has_table_privilege('anon', ('public.'||bad)::regclass, 'DELETE')
    THEN
      RAISE EXCEPTION 'anon still holds a privilege on public.% — hygiene REVOKE missing', bad;
    END IF;
  END LOOP;
END $$;

-- ############################################################################
-- ##  END OF SNIPPET — TEMPLATE ONLY — NOT A MIGRATION — NOT EXECUTED HERE    ##
-- ############################################################################
