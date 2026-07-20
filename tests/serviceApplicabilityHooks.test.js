/**
 * P5 CP-3 — hook static analysis + role pure-logic. node:test.
 *   npm test
 *
 * The hooks use React, and no jsdom/RTL is approved, so behaviour is covered via the
 * pure helpers (tested in serviceApplicabilityData.test.js) plus static source scans
 * that prove the CP-3 read-only / no-write / no-legacy guarantees and stale-request
 * protection — following the existing "STATIC:" convention.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { deriveCapabilities } from '../src/lib/serviceApplicabilityData.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const ROLE_HOOK = '../src/hooks/useServiceApplicabilityRole.js'
const DATA_HOOK = '../src/hooks/useServiceApplicabilityData.js'
const DATA_LIB = '../src/lib/serviceApplicabilityData.js'

// ── role hook wraps the pure derivation (sanity: shape parity) ──────────────
test('role: pure deriveCapabilities drives the hook output shape', () => {
  const c = deriveCapabilities({ portal_role: 'Manager', is_active: true })
  for (const k of ['role', 'isActive', 'canView', 'canCreate', 'canEdit', 'canApprove', 'canDeactivate', 'canRestart']) {
    assert.ok(k in c, `capabilities missing ${k}`)
  }
  // the role hook file must delegate to deriveCapabilities (no duplicated rule)
  const src = stripComments(read(ROLE_HOOK))
  assert.ok(src.includes('deriveCapabilities'), 'role hook must reuse deriveCapabilities')
  assert.equal(/is_admin|portal_role/.test(src), false, 'role rule must not be re-implemented in the hook')
})

// ── 16/17. data hook imports only CP-2 reads, not write wrappers ────────────
test('16: data hook imports only the four CP-2 read functions from the service layer', () => {
  const src = stripComments(read(DATA_HOOK))
  // the only services import is the reads module, listing exactly the four reads
  const serviceImports = [...src.matchAll(/from\s+['"]\.\.\/services\/([A-Za-z0-9_]+)['"]/g)].map((m) => m[1])
  assert.deepEqual([...new Set(serviceImports)], ['serviceApplicabilityReads'])
  for (const fn of [
    'readServiceCatalogue',
    'readClientServiceApplicability',
    'readActiveTeamMembers',
    'readClientRegistrations',
  ]) {
    assert.ok(src.includes(fn), `data hook must use ${fn}`)
  }
})
test('17: data hook does NOT import the write wrappers', () => {
  const src = stripComments(read(DATA_HOOK))
  assert.equal(src.includes('serviceApplicabilityWrites'), false)
  for (const w of ['createServiceApplicability', 'updateServiceApplicability', 'setServiceApplicabilityStatus']) {
    assert.equal(src.includes(w), false, `data hook must not import ${w}`)
  }
})

// ── 18/19. no direct query/rpc/write in the hook ────────────────────────────
test('18/19: data hook has no direct .from( / .rpc( and no write methods', () => {
  const src = stripComments(read(DATA_HOOK))
  for (const bad of ['.from(', '.rpc(', '.insert(', '.update(', '.delete(', '.upsert(']) {
    assert.equal(src.includes(bad), false, `data hook must not contain ${bad}`)
  }
})

// ── 20. missing-clientId path performs no reads (guard precedes Promise.all) ─
test('20: missing clientId is guarded (missingClientState) before any read', () => {
  const src = stripComments(read(DATA_HOOK))
  assert.ok(src.includes('missingClientState('), 'must use the CLIENT_ID_REQUIRED fail-closed state')
  const guardIdx = src.indexOf('missingClientState(')
  const promiseAllIdx = src.indexOf('Promise.all')
  assert.ok(guardIdx !== -1 && promiseAllIdx !== -1 && guardIdx < promiseAllIdx,
    'the missing-client guard must appear before Promise.all')
})

// ── 21. all four read functions are used ────────────────────────────────────
test('21: all four reads are invoked in the load path', () => {
  const src = stripComments(read(DATA_HOOK))
  for (const call of [
    'readServiceCatalogue()',
    'readClientServiceApplicability(clientId)',
    'readActiveTeamMembers()',
    'readClientRegistrations(clientId)',
  ]) {
    assert.ok(src.includes(call), `must invoke ${call}`)
  }
})

// ── 22. stale-request protection present (sequencer begins BEFORE the guard) ─
test('22: stale-request protection via request sequencer + mounted flag', () => {
  const src = stripComments(read(DATA_HOOK))
  assert.ok(src.includes('makeRequestSequencer'), 'must use the request sequencer')
  assert.ok(src.includes('.begin()'), 'must begin() a new request each load')
  assert.ok(src.includes('shouldApply'), 'must gate applying results via shouldApply')
  assert.ok(src.includes('mountedRef'), 'must track mount state')
  // begin() must run BEFORE the missing-clientId guard so a client→missing change
  // invalidates a previous client's in-flight request (Correction 1). Anchor on the
  // exact guard statement (setState(missingClientState())) — the bare missingClientState()
  // in the useState initializer is not the guard.
  const beginIdx = src.indexOf('seqRef.current.begin()')
  const guardIdx = src.indexOf('setState(missingClientState())')
  assert.ok(beginIdx !== -1 && guardIdx !== -1 && beginIdx < guardIdx,
    'begin() must precede the missing-client guard inside load()')
})

// ── 23. refresh represented; no polling / no retry ──────────────────────────
test('23: refresh exists; no polling or retry mechanisms', () => {
  const src = stripComments(read(DATA_HOOK))
  assert.ok(src.includes('refresh'), 'must expose refresh')
  assert.ok(src.includes("refreshing: true"), 'refresh must set refreshing=true')
  for (const bad of ['setInterval', 'setTimeout', 'retry', 'retries', 'poll']) {
    assert.equal(src.toLowerCase().includes(bad.toLowerCase()), false, `must not include ${bad}`)
  }
})

// ── 24. no legacy references in any CP-3 module ─────────────────────────────
test('24: no legacy compliance references in CP-3 modules', () => {
  const forbidden = [
    'clients.services', 'activate_accounting_service', 'generate_client_compliance',
    'accounting_tracker', 'financials_tracker', 'income_tax_tracker', 'compliance_calendar',
  ]
  for (const f of [ROLE_HOOK, DATA_HOOK, DATA_LIB]) {
    const src = stripComments(read(f))
    for (const bad of forbidden) assert.equal(src.includes(bad), false, `${f} must not reference ${bad}`)
  }
})

// ── data lib is pure (no react / supabase / write) ──────────────────────────
test('data lib is pure: no react/supabase import, no query/rpc/write', () => {
  const src = stripComments(read(DATA_LIB))
  assert.equal(/from\s+['"]react['"]/.test(src), false)
  assert.equal(/from\s+['"]\.\.\/supabase/.test(src), false)
  assert.equal(src.includes('createClient'), false)
  for (const bad of ['.from(', '.rpc(', '.insert(', '.update(', '.delete(', '.upsert(']) {
    assert.equal(src.includes(bad), false, `data lib must not contain ${bad}`)
  }
})
