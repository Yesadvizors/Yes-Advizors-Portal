/**
 * P5 — Service Applicability: pure hook-support helpers (CP-3).
 *
 * NO React, NO Supabase, NO network, NO side effects — importable by node:test.
 * Capability derivation, live/history split, catalogue indexing, row decoration,
 * view-model assembly, and the stable hook error shape all live here so the hooks
 * stay thin and the logic is unit-tested directly.
 *
 * Role fields are the verified `team` columns (migration 0002): `is_admin` (boolean),
 * `portal_role` (enum, 'Admin'|'Manager'|…), `is_active` (boolean) — reusing the pure
 * `isAdminOrManagerRole` predicate from clientMaster.js (mirrors server
 * public.is_admin_or_manager()). No guessed field.
 *
 * @typedef {import('../services/serviceApplicabilityReads.js').CatalogueRow} CatalogueRow
 * @typedef {import('../services/serviceApplicabilityReads.js').ApplicabilityRow} ApplicabilityRow
 * @typedef {import('../services/serviceApplicabilityReads.js').TeamMemberRow} TeamMemberRow
 * @typedef {import('../services/serviceApplicabilityReads.js').RegistrationRow} RegistrationRow
 *
 * @typedef {Object} Capabilities
 * @property {string|null} role
 * @property {boolean} isActive
 * @property {boolean} canView
 * @property {boolean} canCreate
 * @property {boolean} canEdit
 * @property {boolean} canApprove
 * @property {boolean} canDeactivate
 * @property {boolean} canRestart
 *
 * @typedef {{ code: string, message: string }} HookError
 */

import { isAdminOrManagerRole } from './clientMaster.js'

// ── A. capability derivation (pure) ────────────────────────────────────────

const ALL_FALSE = Object.freeze({
  canView: false,
  canCreate: false,
  canEdit: false,
  canApprove: false,
  canDeactivate: false,
  canRestart: false,
})
const ALL_TRUE = Object.freeze({
  canView: true,
  canCreate: true,
  canEdit: true,
  canApprove: true,
  canDeactivate: true,
  canRestart: true,
})

/**
 * Derive P5 capabilities from a team-row user. Admin and Manager are IDENTICAL
 * (approved OD-1). Active Admin/Manager → all true; anyone inactive, any other role,
 * or a missing/unresolved user → fail closed (all false). No UI-only Admin restriction
 * and no new backend policy — the RPCs remain the authority.
 * @param {any} user
 * @returns {Capabilities}
 */
export function deriveCapabilities(user) {
  const isActive = user != null && typeof user === 'object' && user.is_active === true
  const role = user != null && typeof user === 'object' && typeof user.portal_role === 'string'
    ? user.portal_role
    : null
  const enabled = isActive && isAdminOrManagerRole(user)
  return { role, isActive, ...(enabled ? ALL_TRUE : ALL_FALSE) }
}

// ── B. pure data helpers ───────────────────────────────────────────────────

const asArray = (v) => (Array.isArray(v) ? v : [])
const statusOf = (r) => (r && typeof r === 'object' ? r.status : undefined)

/**
 * Split applicability rows into live (Draft/Approved) and history (Inactive).
 * Malformed / unknown-status rows are treated as NEITHER (never live). Preserves the
 * incoming (server) order; does not mutate input.
 * @param {ApplicabilityRow[]} rows
 * @returns {{ liveRows: ApplicabilityRow[], historyRows: ApplicabilityRow[] }}
 */
export function splitApplicabilityRows(rows) {
  const liveRows = []
  const historyRows = []
  for (const r of asArray(rows)) {
    const s = statusOf(r)
    if (s === 'Draft' || s === 'Approved') liveRows.push(r)
    else if (s === 'Inactive') historyRows.push(r)
    // else: malformed/unknown → excluded from both (never live)
  }
  return { liveRows, historyRows }
}

/**
 * Index ACTIVE catalogue rows by code. Only rows with `is_active === true` are
 * indexed — rows that are is_active=false, missing is_active, null is_active, or
 * malformed (no string code) are excluded. First occurrence wins. No mutation.
 * @param {CatalogueRow[]} rows
 * @returns {Map<string, CatalogueRow>}
 */
export function indexCatalogueByCode(rows) {
  const map = new Map()
  for (const r of asArray(rows)) {
    if (!r || typeof r !== 'object') continue
    const code = r.code
    if (typeof code !== 'string' || code.trim() === '') continue
    if (r.is_active !== true) continue // explicit active only
    if (!map.has(code)) map.set(code, r)
  }
  return map
}

function catalogueGet(index, code) {
  if (!index) return null
  if (typeof index.get === 'function') return index.get(code) || null
  return (typeof index === 'object' && index[code]) || null
}

/** Safe registration label: "reg_type · reg_number (status)". */
function registrationLabel(reg) {
  const type = reg && typeof reg.reg_type === 'string' ? reg.reg_type : '—'
  const num = reg && reg.reg_number ? reg.reg_number : '—'
  const status = reg && reg.status ? ` (${reg.status})` : ''
  return `${type} · ${num}${status}`
}

/**
 * Add display-only derived fields (service_label, owner_name, registration_label)
 * without mutating input or the source rows. Unknown references fall back safely.
 * @param {ApplicabilityRow[]} rows
 * @param {Map<string,CatalogueRow>|Object} catalogueIndex
 * @param {TeamMemberRow[]} [teamRows]
 * @param {RegistrationRow[]} [registrationRows]
 * @returns {Array<ApplicabilityRow & {service_label:string, owner_name:(string|null), registration_label:(string|null)}>}
 */
export function decorateApplicabilityRows(rows, catalogueIndex, teamRows = [], registrationRows = []) {
  const teamById = new Map(
    asArray(teamRows).filter((t) => t && t.id != null).map((t) => [t.id, t]),
  )
  const regById = new Map(
    asArray(registrationRows).filter((r) => r && r.id != null).map((r) => [r.id, r]),
  )
  return asArray(rows).map((row) => {
    if (!row || typeof row !== 'object') return row
    const cat = catalogueGet(catalogueIndex, row.service_code)
    const service_label =
      cat && typeof cat.label === 'string' ? cat.label : (row.service_code ?? '—')

    let owner_name = null
    if (row.owner_team_id != null) {
      const owner = teamById.get(row.owner_team_id)
      owner_name = owner && typeof owner.name === 'string' ? owner.name : '—'
    }

    let registration_label = null
    if (row.linked_registration_id != null) {
      const reg = regById.get(row.linked_registration_id)
      registration_label = reg ? registrationLabel(reg) : '—'
    }

    return { ...row, service_label, owner_name, registration_label }
  })
}

/**
 * Assemble the read datasets into a display view model. availableServiceCodes lists
 * active catalogue codes NOT already used by a LIVE (Draft/Approved) row — Inactive
 * history never blocks a restart / new creation. Deterministic order preserved
 * throughout (catalogue order for codes; server order for rows). No mutation.
 * @param {{catalogue?:CatalogueRow[], applicability?:ApplicabilityRow[], team?:TeamMemberRow[], registrations?:RegistrationRow[]}} sets
 */
export function buildServiceApplicabilityViewModel(sets = {}) {
  const catalogue = asArray(sets.catalogue)
  const catalogueIndex = indexCatalogueByCode(catalogue)
  const decorated = decorateApplicabilityRows(
    asArray(sets.applicability),
    catalogueIndex,
    asArray(sets.team),
    asArray(sets.registrations),
  )
  const { liveRows, historyRows } = splitApplicabilityRows(decorated)

  const liveCodes = new Set(liveRows.map((r) => r && r.service_code).filter(Boolean))
  // Active catalogue = rows with is_active === true only. Rows that are is_active=false,
  // missing/null is_active, or malformed are excluded from the catalogue, the returned
  // active catalogue, and availableServiceCodes.
  const activeCatalogue = catalogue.filter(
    (c) => c && typeof c === 'object' && typeof c.code === 'string' && c.is_active === true,
  )
  const availableServiceCodes = activeCatalogue
    .map((c) => c.code)
    .filter((code) => !liveCodes.has(code))

  return { catalogue: activeCatalogue, liveRows, historyRows, availableServiceCodes }
}

// ── D. stable hook error shape ─────────────────────────────────────────────

export const READ_ERROR_CODES = Object.freeze({
  CLIENT_ID_REQUIRED: 'CLIENT_ID_REQUIRED',
  CATALOGUE_READ_FAILED: 'CATALOGUE_READ_FAILED',
  APPLICABILITY_READ_FAILED: 'APPLICABILITY_READ_FAILED',
  TEAM_READ_FAILED: 'TEAM_READ_FAILED',
  REGISTRATION_READ_FAILED: 'REGISTRATION_READ_FAILED',
  UNKNOWN_READ_FAILED: 'UNKNOWN_READ_FAILED',
})

const ERROR_MESSAGES = Object.freeze({
  CLIENT_ID_REQUIRED: 'Select a client to view service applicability.',
  CATALOGUE_READ_FAILED: 'Could not load the service catalogue. Please try again.',
  APPLICABILITY_READ_FAILED: 'Could not load service applicability. Please try again.',
  TEAM_READ_FAILED: 'Could not load team members. Please try again.',
  REGISTRATION_READ_FAILED: 'Could not load registrations. Please try again.',
  UNKNOWN_READ_FAILED: 'Could not load service applicability data. Please try again.',
})

/**
 * Build a stable, SAFE hook error. Messages are fixed per code — no raw environment
 * values, credentials, SQL text, stack traces, or Supabase internals are exposed.
 * @param {string} code
 * @returns {HookError}
 */
export function makeHookError(code) {
  const c = READ_ERROR_CODES[code] ? code : 'UNKNOWN_READ_FAILED'
  return { code: c, message: ERROR_MESSAGES[c] }
}

// ── hook-support state factories (pure; used by the data hook) ─────────────

/** The empty derived datasets — the fail-closed shape for missing/failed loads. */
export function emptyServiceApplicabilityDatasets() {
  return {
    catalogue: [],
    liveRows: [],
    historyRows: [],
    teamMembers: [],
    registrations: [],
    availableServiceCodes: [],
  }
}

/** Authoritative fail-closed state when no clientId is present. */
export function missingClientState() {
  return {
    loading: false,
    refreshing: false,
    error: makeHookError('CLIENT_ID_REQUIRED'),
    ...emptyServiceApplicabilityDatasets(),
  }
}

/**
 * Pure request sequencer for stale-response protection. `begin()` invalidates any
 * in-flight request by advancing the sequence (called at the START of EVERY load
 * attempt — including the missing-clientId path — so a client→missing change makes a
 * previous client's in-flight request stale). `shouldApply(seq, mounted)` decides
 * whether a resolved response is still current AND the component is mounted; it does
 * NOT rely on `mounted` alone. Extracted so this decision is unit-testable without a
 * DOM renderer.
 * @returns {{ begin: () => number, current: () => number, shouldApply: (seq:number, mounted?:boolean) => boolean }}
 */
export function makeRequestSequencer() {
  let n = 0
  return {
    begin() {
      n += 1
      return n
    },
    current() {
      return n
    },
    shouldApply(seq, mounted = true) {
      return seq === n && mounted === true
    },
  }
}
