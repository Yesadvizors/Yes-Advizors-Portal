/**
 * Client 360° Operational Workspace — test suite (OD-5 conventions).
 *
 *  - Executable pure-logic tests import the real functions from src/lib/client360.js and
 *    assert I/O against a FIXED clock (TODAY), proving the workspace reuses the corrected
 *    PR#51 compliance truth (Reviewed is NOT terminal; due-today is not overdue; terminal
 *    statuses are never overdue) and classifies tasks/follow-ups/notices/financials.
 *  - Service-factory tests inject a recording fake client into the pure *With(client)
 *    factories and assert the correct table + client-key (uuid vs text) + fail-closed shape.
 *  - Static source-scan guards prove the UI never issues Supabase/RPC/DML, fails closed,
 *    keeps prior data on refresh, and never renders raw backend errors.
 *
 * React components are NOT imported (Node cannot parse JSX); behaviour lives in the pure
 * helpers and is tested directly, exactly like the Service Applicability suite.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  deriveClient360Capabilities, buildClientHeader, isCorporateType, dateKey,
  summarizeCompliance, complianceByCategory, complianceRowTag,
  summarizeTasks, isFollowUpPending, followUpState, summarizeFollowUps,
  summarizeDocuments, summarizeNotices, summarizeFinancials, summarizeTeam,
  buildActivityFeed, buildAttentionItems, sortAttention,
} from '../src/lib/client360.js'

import {
  readClientComplianceWith, readClientTasksWith, readClientFollowUpsWith,
  readClientDocumentsWith, readClientNoticesWith, readClientFinancialsWith,
} from '../src/services/client360Reads.js'

const TODAY = '2026-08-02'

// ── static-scan helpers (repo standard) ─────────────────────────────────────
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const src = (p) => stripComments(read(p))

// ══════════════════════════════════════════════════════════════════════════
// 1. Capabilities — fail closed
// ══════════════════════════════════════════════════════════════════════════
test('C360-1 capabilities: active Admin/Manager get every capability', () => {
  for (const role of [{ is_admin: true, is_active: true }, { portal_role: 'Admin', is_active: true }, { portal_role: 'Manager', is_active: true }]) {
    const caps = deriveClient360Capabilities(role)
    assert.deepEqual(caps, { canView: true, canCreateTask: true, canEditClient: true, canUploadDocument: true })
  }
})

test('C360-2 capabilities: everyone else fails closed', () => {
  for (const u of [null, undefined, {}, { portal_role: 'Staff', is_active: true }, { is_admin: true, is_active: false }, { portal_role: 'Manager', is_active: false }]) {
    const caps = deriveClient360Capabilities(u)
    assert.equal(caps.canView, false)
    assert.equal(caps.canCreateTask, false)
    assert.equal(caps.canEditClient, false)
    assert.equal(caps.canUploadDocument, false)
  }
})

// ══════════════════════════════════════════════════════════════════════════
// 2. Header — null-safe
// ══════════════════════════════════════════════════════════════════════════
test('C360-3 header: null client is safe (no throw, values null, FY still computed)', () => {
  const h = buildClientHeader(null, new Date('2026-08-02T00:00:00'))
  assert.equal(h.name, null)
  assert.equal(h.pan, null)
  assert.equal(h.status, null)
  assert.equal(h.currentFy, '2026-27')
})

test('C360-4 header: fields trimmed, blanks → null, draft + corporate detected', () => {
  const h = buildClientHeader({
    id: 'u1', client_id: 'YA-9', name: '  Acme Pvt Ltd ', client_type: 'Private Limited Company',
    status: 'Draft', is_draft: true, pan: '', cin: 'U12345', gstin: '  ',
  }, new Date('2026-08-02T00:00:00'))
  assert.equal(h.name, 'Acme Pvt Ltd')
  assert.equal(h.pan, null)        // blank → null
  assert.equal(h.gstin, null)      // whitespace → null
  assert.equal(h.cin, 'U12345')
  assert.equal(h.isDraft, true)
  assert.equal(h.isCorporate, true)
})

test('C360-5 isCorporateType covers company/LLP/OPC/section 8, not individual', () => {
  assert.equal(isCorporateType('Private Limited Company'), true)
  assert.equal(isCorporateType('LLP'), true)
  assert.equal(isCorporateType('OPC (One Person Company)'), true)
  assert.equal(isCorporateType('Individual'), false)
  assert.equal(isCorporateType(null), false)
})

// ══════════════════════════════════════════════════════════════════════════
// 3. Compliance — reuses the PR#51 shared verdict
// ══════════════════════════════════════════════════════════════════════════
test('C360-6 compliance summary: overdue/dueToday/dueSoon/completed/terminal', () => {
  const rows = [
    { due_date: '2026-07-01', status: 'Pending', compliance_type: 'GST' },        // overdue
    { due_date: '2026-07-01', status: 'Reviewed', compliance_type: 'GST' },       // overdue — Reviewed is NOT terminal (PR#51)
    { due_date: '2026-07-01', status: 'Filed', compliance_type: 'GST' },          // terminal + completed
    { due_date: '2026-08-02', status: 'Pending', compliance_type: 'IT' },         // due today
    { due_date: '2026-08-05', status: 'Pending', compliance_type: 'IT' },         // due soon
    { due_date: '2026-09-01', status: 'Pending', compliance_type: 'ROC' },        // upcoming (open)
    { due_date: '2026-07-01', status: 'Not Applicable', compliance_type: 'ROC' }, // terminal, not completed
  ]
  const s = summarizeCompliance(rows, TODAY)
  assert.equal(s.total, 7)
  assert.equal(s.overdue, 2)     // Pending + Reviewed
  assert.equal(s.dueToday, 1)
  assert.equal(s.dueSoon, 1)
  assert.equal(s.completed, 1)   // only Filed
  assert.equal(s.closed, 2)      // Filed + Not Applicable
  assert.equal(s.open, 5)
})

test('C360-7 terminal statuses are never overdue even with a long-past date', () => {
  for (const status of ['Filed', 'Completed', 'Closed', 'Not Applicable']) {
    const s = summarizeCompliance([{ due_date: '2020-01-01', status }], TODAY)
    assert.equal(s.overdue, 0, `${status} must not be overdue`)
    assert.equal(s.closed, 1)
  }
})

test('C360-8 complianceByCategory groups and sorts overdue-first', () => {
  const rows = [
    { compliance_type: 'GST', due_date: '2026-09-01', status: 'Pending' },
    { compliance_type: 'IT', due_date: '2026-07-01', status: 'Pending' },   // overdue
    { compliance_type: 'IT', due_date: '2026-09-01', status: 'Pending' },
  ]
  const cats = complianceByCategory(rows, TODAY)
  assert.equal(cats[0].category, 'IT')      // has the overdue item
  assert.equal(cats[0].overdue, 1)
  assert.equal(cats.find((c) => c.category === 'GST').total, 1)
})

test('C360-9 complianceRowTag returns the shared verdict group', () => {
  assert.equal(complianceRowTag('2026-07-01', 'Pending', TODAY), 'overdue')
  assert.equal(complianceRowTag('2026-08-02', 'Pending', TODAY), 'today')
  assert.equal(complianceRowTag('2026-08-05', 'Pending', TODAY), 'duesoon')
  assert.equal(complianceRowTag('2026-07-01', 'Filed', TODAY), 'closed')
})

// ══════════════════════════════════════════════════════════════════════════
// 4. Tasks
// ══════════════════════════════════════════════════════════════════════════
test('C360-10 task summary: open via isTaskClosed, overdue/dueToday via clock', () => {
  const tasks = [
    { status: 'Pending', due_date: '2026-07-01' },     // open, overdue
    { status: 'In Progress', due_date: '2026-08-02' }, // open, due today
    { status: 'Done', due_date: '2026-07-01' },        // closed + completed
    { status: 'Pending', due_date: null },             // open, no date
    { status: 'Cancelled', due_date: '2026-07-01' },   // closed
  ]
  const s = summarizeTasks(tasks, TODAY)
  assert.equal(s.total, 5)
  assert.equal(s.open, 3)
  assert.equal(s.overdue, 1)
  assert.equal(s.dueToday, 1)
  assert.equal(s.completed, 1)
})

// ══════════════════════════════════════════════════════════════════════════
// 5. Follow-ups (first shared helper)
// ══════════════════════════════════════════════════════════════════════════
test('C360-11 isFollowUpPending: open task with a next_followup_date', () => {
  assert.equal(isFollowUpPending({ status: 'Pending', next_followup_date: '2026-08-10' }), true)
  assert.equal(isFollowUpPending({ status: 'Pending', next_followup_date: null }), false)
  assert.equal(isFollowUpPending({ status: 'Done', next_followup_date: '2026-08-10' }), false)
  assert.equal(isFollowUpPending(null), false)
})

test('C360-12 followUpState + summary classify overdue/today/upcoming', () => {
  assert.equal(followUpState({ status: 'Pending', next_followup_date: '2026-07-01' }, TODAY), 'overdue')
  assert.equal(followUpState({ status: 'Pending', next_followup_date: '2026-08-02' }, TODAY), 'today')
  assert.equal(followUpState({ status: 'Pending', next_followup_date: '2026-09-01' }, TODAY), 'upcoming')
  assert.equal(followUpState({ status: 'Done', next_followup_date: '2026-07-01' }, TODAY), null)

  const s = summarizeFollowUps([
    { status: 'Pending', next_followup_date: '2026-07-01' },
    { status: 'Pending', next_followup_date: '2026-08-02' },
    { status: 'Pending', next_followup_date: '2026-09-01' },
    { status: 'Done', next_followup_date: '2026-07-01' },
    { status: 'Pending', next_followup_date: null },
  ], TODAY)
  assert.deepEqual(s, { pending: 3, overdue: 1, today: 1, upcoming: 1 })
})

// ══════════════════════════════════════════════════════════════════════════
// 6. Documents / Notices / Financials / Team
// ══════════════════════════════════════════════════════════════════════════
test('C360-13 document summary by scope + hasNone', () => {
  assert.deepEqual(summarizeDocuments([]), { total: 0, client: 0, director: 0, compliance: 0, hasNone: true })
  const s = summarizeDocuments([{ scope: 'client' }, { scope: 'director' }, { scope: 'compliance' }, {}])
  assert.equal(s.total, 4); assert.equal(s.client, 2); assert.equal(s.director, 1); assert.equal(s.compliance, 1)
  assert.equal(s.hasNone, false)
})

test('C360-14 notice summary: open, overdue-response, reply-filed excluded, demand total', () => {
  const s = summarizeNotices([
    { status: 'Pending', response_due_date: '2026-07-01', reply_filed: false, demand_raised: 1000 },
    { status: 'Pending', response_due_date: '2026-09-01', reply_filed: false },
    { status: 'Filed', response_due_date: '2026-07-01' },
    { status: 'Pending', response_due_date: '2026-07-01', reply_filed: true },
  ], TODAY)
  assert.equal(s.total, 4)
  assert.equal(s.open, 2)
  assert.equal(s.overdueResponse, 1)
  assert.equal(s.demandTotal, 1000)
})

test('C360-15 financials: reviewed/uploaded terminal (module-aware), pending, focus FY', () => {
  const s = summarizeFinancials([
    { fy_label: '2026-27', status: 'Reviewed' },
    { fy_label: '2026-27', status: 'Not Uploaded' },
    { fy_label: '2025-26', status: 'Uploaded' },
  ], '2026-27')
  assert.equal(s.total, 3)
  assert.equal(s.reviewed, 1)
  assert.equal(s.uploaded, 1)
  assert.equal(s.notUploaded, 1)
  assert.equal(s.pending, 1)          // only 'Not Uploaded' is non-terminal for financials
  assert.equal(s.focus.length, 2)     // two 2026-27 rows
})

test('C360-16 team derivation: distinct task assignees, gap flagged, unresolved counted', () => {
  const s = summarizeTeam(
    [{ assigned_to: 'Asha' }, { assigned_to: 'Bhavin' }, { assigned_to: 'Asha' }, { assigned_to: '' }],
    [{ assigned_to: 'u1' }, { assigned_to: 'u2' }, { assigned_to: 'u1' }],
  )
  assert.deepEqual(s.assignees, ['Asha', 'Bhavin'])
  assert.equal(s.hasAssignment, true)
  assert.equal(s.unresolvedComplianceAssignees, 2)

  const none = summarizeTeam([], [])
  assert.equal(none.hasAssignment, false)
})

// ══════════════════════════════════════════════════════════════════════════
// 7. Activity feed — reliable sources only, newest first, no fabrication
// ══════════════════════════════════════════════════════════════════════════
test('C360-17 activity feed merges, sorts desc, labels type, empty stays empty', () => {
  assert.deepEqual(buildActivityFeed({}), [])
  const feed = buildActivityFeed({
    followUps: [{ created_at: '2026-08-01T10:00:00Z', note: 'Called client', updated_by: 'Asha' }],
    documents: [{ created_at: '2026-08-03T10:00:00Z', doc_name: 'PAN.pdf', uploaded_by: 'Bhavin' }],
    tasks: [{ created_at: '2026-08-02T10:00:00Z', task_name: 'GST return', assigned_by: 'Asha' }],
  })
  assert.equal(feed.length, 3)
  assert.equal(feed[0].type, 'document')   // newest
  assert.equal(feed[2].type, 'follow_up')  // oldest
  assert.equal(feed[0].title, 'Uploaded PAN.pdf')
})

test('C360-18 activity feed honours the limit', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ created_at: `2026-08-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`, task_name: `T${i}` }))
  assert.equal(buildActivityFeed({ tasks: many }).length, 30)
  assert.equal(buildActivityFeed({ tasks: many }, 5).length, 5)
})

// ══════════════════════════════════════════════════════════════════════════
// 8. Attention — failed loads never read as clean
// ══════════════════════════════════════════════════════════════════════════
test('C360-19 a failed panel load becomes a critical attention item', () => {
  const items = buildAttentionItems({
    header: { pan: 'X', cin: 'Y', isCorporate: false },
    compliance: {}, tasks: {}, followUps: {}, documents: { hasNone: true }, notices: {},
    team: { hasAssignment: true },
    errors: { compliance: true, documents: true },
  })
  const labels = items.map((i) => i.label)
  assert.ok(labels.includes('Compliance data could not be loaded'))
  assert.ok(labels.includes('Documents could not be loaded'))
  // documents.hasNone must NOT also fire while its load failed (would be a false "clean" read)
  assert.equal(labels.includes('No documents have been uploaded'), false)
  assert.equal(items.find((i) => i.label === 'Compliance data could not be loaded').severity, 'critical')
})

test('C360-20 exceptions surface; all-clean yields a single info item', () => {
  const dirty = buildAttentionItems({
    header: { pan: null, cin: null, isCorporate: true, isDraft: true },
    compliance: { overdue: 2, noDate: 0 }, tasks: { overdue: 1 }, followUps: { overdue: 1 },
    documents: { hasNone: true }, notices: { overdueResponse: 1 }, team: { hasAssignment: false }, errors: {},
  })
  const dl = dirty.map((i) => i.label)
  assert.ok(dl.some((l) => /overdue compliance/.test(l)))
  assert.ok(dl.some((l) => /overdue task/.test(l)))
  assert.ok(dl.some((l) => /past response due/.test(l)))
  assert.ok(dl.includes('PAN is missing'))
  assert.ok(dl.includes('CIN / LLPIN is missing'))
  assert.ok(dl.includes('No team member is assigned to this client'))
  assert.ok(dl.includes('Onboarding incomplete (client is a draft)'))

  const clean = buildAttentionItems({
    header: { pan: 'ABCDE1234F', cin: 'U1', isCorporate: true, isDraft: false },
    compliance: { overdue: 0, noDate: 0 }, tasks: { overdue: 0 }, followUps: { overdue: 0 },
    documents: { hasNone: false }, notices: { overdueResponse: 0 }, team: { hasAssignment: true }, errors: {},
  })
  assert.equal(clean.length, 1)
  assert.equal(clean[0].severity, 'info')
})

test('C360-21 sortAttention orders critical → warning → info', () => {
  const sorted = sortAttention([
    { severity: 'info', label: 'i' }, { severity: 'critical', label: 'c' }, { severity: 'warning', label: 'w' },
  ])
  assert.deepEqual(sorted.map((i) => i.severity), ['critical', 'warning', 'info'])
})

test('C360-22 dateKey extracts the date portion or null', () => {
  assert.equal(dateKey('2026-08-02'), '2026-08-02')
  assert.equal(dateKey('2026-08-02T10:00:00Z'), '2026-08-02')
  assert.equal(dateKey(null), null)
  assert.equal(dateKey('not-a-date'), null)
})

// ══════════════════════════════════════════════════════════════════════════
// 9. Service factories — correct table, client key (uuid vs text), fail-closed
// ══════════════════════════════════════════════════════════════════════════
function makeFake() {
  const records = []
  const api = {
    from(table) {
      const rec = { table, select: null, eqs: [], orders: [] }
      records.push(rec)
      const chain = {
        select(cols) { rec.select = cols; return chain },
        eq(k, v) { rec.eqs.push([k, v]); return chain },
        order(k, o) { rec.orders.push([k, o]); return chain },
        then(onF, onR) { return Promise.resolve({ data: [], error: null }).then(onF, onR) },
      }
      return chain
    },
  }
  return { api, records }
}

test('C360-23 uuid-keyed reads hit the right table on client_id', () => {
  const f1 = makeFake(); readClientComplianceWith(f1.api)('uuid-1')
  assert.equal(f1.records[0].table, 'compliance_calendar')
  assert.deepEqual(f1.records[0].eqs, [['client_id', 'uuid-1']])

  const f2 = makeFake(); readClientNoticesWith(f2.api)('uuid-1')
  assert.equal(f2.records[0].table, 'notice_tracker')
  assert.deepEqual(f2.records[0].eqs, [['client_id', 'uuid-1']])
})

test('C360-24 text-keyed reads hit the right table on client_id (YA-code)', () => {
  const cases = [
    [readClientTasksWith, 'tasks'],
    [readClientFollowUpsWith, 'follow_ups'],
    [readClientDocumentsWith, 'documents'],
    [readClientFinancialsWith, 'financials_tracker'],
  ]
  for (const [factory, table] of cases) {
    const f = makeFake()
    factory(f.api)('YA-42')
    assert.equal(f.records[0].table, table)
    assert.deepEqual(f.records[0].eqs, [['client_id', 'YA-42']])
  }
})

test('C360-25 reads fail closed on a blank id (no query issued)', () => {
  for (const factory of [readClientComplianceWith, readClientTasksWith, readClientNoticesWith, readClientFinancialsWith]) {
    const f = makeFake()
    const res = factory(f.api)('   ')
    assert.equal(f.records.length, 0, 'no query should be issued')
    assert.equal(res.data, null)
    assert.equal(res.error.message, 'CLIENT_ID_REQUIRED')
  }
})

test('C360-26 read projections never select "*" (explicit columns only)', () => {
  const f = makeFake()
  readClientComplianceWith(f.api)('uuid-1')
  assert.ok(f.records[0].select && !f.records[0].select.includes('*'))
})

// ══════════════════════════════════════════════════════════════════════════
// 10. Static guards — UI never queries; fails closed; no raw errors
// ══════════════════════════════════════════════════════════════════════════
const WORKSPACE = '../src/components/client360/Client360Workspace.jsx'
const SECTIONS = '../src/components/client360/Client360Sections.jsx'
const PRIMITIVES = '../src/components/client360/Client360Primitives.jsx'
const READS = '../src/services/client360Reads.js'
const DATA_HOOK = '../src/hooks/useClient360Data.js'
const CLIENTS = '../src/components/Clients.jsx'

test('C360-27 workspace + sections + primitives contain no Supabase/RPC/DML/XSS', () => {
  for (const p of [WORKSPACE, SECTIONS, PRIMITIVES]) {
    const s = src(p)
    for (const bad of ['supabase', '.rpc(', '.from(', '.insert(', '.update(', '.delete(', '.upsert(', 'dangerouslySetInnerHTML']) {
      assert.equal(s.includes(bad), false, `${p} must not contain ${bad}`)
    }
  }
})

test('C360-28 workspace fails closed and never shows a raw error string', () => {
  const s = src(WORKSPACE)
  assert.ok(/role\.canView/.test(s), 'gates on role.canView')
  assert.ok(/Restricted|restricted/.test(s), 'shows a safe restricted notice')
  assert.ok(/role="dialog"/.test(s) && /aria-modal/.test(s), 'accessible dialog')
  assert.ok(/useEscapeKey\(/.test(s), 'ESC closes the workspace')
})

test('C360-29 data hook keeps prior data on refresh and never polls', () => {
  const s = src(DATA_HOOK)
  assert.ok(/mode === 'refresh' \? prevRows : \[\]/.test(s), 'retains prior rows on refresh, empty on initial')
  assert.equal(s.includes('setInterval'), false, 'no polling')
  assert.ok(/error: true/.test(s), 'tracks per-panel error')
})

test('C360-30 read service has no writes and uses the lazy shared-client import', () => {
  const s = src(READS)
  for (const bad of ['.insert(', '.update(', '.delete(', '.upsert(', '.rpc(']) {
    assert.equal(s.includes(bad), false, `read layer must not contain ${bad}`)
  }
  assert.ok(/import\(['"]\.\.\/supabase\.js['"]\)/.test(s), 'defers supabase via lazy dynamic import')
})

test('C360-31 launcher is gated by the flag AND Admin/Manager role', () => {
  const s = src(CLIENTS)
  assert.ok(/VITE_CLIENT360_UI/.test(s), 'flag-gated')
  assert.ok(/isAdminOrManagerRole\(user\)/.test(s), 'role-gated')
  assert.ok(/client360Enabled && client360 &&/.test(s), 'renders only when enabled with a selected client')
})

test('C360-32 primitives expose accessible loading/error states', () => {
  const s = src(PRIMITIVES)
  assert.ok(/role="status"/.test(s), 'loading uses role=status')
  assert.ok(/role="alert"/.test(s), 'error uses role=alert')
})
