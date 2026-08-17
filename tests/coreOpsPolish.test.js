/**
 * Core Operations Bento — PR #70 polish package. node:test.
 * Clear-search / Clear-filters / result count (Clients + Tasks), Add Task modal
 * client-picker states, and the grouped detail drawer. Static source/CSS guards.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const CSS = read('src/styles/bento.css')
const CVIEW = strip(read('src/bento/modules/ClientsBentoView.jsx'))
const CLIENTS = strip(read('src/components/Clients.jsx'))
const TVIEW = strip(read('src/bento/modules/TasksBentoView.jsx'))
const TASKS = strip(read('src/components/Tasks.jsx'))
const PRIM = strip(read('src/bento/modules/primitives.jsx'))
const MODAL = read('src/components/AddTaskModal.jsx')

// ── Clients: clear-search, clear-filters, result count ───────────────────────
test('P-C1: Clients clear-search resets search + page', () => {
  assert.match(CLIENTS, /onClearSearch=\{\(\) => \{ setSearch\(''\); setPage\(1\) \}\}/)
  assert.match(CVIEW, /className="b-cl-search-clear" onClick=\{onClearSearch\}/)
})
test('P-C2: Clients clear-filters resets search + status + page', () => {
  assert.match(CLIENTS, /onClearFilters=\{\(\) => \{ setSearch\(''\); setFStatus\('All'\); setPage\(1\) \}\}/)
  assert.match(CVIEW, /className="b-cl-clear-filters" onClick=\{onClearFilters\}/)
  assert.match(CVIEW, /const filtersActive = searchActive \|\| fStatus !== 'All'/)
})
test('P-C3: Clients shows an active-filter result summary', () => {
  assert.match(CVIEW, /className="b-cl-resultbar"/)
  assert.match(CVIEW, /result' : 'results'/)
})

// ── Tasks: clear-search, clear-filters, result count, filter-aware empty ─────
test('P-T1: Tasks clear-search + clear-filters wired', () => {
  assert.match(TASKS, /onClearSearch=\{\(\) => \{ setSearch\(''\); setPage\(1\) \}\}/)
  assert.match(TASKS, /onClearFilters=\{\(\) => \{ clearFilters\(\); setPage\(1\) \}\}/)
  assert.match(TVIEW, /onClear=\{onClearSearch\}/)
  assert.match(TVIEW, /className="b-cl-clear-filters" onClick=\{onClearFilters\}/)
})
test('P-T2: Tasks shows result count and a filter-aware empty state', () => {
  assert.match(TVIEW, /const filtersActive = searchActive \|\| fStatus !== 'All' \|\| fAssign !== 'All'/)
  assert.match(TVIEW, /className="b-cl-resultbar"/)
  assert.match(TVIEW, /filtersActive \? 'No tasks match your current filters/)
})
test('P-T3: shared SearchBox primitive supports an optional clear button', () => {
  assert.match(PRIM, /onClear && value && \(/)
  assert.match(PRIM, /className="b-mod-search-clear"/)
})

// ── Add Task modal: client picker states ─────────────────────────────────────
test('P-M1: inline result rows show name + type/mobile/code', () => {
  assert.match(MODAL, /className="atm-result-nm">\{c\.name\}/)
  assert.match(MODAL, /c\.client_type, c\.mobile && '\+91 ' \+ c\.mobile, c\.client_id/)
})
test('P-M2: RIGHT column hint before a client is selected (two-column always)', () => {
  assert.match(MODAL, /className="atm-hint">Select a client to add task details/)
})
test('P-M3: modal logic preserved (insert path, client loading, validation, Escape)', () => {
  assert.match(MODAL, /useEscapeKey\(onClose\)/)
  assert.match(MODAL, /await supabase\.from\('clients'\)\.select\('client_id,name,client_type,mobile'\)/)
  assert.match(MODAL, /await supabase\.from\('tasks'\)\.insert/)
  assert.match(MODAL, /setSaveError\('Task name is required\.'\)/)
})

// ── Detail drawer: grouped sections, chips, read-only, mobile ────────────────
test('P-D1: drawer renders grouped sections', () => {
  for (const s of ['Task Details', 'Assignment', 'Schedule', 'Checklist', 'Follow-up']) {
    assert.match(TASKS, new RegExp(`b-drawer-section">${s}`))
  }
})
test('P-D2: status + priority chips render near the title (headerExtra)', () => {
  assert.match(TASKS, /headerExtra=\{[\s\S]*?b-drawer-chips[\s\S]*?<StatusChip/)
  assert.match(PRIM, /\{headerExtra\}/)
})
test('P-D3: non-owned read-only notice; owned actions gated (hasActions)', () => {
  assert.match(TASKS, /const hasActions = \(!closed && mine\) \|\| \(!done && t\.status !== 'Cancelled' && mine\)/)
  assert.match(TASKS, /footer=\{hasActions \? \(/)
  assert.match(TASKS, /!mine &&[\s\S]*?b-drawer-readonly/)
})
test('P-D4: drawer is full-width on mobile', () => {
  assert.match(CSS, /@media \(max-width: 760px\)[\s\S]*\.b-drawer \{ width: 100%/)
})
test('P-D5: drawer closes on Escape, scrim and close control (primitive)', () => {
  assert.match(PRIM, /e\.key === 'Escape'/)
  assert.match(PRIM, /className="b-drawer-scrim" onClick=\{onClose\}/)
  assert.match(PRIM, /className="b-drawer-close" onClick=\{onClose\} aria-label="Close details"/)
})
