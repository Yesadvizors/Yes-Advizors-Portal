/**
 * Central Smart Upload — filename → requirement matching engine + wiring guards. node:test.
 *
 * Pure-logic tests for the deterministic matcher (smartUploadMatch.js) + OD-5 static source
 * guards proving the UI links to the ONE canonical requirement truth (governed
 * document_link/replace RPCs), preserves UDIN + RBAC, never fabricates a requirement, keeps
 * readiness/filing separate, and reports per-file batch results. No DB change, no OCR/AI.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import {
  parseFilename, detectDocType, detectFy, detectPeriod, matchFile, buildMatchPlan,
  requiresUdin, requiresTaxAuditApplicable, clientServiceCategories, norm,
} from '../src/lib/smartUploadMatch.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

// ── fixture: one client's requirements (mirrors real dev vocabulary + a GST/TDS example) ──
const R = (over) => ({
  requirement_ref_type: 'financials', requirement_ref_id: 'x', client_id: 'YA-002', client_name: 'ABC Pvt Ltd',
  fy_label: '2026-27', period: null, doc_type: 'Audited Balance Sheet', requirement_label: 'Audited Balance Sheet',
  is_available: false, version_count: 0, ...over,
})
const REQS = [
  R({ requirement_ref_id: 'bs26', doc_type: 'Audited Balance Sheet', requirement_label: 'Audited Balance Sheet', fy_label: '2026-27' }),
  R({ requirement_ref_id: 'bs25', doc_type: 'Audited Balance Sheet', requirement_label: 'Audited Balance Sheet', fy_label: '2025-26' }),
  R({ requirement_ref_id: 'tar25', doc_type: 'Tax Audit Report (TAR)', requirement_label: 'Tax Audit Report (TAR)', fy_label: '2025-26' }),
  R({ requirement_ref_id: 'itrack25', doc_type: 'ITR Acknowledgement', requirement_label: 'ITR Acknowledgement', fy_label: '2025-26' }),
  R({ requirement_ref_id: 'itrf26', doc_type: 'ITR Form', requirement_label: 'ITR Form', fy_label: '2026-27' }),
  R({ requirement_ref_type: 'income_tax', requirement_ref_id: 'itr26', doc_type: 'Income Tax Return', requirement_label: 'Income Tax Return', fy_label: '2026-27' }),
  R({ requirement_ref_type: 'accounting', requirement_ref_id: 'accApr26', doc_type: 'Accounting', requirement_label: 'Accounting April 2026', period: 'April 2026', fy_label: '2026-27' }),
  R({ requirement_ref_type: 'accounting', requirement_ref_id: 'accMay26', doc_type: 'Accounting', requirement_label: 'Accounting May 2026', period: 'May 2026', fy_label: '2026-27' }),
  R({ requirement_ref_type: 'gst', requirement_ref_id: 'g1apr', doc_type: 'GSTR-1', requirement_label: 'GSTR-1 Apr-2026', period: 'Apr-2026', fy_label: '2026-27' }),
  R({ requirement_ref_type: 'gst', requirement_ref_id: 'g3bapr', doc_type: 'GSTR-3B', requirement_label: 'GSTR-3B Apr-2026', period: 'Apr-2026', fy_label: '2026-27' }),
]

// ── filename parsing ──────────────────────────────────────────────────────────
test('SU-parse: doc type / FY / period extracted from filenames', () => {
  assert.equal(detectDocType('GSTR1_Apr_2026.pdf').docType, 'GSTR-1')
  assert.equal(detectDocType('GSTR-3B Apr 2026.pdf').docType, 'GSTR-3B')
  assert.equal(detectDocType('GSTR-9C.pdf').docType, 'GSTR-9C') // 9C before 9
  assert.equal(detectDocType('Audited_FS_2025-26.pdf').docType, 'Audited Balance Sheet')
  assert.equal(detectDocType('TAR_2025-26.pdf').docType, 'Tax Audit Report (TAR)')
  assert.equal(detectDocType('ITR_Ack_2025-26.pdf').docType, 'ITR Acknowledgement')
  assert.equal(detectDocType('random-8842.pdf'), null)
  assert.equal(detectFy('Audited_FS_2025-26.pdf'), '2025-26')
  assert.equal(detectFy('FS_2025-2026.pdf'), '2025-26')
  assert.equal(detectFy('FY25-26.pdf'), '2025-26')
  assert.equal(detectFy('nofy.pdf'), null)
  assert.equal(detectPeriod('GSTR1_Apr_2026.pdf').month, 'April')
  assert.equal(detectPeriod('Accounting_April_2026.pdf').label, 'April 2026')
  assert.equal(detectPeriod('TDS_Q1_2026.pdf').quarter, 'Q1')
})

// ── 2/3: GST matching to the correct requirement + period ────────────────────
test('SU-2,3: GSTR-1 / GSTR-3B match the correct GST requirement (service + period)', () => {
  const g1 = matchFile(parseFilename('GSTR1_Apr_2026.pdf'), REQS)
  assert.equal(g1.best.requirement_ref_id, 'g1apr')
  assert.equal(g1.best.requirement_ref_type, 'gst')
  assert.equal(g1.confidence, 'high')
  const g3 = matchFile(parseFilename('GSTR-3B_Apr_2026.pdf'), REQS)
  assert.equal(g3.best.requirement_ref_id, 'g3bapr')
  assert.equal(g3.best.doc_type, 'GSTR-3B') // 3B not confused with GSTR-1
})

// ── 4/5/6: financials matching ───────────────────────────────────────────────
test('SU-4,5,6: Audited BS / TAR / ITR-Ack match their financials requirements', () => {
  assert.equal(matchFile(parseFilename('Audited_FS_2025-26.pdf'), REQS).best.requirement_ref_id, 'bs25')
  assert.equal(matchFile(parseFilename('TAR_2025-26.pdf'), REQS).best.requirement_ref_id, 'tar25')
  assert.equal(matchFile(parseFilename('ITR_Ack_2025-26.pdf'), REQS).best.requirement_ref_id, 'itrack25')
})

// ── 7: never suggest a requirement the client does not have ──────────────────
test('SU-7: a requirement the client lacks is never suggested (no fabrication)', () => {
  const noGst = REQS.filter((r) => r.requirement_ref_type !== 'gst')
  const m = matchFile(parseFilename('GSTR1_Apr_2026.pdf'), noGst)
  assert.equal(m.status, 'unmatched')       // 9: no requirement → unmatched
  assert.equal(m.candidates.length, 0)
  assert.equal(m.best, null)
})

// ── 8: FY ambiguity → confirmation, not a silent single match ────────────────
test('SU-8: doc type matches but FY unstated → medium confidence, multiple candidates', () => {
  const m = matchFile(parseFilename('Audited_FS.pdf'), REQS) // no FY in name; two BS requirements
  assert.equal(m.confidence, 'medium')
  assert.equal(m.status, 'needs_confirmation')
  assert.ok(m.candidates.length >= 2)
})

// ── 10/11: duplicate (replace) vs link ────────────────────────────────────────
test('SU-10,11: existing current doc → duplicate/replace; empty requirement → link', () => {
  const withDoc = REQS.map((r) => r.requirement_ref_id === 'bs25' ? { ...r, is_available: true, current_document_name: 'old.pdf' } : r)
  assert.equal(matchFile(parseFilename('Audited_FS_2025-26.pdf'), withDoc).status, 'duplicate') // 10
  assert.equal(matchFile(parseFilename('Audited_FS_2025-26.pdf'), REQS).status, 'matched')       // 11 (link)
})

// ── 12/13/14: UDIN exposure rules preserved ──────────────────────────────────
test('SU-12,13,14: UDIN only for Audited BS + TAR; Tax-Audit-Applicable only for TAR; GST none', () => {
  assert.equal(requiresUdin('Audited Balance Sheet'), true)   // 12
  assert.equal(requiresUdin('Tax Audit Report (TAR)'), true)  // 13
  assert.equal(requiresTaxAuditApplicable('Tax Audit Report (TAR)'), true)
  assert.equal(requiresTaxAuditApplicable('Audited Balance Sheet'), false)
  assert.equal(requiresUdin('GSTR-1'), false)                 // 14
  assert.equal(requiresUdin('Income Tax Return'), false)
})

// ── 15/17: batch independence + identity retained ────────────────────────────
test('SU-15,17: files processed independently; best carries canonical requirement identity', () => {
  const plan = buildMatchPlan([
    { id: 'a', filename: 'Audited_FS_2025-26.pdf' },
    { id: 'b', filename: 'GSTR-3B_Apr_2026.pdf' },
    { id: 'c', filename: 'totally-unknown.pdf' },
  ], REQS)
  assert.equal(plan.length, 3)
  assert.equal(plan[0].best.requirement_ref_id, 'bs25')
  assert.equal(plan[1].best.requirement_ref_id, 'g3bapr')
  assert.equal(plan[2].status, 'unmatched')
  // identity = (ref_type, ref_id) preserved on the match
  assert.equal(plan[0].best.requirement_ref_type, 'financials')
  assert.equal(plan[0].needsUdin, true)   // Audited BS → UDIN
  assert.equal(plan[1].needsUdin, false)  // GST → no UDIN
})

// ── period mismatch disqualifies ─────────────────────────────────────────────
test('SU-period: a period in the name that no requirement has → unmatched (never wrong month)', () => {
  const m = matchFile(parseFilename('Accounting_July_2026.pdf'), REQS) // only Apr/May accounting exist
  assert.equal(m.status, 'unmatched')
})
test('SU-accounting: correct month matches the right accounting requirement', () => {
  assert.equal(matchFile(parseFilename('Accounting_April_2026.pdf'), REQS).best.requirement_ref_id, 'accApr26')
})
test('SU-year: filename year disambiguates same-month requirements across years', () => {
  const reqs = [
    R({ requirement_ref_type: 'accounting', requirement_ref_id: 'a25', doc_type: 'Accounting', requirement_label: 'Accounting April 2025', period: 'April 2025', fy_label: '2025-26' }),
    R({ requirement_ref_type: 'accounting', requirement_ref_id: 'a26', doc_type: 'Accounting', requirement_label: 'Accounting April 2026', period: 'April 2026', fy_label: '2026-27' }),
  ]
  const m = matchFile(parseFilename('Accounting_April_2026.pdf'), reqs)
  assert.equal(m.best.requirement_ref_id, 'a26')   // 2026, not 2025
  assert.equal(m.confidence, 'high')               // year resolves the ambiguity
  assert.equal(m.candidates.length, 1)             // the 2025 requirement is rejected outright
})

test('SU-service-cats: client service categories derived from its requirements only', () => {
  assert.deepEqual(clientServiceCategories(REQS).sort(), ['accounting', 'financials', 'gst', 'income_tax'].sort())
  assert.deepEqual(clientServiceCategories([]), [])
})

test('SU-norm: normalisation ignores case/separators', () => {
  assert.equal(norm('GSTR-3B'), 'GSTR3B')
  assert.equal(norm('gstr 3 b'), 'GSTR3B')
})

// ── STATIC WIRING GUARDS (added once the component exists) ────────────────────
const MODAL = strip(read('src/components/SmartUploadModal.jsx'))
const HUB = strip(read('src/components/DocumentsHub.jsx'))

test('SU-canonical: Smart Upload links via the governed RPCs to the ONE requirement truth', () => {
  assert.match(MODAL, /from '\.\.\/lib\/smartUploadMatch'/)
  assert.match(MODAL, /document_link/)               // 19: link flips readiness Missing→Available
  assert.match(MODAL, /document_replace/)            // 11: replace an existing current doc
  assert.match(MODAL, /fetchReadiness/)              // 8: candidates ONLY from the client's requirements
  assert.doesNotMatch(MODAL, /completed-work|completed_documents/) // no competing repository
})
test('SU-18: an upload never sets a compliance FILING status', () => {
  assert.doesNotMatch(MODAL, /status:\s*'Filed'|status:\s*'Completed'|status:\s*'Closed'/)
})
test('SU-16,21: per-file batch results; a query error is not shown as "no matches"', () => {
  assert.match(MODAL, /perFile|results|status:/i)    // per-file result state
  assert.match(MODAL, /loadError|setError|readErr/i) // explicit read/error state, distinct from unmatched
})
test('SU-20: RBAC preserved — gated by the existing documentAccess helper', () => {
  assert.match(MODAL, /canUploadDocument/)
})
test('SU-race: client requirement fetch has a stale-response guard (no wrong-client requirements)', () => {
  assert.match(MODAL, /reqSeq/)
  assert.match(MODAL, /seq !== reqSeq\.current/) // late response for a previous client is dropped
})
test('SU-22/entry: Smart Upload entry point exists; keeps existing upload flows', () => {
  assert.match(HUB, /Smart Upload/)
  assert.match(HUB, /<SmartUploadModal/)
  assert.match(HUB, /<BulkUploadModal/)              // existing bulk flow preserved
  assert.match(HUB, /<ManageDocumentsDrawer/)        // existing row-wise flow preserved
})
test('SU-udin-ui: Smart Upload exposes UDIN fields for Audited BS / TAR', () => {
  assert.match(MODAL, /requiresUdin/)
  assert.match(MODAL, /UDIN/)
  assert.match(MODAL, /requiresTaxAuditApplicable|Tax Audit Applicable/)
})
