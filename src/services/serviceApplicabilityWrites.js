/**
 * P5 — Service Applicability: WRITE wrappers (CP-2).
 *
 * The ONLY write path. Each wrapper calls exactly one Migration 0021 RPC and does
 * NOTHING else: no direct table writes (.insert/.update/.delete/.upsert), no other
 * RPC name, no retries, no automatic stale-row recovery, no input mutation, no
 * toast/UI logic, no React. Errors are returned as the native Supabase {data,error}
 * result — never swallowed.
 *
 * Args are the exact payload objects produced by the CP-1 builders
 * (buildCreatePayload / buildUpdatePayload / buildApprovePayload /
 * buildDeactivatePayload) in src/lib/serviceApplicability.js.
 *
 * Transport guard only (NOT full business validation — that is CP-1): a wrapper fails
 * closed WITHOUT calling Supabase when required RPC identifiers are absent.
 *
 * Testability / no import side effects: pure `*With(client)` factories (unit-tested
 * with an injected fake client) + production functions bound to the shared client via
 * a lazy dynamic import (defers src/supabase.js env evaluation; see reads module).
 *
 * @typedef {string} UUID
 * @typedef {string} ISODate
 * @typedef {('Draft'|'Approved'|'Inactive')} Status
 * @typedef {('MONTHLY'|'QUARTERLY'|'HALF_YEARLY'|'ANNUAL'|'EVENT_BASED'|'ONE_TIME'|'AS_REQUIRED')} Frequency
 *
 * @typedef {Object} CreateServiceApplicabilityArgs
 * @property {UUID} p_client_id
 * @property {string} p_service_code
 * @property {ISODate|null} p_effective_from
 * @property {null} p_effective_to           always null from the create form
 * @property {Frequency|null} p_frequency
 * @property {UUID|null} p_linked_registration_id
 * @property {UUID|null} p_owner_team_id
 * @property {string|null} p_notes
 *
 * @typedef {Object} UpdateServiceApplicabilityArgs
 * @property {UUID} p_id
 * @property {number} p_expected_row_version  integer
 * @property {ISODate|null} p_effective_from
 * @property {null} p_effective_to            always null on edit
 * @property {Frequency|null} p_frequency
 * @property {UUID|null} p_linked_registration_id
 * @property {UUID|null} p_owner_team_id
 * @property {string|null} p_notes
 *
 * @typedef {Object} SetServiceApplicabilityStatusArgs
 * @property {UUID} p_id
 * @property {number} p_expected_row_version  integer
 * @property {Status} p_new_status            'Approved' | 'Inactive'
 * @property {ISODate|null} p_effective_to     null for approval; the stop date for deactivation
 *
 * @typedef {{ id: UUID, row_version: number }} CreateServiceApplicabilityResponse  (RPC data)
 * @typedef {number} RowVersionResponse        update / set_status return the new row_version
 * @typedef {{ data: any, error: (null | { message: string }) }} SupabaseResult
 */

const RPC_CREATE = 'service_applicability_create'
const RPC_UPDATE = 'service_applicability_update'
const RPC_SET_STATUS = 'service_applicability_set_status'

function isObject(x) {
  return x != null && typeof x === 'object' && !Array.isArray(x)
}
function hasText(v) {
  return v != null && String(v).trim() !== ''
}
/** Consistent fail-closed shape for invalid transport args (no RPC issued). */
function invalidArgs() {
  return { data: null, error: { message: 'INVALID_SERVICE_APPLICABILITY_ARGS' } }
}

// Transport guards — required RPC identifiers only (NOT business validation).
function guardCreate(args) {
  if (!isObject(args)) return invalidArgs()
  if (!hasText(args.p_client_id) || !hasText(args.p_service_code)) return invalidArgs()
  return null
}
function guardUpdate(args) {
  if (!isObject(args)) return invalidArgs()
  if (!hasText(args.p_id) || !Number.isInteger(args.p_expected_row_version)) return invalidArgs()
  return null
}
function guardSetStatus(args) {
  if (!isObject(args)) return invalidArgs()
  if (
    !hasText(args.p_id) ||
    !Number.isInteger(args.p_expected_row_version) ||
    !hasText(args.p_new_status)
  ) {
    return invalidArgs()
  }
  return null
}

/** Lazy shared-client accessor (see reads module rationale). */
let _clientPromise
async function sharedClient() {
  if (!_clientPromise) _clientPromise = import('../supabase.js').then((m) => m.supabase)
  return _clientPromise
}

// ── factories (pure; injected client) ─────────────────────────────────────

/** @param {any} client */
export function createServiceApplicabilityWith(client) {
  /** @param {CreateServiceApplicabilityArgs} args */
  return (args) => {
    const bad = guardCreate(args)
    if (bad) return bad
    return client.rpc(RPC_CREATE, args)
  }
}

/** @param {any} client */
export function updateServiceApplicabilityWith(client) {
  /** @param {UpdateServiceApplicabilityArgs} args */
  return (args) => {
    const bad = guardUpdate(args)
    if (bad) return bad
    return client.rpc(RPC_UPDATE, args)
  }
}

/** @param {any} client */
export function setServiceApplicabilityStatusWith(client) {
  /** @param {SetServiceApplicabilityStatusArgs} args */
  return (args) => {
    const bad = guardSetStatus(args)
    if (bad) return bad
    return client.rpc(RPC_SET_STATUS, args)
  }
}

// ── production functions (bound to the shared client) ──────────────────────

/** @param {CreateServiceApplicabilityArgs} args @returns {Promise<SupabaseResult>} */
export async function createServiceApplicability(args) {
  const bad = guardCreate(args)
  if (bad) return bad // fail closed before touching Supabase
  return createServiceApplicabilityWith(await sharedClient())(args)
}

/** @param {UpdateServiceApplicabilityArgs} args @returns {Promise<SupabaseResult>} */
export async function updateServiceApplicability(args) {
  const bad = guardUpdate(args)
  if (bad) return bad
  return updateServiceApplicabilityWith(await sharedClient())(args)
}

/** @param {SetServiceApplicabilityStatusArgs} args @returns {Promise<SupabaseResult>} */
export async function setServiceApplicabilityStatus(args) {
  const bad = guardSetStatus(args)
  if (bad) return bad
  return setServiceApplicabilityStatusWith(await sharedClient())(args)
}
