/**
 * P5 — Service Applicability: pure business logic (CP-1).
 *
 * NO React, NO Supabase, NO network, NO side effects — importable directly by
 * node:test. This module holds the lifecycle constants/predicates, normalisation
 * helpers, form validation and the exact RPC payload builders for the three
 * Migration 0021 RPCs (service_applicability_create / _update / _set_status).
 *
 * Design source of truth: docs/M1B_P5_UI_Discovery_Design_And_Implementation_Plan.md
 * and Migration 0021. Writes themselves happen only in a later checkpoint (CP-5/CP-6);
 * this file computes payloads and validates input — it performs no I/O.
 *
 * NOTE (governance): the "OTHER requires notes" rule is enforced here as UI
 * defence-in-depth ONLY. The authoritative backend enforcement is prerequisite
 * gate PG-1 (error code OTHER_NOTES_REQUIRED) and must land before write UI.
 */

// ── A. Lifecycle constants ────────────────────────────────────────────────
export const STATUSES = Object.freeze({
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  INACTIVE: 'Inactive',
})

export const STATUS_VALUES = Object.freeze(['Draft', 'Approved', 'Inactive'])

export const FREQUENCIES = Object.freeze([
  'MONTHLY',
  'QUARTERLY',
  'HALF_YEARLY',
  'ANNUAL',
  'EVENT_BASED',
  'ONE_TIME',
  'AS_REQUIRED',
])

// ── B. Normalisation helpers (pure) ───────────────────────────────────────

/** Always returns a string: null/undefined → '', otherwise String(v).trim(). */
export function trimText(v) {
  return String(v ?? '').trim()
}

/** Trimmed string, or null when the trimmed value is empty. */
export function blankToNull(v) {
  const s = trimText(v)
  return s === '' ? null : s
}

/** Frequency → UPPERCASE token, or null when blank. No validation here. */
export function normFrequency(v) {
  const s = blankToNull(v)
  return s === null ? null : s.toUpperCase()
}

/** Service code → UPPERCASE token, or null when blank. */
export function normServiceCode(v) {
  const s = blankToNull(v)
  return s === null ? null : s.toUpperCase()
}

/**
 * Date → 'YYYY-MM-DD' string or null, WITHOUT timezone conversion.
 * Strings pass through trimmed (no Date parsing → no TZ shift). A Date object is
 * formatted from its LOCAL components (never toISOString, which would UTC-shift).
 */
export function normDate(v) {
  if (v == null) return null
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(v).trim()
  return s === '' ? null : s
}

/**
 * Optional UUID-like value → trimmed string, or null when blank. This project has
 * no reusable pure UUID validator, so per CP-1 scope we do NOT attempt cryptographic
 * or database UUID validation here — we only normalise blanks to null.
 */
export function normUuid(v) {
  return blankToNull(v)
}

// ── A. Predicates ─────────────────────────────────────────────────────────

/** True only for one of the three canonical statuses. */
export function isValidStatus(status) {
  return STATUS_VALUES.includes(status)
}

/** Optional: null/blank is allowed; otherwise must be an approved frequency. */
export function isValidFrequency(frequency) {
  if (frequency == null) return true
  const s = String(frequency).trim()
  if (s === '') return true
  return FREQUENCIES.includes(s.toUpperCase())
}

/** row_version must be an actual integer (0 ok; null / '3' string are NOT). */
export function isValidRowVersion(v) {
  return Number.isInteger(v)
}

const statusOf = (row) => (row && typeof row === 'object' ? row.status : undefined)

/** Live = Draft or Approved only. */
export function isLive(row) {
  const s = statusOf(row)
  return s === STATUSES.DRAFT || s === STATUSES.APPROVED
}

/** Editable = Draft only. */
export function canEdit(row) {
  return statusOf(row) === STATUSES.DRAFT
}

/** Approvable = Draft only. */
export function canApprove(row) {
  return statusOf(row) === STATUSES.DRAFT
}

/** Deactivatable = Draft or Approved only. */
export function canDeactivate(row) {
  const s = statusOf(row)
  return s === STATUSES.DRAFT || s === STATUSES.APPROVED
}

/** Restartable = Inactive only. Restart is always a NEW Draft (never a reopen). */
export function canRestart(row) {
  return statusOf(row) === STATUSES.INACTIVE
}

// ── C. Validation (pure; never throws for ordinary failures) ──────────────

const result = (errors) => ({ valid: Object.keys(errors).length === 0, errors })

/**
 * Fail-closed authoritative-row guard. Edit/approve/deactivate operate on an existing
 * record; without a real row object we cannot verify status or lifecycle invariants,
 * so we reject rather than risk a write against unknown state. Rejects null, undefined,
 * primitives and arrays. Sets errors.row and returns false when the row is unusable.
 */
function requireRow(errors, row) {
  const ok = row != null && typeof row === 'object' && !Array.isArray(row)
  if (!ok) errors.row = 'Record data is unavailable. Please reload.'
  return ok
}

/** Find an active catalogue row by normalised code. */
function findCatalogue(list, code) {
  if (!Array.isArray(list) || code == null) return null
  return (
    list.find(
      (r) => r && normServiceCode(r.code) === code && r.is_active !== false,
    ) || null
  )
}

/** requires_registration flag for a catalogue row (default false). */
function requiresRegistration(catRow) {
  return catRow ? catRow.requires_registration === true : false
}

/**
 * Create validation. `activeCatalogue` is the supplied active catalogue collection
 * (array of { code, requires_registration, is_active? }).
 */
export function validateCreate(input = {}, activeCatalogue = []) {
  const errors = {}

  if (blankToNull(input.clientId) == null) errors.clientId = 'Select a client.'

  const code = normServiceCode(input.serviceCode)
  const cat = findCatalogue(activeCatalogue, code)
  if (code == null) errors.serviceCode = 'Select a service.'
  else if (cat == null) errors.serviceCode = 'That service is not available.'

  if (!isValidFrequency(input.frequency)) errors.frequency = 'Choose a valid frequency.'

  // effectiveFrom is optional in Draft — no check.
  // effectiveTo must NOT be accepted from the create form.
  if (blankToNull(input.effectiveTo) != null) {
    errors.effectiveTo = 'End date is set only when deactivating.'
  }

  if (requiresRegistration(cat) && normUuid(input.linkedRegistrationId) == null) {
    errors.linkedRegistrationId = 'This service needs a linked registration.'
  }
  // ownerTeamId optional — no check.

  if (code === 'OTHER' && blankToNull(input.notes) == null) {
    errors.notes = "Notes are required for the 'Other' service."
  }

  return result(errors)
}

/**
 * Edit validation. `row` supplies the immutable service_code and current status;
 * only Draft rows are editable.
 */
export function validateEdit(input = {}, activeCatalogue = [], row = null) {
  const errors = {}

  if (blankToNull(input.id) == null) errors.id = 'Missing record id.'
  if (!isValidRowVersion(input.rowVersion)) errors.rowVersion = 'Missing or invalid record version.'
  // Fail closed without an authoritative row — cannot verify editability.
  if (!requireRow(errors, row)) return result(errors)
  if (!canEdit(row)) errors.status = 'Only draft records can be edited.'

  const rowCode = normServiceCode(row.service_code)
  if (input.serviceCode != null && normServiceCode(input.serviceCode) !== rowCode) {
    errors.serviceCode = 'Service cannot be changed; start a new row instead.'
  }
  const cat = findCatalogue(activeCatalogue, rowCode)

  if (!isValidFrequency(input.frequency)) errors.frequency = 'Choose a valid frequency.'
  if (blankToNull(input.effectiveTo) != null) {
    errors.effectiveTo = 'End date is set only when deactivating.'
  }
  if (requiresRegistration(cat) && normUuid(input.linkedRegistrationId) == null) {
    errors.linkedRegistrationId = 'This service needs a linked registration.'
  }
  if (rowCode === 'OTHER' && blankToNull(input.notes) == null) {
    errors.notes = "Notes are required for the 'Other' service."
  }

  return result(errors)
}

/** Approve validation. Reads the row's current effective_from / effective_to. */
export function validateApprove(input = {}, row = null) {
  const errors = {}

  if (blankToNull(input.id) == null) errors.id = 'Missing record id.'
  if (!isValidRowVersion(input.rowVersion)) errors.rowVersion = 'Missing or invalid record version.'
  // Fail closed without an authoritative row — cannot verify approvability.
  if (!requireRow(errors, row)) return result(errors)
  if (!canApprove(row)) errors.status = 'Only draft records can be approved.'

  if (normDate(row.effective_from) == null) {
    errors.effectiveFrom = 'Set a start date before approving.'
  }
  if (normDate(row.effective_to) != null) {
    errors.effectiveTo = 'Clear the end date before approving (edit the draft first).'
  }

  return result(errors)
}

/** Deactivate validation. effectiveTo required; not earlier than effective_from. */
export function validateDeactivate(input = {}, row = null) {
  const errors = {}

  if (blankToNull(input.id) == null) errors.id = 'Missing record id.'
  if (!isValidRowVersion(input.rowVersion)) errors.rowVersion = 'Missing or invalid record version.'
  // Fail closed without an authoritative row — cannot verify deactivatability.
  if (!requireRow(errors, row)) return result(errors)
  if (!canDeactivate(row)) {
    errors.status = 'Only draft or approved records can be deactivated.'
  }

  const to = normDate(input.effectiveTo)
  if (to == null) {
    errors.effectiveTo = 'Enter an end date.'
  } else {
    const from = normDate(row.effective_from)
    if (from != null && to < from) {
      errors.effectiveTo = "End date can't be before the start date."
    }
  }

  return result(errors)
}

/**
 * Restart validation. Source must be Inactive; the result is a NEW create-form seed
 * (see buildRestartDraft). No source id / row_version may be reused as an
 * update/status target — the seed deliberately omits them.
 */
export function validateRestart(sourceRow = null) {
  if (!canRestart(sourceRow)) {
    return { valid: false, errors: { status: 'Only inactive records can be restarted.' }, seed: null }
  }
  return { valid: true, errors: {}, seed: buildRestartDraft(sourceRow) }
}

// ── D. Payload builders (exact RPC arg shapes) ────────────────────────────

/** service_applicability_create args. p_effective_to is ALWAYS null from the form. */
export function buildCreatePayload({
  clientId,
  serviceCode,
  effectiveFrom,
  frequency,
  linkedRegistrationId,
  ownerTeamId,
  notes,
} = {}) {
  return {
    p_client_id: blankToNull(clientId),
    p_service_code: normServiceCode(serviceCode),
    p_effective_from: normDate(effectiveFrom),
    p_effective_to: null,
    p_frequency: normFrequency(frequency),
    p_linked_registration_id: normUuid(linkedRegistrationId),
    p_owner_team_id: normUuid(ownerTeamId),
    p_notes: blankToNull(notes),
  }
}

/** service_applicability_update args. No service_code, no status. p_effective_to null. */
export function buildUpdatePayload({
  id,
  rowVersion,
  effectiveFrom,
  frequency,
  linkedRegistrationId,
  ownerTeamId,
  notes,
} = {}) {
  return {
    p_id: blankToNull(id),
    p_expected_row_version: rowVersion,
    p_effective_from: normDate(effectiveFrom),
    p_effective_to: null,
    p_frequency: normFrequency(frequency),
    p_linked_registration_id: normUuid(linkedRegistrationId),
    p_owner_team_id: normUuid(ownerTeamId),
    p_notes: blankToNull(notes),
  }
}

/** service_applicability_set_status args for approval. */
export function buildApprovePayload({ id, rowVersion } = {}) {
  return {
    p_id: blankToNull(id),
    p_expected_row_version: rowVersion,
    p_new_status: 'Approved',
    p_effective_to: null,
  }
}

/** service_applicability_set_status args for deactivation. */
export function buildDeactivatePayload({ id, rowVersion, effectiveTo } = {}) {
  return {
    p_id: blankToNull(id),
    p_expected_row_version: rowVersion,
    p_new_status: 'Inactive',
    p_effective_to: normDate(effectiveTo),
  }
}

/**
 * Restart seed — a NEW create-form object reusing only business fields from the
 * (Inactive) source row. It deliberately carries NONE of: id, row_version, status,
 * approved_by, approved_at, effective_to, created_by, updated_by, created_at,
 * updated_at. effective_from is reset (blank) so the user enters a fresh start date.
 */
export function buildRestartDraft(sourceRow = {}) {
  const r = sourceRow || {}
  return {
    clientId: blankToNull(r.client_id),
    serviceCode: normServiceCode(r.service_code),
    effectiveFrom: '',
    frequency: normFrequency(r.frequency),
    linkedRegistrationId: normUuid(r.linked_registration_id),
    ownerTeamId: normUuid(r.owner_team_id),
    notes: blankToNull(r.notes),
  }
}
