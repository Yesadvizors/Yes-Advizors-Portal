// D17 — Notice workflow (deadlines / assignment / evidence / closure) pure helpers.
//
// No React, no Supabase, no network, no external AI — importable by node:test. Drives the
// EXISTING notice_tracker workflow (add / assign / status / close) using ONLY existing columns
// and the SHARED compliance status truth (src/lib/compliance.js). No new DB schema, no new enum
// values (every status/stage/authority below is an existing DB enum label), no parallel model.

import { isComplianceClosed, complianceDateMeta, CLOSED_COMPLIANCE_ENUM_STATUSES } from './compliance.js'

// notice_authority_enum (exact DB labels)
export const NOTICE_AUTHORITIES = ['Income Tax', 'GST', 'TDS', 'ROC / MCA', 'PF', 'ESI', 'Labour Department', 'Other']

// workflow_stage_enum (exact DB labels)
export const NOTICE_WORKFLOW_STAGES = ['Assigned', 'In Progress', 'Prepared', 'Reviewed', 'Partner Approved', 'Filed']

// Curated subset of compliance_status_enum relevant to a notice lifecycle (all valid DB labels;
// nothing invented). 'Closed' / 'Filed' / 'Not Applicable' are terminal (shared truth).
export const NOTICE_STATUS_OPTIONS = [
  'Not Started', 'Assigned', 'In Progress', 'Documents Pending', 'Waiting for Client',
  'Prepared', 'Reviewed', 'Partner Approval Pending', 'Partner Approved', 'Filed', 'Closed', 'Not Applicable',
]

// The terminal set for notices IS the shared compliance terminal set — no notice-specific rule.
export const CLOSED_NOTICE_STATUSES = CLOSED_COMPLIANCE_ENUM_STATUSES

// Effective response-due date: individual → extended → response (matches the DB views + the
// document-readiness view's COALESCE). Notices have no standard_due_date.
export function noticeDueDate(row) {
  if (!row) return null
  return row.individual_due_date || row.extended_due_date || row.response_due_date || null
}

export function isNoticeClosed(status) { return isComplianceClosed(status) }

// Overdue = effective due date past AND not closed (shared complianceDateMeta — closed never
// overdue, due-today not overdue, missing date safe, timezone-safe string compare).
export function isNoticeOverdue(row, today) {
  return complianceDateMeta(noticeDueDate(row), row && row.status, today).overdue
}

// ── validation (blanks allowed except authority + type; demand numeric) ──────
export function validateNotice(form) {
  const errors = {}
  if (!form || !form.authority || !NOTICE_AUTHORITIES.includes(form.authority)) errors.authority = 'Select an authority'
  if (!form || !String(form.notice_type || '').trim()) errors.notice_type = 'Enter the notice type'
  if (form && form.status && !NOTICE_STATUS_OPTIONS.includes(form.status)) errors.status = 'Invalid status'
  if (form && form.workflow_stage && !NOTICE_WORKFLOW_STAGES.includes(form.workflow_stage)) errors.workflow_stage = 'Invalid stage'
  if (form && String(form.demand_raised ?? '').trim() !== '' && !Number.isFinite(num(form.demand_raised))) errors.demand_raised = 'Demand must be a number'
  return { ok: Object.keys(errors).length === 0, errors }
}

function num(v) { const s = String(v == null ? '' : v).replace(/[^0-9.\-]/g, ''); const n = Number(s); return s === '' ? null : (Number.isNaN(n) ? NaN : n) }
const orNull = (v) => (String(v == null ? '' : v).trim() === '' ? null : v)
const boolOrNull = (v) => (v === true || v === false ? v : null)

// Fields written to notice_tracker (existing columns only). Shared by insert/update builders.
function coreFields(form) {
  return {
    authority: form.authority,
    notice_type: orNull(form.notice_type),
    section: orNull(form.section),
    fy_label: orNull(form.fy_label),
    notice_date: orNull(form.notice_date),
    date_of_receipt: orNull(form.date_of_receipt),
    response_due_date: orNull(form.response_due_date),
    extended_due_date: orNull(form.extended_due_date),
    individual_due_date: orNull(form.individual_due_date),
    linked_compliance_period: orNull(form.linked_compliance_period),
    documents_required: orNull(form.documents_required),
    demand_raised: num(form.demand_raised),
    assigned_to: orNull(form.assigned_to),
    workflow_stage: orNull(form.workflow_stage),
    status: orNull(form.status),
    reply_prepared: boolOrNull(form.reply_prepared),
    reply_reviewed: boolOrNull(form.reply_reviewed),
    reply_filed: boolOrNull(form.reply_filed),
    reply_filed_date: orNull(form.reply_filed_date),
    acknowledgement_number: orNull(form.acknowledgement_number),
    remarks: orNull(form.remarks),
  }
}

// INSERT payload — requires the client uuid; stamps assigned_date when an assignee is set.
export function buildNoticeInsertPayload(form, clientUuid, nowIso) {
  const p = { ...coreFields(form), client_id: clientUuid }
  if (!p.status) p.status = p.assigned_to ? 'Assigned' : 'Not Started'
  if (p.assigned_to) p.assigned_date = nowIso
  return p
}

// UPDATE payload — only the editable fields; updated_at stamped. assigned_date refreshed when
// the assignee changes (caller passes prevAssignedTo).
export function buildNoticeUpdatePayload(form, prevAssignedTo, nowIso) {
  const p = { ...coreFields(form), updated_at: nowIso }
  if (p.assigned_to && p.assigned_to !== (prevAssignedTo || null)) p.assigned_date = nowIso
  return p
}

// Closure payload — canonical terminal status + reply-filed capture (existing fields only).
// Never fabricates a field that does not exist.
export function buildNoticeClosurePayload({ status = 'Closed', replyFiledDate, remarks } = {}, nowIso) {
  const s = CLOSED_NOTICE_STATUSES.includes(status) ? status : 'Closed'
  const p = { status: s, reply_filed: true, updated_at: nowIso }
  if (replyFiledDate) p.reply_filed_date = replyFiledDate
  if (orNull(remarks)) p.remarks = remarks
  return p
}

// Counts for cards — open / overdue / dueSoon / closed. Adds the dueSoon dimension notices
// previously lacked; open = non-terminal AND reply not filed (matches summarizeNotices). Pure.
export function summariseNotices(rows, today, soonDays = 7) {
  const list = Array.isArray(rows) ? rows : []
  let open = 0, overdue = 0, dueSoon = 0, closed = 0
  for (const n of list) {
    const meta = complianceDateMeta(noticeDueDate(n), n && n.status, today, soonDays)
    if (meta.closed) { closed++; continue }
    const isOpen = n && n.reply_filed !== true
    if (isOpen) {
      open++
      if (meta.overdue) overdue++
      else if (meta.dueSoon) dueSoon++
    }
  }
  return { total: list.length, open, overdue, dueSoon, closed }
}

// Manage-Documents requirement payload for notice evidence — reuses the governed document flow
// (document_link/replace with requirement_ref_type='notice'). No new file store.
export function noticeEvidenceRequirement(notice, client) {
  return {
    refType: 'notice',
    refId: notice && notice.id,
    clientId: client && client.client_id,
    clientName: client && client.name,
    fyLabel: (notice && notice.fy_label) || null,
    docType: 'Notice',
    requirementLabel: `${(notice && notice.authority) || 'Notice'} ${(notice && notice.notice_type) || ''}`.trim(),
    period: (notice && notice.linked_compliance_period) || null,
  }
}
