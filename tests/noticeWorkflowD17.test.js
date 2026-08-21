/**
 * D17 — Notice workflow closure (deadlines / assignment / evidence / closure). node:test.
 *
 * Pure tests for the notice-workflow helpers (noticeWorkflow.js) — which reuse the SHARED
 * compliance status truth — plus OD-5 static guards proving the write UI is role-gated, writes
 * only existing notice_tracker columns, closes via the canonical terminal status, links evidence
 * through the governed document flow (requirement_ref_type='notice'), keeps notice status
 * separate, and uses no new schema / RPC / service-role / external AI.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import {
  NOTICE_AUTHORITIES, NOTICE_WORKFLOW_STAGES, NOTICE_STATUS_OPTIONS, CLOSED_NOTICE_STATUSES,
  noticeDueDate, isNoticeClosed, isNoticeOverdue, validateNotice,
  buildNoticeInsertPayload, buildNoticeUpdatePayload, buildNoticeClosurePayload,
  summariseNotices, noticeEvidenceRequirement,
} from '../src/lib/noticeWorkflow.js'
import { CLOSED_COMPLIANCE_ENUM_STATUSES } from '../src/lib/compliance.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const COMP = read('src/components/Compliance.jsx') // raw
const MODAL = strip(read('src/components/NoticeManageModal.jsx'))
const READS = strip(read('src/services/client360Reads.js'))
const TODAY = '2026-08-20'

// ── enum option sets are exactly the DB labels; terminal set is the shared one ──
test('D17-enums: authorities/stages/status are valid DB labels; terminal = shared set', () => {
  assert.ok(NOTICE_AUTHORITIES.includes('Income Tax') && NOTICE_AUTHORITIES.includes('GST') && NOTICE_AUTHORITIES.includes('Other'))
  assert.deepEqual(NOTICE_WORKFLOW_STAGES, ['Assigned', 'In Progress', 'Prepared', 'Reviewed', 'Partner Approved', 'Filed'])
  for (const s of NOTICE_STATUS_OPTIONS) assert.ok(typeof s === 'string')
  assert.ok(NOTICE_STATUS_OPTIONS.includes('Closed') && NOTICE_STATUS_OPTIONS.includes('Filed'))
  assert.deepEqual(CLOSED_NOTICE_STATUSES, CLOSED_COMPLIANCE_ENUM_STATUSES) // no notice-specific terminal rule
})

// ── deadline / overdue / closed (reuse shared truth) ─────────────────────────
test('D17-deadline: due date precedence individual → extended → response', () => {
  assert.equal(noticeDueDate({ response_due_date: '2026-09-01', extended_due_date: '2026-09-10', individual_due_date: '2026-09-20' }), '2026-09-20')
  assert.equal(noticeDueDate({ response_due_date: '2026-09-01', extended_due_date: '2026-09-10' }), '2026-09-10')
  assert.equal(noticeDueDate({ response_due_date: '2026-09-01' }), '2026-09-01')
  assert.equal(noticeDueDate({}), null)
})
test('D17-overdue: overdue only when past AND not closed; missing date safe; closed never overdue', () => {
  assert.equal(isNoticeOverdue({ response_due_date: '2026-08-01', status: 'In Progress' }, TODAY), true)  // past + open
  assert.equal(isNoticeOverdue({ response_due_date: '2026-12-01', status: 'In Progress' }, TODAY), false) // future
  assert.equal(isNoticeOverdue({ response_due_date: '2026-08-01', status: 'Closed' }, TODAY), false)      // closed
  assert.equal(isNoticeOverdue({ status: 'In Progress' }, TODAY), false)                                  // no date → not fabricated
  assert.equal(isNoticeClosed('Closed'), true)
  assert.equal(isNoticeClosed('Filed'), true)
  assert.equal(isNoticeClosed('In Progress'), false)
})

// ── validation ───────────────────────────────────────────────────────────────
test('D17-validate: authority + type required; demand numeric; blanks otherwise allowed', () => {
  assert.equal(validateNotice({ authority: 'GST', notice_type: 'GSTR-3A' }).ok, true)
  assert.equal(validateNotice({ authority: '', notice_type: 'x' }).ok, false)
  assert.equal(validateNotice({ authority: 'GST', notice_type: '' }).ok, false)
  assert.equal(validateNotice({ authority: 'GST', notice_type: 'x', demand_raised: 'abc' }).ok, false)
  assert.equal(validateNotice({ authority: 'GST', notice_type: 'x', demand_raised: '50000' }).ok, true)
})

// ── insert / update / close payloads (existing columns only) ─────────────────
test('D17-insert: payload has client_id, default status, assigned_date; blanks → null', () => {
  const p = buildNoticeInsertPayload({ authority: 'Income Tax', notice_type: 'Sec 143(2)', assigned_to: 'tm-1', section: '' }, 'client-uuid', '2026-08-20T10:00:00Z')
  assert.equal(p.client_id, 'client-uuid')
  assert.equal(p.authority, 'Income Tax')
  assert.equal(p.status, 'Assigned')        // assignee present → default Assigned
  assert.equal(p.assigned_date, '2026-08-20T10:00:00Z')
  assert.equal(p.section, null)             // blank → null
  assert.equal(buildNoticeInsertPayload({ authority: 'GST', notice_type: 'x' }, 'c', 'iso').status, 'Not Started') // unassigned default
})
test('D17-update: updated_at stamped; assigned_date refreshed only when assignee changes', () => {
  const changed = buildNoticeUpdatePayload({ authority: 'GST', notice_type: 'x', assigned_to: 'tm-2' }, 'tm-1', 'iso-now')
  assert.equal(changed.updated_at, 'iso-now')
  assert.equal(changed.assigned_date, 'iso-now')
  const same = buildNoticeUpdatePayload({ authority: 'GST', notice_type: 'x', assigned_to: 'tm-1' }, 'tm-1', 'iso-now')
  assert.equal(same.assigned_date, undefined) // unchanged assignee → not restamped
})
test('D17-close: closure payload = canonical terminal status + reply_filed (no fabricated field)', () => {
  const p = buildNoticeClosurePayload({ status: 'Closed', replyFiledDate: '2026-08-20', remarks: 'Filed reply' }, 'iso')
  assert.equal(p.status, 'Closed')
  assert.equal(p.reply_filed, true)
  assert.equal(p.reply_filed_date, '2026-08-20')
  assert.equal(p.remarks, 'Filed reply')
  assert.equal(buildNoticeClosurePayload({ status: 'BOGUS' }, 'iso').status, 'Closed') // invalid → safe default
})

// ── counts (open / overdue / dueSoon / closed) — shared truth ────────────────
test('D17-counts: open/overdue/dueSoon/closed; closed excluded; reply_filed excluded from open', () => {
  const rows = [
    { response_due_date: '2026-08-01', status: 'In Progress' },                 // overdue open
    { response_due_date: '2026-08-24', status: 'In Progress' },                 // due soon (within 7d of 08-20)
    { response_due_date: '2026-12-01', status: 'In Progress' },                 // open, not soon
    { response_due_date: '2026-08-01', status: 'Closed' },                      // closed
    { response_due_date: '2026-08-01', status: 'In Progress', reply_filed: true }, // reply filed → not open
  ]
  const s = summariseNotices(rows, TODAY)
  assert.equal(s.total, 5)
  assert.equal(s.closed, 1)
  assert.equal(s.overdue, 1)
  assert.equal(s.dueSoon, 1)
  assert.equal(s.open, 3)   // three non-terminal, reply-not-filed
})

// ── evidence requirement → governed document flow ───────────────────────────
test('D17-evidence: requirement uses refType notice + notice id (governed document_link)', () => {
  const req = noticeEvidenceRequirement({ id: 'n1', authority: 'GST', notice_type: 'GSTR-3A', fy_label: '2025-26', linked_compliance_period: 'Apr-2026' }, { client_id: 'YA-002', name: 'ABC' })
  assert.equal(req.refType, 'notice')
  assert.equal(req.refId, 'n1')
  assert.equal(req.clientId, 'YA-002')
  assert.equal(req.docType, 'Notice')
})

// ── static wiring guards ─────────────────────────────────────────────────────
test('D17-rbac: notice writes gated (Admin/Manager, fail-closed); Add + Manage present', () => {
  assert.match(COMP, /const canManage = user\?\.is_active !== false && isAdminOrManagerRole\(user\)/)
  assert.match(COMP, /＋ Add Notice/)
  assert.match(COMP, /setManageNotice\(r\)/)                 // per-row Manage
  assert.match(COMP, /canManage && <td/)                     // Action column gated
})
test('D17-writes: modal writes existing notice_tracker columns via insert/update; no RPC/service-role', () => {
  assert.match(MODAL, /from '\.\.\/lib\/noticeWorkflow'/)
  assert.match(MODAL, /insert\(buildNoticeInsertPayload/)
  assert.match(MODAL, /update\(buildNoticeUpdatePayload/)
  assert.match(MODAL, /buildNoticeClosurePayload/)           // closure path
  assert.match(MODAL, /from\('notice_tracker'\)/)            // writes to the existing table
  assert.doesNotMatch(MODAL, /service_role|SUPABASE_SERVICE|\.rpc\(|functions\.invoke|claude|mistral|openai/i)
})
test('D17-evidence-wiring: evidence via ManageDocumentsDrawer (governed), not a new store', () => {
  assert.match(COMP, /<ManageDocumentsDrawer requirement=\{manageReq\}/)
  assert.match(MODAL, /noticeEvidenceRequirement/)
})
test('D17-shared-truth: notice overdue/closed reuse compliance.js (no new logic)', () => {
  assert.match(strip(read('src/lib/noticeWorkflow.js')), /from '\.\/compliance(\.js)?'/)
  assert.match(strip(read('src/lib/noticeWorkflow.js')), /complianceDateMeta|isComplianceClosed/)
})
test('D17-same-source: NoticeTab and Client360 both read notice_tracker (no parallel copy)', () => {
  assert.match(COMP, /from\('notice_tracker'\)\.select/)
  assert.match(READS, /notice_tracker/)
})
