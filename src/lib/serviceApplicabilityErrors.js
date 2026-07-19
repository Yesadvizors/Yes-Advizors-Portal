/**
 * P5 — Service Applicability: pure RPC error mapping (CP-1).
 *
 * NO React, NO Supabase, NO network, NO side effects. Maps the Migration 0021 RPC
 * business error tokens (raised as `RAISE EXCEPTION '<CODE>[: detail]'`, surfaced in
 * error.message) to safe, user-facing messages plus an optional UX action.
 *
 * Fallback: reuses the project's existing `safeErrorDetail` from ./errors.js, which
 * is itself pure (string sanitisation only — no browser/network dependency), so
 * importing it introduces no side effects.
 *
 * OTHER_NOTES_REQUIRED is included NOW as a planned PG-1 backend code so the frontend
 * logic is ready before that corrective migration lands; the UI must not rely on
 * UI-only enforcement.
 */

import { safeErrorDetail } from './errors.js'

/** Action tokens the UI acts on. STALE_ROW_VERSION never keeps stale form values. */
export const ERROR_ACTIONS = Object.freeze({
  STALE: 'close_modal_refresh_reopen',
})

/** code → { message, action }. action defaults to null when absent. */
export const SERVICE_APPLICABILITY_ERRORS = Object.freeze({
  NO_AUTH_CONTEXT: { message: 'Your session expired. Please sign in again.' },
  NOT_AUTHORISED_INACTIVE: { message: 'Your account is inactive.' },
  NOT_AUTHORISED: { message: "You don't have permission to do this." },
  CLIENT_REQUIRED: { message: 'Select a client.' },
  CLIENT_NOT_FOUND: { message: 'This client could not be found.' },
  SERVICE_CODE_REQUIRED: { message: 'Select a service.' },
  INVALID_OR_INACTIVE_SERVICE_CODE: { message: 'That service is not available.' },
  INVALID_FREQUENCY: { message: 'Choose a valid frequency.' },
  EFFECTIVE_TO_BEFORE_FROM: { message: "End date can't be before the start date." },
  EFFECTIVE_FROM_REQUIRED_FOR_APPROVED: { message: 'Set a start date before approving.' },
  EFFECTIVE_FROM_REQUIRED_FOR_APPROVAL: { message: 'Set a start date before approving.' },
  EFFECTIVE_TO_NOT_ALLOWED_FOR_APPROVED: {
    message: 'Clear the end date before approving (edit the draft first).',
  },
  OWNER_NOT_ACTIVE_TEAM_MEMBER: { message: 'Choose an active team member as owner.' },
  REGISTRATION_REQUIRED_FOR_SERVICE: { message: 'This service needs a linked registration.' },
  REGISTRATION_NOT_SAME_CLIENT: { message: 'That registration belongs to another client.' },
  // Planned PG-1 backend code (authoritative OTHER-notes enforcement):
  OTHER_NOTES_REQUIRED: { message: "Notes are required for the 'Other' service." },
  ID_AND_VERSION_REQUIRED: { message: 'Something went wrong; please reload and try again.' },
  ROW_NOT_FOUND: { message: 'This record no longer exists.' },
  ROW_INACTIVE_NOT_EDITABLE: {
    message: "Inactive records can't be edited. Use 'Start again' to add a new one.",
  },
  INVALID_STATUS: { message: "That status change isn't allowed." },
  ILLEGAL_STATUS_TRANSITION: { message: "That change isn't allowed from the current status." },
  STALE_ROW_VERSION: {
    message:
      'This record changed since you opened it. Your unsaved changes were not applied — please reopen and try again.',
    action: ERROR_ACTIONS.STALE,
  },
})

/** Turn a string / error-like into a raw message string. */
function rawMessage(err) {
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    return String(err.message || err.error_description || err.msg || '')
  }
  return ''
}

/**
 * Extract ONLY the LEADING business error token (UPPER_SNAKE) if it is one we know.
 * The RPC raises the code first, so a genuine business error starts with it —
 * 'STALE_ROW_VERSION', 'CLIENT_NOT_FOUND: <uuid>',
 * 'ILLEGAL_STATUS_TRANSITION: Draft -> Approved'.
 *
 * We deliberately DO NOT scan the whole message for a known token: a message that
 * merely *mentions* a code later (e.g. 'Request failed while handling
 * STALE_ROW_VERSION metadata' or 'Unexpected wrapper: CLIENT_NOT_FOUND') is NOT a
 * genuine business error and must fall through to the safe fallback (code=null).
 */
export function extractErrorCode(err) {
  const raw = rawMessage(err).trim()
  const token = (raw.match(/^([A-Z][A-Z0-9_]+)/) || [])[1] || null
  return token && Object.prototype.hasOwnProperty.call(SERVICE_APPLICABILITY_ERRORS, token)
    ? token
    : null
}

/**
 * Map an RPC error to { code, message, action }.
 * - known business code → its safe message (+ action for STALE_ROW_VERSION);
 * - unknown → { code: null, message: safeErrorDetail(...), action: null } using the
 *   project's existing sanitiser (strips secrets, keeps the Postgres code).
 */
export function mapRpcError(err) {
  const code = extractErrorCode(err)
  if (code) {
    const entry = SERVICE_APPLICABILITY_ERRORS[code]
    return { code, message: entry.message, action: entry.action || null }
  }
  const errLike = typeof err === 'string' ? { message: err } : err || { message: 'Unknown error' }
  return { code: null, message: safeErrorDetail(errLike), action: null }
}
