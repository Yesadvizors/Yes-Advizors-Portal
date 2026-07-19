/**
 * P5 CP-1 — Service Applicability RPC error mapping. node:test.
 *   npm test
 *
 * Verifies every known Migration 0021 business error (plus the planned PG-1
 * OTHER_NOTES_REQUIRED) maps to a safe message; unknown errors use the project's
 * safe fallback; and STALE_ROW_VERSION returns the close_modal_refresh_reopen action
 * (never "keep stale values / swap row_version").
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  mapRpcError,
  extractErrorCode,
  SERVICE_APPLICABILITY_ERRORS,
  ERROR_ACTIONS,
} from '../src/lib/serviceApplicabilityErrors.js'

const KNOWN = [
  'NO_AUTH_CONTEXT',
  'NOT_AUTHORISED_INACTIVE',
  'NOT_AUTHORISED',
  'CLIENT_REQUIRED',
  'CLIENT_NOT_FOUND',
  'SERVICE_CODE_REQUIRED',
  'INVALID_OR_INACTIVE_SERVICE_CODE',
  'INVALID_FREQUENCY',
  'EFFECTIVE_TO_BEFORE_FROM',
  'EFFECTIVE_FROM_REQUIRED_FOR_APPROVED',
  'EFFECTIVE_FROM_REQUIRED_FOR_APPROVAL',
  'EFFECTIVE_TO_NOT_ALLOWED_FOR_APPROVED',
  'OWNER_NOT_ACTIVE_TEAM_MEMBER',
  'REGISTRATION_REQUIRED_FOR_SERVICE',
  'REGISTRATION_NOT_SAME_CLIENT',
  'OTHER_NOTES_REQUIRED',
  'ID_AND_VERSION_REQUIRED',
  'ROW_NOT_FOUND',
  'ROW_INACTIVE_NOT_EDITABLE',
  'INVALID_STATUS',
  'ILLEGAL_STATUS_TRANSITION',
  'STALE_ROW_VERSION',
]

// ── 16. every known code maps to a non-empty safe message ───────────────────
test('16: all required codes are present and map to a message', () => {
  for (const code of KNOWN) {
    assert.ok(SERVICE_APPLICABILITY_ERRORS[code], `missing mapping for ${code}`)
    const bare = mapRpcError(code)
    assert.equal(bare.code, code)
    assert.ok(typeof bare.message === 'string' && bare.message.length > 0)
  }
})

test('16: maps from an error object message with a trailing detail', () => {
  const r = mapRpcError({ message: 'CLIENT_NOT_FOUND: 4c1a-...' })
  assert.equal(r.code, 'CLIENT_NOT_FOUND')
  assert.equal(r.message, 'This client could not be found.')
  assert.equal(r.action, null)
})
test('16: maps ILLEGAL_STATUS_TRANSITION with arrow detail', () => {
  const r = mapRpcError('ILLEGAL_STATUS_TRANSITION: Draft -> Approved')
  assert.equal(r.code, 'ILLEGAL_STATUS_TRANSITION')
  assert.equal(r.action, null)
})
test('16: planned PG-1 OTHER_NOTES_REQUIRED is ready now', () => {
  const r = mapRpcError('OTHER_NOTES_REQUIRED')
  assert.equal(r.code, 'OTHER_NOTES_REQUIRED')
  assert.equal(r.message, "Notes are required for the 'Other' service.")
})

// ── 18. STALE_ROW_VERSION → close_modal_refresh_reopen ──────────────────────
test('18: STALE_ROW_VERSION returns the safe reopen action', () => {
  const r = mapRpcError({ message: 'STALE_ROW_VERSION' })
  assert.equal(r.code, 'STALE_ROW_VERSION')
  assert.equal(r.action, 'close_modal_refresh_reopen')
  assert.equal(r.action, ERROR_ACTIONS.STALE)
  // message must not suggest silently keeping/replacing values
  assert.match(r.message, /reopen/i)
})

// ── 17. unknown / non-business errors → safe fallback ───────────────────────
test('17: unknown error uses safe fallback, code null', () => {
  const r = mapRpcError({ message: 'new row violates check constraint "csa_dates_chk"', code: '23514' })
  assert.equal(r.code, null)
  assert.equal(r.action, null)
  assert.ok(r.message.includes('csa_dates_chk'))
  assert.ok(r.message.includes('[23514]')) // safeErrorDetail preserves the PG code
})
test('17: fallback strips secrets (delegates to safeErrorDetail)', () => {
  const r = mapRpcError({ message: 'failed https://token.example/x?apikey=SECRET123 boom' })
  assert.equal(r.code, null)
  assert.equal(r.message.includes('SECRET123'), false)
  assert.ok(r.message.includes('[link removed]'))
})
test('17: plain string and empty inputs are handled without throwing', () => {
  assert.equal(mapRpcError('totally unknown text').code, null)
  assert.equal(mapRpcError('').code, null)
  assert.equal(mapRpcError(null).code, null)
  assert.equal(mapRpcError(undefined).code, null)
})

// ── Correction 2: leading-token only ────────────────────────────────────────
test('C2: leading-token forms DO map', () => {
  assert.equal(extractErrorCode('STALE_ROW_VERSION'), 'STALE_ROW_VERSION')
  assert.equal(extractErrorCode('  STALE_ROW_VERSION  '), 'STALE_ROW_VERSION') // trimmed
  assert.equal(extractErrorCode('CLIENT_NOT_FOUND: 4c1a-detail'), 'CLIENT_NOT_FOUND')
  assert.equal(extractErrorCode('ILLEGAL_STATUS_TRANSITION: Draft -> Approved'), 'ILLEGAL_STATUS_TRANSITION')
  assert.equal(mapRpcError('CLIENT_NOT_FOUND: 4c1a').code, 'CLIENT_NOT_FOUND')
})
test('C2: embedded/wrapped/lowercase tokens DO NOT map → safe fallback code=null', () => {
  const cases = [
    'Request failed while handling STALE_ROW_VERSION metadata',
    'Unexpected wrapper: CLIENT_NOT_FOUND',
    'something went wrong then ILLEGAL_STATUS_TRANSITION happened',
    'stale_row_version lowercase should not match',
    'x STALE_ROW_VERSION', // token not at the start
  ]
  for (const c of cases) {
    assert.equal(extractErrorCode(c), null, `must not extract from: ${c}`)
    const r = mapRpcError(c)
    assert.equal(r.code, null, `must fall back for: ${c}`)
    assert.equal(r.action, null)
    assert.ok(typeof r.message === 'string' && r.message.length > 0)
  }
})
test('C2: a message that STARTS with a known token + trailing text still maps (leading token)', () => {
  // This is a genuine leading-token form and is intended to map.
  assert.equal(extractErrorCode('STALE_ROW_VERSION extra detail here'), 'STALE_ROW_VERSION')
})

// ── extractErrorCode direct ─────────────────────────────────────────────────
test('extractErrorCode returns null for non-business messages', () => {
  assert.equal(extractErrorCode('just a lowercase message'), null)
  assert.equal(extractErrorCode({ message: 'Draft only' }), null) // "Draft" is not a known code
  assert.equal(extractErrorCode('STALE_ROW_VERSION'), 'STALE_ROW_VERSION')
})
