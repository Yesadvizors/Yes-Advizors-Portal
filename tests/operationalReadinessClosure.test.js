/**
 * YAV2 Operational Readiness & Cross-Module Consistency Closure — regression tests.
 * node:test — `npm test`. Convention OD-5: pure-logic (activateProps) + static
 * source guards (no jsdom/RTL). Non-overlapping with prior closures (OR-1..OR-14).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { activateProps } from '../src/lib/a11y.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

// ── activateProps (pure) ───────────────────────────────────────────────────────
test('OR-a11y-1: activateProps exposes button semantics and wires onClick to onActivate', () => {
  let clicked = 0
  const p = activateProps(() => { clicked++ })
  assert.equal(p.role, 'button')
  assert.equal(p.tabIndex, 0)
  assert.equal(typeof p.onClick, 'function')
  assert.equal(typeof p.onKeyDown, 'function')
  p.onClick()
  assert.equal(clicked, 1)
})

test('OR-a11y-2: Enter and Space activate (with preventDefault); other keys do not', () => {
  for (const key of ['Enter', ' ', 'Spacebar']) {
    let activated = 0, prevented = 0
    const p = activateProps(() => { activated++ })
    p.onKeyDown({ key, preventDefault: () => { prevented++ } })
    assert.equal(activated, 1, `${key} should activate`)
    assert.equal(prevented, 1, `${key} should preventDefault`)
  }
  // a non-activating key does nothing
  let activated = 0, prevented = 0
  const p = activateProps(() => { activated++ })
  p.onKeyDown({ key: 'a', preventDefault: () => { prevented++ } })
  assert.equal(activated, 0)
  assert.equal(prevented, 0)
})

// ── OR-1..OR-6 keyboard activation adopted ─────────────────────────────────────
const usesActivate = (file, label) =>
  test(`${label}: uses activateProps for the click-only control`, () => {
    const code = stripComments(read(file))
    assert.match(code, /import \{ activateProps \} from '\.\.\/lib\/a11y'/)
    assert.match(code, /\{\.\.\.activateProps\(/)
  })
usesActivate('../src/components/Dashboard.jsx', 'OR-1 Dashboard card')
usesActivate('../src/components/Compliance.jsx', 'OR-3 Compliance selector')
// OR-6: the AddTaskModal client picker rows are now NATIVE <button> elements
// (Bento redesign) — inherently keyboard-activatable (Enter/Space), so activateProps
// is no longer needed for these controls.
test('OR-6 AddTaskModal option: client picker rows are native buttons (keyboard-activatable)', () => {
  const code = stripComments(read('../src/components/AddTaskModal.jsx'))
  assert.match(code, /<button type="button" key=\{c\.client_id\} className="atm-result" onClick=\{\(\) => pick\(c\)\}/)
})

test('OR-2 AdminHome card: activatable only when it has a target tab', () => {
  const code = stripComments(read('../src/components/AdminHome.jsx'))
  assert.match(code, /import \{ activateProps \} from '\.\.\/lib\/a11y'/)
  assert.match(code, /tab \? activateProps\(\(\) => goTo\?\.\(tab\)\) : \{\}/)
})

test('OR-4/OR-5: Tasks checklist item + dots use activateProps (keyboard-activatable)', () => {
  const code = stripComments(read('../src/components/Tasks.jsx'))
  assert.match(code, /import \{ activateProps \} from '\.\.\/lib\/a11y'/)
  assert.match(code, /\{\.\.\.activateProps\(\(\) => !saving && toggle/)         // OR-4 item
  assert.match(code, /\{\.\.\.activateProps\(\(\) => setExpandedChecklist/)      // OR-5 dots
})

// ── OR-7 dialog semantics ──────────────────────────────────────────────────────
test('OR-7: Clients detail modal has dialog semantics and a labelled close control', () => {
  const code = stripComments(read('../src/components/Clients.jsx'))
  assert.match(code, /className="cd-modal" role="dialog" aria-modal="true" aria-label=/)
  assert.match(code, /className="cd-close"[\s\S]*?aria-label="Close client record"/)
})

// ── OR-8 ResyncButton timer hygiene ────────────────────────────────────────────
test('OR-8: ResyncButton done→idle timer is held in a ref and cleared on unmount', () => {
  const code = stripComments(read('../src/components/Clients.jsx'))
  assert.match(code, /idleTimer = useRef\(null\)/)
  assert.match(code, /useEffect\(\(\) => \(\) => clearTimeout\(idleTimer\.current\), \[\]\)/)
  assert.match(code, /idleTimer\.current = setTimeout/)
})

// ── OR-9..OR-13 search-trim consistency ────────────────────────────────────────
const trims = (file, label) =>
  test(`${label}: search term is trimmed`, () => {
    const code = stripComments(read(file))
    assert.match(code, /search\.trim\(\)\.toLowerCase\(\)/)
    assert.doesNotMatch(code, /[^)]search\.toLowerCase\(\)/) // no untrimmed search compare remains
  })
trims('../src/components/Clients.jsx', 'OR-9 Clients')
trims('../src/components/Tasks.jsx', 'OR-10 Tasks')
trims('../src/components/Compliance.jsx', 'OR-11 Compliance')
trims('../src/components/WorkDocuments.jsx', 'OR-12 WorkDocuments')
trims('../src/components/AddTaskModal.jsx', 'OR-13 AddTaskModal')

// ── OR-14 responsive table wrap ────────────────────────────────────────────────
test('OR-14: Compliance extracted-data table is wrapped for horizontal scroll', () => {
  const code = read('../src/components/Compliance.jsx')
  assert.match(code, /overflowX:'auto' \}\}>\s*<table style=\{\{ width:'100%', borderCollapse:'collapse', fontSize:12\.5 \}\}>/)
})
