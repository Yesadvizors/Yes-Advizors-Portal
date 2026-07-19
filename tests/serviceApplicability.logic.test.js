/**
 * P5 CP-1 — Service Applicability pure logic: lifecycle predicates, normalisation,
 * validation. node:test — built in; no new dependency.
 *   npm test
 *
 * Static source scans (following the existing "STATIC:" convention in
 * tests/aadhaar.test.js / tests/clientMasterPreview.test.js) prove the CP-1 modules
 * import no Supabase/React, reference no legacy compliance surfaces, and contain no
 * direct write methods — guarantees that cannot be unit-rendered without a DOM runner.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  STATUSES,
  STATUS_VALUES,
  FREQUENCIES,
  isValidStatus,
  isValidFrequency,
  isValidRowVersion,
  isLive,
  canEdit,
  canApprove,
  canDeactivate,
  canRestart,
  trimText,
  blankToNull,
  normFrequency,
  normServiceCode,
  normDate,
  normUuid,
  validateCreate,
  validateEdit,
  validateApprove,
  validateDeactivate,
  validateRestart,
} from '../src/lib/serviceApplicability.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const draft = (o = {}) => ({ status: 'Draft', ...o })
const approved = (o = {}) => ({ status: 'Approved', ...o })
const inactive = (o = {}) => ({ status: 'Inactive', ...o })

const CATALOGUE = [
  { code: 'ACCOUNTING', requires_registration: false, is_active: true },
  { code: 'GST', requires_registration: true, is_active: true },
  { code: 'OTHER', requires_registration: false, is_active: true },
  { code: 'RETIRED', requires_registration: false, is_active: false },
]

// ── A. constants ───────────────────────────────────────────────────────────
test('A: status + frequency constants are the approved sets and frozen', () => {
  assert.deepEqual(STATUS_VALUES, ['Draft', 'Approved', 'Inactive'])
  assert.equal(STATUSES.DRAFT, 'Draft')
  assert.equal(STATUSES.APPROVED, 'Approved')
  assert.equal(STATUSES.INACTIVE, 'Inactive')
  assert.deepEqual(FREQUENCIES, [
    'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'EVENT_BASED', 'ONE_TIME', 'AS_REQUIRED',
  ])
  assert.ok(Object.isFrozen(STATUS_VALUES) && Object.isFrozen(FREQUENCIES) && Object.isFrozen(STATUSES))
})

// ── 1. lifecycle predicates for Draft / Approved / Inactive ─────────────────
test('1: predicates for Draft', () => {
  const r = draft()
  assert.equal(isLive(r), true)
  assert.equal(canEdit(r), true)
  assert.equal(canApprove(r), true)
  assert.equal(canDeactivate(r), true)
  assert.equal(canRestart(r), false)
})
test('1: predicates for Approved', () => {
  const r = approved()
  assert.equal(isLive(r), true)
  assert.equal(canEdit(r), false)
  assert.equal(canApprove(r), false)
  assert.equal(canDeactivate(r), true)
  assert.equal(canRestart(r), false)
})
test('1: predicates for Inactive', () => {
  const r = inactive()
  assert.equal(isLive(r), false)
  assert.equal(canEdit(r), false)
  assert.equal(canApprove(r), false)
  assert.equal(canDeactivate(r), false)
  assert.equal(canRestart(r), true)
})
test('1: predicates are null-safe', () => {
  for (const p of [isLive, canEdit, canApprove, canDeactivate, canRestart]) {
    assert.equal(p(null), false)
    assert.equal(p(undefined), false)
    assert.equal(p({}), false)
  }
})

test('isValidStatus / isValidRowVersion', () => {
  assert.equal(isValidStatus('Draft'), true)
  assert.equal(isValidStatus('Approved'), true)
  assert.equal(isValidStatus('Inactive'), true)
  assert.equal(isValidStatus('Live'), false)
  assert.equal(isValidStatus(''), false)
  // 15. rowVersion integer rule: 0 ok; null / string not
  assert.equal(isValidRowVersion(0), true)
  assert.equal(isValidRowVersion(3), true)
  assert.equal(isValidRowVersion(null), false)
  assert.equal(isValidRowVersion(undefined), false)
  assert.equal(isValidRowVersion('3'), false)
  assert.equal(isValidRowVersion(1.5), false)
  assert.equal(isValidRowVersion(NaN), false)
})

// ── 2. no reopen from Inactive ──────────────────────────────────────────────
test('2: Inactive can never edit/approve/deactivate (no reopen)', () => {
  const r = inactive()
  assert.equal(canEdit(r), false)
  assert.equal(canApprove(r), false)
  assert.equal(canDeactivate(r), false)
  // the only forward path is restart → a NEW draft seed (no source id/version)
  const res = validateRestart(r)
  assert.equal(res.valid, true)
  assert.ok(!('id' in res.seed) && !('row_version' in res.seed) && !('status' in res.seed))
})

// ── 10/11. frequency + optional-from ────────────────────────────────────────
test('isValidFrequency allows null/blank, accepts approved, rejects others', () => {
  assert.equal(isValidFrequency(null), true)
  assert.equal(isValidFrequency(''), true)
  assert.equal(isValidFrequency('   '), true)
  assert.equal(isValidFrequency('MONTHLY'), true)
  assert.equal(isValidFrequency('monthly'), true) // case-normalised
  assert.equal(isValidFrequency('WEEKLY'), false)
  assert.equal(isValidFrequency('FORTNIGHTLY'), false)
})

// ── B. normalisation ────────────────────────────────────────────────────────
test('B: trim / blankToNull', () => {
  assert.equal(trimText('  x '), 'x')
  assert.equal(trimText(null), '')
  assert.equal(blankToNull('  '), null)
  assert.equal(blankToNull(''), null)
  assert.equal(blankToNull(null), null)
  assert.equal(blankToNull(' abc '), 'abc')
})
test('B: normFrequency / normServiceCode uppercase or null', () => {
  assert.equal(normFrequency(' monthly '), 'MONTHLY')
  assert.equal(normFrequency(''), null)
  assert.equal(normServiceCode(' gst '), 'GST')
  assert.equal(normServiceCode(null), null)
})
test('B: normDate passes strings through, formats Date locally, no TZ shift', () => {
  assert.equal(normDate('2026-04-01'), '2026-04-01')
  assert.equal(normDate('  2026-04-01 '), '2026-04-01')
  assert.equal(normDate(''), null)
  assert.equal(normDate(null), null)
  // Local-component formatting (not toISOString): build a local date and check it
  // round-trips to the same Y-M-D regardless of the runner's timezone.
  const d = new Date(2026, 3, 1) // local 2026-04-01 00:00
  assert.equal(normDate(d), '2026-04-01')
  assert.equal(normDate(new Date('invalid')), null)
})
test('B: normUuid trims, blank→null, no format validation', () => {
  assert.equal(normUuid(''), null)
  assert.equal(normUuid('  '), null)
  assert.equal(normUuid(' not-a-real-uuid '), 'not-a-real-uuid') // no crypto/db validation
})

// ── C. create validation ────────────────────────────────────────────────────
test('C-create: happy path Draft (effectiveFrom may be null → 11)', () => {
  const r = validateCreate(
    { clientId: 'c1', serviceCode: 'ACCOUNTING', effectiveFrom: null, frequency: 'MONTHLY' },
    CATALOGUE,
  )
  assert.equal(r.valid, true)
  assert.deepEqual(r.errors, {})
})
test('C-create: clientId + serviceCode required', () => {
  const r = validateCreate({ clientId: '', serviceCode: '' }, CATALOGUE)
  assert.equal(r.valid, false)
  assert.equal(r.errors.clientId, 'Select a client.')
  assert.equal(r.errors.serviceCode, 'Select a service.')
})
test('C-create: serviceCode must be in active catalogue', () => {
  assert.equal(validateCreate({ clientId: 'c', serviceCode: 'NOPE' }, CATALOGUE).errors.serviceCode,
    'That service is not available.')
  // inactive catalogue row is not selectable
  assert.equal(validateCreate({ clientId: 'c', serviceCode: 'RETIRED' }, CATALOGUE).errors.serviceCode,
    'That service is not available.')
})
test('C-create: 10 invalid frequency rejected', () => {
  const r = validateCreate({ clientId: 'c', serviceCode: 'ACCOUNTING', frequency: 'WEEKLY' }, CATALOGUE)
  assert.equal(r.errors.frequency, 'Choose a valid frequency.')
})
test('C-create: effectiveTo never accepted from the form', () => {
  const r = validateCreate(
    { clientId: 'c', serviceCode: 'ACCOUNTING', effectiveTo: '2026-04-01' }, CATALOGUE,
  )
  assert.equal(r.errors.effectiveTo, 'End date is set only when deactivating.')
})
test('C-create: 9 registration required only when requires_registration=true', () => {
  // GST requires registration
  const miss = validateCreate({ clientId: 'c', serviceCode: 'GST' }, CATALOGUE)
  assert.equal(miss.errors.linkedRegistrationId, 'This service needs a linked registration.')
  const ok = validateCreate({ clientId: 'c', serviceCode: 'GST', linkedRegistrationId: 'reg-1' }, CATALOGUE)
  assert.equal(ok.valid, true)
  // ACCOUNTING does not require it
  assert.equal(validateCreate({ clientId: 'c', serviceCode: 'ACCOUNTING' }, CATALOGUE).valid, true)
})
test('C-create: 8 OTHER requires non-empty notes', () => {
  assert.equal(validateCreate({ clientId: 'c', serviceCode: 'OTHER', notes: '   ' }, CATALOGUE)
    .errors.notes, "Notes are required for the 'Other' service.")
  assert.equal(validateCreate({ clientId: 'c', serviceCode: 'OTHER', notes: 'ad-hoc filing' }, CATALOGUE)
    .valid, true)
})

// ── C. edit validation ──────────────────────────────────────────────────────
test('C-edit: id + integer rowVersion required; Draft only', () => {
  const row = draft({ service_code: 'ACCOUNTING' })
  assert.equal(validateEdit({ id: 'x', rowVersion: 1 }, CATALOGUE, row).valid, true)
  const bad = validateEdit({ id: '', rowVersion: '1' }, CATALOGUE, row)
  assert.equal(bad.errors.id, 'Missing record id.')
  assert.equal(bad.errors.rowVersion, 'Missing or invalid record version.')
  const onApproved = validateEdit({ id: 'x', rowVersion: 1 }, CATALOGUE, approved({ service_code: 'ACCOUNTING' }))
  assert.equal(onApproved.errors.status, 'Only draft records can be edited.')
})
test('C-edit: serviceCode immutable', () => {
  const row = draft({ service_code: 'ACCOUNTING' })
  const r = validateEdit({ id: 'x', rowVersion: 1, serviceCode: 'GST' }, CATALOGUE, row)
  assert.equal(r.errors.serviceCode, 'Service cannot be changed; start a new row instead.')
})
test('C-edit: effectiveTo must remain null; OTHER notes enforced from row code', () => {
  const row = draft({ service_code: 'OTHER' })
  const r = validateEdit({ id: 'x', rowVersion: 1, effectiveTo: '2026-04-01', notes: '' }, CATALOGUE, row)
  assert.equal(r.errors.effectiveTo, 'End date is set only when deactivating.')
  assert.equal(r.errors.notes, "Notes are required for the 'Other' service.")
})

// ── C. approve validation (12/13) ───────────────────────────────────────────
test('C-approve: 12 requires effectiveFrom on the row', () => {
  const r = validateApprove({ id: 'x', rowVersion: 2 }, draft({ effective_from: null, effective_to: null }))
  assert.equal(r.errors.effectiveFrom, 'Set a start date before approving.')
})
test('C-approve: 13 rejects non-null effectiveTo on the row', () => {
  const r = validateApprove({ id: 'x', rowVersion: 2 }, draft({ effective_from: '2026-04-01', effective_to: '2026-06-01' }))
  assert.equal(r.errors.effectiveTo, 'Clear the end date before approving (edit the draft first).')
})
test('C-approve: happy path', () => {
  const r = validateApprove({ id: 'x', rowVersion: 2 }, draft({ effective_from: '2026-04-01', effective_to: null }))
  assert.equal(r.valid, true)
})
test('C-approve: only Draft approvable; id+version required', () => {
  assert.equal(validateApprove({ id: 'x', rowVersion: 1 }, approved({ effective_from: '2026-04-01' })).errors.status,
    'Only draft records can be approved.')
  const bad = validateApprove({ id: '', rowVersion: null }, draft({ effective_from: '2026-04-01', effective_to: null }))
  assert.equal(bad.errors.id, 'Missing record id.')
  assert.equal(bad.errors.rowVersion, 'Missing or invalid record version.')
})

// ── C. deactivate validation (14) ───────────────────────────────────────────
test('C-deactivate: effectiveTo required', () => {
  const r = validateDeactivate({ id: 'x', rowVersion: 3, effectiveTo: '' }, approved({ effective_from: '2026-04-01' }))
  assert.equal(r.errors.effectiveTo, 'Enter an end date.')
})
test('C-deactivate: 14 end date not before start date', () => {
  const r = validateDeactivate({ id: 'x', rowVersion: 3, effectiveTo: '2026-03-01' }, approved({ effective_from: '2026-04-01' }))
  assert.equal(r.errors.effectiveTo, "End date can't be before the start date.")
})
test('C-deactivate: happy path Draft or Approved; Inactive rejected', () => {
  assert.equal(validateDeactivate({ id: 'x', rowVersion: 3, effectiveTo: '2026-05-01' }, approved({ effective_from: '2026-04-01' })).valid, true)
  assert.equal(validateDeactivate({ id: 'x', rowVersion: 1, effectiveTo: '2026-05-01' }, draft({ effective_from: null })).valid, true)
  assert.equal(validateDeactivate({ id: 'x', rowVersion: 3, effectiveTo: '2026-05-01' }, inactive()).errors.status,
    'Only draft or approved records can be deactivated.')
})

// ── Correction 1: fail closed when authoritative row data is missing ────────
const MISSING_ROWS = [
  ['null', null],
  ['undefined', undefined],
  ['number', 42],
  ['string', 'Draft'],
  ['boolean', true],
  ['array', [{ status: 'Draft' }]],
]
test('C1: validateEdit rejects when row is missing/malformed', () => {
  for (const [label, row] of MISSING_ROWS) {
    const r = validateEdit({ id: 'x', rowVersion: 1 }, CATALOGUE, row)
    assert.equal(r.valid, false, `edit must be invalid for ${label} row`)
    assert.equal(r.errors.row, 'Record data is unavailable. Please reload.')
  }
  // even a perfectly valid input cannot be valid without a row
  assert.equal(validateEdit({ id: 'x', rowVersion: 1 }, CATALOGUE).valid, false)
  assert.equal(validateEdit({ id: 'x', rowVersion: 1 }, CATALOGUE, undefined).valid, false)
})
test('C1: validateApprove rejects when row is missing/malformed', () => {
  for (const [label, row] of MISSING_ROWS) {
    const r = validateApprove({ id: 'x', rowVersion: 2 }, row)
    assert.equal(r.valid, false, `approve must be invalid for ${label} row`)
    assert.equal(r.errors.row, 'Record data is unavailable. Please reload.')
  }
  assert.equal(validateApprove({ id: 'x', rowVersion: 2 }).valid, false)
})
test('C1: validateDeactivate rejects when row is missing/malformed', () => {
  for (const [label, row] of MISSING_ROWS) {
    const r = validateDeactivate({ id: 'x', rowVersion: 3, effectiveTo: '2026-05-01' }, row)
    assert.equal(r.valid, false, `deactivate must be invalid for ${label} row`)
    assert.equal(r.errors.row, 'Record data is unavailable. Please reload.')
  }
  assert.equal(validateDeactivate({ id: 'x', rowVersion: 3, effectiveTo: '2026-05-01' }).valid, false)
})
test('C1: valid Draft/Approved rows still pass (no false rejection)', () => {
  assert.equal(validateEdit({ id: 'x', rowVersion: 1 }, CATALOGUE, draft({ service_code: 'ACCOUNTING' })).valid, true)
  assert.equal(validateApprove({ id: 'x', rowVersion: 2 }, draft({ effective_from: '2026-04-01', effective_to: null })).valid, true)
  assert.equal(validateDeactivate({ id: 'x', rowVersion: 3, effectiveTo: '2026-05-01' }, approved({ effective_from: '2026-04-01' })).valid, true)
})

// ── C. restart validation ───────────────────────────────────────────────────
test('C-restart: source must be Inactive', () => {
  assert.equal(validateRestart(draft()).valid, false)
  assert.equal(validateRestart(approved()).valid, false)
  assert.equal(validateRestart(inactive({ service_code: 'GST' })).valid, true)
})

// ── 19/20/21. static guarantees on the two CP-1 source modules ──────────────
const CP1_SOURCES = [
  '../src/lib/serviceApplicability.js',
  '../src/lib/serviceApplicabilityErrors.js',
]
test('19: no forbidden references (supabase / legacy compliance surfaces)', () => {
  const forbidden = [
    'supabase',
    'clients.services',
    'activate_accounting_service',
    'generate_client_compliance',
    'accounting_tracker',
    'financials_tracker',
    'income_tax_tracker',
    'compliance_calendar',
  ]
  for (const f of CP1_SOURCES) {
    const src = stripComments(read(f))
    for (const bad of forbidden) {
      assert.equal(src.includes(bad), false, `${f} must not reference ${bad}`)
    }
  }
})
test('20: no direct write methods (.insert/.update/.delete/.upsert)', () => {
  const writes = ['.insert(', '.update(', '.delete(', '.upsert(']
  for (const f of CP1_SOURCES) {
    const src = stripComments(read(f))
    for (const w of writes) {
      assert.equal(src.includes(w), false, `${f} must not contain ${w}`)
    }
  }
})
test('21: no React import and no obvious side-effect/browser calls', () => {
  for (const f of CP1_SOURCES) {
    const src = stripComments(read(f))
    assert.equal(/from\s+['"]react['"]/.test(src), false, `${f} must not import react`)
    assert.equal(/\.rpc\(/.test(src), false, `${f} must not call .rpc(`)
    for (const bad of ['document', 'window', 'fetch(', 'localStorage', 'console.']) {
      assert.equal(src.includes(bad), false, `${f} must not reference ${bad}`)
    }
  }
})
