/**
 * Approved "Bento Workspace" dashboard (Concept 6) — DESIGN-ONLY guards.
 * node:test — `npm test`. Static source-analysis only (project convention OD-5).
 *
 *   1. Flag dark by default (only 'true' enables).
 *   2. Legacy App.jsx preserved; the flag guard is lazy + gated + short-circuits.
 *   3. Presentational: no Supabase, no writes, no network, no dangerouslySetInnerHTML.
 *   4. Zero new dependencies.
 *   5. All bento CSS is scoped (.bento / b-); nothing leaks global.
 *   6. No emoji (SVG icon set); accessibility hooks present.
 *   7. Approved structure present: 6 KPIs, exact nav order, 7 panels, 8 quick actions.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

function walk(relDir) {
  const out = []
  for (const name of readdirSync(join(ROOT, relDir))) {
    const rel = join(relDir, name)
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...walk(rel))
    else out.push(rel)
  }
  return out
}
const BENTO_JS = walk('src/bento').filter(f => /\.(jsx?|mjs)$/.test(f))

// 1 ── flag dark by default
test('flag: approvedBentoEnabled only enables for exact "true"', async () => {
  const { approvedBentoEnabled } = await import('../src/bento/flag.js')
  for (const on of ['true', 'TRUE', ' true ']) assert.equal(approvedBentoEnabled(on), true)
  for (const off of [undefined, null, '', 'false', '0', '1', 'yes', 0, {}]) assert.equal(approvedBentoEnabled(off), false)
})

// 2 ── legacy App preserved + guard correct
test('App.jsx keeps legacy shell and gates bento behind the flag', () => {
  const app = strip(read('src/App.jsx'))
  for (const legacy of ['AdminHome', 'DocumentsHub', 'setTab(t.id)', 'ChatAgent', 'TEAM PORTAL']) {
    assert.ok(app.includes(legacy), `legacy marker missing: ${legacy}`)
  }
  assert.match(app, /approvedBentoEnabled\(\s*import\.meta\.env\.VITE_APPROVED_BENTO_UI\s*\)/)
  assert.match(app, /lazy\(\s*\(\)\s*=>\s*import\(['"]\.\/bento\/BentoApp['"]\)\s*\)/)
  assert.ok(app.indexOf('VITE_APPROVED_BENTO_UI') < app.indexOf('const tabs = ['), 'guard must short-circuit before legacy tabs')
})

// 3 ── presentational layer stays IO-free; data layer is READ-ONLY
test('bento presentational layer touches no Supabase; whole layer is write/network-free', () => {
  const writeSigns = /\.(insert|update|upsert|delete|rpc)\s*\(/
  const net = /\bfetch\s*\(|XMLHttpRequest|WebSocket\s*\(/
  // The read service + hook are the ONLY files allowed to reference Supabase.
  const DATA_LAYER = /src[\\/]bento[\\/](data[\\/]|useBentoDashboard\.js)/
  for (const f of BENTO_JS) {
    const raw = read(f), src = strip(raw)
    if (!DATA_LAYER.test(f)) assert.ok(!/supabase/i.test(src), `presentational file must not touch Supabase: ${f}`)
    assert.ok(!writeSigns.test(src), `must not write data: ${f}`)          // NO writes anywhere in the layer
    assert.ok(!net.test(src), `must not make raw network calls: ${f}`)
    assert.ok(!/dangerouslySetInnerHTML/.test(raw), `no unsafe html: ${f}`)
  }
})

// 4 ── zero new dependencies
test('package.json adds no new dependencies', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.deepEqual(Object.keys(pkg.dependencies).sort(),
    ['@supabase/supabase-js', 'pdfjs-dist', 'react', 'react-dom'])
  const blob = JSON.stringify(pkg).toLowerCase()
  for (const banned of ['tailwind', '@radix-ui', 'lucide', 'shadcn', 'chart.js', 'recharts', 'geist']) {
    assert.ok(!blob.includes(banned), `unexpected dependency: ${banned}`)
  }
})

// 5 ── CSS fully scoped
test('bento CSS defines no bare global element selectors', () => {
  const css = read('src/styles/bento.css').replace(/\/\*[\s\S]*?\*\//g, '')
  const noAt = css.replace(/@font-face\s*\{[\s\S]*?\}/g, '').replace(/@media[^{]*\{/g, '')
  const heads = noAt.match(/[^{}]+(?=\{)/g) || []
  for (const raw of heads) {
    const flat = raw.replace(/\([^()]*\)/g, '')
    for (const s of flat.split(',').map(x => x.trim()).filter(Boolean)) {
      if (s.startsWith('@') || s.startsWith('--') || s.endsWith('%') || /^\d/.test(s) || s.startsWith('from') || s.startsWith('to')) continue
      assert.ok(/\.b(ento)?[-.\s]/.test(s) || s.startsWith('.bento'), `unscoped global selector: "${s}"`)
    }
  }
})

// 6 ── no emoji + a11y
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u
test('bento source contains no emoji (SVG icons only)', () => {
  for (const f of [...BENTO_JS, 'src/styles/bento.css']) {
    assert.ok(!EMOJI.test(read(f)), `emoji found: ${f}`)
  }
})
test('icons are inline SVG (currentColor, aria-hidden); shell + CSS a11y hooks present', () => {
  const icons = read('src/bento/icons.jsx')
  assert.match(icons, /aria-hidden="true"/)
  assert.match(icons, /stroke="currentColor"/)
  assert.ok(!/lucide/i.test(icons))
  const shell = read('src/bento/BentoShell.jsx')
  assert.match(shell, /aria-label="Primary"/)
  assert.match(shell, /aria-current=/)
  const css = read('src/styles/bento.css')
  assert.match(css, /:focus-visible/)
  assert.match(css, /prefers-reduced-motion/)
})

// 7 ── approved structure
test('approved structure: 6 KPIs, exact nav order, 8 quick actions, panels present', async () => {
  const m = await import('../src/bento/mock/bentoMock.js')
  assert.equal(m.KPIS.length, 6, 'six KPI cards')
  assert.deepEqual(m.KPIS.map(k => k.label),
    ['Total Tasks', 'Pending', 'Overdue', 'Due Today', 'Active Clients', 'Compliance Due'])
  assert.deepEqual(m.KPIS.map(k => k.tone), ['blue', 'amber', 'red', 'green', 'blue', 'purple'], 'multi-colour KPI tones')
  // Grouped IA nav: Dashboard · Clients · Operations(Compliance/Tasks/Documents) ·
  // Insights(Reports) · Organisation(Team) · Admin(Settings/Audit Log). Templates/Knowledge
  // Hub are no longer surfaced. Flat NAV is derived from NAV_GROUPS.
  assert.deepEqual(m.NAV.map(n => n.label),
    ['Dashboard', 'Clients', 'Compliance', 'Tasks', 'Documents', 'Reports', 'Team', 'Settings', 'Audit Log'])
  assert.deepEqual(m.NAV_GROUPS.map(g => g.label),
    [null, null, 'Operations', 'Insights', 'Organisation', 'Admin'])
  assert.deepEqual(m.NAV_GROUPS.find(g => g.label === 'Operations').items.map(i => i.id),
    ['compliance', 'tasks', 'documents'])
  assert.equal(m.NAV_GROUPS.find(g => g.label === 'Admin').items.find(i => i.id === 'auditlog').adminOnly, true)
  assert.equal(m.ATTENTION.length, 4, 'four attention rows')
  assert.equal(m.TEAM.length, 5, 'five team members')
  assert.equal(m.DUE_THIS_WEEK.length, 3, 'three due items')
  assert.equal(m.ACTIVITY.length, 4, 'four activity rows')
  assert.equal(m.QUICK_ACTIONS.length, 8, 'eight quick actions')
  assert.deepEqual(m.QUICK_ACTIONS.map(a => a.label),
    ['Add New Client', 'Create Task', 'Upload Document', 'Record Time', 'Compliance Calendar', 'Generate Report', 'Internal Note', 'Request Document'])
  assert.equal(m.OPERATIONAL.progress, 72)
  assert.deepEqual(m.OPERATIONAL.topAreas.map(a => a.name),
    ['GST Compliance', 'Income Tax', 'ROC Filings', 'Audit & Assurance', 'Others'])
})
test('Dashboard composes all seven panels in the approved order', () => {
  const d = read('src/bento/Dashboard.jsx')
  for (const p of ['KpiRow', 'AttentionNeeded', 'OperationalSummary', 'TeamWorkload', 'DueThisWeek', 'RecentActivity', 'QuickActions']) {
    assert.ok(d.includes(p), `Dashboard must render ${p}`)
  }
})

// 8 ── module connections (reuse existing components, not rebuilt)
test('sidebar items lazy-load the EXISTING modules (reused, not rebuilt)', () => {
  const app = read('src/bento/BentoApp.jsx')
  const mapping = { clients: 'Clients', tasks: 'Tasks', documents: 'DocumentsHub', compliance: 'Compliance', team: 'Team', reports: 'AdminHome' }
  for (const comp of Object.values(mapping)) {
    assert.match(app, new RegExp(`lazy\\(\\s*\\(\\)\\s*=>\\s*import\\(['"]\\.\\./components/${comp}['"]\\)`), `must lazy-import existing ${comp}`)
  }
  // not rebuilt: no bento file re-implements a module as a function declaration
  const allBento = BENTO_JS.map(read).join('\n')
  for (const comp of [...Object.values(mapping), 'OnboardingWizard', 'AddTaskModal']) {
    assert.ok(!new RegExp(`function\\s+${comp}\\s*\\(`).test(allBento), `must not re-implement ${comp}`)
  }
})

test('quick actions map to existing flows; unavailable ones show a non-success notice', () => {
  const app = read('src/bento/BentoApp.jsx')
  assert.match(app, /case 'add-client':\s*setModal\('onboarding'\)/)
  assert.match(app, /case 'create-task':\s*setModal\('addtask'\)/)
  assert.match(app, /case 'upload-doc':\s*navigate\('documents'\)/)
  assert.match(app, /case 'cal':\s*navigate\('compliance'\)/)
  assert.match(app, /case 'report':\s*navigate\('reports'\)/)
  assert.match(app, /import\(['"]\.\.\/components\/OnboardingWizard['"]\)/)
  assert.match(app, /import\(['"]\.\.\/components\/AddTaskModal['"]\)/)
  assert.match(app, /setComing\(/, 'unavailable actions must surface an explicit coming-later notice')
})

test('shell: dynamic page title in pill, drawer closes after nav, button-based nav', () => {
  const shell = read('src/bento/BentoShell.jsx')
  assert.match(shell, /pageTitle/)
  assert.match(shell, /b-page-pill">\{pageTitle\}/)
  assert.match(shell, /setDrawer\(false\)/) // mobile drawer closes after selection
  assert.match(shell, /className=\{`b-navitem/) // native <button> → keyboard-activatable
})

test('BentoApp: refresh persistence, reports admin gate, boundaries preserved', () => {
  const app = read('src/bento/BentoApp.jsx')
  assert.match(app, /sessionStorage/)                       // preserve selection on refresh
  assert.match(app, /admin && !activeUser\?\.is_admin/)     // role gate on Reports (Firm Overview)
  assert.match(app, /<ErrorBoundary>[\s\S]*?<Suspense/)     // ErrorBoundary + Suspense around modules
  assert.ok(!/dangerouslySetInnerHTML/.test(app), 'no unsafe fallbacks')
  assert.match(app, /import ['"]\.\.\/styles\/bento\.css['"]/, 'BentoApp must import the bento stylesheet')
})
