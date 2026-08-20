/**
 * D16-A — Financial workflow closure (manual + local-assisted review). node:test.
 *
 * Pure tests for the review helpers (financialReview.js) + OD-5 static source guards proving the
 * review opens WITHOUT the external extractor, populates reviewed_by/at, UPSERTs client_financials,
 * flips the FINANCIAL status only (not compliance filing / document readiness), uses no external
 * AI / Edge / service-role, and adds no new DB schema.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import {
  buildManualFields, mapToClientFinancials, financialReviewWarnings, parseNum, parseBool,
  FIELDS_BY_DOC_TYPE, CF_NUMERIC, CF_TEXT, CF_BOOL,
} from '../src/lib/financialReview.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const COMP = read('src/components/Compliance.jsx') // raw (image/* comment breaks strip)
const LIB = strip(read('src/lib/financialReview.js'))

// ── manual field set (opens without extraction) ──────────────────────────────
test('D16-2,3: manual field set built per doc type, seeded from saved client_financials', () => {
  const bs = buildManualFields('Audited Balance Sheet', {})
  assert.ok(bs.length > 20)
  assert.ok(bs.every(f => f.id === null && f.manual === true && f.extraction_engine === 'manual' && f.confidence_score === 'Manual'))
  assert.ok(bs.find(f => f.field_name === 'turnover') && bs.find(f => f.field_name === 'total_assets') && bs.find(f => f.field_name === 'udin'))
  // seeded from an existing saved row
  const seeded = buildManualFields('ITR Form', { taxable_income: 500000, tax_paid: 90000 })
  assert.equal(seeded.find(f => f.field_name === 'taxable_income').final_value, '500000')
  // TAR includes tax_audit_applicable as Yes/No
  const tar = buildManualFields('Tax Audit Report (TAR)', { tax_audit_applicable: true })
  assert.equal(tar.find(f => f.field_name === 'tax_audit_applicable').final_value, 'Yes')
})

// ── value parsing (blanks allowed; never fabricated) ─────────────────────────
test('D16-16: blanks → null; numbers parsed; junk → null; bool parsed', () => {
  assert.equal(parseNum(''), null)
  assert.equal(parseNum('₹1,23,456'), 123456)
  assert.equal(parseNum('-50.5'), -50.5)
  assert.equal(parseNum('n/a'), null)
  assert.equal(parseBool(''), null)
  assert.equal(parseBool('Yes'), true)
  assert.equal(parseBool('no'), false)
})

// ── map to client_financials (final reviewed values; correction overwrites) ──
test('D16-6,7,17: entries → client_financials payload; edited value overrides; blanks null', () => {
  const cf = mapToClientFinancials([
    { field_name: 'turnover', value: '1000000' },
    { field_name: 'pat', value: '' },            // blank → null (unavailable)
    { field_name: 'auditor_name', value: 'A B & Co' },
    { field_name: 'tax_audit_applicable', value: 'Yes' },
    { field_name: 'not_a_column', value: 'x' },    // ignored — existing columns only
  ])
  assert.equal(cf.turnover, 1000000)
  assert.equal(cf.pat, null)
  assert.equal(cf.auditor_name, 'A B & Co')
  assert.equal(cf.tax_audit_applicable, true)
  assert.ok(!('not_a_column' in cf))
  // correction overwrites a prior value
  assert.equal(mapToClientFinancials([{ field_name: 'turnover', value: '999' }]).turnover, 999)
})

// ── non-blocking accounting cross-checks ─────────────────────────────────────
test('D16-15: cross-check warnings fire on mismatch, silent when matching/missing', () => {
  assert.equal(financialReviewWarnings({ total_assets: 100, total_liabilities: 100 }).length, 0)
  assert.ok(financialReviewWarnings({ total_assets: 100, total_liabilities: 80 })[0].includes('Total Assets'))
  assert.ok(financialReviewWarnings({ pbt: 100, tax_expense: 30, pat: 60 })[0].includes('PAT'))
  assert.ok(financialReviewWarnings({ equity_capital: 10, reserves: 40, net_worth: 100 })[0].includes('Net Worth'))
  assert.deepEqual(financialReviewWarnings({ total_assets: 100 }), []) // missing counterpart → no false warning
  assert.deepEqual(financialReviewWarnings({}), [])
})

// ── only existing client_financials columns are targeted (no new schema) ─────
test('D16-21: field sets reference EXISTING client_financials columns only', () => {
  const known = new Set([...CF_NUMERIC, ...CF_TEXT, ...CF_BOOL])
  for (const [, list] of Object.entries(FIELDS_BY_DOC_TYPE)) {
    for (const fn of list) assert.ok(known.has(fn), `${fn} must be an existing client_financials column`)
  }
})

// ── static wiring guards on Compliance.jsx ───────────────────────────────────
test('D16-1: Review / Enter opens WITHOUT requiring extraction (not gated on extraction_status)', () => {
  assert.match(COMP, /Review \/ Enter/)
  // review button condition keys off document_id + doc_type, NOT extraction_status!=='pending'
  assert.match(COMP, /canUpload && r\.document_id && \['Audited Balance Sheet'/)
  assert.match(COMP, /buildManualFields\(row\.doc_type/)
})
test('D16-4,5: reviewed_by + reviewed_at populated on confirm', () => {
  assert.match(COMP, /const reviewer = user\?\.name \|\| user\?\.email \|\| 'Unknown'/)
  assert.match(COMP, /reviewed: true, reviewed_by: reviewer, reviewed_at: nowIso/)
})
test('D16-7,8: client_financials UPSERT on (client_id,fy_label); manual rows inserted into extracted_document_data', () => {
  assert.match(COMP, /from\('client_financials'\)\.upsert\(cfPayload, \{ onConflict: 'client_id,fy_label' \}\)/)
  assert.match(COMP, /from\('extracted_document_data'\)\.insert\(\{/)
  assert.match(COMP, /extraction_engine: 'manual'/)
  assert.match(COMP, /source_document_id: row\.document_id/)
})
test('D16-9: financials_tracker flips to Reviewed (financial status only)', () => {
  assert.match(COMP, /from\('financials_tracker'\)\.update\(\{ status: 'Reviewed', extraction_status: 'reviewed' \}\)/)
})
test('D16-10,11: does NOT touch compliance filing status or document readiness', () => {
  // the review save must not write compliance_calendar, nor link/replace documents
  const save = COMP.slice(COMP.indexOf('async function handleConfirm'), COMP.indexOf('async function handleConfirm') + 2600)
  assert.doesNotMatch(save, /compliance_calendar|document_link|document_replace|mark.*filed/i)
})
test('D16-19,20: manual review uses NO external Edge / AI / service-role', () => {
  // the MANUAL review path is FinancialReviewModal (ends where FinancialsTab begins); the
  // historical external-extraction code lives in FinancialsTab and is intentionally retained.
  const modal = COMP.slice(COMP.indexOf('function FinancialReviewModal'), COMP.indexOf('function FinancialsTab'))
  assert.doesNotMatch(modal, /extract-financial|functions\.invoke|SUPABASE_FUNCTIONS_URL|claude|mistral|openai/i)
  assert.doesNotMatch(modal, /service_role|SUPABASE_SERVICE/)
  assert.doesNotMatch(LIB, /supabase|fetch|service_role|claude|mistral|openai/i)
})
test('D16-22: review write gated by the existing canUpload permission', () => {
  assert.match(COMP, /canUpload && r\.document_id && \['Audited Balance Sheet'/)
})
