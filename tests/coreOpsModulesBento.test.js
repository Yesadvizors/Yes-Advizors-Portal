/**
 * Core Operations — Documents, Team, placeholder shells + shell wording. node:test.
 * Static source guards (OD-5) + behavioural filter mirrors. Additive dual-skin:
 * every module keeps its legacy skin and ALL storage/auth logic; the Bento views
 * are presentational and wire back to the existing handlers.
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

const HUB = strip(read('src/components/DocumentsHub.jsx'))
const DVIEW = strip(read('src/bento/modules/DocumentsBentoView.jsx'))
const TEAM = strip(read('src/components/Team.jsx'))
const TMVIEW = strip(read('src/bento/modules/TeamBentoView.jsx'))
const APP = strip(read('src/bento/BentoApp.jsx'))
const SHELL = strip(read('src/bento/BentoShell.jsx'))
const PLACE = strip(read('src/bento/modules/ModulePlaceholder.jsx'))
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u

// ── DOCUMENTS ────────────────────────────────────────────────────────────────
test('DOC-1: DocumentsHub is additive dual-skin (Bento view + legacy retained)', () => {
  assert.match(HUB, /const bentoSkin = bento \?\? approvedBentoEnabled/)
  assert.match(HUB, /bentoSkin \? \(/) // dual-skin branch retained (now nested under the docs/missing mode)
  assert.match(HUB, /<DocumentsBentoView/)
  assert.match(HUB, /Document Management/) // legacy header retained
})
test('DOC-2/6/7/8: existing view/download/delete/upload handlers wired to the Bento view', () => {
  assert.match(HUB, /onView=\{viewDoc\} onDownload=\{downloadDoc\} onDelete=\{deleteDoc\}/)
  assert.match(HUB, /onUpload=\{\(\) => setShowUpload\(true\)\}/)
  assert.match(HUB, /async function viewDoc\(/)
  assert.match(HUB, /async function downloadDoc\(/)
  assert.match(HUB, /async function deleteDoc\(/)
})
test('DOC-9: delete still checks the record-delete error before success (CR-16 preserved)', () => {
  assert.match(HUB, /if \(delErr\)/)
})
test('DOC-3/4/5: search + filters + clear wired', () => {
  assert.match(HUB, /onSearch=\{v => \{ setSearch\(v\); setPage\(1\) \}\}/)
  assert.match(HUB, /onClearSearch=\{\(\) => \{ setSearch\(''\); setPage\(1\) \}\}/)
  assert.match(HUB, /onClearFilters=\{\(\) => \{ setSearch\(''\); setFClient\(''\); setFType\(''\); setFFY\(''\); setFScope\(''\); setPage\(1\) \}\}/)
})
test('DOC: storage bucket/paths untouched (no second storage architecture)', () => {
  assert.match(HUB, /const BUCKET = 'secure-docs'/)
  assert.match(HUB, /supabase\.storage\.from\(BUCKET\)\.upload/)
  assert.doesNotMatch(DVIEW, /supabase/i) // the view performs no storage/data access
  assert.doesNotMatch(DVIEW, EMOJI)
})
test('DOC-13: documents Bento rows collapse to cards on mobile', () => {
  assert.match(read('src/styles/bento.css'), /@media \(max-width: 760px\)[\s\S]*\.b-mod-row\.b-dc-row \{ grid-template-columns: 1fr !important/)
})
test('DOC (behavioural): the document filter matches client/type/scope/fy/search', () => {
  const matches = (d, { search = '', fClient = '', fType = '', fScope = '', fFY = '' }) => {
    if (fClient && d.client_id !== fClient) return false
    if (fType && d.doc_type !== fType) return false
    if (fScope && (d.scope || 'client') !== fScope) return false
    if (fFY && d.fy_label !== fFY) return false
    if (search) {
      const hay = `${d.client_name || ''} ${d.doc_type || ''} ${d.doc_name || ''}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  }
  const d = { client_id: 'YA-1', client_name: 'Acme', doc_type: 'PAN Card', scope: 'director', fy_label: '2023-24' }
  assert.equal(matches(d, { search: 'pan' }), true)
  assert.equal(matches(d, { fScope: 'director' }), true)
  assert.equal(matches(d, { fScope: 'compliance' }), false)
  assert.equal(matches(d, { fFY: '2023-24' }), true)
  assert.equal(matches(d, { search: '' }), true)
})

// ── TEAM ─────────────────────────────────────────────────────────────────────
test('TEAM-1: Team is additive dual-skin (Bento view + legacy retained)', () => {
  assert.match(TEAM, /const bentoSkin = bento \?\? approvedBentoEnabled/)
  assert.match(TEAM, /<TeamBentoView/)
  assert.match(TEAM, /Your firm members and workload/) // legacy retained
})
test('TEAM-4/5: existing auth reset action + admin gate preserved (auth unchanged)', () => {
  assert.match(TEAM, /onReset=\{handleReset\}/)
  assert.match(TEAM, /resetPasswordForEmail/)           // existing auth call unchanged
  assert.match(TEAM, /isAdmin=\{isAdmin\}/)
  assert.match(TMVIEW, /isAdmin && m\.is_active &&[\s\S]*?onReset\(m\)/) // reset only for admins
})
test('TEAM-2/3: search + role + status filters wired; presentational view', () => {
  assert.match(TEAM, /search=\{search\} onSearch=\{setSearch\}/)
  assert.match(TEAM, /fRole=\{fRole\} onRole=\{setFRole\} roles=\{roles\}/)
  assert.match(TEAM, /fStatus=\{fStatus\} onStatus=\{setFStatus\}/)
  assert.doesNotMatch(TMVIEW, /supabase/i)
  assert.doesNotMatch(TMVIEW, EMOJI)
})
test('TEAM (behavioural): filter by name/email + role + status', () => {
  const team = [
    { name: 'Priya Sharma', email: 'priya@x.com', role: 'Manager', is_active: true },
    { name: 'Rohit Verma', email: 'rohit@x.com', role: 'Associate', is_active: false },
  ]
  const f = (m, { search = '', fRole = 'All', fStatus = 'All' }) => {
    if (fStatus === 'Active' && !m.is_active) return false
    if (fStatus === 'Inactive' && m.is_active) return false
    if (fRole !== 'All' && (m.role || '') !== fRole) return false
    if (search.trim() && !`${m.name} ${m.email} ${m.role}`.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  }
  assert.equal(team.filter(m => f(m, { search: 'priya' })).length, 1)
  assert.equal(team.filter(m => f(m, { fRole: 'Manager' })).length, 1)
  assert.equal(team.filter(m => f(m, { fStatus: 'Active' })).length, 1)
  assert.equal(team.filter(m => f(m, {})).length, 2)
})

// ── PLACEHOLDER SHELLS (Templates / Knowledge / Settings) ────────────────────
test('PLACE-1: BentoApp renders an honest placeholder for the Settings module', () => {
  // Templates/Knowledge Hub were removed from the primary nav (no module yet); Settings
  // remains the only placeholder, under the Admin group.
  assert.match(APP, /const COMING = new Set\(\['settings'\]\)/)
  assert.match(APP, /<ModulePlaceholder \{\.\.\.p\} profile=\{tab === 'settings' \? activeUser : null\}/)
  assert.match(APP, /settings: \{ title:/)
  assert.doesNotMatch(APP, /templates: \{ title:/)
  assert.doesNotMatch(APP, /knowledge: \{ title:/)
})
test('PLACE-2: placeholder is honest — read-only, no faked toggles/functionality', () => {
  assert.doesNotMatch(PLACE, /supabase/i)
  assert.doesNotMatch(PLACE, EMOJI)
  assert.match(PLACE, /Read-only — from your signed-in account/)
  assert.match(PLACE, /coming in a later phase/)
  assert.doesNotMatch(PLACE, /<input|<select|type="checkbox"/) // no fake controls
})

// ── SHELL / GLOBAL SEARCH WORDING ────────────────────────────────────────────
test('SHELL-1: header search placeholder honestly reflects Clients-only routing', () => {
  assert.match(SHELL, /placeholder="Search clients…"/)
  assert.doesNotMatch(SHELL, /Search clients, tasks, documents/)
})
test('SHELL-2: single-source Clients search preserved (no handoff regression)', () => {
  assert.match(APP, /const \[clientsSearch, setClientsSearch\] = useState\(''\)/)
  assert.doesNotMatch(APP, /pendingSearch|searchNonce|consumedSearchId/)
})
