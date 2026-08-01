import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createdPublicTables, stripSqlComments } from '../.github/scripts/check_migration_hygiene.mjs'

const mig = (n) => new URL(`../supabase/migrations/${n}`, import.meta.url)
const read = (n) => readFileSync(mig(n), 'utf8')
const code = (n) => stripSqlComments(read(n))

// Reconciled set (live gate 2026-08-01): 0031 privilege remediation added; 0029 & 0030 corrected.
const MIGRATIONS = [
  '0025_phase4c_audit_roles.sql',
  '0026_phase4c_audit_indexes.sql',
  '0027_phase4c_audit_validation_reconcile.sql',
  '0028_phase4c_audit_access_reconcile.sql',
  '0029_phase4c_canonical_writer_reconcile.sql',
  '0030_phase4c_event_contract_seed.sql',
  '0031_phase4c_audit_privilege_remediation.sql',
]

test('every 0025–0031 migration has a paired _rollback.sql', () => {
  for (const m of MIGRATIONS) assert.ok(existsSync(mig(m.replace(/\.sql$/, '_rollback.sql'))), `missing rollback for ${m}`)
})

test('EXTEND IN PLACE — no reconciled migration creates a public table', () => {
  for (const m of MIGRATIONS) assert.deepEqual(createdPublicTables(code(m)), [], `${m}`)
})
test('no reconciled migration recreates an audit table', () => {
  for (const m of MIGRATIONS)
    assert.doesNotMatch(code(m), /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.audit_/i, m)
})

/* ── 0029 — competing-writer bug fixed; base helpers retained ──────────────── */
test('0029 guards ONLY log_audit_event_trusted_backend and requires the base helpers present', () => {
  const c = code('0029_phase4c_canonical_writer_reconcile.sql')
  // must NOT treat _write_read_audit / _record_audit_failure as competing writers
  assert.doesNotMatch(c, /proname IN \([^)]*'_write_read_audit'[^)]*\)/i)
  assert.doesNotMatch(c, /proname IN \([^)]*'_record_audit_failure'[^)]*\)/i)
  assert.match(c, /proname\s*=\s*'log_audit_event_trusted_backend'/i)
  // must assert the base helpers EXIST (retained)
  assert.match(c, /_write_read_audit\(text, uuid, jsonb\)/i)
  assert.match(c, /_record_audit_failure\(text, text, text\[\], text\)/i)
})

/* ── 0030 — 21 insert + 2 read events asserted S4; no downgrade ────────────── */
test('0030 does NOT use ON CONFLICT and inserts EXACTLY 21 events', () => {
  const c = code('0030_phase4c_event_contract_seed.sql')
  assert.doesNotMatch(c, /ON CONFLICT/i)
  // isolate the INSERT VALUES block (the $pre_read$ precondition also lists the 2 read events)
  const start = c.indexOf('INSERT INTO public.audit_event_contract')
  const end = c.indexOf('Postcondition') > 0 ? c.indexOf('Postcondition') : c.length
  const insBlock = c.slice(start, end)
  const seeded = [...insBlock.matchAll(/\('([a-z]+\.[a-z_.]+)','[A-Z]+','S[0-9]'/g)].map((m) => m[1])
  const uniq = [...new Set(seeded)]
  assert.equal(uniq.length, 21, `expected 21 inserted events, got ${uniq.length}`)
  assert.ok(!uniq.includes('audit.log.read_requested') && !uniq.includes('audit.log.read_completed'),
    'the 2 pre-existing read events must NOT be in the INSERT set')
})
test('0030 fail-closed: 21 non-read absent AND 2 read events EXACTLY S4 canonical', () => {
  const c = code('0030_phase4c_event_contract_seed.sql')
  assert.match(c, /PRECONDITION FAILED \(fail-closed\)/i)
  assert.match(c, /21 non-read events must be ABSENT|of the 21 non-read events already exist/i)
  assert.match(c, /does not EXACTLY match the approved canonical \(HIGH\/S4\)/i)
  assert.doesNotMatch(c, /downgrade/i.test('x') ? /never/ : /'audit\.log\.read_requested','HIGH','S3'/) // no S3 for read events
  assert.doesNotMatch(c, /'audit\.log\.read_(requested|completed)','HIGH','S3'/i)
})
test('0030 rollback deletes ONLY the 21, never the 2 read events', () => {
  const rb = code('0030_phase4c_event_contract_seed_rollback.sql')
  assert.match(rb, /DELETE FROM public\.audit_event_contract/i)
  assert.match(rb, /WHERE event_name = ANY/i)
  assert.ok(!rb.includes("'audit.log.read_requested'") && !rb.includes("'audit.log.read_completed'"),
    'rollback must NOT delete the pre-existing read events')
  const del = [...rb.matchAll(/'([a-z]+\.[a-z_.]+)'/g)].map((m) => m[1])
  assert.equal([...new Set(del)].length, 21)
})

/* ── 0031 — privilege remediation ─────────────────────────────────────────── */
test('0031 revokes ALL from PUBLIC/anon/authenticated/service_role on the 3 audit tables', () => {
  const c = code('0031_phase4c_audit_privilege_remediation.sql')
  for (const t of ['audit_log', 'audit_event_contract', 'audit_ingestion_failures']) {
    const re = new RegExp(`REVOKE\\s+ALL\\s+ON\\s+TABLE\\s+public\\.${t}\\b[^;]*FROM[^;]*PUBLIC[^;]*anon[^;]*authenticated[^;]*service_role`, 'i')
    assert.match(c, re, t)
  }
  assert.doesNotMatch(c, /(^|\n)\s*GRANT\s/i, '0031 must not contain a GRANT statement (no replacement access)')
})
test('0031 asserts ZERO prohibited grants via aclexplode/acldefault, fail-closed', () => {
  const c = code('0031_phase4c_audit_privilege_remediation.sql')
  assert.match(c, /aclexplode\(COALESCE\(c\.relacl, acldefault\('r', c\.relowner\)\)\)/i)
  assert.match(c, /grantee=0/i)               // PUBLIC
  assert.match(c, /POST-CHECK FAILED: % prohibited grant/i)
})
test('0031 rollback restores broad grants and is clearly marked a SECURITY RISK', () => {
  const rb = read('0031_phase4c_audit_privilege_remediation_rollback.sql')
  assert.match(rb, /SECURITY RISK/i)
  assert.match(rb, /DO NOT run this automatically/i)
  const c = stripSqlComments(rb)
  for (const t of ['audit_log', 'audit_event_contract', 'audit_ingestion_failures'])
    assert.match(c, new RegExp(`GRANT ALL ON TABLE public\\.${t}\\s+TO anon, authenticated, service_role`, 'i'), t)
})

/* ── PRESERVED regressions ────────────────────────────────────────────────── */
test('the three collision functions are NOT redefined', () => {
  for (const m of MIGRATIONS)
    for (const fn of ['get_app_role', 'get_app_role_for_user', 'get_sensitive_audit_logs'])
      assert.doesNotMatch(code(m), new RegExp(`create\\s+(or replace\\s+)?function\\s+public\\.${fn}\\b`, 'i'), `${m}:${fn}`)
})
test('no permissive policy is created on audit tables', () => {
  for (const m of MIGRATIONS) assert.doesNotMatch(code(m), /create\s+policy/i, m)
})
test('reconcile assertion migrations are fail-closed', () => {
  for (const m of ['0027_phase4c_audit_validation_reconcile.sql', '0028_phase4c_audit_access_reconcile.sql',
                   '0029_phase4c_canonical_writer_reconcile.sql', '0031_phase4c_audit_privilege_remediation.sql'])
    assert.match(code(m), /RAISE EXCEPTION/i, m)
})
