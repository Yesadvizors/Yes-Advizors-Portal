/**
 * Client 360° Operational Workspace — PURE logic (no React, no Supabase, no I/O).
 *
 * Every function here takes already-fetched rows (arrays/objects) plus an optional
 * injected `today` (local YYYY-MM-DD) and returns plain data. This keeps the whole
 * classification layer deterministic and unit-testable under node:test with a fixed
 * clock, and — critically — it REUSES the corrected shared truth from PR #51 rather
 * than re-deriving overdue / due-today / terminal:
 *
 *   - compliance ageing  → complianceDateMeta / isComplianceClosed / isComplianceCompleted
 *                          (src/lib/compliance.js, the single PR#51 verdict)
 *   - task open/closed    → isTaskClosed / isTaskCompleted (src/helpers.js)
 *   - the clock           → todayLocal() (src/helpers.js) — never toISOString()
 *   - financial year      → currentFy / startFyFromDate (src/lib/financialYear.js)
 *   - role                → isAdminOrManagerRole (src/lib/clientMaster.js)
 *
 * The ONLY new semantic introduced here is the follow-up classifier — the repo has no
 * shared follow-up helper today (Tasks.jsx inlines the predicate over the parent task's
 * next_followup_date). We lift exactly that predicate into a shared, tested helper so the
 * workspace and Tasks agree, adding only an explicit "task must still be open" guard.
 */

import { todayLocal, isTaskClosed, isTaskCompleted } from '../helpers.js'
import { complianceDateMeta, isComplianceClosed, isComplianceCompleted } from './compliance.js'
import { isAdminOrManagerRole } from './clientMaster.js'
import { currentFy, startFyFromDate } from './financialYear.js'

// ── small local date helpers (string comparison on the date portion, IST-safe) ──

/** The YYYY-MM-DD date portion of a value, or null. Mirrors how compliance compares. */
export function dateKey(value) {
  if (value == null) return null
  const s = String(value).trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? m[0] : null
}

function nonBlank(v) { return v != null && String(v).trim() !== '' }

// ── capabilities ──────────────────────────────────────────────────────────

/**
 * Who may open and act inside the workspace. Fail-closed: anything that is not a
 * confirmed active Admin/Manager gets no capability. Mirrors the Client Master /
 * Service Applicability gate (Admin and Manager are equivalent — decision OD-1).
 *
 * The workspace is read-first; write capabilities gate only the quick actions that
 * have a real, completable repository flow behind them.
 *
 * @param {object|null|undefined} user  the `team` row threaded through the app
 * @returns {{canView:boolean, canCreateTask:boolean, canEditClient:boolean, canUploadDocument:boolean}}
 */
export function deriveClient360Capabilities(user) {
  const active = !!user && user.is_active !== false
  const allowed = active && isAdminOrManagerRole(user)
  return {
    canView: allowed,
    canCreateTask: allowed,
    canEditClient: allowed,
    canUploadDocument: allowed,
  }
}

// ── header ────────────────────────────────────────────────────────────────

/**
 * Null-safe header projection from the legacy `clients` row that the Clients list
 * already loads. Never throws on missing fields; absent values become null so the UI
 * renders a dash rather than "undefined". Financial year is COMPUTED (not stored):
 * `currentFy` is the firm-wide reporting FY, `clientStartFy` the client's first FY
 * from incorporation. Relationship-manager / assigned-team are intentionally absent —
 * no such column exists on the client record (see buildAttentionItems + docs).
 *
 * @param {object|null} client  a row from public.clients
 * @param {Date} [now]          injectable clock for FY (tests)
 */
export function buildClientHeader(client, now) {
  const c = client || {}
  const clean = (v) => (nonBlank(v) ? String(v).trim() : null)
  const type = clean(c.client_type)
  let clientStartFy = null
  try {
    clientStartFy = c.date_of_incorporation ? startFyFromDate(c.date_of_incorporation) : null
  } catch { clientStartFy = null }
  return {
    id: c.id || null,
    code: clean(c.client_id),
    name: clean(c.name),
    entityType: type,
    status: clean(c.status) || (client ? 'Active' : null),
    isDraft: c.is_draft === true || clean(c.status) === 'Draft',
    quickOnboarded: c.quick_onboarded === true,
    pan: clean(c.pan),
    tan: clean(c.tan),
    cin: clean(c.cin),
    gstin: clean(c.gstin),
    gstRegisteredOn: clean(c.gst_registration_date),
    primaryContact: clean(c.contact_person),
    primaryContactDesignation: clean(c.contact_designation),
    email: clean(c.email),
    mobile: clean(c.mobile),
    incorporation: clean(c.date_of_incorporation),
    onboardedBy: clean(c.onboarded_by),
    createdAt: c.created_at || null,
    updatedAt: c.updated_at || null,
    currentFy: currentFy(now),
    clientStartFy,
    isCorporate: isCorporateType(type),
  }
}

/** Entity types that are expected to carry a CIN/LLPIN. */
export function isCorporateType(type) {
  if (!nonBlank(type)) return false
  const t = String(type).toLowerCase()
  return t.includes('company') || t.includes('llp') || t.includes('opc') || t.includes('section 8')
}

// ── compliance summary (reuses the PR#51 shared verdict per obligation) ─────

const EMPTY = () => ({ total: 0, overdue: 0, dueToday: 0, dueSoon: 0, open: 0, completed: 0, closed: 0, noDate: 0 })

/**
 * Classify the client's compliance_calendar rows via the shared PR#51 verdict.
 * We deliberately IGNORE the stored is_overdue/is_due_soon flags (which can be stale)
 * and recompute from (due_date, status) with complianceDateMeta — the same helper the
 * Compliance module's counts are locked to.
 *
 * @param {Array<object>} rows  compliance_calendar rows ({ due_date, status, ... })
 * @param {string} [today]      YYYY-MM-DD (injectable)
 */
export function summarizeCompliance(rows, today = todayLocal()) {
  const out = EMPTY()
  const list = Array.isArray(rows) ? rows : []
  for (const r of list) {
    if (!r) continue
    out.total += 1
    const meta = complianceDateMeta(r.due_date, r.status, today)
    if (meta.closed) out.closed += 1
    else out.open += 1
    if (isComplianceCompleted(r.status)) out.completed += 1
    if (meta.overdue) out.overdue += 1
    if (meta.dueToday) out.dueToday += 1
    if (meta.dueSoon) out.dueSoon += 1
    if (!meta.closed && !meta.hasDate) out.noDate += 1
  }
  return out
}

/** Group open (non-terminal) compliance rows by category with an ageing tag, newest-due first. */
export function complianceByCategory(rows, today = todayLocal()) {
  const map = new Map()
  for (const r of (Array.isArray(rows) ? rows : [])) {
    if (!r) continue
    const cat = nonBlank(r.compliance_type) ? String(r.compliance_type) : 'Other'
    if (!map.has(cat)) map.set(cat, { category: cat, total: 0, overdue: 0, open: 0 })
    const g = map.get(cat)
    g.total += 1
    const meta = complianceDateMeta(r.due_date, r.status, today)
    if (meta.overdue) g.overdue += 1
    if (!meta.closed) g.open += 1
  }
  return [...map.values()].sort((a, b) => b.overdue - a.overdue || b.open - a.open)
}

/** The ageing tag for a single compliance/notice-style row, for badges in the section list. */
export function complianceRowTag(dueDate, status, today = todayLocal(), moduleKey) {
  return complianceDateMeta(dueDate, status, today, 7, moduleKey).group
}

// ── tasks ───────────────────────────────────────────────────────────────

/**
 * Open/overdue/due-today task counts. Open/closed uses the shared isTaskClosed;
 * due-date ageing uses string comparison against the SAME clock (todayLocal) that
 * compliance uses, so the whole workspace shares one consistent notion of "today".
 */
export function summarizeTasks(tasks, today = todayLocal()) {
  const out = { total: 0, open: 0, overdue: 0, dueToday: 0, completed: 0 }
  for (const t of (Array.isArray(tasks) ? tasks : [])) {
    if (!t) continue
    out.total += 1
    const closed = isTaskClosed(t.status)
    if (isTaskCompleted(t.status)) out.completed += 1
    if (closed) continue
    out.open += 1
    const key = dateKey(t.due_date)
    if (key == null) continue
    if (key < today) out.overdue += 1
    else if (key === today) out.dueToday += 1
  }
  return out
}

// ── follow-ups (first shared helper; matches Tasks.jsx inline semantics) ────

/**
 * A "pending follow-up" is an OPEN task carrying a scheduled next_followup_date.
 * (Tasks.jsx treats "pending" as `next_followup_date` set; we additionally require
 * the task to be open so a closed task's leftover date is not counted.)
 */
export function isFollowUpPending(task) {
  if (!task || isTaskClosed(task.status)) return false
  return nonBlank(task.next_followup_date)
}

/** 'overdue' | 'today' | 'upcoming' for a pending follow-up, else null. */
export function followUpState(task, today = todayLocal()) {
  if (!isFollowUpPending(task)) return null
  const key = dateKey(task.next_followup_date)
  if (key == null) return 'upcoming'
  if (key < today) return 'overdue'
  if (key === today) return 'today'
  return 'upcoming'
}

export function summarizeFollowUps(tasks, today = todayLocal()) {
  const out = { pending: 0, overdue: 0, today: 0, upcoming: 0 }
  for (const t of (Array.isArray(tasks) ? tasks : [])) {
    const state = followUpState(t, today)
    if (!state) continue
    out.pending += 1
    out[state] += 1
  }
  return out
}

// ── documents ───────────────────────────────────────────────────────────

/**
 * Document counts by scope. The repo has NO required-document checklist, so the only
 * honest "missing" signal is zero documents (the same definition AdminHome uses for
 * "clients with no uploaded documents"). We surface that, and never invent an
 * expected-vs-uploaded checklist.
 */
export function summarizeDocuments(docs) {
  const out = { total: 0, client: 0, director: 0, compliance: 0, hasNone: true }
  for (const d of (Array.isArray(docs) ? docs : [])) {
    if (!d) continue
    out.total += 1
    if (d.scope === 'director') out.director += 1
    else if (d.scope === 'compliance') out.compliance += 1
    else out.client += 1
  }
  out.hasNone = out.total === 0
  return out
}

// ── notices ─────────────────────────────────────────────────────────────

/** Effective response date for a notice row (individual → extended → response_due). */
export function noticeDueDate(row) {
  if (!row) return null
  return row.individual_due_date || row.extended_due_date || row.response_due_date || null
}

/**
 * Open notices + those past their response due date. "Open" = not a terminal status
 * and not yet reply-filed. Overdue-response reuses the shared compliance verdict on
 * the effective response date.
 */
export function summarizeNotices(notices, today = todayLocal()) {
  const out = { total: 0, open: 0, overdueResponse: 0, demandTotal: 0 }
  for (const n of (Array.isArray(notices) ? notices : [])) {
    if (!n) continue
    out.total += 1
    const closed = isComplianceClosed(n.status)
    const open = !closed && n.reply_filed !== true
    if (open) {
      out.open += 1
      const meta = complianceDateMeta(noticeDueDate(n), n.status, today)
      if (meta.overdue) out.overdueResponse += 1
    }
    const demand = Number(n.demand_raised)
    if (Number.isFinite(demand)) out.demandTotal += demand
  }
  return out
}

// ── financials (module-aware terminal: Uploaded/Reviewed are done) ──────────

/**
 * Financial-review status = the verification state of an uploaded financial-statement /
 * ITR document (financials_tracker.status / extraction_status). Uses the module-aware
 * terminal set (moduleKey 'financials' → Uploaded/Reviewed count as done).
 *
 * @param {Array<object>} rows  financials_tracker rows
 * @param {string} [fy]         focus FY (defaults to current FY) — used for the headline
 */
export function summarizeFinancials(rows, fy = currentFy()) {
  const out = { total: 0, reviewed: 0, uploaded: 0, notUploaded: 0, pending: 0, focusFy: fy, focus: null }
  const list = Array.isArray(rows) ? rows : []
  for (const r of list) {
    if (!r) continue
    out.total += 1
    const status = r.status
    const reviewed = status === 'Reviewed' || r.extraction_status === 'reviewed'
    if (reviewed) out.reviewed += 1
    else if (status === 'Uploaded' || status === 'Extracted') out.uploaded += 1
    else if (status === 'Not Uploaded' || !nonBlank(status)) out.notUploaded += 1
    // "pending" = not terminal for the financials module
    if (!isComplianceClosed(status, 'financials')) out.pending += 1
  }
  out.focus = list.filter((r) => r && r.fy_label === fy)
  return out
}

// ── team / access (derived — no client↔team assignment exists in the repo) ──

/**
 * Derive who is working the client from reliable, client-scoped signals: distinct task
 * assignees (tasks.assigned_to is a display name). compliance_calendar.assigned_to is a
 * uuid with no client-side name resolution, so we only COUNT those (never fabricate a
 * name). hasAssignment is false when nothing links the client to any team member — the
 * genuine gap the "no team assignment" attention item reports.
 */
export function summarizeTeam(tasks, calendarRows) {
  const names = new Set()
  for (const t of (Array.isArray(tasks) ? tasks : [])) {
    if (t && nonBlank(t.assigned_to)) names.add(String(t.assigned_to).trim())
  }
  let complianceAssignees = 0
  const seenIds = new Set()
  for (const r of (Array.isArray(calendarRows) ? calendarRows : [])) {
    if (r && nonBlank(r.assigned_to) && !seenIds.has(r.assigned_to)) {
      seenIds.add(r.assigned_to); complianceAssignees += 1
    }
  }
  const assignees = [...names].sort()
  return {
    assignees,
    hasAssignment: assignees.length > 0,
    unresolvedComplianceAssignees: complianceAssignees,
  }
}

// ── recent activity (only reliably per-client-sourced events; no fabrication) ──

/**
 * Build a client-specific activity feed from repository-supported, per-client sources:
 *   - follow_ups  (a genuine per-client audit of task progress)
 *   - documents   (uploads)
 *   - tasks       (task creation)
 * The firm-wide audit_log RPC is admin-only and its general write path is deferred, so
 * it is NOT used here — that unified source is recorded as a backend dependency, not
 * faked. Events are returned newest-first; each carries an explicit type.
 *
 * @returns {Array<{ts:string,type:string,title:string,actor:(string|null)}>}
 */
export function buildActivityFeed({ followUps, documents, tasks } = {}, limit = 30) {
  const events = []
  for (const f of (Array.isArray(followUps) ? followUps : [])) {
    if (!f || !f.created_at) continue
    const detail = nonBlank(f.note) ? f.note : (nonBlank(f.next_action) ? f.next_action : 'Follow-up recorded')
    events.push({ ts: f.created_at, type: 'follow_up', title: String(detail), actor: f.updated_by || null })
  }
  for (const d of (Array.isArray(documents) ? documents : [])) {
    if (!d || !d.created_at) continue
    const name = nonBlank(d.doc_name) ? d.doc_name : (nonBlank(d.doc_type) ? d.doc_type : 'Document')
    events.push({ ts: d.created_at, type: 'document', title: `Uploaded ${name}`, actor: d.uploaded_by || null })
  }
  for (const t of (Array.isArray(tasks) ? tasks : [])) {
    if (!t || !t.created_at) continue
    const name = nonBlank(t.task_name) ? t.task_name : 'Task'
    events.push({ ts: t.created_at, type: 'task', title: `Task created: ${name}`, actor: t.assigned_by || null })
  }
  events.sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
  return typeof limit === 'number' && limit >= 0 ? events.slice(0, limit) : events
}

// ── attention-required panel ────────────────────────────────────────────

/**
 * Material operational exceptions, most-severe first. Crucially, a FAILED data load is
 * never silently treated as "clean": pass the per-panel error map and each failure
 * becomes a critical item pointing at that section. When every panel loaded and nothing
 * is wrong, a single reassuring info item is returned.
 *
 * @param {object} p
 * @param {object} p.header      buildClientHeader output
 * @param {object} p.compliance  summarizeCompliance output
 * @param {object} p.tasks       summarizeTasks output
 * @param {object} p.followUps   summarizeFollowUps output
 * @param {object} p.documents   summarizeDocuments output
 * @param {object} p.notices     summarizeNotices output
 * @param {object} p.team        summarizeTeam output
 * @param {object} [p.errors]    { compliance?, tasks?, followUps?, documents?, notices?, financials? } truthy = failed
 * @returns {Array<{id:string,severity:'critical'|'warning'|'info',label:string,target:(string|null)}>}
 */
export function buildAttentionItems(p = {}) {
  const { header = {}, compliance = EMPTY(), tasks = {}, followUps = {}, documents = {}, notices = {}, team = {}, errors = {} } = p
  const items = []
  const add = (severity, label, target) => items.push({ id: `${target || 'x'}:${label}`, severity, label, target: target || null })

  // Failed loads first — never masquerade as a clean result.
  const failLabel = {
    compliance: 'Compliance data could not be loaded', tasks: 'Tasks could not be loaded',
    followUps: 'Follow-ups could not be loaded', documents: 'Documents could not be loaded',
    notices: 'Notices could not be loaded', financials: 'Financials could not be loaded',
  }
  const failTarget = { compliance: 'compliance', tasks: 'tasks', followUps: 'followups', documents: 'documents', notices: 'notices', financials: 'financials' }
  for (const k of Object.keys(failLabel)) {
    if (errors && errors[k]) add('critical', failLabel[k], failTarget[k])
  }

  if (compliance.overdue > 0) add('critical', `${compliance.overdue} overdue compliance item${compliance.overdue > 1 ? 's' : ''}`, 'compliance')
  if (notices.overdueResponse > 0) add('critical', `${notices.overdueResponse} notice${notices.overdueResponse > 1 ? 's' : ''} past response due`, 'notices')
  if (tasks.overdue > 0) add('critical', `${tasks.overdue} overdue task${tasks.overdue > 1 ? 's' : ''}`, 'tasks')
  if (followUps.overdue > 0) add('warning', `${followUps.overdue} overdue follow-up${followUps.overdue > 1 ? 's' : ''}`, 'followups')
  if (compliance.noDate > 0) add('warning', `${compliance.noDate} compliance item${compliance.noDate > 1 ? 's' : ''} missing a due date`, 'compliance')
  if (header.isDraft) add('warning', 'Onboarding incomplete (client is a draft)', 'overview')
  if (!nonBlank(header.pan)) add('warning', 'PAN is missing', 'overview')
  if (header.isCorporate && !nonBlank(header.cin)) add('warning', 'CIN / LLPIN is missing', 'overview')
  if (team && team.hasAssignment === false) add('warning', 'No team member is assigned to this client', 'team')
  if (documents && documents.hasNone && !(errors && errors.documents)) add('warning', 'No documents have been uploaded', 'documents')

  if (items.length === 0) add('info', 'No items need attention right now', null)
  return items
}

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 }
/** Stable sort of attention items by severity (used by the UI). */
export function sortAttention(items) {
  return [...(items || [])].sort((a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3))
}
