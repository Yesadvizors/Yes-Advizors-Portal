/**
 * P5 CP-1 — Service Applicability payload builders. node:test.
 *   npm test
 *
 * Verifies the exact RPC arg shapes for Migration 0021's three RPCs, null
 * normalisation, and that create/update never emit a status or service_code
 * mutation, and that a restart seed strips identity/status/audit fields.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCreatePayload,
  buildUpdatePayload,
  buildApprovePayload,
  buildDeactivatePayload,
  buildRestartDraft,
} from '../src/lib/serviceApplicability.js'

const keys = (o) => Object.keys(o).sort()

// ── 3. create payload exact keys + null normalisation ───────────────────────
test('3: buildCreatePayload exact keys and values', () => {
  const p = buildCreatePayload({
    clientId: ' c-1 ',
    serviceCode: ' gst ',
    effectiveFrom: '2026-04-01',
    frequency: ' monthly ',
    linkedRegistrationId: ' reg-9 ',
    ownerTeamId: '',
    notes: '  ',
  })
  assert.deepEqual(keys(p), [
    'p_client_id', 'p_effective_from', 'p_effective_to', 'p_frequency',
    'p_linked_registration_id', 'p_notes', 'p_owner_team_id', 'p_service_code',
  ])
  assert.deepEqual(p, {
    p_client_id: 'c-1',
    p_service_code: 'GST',
    p_effective_from: '2026-04-01',
    p_effective_to: null,
    p_frequency: 'MONTHLY',
    p_linked_registration_id: 'reg-9',
    p_owner_team_id: null,
    p_notes: null,
  })
})
test('3: create with empty optional fields → nulls; effective_to always null', () => {
  const p = buildCreatePayload({ clientId: 'c', serviceCode: 'ACCOUNTING' })
  assert.equal(p.p_effective_from, null)
  assert.equal(p.p_effective_to, null)
  assert.equal(p.p_frequency, null)
  assert.equal(p.p_linked_registration_id, null)
  assert.equal(p.p_owner_team_id, null)
  assert.equal(p.p_notes, null)
})

// ── 4. update payload exact keys; no service_code / status mutation ─────────
test('4: buildUpdatePayload exact keys, no service_code, no status', () => {
  const p = buildUpdatePayload({
    id: ' id-1 ',
    rowVersion: 4,
    effectiveFrom: '2026-04-01',
    frequency: 'ANNUAL',
    linkedRegistrationId: null,
    ownerTeamId: 'team-2',
    notes: 'x',
  })
  assert.deepEqual(keys(p), [
    'p_effective_from', 'p_effective_to', 'p_expected_row_version', 'p_frequency',
    'p_id', 'p_linked_registration_id', 'p_notes', 'p_owner_team_id',
  ])
  assert.equal('p_service_code' in p, false)
  assert.equal('p_new_status' in p, false)
  assert.equal('p_status' in p, false)
  assert.deepEqual(p, {
    p_id: 'id-1',
    p_expected_row_version: 4,
    p_effective_from: '2026-04-01',
    p_effective_to: null,
    p_frequency: 'ANNUAL',
    p_linked_registration_id: null,
    p_owner_team_id: 'team-2',
    p_notes: 'x',
  })
})
test('4: update passes rowVersion through unchanged (incl. 0)', () => {
  assert.equal(buildUpdatePayload({ id: 'x', rowVersion: 0 }).p_expected_row_version, 0)
  assert.equal(buildUpdatePayload({ id: 'x', rowVersion: 7 }).p_expected_row_version, 7)
})

// ── 5. approve payload exact values ─────────────────────────────────────────
test('5: buildApprovePayload exact', () => {
  const p = buildApprovePayload({ id: ' a-1 ', rowVersion: 2 })
  assert.deepEqual(p, {
    p_id: 'a-1',
    p_expected_row_version: 2,
    p_new_status: 'Approved',
    p_effective_to: null,
  })
})

// ── 6. deactivate payload date ──────────────────────────────────────────────
test('6: buildDeactivatePayload carries the end date', () => {
  const p = buildDeactivatePayload({ id: 'd-1', rowVersion: 3, effectiveTo: '2026-06-30' })
  assert.deepEqual(p, {
    p_id: 'd-1',
    p_expected_row_version: 3,
    p_new_status: 'Inactive',
    p_effective_to: '2026-06-30',
  })
})
test('6: deactivate with blank end date → null (validation catches requiredness)', () => {
  assert.equal(buildDeactivatePayload({ id: 'd', rowVersion: 1, effectiveTo: '' }).p_effective_to, null)
})

// ── 7. restart seed strips identity / status / audit fields ─────────────────
test('7: buildRestartDraft reuses business fields, strips the rest', () => {
  const source = {
    id: 'row-1',
    row_version: 5,
    status: 'Inactive',
    client_id: 'client-9',
    service_code: 'gst',
    frequency: 'quarterly',
    owner_team_id: 'team-3',
    linked_registration_id: 'reg-7',
    notes: 'legacy note',
    effective_from: '2025-04-01',
    effective_to: '2026-03-31',
    approved_by: 'u-1',
    approved_at: '2025-04-02T00:00:00Z',
    created_by: 'u-1',
    updated_by: 'u-2',
    created_at: '2025-04-01T00:00:00Z',
    updated_at: '2026-03-31T00:00:00Z',
  }
  const seed = buildRestartDraft(source)
  // reusable business fields carried over (normalised)
  assert.deepEqual(seed, {
    clientId: 'client-9',
    serviceCode: 'GST',
    effectiveFrom: '',
    frequency: 'QUARTERLY',
    linkedRegistrationId: 'reg-7',
    ownerTeamId: 'team-3',
    notes: 'legacy note',
  })
  // forbidden fields must be absent
  for (const bad of [
    'id', 'row_version', 'status', 'approved_by', 'approved_at',
    'effective_to', 'created_by', 'updated_by', 'created_at', 'updated_at',
  ]) {
    assert.equal(bad in seed, false, `restart seed must not carry ${bad}`)
  }
})
