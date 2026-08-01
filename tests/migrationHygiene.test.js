import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  analyzeMigrationSql, createdPublicTables, stripSqlComments,
} from '../.github/scripts/check_migration_hygiene.mjs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const tbl = (r, name) => r.tables.find((t) => t.table === name)

/* ── Baseline behaviours ─────────────────────────────────────────────────── */

test('createdPublicTables finds all public CREATE TABLEs incl. IF NOT EXISTS', () => {
  assert.deepEqual(
    createdPublicTables(`CREATE TABLE public.a(); CREATE TABLE IF NOT EXISTS public.b();`),
    ['a', 'b'])
})

test('a commented-out CREATE TABLE does not count', () => {
  const r = analyzeMigrationSql(`-- CREATE TABLE public.ghost ();\n/* CREATE TABLE public.p (); */\nSELECT 1;`)
  assert.equal(r.createsPublicTable, false)
  assert.equal(r.ok, true)
})

test('a migration with no public table is trivially compliant', () => {
  const r = analyzeMigrationSql(`CREATE OR REPLACE FUNCTION public.f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$; REVOKE ALL ON FUNCTION public.f() FROM PUBLIC, anon;`)
  assert.equal(r.createsPublicTable, false)
  assert.equal(r.ok, true)
})

/* ── Static REVOKE ALL: object + data + rls all satisfied ────────────────── */

test('static REVOKE ALL + RLS passes (object, data, rls all covered)', () => {
  const r = analyzeMigrationSql(`
    CREATE TABLE public.widget (id uuid);
    ALTER TABLE public.widget ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.widget FORCE ROW LEVEL SECURITY;
    REVOKE ALL ON public.widget FROM PUBLIC, anon;`)
  assert.equal(r.ok, true)
  const t = tbl(r, 'widget')
  assert.ok(t.obj && t.data && t.rls && t.force)
})

/* ── Correction 2: anon data-privilege disposition ───────────────────────── */

test('explicit object + explicit data REVOKE passes', () => {
  const r = analyzeMigrationSql(`
    CREATE TABLE public.g (id uuid);
    ALTER TABLE public.g ENABLE ROW LEVEL SECURITY;
    REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.g FROM anon;
    REVOKE SELECT, INSERT, UPDATE, DELETE ON public.g FROM anon;`)
  assert.equal(r.ok, true)
})

test('correct TABLE-SPECIFIC marker + RLS passes (data waived for THAT table)', () => {
  const r = analyzeMigrationSql(`
    -- YAV2-ANON-DATA-ACCESS: public.pub INTENTIONAL-RLS-GOVERNED
    CREATE TABLE public.pub (id uuid);
    ALTER TABLE public.pub ENABLE ROW LEVEL SECURITY;
    REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.pub FROM anon;`)
  assert.equal(r.ok, true)
  assert.equal(tbl(r, 'pub').data, true)
  assert.equal(tbl(r, 'pub').marker, true)
})

test('a marker for table A does NOT waive table B — B fails', () => {
  const r = analyzeMigrationSql(`
    -- YAV2-ANON-DATA-ACCESS: public.a INTENTIONAL-RLS-GOVERNED
    CREATE TABLE public.a (id uuid);
    CREATE TABLE public.b (id uuid);
    ALTER TABLE public.a ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.b ENABLE ROW LEVEL SECURITY;
    REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.a FROM anon;
    REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.b FROM anon;`)
  assert.equal(r.ok, false)
  assert.equal(tbl(r, 'a').ok, true)                 // a: object revoke + marker + rls
  assert.equal(tbl(r, 'b').ok, false)                // b: no data revoke, no marker of its own
  assert.match(tbl(r, 'b').violations.join(), /data privileges/)
})

test('a marker naming a NON-created table gives no waiver — the created table fails', () => {
  const r = analyzeMigrationSql(`
    -- YAV2-ANON-DATA-ACCESS: public.ghost INTENTIONAL-RLS-GOVERNED
    CREATE TABLE public.real (id uuid);
    ALTER TABLE public.real ENABLE ROW LEVEL SECURITY;
    REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.real FROM anon;`)
  assert.equal(r.ok, false)
  assert.equal(tbl(r, 'real').marker, false)
  assert.match(tbl(r, 'real').violations.join(), /data privileges/)
})

test('two created tables each with their own exact marker + RLS — both pass', () => {
  const r = analyzeMigrationSql(`
    -- YAV2-ANON-DATA-ACCESS: public.m1 INTENTIONAL-RLS-GOVERNED
    -- YAV2-ANON-DATA-ACCESS: public.m2 INTENTIONAL-RLS-GOVERNED
    CREATE TABLE public.m1 (id uuid);
    CREATE TABLE public.m2 (id uuid);
    ALTER TABLE public.m1 ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.m2 ENABLE ROW LEVEL SECURITY;
    REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.m1 FROM anon;
    REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.m2 FROM anon;`)
  assert.equal(r.ok, true)
  assert.ok(r.tables.every((t) => t.marker && t.ok))
})

test('table-specific marker WITHOUT RLS fails', () => {
  const r = analyzeMigrationSql(`
    -- YAV2-ANON-DATA-ACCESS: public.nom INTENTIONAL-RLS-GOVERNED
    CREATE TABLE public.nom (id uuid);
    REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.nom FROM anon;`)
  assert.equal(r.ok, false)
  const v = tbl(r, 'nom').violations.join()
  assert.match(v, /ROW LEVEL SECURITY/)      // rls missing
  assert.match(v, /data privileges/)          // marker cannot waive data without RLS
})

test('a marker NEVER waives the object-privilege revoke', () => {
  const r = analyzeMigrationSql(`
    -- YAV2-ANON-DATA-ACCESS: public.objleak INTENTIONAL-RLS-GOVERNED
    CREATE TABLE public.objleak (id uuid);
    ALTER TABLE public.objleak ENABLE ROW LEVEL SECURITY;`)  // marker + RLS but NO object revoke
  assert.equal(r.ok, false)
  assert.equal(tbl(r, 'objleak').obj, false)
  assert.match(tbl(r, 'objleak').violations.join(), /object-privilege REVOKE/)
})

test('object REVOKE + RLS but NO data revoke and NO marker FAILS', () => {
  const r = analyzeMigrationSql(`
    CREATE TABLE public.leakdata (id uuid);
    ALTER TABLE public.leakdata ENABLE ROW LEVEL SECURITY;
    REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.leakdata FROM anon;`)
  assert.equal(r.ok, false)
  assert.match(tbl(r, 'leakdata').violations.join(), /data privileges/)
})

/* ── Correction 1: dynamic loop must PROVE coverage of every created table ── */

test('dynamic loop over a RESOLVABLE array covering ALL created tables passes', () => {
  const r = analyzeMigrationSql(`
    CREATE TABLE public.alpha (id uuid);
    CREATE TABLE public.beta  (id uuid);
    DO $$ DECLARE t text; BEGIN
      FOREACH t IN ARRAY ARRAY['alpha','beta'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', t);
      END LOOP;
    END $$;`)
  assert.equal(r.ok, true)
  assert.ok(r.tables.every((t) => t.obj && t.data && t.rls))
})

test('dynamic loop covering only SOME created tables FAILS for the uncovered table', () => {
  const r = analyzeMigrationSql(`
    CREATE TABLE public.alpha (id uuid);
    CREATE TABLE public.beta  (id uuid);
    CREATE TABLE public.gamma (id uuid);
    DO $$ DECLARE t text; BEGIN
      FOREACH t IN ARRAY ARRAY['alpha','beta'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', t);
      END LOOP;
    END $$;`)
  assert.equal(r.ok, false)
  assert.equal(tbl(r, 'alpha').ok, true)
  assert.equal(tbl(r, 'beta').ok, true)
  assert.equal(tbl(r, 'gamma').ok, false)   // not in the loop array
})

test('named-array loop (0015 style) covering all created tables passes', () => {
  const r = analyzeMigrationSql(`
    CREATE TABLE public.a1 (id uuid);
    CREATE TABLE public.a2 (id uuid);
    DO $g$ DECLARE t text; all_new text[] := ARRAY['a1','a2']; BEGIN
      FOREACH t IN ARRAY all_new LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', t);
      END LOOP;
    END $g$;`)
  assert.equal(r.ok, true)
})

test('an UNRESOLVED loop (iterates a query) does NOT prove coverage → FAIL', () => {
  const r = analyzeMigrationSql(`
    CREATE TABLE public.dyn (id uuid);
    DO $$ DECLARE t text; BEGIN
      FOREACH t IN ARRAY (SELECT array_agg(tablename) FROM pg_tables) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', t);
      END LOOP;
    END $$;`)
  assert.equal(r.ok, false)
})

test('UNRESOLVED loop RESCUED by a residual post-check that covers every created table passes', () => {
  const r = analyzeMigrationSql(`
    CREATE TABLE public.rescued (id uuid);
    DO $$ DECLARE t text; BEGIN
      FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', t);
      END LOOP;
    END $$;
    DO $chk$ DECLARE tt text; chk text[] := ARRAY['rescued']; priv text; BEGIN
      FOREACH tt IN ARRAY chk LOOP
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||tt)::regclass) THEN
          RAISE EXCEPTION 'no rls on %', tt; END IF;
        FOREACH priv IN ARRAY ARRAY['TRUNCATE','REFERENCES','TRIGGER','SELECT','INSERT','UPDATE','DELETE'] LOOP
          IF has_table_privilege('anon', ('public.'||tt)::regclass, priv) THEN
            RAISE EXCEPTION 'anon % on %', priv, tt; END IF;
        END LOOP;
      END LOOP;
    END $chk$;`)
  assert.equal(r.ok, true, JSON.stringify(tbl(r, 'rescued')))
})

/* ── Missing pieces still fail ───────────────────────────────────────────── */

test('missing RLS fails', () => {
  const r = analyzeMigrationSql(`CREATE TABLE public.norls (id uuid); REVOKE ALL ON public.norls FROM PUBLIC, anon;`)
  assert.equal(r.ok, false)
  assert.match(tbl(r, 'norls').violations.join(), /ROW LEVEL SECURITY/)
})

test('a REVOKE that does not name anon does NOT satisfy the guard', () => {
  const r = analyzeMigrationSql(`
    CREATE TABLE public.other (id uuid);
    ALTER TABLE public.other ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.other FROM PUBLIC, authenticated;`)
  assert.equal(r.ok, false)
  assert.equal(tbl(r, 'other').obj, false)
})

/* ── PRESERVED: real repo migrations remain compliant ────────────────────── */

test('REAL: 0015 (client master foundation) is COMPLIANT', () => {
  const r = analyzeMigrationSql(read('../supabase/migrations/0015_m1a_client_master_foundation.sql'), '0015')
  assert.equal(r.createsPublicTable, true)
  assert.equal(r.ok, true, r.tables.filter((t) => !t.ok).map((t) => `${t.table}:${t.violations}`).join(' | '))
})

test('REAL: 0021 (service applicability) is COMPLIANT', () => {
  const r = analyzeMigrationSql(read('../supabase/migrations/0021_service_applicability.sql'), '0021')
  assert.equal(r.createsPublicTable, true)
  assert.equal(r.ok, true, r.tables.filter((t) => !t.ok).map((t) => `${t.table}:${t.violations}`).join(' | '))
})
