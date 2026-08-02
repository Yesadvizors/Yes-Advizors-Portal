/**
 * Rapid Launch — launch-critical frontend correctness fixes. node:test — `npm test`.
 *
 * Static source guards (project convention OD-5: no jsdom/RTL — no DB shape invented)
 * that lock in the Workstream A corrections so they cannot silently regress:
 *   - FE-H1  Clients list pagination has real navigation controls.
 *   - FE-H2  Clients list AND Dashboard surface load errors (no silent zeros/empties).
 *   - FE-L1  Director avatar uses the palette entry's colour, not the object itself.
 *   - FE-M1  Task assignee list comes from the live `team` table, not a hardcoded roster.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const clients = stripComments(read('../src/components/Clients.jsx'))
const dashboard = stripComments(read('../src/components/Dashboard.jsx'))
const addTask = stripComments(read('../src/components/AddTaskModal.jsx'))

// FE-H2: the clients read must inspect `error`, not swallow it as an empty register.
test('FE-H2: Clients load() captures and surfaces the query error', () => {
  assert.match(clients, /const \{ data, error \} = await supabase\.from\('clients'\)/)
  assert.match(clients, /setLoadError\(/)
  // A visible error branch with a retry affordance exists in the list card.
  assert.match(clients, /Couldn't load clients/)
  assert.match(clients, /onClick=\{load\}/)
})

// FE-H1: pagination is navigable — prev/next controls wired to setPage, not just a silent slice.
test('FE-H1: Clients renders working pagination controls', () => {
  assert.match(clients, /safePage/)
  assert.match(clients, /setPage\(p => Math\.max\(1, p - 1\)\)/)
  assert.match(clients, /setPage\(p => Math\.min\(totalPages, p \+ 1\)\)/)
  assert.match(clients, /Prev/)
  assert.match(clients, /Next/)
  // The rendered slice must use the clamped safePage, not the raw page.
  assert.match(clients, /filtered\.slice\(\(safePage\s*-\s*1\)\s*\*\s*PAGE_SIZE,\s*safePage\s*\*\s*PAGE_SIZE\)/)
})

// FE-L1: DIR_PALETTE entries are objects {bg,text}; the buggy form used the object as a colour.
test('FE-L1: director avatar uses palette .bg / .text, not the raw object', () => {
  assert.match(clients, /DIR_PALETTE\[i % DIR_PALETTE\.length\]\.bg/)
  assert.match(clients, /DIR_PALETTE\[i % DIR_PALETTE\.length\]\.text/)
  // The exact buggy expression (object assigned to `background`) must be gone.
  assert.doesNotMatch(clients, /background: DIR_PALETTE\[i % DIR_PALETTE\.length\],/)
})

// FE-H2: dashboard must not render a firm-of-zeros when a core query fails.
test('FE-H2: Dashboard load() detects query errors and shows an error state', () => {
  assert.match(dashboard, /\.map\(r => r\.error\)\.find\(Boolean\)/)
  assert.match(dashboard, /setError\(/)
  assert.match(dashboard, /Couldn't load the dashboard/)
  assert.match(dashboard, /onClick=\{load\}/)
})

// FE-M1: assignees come from the live team table; the static list is fallback-only.
test('FE-M1: AddTaskModal sources assignees from the team table', () => {
  assert.match(addTask, /supabase\.from\('team'\)\.select\('name'\)\.eq\('is_active', true\)/)
  assert.match(addTask, /async function loadTeam\(/)
  assert.match(addTask, /loadTeam\(\)/)
  // The hardcoded roster survives only as an explicitly named fallback constant.
  assert.match(addTask, /FALLBACK_TEAM/)
  assert.doesNotMatch(addTask, /const team = \[/)
})
