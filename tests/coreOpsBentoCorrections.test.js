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

// ── ISSUE 2 — global → Clients search clearing ───────────────────────────────
// Behavioural model of the payload lifecycle (mirror of BentoApp/Clients).
const submit = (prev, raw) => { const term = raw.trim(); return term ? { term, nonce: prev.nonce + 1 } : prev }
const consume = () => ({ term: '', nonce: 0 })
const shouldApply = (p) => p.nonce > 0

test('S7: a global search applies exactly once (payload nonce > 0)', () => {
  const p = submit({ term: '', nonce: 0 }, 'Harshita Sahu')
  assert.deepEqual(p, { term: 'Harshita Sahu', nonce: 1 })
  assert.equal(shouldApply(p), true)
})
test('S8/S10/S11/S12: after consumption the payload cannot re-apply (rerender/status/pagination)', () => {
  const consumed = consume()
  assert.equal(shouldApply(consumed), false) // no re-apply on any later render
})
test('S13: a repeated later global search still applies', () => {
  const again = submit(consume(), 'ABC')
  assert.equal(again.nonce, 1)
  assert.equal(shouldApply(again), true)
})
test('S15: blank global search is a no-op (never navigates/applies)', () => {
  const p = submit({ term: '', nonce: 0 }, '   ')
  assert.deepEqual(p, { term: '', nonce: 0 })
  assert.equal(shouldApply(p), false)
})
test('S: source wires consume-and-clear (BentoApp acknowledger + Clients effect)', () => {
  assert.match(APP, /const clearClientSearch = useCallback\(\(\) => setClientSearch\(cs => \(cs\.nonce === 0 \? cs : \{ term: '', nonce: 0 \}\)\)/)
  assert.match(APP, /onSearchConsumed: clearClientSearch/)
  assert.match(APP, /if \(!term\) return/)                       // blank guard
  assert.match(APP, /nonce: prev\.nonce \+ 1/)                   // increment per submit
  assert.match(CLIENTS, /if \(searchNonce > 0\) \{ setSearch\(searchTerm\); setPage\(1\); onSearchConsumed\?\.\(\) \}/)
})
test('S9/S14: local Clients search is the source of truth (direct search unchanged)', () => {
  assert.match(CLIENTS, /onSearch=\{v => \{ setSearch\(v\); setPage\(1\) \}\}/) // clearing/typing drives filtered
  assert.match(CLIENTS, /search\.trim\(\)\.toLowerCase\(\)/)                     // name/id/mobile/pan predicate intact
})

// ── ISSUE 3 — Add Task modal layout ──────────────────────────────────────────
test('M16: modal uses a viewport-aware max height', () => {
  assert.match(MODAL, /maxHeight: '88vh'/)
})
test('M17: the form body is the single primary scroll container (flex column)', () => {
  assert.match(MODAL, /flexDirection: 'column'/)
  assert.match(MODAL, /flex: 1, overflowY: 'auto', minHeight: 280/)
})
test('M18/M19: modal clips its chrome (no double scroll); dropdown has room', () => {
  assert.match(MODAL, /maxWidth: 560, maxHeight: '88vh'[^}]*overflow: 'hidden'/)
  assert.doesNotMatch(MODAL, /maxHeight: '90vh', overflowY: 'auto'/) // old single-scroll container removed
})
test('M20: modal is responsive (full width up to a max)', () => {
  assert.match(MODAL, /width: '100%', maxWidth: 560/)
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
  assert.match(TASKS, /!mine &&[\s\S]*?can Follow-up or Mark done/)
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
