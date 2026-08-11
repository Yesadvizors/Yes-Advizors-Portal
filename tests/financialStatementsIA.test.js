/**
 * IA package — Client 360 Financials (Balance Sheet / P&L) + tab structure. node:test.
 * Pure-helper unit tests + static guards. No fabrication: honest empty state when no
 * structured client_financials row exists; source documents shown via readiness.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { inr, hasStructuredValues, BALANCE_SHEET, PROFIT_AND_LOSS, byFy } from '../src/lib/financialStatements.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const WS = strip(read('src/components/client360/Client360Workspace.jsx'))
const SECTIONS = strip(read('src/components/client360/Client360Sections.jsx'))
const STMT = strip(read('src/components/client360/FinancialStatements.jsx'))
const READS = strip(read('src/services/client360Reads.js'))

// ── Pure helpers ─────────────────────────────────────────────────────────────
test('FS-inr: Indian ₹ formatting; null for empty, never fabricates 0', () => {
  assert.equal(inr(1234567), '₹12,34,567')
  assert.equal(inr(-5000), '(₹5,000)')
  assert.equal(inr(null), null)
  assert.equal(inr(''), null)
  assert.equal(inr('abc'), null)
  assert.equal(inr(0), '₹0') // a real 0 is a value; only null/'' are "unavailable"
})
test('FS-structured: hasStructuredValues true only when a real monetary value exists', () => {
  assert.equal(hasStructuredValues(null), false)
  assert.equal(hasStructuredValues({ fy_label: '2025-26' }), false)      // shell row, no money
  assert.equal(hasStructuredValues({ fy_label: '2025-26', reviewed: true }), false)
  assert.equal(hasStructuredValues({ turnover: 1000000 }), true)
  assert.equal(hasStructuredValues({ total_assets: 5000000 }), true)
})
test('FS-layout: Balance Sheet balances to TOTAL ASSETS / TOTAL EQUITY & LIABILITIES; P&L ends at PAT', () => {
  const flat = BALANCE_SHEET.flatMap(g => g.lines)
  assert.ok(flat.some(l => l.key === 'total_assets' && l.grandTotal))
  assert.ok(flat.some(l => l.key === 'total_liabilities' && l.grandTotal))
  assert.equal(PROFIT_AND_LOSS.at(-1).key, 'pat')
  assert.ok(PROFIT_AND_LOSS.some(l => l.key === 'ebitda'))
})
test('FS-fy: byFy sorts newest-first and indexes by label (prior-year comparison)', () => {
  const { list, byLabel } = byFy([{ fy_label: '2024-25' }, { fy_label: '2026-27' }, { fy_label: '2025-26' }])
  assert.deepEqual(list.map(r => r.fy_label), ['2026-27', '2025-26', '2024-25'])
  assert.ok(byLabel['2025-26'])
})

// ── Honest empty state + no fabrication ──────────────────────────────────────
test('FS-honest: renders an explicit not-available state and never invents values', () => {
  assert.match(STMT, /not yet available/)
  assert.match(STMT, /hasStructuredValues\(current\)/)
  assert.match(STMT, /\?\? '—'/)                       // missing field → dash, not 0
  assert.doesNotMatch(STMT, /Math\.random|placeholder.*\d{4,}/)
})

// ── Architecture: Financials = analysis; Documents = files; no duplicate repository ──
test('FS-arch: Financials reads client_financials (analysis) + shows source-document readiness', () => {
  assert.match(READS, /readClientFinancialStatementsWith/)
  assert.match(READS, /from\('client_financials'\)/)
  assert.match(SECTIONS, /<FinancialStatements panel=\{statementsPanel\}/)
  assert.match(SECTIONS, /Source financial documents/)   // source docs kept separate
  assert.doesNotMatch(STMT, /secure-docs|storage\.from/)  // presentation only, no file storage here
})

// ── Client 360 tab structure (Part 5) ────────────────────────────────────────
test('C360-tabs: order + People/Activity labels; Financials present', () => {
  assert.match(WS, /id: 'financials', label: 'Financials'/)
  assert.match(WS, /id: 'team', label: 'People'/)        // RBAC lives under Admin, not here
  assert.match(WS, /id: 'activity', label: 'Activity'/)
  // documents precedes financials (evidence → analysis)
  const docIdx = WS.indexOf("id: 'documents'")
  const finIdx = WS.indexOf("id: 'financials'")
  assert.ok(docIdx > 0 && finIdx > docIdx, 'Documents tab precedes Financials tab')
})
