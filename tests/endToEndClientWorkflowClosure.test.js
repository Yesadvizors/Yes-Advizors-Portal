/**
 * YAV2 End-to-End Client Workflow & Data Consistency Closure — regression tests.
 * node:test — `npm test`. Convention OD-5: pure-logic + static source guards
 * (no jsdom/RTL). The theme is CROSS-MODULE consistency: the same source row must
 * classify the same way in every module by reusing the shared truth helpers.
 *
 * Reconciled onto current sync/integration (post PR #70). The static guards below
 * assert the CURRENT-architecture files (AdminHome, Team, client360, Client360Workspace)
 * single-source their task/lifecycle truth — the same business invariant PR #65 defined.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  pgStatusList, CLOSED_TASK_STATUSES, isTaskClosed, clientStatusLabel,
} from '../src/helpers.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

// ── pgStatusList (pure) ────────────────────────────────────────────────────────
test('E2E-p1: pgStatusList builds a quoted Postgres in-list and handles spaces/slashes', () => {
  assert.equal(pgStatusList(['Done', 'Cancelled']), '("Done","Cancelled")')
  assert.equal(pgStatusList(['Filed / Completed']), '("Filed / Completed")')
  assert.equal(pgStatusList([]), '()')
  assert.equal(pgStatusList(undefined), '()')
})

// ── Shared task-closed truth is the single source (consistency anchor) ─────────
test('E2E-p2: the shared task-closed set includes "Filed / Completed" and drives the server filter', () => {
  assert.ok(CLOSED_TASK_STATUSES.includes('Filed / Completed'))
  assert.equal(isTaskClosed('Filed / Completed'), true)
  const list = pgStatusList(CLOSED_TASK_STATUSES)
  assert.match(list, /"Done"/)
  assert.match(list, /"Cancelled"/)
  assert.match(list, /"Filed \/ Completed"/)   // the value the old AdminHome/Team filters dropped
})

// ── E2E-1 AdminHome derives its task filter from the shared set ────────────────
test('E2E-1: AdminHome open/overdue task filter is derived from CLOSED_TASK_STATUSES', () => {
  const code = stripComments(read('../src/components/AdminHome.jsx'))
  assert.match(code, /import \{ fmtDate, CLOSED_TASK_STATUSES, pgStatusList \} from '\.\.\/helpers'/)
  assert.match(code, /const DONE_TASK = pgStatusList\(CLOSED_TASK_STATUSES\)/)
  assert.doesNotMatch(code, /DONE_TASK = '\("Done","Cancelled"\)'/)   // hardcoded drifted set gone
})

// ── E2E-2 Team taskCount uses the shared isTaskClosed ──────────────────────────
test('E2E-2: Team taskCount uses the shared isTaskClosed (no inline Done/Cancelled set)', () => {
  const code = stripComments(read('../src/components/Team.jsx'))
  assert.match(code, /import \{ isTaskClosed \} from '\.\.\/helpers'/)
  assert.match(code, /!isTaskClosed\(t\.status\)/)
  assert.doesNotMatch(code, /t\.status !== 'Done' && t\.status !== 'Cancelled'/)
})

// ── E2E-3 Client 360 lifecycle label via clientStatusLabel ─────────────────────
test('E2E-3a: Client 360 buildClientHeader derives status via clientStatusLabel', () => {
  const code = stripComments(read('../src/lib/client360.js'))
  assert.match(code, /clientStatusLabel/)
  assert.match(code, /status: client \? clientStatusLabel\(c\.status\) : null/)
  assert.doesNotMatch(code, /clean\(c\.status\) \|\| \(client \? 'Active' : null\)/)
})
test('E2E-3b: Client 360 workspace no longer defaults a blank status to Active', () => {
  const code = stripComments(read('../src/components/client360/Client360Workspace.jsx'))
  assert.doesNotMatch(code, /header\.status \|\| 'Active'/)
})

// ── Lifecycle-label truth anchor (Client 360 now matches Clients) ──────────────
test('E2E-p3: clientStatusLabel maps blank -> Unknown (never Active), value -> value', () => {
  assert.equal(clientStatusLabel(null), 'Unknown')
  assert.equal(clientStatusLabel(''), 'Unknown')
  assert.notEqual(clientStatusLabel(null), 'Active')
  assert.equal(clientStatusLabel('Active'), 'Active')
  assert.equal(clientStatusLabel('Inactive'), 'Inactive')
})

// ── Behavioural closed/open truth (Section 10 F/G/H) — the same logic every module reuses ──
test('E2E-b1: Done/Cancelled/Filed-Completed are closed; Open/In Progress are open', () => {
  for (const s of ['Done', 'Cancelled', 'Filed / Completed']) assert.equal(isTaskClosed(s), true, `${s} must be closed`)
  for (const s of ['Open', 'In Progress', 'Pending', 'Waiting for Client']) assert.equal(isTaskClosed(s), false, `${s} must be open`)
})
test('E2E-b2: unknown/unexpected status fails safe — treated as OPEN (visible), never silently closed', () => {
  assert.equal(isTaskClosed('Frobnicated'), false)
  assert.equal(isTaskClosed(undefined), false)
  assert.equal(isTaskClosed(null), false)
})
test('E2E-b3: the shared closed-set count is 2 for {Open, In Progress, Filed / Completed}', () => {
  // The canonical example from the E2E-2 defect: 3 rows, one Filed / Completed → 2 open.
  const rows = ['Open', 'In Progress', 'Filed / Completed']
  assert.equal(rows.filter(s => !isTaskClosed(s)).length, 2)
})
