/**
 * Rapid Launch — launch-critical frontend correctness fixes. node:test — `npm test`.
 *
 * Static source guards (project convention OD-5: no jsdom/RTL — no DB shape invented)
 * that lock in the Workstream A corrections, as amended per independent review of PR #46:
 *   - FE-H1  Clients list pagination has real navigation controls; search resets to page 1.
 *   - FE-H2  Clients + Dashboard surface load errors as BUSINESS-SAFE messages (no raw
 *            error.message / SQL / RLS detail); technical detail goes to console only.
 *   - FE-L1  Director avatar uses the palette entry's colour, not the object itself.
 *   - FE-M1  Task assignee list comes ONLY from active public.team rows — no hardcoded
 *            fallback roster; failure/empty disables task creation.
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

// FE-H1: pagination is navigable — prev/next controls wired to setPage, not just a silent slice.
test('FE-H1: Clients renders working pagination controls', () => {
  assert.match(clients, /safePage/)
  assert.match(clients, /setPage\(p => Math\.max\(1, p - 1\)\)/)
  assert.match(clients, /setPage\(p => Math\.min\(totalPages, p \+ 1\)\)/)
  assert.match(clients, /Prev/)
  assert.match(clients, /Next/)
  assert.match(clients, /filtered\.slice\(\(safePage\s*-\s*1\)\s*\*\s*PAGE_SIZE,\s*safePage\s*\*\s*PAGE_SIZE\)/)
})

// FE-H1 (review): changing the search must reset pagination to page 1, and the slice
// is clamped so page never exceeds totalPages.
test('FE-H1: Clients search resets pagination to page 1 and clamps page', () => {
  assert.match(clients, /setSearch\(e\.target\.value\);\s*setPage\(1\)/)
  assert.match(clients, /const safePage = Math\.min\(page, totalPages\)/)
})

// FE-H2: clients read inspects `error`, logs it to console, and shows a business-safe
// message — never the raw error.message.
test('FE-H2: Clients shows a business-safe load error (no raw error.message)', () => {
  assert.match(clients, /const \{ data, error \} = await supabase\.from\('clients'\)/)
  assert.match(clients, /console\.error\(/)
  assert.match(clients, /contact the portal administrator/)
  assert.match(clients, /onClick=\{load\}/)
  // The raw error text must not be piped into the DOM.
  assert.doesNotMatch(clients, /\{loadError\}/)
  assert.doesNotMatch(clients, /loadError\.message/)
})

// FE-H2: dashboard detects any core-query error, logs it, and shows a business-safe state.
test('FE-H2: Dashboard shows a business-safe error state (no raw error.message)', () => {
  assert.match(dashboard, /\.map\(r => r\.error\)\.find\(Boolean\)/)
  assert.match(dashboard, /console\.error\(/)
  assert.match(dashboard, /setError\(true\)/)
  assert.match(dashboard, /contact the portal administrator/)
  assert.match(dashboard, /onClick=\{load\}/)
  assert.doesNotMatch(dashboard, /\{error\}/)
  assert.doesNotMatch(dashboard, /firstError\.message/)
})

// FE-L1: DIR_PALETTE entries are objects {bg,text}; the buggy form used the object as a colour.
test('FE-L1: director avatar uses palette .bg / .text, not the raw object', () => {
  assert.match(clients, /DIR_PALETTE\[i % DIR_PALETTE\.length\]\.bg/)
  assert.match(clients, /DIR_PALETTE\[i % DIR_PALETTE\.length\]\.text/)
  assert.doesNotMatch(clients, /background: DIR_PALETTE\[i % DIR_PALETTE\.length\],/)
})

// FE-M1: assignees come ONLY from active team rows — no hardcoded fallback roster.
test('FE-M1: AddTaskModal sources assignees only from active team, no fallback roster', () => {
  assert.match(addTask, /supabase\.from\('team'\)\.select\('name'\)\.eq\('is_active', true\)/)
  assert.match(addTask, /async function loadTeam\(/)
  // No hardcoded roster of any form.
  assert.doesNotMatch(addTask, /FALLBACK_TEAM/)
  assert.doesNotMatch(addTask, /const team = \[/)
  assert.doesNotMatch(addTask, /\[\s*'Pankaj'/)
  // Assignee starts empty and is only set from the query result.
  assert.match(addTask, /const \[assign, setAssign\] = useState\(''\)/)
  // Current user is used as default ONLY if they are an active member.
  assert.match(addTask, /names\.includes\(user\?\.name\) \? user\.name : names\[0\]/)
})

// FE-M1 (review): a failed team query produces an error state and blocks task creation.
test('FE-M1: team load failure disables save and offers retry, no fabricated options', () => {
  assert.match(addTask, /setTeamStatus\('error'\)/)
  assert.match(addTask, /setTeamStatus\('empty'\)/)
  assert.match(addTask, /console\.error\(/)
  // Save is disabled unless the roster loaded successfully (and while a save is in flight).
  assert.match(addTask, /disabled=\{teamStatus !== 'ready' \|\| saving\}/)
  // ...and saveTask itself guards against a missing/unready assignee.
  assert.match(addTask, /teamStatus !== 'ready' \|\| !assign/)
  assert.match(addTask, /No active team members available/)
})
