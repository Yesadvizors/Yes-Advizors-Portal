/**
 * Clients internal page — approved Bento skin (Phase 3) guards. node:test.
 * Static source-analysis only (project convention OD-5), asserting that the
 * re-skin is additive, presentational and preserves the existing logic:
 *   1. Flag-gated dual-skin; legacy skin retained.
 *   2. Summary cards derived from already-loaded clients (no new Supabase read).
 *   3. The Bento view is presentational (no Supabase/writes/network/emoji).
 *   4. Approved Bento affordances present (action, summary, search, filter,
 *      chips, skeletons, empty + safe error states, pagination).
 *   5. BentoApp opts reused modules into the skin.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const CLIENTS = 'src/components/Clients.jsx'
const VIEW = 'src/bento/modules/ClientsBentoView.jsx'

// 1 ── flag-gated dual-skin; legacy retained ─────────────────────────────────
test('Clients: additive flag-gated Bento skin that preserves the legacy skin', () => {
  const src = read(CLIENTS)
  assert.match(src, /import ClientsBentoView from '\.\.\/bento\/modules\/ClientsBentoView'/)
  assert.match(src, /import \{ approvedBentoEnabled \} from '\.\.\/bento\/flag'/)
  assert.match(src, /const bentoSkin = bento \?\? approvedBentoEnabled\(import\.meta\.env\.VITE_APPROVED_BENTO_UI\)/)
  assert.match(src, /\{bentoSkin \? \(/)
  assert.match(src, /<ClientsBentoView/)
  // legacy skin still present as the fallback branch (legacy-only empty copy)
  const code = strip(src)
  assert.match(code, /No clients found\. Click/)
})

// 2 ── summary derived from the loaded array; no new Supabase source ──────────
test('Clients: summary cards derive from the loaded clients array (no new read)', () => {
  const src = read(CLIENTS)
  assert.match(src, /const summary = clients\.reduce\(/)
  assert.match(src, /clientStatusLabel\(cl\.status\)/)
  const tables = [...new Set([...src.matchAll(/supabase\.from\('([a-z_]+)'\)/g)].map(m => m[1]))].sort()
  assert.deepEqual(tables, ['client_directors', 'clients'], 'no Supabase source beyond the pre-existing two')
})

// 3 ── the Bento view is presentational only ─────────────────────────────────
test('ClientsBentoView: presentational — no Supabase / writes / network / emoji', () => {
  const raw = read(VIEW)
  const code = strip(raw) // comments may legitimately reference Supabase (OD-5 convention)
  assert.doesNotMatch(code, /supabase/i)
  assert.doesNotMatch(code, /\.(insert|update|upsert|delete|rpc)\s*\(/)
  assert.doesNotMatch(code, /\bfetch\s*\(|XMLHttpRequest|WebSocket\s*\(/)
  assert.doesNotMatch(raw, /dangerouslySetInnerHTML/)
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u
  assert.doesNotMatch(raw, EMOJI)
})

// 4 ── approved Bento affordances present ────────────────────────────────────
test('ClientsBentoView: action, summary, search, filter, chips, states, pagination', () => {
  const src = read(VIEW)
  assert.match(src, /onStartOnboarding/)
  assert.match(src, /b-cl-summary/)
  assert.match(src, /type="search"[\s\S]*?aria-label="Search clients"/)
  assert.match(src, /aria-label="Filter by status"/)
  assert.match(src, /b-cl-chip/)
  assert.match(src, /b-skel/)
  assert.match(src, /No clients found/)
  assert.match(src, /contact the portal administrator/)
  assert.match(src, /Prev/)
  assert.match(src, /Next/)
})

// 5 ── BentoApp opts modules into the skin ───────────────────────────────────
test('BentoApp passes the bento skin flag to reused modules', () => {
  assert.match(read('src/bento/BentoApp.jsx'), /bento: true/)
})
