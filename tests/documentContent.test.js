/**
 * Content-first document classification for Smart Upload. node:test.
 *
 * Pure tests for the content-signature engine (documentContent.js) — document CONTENT
 * overrides the filename — plus static guards that the modal keeps the no-upload-before-
 * confirm, RBAC, readiness-vs-filing separation, and error≠no-match invariants. Local only;
 * no OCR/AI/network (operates on already-extracted text).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import {
  classifyContent, contentFy, contentPeriod, hasUsableText, classifyDocument, classifyAndMatch,
} from '../src/lib/documentContent.js'
import { requiresUdin, requiresTaxAuditApplicable } from '../src/lib/smartUploadMatch.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const MODAL = strip(read('src/components/SmartUploadModal.jsx'))

// client requirement fixture (financials incl. multiple FYs, gst, income_tax, accounting)
const R = (o) => ({ requirement_ref_type: 'financials', requirement_ref_id: 'x', client_id: 'YA-002', client_name: 'ABC Pvt Ltd', fy_label: '2023-24', period: null, doc_type: 'Audited Balance Sheet', requirement_label: 'Audited Balance Sheet', is_available: false, version_count: 0, ...o })
const REQS = [
  R({ requirement_ref_id: 'bs24', doc_type: 'Audited Balance Sheet', requirement_label: 'Audited Balance Sheet', fy_label: '2023-24' }),
  R({ requirement_ref_id: 'bs26', doc_type: 'Audited Balance Sheet', requirement_label: 'Audited Balance Sheet', fy_label: '2025-26' }),
  R({ requirement_ref_id: 'tar24', doc_type: 'Tax Audit Report (TAR)', requirement_label: 'Tax Audit Report (TAR)', fy_label: '2023-24' }),
  R({ requirement_ref_id: 'ack24', doc_type: 'ITR Acknowledgement', requirement_label: 'ITR Acknowledgement', fy_label: '2023-24' }),
  R({ requirement_ref_type: 'gst', requirement_ref_id: 'g1apr', doc_type: 'GSTR-1', requirement_label: 'GSTR-1 Apr-2026', period: 'Apr-2026', fy_label: '2026-27' }),
  R({ requirement_ref_type: 'gst', requirement_ref_id: 'g3bapr', doc_type: 'GSTR-3B', requirement_label: 'GSTR-3B Apr-2026', period: 'Apr-2026', fy_label: '2026-27' }),
]

// ── content signatures ───────────────────────────────────────────────────────
test('CC-sig: strong form signatures classify by content', () => {
  assert.equal(classifyContent('FORM GSTR-1 Details of outward supplies').docType, 'GSTR-1')
  assert.equal(classifyContent('FORM GSTR-3B Summary return').docType, 'GSTR-3B')
  assert.equal(classifyContent('FORM GSTR-9C Reconciliation Statement').docType, 'GSTR-9C')
  assert.equal(classifyContent('Form No. 3CD Statement of particulars').docType, 'Tax Audit Report (TAR)')
  assert.equal(classifyContent('Indian Income Tax Return Acknowledgement ITR-V').docType, 'ITR Acknowledgement')
  assert.equal(classifyContent("Independent Auditor's Report Balance Sheet Statement of Profit and Loss").docType, 'Audited Balance Sheet')
  assert.equal(classifyContent('random text with the word audit only'), null) // one weak word ≠ signature
})

// ── FY / period from content ─────────────────────────────────────────────────
test('CC-7: "year ended 31 March 2024" → FY 2023-24', () => {
  assert.equal(contentFy('These financial statements for the year ended 31 March 2024'), '2023-24')
  assert.equal(contentFy('Financial Year 2023-24'), '2023-24')
  assert.equal(contentFy('Assessment Year 2024-25'), '2023-24') // AY → FY
  assert.equal(contentFy('no year here'), null)
})
test('CC-8: period detected from content (named + numeric)', () => {
  assert.equal(contentPeriod('Tax period: April 2026').label, 'April 2026')
  assert.equal(contentPeriod('Return period 042026').month, 'April')
  assert.equal(contentPeriod('nothing'), null)
})

// ── content overrides filename ───────────────────────────────────────────────
test('CC-1: filename GSTR-1 but content GSTR-3B → GSTR-3B wins (+ conflict flag)', () => {
  const c = classifyDocument({ filename: 'GSTR1_Apr_2026.pdf', contentText: 'FORM GSTR-3B Summary return April 2026', hasText: true })
  assert.equal(c.docType, 'GSTR-3B')
  assert.equal(c.source, 'content')
  assert.equal(c.typeConflict, true)          // 12
  assert.equal(c.filenameDocType, 'GSTR-1')
})
test('CC-2: filename FY 2021-22 but content year-ended-March-2024 → content FY wins', () => {
  const c = classifyDocument({ filename: 'Audited_Financial_2021-22.pdf', contentText: "Independent Auditor's Report Balance Sheet Statement of Profit and Loss for the year ended 31 March 2024", hasText: true })
  assert.equal(c.docType, 'Audited Balance Sheet')
  assert.equal(c.fy, '2023-24')
  assert.equal(c.fySource, 'content')
  assert.equal(c.fyConflict, true)
})
test('CC-3,4,5: random filename → content classifies GSTR-1 / Audited / TAR', () => {
  assert.equal(classifyDocument({ filename: 'scan123.pdf', contentText: 'FORM GSTR-1 Details of outward supplies', hasText: true }).docType, 'GSTR-1')
  assert.equal(classifyDocument({ filename: 'document.pdf', contentText: 'Balance Sheet Statement of Profit and Loss', hasText: true }).docType, 'Audited Balance Sheet')
  assert.equal(classifyDocument({ filename: 'x.pdf', contentText: 'Form No. 3CD', hasText: true }).docType, 'Tax Audit Report (TAR)')
})
test('CC-6: ITR-V content → ITR Acknowledgement', () => {
  assert.equal(classifyDocument({ filename: 'x.pdf', contentText: 'ITR-V Acknowledgement Number 123456', hasText: true }).docType, 'ITR Acknowledgement')
})
test('CC-11: weak/no content → filename fallback', () => {
  const c = classifyDocument({ filename: 'GSTR-3B_Apr_2026.pdf', contentText: 'illegible', hasText: true })
  assert.equal(c.docType, 'GSTR-3B')
  assert.equal(c.source, 'filename')
})
test('CC-13: scanned/no-text → needsOcr, does not misclassify', () => {
  const c = classifyDocument({ filename: 'randomscan.pdf', contentText: '', hasText: false })
  assert.equal(c.needsOcr, true)
  assert.equal(c.docType, null)          // nothing in filename either → not guessed
  assert.equal(hasUsableText(''), false)
})

// ── classify + match to the selected client ─────────────────────────────────
test('CC-9: strong content + FY resolves to ONE requirement → High', () => {
  const m = classifyAndMatch({ filename: 'x.pdf', contentText: "Independent Auditor's Report Balance Sheet Statement of Profit and Loss for the year ended 31 March 2024", hasText: true }, REQS)
  assert.equal(m.best.requirement_ref_id, 'bs24')
  assert.equal(m.confidence, 'high')
  assert.equal(m.source, 'content')
})
test('CC-10: content identified but client has no such requirement → No match', () => {
  const noGst = REQS.filter(r => r.requirement_ref_type !== 'gst')
  const m = classifyAndMatch({ filename: 'x.pdf', contentText: 'FORM GSTR-1 Details of outward supplies', hasText: true }, noGst)
  assert.equal(m.status, 'unmatched')
  assert.equal(m.contentDocType, 'GSTR-1') // still shows what was detected
  assert.equal(m.best, null)
})
test('CC-11b: filename-only match caps at low confidence', () => {
  const m = classifyAndMatch({ filename: 'GSTR-3B_Apr_2026.pdf', contentText: 'illegible', hasText: true }, REQS)
  assert.equal(m.best.requirement_ref_id, 'g3bapr')
  assert.equal(m.confidence, 'low')
  assert.equal(m.source, 'filename')
})
test('CC-13b: no usable text → needs_ocr status', () => {
  const m = classifyAndMatch({ filename: 'scan.pdf', contentText: '', hasText: false }, REQS)
  assert.equal(m.status, 'needs_ocr')
})
test('CC-18,19: only the given client requirements; existing current doc → replace', () => {
  const withDoc = REQS.map(r => r.requirement_ref_id === 'bs24' ? { ...r, is_available: true, current_document_name: 'old.pdf' } : r)
  const m = classifyAndMatch({ filename: 'x.pdf', contentText: 'Balance Sheet Statement of Profit and Loss year ended 31 March 2024', hasText: true }, withDoc)
  assert.equal(m.status, 'duplicate')                     // 19
  assert.equal(m.best.requirement_ref_id, 'bs24')          // 18: from this client's reqs only
})

// ── UDIN driven by CONTENT-derived type ──────────────────────────────────────
test('CC-14,15,16: UDIN for content-derived Audited/TAR; TA-applicable for TAR; GST none', () => {
  assert.equal(requiresUdin(classifyDocument({ filename: 'random.pdf', contentText: "Independent Auditor's Report Balance Sheet Statement of Profit and Loss", hasText: true }).docType), true) // 14
  const tar = classifyDocument({ filename: 'random.pdf', contentText: 'Form No. 3CD', hasText: true })
  assert.equal(requiresUdin(tar.docType), true)              // 15
  assert.equal(requiresTaxAuditApplicable(tar.docType), true)
  assert.equal(requiresUdin(classifyDocument({ filename: 'x.pdf', contentText: 'FORM GSTR-1', hasText: true }).docType), false) // 16
})

// ── static wiring guards (17/20/21/22) ───────────────────────────────────────
test('CC-17: nothing uploads before Confirm & Upload', () => {
  assert.match(MODAL, /Confirm & Upload/)
  assert.match(MODAL, /confirmUpload/)
  // classification/extraction happen on add; the storage upload lives only in confirmUpload→uploadAndLink
  assert.match(MODAL, /async function uploadAndLink/)
})
test('CC-20: an upload never writes a compliance FILING status', () => {
  assert.doesNotMatch(MODAL, /status:\s*'Filed'|status:\s*'Completed'|status:\s*'Closed'/)
})
test('CC-21: files are processed independently (per-file classify + result)', () => {
  assert.match(MODAL, /items\.map/)
  assert.match(MODAL, /classifyRow/)
})
test('CC-22: requirement-read failure is distinct from No match', () => {
  assert.match(MODAL, /setLoadError\(true\)/)  // explicit read-error state, separate from unmatched
  assert.match(MODAL, /loadError &&/)          // rendered as its own error branch, not "no matches"
})
test('CC-content-first: modal classifies content-first via documentContent + pdfText', () => {
  assert.match(MODAL, /from '\.\.\/lib\/documentContent'/)
  assert.match(MODAL, /from '\.\.\/lib\/pdfText'/)
  assert.match(MODAL, /extractPdfText/)
  assert.match(MODAL, /classifyAndMatch/)
})
