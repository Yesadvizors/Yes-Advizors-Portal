/**
 * Core Operations Bento package — regression guards. node:test.
 * Covers the delivered increment: Global header search, shared primitives,
 * Tasks Bento redesign and the Task detail drawer. Static source guards
 * (project convention OD-5) plus behavioural checks of the summary math via the
 * shared, unchanged helpers.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { isTaskClosed, isTaskCompleted, getDueMeta } from '../src/helpers.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const SHELL = strip(read('src/bento/BentoShell.jsx'))
const APP = strip(read('src/bento/BentoApp.jsx'))
const CLIENTS = strip(read('src/components/Clients.jsx'))
const TASKS = strip(read('src/components/Tasks.jsx'))
const TVIEW = strip(read('src/bento/modules/TasksBentoView.jsx'))
const PRIM = strip(read('src/bento/modules/primitives.jsx'))

// ── 1. GLOBAL HEADER SEARCH ──────────────────────────────────────────────────
test('GS-1: header search is a controlled input that submits on Enter (form submit)', () => {
  assert.match(SHELL, /value=\{headerSearch\}/)
  assert.match(SHELL, /onChange=\{e => onHeaderSearchChange\?\.\(e\.target\.value\)\}/)
  assert.match(SHELL, /onSubmit=\{e => \{ e\.preventDefault\(\); onHeaderSearchSubmit\?\.\(\) \}\}/)
  assert.match(SHELL, /aria-label="Search clients"/)
})
test('GS-2: submit trims, ignores blank input, creates a unique request and navigates', () => {
  assert.match(APP, /const term = headerSearch\.trim\(\)/)
  assert.match(APP, /if \(!term\) return/)
  assert.match(APP, /searchReqId\.current \+= 1/)
  assert.match(APP, /setPendingSearch\(\{ id: searchReqId\.current, term \}\)/)
  assert.match(APP, /navigate\('clients'\)/)
})
test('GS-3: the request is handed to Clients only, via pendingSearch + onSearchConsumed', () => {
  assert.match(APP, /tab === 'clients' \? \{ pendingSearch, onSearchConsumed: clearPendingSearch \}/)
})
test('GS-4: Clients consumes the request by unique id, then acknowledges it', () => {
  assert.match(CLIENTS, /pendingSearch = null/)
  assert.match(CLIENTS, /if \(pendingSearch && pendingSearch\.id !== consumedSearchId\.current\)/)
  assert.match(CLIENTS, /consumedSearchId\.current = pendingSearch\.id/)
  assert.match(CLIENTS, /setSearch\(pendingSearch\.term\)/)
  assert.match(CLIENTS, /onSearchConsumed\?\.\(\)/)
})
test('GS-5: direct Clients-page search remains wired (no new global query)', () => {
  assert.match(CLIENTS, /onSearch=\{v => \{ setSearch\(v\); setPage\(1\) \}\}/)
  assert.doesNotMatch(APP, /supabase/i) // no new global search query in the app shell
})

// ── 2. TASKS BENTO + DETAIL DRAWER ───────────────────────────────────────────
test('TK-1: additive dual-skin; legacy Tasks skin retained', () => {
  assert.match(TASKS, /const bentoSkin = bento \?\? approvedBentoEnabled/)
  assert.match(TASKS, /\{bentoSkin \? \(/)
  assert.match(TASKS, /<TasksBentoView/)
  assert.match(TASKS, /Task Tracker/)
  assert.match(TASKS, /No tasks match your filters/)
})
test('TK-2: Bento view is presentational (no Supabase/writes/network)', () => {
  assert.doesNotMatch(TVIEW, /supabase/i)
  assert.doesNotMatch(TVIEW, /\.(insert|update|upsert|delete|rpc)\s*\(/)
  assert.doesNotMatch(TVIEW, /\bfetch\s*\(|XMLHttpRequest|WebSocket\s*\(/)
})
test('TK-3: row/title/chevron open the detail drawer; drawer closes via onClose', () => {
  assert.match(TVIEW, /const open = \(\) => onOpenTask\(t\)/)
  assert.match(TVIEW, /className="b-tk-row b-tk-grid" onClick=\{open\}/)
  assert.match(TASKS, /onOpenTask=\{setDrawerTask\}/)
  assert.match(TASKS, /<DetailDrawer open title=\{t\.task_name\}/)
  assert.match(TASKS, /onClose=\{\(\) => setDrawerTask\(null\)\}/)
})
test('TK-4: anyone may VIEW details; Follow-up & Mark done stay gated by isMyTask', () => {
  assert.match(TASKS, /const mine = isMyTask\(t, user\)/)
  assert.match(TASKS, /!closed && mine &&[\s\S]*?Add follow-up/)
  assert.match(TASKS, /mine &&[\s\S]*?Mark done/)
  assert.match(TASKS, /!mine &&[\s\S]*?Read-only view/)
})
test('TK-5: Bento row actions are gated by isMine', () => {
  assert.match(TVIEW, /const mine = isMine\(t\)/)
  assert.match(TVIEW, /!closed && mine &&[\s\S]*?onFollowUp\(t\)/)
  assert.match(TVIEW, /mine &&[\s\S]*?onMarkDone\(t\)/)
})
test('TK-6: checklist + follow-up behaviour preserved (existing panel reused, writes intact)', () => {
  assert.match(TASKS, /<ChecklistPanel task=\{t\} onUpdate=\{load\}/)
  assert.match(TASKS, /activateProps\(\(\) => !saving && toggle/) // unchanged checklist toggle
  assert.match(TASKS, /setFollowTask\(t\)/)                       // follow-up opens the existing modal
})
test('TK-7: markDone gate + search-trim (existing logic preserved)', () => {
  assert.match(TASKS, /if \(!isMyTask\(t, user\)\)/)
  assert.match(TASKS, /search\.trim\(\)\.toLowerCase\(\)/)
})

// ── 3. behavioural: summary/overdue/status via the shared, unchanged helpers ──
test('TK-8: overdue/open/completed counts use the shared status + due helpers', () => {
  const tasks = [
    { id: 1, status: 'Pending', due_date: '2000-01-01' },       // open + overdue
    { id: 2, status: 'In Progress', due_date: '2999-01-01' },   // open, not overdue
    { id: 3, status: 'Done', due_date: '2000-01-01' },          // completed (closed)
    { id: 4, status: 'Cancelled', due_date: '2000-01-01' },     // closed, not completed
  ]
  const open = tasks.filter(t => !isTaskClosed(t.status))
  assert.equal(open.length, 2)
  assert.equal(tasks.filter(t => isTaskCompleted(t.status)).length, 1)
  const overdue = open.filter(t => { const m = getDueMeta(t.due_date, t.status); return m && m.daysLeft != null && m.daysLeft < 0 })
  assert.equal(overdue.length, 1)
})

// ── 4. Detail drawer primitive ───────────────────────────────────────────────
test('DR-1: DetailDrawer closes on Escape and scrim click; presentational only', () => {
  assert.match(PRIM, /e\.key === 'Escape'/)
  assert.match(PRIM, /addEventListener\('keydown', onKey\)/)
  assert.match(PRIM, /className="b-drawer-scrim" onClick=\{onClose\}/)
  assert.match(PRIM, /role="dialog" aria-modal="true"/)
  assert.doesNotMatch(PRIM, /supabase/i)
})
