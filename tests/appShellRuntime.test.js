/**
 * T2 — App Recovery / Runtime. node:test — `npm test`.
 *
 * Schema-INDEPENDENT static guards over the SPA shell (`src/App.jsx`) and the
 * frontend firm-dashboard query. These lock in behaviour ALREADY PROVEN CORRECT by
 * the merged Package A evidence so it cannot silently regress. They are static source
 * analysis (project convention OD-5: no jsdom/RTL) and invent no database shape.
 *
 * Gap mapping / acceptance:
 *   - R1..R2, R7  → G-12 (per-tab runtime): tab→component wiring integrity; the
 *                   compile/mount prerequisite of Acceptance §A. NOT a live-runtime pass.
 *   - R3..R5      → G-13 (RBAC) + SECURITY_BASELINE S4: the FRONTEND admin gate is present
 *                   and double-guarded, and portal entry fails closed. This is a
 *                   defence-in-depth UX guard ONLY. Frontend hiding is NOT security;
 *                   server enforcement remains EVIDENCE-PENDING (T3). See Acceptance §B.
 *   - R6          → guards the documented `v_firm_dashboard.due_soon` 42703 defect
 *                   (BASELINE §2; Historical Evidence). Regression guard for the exact
 *                   removed column; asserts absence, invents no column.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const APP = '../src/App.jsx'
const appRaw = read(APP)
const app = stripComments(appRaw)

// The nine SPA tabs and the component each mounts (BASELINE §2).
const TAB_MOUNTS = {
  home:       'AdminHome',
  dashboard:  'Dashboard',
  tasks:      'Tasks',
  clients:    'Clients',
  compliance: 'Compliance',
  documents:  'DocumentsHub',
  team:       'Team',
  usage:      'Usage',
  auditlog:   'AuditLog',
}
const ADMIN_ONLY_TABS = ['home', 'auditlog']

// ── R1. Every mounted component is imported (no missing component) ──────────────
test('R1: App imports every component it mounts', () => {
  for (const comp of Object.values(TAB_MOUNTS)) {
    assert.ok(
      new RegExp(`import\\s+${comp}\\s+from`).test(app),
      `App.jsx must import ${comp}`
    )
  }
  // ChatAgent is always-mounted (not a tab) — must also be imported.
  assert.ok(/import\s+ChatAgent\s+from/.test(app), 'App.jsx must import ChatAgent')
})

// ── R2. Every tab id has a matching mount branch ───────────────────────────────
test('R2: each tab id has a mount branch to its component', () => {
  for (const [id, comp] of Object.entries(TAB_MOUNTS)) {
    assert.ok(app.includes(`tab === '${id}'`), `App.jsx must branch on tab === '${id}'`)
    assert.ok(
      new RegExp(`tab === '${id}'[\\s\\S]{0,80}<${comp}\\b`).test(app),
      `tab '${id}' must mount <${comp}>`
    )
  }
})

// ── R3. Admin-only tabs appear in the tab bar ONLY under an is_admin===true guard ─
test('R3: admin-only tabs are gated by is_admin === true in the tab list', () => {
  for (const id of ADMIN_ONLY_TABS) {
    // The tab list entry for an admin-only id must be produced by a spread that is
    // conditioned on is_admin === true (strict equality — no truthiness coercion).
    assert.ok(
      new RegExp(`is_admin === true[\\s\\S]{0,120}id: '${id}'`).test(app),
      `tab-list entry for '${id}' must be guarded by is_admin === true`
    )
  }
})

// ── R4. Admin-only tabs are DOUBLE-guarded at mount (defence in depth) ──────────
test('R4: admin-only tabs re-check is_admin === true at mount', () => {
  for (const id of ADMIN_ONLY_TABS) {
    assert.ok(
      new RegExp(`tab === '${id}'\\s*&&\\s*user\\?\\.is_admin === true`).test(app),
      `mount of '${id}' must re-check user?.is_admin === true`
    )
  }
})

// ── R5. Portal entry fails closed (active + mapped team member only) ────────────
test('R5: loadUser fails closed — active mapped member only (transient errors retry, never grant)', () => {
  assert.ok(app.includes(".eq('is_active', true)"), 'loadUser must require is_active === true')
  // Fail-closed via classifyMembership: only 'granted' admits the user; a genuine
  // 'not_active' signs out; a transient 'verify_failed' shows a retryable state and
  // does NOT grant access (it must not silently sign a valid user out on a blip).
  assert.ok(/classifyMembership\(\{ error, member \}\)/.test(app), 'loadUser must classify membership')
  assert.ok(/granted'\)[\s\S]{0,80}setUser\(cls\.member\)/.test(app), 'only granted admits the user')
  assert.ok(/verify_failed'\)[\s\S]{0,60}setSessionError\(true\)/.test(app), 'transient error must not grant — retryable state')
  assert.ok(/auth\.signOut\(\)[\s\S]{0,40}setUser\(null\)/.test(app), 'not-active must sign out')
})

// ── R6. No frontend v_firm_dashboard select reintroduces the removed due_soon ───
test('R6: no v_firm_dashboard select references the removed due_soon column', () => {
  const SRC_DIR = new URL('../src/', import.meta.url)
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = new URL(name + (statSync(new URL(name, dir)).isDirectory() ? '/' : ''), dir)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(jsx?|tsx?)$/.test(name)) files.push(p)
    }
  }
  walk(SRC_DIR)

  // Capture the select-list string passed to any .from('v_firm_dashboard').select('…').
  const re = /from\(\s*['"]v_firm_dashboard['"]\s*\)\s*\.select\(\s*(['"`])([^'"`]*)\1/g
  let selects = 0
  for (const f of files) {
    const s = stripComments(read(f))
    let m
    while ((m = re.exec(s)) !== null) {
      selects += 1
      assert.equal(
        m[2].includes('due_soon'), false,
        `v_firm_dashboard select in ${f.pathname} must not request due_soon (42703)`
      )
    }
  }
  // Guard the guard: if the frontend stops querying the view, this test is vacuous.
  assert.ok(selects >= 2, `expected the frontend to select v_firm_dashboard (found ${selects})`)
})

// ── R7. ChatAgent is always mounted (not behind a tab) ─────────────────────────
test('R7: ChatAgent is mounted outside the tab switch, gated by the AI-backend flag', () => {
  // Package 2 AI-honesty: the assistant is HIDDEN unless VITE_AI_ENABLED is set (the
  // ai-agent function is not deployed here), so it never claims to be online. It is still
  // mounted at the app root (outside the `tab ===` switch), not per-tab.
  assert.match(app, /aiAssistantEnabled\(import\.meta\.env\.VITE_AI_ENABLED\) && <ChatAgent\s*\/>/)
  assert.doesNotMatch(app, /tab === [^\n]*<ChatAgent/)
})
