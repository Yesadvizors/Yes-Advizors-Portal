/**
 * P5 CP-2 — Service Applicability read/write service layer. node:test.
 *   npm test
 *
 * Behaviour is tested through the pure `*With(client)` factories with an injected
 * recording fake client — NO real Supabase client is constructed and NO network call
 * is made. (Importing the modules is itself proof of "no import side effects": the
 * shared client is behind a lazy dynamic import, so src/supabase.js — which reads
 * import.meta.env and would throw under node — is never evaluated here.)
 *
 * Static source scans (readFileSync) prove the RPC-only / no-legacy / no-write
 * guarantees, following the existing "STATIC:" convention.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  readServiceCatalogueWith,
  readClientServiceApplicabilityWith,
  readActiveTeamMembersWith,
  readClientRegistrationsWith,
  readServiceCatalogue,
  readClientServiceApplicability,
  readActiveTeamMembers,
  readClientRegistrations,
} from '../src/services/serviceApplicabilityReads.js'

import {
  createServiceApplicabilityWith,
  updateServiceApplicabilityWith,
  setServiceApplicabilityStatusWith,
  createServiceApplicability,
  updateServiceApplicability,
  setServiceApplicabilityStatus,
} from '../src/services/serviceApplicabilityWrites.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const READS = '../src/services/serviceApplicabilityReads.js'
const WRITES = '../src/services/serviceApplicabilityWrites.js'

/** Recording fake Supabase client (query builder is chainable + thenable). */
function makeFake(rpcResult = { data: null, error: null }) {
  const calls = { from: [], select: [], eq: [], order: [], rpc: [] }
  const builder = {
    select(c) { calls.select.push(c); return builder },
    eq(c, v) { calls.eq.push([c, v]); return builder },
    order(c, o) { calls.order.push([c, o]); return builder },
    then(res, rej) { return Promise.resolve({ data: [], error: null }).then(res, rej) },
  }
  const client = {
    calls,
    from(t) { calls.from.push(t); return builder },
    rpc(n, a) { calls.rpc.push([n, a]); return rpcResult },
  }
  return client
}

// ── 1. readServiceCatalogue shape ───────────────────────────────────────────
test('1: readServiceCatalogue → service_catalogue, fields, is_active filter, order', () => {
  const fake = makeFake()
  readServiceCatalogueWith(fake)()
  assert.deepEqual(fake.calls.from, ['service_catalogue'])
  const cols = fake.calls.select[0]
  for (const c of ['code', 'label', 'requires_registration', 'default_frequency', 'sort_order', 'is_active']) {
    assert.ok(cols.includes(c), `catalogue select must include ${c}`)
  }
  assert.deepEqual(fake.calls.eq, [['is_active', true]])
  assert.deepEqual(fake.calls.order, [['sort_order', { ascending: true }], ['code', { ascending: true }]])
})

// ── 2. readClientServiceApplicability shape ─────────────────────────────────
test('2: readClientServiceApplicability → table, exact client filter, deterministic order', () => {
  const fake = makeFake()
  readClientServiceApplicabilityWith(fake)('client-1')
  assert.deepEqual(fake.calls.from, ['client_service_applicability'])
  const cols = fake.calls.select[0]
  for (const c of [
    'id', 'client_id', 'service_code', 'effective_from', 'effective_to', 'frequency',
    'linked_registration_id', 'owner_team_id', 'status', 'approved_by', 'approved_at',
    'notes', 'row_version', 'created_at', 'created_by', 'updated_at', 'updated_by',
  ]) {
    assert.ok(cols.includes(c), `applicability select must include ${c}`)
  }
  assert.deepEqual(fake.calls.eq, [['client_id', 'client-1']])
  assert.deepEqual(fake.calls.order, [
    ['service_code', { ascending: true }],
    ['created_at', { ascending: true }],
    ['id', { ascending: true }],
  ])
})

// ── 3. readActiveTeamMembers shape ──────────────────────────────────────────
test('3: readActiveTeamMembers → team, safe fields, active filter, order', () => {
  const fake = makeFake()
  readActiveTeamMembersWith(fake)()
  assert.deepEqual(fake.calls.from, ['team'])
  assert.equal(fake.calls.select[0], 'id, name, portal_role, is_active')
  assert.deepEqual(fake.calls.eq, [['is_active', true]])
  assert.deepEqual(fake.calls.order, [['name', { ascending: true }], ['id', { ascending: true }]])
  // no personal-contact columns leaked
  for (const c of ['email', 'phone', 'mobile', 'password']) {
    assert.equal(fake.calls.select[0].includes(c), false)
  }
})

// ── 4. readClientRegistrations shape (real columns, same-client) ────────────
test('4: readClientRegistrations → client_registrations, real cols, client filter, order', () => {
  const fake = makeFake()
  readClientRegistrationsWith(fake)('client-9')
  assert.deepEqual(fake.calls.from, ['client_registrations'])
  const cols = fake.calls.select[0]
  for (const c of ['id', 'client_id', 'reg_type', 'reg_number', 'status', 'is_active']) {
    assert.ok(cols.includes(c), `registration select must include ${c}`)
  }
  // must use the REAL column names, not guessed ones
  assert.equal(cols.includes('registration_type'), false)
  assert.equal(cols.includes('registration_number'), false)
  assert.deepEqual(fake.calls.eq, [['client_id', 'client-9']])
  assert.deepEqual(fake.calls.order, [['reg_type', { ascending: true }], ['id', { ascending: true }]])
})

// ── 5. missing clientId fails closed, issues no query ───────────────────────
test('5: client-scoped reads fail closed on missing clientId (no query)', () => {
  for (const bad of ['', '   ', null, undefined]) {
    const f1 = makeFake()
    const r1 = readClientServiceApplicabilityWith(f1)(bad)
    assert.deepEqual(r1, { data: null, error: { message: 'CLIENT_ID_REQUIRED' } })
    assert.deepEqual(f1.calls.from, [], 'applicability must not query on missing clientId')

    const f2 = makeFake()
    const r2 = readClientRegistrationsWith(f2)(bad)
    assert.deepEqual(r2, { data: null, error: { message: 'CLIENT_ID_REQUIRED' } })
    assert.deepEqual(f2.calls.from, [], 'registrations must not query on missing clientId')
  }
})

// ── write wrappers ──────────────────────────────────────────────────────────
const CREATE_ARGS = {
  p_client_id: 'c-1', p_service_code: 'GST', p_effective_from: null, p_effective_to: null,
  p_frequency: 'MONTHLY', p_linked_registration_id: 'reg-1', p_owner_team_id: null, p_notes: null,
}
const UPDATE_ARGS = {
  p_id: 'row-1', p_expected_row_version: 2, p_effective_from: '2026-04-01', p_effective_to: null,
  p_frequency: 'ANNUAL', p_linked_registration_id: null, p_owner_team_id: 'team-2', p_notes: 'x',
}
const STATUS_ARGS = { p_id: 'row-1', p_expected_row_version: 2, p_new_status: 'Approved', p_effective_to: null }

// ── 6/7/8. each wrapper calls only its one RPC with the exact args ──────────
test('6: create wrapper calls only service_applicability_create with exact args', () => {
  const fake = makeFake({ data: { id: 'x', row_version: 1 }, error: null })
  createServiceApplicabilityWith(fake)(CREATE_ARGS)
  assert.deepEqual(fake.calls.rpc, [['service_applicability_create', CREATE_ARGS]])
})
test('7: update wrapper calls only service_applicability_update', () => {
  const fake = makeFake({ data: 3, error: null })
  updateServiceApplicabilityWith(fake)(UPDATE_ARGS)
  assert.deepEqual(fake.calls.rpc, [['service_applicability_update', UPDATE_ARGS]])
})
test('8: status wrapper calls only service_applicability_set_status', () => {
  const fake = makeFake({ data: 3, error: null })
  setServiceApplicabilityStatusWith(fake)(STATUS_ARGS)
  assert.deepEqual(fake.calls.rpc, [['service_applicability_set_status', STATUS_ARGS]])
})

// ── 9. native {data,error} returned unchanged (not swallowed / rewrapped) ────
test('9: wrappers return the native rpc result unchanged (incl. errors)', () => {
  const ok = { data: { id: 'x', row_version: 1 }, error: null }
  assert.equal(createServiceApplicabilityWith(makeFake(ok))(CREATE_ARGS), ok)
  const errRes = { data: null, error: { message: 'STALE_ROW_VERSION' } }
  assert.equal(updateServiceApplicabilityWith(makeFake(errRes))(UPDATE_ARGS), errRes)
  assert.equal(setServiceApplicabilityStatusWith(makeFake(errRes))(STATUS_ARGS), errRes)
})

// ── 10. wrappers do not mutate their input ──────────────────────────────────
test('10: wrappers do not mutate the input args object', () => {
  const args = { ...CREATE_ARGS }
  const snapshot = JSON.parse(JSON.stringify(args))
  Object.freeze(args)
  createServiceApplicabilityWith(makeFake())(args) // would throw if it mutated a frozen object
  assert.deepEqual(args, snapshot)
})

// ── 11. invalid args → INVALID_SERVICE_APPLICABILITY_ARGS, no rpc call ──────
test('11: invalid wrapper args fail closed and do not call rpc', () => {
  const bads = [
    ['create', createServiceApplicabilityWith, undefined],
    ['create', createServiceApplicabilityWith, null],
    ['create', createServiceApplicabilityWith, 'nope'],
    ['create', createServiceApplicabilityWith, {}],
    ['create', createServiceApplicabilityWith, { p_client_id: 'c' }], // missing service_code
    ['create', createServiceApplicabilityWith, { p_service_code: 'GST' }], // missing client
    ['update', updateServiceApplicabilityWith, { p_id: 'x' }], // missing version
    ['update', updateServiceApplicabilityWith, { p_expected_row_version: 1 }], // missing id
    ['status', setServiceApplicabilityStatusWith, { p_id: 'x', p_expected_row_version: 1 }], // missing status
  ]
  for (const [label, factory, args] of bads) {
    const fake = makeFake()
    const r = factory(fake)(args)
    assert.deepEqual(r, { data: null, error: { message: 'INVALID_SERVICE_APPLICABILITY_ARGS' } }, `${label}: ${JSON.stringify(args)}`)
    assert.deepEqual(fake.calls.rpc, [], `${label} must not call rpc for ${JSON.stringify(args)}`)
  }
})

// ── 12. rowVersion 0 accepted; null / string / non-integer rejected ─────────
test('12: rowVersion integer rule at the transport guard', () => {
  // 0 is a valid integer → rpc IS called
  const f0 = makeFake({ data: 1, error: null })
  updateServiceApplicabilityWith(f0)({ ...UPDATE_ARGS, p_expected_row_version: 0 })
  assert.equal(f0.calls.rpc.length, 1)
  // null / string / float → rejected, no rpc
  for (const rv of [null, undefined, '2', 1.5, NaN]) {
    const f = makeFake()
    const r = updateServiceApplicabilityWith(f)({ ...UPDATE_ARGS, p_expected_row_version: rv })
    assert.equal(r.error.message, 'INVALID_SERVICE_APPLICABILITY_ARGS')
    assert.deepEqual(f.calls.rpc, [])
  }
})

// ── production functions exist and are bound (not called → no client build) ──
test('production functions are exported (bound to shared client, not invoked here)', () => {
  for (const fn of [
    readServiceCatalogue, readClientServiceApplicability, readActiveTeamMembers, readClientRegistrations,
    createServiceApplicability, updateServiceApplicability, setServiceApplicabilityStatus,
  ]) {
    assert.equal(typeof fn, 'function')
  }
})

// ── 13. reads module: no .rpc( and no write methods ─────────────────────────
test('13: reads module contains no .rpc( and no write methods', () => {
  const src = stripComments(read(READS))
  for (const bad of ['.rpc(', '.insert(', '.update(', '.delete(', '.upsert(']) {
    assert.equal(src.includes(bad), false, `reads must not contain ${bad}`)
  }
})

// ── 14/15. writes module: exactly the three RPC names, no write methods ─────
test('14: writes module uses exactly the three approved RPC names, no other', () => {
  const src = stripComments(read(WRITES))
  const names = new Set([...src.matchAll(/\.rpc\(\s*([A-Za-z0-9_]+)/g)].map((m) => m[1]))
  // .rpc is called with the RPC_* constants; assert those constants map to the 3 names
  const consts = Object.fromEntries(
    [...src.matchAll(/const (RPC_[A-Z_]+)\s*=\s*'([a-z_]+)'/g)].map((m) => [m[1], m[2]]),
  )
  assert.deepEqual(
    new Set(Object.values(consts)),
    new Set(['service_applicability_create', 'service_applicability_update', 'service_applicability_set_status']),
  )
  // every .rpc( call references one of the RPC_* constants (no inline foreign name)
  for (const n of names) assert.ok(n in consts, `unexpected rpc arg: ${n}`)
  // no other rpc name string appears
  const rpcStringLiterals = [...src.matchAll(/'(service_applicability_[a-z_]+)'/g)].map((m) => m[1])
  assert.deepEqual(
    new Set(rpcStringLiterals),
    new Set(['service_applicability_create', 'service_applicability_update', 'service_applicability_set_status']),
  )
})
test('15: writes module contains no direct table write methods', () => {
  const src = stripComments(read(WRITES))
  for (const bad of ['.insert(', '.update(', '.delete(', '.upsert(']) {
    assert.equal(src.includes(bad), false, `writes must not contain ${bad}`)
  }
})

// ── 16/17/18. no legacy coupling, no React, no import side effects ──────────
test('16: neither module references legacy compliance surfaces', () => {
  const forbidden = [
    'clients.services', 'activate_accounting_service', 'generate_client_compliance',
    'accounting_tracker', 'financials_tracker', 'income_tax_tracker', 'compliance_calendar',
  ]
  for (const f of [READS, WRITES]) {
    const src = stripComments(read(f))
    for (const bad of forbidden) assert.equal(src.includes(bad), false, `${f} must not reference ${bad}`)
  }
})
test('17: neither module imports React', () => {
  for (const f of [READS, WRITES]) {
    assert.equal(/from\s+['"]react['"]/.test(stripComments(read(f))), false)
  }
})
test('18: no import side effects — only a LAZY dynamic supabase import, no static import/createClient', () => {
  for (const f of [READS, WRITES]) {
    const src = stripComments(read(f))
    // no eager static import of the shared client
    assert.equal(/import\s+\{[^}]*\}\s+from\s+['"]\.\.\/supabase(\.js)?['"]/.test(src), false, `${f} must not statically import supabase`)
    assert.equal(src.includes('createClient'), false)
    // the only supabase reference is a lazy dynamic import inside a function
    assert.ok(/import\(\s*['"]\.\.\/supabase\.js['"]\s*\)/.test(src), `${f} should lazily import supabase`)
  }
  // The fact that THIS test file imported both modules at top without throwing is
  // itself proof that importing them evaluates no env and constructs no client.
  assert.ok(true)
})
