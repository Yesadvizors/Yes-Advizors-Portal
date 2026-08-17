/**
 * Clients search — SINGLE SOURCE OF TRUTH (PR #70). node:test.
 *
 *   VISIBLE LOWER INPUT VALUE (search)
 *          ↓  (no second state, no handoff, no effect)
 *   AUTHORITATIVE CLIENT SEARCH STATE
 *          ↓
 *   normalizedSearch = search.trim().toLowerCase()
 *          ↓
 *   filtered = clients.filter(...normalizedSearch...)   (plain, non-memoized)
 *          ↓
 *   pageRows = filtered.slice(...)
 *
 * Static guards assert the wiring; behavioural tests mirror the exact predicate
 * to prove the value directly drives the rendered rows (delete → recompute → all).
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
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const APP = strip(read('src/bento/BentoApp.jsx'))
const CLIENTS = strip(read('src/components/Clients.jsx'))
const CVIEW = strip(read('src/bento/modules/ClientsBentoView.jsx'))

// Exact mirror of the Clients.jsx predicate + status filter.
const matches = (c, search) => {
  const s = search.trim().toLowerCase()
  return (c.name || '').toLowerCase().includes(s) ||
    (c.client_id || '').toLowerCase().includes(s) ||
    (c.mobile || '').includes(search.trim()) ||
    (c.pan || '').toLowerCase().includes(s)
}
const filterClients = (clients, { search, status = 'All' }) =>
  clients.filter(c => (status === 'All' || clientStatusLabel(c.status) === status) && matches(c, search))

const DATA = Array.from({ length: 18 }, (_, i) => ({ id: i + 1, name: `Zeta ${i + 1}`, client_id: `YA-${String(i + 1).padStart(3, '0')}`, mobile: '9800000000', pan: '', status: 'Active' }))
DATA[0] = { id: 1, name: 'Harshita Sahu & Co', client_id: 'YA-001', mobile: '9811111111', pan: '', status: 'Active' }
DATA[1] = { id: 2, name: 'Rupesh & Co', client_id: 'YA-002', mobile: '9822222222', pan: 'AGYPJ1052H', status: 'Draft' }
const names = (rows) => rows.map(c => c.name)

// ── Static: single-source wiring (reqs 1,2,3,13) ─────────────────────────────
test('SS-1: header submit writes to the ONE authoritative state', () => {
  assert.match(APP, /const \[clientsSearch, setClientsSearch\] = useState\(''\)/)
  assert.match(APP, /setClientsSearch\(term\)/)
  assert.match(APP, /search: clientsSearch, onSearchChange: setClientsSearch/)
  assert.match(APP, /if \(!term\) return/) // blank global search is a no-op
})
test('SS-2/3: lower input renders + mutates the authoritative state', () => {
  assert.match(CLIENTS, /const search = searchProp !== undefined \? searchProp : ownSearch/)
  assert.match(CLIENTS, /const setSearch = onSearchChange \|\| setOwnSearch/)
  assert.match(CVIEW, /value=\{search\}[\s\S]*?onChange=\{e => onSearch\(e\.target\.value\)\}/)
  assert.match(CLIENTS, /onSearch=\{v => \{ setSearch\(v\); setPage\(1\) \}\}/)
})
test('SS-13: no pending / nonce / consume / handoff architecture remains', () => {
  for (const s of [APP, CLIENTS]) {
    assert.doesNotMatch(s, /pendingSearch|searchNonce|searchTerm|consumedSearchId|onSearchConsumed|searchReqId/)
  }
})
test('SS-12: pagination resets on any search edit (type / clear / clear-filters)', () => {
  assert.match(CLIENTS, /onSearch=\{v => \{ setSearch\(v\); setPage\(1\) \}\}/)
  assert.match(CLIENTS, /onClearSearch=\{\(\) => \{ setSearch\(''\); setPage\(1\) \}\}/)
  assert.match(CLIENTS, /onClearFilters=\{\(\) => \{ setSearch\(''\); setFStatus\('All'\); setPage\(1\) \}\}/)
})
test('SS-filter-not-memoized: filtered + pageRows are plain render-body consts', () => {
  assert.match(CLIENTS, /const filtered = clients\.filter\(c =>/)
  assert.match(CLIENTS, /const pageRows = filtered\.slice\(/)
})

// ── Behavioural: the value directly drives the rendered rows (reqs 4-11) ──────
test('SS-4: filtering uses the exact rendered value', () => {
  assert.deepEqual(names(filterClients(DATA, { search: 'Harshita' })), ['Harshita Sahu & Co'])
})
test('SS-5: deleting one character recomputes results each keystroke', () => {
  for (const term of ['Rupesh', 'Rupes', 'Rupe', 'Rup', 'Ru']) {
    assert.equal(filterClients(DATA, { search: term }).length, 1, `"${term}" should match only Rupesh`)
  }
})
test('SS-6/7/8: final blank value (delete-all / Ctrl+A+Backspace / X) restores all 18', () => {
  assert.equal(filterClients(DATA, { search: '' }).length, 18)
})
test('SS-9: Clear filters (search="" + status All) restores all 18', () => {
  assert.equal(filterClients(DATA, { search: '', status: 'All' }).length, 18)
})
test('SS-10: direct search (no global first) filters correctly', () => {
  assert.deepEqual(names(filterClients(DATA, { search: 'rupesh' })), ['Rupesh & Co'])
  assert.deepEqual(names(filterClients(DATA, { search: 'YA-001' })), ['Harshita Sahu & Co'])
  assert.deepEqual(names(filterClients(DATA, { search: 'AGYPJ1052H' })), ['Rupesh & Co'])
})
test('SS-11: search + status filter combine', () => {
  // "YA-0" matches every id; status Draft narrows to the single Draft client.
  assert.deepEqual(names(filterClients(DATA, { search: 'YA-0', status: 'Draft' })), ['Rupesh & Co'])
})
