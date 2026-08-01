import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createdPublicTables, stripSqlComments } from '../.github/scripts/check_migration_hygiene.mjs'

const mig = (n) => new URL(`../supabase/migrations/${n}`, import.meta.url)
const read = (n) => readFileSync(mig(n), 'utf8')
const code = (n) => stripSqlComments(read(n))

// Renumbered 0023->0025 .. 0028->0030 to avoid the T4-claimed 0023/0024.
const MIGRATIONS = [
  '0025_phase4c_audit_roles.sql',
  '0026_phase4c_audit_indexes.sql',
  '0027_phase4c_audit_validation_reconcile.sql',
  '0028_phase4c_audit_access_reconcile.sql',
  '0029_phase4c_canonical_writer_reconcile.sql',
  '0030_phase4c_event_contract_seed.sql',
]

/* ── Structure & renumbering ──────────────────────────────────────────────── */
test('every 0025–0030 migration has a paired _rollback.sql', () => {
  for (const m of MIGRATIONS) {
    assert.ok(existsSync(mig(m.replace(/\.sql$/, '_rollback.sql'))), `missing rollback for ${m}`)
  }
})

test('no stale 0023/0024 phase4c files remain (T4 collision avoided)', () => {
  for (const n of ['0023_phase4c_audit_roles.sql', '0024_phase4c_audit_indexes.sql']) {
    assert.ok(!existsSync(mig(n)), `${n} must not exist (renumbered to 0025/0026)`)
  }
})

/* ── Extend-in-place ──────────────────────────────────────────────────────── */
test('EXTEND IN PLACE — no reconciled migration creates a public table', () => {
  for (const m of MIGRATIONS) assert.deepEqual(createdPublicTables(code(m)), [], `${m} must not CREATE TABLE public.*`)
})
test('no reconciled migration recreates an audit table', () => {
  for (const m of MIGRATIONS)
    assert.doesNotMatch(code(m), /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.audit_/i, `${m}`)
})

/* ── 0025 roles / 0026 indexes ────────────────────────────────────────────── */
test('0025 creates audit roles idempotently; rollback drops them', () => {
  const c = code('0025_phase4c_audit_roles.sql')
  assert.match(c, /IF NOT EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = 'audit_owner'\)[\s\S]*?CREATE ROLE audit_owner/i)
  assert.match(c, /CREATE ROLE audit_writer\s+NOLOGIN NOINHERIT NOCREATEROLE NOCREATEDB/i)
  const rb = code('0025_phase4c_audit_roles_rollback.sql')
  assert.match(rb, /DROP ROLE audit_writer/i); assert.match(rb, /DROP ROLE audit_owner/i)
})
test('0026 adds 8 idempotent indexes; rollback drops exactly those 8', () => {
  const creates = [...read('0026_phase4c_audit_indexes.sql').matchAll(/CREATE INDEX IF NOT EXISTS (\w+)/gi)].map((m) => m[1])
  assert.equal(creates.length, 8)
  const drops = [...read('0026_phase4c_audit_indexes_rollback.sql').matchAll(/DROP INDEX IF EXISTS public\.(\w+)/gi)].map((m) => m[1])
  assert.deepEqual(drops.sort(), creates.sort())
})

/* ── Correction #2: 0027 pins the EXACT audit_is_uuid signature ───────────── */
test('0027 asserts audit_is_uuid(text) exactly — return, security, immutability, search_path', () => {
  const c = code('0027_phase4c_audit_validation_reconcile.sql')
  assert.match(c, /audit_is_uuid\(text\)/i, 'must pin the (text) overload, not uuid')
  assert.doesNotMatch(c, /audit_is_uuid\(uuid\)/i, 'must NOT accept uuid as interchangeable')
  assert.match(c, /return<>boolean/i)
  assert.match(c, /not_security_definer/i)
  assert.match(c, /not_immutable/i)
  assert.match(c, /search_path_not_pinned/i)
})

/* ── Collision functions preserved; no competing writer ───────────────────── */
test('the three collision functions are NOT redefined', () => {
  for (const m of MIGRATIONS)
    for (const fn of ['get_app_role', 'get_app_role_for_user', 'get_sensitive_audit_logs'])
      assert.doesNotMatch(code(m), new RegExp(`create\\s+(or replace\\s+)?function\\s+public\\.${fn}\\b`, 'i'), `${m}:${fn}`)
})
test('no competing Phase 4C writer/reader is defined', () => {
  for (const m of MIGRATIONS)
    for (const fn of ['log_audit_event_trusted_backend', '_write_read_audit', '_record_audit_failure'])
      assert.doesNotMatch(code(m), new RegExp(`create\\s+(or replace\\s+)?function\\s+public\\.${fn}\\b`, 'i'), `${m}:${fn}`)
})

/* ── Correction #3: 0029 asserts PUBLIC has no EXECUTE ─────────────────────── */
test('0029 explicitly asserts PUBLIC has no EXECUTE on audit_write_event', () => {
  const c = code('0029_phase4c_canonical_writer_reconcile.sql')
  assert.match(c, /grantee\s*=\s*0/i, 'must detect PUBLIC (grantee oid 0)')
  assert.match(c, /acldefault\(\s*'f'/i, 'must surface the PUBLIC-default (NULL proacl) case')
  assert.match(c, /disallowed grantee/i)
  assert.match(c, /audit_write_event/i)
})

/* ── Default-deny preserved ───────────────────────────────────────────────── */
test('no permissive policy is created on audit tables', () => {
  for (const m of MIGRATIONS) assert.doesNotMatch(code(m), /create\s+policy/i, `${m}`)
})

/* ── Correction #1: 0030 fail-closed seed + exact-inverse rollback ────────── */
test('0030 is fail-closed on pre-existing events and does NOT use ON CONFLICT', () => {
  const c = code('0030_phase4c_event_contract_seed.sql')
  assert.doesNotMatch(c, /ON CONFLICT/i, 'must NOT use ON CONFLICT (provenance/rollback ownership must be unambiguous)')
  // fail-closed absence precondition
  assert.match(c, /count\(\*\)[\s\S]*?audit_event_contract[\s\S]*?event_name = ANY/i)
  assert.match(c, /PRECONDITION FAILED \(fail-closed\)/i)
})
test('0030 inserts exactly 23 distinct events; rollback deletes exactly those 23', () => {
  const c = code('0030_phase4c_event_contract_seed.sql')
  // events inside the INSERT VALUES rows (each row begins ('name',...)
  const seeded = [...c.matchAll(/\('([a-z]+\.[a-z_.]+)'/g)].map((m) => m[1]).filter((e) => !e.startsWith('public.'))
  const uniq = [...new Set(seeded)]
  assert.equal(uniq.length, 23, `expected 23 distinct seeded events, got ${uniq.length}`)
  const rb = code('0030_phase4c_event_contract_seed_rollback.sql')
  assert.match(rb, /DELETE FROM public\.audit_event_contract/i)
  assert.doesNotMatch(rb, /TRUNCATE/i)
  for (const ev of uniq) assert.ok(rb.includes(`'${ev}'`), `rollback must delete seeded event ${ev}`)
  // rollback deletes ONLY the 23 (guarded by event_name = ANY(...) — never unqualified)
  assert.match(rb, /WHERE event_name = ANY/i)
})

/* ── Assertion migrations fail-closed ─────────────────────────────────────── */
test('reconcile assertion migrations are fail-closed', () => {
  for (const m of ['0027_phase4c_audit_validation_reconcile.sql',
                   '0028_phase4c_audit_access_reconcile.sql',
                   '0029_phase4c_canonical_writer_reconcile.sql'])
    assert.match(code(m), /RAISE EXCEPTION/i, `${m}`)
})
