/**
 * YAV2 Core Operational Workflow Closure — regression tests. node:test — `npm test`.
 *
 * Two kinds, matching project convention OD-5 (no jsdom/RTL — no DB shape invented):
 *   1. Pure-logic unit tests over src/helpers.js (task status/date correctness).
 *   2. Static source guards that lock in the write-path / resilience corrections.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getDueMeta, fmtDate, todayLocal, isMyTask,
  isTaskClosed, isTaskCompleted, CLOSED_TASK_STATUSES, COMPLETED_TASK_STATUSES,
} from '../src/helpers.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

// ── 1. Task status vocabulary (count correctness) ──────────────────────────────
test('CO-1: closed/completed status sets include "Filed / Completed"', () => {
  assert.ok(CLOSED_TASK_STATUSES.includes('Filed / Completed'))
  assert.ok(COMPLETED_TASK_STATUSES.includes('Filed / Completed'))
  assert.ok(COMPLETED_TASK_STATUSES.includes('Done'))
  assert.ok(!COMPLETED_TASK_STATUSES.includes('Cancelled')) // cancelled is closed, not completed
  assert.equal(isTaskClosed('Cancelled'), true)
  assert.equal(isTaskCompleted('Cancelled'), false)
  assert.equal(isTaskCompleted('Filed / Completed'), true)
  assert.equal(isTaskClosed('Pending'), false)
})

test('CO-2: a "Filed / Completed" task is NEVER flagged overdue, even with a past due date', () => {
  const past = '2000-01-01'
  assert.equal(getDueMeta(past, 'Filed / Completed').badge, '')   // was wrongly "🔴 Overdue"
  assert.equal(getDueMeta(past, 'Done').badge, '')
  assert.equal(getDueMeta(past, 'Cancelled').badge, '')
  // a genuinely open task with a past due date IS overdue
  assert.equal(getDueMeta(past, 'Pending').badge, '🔴 Overdue')
})

test('CO-3: getDueMeta never crashes on an invalid due date', () => {
  const r = getDueMeta('not-a-date', 'Pending')
  assert.equal(r.badge, '')
  assert.equal(r.daysLeft, null)
})

// ── 2. Date helpers ────────────────────────────────────────────────────────────
test('CO-4: fmtDate returns an em dash for null/invalid, never literal "Invalid Date"', () => {
  assert.equal(fmtDate(null), '—')
  assert.equal(fmtDate(''), '—')
  assert.equal(fmtDate('garbage'), '—')
  assert.notEqual(fmtDate('2026-08-02'), 'Invalid Date')
  assert.match(fmtDate('2026-08-02'), /2026/)
})

test('CO-5: todayLocal is a local YYYY-MM-DD (not the UTC toISOString date)', () => {
  const t = todayLocal()
  assert.match(t, /^\d{4}-\d{2}-\d{2}$/)
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  assert.equal(t, `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`)
})

// ── 3. Task ownership gate ─────────────────────────────────────────────────────
test('CO-6: isMyTask is false for an unassigned/blank task (no startsWith("") leak)', () => {
  const u = { name: 'Asha Rao' }
  assert.equal(isMyTask({ assigned_to: '' }, u), false)
  assert.equal(isMyTask({ assigned_to: null }, u), false)
  assert.equal(isMyTask({ assigned_to: '  ' }, u), false)
  assert.equal(isMyTask({ assigned_to: 'Asha Rao' }, u), true)
  assert.equal(isMyTask({ assigned_to: 'Asha' }, u), true)
  assert.equal(isMyTask({ assigned_to: 'Bhavna' }, u), false)
  assert.equal(isMyTask({ assigned_to: 'Asha' }, null), false) // null user must not throw
})

// ── 4. Static source guards — write-path false-success / double-submit ─────────
const addTask = stripComments(read('../src/components/AddTaskModal.jsx'))
const followUp = stripComments(read('../src/components/FollowUpModal.jsx'))
const history = stripComments(read('../src/components/HistoryModal.jsx'))
const markFiled = stripComments(read('../src/components/MarkFiledModal.jsx'))
const dashboard = stripComments(read('../src/components/Dashboard.jsx'))
const tasks = stripComments(read('../src/components/Tasks.jsx'))
const clients = stripComments(read('../src/components/Clients.jsx'))
const app = stripComments(read('../src/App.jsx'))
const mainJs = stripComments(read('../src/main.jsx'))
const workDocs = stripComments(read('../src/components/WorkDocuments.jsx'))

test('CO-7: AddTaskModal guards double-submit, checks the insert error, and only saves on success', () => {
  assert.match(addTask, /if \(saving\) return/)
  assert.match(addTask, /const \{ error \} = await supabase\.from\('tasks'\)\.insert/)
  assert.match(addTask, /if \(error\) \{/)
  assert.match(addTask, /key=\{c\.client_id\}/)          // dropdown key was undefined c.id
  assert.match(addTask, /Math\.random\(\)/)              // stronger task_id
})

test('CO-8: FollowUpModal checks insert AND task-update errors before onSaved; validates the date', () => {
  assert.match(followUp, /if \(saving\) return/)
  assert.match(followUp, /const \{ error: insErr \}/)
  assert.match(followUp, /const \{ error: updErr \}/)
  assert.match(followUp, /min=\{todayLocal\(\)\}/)
  assert.match(followUp, /if \(error\).*setLoadError|setLoadError\(true\)/)
})

test('CO-9: HistoryModal surfaces a load error instead of a false empty state', () => {
  assert.match(history, /setError\(true\)/)
  assert.match(history, /error \?/)
})

test('CO-10: MarkFiledModal guards double-submit + missing client, and does not show clean success on doc failure', () => {
  assert.match(markFiled, /if \(uploading\) return/)
  assert.match(markFiled, /!client \|\| !client\.client_id/)
  assert.match(markFiled, /d1\.error \|\| d2\.error/)
})

// ── 5. Static source guards — count correctness wired into the UI ──────────────
test('CO-11: Dashboard + Tasks use the shared closed/completed sets and local today', () => {
  assert.match(dashboard, /isTaskClosed/)
  assert.match(dashboard, /isTaskCompleted/)
  assert.match(dashboard, /todayLocal\(\)/)
  assert.match(tasks, /isTaskClosed\(t\.status\)/)
  assert.match(tasks, /todayLocal\(\)/)
})

// ── 6. Static source guards — shell resilience + recovery path ─────────────────
test('CO-12: App bootstrap cannot hang (finally + catch) and root is wrapped in ErrorBoundary', () => {
  assert.match(app, /finally \{/)
  assert.match(app, /\.catch\(/)
  assert.match(mainJs, /<ErrorBoundary>/)
  assert.match(mainJs, /import ErrorBoundary/)
})

test('CO-13: Clients renders the ResyncButton so the onboarding "Re-sync Compliance" path exists', () => {
  assert.match(clients, /<ResyncButton client=\{c\} \/>/)
})

test('CO-14: WorkDocuments removes the orphaned storage object when the record insert fails', () => {
  assert.match(workDocs, /if \(insErr\) \{/)
  assert.match(workDocs, /storage\.from\(BUCKET\)\.remove\(\[path\]\)/)
})
