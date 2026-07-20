/**
 * P5 — Service Applicability: READ service layer (CP-2).
 *
 * READ-ONLY. No INSERT/UPDATE/DELETE/UPSERT and no .rpc() in this module. Every
 * client-scoped read is keyed strictly on clients.id (uuid) and fails closed (returns
 * an error-shaped result WITHOUT issuing a query) when the id is missing.
 *
 * Testability / no import side effects: each read has a pure `*With(client)` factory
 * (the SQL/PostgREST shape lives there and is unit-tested with an injected fake
 * client) plus a thin production function bound to the shared client. The shared
 * client is obtained via a LAZY dynamic import so that merely importing this module
 * evaluates no env and constructs no client (src/supabase.js reads import.meta.env
 * and would throw outside Vite, e.g. under node:test).
 *
 * @typedef {string} UUID          A clients.id / row id (uuid). Not format-validated here.
 * @typedef {string} ISODate       'YYYY-MM-DD'.
 * @typedef {('MONTHLY'|'QUARTERLY'|'HALF_YEARLY'|'ANNUAL'|'EVENT_BASED'|'ONE_TIME'|'AS_REQUIRED')} Frequency
 * @typedef {('Draft'|'Approved'|'Inactive')} Status
 *
 * @typedef {Object} CatalogueRow
 * @property {string} code
 * @property {string} label
 * @property {boolean} requires_registration
 * @property {Frequency|null} default_frequency
 * @property {number} sort_order
 * @property {boolean} is_active
 *
 * @typedef {Object} ApplicabilityRow
 * @property {UUID} id
 * @property {UUID} client_id
 * @property {string} service_code
 * @property {ISODate|null} effective_from
 * @property {ISODate|null} effective_to
 * @property {Frequency|null} frequency
 * @property {UUID|null} linked_registration_id
 * @property {UUID|null} owner_team_id
 * @property {Status} status
 * @property {UUID|null} approved_by
 * @property {string|null} approved_at
 * @property {string|null} notes
 * @property {number} row_version
 * @property {string} created_at
 * @property {UUID|null} created_by
 * @property {string} updated_at
 * @property {UUID|null} updated_by
 *
 * @typedef {Object} TeamMemberRow
 * @property {UUID} id
 * @property {string} name
 * @property {string|null} portal_role
 * @property {boolean} is_active
 *
 * @typedef {Object} RegistrationRow
 * @property {UUID} id
 * @property {UUID} client_id
 * @property {string} reg_type
 * @property {string|null} reg_number
 * @property {string|null} status
 * @property {boolean} [is_active]
 *
 * @typedef {{ data: any, error: (null | { message: string }) }} SupabaseResult
 */

// --- column projections (verified: 0021 for service tables; 0015 / clientMasterReads
//     for client_registrations — reg_type / reg_number are the real column names). ---
const CATALOGUE_COLS =
  'code, label, requires_registration, default_frequency, sort_order, is_active'
const APPLICABILITY_COLS =
  'id, client_id, service_code, effective_from, effective_to, frequency, ' +
  'linked_registration_id, owner_team_id, status, approved_by, approved_at, notes, ' +
  'row_version, created_at, created_by, updated_at, updated_by'
const TEAM_COLS = 'id, name, portal_role, is_active'
const REGISTRATION_COLS = 'id, client_id, reg_type, reg_number, status, is_active'

const ASC = { ascending: true }

/** True when a required id value carries non-blank text. */
function hasText(v) {
  return v != null && String(v).trim() !== ''
}

/** Consistent fail-closed shape (no query issued). */
function missingClientId() {
  return { data: null, error: { message: 'CLIENT_ID_REQUIRED' } }
}

/**
 * Lazy shared-client accessor. Only invoked by production functions; never by tests.
 * The dynamic import defers evaluation of src/supabase.js (and its env read) until a
 * real production call needs it.
 * @returns {Promise<any>}
 */
let _clientPromise
async function sharedClient() {
  if (!_clientPromise) _clientPromise = import('../supabase.js').then((m) => m.supabase)
  return _clientPromise
}

// ── factories (pure; injected client) ─────────────────────────────────────

/** @param {any} client */
export function readServiceCatalogueWith(client) {
  return () =>
    client
      .from('service_catalogue')
      .select(CATALOGUE_COLS)
      .eq('is_active', true)
      .order('sort_order', ASC)
      .order('code', ASC)
}

/** @param {any} client */
export function readClientServiceApplicabilityWith(client) {
  /** @param {UUID} clientId */
  return (clientId) => {
    if (!hasText(clientId)) return missingClientId()
    return client
      .from('client_service_applicability')
      .select(APPLICABILITY_COLS)
      .eq('client_id', clientId)
      .order('service_code', ASC)
      .order('created_at', ASC)
      .order('id', ASC)
  }
}

/** @param {any} client */
export function readActiveTeamMembersWith(client) {
  return () =>
    client
      .from('team')
      .select(TEAM_COLS)
      .eq('is_active', true)
      .order('name', ASC)
      .order('id', ASC)
}

/** @param {any} client */
export function readClientRegistrationsWith(client) {
  /** @param {UUID} clientId */
  return (clientId) => {
    if (!hasText(clientId)) return missingClientId()
    return client
      .from('client_registrations')
      .select(REGISTRATION_COLS)
      .eq('client_id', clientId)
      .order('reg_type', ASC)
      .order('id', ASC)
  }
}

// ── production functions (bound to the shared client) ──────────────────────

/** @returns {Promise<SupabaseResult>} active catalogue (11 codes), ordered. */
export async function readServiceCatalogue() {
  return readServiceCatalogueWith(await sharedClient())()
}

/** @param {UUID} clientId @returns {Promise<SupabaseResult>} */
export async function readClientServiceApplicability(clientId) {
  if (!hasText(clientId)) return missingClientId()
  return readClientServiceApplicabilityWith(await sharedClient())(clientId)
}

/** @returns {Promise<SupabaseResult>} active team members (owner dropdown). */
export async function readActiveTeamMembers() {
  return readActiveTeamMembersWith(await sharedClient())()
}

/** @param {UUID} clientId @returns {Promise<SupabaseResult>} same-client registrations. */
export async function readClientRegistrations(clientId) {
  if (!hasText(clientId)) return missingClientId()
  return readClientRegistrationsWith(await sharedClient())(clientId)
}
