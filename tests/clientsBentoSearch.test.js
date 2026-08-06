/**
 * Clients Bento skin — search wiring regression guards (Phase 3). node:test.
 *
 * CONTEXT: A UAT report ("Bento Clients search not working") turned out to be a
 * wrong-server issue — the Clients search is fully functional (verified live:
 * 17 rows → 1 on "rupesh"). These tests lock the search wiring so it cannot
 * silently regress, and prove the filtering truth across every required case.
 *
 * Two layers (project convention OD-5 = static source analysis, plus behavioural
 * unit tests of a mirror of the register predicate):
 *   A. Behavioural — the exact predicate used by Clients.jsx filters by full name,
 *      partial name, case-insensitively, trimmed, and by client ID / mobile / PAN;
 *      blank restores all; and it AND-combines with the status filter.
 *   B. Static — the Bento input is controlled by the shared `search` state and
 *      calls the shared `onSearch` setter (which resets the page), the container
 *      passes the FILTERED/paginated rows (never the raw clients), and the source
 *      predicate still matches the mirror below.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { clientStatusLabel } from '../src/helpers.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const CLIENTS_SRC = strip(read('src/components/Clients.jsx'))
const VIEW_SRC = strip(read('src/bento/modules/ClientsBentoView.jsx'))

// Mirror of the register search predicate in src/components/Clients.jsx. Guard
// B4 below asserts the source still uses this exact logic, so the mirror cannot
// drift from the real filter.
const matchesClientSearch = (c, search) => {
  const s = search.trim().toLowerCase()
  return (c.name || '').toLowerCase().includes(s) ||
    (c.client_id || '').toLowerCase().includes(s) ||
    (c.mobile || '').includes(search.trim()) ||
    (c.pan || '').toLowerCase().includes(s)
}
// Mirror of the combined status + search filter.
const filterClients = (clients, { search, status }) =>
  clients.filter(c => (status === 'All' || clientStatusLabel(c.status) === status) && matchesClientSearch(c, search))

const CLIENTS = [
  { id: 1, name: 'Rupesh & Co', client_id: 'YA-013', mobile: '9811111111', pan: 'AGYPJ1052H', status: 'Active' },
  { id: 2, name: 'ABC Pvt Ltd', client_id: 'YA-001', mobile: '9822222222', pan: 'AAAPA1111A', status: 'Active' },
  { id: 3, name: '111', client_id: 'YA-014', mobile: '9999999999', pan: '', status: 'Draft' },
  { id: 4, name: 'Zenith LLP', client_id: 'YA-020', mobile: '9833333333', pan: 'ZENPL9999Z', status: 'Inactive' },
]
const ids = (rows) => rows.map(r => r.id)

// ── A. Behavioural: filtering truth ─────────────────────────────────────────
test('search: full client name', () => {
  assert.deepEqual(ids(filterClients(CLIENTS, { search: 'Rupesh & Co', status: 'All' })), [1])
})
test('search: partial client name', () => {
  assert.deepEqual(ids(filterClients(CLIENTS, { search: 'rup', status: 'All' })), [1])
})
test('search: case-insensitive name', () => {
  assert.deepEqual(ids(filterClients(CLIENTS, { search: 'RUPESH', status: 'All' })), [1])
})
test('search: leading/trailing spaces are trimmed', () => {
  assert.deepEqual(ids(filterClients(CLIENTS, { search: '   rupesh   ', status: 'All' })), [1])
})
test('search: by client ID (case-insensitive)', () => {
  assert.deepEqual(ids(filterClients(CLIENTS, { search: 'ya-014', status: 'All' })), [3])
})
test('search: by mobile', () => {
  assert.deepEqual(ids(filterClients(CLIENTS, { search: '9999999999', status: 'All' })), [3])
})
test('search: by PAN (case-insensitive)', () => {
  assert.deepEqual(ids(filterClients(CLIENTS, { search: 'agypj1052h', status: 'All' })), [1])
})
test('search: blank restores all clients', () => {
  assert.deepEqual(ids(filterClients(CLIENTS, { search: '', status: 'All' })), [1, 2, 3, 4])
  assert.deepEqual(ids(filterClients(CLIENTS, { search: '   ', status: 'All' })), [1, 2, 3, 4])
})
test('search: no match returns empty', () => {
  assert.deepEqual(filterClients(CLIENTS, { search: 'zzz-no-match', status: 'All' }), [])
})
test('search + status filter combine (AND)', () => {
  // "YA-0" matches every client_id; status Active narrows to 1 & 2.
  assert.deepEqual(ids(filterClients(CLIENTS, { search: 'YA-0', status: 'Active' })), [1, 2])
  // Draft + "1" → only the Draft client whose fields contain "1".
  assert.deepEqual(ids(filterClients(CLIENTS, { search: '1', status: 'Draft' })), [3])
})

// ── B. Static: the Bento wiring uses the shared state/setter and filtered rows ─
test('B1: Bento search input is controlled by shared `search` and calls `onSearch`', () => {
  assert.match(VIEW_SRC, /value=\{search\}/)
  assert.match(VIEW_SRC, /onChange=\{e => onSearch\(e\.target\.value\)\}/)
  // no local search state shadowing the shared state
  assert.doesNotMatch(VIEW_SRC, /useState/)
})
test('B2: Bento view renders the FILTERED/paginated rows, never the raw clients', () => {
  assert.match(VIEW_SRC, /pageRows\.map\(/)
  // the view is not even given the raw clients array
  assert.doesNotMatch(VIEW_SRC, /^\s*clients,\s*$/m)
})
test('B3: container passes shared search state, page-resetting setter, and filtered rows', () => {
  assert.match(CLIENTS_SRC, /search=\{search\}/)
  assert.match(CLIENTS_SRC, /onSearch=\{v => \{ setSearch\(v\); setPage\(1\) \}\}/) // shared setter + page reset
  assert.match(CLIENTS_SRC, /pageRows=\{pageRows\}/)
  assert.match(CLIENTS_SRC, /filtered=\{filtered\}/)
  assert.match(CLIENTS_SRC, /const pageRows = filtered\.slice\(/)
})
test('B4: source register predicate matches the mirror (name/ID/mobile/PAN, trimmed, case-insensitive) AND status', () => {
  assert.match(CLIENTS_SRC, /\(fStatus === 'All' \|\| clientStatusLabel\(c\.status\) === fStatus\) &&/)
  assert.match(CLIENTS_SRC, /\(c\.name \|\| ''\)\.toLowerCase\(\)\.includes\(search\.trim\(\)\.toLowerCase\(\)\)/)
  assert.match(CLIENTS_SRC, /\(c\.client_id \|\| ''\)\.toLowerCase\(\)\.includes\(search\.trim\(\)\.toLowerCase\(\)\)/)
  assert.match(CLIENTS_SRC, /\(c\.mobile \|\| ''\)\.includes\(search\.trim\(\)\)/)
  assert.match(CLIENTS_SRC, /\(c\.pan \|\| ''\)\.toLowerCase\(\)\.includes\(search\.trim\(\)\.toLowerCase\(\)\)/)
})
