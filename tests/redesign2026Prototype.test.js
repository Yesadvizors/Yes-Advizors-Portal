/**
 * 2026 Premium Redesign Prototype — DESIGN-ONLY guards. node:test — `npm test`.
 *
 * Static source-analysis only (project convention OD-5: no jsdom/RTL). These
 * lock in the prototype's core promises so it cannot silently violate them:
 *   1. The feature flag is DARK BY DEFAULT (only 'true' enables).
 *   2. Legacy App.jsx behaviour is preserved; the flag guard is lazy + gated.
 *   3. The prototype is presentational: no Supabase, no writes, no live reads.
 *   4. Zero new dependencies were added.
 *   5. All redesign CSS is scoped (rd-prefixed / .rd-app); nothing leaks global.
 *   6. No emoji in the redesign (SVG icon set instead); accessibility hooks present.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

function walk(relDir) {
  const abs = join(ROOT, relDir)
  const out = []
  for (const name of readdirSync(abs)) {
    const rel = join(relDir, name)
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...walk(rel))
    else out.push(rel)
  }
  return out
}

const REDESIGN_JS = [
  ...walk('src/redesign'),
  ...walk('src/components/ui/redesign'),
].filter(f => /\.(jsx?|mjs)$/.test(f))

// ── 1. Flag is dark by default ──────────────────────────────────────────────
test('flag: redesignEnabled only enables for the exact string "true"', async () => {
  const { redesignEnabled } = await import('../src/redesign/flag.js')
  // Enabled
  for (const on of ['true', 'TRUE', 'True', ' true ']) assert.equal(redesignEnabled(on), true, `expected ${JSON.stringify(on)} → true`)
  // Dark by default
  for (const off of [undefined, null, '', 'false', 'FALSE', '0', '1', 'yes', 'on', 0, 1, {}]) {
    assert.equal(redesignEnabled(off), false, `expected ${JSON.stringify(off)} → false`)
  }
})

// ── 2. Legacy App.jsx preserved + flag guard correct ────────────────────────
test('App.jsx keeps the legacy shell and gates the redesign behind the flag', () => {
  const app = stripComments(read('src/App.jsx'))
  // Legacy shell still present (unchanged behaviour when flag off)
  for (const legacy of ['AdminHome', 'Dashboard', 'DocumentsHub', 'setTab(t.id)', 'ChatAgent', 'TEAM PORTAL']) {
    assert.ok(app.includes(legacy), `legacy shell marker missing: ${legacy}`)
  }
  // Flag guard uses the helper + the documented env var
  assert.match(app, /redesignEnabled\(\s*import\.meta\.env\.VITE_REDESIGN_2026\s*\)/, 'flag guard must read VITE_REDESIGN_2026 via redesignEnabled')
  // Redesign is lazy-loaded so it stays out of the default bundle when dark
  assert.match(app, /lazy\(\s*\(\)\s*=>\s*import\(['"]\.\/redesign\/RedesignApp['"]\)\s*\)/, 'RedesignApp must be React.lazy-imported')
  // The guard returns BEFORE the legacy tabs array is built
  assert.ok(
    app.indexOf('VITE_REDESIGN_2026') < app.indexOf('const tabs = ['),
    'flag guard must short-circuit before the legacy tabs render'
  )
})

// ── 3. Presentational only: no Supabase, no writes, no live reads ───────────
test('redesign is presentational — no Supabase import anywhere', () => {
  for (const f of REDESIGN_JS) {
    const src = read(f)
    assert.ok(!/from\s+['"].*supabase['"]/.test(src) && !/supabase/i.test(stripComments(src)),
      `redesign file must not touch Supabase: ${f}`)
  }
})

test('redesign performs no data writes or network calls', () => {
  const writeSigns = /\.(insert|update|upsert|delete|rpc)\s*\(/
  const net = /\bfetch\s*\(|XMLHttpRequest|WebSocket\s*\(/
  for (const f of REDESIGN_JS) {
    const src = stripComments(read(f))
    assert.ok(!writeSigns.test(src), `redesign must not write data: ${f}`)
    assert.ok(!net.test(src), `redesign must not make network calls: ${f}`)
  }
})

test('no dangerouslySetInnerHTML in redesign components', () => {
  for (const f of REDESIGN_JS) {
    assert.ok(!/dangerouslySetInnerHTML/.test(read(f)), `unsafe HTML injection in ${f}`)
  }
})

// ── 4. Zero new dependencies ────────────────────────────────────────────────
test('package.json adds no new dependencies for the prototype', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.deepEqual(
    Object.keys(pkg.dependencies).sort(),
    ['@supabase/supabase-js', 'pdfjs-dist', 'react', 'react-dom'],
    'runtime dependencies must be unchanged'
  )
  const blob = JSON.stringify(pkg).toLowerCase()
  for (const banned of ['tailwind', '@radix-ui', 'lucide', 'shadcn', 'geist', 'styled-components', 'emotion']) {
    assert.ok(!blob.includes(banned), `unexpected styling dependency present: ${banned}`)
  }
})

// ── 5. CSS is fully scoped — nothing leaks to the global document ────────────
test('redesign CSS never defines bare global element selectors', () => {
  const css = read('src/styles/redesign-2026.css').replace(/\/\*[\s\S]*?\*\//g, '')
  // Every top-level selector must be an at-rule, or scoped by .rd-app / .rd- .
  const withoutAtRules = css
    .replace(/@font-face\s*\{[\s\S]*?\}/g, '')
    .replace(/@keyframes[\s\S]*?\}\s*\}/g, '')
    .replace(/@media[^{]*\{/g, '') // keep inner rules, they are still rd-scoped
  // Grab selector heads (text before each `{`) and check they are all rd-scoped.
  const heads = withoutAtRules.match(/[^{}]+(?=\{)/g) || []
  for (const raw of heads) {
    // Drop functional-pseudo groups so their inner commas don't split selectors,
    // e.g. :where(button, a, input) or :not(...).
    const flattened = raw.replace(/\([^()]*\)/g, '')
    const sel = flattened.split(',').map(s => s.trim()).filter(Boolean)
    for (const s of sel) {
      if (!s || s.startsWith('--') || s.endsWith('%') || /^\d/.test(s)) continue // token/keyframe stop
      assert.ok(/\.rd-/.test(s) || s.startsWith('from') || s.startsWith('to'),
        `unscoped global selector in redesign CSS: "${s}"`)
    }
  }
})

test('redesign CSS defines the self-hosted Geist face and system fallback', () => {
  const css = read('src/styles/redesign-2026.css')
  assert.match(css, /@font-face\s*\{[^}]*font-family:\s*'Geist'/, 'Geist @font-face missing')
  assert.match(css, /--rd-font:\s*'Geist'[^;]*sans-serif/, 'Geist must have a system fallback stack')
})

// ── 6. No emoji; SVG icon set + accessibility hooks present ──────────────────
// Genuine emoji ranges only. Deliberately excludes arrows (U+2190–21FF) and
// geometric shapes (U+25xx like ▲▼) — those are typographic glyphs, not the
// informal emoji icons the brief asks us to avoid.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u
test('redesign source contains no emoji (uses the inline SVG icon set)', () => {
  for (const f of [...REDESIGN_JS, 'src/styles/redesign-2026.css']) {
    assert.ok(!EMOJI.test(read(f)), `emoji found in redesign source: ${f}`)
  }
})

test('icon set is inline SVG with aria-hidden and currentColor', () => {
  const icons = read('src/components/ui/redesign/icons.jsx')
  assert.match(icons, /aria-hidden="true"/, 'icons must be aria-hidden')
  assert.match(icons, /stroke="currentColor"/, 'icons must inherit colour via currentColor')
  assert.ok(!/lucide-react/.test(icons), 'must not import lucide-react')
})

test('accessibility hooks present in shell + CSS', () => {
  const shell = read('src/redesign/RedesignShell.jsx')
  assert.match(shell, /aria-label="Primary"/, 'primary nav must be labelled')
  assert.match(shell, /aria-current=/, 'active nav item must expose aria-current')
  const css = read('src/styles/redesign-2026.css')
  assert.match(css, /:focus-visible/, 'visible keyboard focus styles required')
  assert.match(css, /prefers-reduced-motion/, 'reduced-motion support required')
})

// ── 7. Prototype pages are wired into the shell ─────────────────────────────
test('RedesignApp routes the three flagship prototype pages', () => {
  const appc = read('src/redesign/RedesignApp.jsx')
  for (const page of ['DashboardPrototype', 'ClientMasterPrototype', 'Client360Prototype']) {
    assert.ok(appc.includes(page), `RedesignApp must render ${page}`)
  }
})
