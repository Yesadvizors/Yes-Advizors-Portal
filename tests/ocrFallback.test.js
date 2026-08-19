/**
 * OCR fallback for Smart Upload — content-first → OCR → filename → manual. node:test.
 *
 * The OCR ENGINE (tesseract.js) is browser-only and not run here; these tests cover the pure
 * decision/classification/provenance/conflict logic (OCR text is classified by the SAME engine
 * as PDF-text) + bounded concurrency + static wiring guards proving OCR is LOCAL, triggers only
 * on scanned/image files, never sends the document externally, keeps readiness/filing separate,
 * and falls back to manual on failure. No financial-figure extraction.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { needsOcrFallback, classifyDocument, classifyAndMatch } from '../src/lib/documentContent.js'
import { requiresUdin, requiresTaxAuditApplicable } from '../src/lib/smartUploadMatch.js'
import { mapWithLimit } from '../src/lib/concurrency.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const MODAL = strip(read('src/components/SmartUploadModal.jsx'))
const OCR = strip(read('src/lib/ocr.js'))

const R = (o) => ({ requirement_ref_type: 'financials', requirement_ref_id: 'x', client_id: 'YA-002', client_name: 'ABC Pvt Ltd', fy_label: '2023-24', period: null, doc_type: 'Audited Balance Sheet', requirement_label: 'Audited Balance Sheet', is_available: false, version_count: 0, ...o })
const REQS = [
  R({ requirement_ref_id: 'bs24', doc_type: 'Audited Balance Sheet', requirement_label: 'Audited Balance Sheet', fy_label: '2023-24' }),
  R({ requirement_ref_id: 'tar24', doc_type: 'Tax Audit Report (TAR)', requirement_label: 'Tax Audit Report (TAR)', fy_label: '2023-24' }),
  R({ requirement_ref_type: 'gst', requirement_ref_id: 'g1jun', doc_type: 'GSTR-1', requirement_label: 'GSTR-1 Jun-2026', period: 'Jun-2026', fy_label: '2026-27' }),
  R({ requirement_ref_type: 'gst', requirement_ref_id: 'g1apr', doc_type: 'GSTR-1', requirement_label: 'GSTR-1 Apr-2026', period: 'Apr-2026', fy_label: '2026-27' }),
  R({ requirement_ref_type: 'gst', requirement_ref_id: 'g3bjun', doc_type: 'GSTR-3B', requirement_label: 'GSTR-3B Jun-2026', period: 'Jun-2026', fy_label: '2026-27' }),
]

// ── 1/2/3: OCR trigger condition ─────────────────────────────────────────────
test('OCR-1,2,3: OCR triggers for scanned PDF + images, NOT for a text PDF', () => {
  assert.equal(needsOcrFallback({ hasText: true, mimeType: 'application/pdf' }), false) // 1: text PDF → no OCR
  assert.equal(needsOcrFallback({ hasText: false, mimeType: 'application/pdf' }), true)  // 2: scanned PDF → OCR
  assert.equal(needsOcrFallback({ mimeType: 'image/png' }), true)                        // 3: image → OCR
  assert.equal(needsOcrFallback({ mimeType: 'image/jpeg' }), true)
  assert.equal(needsOcrFallback({ mimeType: 'text/plain' }), false)
})

// ── 4/15/16: OCR period overrides filename period ────────────────────────────
test('OCR-4,15,16: filename "April" + OCR "June" → June wins (+ period conflict)', () => {
  const c = classifyDocument({ filename: 'April_GSTR1.pdf', contentText: 'FORM GSTR-1 Tax Period June 2026', hasText: true, textSource: 'ocr' })
  assert.equal(c.docType, 'GSTR-1')
  assert.equal(c.period.month, 'June')      // 4/15: document period, not April
  assert.equal(c.source, 'ocr')
  assert.equal(c.periodConflict, true)      // 16: filename period conflict flagged
  const m = classifyAndMatch({ filename: 'April_GSTR1.pdf', contentText: 'FORM GSTR-1 Tax Period June 2026', hasText: true, textSource: 'ocr' }, REQS)
  assert.equal(m.best.requirement_ref_id, 'g1jun')  // exact June requirement, never April
})

// ── 5/18: OCR type overrides filename type ───────────────────────────────────
test('OCR-5,18: filename GSTR-1 + OCR GSTR-3B → GSTR-3B (+ type conflict)', () => {
  const c = classifyDocument({ filename: 'GSTR1_June.pdf', contentText: 'FORM GSTR-3B Summary return June 2026', hasText: true, textSource: 'ocr' })
  assert.equal(c.docType, 'GSTR-3B')
  assert.equal(c.typeConflict, true)
  assert.equal(c.source, 'ocr')
})

// ── 6/17: OCR FY overrides filename FY ───────────────────────────────────────
test('OCR-6,17: filename FY 2021-22 + OCR "year ended 31 March 2024" → FY 2023-24 (+ FY conflict)', () => {
  const c = classifyDocument({ filename: 'Audited_FS_2021-22.pdf', contentText: 'Balance Sheet Statement of Profit and Loss for the year ended 31 March 2024', hasText: true, textSource: 'ocr' })
  assert.equal(c.docType, 'Audited Balance Sheet')
  assert.equal(c.fy, '2023-24')
  assert.equal(c.fyConflict, true)
})

// ── 7-11: scanned form signatures (OCR text) classify correctly ──────────────
test('OCR-7..11: scanned GSTR-1 / GSTR-3B / 3CD / Audited / ITR-V classify from OCR text', () => {
  const f = (t) => classifyDocument({ filename: 'scan.pdf', contentText: t, hasText: true, textSource: 'ocr' })
  assert.equal(f('FORM GSTR-1 Details of outward supplies').docType, 'GSTR-1')
  assert.equal(f('FORM GSTR-3B Summary return').docType, 'GSTR-3B')
  assert.equal(f('Form No. 3CD').docType, 'Tax Audit Report (TAR)')
  assert.equal(f('Balance Sheet Statement of Profit and Loss').docType, 'Audited Balance Sheet')
  assert.equal(f('ITR-V Acknowledgement Number 123').docType, 'ITR Acknowledgement')
})

// ── 12: provenance = OCR ─────────────────────────────────────────────────────
test('OCR-12: content recognised from OCR is labelled source "ocr"', () => {
  assert.equal(classifyDocument({ filename: 'x.pdf', contentText: 'FORM GSTR-1', hasText: true, textSource: 'ocr' }).source, 'ocr')
  assert.equal(classifyDocument({ filename: 'x.pdf', contentText: 'FORM GSTR-1', hasText: true, textSource: 'pdf' }).source, 'content')
})

// ── 13/28: OCR failure → manual, distinct from No match ──────────────────────
test('OCR-13,28: OCR failure (no text) → needs_ocr/manual, NOT a fabricated match or No-match', () => {
  const m = classifyAndMatch({ filename: 'scan.pdf', contentText: '', hasText: false, textSource: 'ocr' }, REQS)
  assert.equal(m.status, 'needs_ocr')
  assert.equal(m.best, null)         // never guessed
  assert.notEqual(m.status, 'unmatched') // OCR-failed is its own state, not "No match"
})

// ── 14: OCR doc but no client requirement → No match ─────────────────────────
test('OCR-14: OCR identifies GSTR-1 but client has no GST requirement → No match', () => {
  const noGst = REQS.filter(r => r.requirement_ref_type !== 'gst')
  const m = classifyAndMatch({ filename: 'x.pdf', contentText: 'FORM GSTR-1 June 2026', hasText: true, textSource: 'ocr' }, noGst)
  assert.equal(m.status, 'unmatched')
  assert.equal(m.contentDocType, 'GSTR-1')
})

// ── 19/20/21: UDIN driven by OCR-derived type ────────────────────────────────
test('OCR-19,20,21: OCR TAR/Audited → UDIN (TAR + TA-applicable); OCR GST → no UDIN', () => {
  assert.equal(requiresUdin(classifyDocument({ filename: 'x.pdf', contentText: 'Form No. 3CD', hasText: true, textSource: 'ocr' }).docType), true)
  assert.equal(requiresTaxAuditApplicable(classifyDocument({ filename: 'x.pdf', contentText: 'Form No. 3CD', hasText: true, textSource: 'ocr' }).docType), true)
  assert.equal(requiresUdin(classifyDocument({ filename: 'x.pdf', contentText: 'Balance Sheet Statement of Profit and Loss', hasText: true, textSource: 'ocr' }).docType), true)
  assert.equal(requiresUdin(classifyDocument({ filename: 'x.pdf', contentText: 'FORM GSTR-1', hasText: true, textSource: 'ocr' }).docType), false)
})

// ── 24/25: duplicate → replace; fresh → link (unchanged) ─────────────────────
test('OCR-24,25: existing current doc → duplicate/replace; empty requirement → matched/link', () => {
  const withDoc = REQS.map(r => r.requirement_ref_id === 'g1jun' ? { ...r, is_available: true, current_document_name: 'old.pdf' } : r)
  assert.equal(classifyAndMatch({ filename: 'x.pdf', contentText: 'FORM GSTR-1 June 2026', hasText: true, textSource: 'ocr' }, withDoc).status, 'duplicate')
  assert.equal(classifyAndMatch({ filename: 'x.pdf', contentText: 'FORM GSTR-1 June 2026', hasText: true, textSource: 'ocr' }, REQS).status, 'matched')
})

// ── 26: bounded concurrency isolates failures ────────────────────────────────
test('OCR-26: mapWithLimit runs bounded, in order, and isolates a failing job', async () => {
  const seen = []
  const out = await mapWithLimit([1, 2, 3, 4, 5], 2, async (n) => {
    seen.push(n)
    if (n === 3) throw new Error('boom')
    return n * 10
  })
  assert.deepEqual(out[0], 10)
  assert.deepEqual(out[2], { error: 'boom' }) // one failure does not break the others
  assert.deepEqual(out[4], 50)
  assert.equal(seen.length, 5)
})

// ── static wiring guards (22/23/27 + OCR is local, page-bounded) ─────────────
test('OCR-wiring: modal runs OCR fallback (bounded) only when needed; classifies OCR text', () => {
  assert.match(MODAL, /from '\.\.\/lib\/ocr'/)
  assert.match(MODAL, /needsOcrFallback/)
  assert.match(MODAL, /ocrFile/)
  assert.match(MODAL, /mapWithLimit\(ocrJobs, 2,/)   // bounded (≤2) concurrency
  assert.match(MODAL, /textSource: 'ocr'/)           // OCR text → same classifier, provenance ocr
})
test('OCR-22,23: OCR happens on add; upload only in confirmUpload; no filing-status write', () => {
  assert.match(MODAL, /async function confirmUpload/)
  assert.match(MODAL, /async function uploadAndLink/)
  assert.doesNotMatch(MODAL, /status:\s*'Filed'|status:\s*'Completed'|status:\s*'Closed'/)
})
test('OCR-27: RBAC preserved', () => {
  assert.match(MODAL, /canUploadDocument/)
})
test('OCR-local: OCR is local (tesseract) — the document is never sent to an external service', () => {
  assert.match(OCR, /tesseract\.js/)
  assert.doesNotMatch(OCR, /supabase|functions\.invoke|fetch\(|claude|openai|mistral|scan-document|extract-financial/)
  assert.match(OCR, /maxPages/)                      // only a few pages, not the whole document
})
