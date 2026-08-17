/**
 * Approved Bento Dashboard — real-data model + adapter guards. node:test.
 * Pure unit tests of the deterministic view-model builders, plus static guards on
 * the read service and the authenticated-vs-demo separation.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import {
  buildDashboard, buildKpis, buildOperational, buildTeamWorkload, buildAttention,
  buildDueThisWeek, buildRecentActivity, daysUntil, utilisationTone, WORKLOAD_CAPACITY,
} from '../src/bento/data/dashboardModel.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (rel) => readFileSync(join(resolve(HERE, '..'), rel), 'utf8')
const kv = (kpis) => Object.fromEntries(kpis.map(k => [k.key, k.value]))

const TODAY = '2026-08-05'
const RAW = {
  tasks: [
    { id: 1, task_name: 'A', status: 'Pending', due_date: '2026-08-01', assigned_to: 'Alice Kumar' }, // open, overdue, not-started
    { id: 2, task_name: 'B', status: 'In Progress', due_date: '2026-08-05', assigned_to: 'Alice' },    // open, due-today, in-progress
    { id: 3, task_name: 'C', status: 'Done', due_date: '2026-07-01' },                                  // completed
    { id: 4, task_name: 'D', status: 'Filed / Completed', due_date: null },                             // completed
    { id: 5, task_name: 'E', status: 'Cancelled', due_date: '2026-08-10' },                             // cancelled (excluded)
    { id: 6, task_name: 'F', status: 'Waiting for Client', due_date: '2026-08-12', assigned_to: 'Bob Singh' }, // open, in-progress, d=7
    { id: 7, task_name: 'G', status: 'Under Review', due_date: '2026-08-20' },                          // open, in-progress, d=15
    { id: 8, task_name: 'H', status: 'Pending', due_date: '2026-08-06', next_followup_date: '2026-08-01', client_name: 'X Ltd' }, // open, due-tomorrow, follow overdue
  ],
  clients: [
    { client_id: 'a', status: 'Active', is_draft: false, is_test_client: false }, // active
    { client_id: 'b', status: 'Active', is_draft: true, is_test_client: false },  // draft
    { client_id: 'c', status: 'Active', is_draft: false, is_test_client: true },  // test
    { client_id: 'd', status: 'Inactive', is_draft: false, is_test_client: false },
  ],
  firm: [
    { category: 'GST', total: 30, completed: 22, overdue: 3, pending: 5, due_in_7_days: 2 },
    { category: 'Income Tax', total: 20, completed: 15, overdue: 1, pending: 0, due_in_7_days: 4 },
  ],
  team: [
    { id: 1, name: 'Alice Kumar', role: 'Manager' },
    { id: 2, name: 'Bob Singh', role: 'Associate' },
  ],
}

test('daysUntil: boundaries and invalid inputs', () => {
  assert.equal(daysUntil('2026-08-05', TODAY), 0)
  assert.equal(daysUntil('2026-08-04', TODAY), -1)
  assert.equal(daysUntil('2026-08-12', TODAY), 7)
  assert.equal(daysUntil(null, TODAY), null)
  assert.equal(daysUntil('not-a-date', TODAY), null)
})

test('KPIs computed from real rows — four primary cards (Part 3C)', () => {
  const kpis = buildKpis(RAW, TODAY)
  const v = kv(kpis)
  assert.deepEqual(kpis.map(k => k.key), ['clients', 'open', 'overdue', 'week'])
  assert.equal(v.clients, 1)     // only client a (excl. draft, test, inactive)
  assert.equal(v.open, 5)        // open (not Done/Filed/Cancelled)
  assert.equal(v.overdue, 1)     // only id1 (due < today); id8 is +1
  assert.equal(v.week, 3)        // open due within 0..7 days (id2 d0, id8 d1, id6 d7)
})

test('Operational: status classification excludes Cancelled from the denominator', () => {
  const op = buildOperational(RAW)
  const c = Object.fromEntries(op.statuses.map(s => [s.key, s.count]))
  assert.equal(c.done, 2)  // Done + Filed / Completed
  assert.equal(c.not, 2)   // Pending (id1, id8)
  assert.equal(c.prog, 3)  // In Progress + Waiting for Client + Under Review
  assert.equal(op.progress, Math.round(2 / 7 * 100)) // denom = 2+3+2 = 7 (Cancelled excluded)
  assert.deepEqual(op.topAreas.map(a => a.name), ['GST', 'Income Tax'])
  assert.equal(op.topAreas[0].count, 30)
})

test('Team workload: utilisation over capacity + tone + sort', () => {
  const t = buildTeamWorkload(RAW)
  const alice = t.find(m => m.name === 'Alice Kumar')
  const bob = t.find(m => m.name === 'Bob Singh')
  assert.equal(alice.open, 2)  // id1 + id2 (both open, assigned to Alice/first-name)
  assert.equal(alice.pct, Math.round(2 / WORKLOAD_CAPACITY * 100))
  assert.equal(bob.open, 1)
  assert.equal(t[0].pct >= t[1].pct, true) // sorted desc by utilisation
  assert.equal(alice.role, 'Manager')
})

test('utilisationTone thresholds', () => {
  assert.equal(utilisationTone(85), 'green-strong')
  assert.equal(utilisationTone(80), 'green-strong')
  assert.equal(utilisationTone(65), 'green')
  assert.equal(utilisationTone(50), 'amber')
  assert.equal(utilisationTone(49), 'blue')
})

test('Attention: real signals, capped at 4', () => {
  const a = buildAttention(RAW, TODAY)
  assert.equal(a.length, 4)
  assert.match(a[0].title, /1 task overdue/)
  assert.ok(a.some(x => /compliance item/.test(x.title)))
  assert.ok(a.some(x => /due today/.test(x.title)))
  assert.ok(a.some(x => /follow-up/.test(x.title)))
})

test('Due This Week: only open tasks with 0..7 days, sorted, correct chips', () => {
  const d = buildDueThisWeek(RAW, TODAY)
  assert.deepEqual(d.map(x => x.id), [2, 8, 6]) // d=0,1,7 ; excludes overdue id1 and d=15 id7
  assert.equal(d[0].chip, 'Due today')
  assert.equal(d[1].chip, 'Due tomorrow')
  assert.equal(d[2].chip, 'Due in 7 days')
})

test('Recent Activity: explicit empty (no fabricated source)', () => {
  assert.deepEqual(buildRecentActivity(), [])
})

test('Empty + partial inputs never throw and fail closed to zero/empty', () => {
  const empty = buildDashboard({ tasks: [], clients: [], firm: [], team: [] }, TODAY)
  assert.equal(kv(empty.kpis).open, 0)
  assert.equal(kv(empty.kpis).week, 0)
  assert.equal(empty.attention.length, 0)
  assert.equal(empty.team.length, 0)
  assert.equal(empty.dueThisWeek.length, 0)
  assert.equal(empty.operational.progress, 0)
  // partial: missing firm/clients must not throw
  const partial = buildDashboard({ tasks: RAW.tasks, clients: null, firm: null, team: RAW.team }, TODAY)
  assert.equal(kv(partial.kpis).clients, 0)
  assert.equal(kv(partial.kpis).overdue, 1)
  assert.deepEqual(partial.operational.topAreas, [])
})

// ── Adapter + wiring guards ─────────────────────────────────────────────────
test('read service is SELECT-only (no writes/rpc) and fails closed', () => {
  const src = read('src/bento/data/dashboardReads.js')
  assert.ok(!/\.(insert|update|upsert|delete|rpc)\s*\(/.test(src), 'no write/rpc operations')
  assert.match(src, /\.select\(/)
  assert.match(src, /throw new Error/, 'must fail closed on read error')
  assert.ok(!/service_role|SERVICE_ROLE/.test(src), 'must not use a privileged key')
})

test('authenticated data layer never imports demo/mock data', () => {
  for (const f of ['src/bento/data/dashboardModel.js', 'src/bento/data/dashboardReads.js', 'src/bento/useBentoDashboard.js']) {
    assert.ok(!/mock|MOCK_DASHBOARD|bentoMock/.test(read(f)), `data layer must not reference mock: ${f}`)
  }
})

test('no sample fallback in authenticated mode; demo data confined to the preview', () => {
  const bentoApp = read('src/bento/BentoApp.jsx')
  assert.match(bentoApp, /useBentoDashboard\(\{\s*enabled:\s*!demoData\s*\}\)/)
  assert.match(bentoApp, /demoData\s*\?\s*\{\s*state:\s*'ready'/)
  // The authenticated app path (App.jsx) must NOT pass demoData.
  const app = read('src/App.jsx')
  assert.ok(!/demoData/.test(app), 'App.jsx must not supply demo data')
  // Only the dev preview entry supplies demo data, and only via its ?live toggle:
  // default → mock design demo; ?live=1 → the REAL read path (null), never a mock fallback.
  const preview = read('src/bento/previewEntry.jsx')
  assert.match(preview, /const\s+live\s*=\s*params\.get\('live'\)\s*===\s*'1'/)
  assert.match(preview, /demoData=\{\s*live\s*\?\s*null\s*:\s*MOCK_DASHBOARD\s*\}/,
    'preview supplies demo data via the ?live toggle (null in live mode)')
  assert.ok(!/live\s*\?\s*MOCK_DASHBOARD/.test(preview),
    'preview ?live=1 must map to the real path (null) — never a mock fallback')
  // Mock dashboard data is confined to the standalone preview: no authenticated
  // composition file may reference it.
  for (const f of ['src/App.jsx', 'src/bento/BentoApp.jsx', 'src/bento/Dashboard.jsx']) {
    assert.ok(!/MOCK_DASHBOARD/.test(read(f)), `mock dashboard data must not reach authenticated file: ${f}`)
  }
})
