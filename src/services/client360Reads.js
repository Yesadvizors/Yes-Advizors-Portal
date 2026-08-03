/**
 * Client 360° — READ service layer.
 *
 * READ-ONLY. No INSERT/UPDATE/DELETE/UPSERT and no .rpc() anywhere in this module —
 * the workspace never mutates through this path (writes reuse existing modals/RPCs).
 *
 * Dual-key discipline (verified against migrations 0003/0004): the client-master/legacy
 * split means different sources key the client differently, and getting this wrong
 * returns another client's data or nothing:
 *
 *   compliance_calendar.client_id  → clients.id      (uuid)
 *   notice_tracker.client_id       → clients.id      (uuid)
 *   tasks.client_id                → clients.client_id (text YA-code)
 *   follow_ups.client_id           → clients.client_id (text YA-code)
 *   documents.client_id            → clients.client_id (text YA-code)
 *   financials_tracker.client_id   → clients.client_id (text YA-code)
 *
 * So uuid-keyed reads take `clientUuid` and text-keyed reads take `clientCode`.
 *
 * Testability / no import side effects: each read has a pure `*With(client)` factory
 * (unit-tested with an injected fake client) plus a thin production function bound to the
 * shared client via a LAZY dynamic import — importing this module evaluates no env and
 * constructs no client, so it is safe under node:test (mirrors serviceApplicabilityReads).
 */

// ── column projections (explicit; verified against the CREATE TABLE statements) ──
const CALENDAR_COLS =
  'id, client_id, compliance_type, compliance_name, fy_label, period, due_date, status, ' +
  'assigned_to, is_overdue, is_due_soon, days_to_due'
const TASK_COLS =
  'id, task_id, task_name, client_id, client_name, assigned_to, assigned_by, due_date, ' +
  'priority, status, next_followup_date, next_action, latest_update, created_at, work_type, completed_on'
const FOLLOWUP_COLS =
  'id, followup_id, task_id, client_id, client_name, updated_by, note, next_action, ' +
  'next_followup_date, status_at_time, created_at'
const DOCUMENT_COLS =
  'id, client_id, doc_type, doc_name, scope, director_name, uploaded_by, fy_label, created_at'
const NOTICE_COLS =
  'id, client_id, fy_label, authority, notice_type, section, notice_date, response_due_date, ' +
  'extended_due_date, individual_due_date, reply_filed, reply_filed_date, status, demand_raised, ' +
  'assigned_to, created_at'
const FINANCIALS_COLS =
  'id, client_id, fy_label, doc_type, status, extraction_status, updated_at, created_at'

const ASC = { ascending: true }
const DESC = { ascending: false }

function hasText(v) { return v != null && String(v).trim() !== '' }

/** Consistent fail-closed shape (no query issued) when the required key is missing. */
function missingClientId() {
  return { data: null, error: { message: 'CLIENT_ID_REQUIRED' } }
}

let _clientPromise
async function sharedClient() {
  if (!_clientPromise) _clientPromise = import('../supabase.js').then((m) => m.supabase)
  return _clientPromise
}

// ── factories (pure; injected client) ─────────────────────────────────────

/** compliance_calendar — keyed on clients.id (uuid). */
export function readClientComplianceWith(client) {
  return (clientUuid) => {
    if (!hasText(clientUuid)) return missingClientId()
    return client
      .from('compliance_calendar')
      .select(CALENDAR_COLS)
      .eq('client_id', clientUuid)
      .order('due_date', ASC)
      .order('id', ASC)
  }
}

/** tasks — keyed on clients.client_id (text YA-code). */
export function readClientTasksWith(client) {
  return (clientCode) => {
    if (!hasText(clientCode)) return missingClientId()
    return client
      .from('tasks')
      .select(TASK_COLS)
      .eq('client_id', clientCode)
      .order('created_at', DESC)
      .order('id', ASC)
  }
}

/** follow_ups — keyed on clients.client_id (text YA-code). */
export function readClientFollowUpsWith(client) {
  return (clientCode) => {
    if (!hasText(clientCode)) return missingClientId()
    return client
      .from('follow_ups')
      .select(FOLLOWUP_COLS)
      .eq('client_id', clientCode)
      .order('created_at', DESC)
      .order('id', ASC)
  }
}

/** documents — keyed on clients.client_id (text YA-code). */
export function readClientDocumentsWith(client) {
  return (clientCode) => {
    if (!hasText(clientCode)) return missingClientId()
    return client
      .from('documents')
      .select(DOCUMENT_COLS)
      .eq('client_id', clientCode)
      .order('created_at', DESC)
      .order('id', ASC)
  }
}

/** notice_tracker — keyed on clients.id (uuid). */
export function readClientNoticesWith(client) {
  return (clientUuid) => {
    if (!hasText(clientUuid)) return missingClientId()
    return client
      .from('notice_tracker')
      .select(NOTICE_COLS)
      .eq('client_id', clientUuid)
      .order('notice_date', DESC)
      .order('id', ASC)
  }
}

/** financials_tracker — keyed on clients.client_id (text YA-code). */
export function readClientFinancialsWith(client) {
  return (clientCode) => {
    if (!hasText(clientCode)) return missingClientId()
    return client
      .from('financials_tracker')
      .select(FINANCIALS_COLS)
      .eq('client_id', clientCode)
      .order('fy_label', DESC)
      .order('id', ASC)
  }
}

// ── production functions (bound to the shared client) ──────────────────────

export async function readClientCompliance(clientUuid) {
  if (!hasText(clientUuid)) return missingClientId()
  return readClientComplianceWith(await sharedClient())(clientUuid)
}
export async function readClientTasks(clientCode) {
  if (!hasText(clientCode)) return missingClientId()
  return readClientTasksWith(await sharedClient())(clientCode)
}
export async function readClientFollowUps(clientCode) {
  if (!hasText(clientCode)) return missingClientId()
  return readClientFollowUpsWith(await sharedClient())(clientCode)
}
export async function readClientDocuments(clientCode) {
  if (!hasText(clientCode)) return missingClientId()
  return readClientDocumentsWith(await sharedClient())(clientCode)
}
export async function readClientNotices(clientUuid) {
  if (!hasText(clientUuid)) return missingClientId()
  return readClientNoticesWith(await sharedClient())(clientUuid)
}
export async function readClientFinancials(clientCode) {
  if (!hasText(clientCode)) return missingClientId()
  return readClientFinancialsWith(await sharedClient())(clientCode)
}
