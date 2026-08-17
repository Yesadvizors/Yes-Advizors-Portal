/**
 * Core Operations Bento — PR #70 UAT corrections. node:test.
 * Covers the four fixed issues: Tasks table alignment, global→Clients search
 * clearing, Add Task modal layout, and non-owned/closed task rows opening the
 * detail drawer. Static source/CSS guards (OD-5) plus a behavioural model of the
 * global-search payload lifecycle.
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
const TVIEW = strip(read('src/bento/modules/TasksBentoView.jsx'))
const TASKS = strip(read('src/components/Tasks.jsx'))
const PRIM = strip(read('src/bento/modules/primitives.jsx'))
const APP = strip(read('src/bento/BentoApp.jsx'))
const CLIENTS = strip(read('src/components/Clients.jsx'))
const MODAL = read('src/components/AddTaskModal.jsx')

// ── ISSUE 1 — Tasks table alignment ──────────────────────────────────────────
test('L1: header row and task rows share the SAME grid class (b-tk-grid)', () => {
  assert.match(TVIEW, /className="b-tk-head b-tk-grid"/)
  assert.match(TVIEW, /className="b-tk-row b-tk-grid"/)
  assert.match(CSS, /\.b-tk-grid \{[^}]*grid-template-columns:/)
})
test('L2: rows have a consistent minimum height', () => {
  assert.match(CSS, /\.b-tk-row \{[^}]*min-height: 66px/)
})
test('L3: non-task cells are vertically centered (grid align-items: center)', () => {
  assert.match(CSS, /\.b-tk-grid \{[^}]*align-items: center/)
})
test('L4: progress + assignee content stays on one aligned line', () => {
  assert.match(CSS, /\.b-tk-c-actions \{[^}]*display: flex;[^}]*align-items: center/)
})
test('L5: chevron is right-aligned with consistent padding (own grid column)', () => {
  assert.match(CSS, /\.b-tk-chev \{[^}]*justify-content: flex-end/)
  assert.match(CSS, /\.b-tk-row \{[^}]*padding: 12px 20px/)
})
test('L6: mobile breakpoint collapses the grid and hides the header', () => {
  assert.match(CSS, /@media \(max-width: 760px\)[\s\S]*\.b-tk-grid \{ grid-template-columns: 1fr/)
  assert.match(CSS, /@media \(max-width: 760px\)[\s\S]*\.b-tk-head \{ display: none/)
})

// ── ISSUE 2 — global → Clients search: SINGLE SOURCE OF TRUTH ─────────────────
const CVIEW = strip(read('src/bento/modules/ClientsBentoView.jsx'))
test('S1: header submit writes straight into the ONE authoritative state', () => {
  assert.match(APP, /const \[clientsSearch, setClientsSearch\] = useState\(''\)/)
  assert.match(APP, /setClientsSearch\(term\)/)
  assert.match(APP, /if \(!term\) return/) // blank global search is a no-op
})
test('S2: Clients is controlled by that state; lower input renders + mutates it', () => {
  assert.match(APP, /search: clientsSearch, onSearchChange: setClientsSearch/)
  assert.match(CLIENTS, /const search = searchProp !== undefined \? searchProp : ownSearch/)
  assert.match(CLIENTS, /const setSearch = onSearchChange \|\| setOwnSearch/)
  assert.match(CVIEW, /value=\{search\}/)
  assert.match(CVIEW, /onChange=\{e => onSearch\(e\.target\.value\)\}/)
  assert.match(CLIENTS, /onSearch=\{v => \{ setSearch\(v\); setPage\(1\) \}\}/)
})
test('S3: NO handoff / pending / nonce / consume architecture remains', () => {
  for (const src of [APP, CLIENTS]) {
    assert.doesNotMatch(src, /pendingSearch|searchNonce|searchTerm|consumedSearchId|onSearchConsumed|searchReqId/)
  }
})
test('S4: filtering + pagination derive from that same value each render (not memoized)', () => {
  assert.match(CLIENTS, /const filtered = clients\.filter\(c =>/)
  assert.match(CLIENTS, /search\.trim\(\)\.toLowerCase\(\)/)
  assert.match(CLIENTS, /const pageRows = filtered\.slice\(/)
})

// ── ISSUE 3 — Add Task modal layout ──────────────────────────────────────────
test('M14/M20: wide, viewport-aware, responsive modal', () => {
  assert.match(MODAL, /\.atm-modal\{[^}]*width:960px;max-width:94vw;max-height:90vh/)
})
test('M15/M16: two-column desktop layout, one-column mobile', () => {
  assert.match(MODAL, /\.atm-cols\{display:grid;grid-template-columns:1fr 1fr/)
  assert.match(MODAL, /@media\(max-width:760px\)\{\.atm-cols\{grid-template-columns:1fr\}/)
})
test('M17/M18: sticky header + footer, single body scroll, no double scroll', () => {
  assert.match(MODAL, /\.atm-head\{flex-shrink:0/)
  assert.match(MODAL, /\.atm-foot\{flex-shrink:0/)
  assert.match(MODAL, /\.atm-body\{flex:1;overflow-y:auto/)
  assert.match(MODAL, /\.atm-modal\{[^}]*overflow:hidden/)
  assert.doesNotMatch(MODAL, /position: 'absolute'/) // inline picker, not an absolute dropdown
})
test('M19: client picker is an inline, unclipped result list', () => {
  assert.match(MODAL, /className="atm-results" role="listbox"/)
  assert.match(MODAL, /\.atm-results\{[^}]*overflow-y:auto/)
})
test('M20/M21: selected-client card + Change client; results only shown pre-selection', () => {
  assert.match(MODAL, /className="atm-selected"/)
  assert.match(MODAL, /Change client/)
  assert.match(MODAL, /\{!selected \? \(/)
})
test('M22: changing client only resets client/search (unrelated task fields untouched)', () => {
  assert.match(MODAL, /onClick=\{\(\) => \{ setSelected\(null\); setSearch\(''\) \}\}/)
})
test('M23: Create Task button is always visible in the footer', () => {
  assert.match(MODAL, /<div className="atm-foot">/)
  assert.match(MODAL, /className="atm-btn atm-btn-primary" onClick=\{saveTask\}/)
  assert.match(MODAL, /'Saving…' : 'Create Task'/)
})
test('M21: dialog semantics + close controls intact', () => {
  assert.match(MODAL, /role="dialog" aria-modal="true" aria-label="Add new task"/)
  assert.match(MODAL, /useEscapeKey\(onClose\)/)
  assert.match(MODAL, /aria-label="Close"/)
})
test('M: task-creation logic preserved (double-submit guard, insert-error check, client key)', () => {
  assert.match(MODAL, /if \(saving\) return/)
  assert.match(MODAL, /const \{ error \} = await supabase\.from\('tasks'\)\.insert/)
  assert.match(MODAL, /key=\{c\.client_id\}/)
  assert.match(MODAL, /'YA-TSK-' \+ Date\.now\(\)\.toString\(\)\.slice\(-6\)/)
})

// ── ISSUE 4 — non-owned/closed rows open the detail drawer ───────────────────
test('D22-26: row is a div; row/title/chevron all open the drawer (any task)', () => {
  assert.match(TVIEW, /const open = \(\) => onOpenTask\(t\)/)
  assert.match(TVIEW, /<div key=\{t\.id\} className="b-tk-row b-tk-grid" onClick=\{open\}>/) // row opener, no owner/closed gate
  assert.match(TVIEW, /className="b-tk-title" onClick=\{act\(open\)\}/)                       // title opener
  assert.match(TVIEW, /className="b-tk-chev" aria-label="Open task details" onClick=\{act\(open\)\}/) // chevron opener
})
test('D22-26: opening is unconditional — not gated by isMine or closed', () => {
  // there is no `mine`/`closed` condition wrapping onOpenTask
  assert.doesNotMatch(TVIEW, /mine && onClick=\{open\}/)
  assert.doesNotMatch(TVIEW, /!closed &&[\s\S]{0,40}onOpenTask/)
})
test('D27/D28: Follow-up & Mark done stay gated by isMyTask (view + drawer)', () => {
  assert.match(TVIEW, /const mine = isMine\(t\)/)
  assert.match(TVIEW, /!closed && mine &&[\s\S]*?onFollowUp\(t\)/)
  assert.match(TVIEW, /mine &&[\s\S]*?onMarkDone\(t\)/)
  assert.match(TASKS, /const mine = isMyTask\(t, user\)/)
  assert.match(TASKS, /!mine &&[\s\S]*?Read-only view/)
})
test('D29: nested controls stop propagation so they do not open the row', () => {
  assert.match(TVIEW, /const act = \(fn\) => \(e\) => \{ e\.stopPropagation\(\); fn\(\) \}/)
  assert.match(TVIEW, /onClick=\{act\(\(\) => onFollowUp\(t\)\)\}/)
  assert.match(TVIEW, /onClick=\{act\(\(\) => onMarkDone\(t\)\)\}/)
})
test('D30: drawer closes on Escape, scrim and the close control', () => {
  assert.match(PRIM, /e\.key === 'Escape'/)
  assert.match(PRIM, /className="b-drawer-scrim" onClick=\{onClose\}/)
  assert.match(PRIM, /className="b-drawer-close" onClick=\{onClose\} aria-label="Close details"/)
})
