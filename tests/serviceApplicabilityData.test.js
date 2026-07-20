/**
 * P5 CP-3 — pure hook-support helpers (capabilities, split, index, decorate, view
 * model, hook error shape). node:test.
 *   npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  deriveCapabilities,
  splitApplicabilityRows,
  indexCatalogueByCode,
  decorateApplicabilityRows,
  buildServiceApplicabilityViewModel,
  makeHookError,
  READ_ERROR_CODES,
  makeRequestSequencer,
  missingClientState,
  emptyServiceApplicabilityDatasets,
} from '../src/lib/serviceApplicabilityData.js'

const CAP_KEYS = ['canView', 'canCreate', 'canEdit', 'canApprove', 'canDeactivate', 'canRestart']
const allEqual = (caps, val) => CAP_KEYS.every((k) => caps[k] === val)

// ── A. capabilities (1-6) ───────────────────────────────────────────────────
test('1: active Admin → all capabilities true', () => {
  const c = deriveCapabilities({ is_admin: true, portal_role: 'Admin', is_active: true })
  assert.equal(allEqual(c, true), true)
  assert.equal(c.isActive, true)
  assert.equal(c.role, 'Admin')
})
test('2: active Manager → all capabilities true', () => {
  const c = deriveCapabilities({ is_admin: false, portal_role: 'Manager', is_active: true })
  assert.equal(allEqual(c, true), true)
})
test('3: Admin and Manager capability objects are identical', () => {
  const a = deriveCapabilities({ portal_role: 'Admin', is_active: true })
  const m = deriveCapabilities({ portal_role: 'Manager', is_active: true })
  assert.deepEqual(CAP_KEYS.map((k) => a[k]), CAP_KEYS.map((k) => m[k]))
  assert.equal(a.canApprove && m.canApprove, true)
})
test('4: inactive Admin/Manager → all false', () => {
  assert.equal(allEqual(deriveCapabilities({ portal_role: 'Admin', is_active: false }), false), true)
  assert.equal(allEqual(deriveCapabilities({ is_admin: true, is_active: false }), false), true)
  assert.equal(deriveCapabilities({ portal_role: 'Admin', is_active: false }).isActive, false)
})
test('5: other roles → all false', () => {
  assert.equal(allEqual(deriveCapabilities({ portal_role: 'Staff', is_active: true }), false), true)
  assert.equal(allEqual(deriveCapabilities({ portal_role: 'Viewer', is_active: true }), false), true)
})
test('6: missing / malformed user fails closed', () => {
  for (const u of [null, undefined, {}, 'x', 42, { is_active: true }]) {
    assert.equal(allEqual(deriveCapabilities(u), false), true)
  }
  assert.equal(deriveCapabilities(null).role, null)
})

// ── B. split (7-9) ──────────────────────────────────────────────────────────
test('7/8: split — Draft/Approved live; Inactive history; malformed excluded', () => {
  const rows = [
    { id: '1', status: 'Draft' },
    { id: '2', status: 'Approved' },
    { id: '3', status: 'Inactive' },
    { id: '4', status: 'Weird' },
    null,
    { id: '5' }, // no status
  ]
  const { liveRows, historyRows } = splitApplicabilityRows(rows)
  assert.deepEqual(liveRows.map((r) => r.id), ['1', '2'])
  assert.deepEqual(historyRows.map((r) => r.id), ['3'])
})
test('9: split does not mutate input', () => {
  const rows = [{ id: '1', status: 'Draft' }]
  const copy = JSON.parse(JSON.stringify(rows))
  splitApplicabilityRows(rows)
  assert.deepEqual(rows, copy)
  assert.deepEqual(splitApplicabilityRows(undefined), { liveRows: [], historyRows: [] })
})

// ── B. index (10) — Correction 2: only is_active===true is indexed ──────────
test('10: indexCatalogueByCode indexes ONLY is_active===true rows', () => {
  const idx = indexCatalogueByCode([
    { code: 'GST', label: 'GST', is_active: true },
    { code: 'ACCOUNTING', label: 'Accounting' }, // missing is_active → EXCLUDED
    { code: 'TDS', label: 'TDS', is_active: null }, // null → EXCLUDED
    { code: 'RETIRED', label: 'Retired', is_active: false }, // false → EXCLUDED
    { label: 'no code', is_active: true }, // no code → EXCLUDED
    null, // malformed → EXCLUDED
    { code: '   ', is_active: true }, // blank code → EXCLUDED
  ])
  assert.equal(idx.get('GST').label, 'GST')
  assert.equal(idx.has('ACCOUNTING'), false)
  assert.equal(idx.has('TDS'), false)
  assert.equal(idx.has('RETIRED'), false)
  assert.equal(idx.size, 1)
})

// ── B. decorate (11-12) ─────────────────────────────────────────────────────
const CAT = [
  { code: 'GST', label: 'GST', is_active: true },
  { code: 'OTHER', label: 'Other', is_active: true },
]
const TEAM = [{ id: 't1', name: 'Asha' }, { id: 't2', name: 'Ravi' }]
const REGS = [{ id: 'r1', reg_type: 'GSTIN', reg_number: '27ABC', status: 'Active' }]

test('11: decoration resolves service/team/registration labels', () => {
  const out = decorateApplicabilityRows(
    [{ id: '1', service_code: 'GST', owner_team_id: 't1', linked_registration_id: 'r1' }],
    indexCatalogueByCode(CAT),
    TEAM,
    REGS,
  )
  assert.equal(out[0].service_label, 'GST')
  assert.equal(out[0].owner_name, 'Asha')
  assert.equal(out[0].registration_label, 'GSTIN · 27ABC (Active)')
  // original fields preserved
  assert.equal(out[0].id, '1')
  assert.equal(out[0].service_code, 'GST')
})
test('12: unknown references use safe fallbacks; no owner/reg → null', () => {
  const out = decorateApplicabilityRows(
    [
      { id: '1', service_code: 'NOPE', owner_team_id: 'tX', linked_registration_id: 'rX' },
      { id: '2', service_code: 'GST', owner_team_id: null, linked_registration_id: null },
    ],
    indexCatalogueByCode(CAT),
    TEAM,
    REGS,
  )
  assert.equal(out[0].service_label, 'NOPE') // falls back to the raw code
  assert.equal(out[0].owner_name, '—') // id present but unknown
  assert.equal(out[0].registration_label, '—')
  assert.equal(out[1].owner_name, null) // no owner → null
  assert.equal(out[1].registration_label, null)
})
test('decorate does not mutate input rows', () => {
  const rows = [{ id: '1', service_code: 'GST' }]
  const copy = JSON.parse(JSON.stringify(rows))
  decorateApplicabilityRows(rows, indexCatalogueByCode(CAT), TEAM, REGS)
  assert.deepEqual(rows, copy)
})

// ── B. view model (13-15) ───────────────────────────────────────────────────
test('13: availableServiceCodes excludes codes used by a LIVE row', () => {
  const vm = buildServiceApplicabilityViewModel({
    catalogue: [
      { code: 'GST', label: 'GST', is_active: true, sort_order: 1 },
      { code: 'TDS', label: 'TDS', is_active: true, sort_order: 2 },
    ],
    applicability: [{ id: '1', service_code: 'GST', status: 'Draft' }],
  })
  assert.deepEqual(vm.availableServiceCodes, ['TDS'])
})
test('14: Inactive rows do NOT block service availability', () => {
  const vm = buildServiceApplicabilityViewModel({
    catalogue: [{ code: 'GST', label: 'GST', is_active: true }],
    applicability: [{ id: '1', service_code: 'GST', status: 'Inactive' }],
  })
  assert.deepEqual(vm.availableServiceCodes, ['GST']) // restart allowed
  assert.deepEqual(vm.liveRows, [])
  assert.equal(vm.historyRows.length, 1)
})
test('15: view model preserves deterministic order', () => {
  const vm = buildServiceApplicabilityViewModel({
    catalogue: [
      { code: 'GST', label: 'GST', is_active: true },
      { code: 'TDS', label: 'TDS', is_active: true },
      { code: 'ROC', label: 'ROC', is_active: true },
    ],
    applicability: [
      { id: 'a', service_code: 'TDS', status: 'Approved' },
      { id: 'b', service_code: 'ROC', status: 'Draft' },
    ],
  })
  assert.deepEqual(vm.liveRows.map((r) => r.id), ['a', 'b']) // server order kept
  assert.deepEqual(vm.availableServiceCodes, ['GST']) // catalogue order, live excluded
})

// ── Correction 2: view model excludes non-active catalogue rows everywhere ──
test('C2: view model catalogue + availableServiceCodes only include is_active===true', () => {
  const vm = buildServiceApplicabilityViewModel({
    catalogue: [
      { code: 'GST', label: 'GST', is_active: true },
      { code: 'TDS', label: 'TDS', is_active: false }, // excluded
      { code: 'ROC', label: 'ROC' }, // missing is_active → excluded
      { code: 'LLP', label: 'LLP', is_active: null }, // null → excluded
      { code: 'ACCOUNTING', label: 'Accounting', is_active: true },
    ],
    applicability: [{ id: '1', service_code: 'ACCOUNTING', status: 'Draft' }], // ACCOUNTING is live
  })
  assert.deepEqual(vm.catalogue.map((c) => c.code), ['GST', 'ACCOUNTING']) // only active rows
  assert.deepEqual(vm.availableServiceCodes, ['GST']) // ACCOUNTING live-excluded; inactive never listed
})

// ── Correction 1: stale-request protection (pure sequencer) ─────────────────
test('C1: makeRequestSequencer — begin() advances; shouldApply gates on seq AND mounted', () => {
  const s = makeRequestSequencer()
  const a = s.begin()
  assert.equal(a, 1)
  assert.equal(s.current(), 1)
  assert.equal(s.shouldApply(a), true)
  assert.equal(s.shouldApply(a, false), false) // unmounted → not applied
  const b = s.begin()
  assert.equal(b, 2)
  assert.equal(s.shouldApply(a), false) // older request now stale
  assert.equal(s.shouldApply(b), true)
})

test('C1: client A in-flight cannot overwrite CLIENT_ID_REQUIRED after client → missing', () => {
  const seq = makeRequestSequencer()
  // 1. a request for Client A starts
  const seqA = seq.begin() // 1
  let state = { loading: true, error: null, ...emptyServiceApplicabilityDatasets() }
  // 2. the client changes to missing → a new load begins (bumps the sequence FIRST),
  //    then the missing-clientId guard sets the authoritative fail-closed state
  const seqMissing = seq.begin() // 2 (invalidates seqA)
  state = missingClientState()
  assert.equal(state.error.code, 'CLIENT_ID_REQUIRED')
  assert.deepEqual(state.liveRows, [])
  assert.deepEqual(state.availableServiceCodes, [])
  // 3/4. Client A's request finally resolves — the decision must REJECT it as stale
  const applyA = seq.shouldApply(seqA, true)
  assert.equal(applyA, false)
  if (applyA) state = { loading: false, liveRows: [{ id: 'A' }] } // must NOT run
  // 5. CLIENT_ID_REQUIRED + empty datasets remain authoritative
  assert.equal(state.error.code, 'CLIENT_ID_REQUIRED')
  assert.deepEqual(state.liveRows, [])
  assert.deepEqual(state.availableServiceCodes, [])
  // the missing-path "request" is the current one
  assert.equal(seq.shouldApply(seqMissing, true), true)
})

test('C1: missingClientState is the fail-closed CLIENT_ID_REQUIRED shape with empty datasets', () => {
  const s = missingClientState()
  assert.equal(s.loading, false)
  assert.equal(s.refreshing, false)
  assert.equal(s.error.code, 'CLIENT_ID_REQUIRED')
  for (const k of ['catalogue', 'liveRows', 'historyRows', 'teamMembers', 'registrations', 'availableServiceCodes']) {
    assert.deepEqual(s[k], [])
  }
})

// ── D. hook error shape ─────────────────────────────────────────────────────
test('makeHookError returns a stable {code,message}; unknown → UNKNOWN_READ_FAILED', () => {
  for (const code of Object.values(READ_ERROR_CODES)) {
    const e = makeHookError(code)
    assert.equal(e.code, code)
    assert.ok(typeof e.message === 'string' && e.message.length > 0)
  }
  assert.equal(makeHookError('SOMETHING_ELSE').code, 'UNKNOWN_READ_FAILED')
  // no raw internals leaked in any message (env values, URLs, stack traces, PG/SQL
  // internals). Note: ordinary UI words like "Select a client" are fine.
  for (const code of Object.values(READ_ERROR_CODES)) {
    const m = makeHookError(code).message
    assert.equal(/VITE_|https?:\/\/|:\/\/|\bError:|\bat\s+\/|pg_|constraint|supabase/i.test(m), false, `leak in: ${m}`)
  }
})
