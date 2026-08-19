// Content-first document classification for Smart Upload.
//
// Pure, node:test-importable. NO React, NO Supabase, NO network, NO OCR/AI — it operates on
// text ALREADY extracted from a PDF (by lib/pdfText.js in the browser) plus the filename, and
// returns a deterministic classification. Document CONTENT always overrides the filename when a
// strong content signature is present; the filename is fallback/supporting evidence only.
//
// This is CLASSIFICATION, not financial extraction — it reads only enough to identify document
// type / service / FY / period, never turnover / tax figures / balances.

import { parseFilename, detectPeriod, norm, matchFile, requiresUdin } from './smartUploadMatch.js'

// Uppercased, whitespace-collapsed text (phrase matching) + a separator-free form (form codes).
function prep(text) {
  const T = String(text || '').toUpperCase().replace(/\s+/g, ' ')
  return { T, N: T.replace(/[^A-Z0-9]/g, '') }
}

// ── content signatures (deterministic; ordered specific → general) ───────────
// Each returns { docType, refType, strength }. 'strong' = a form marker or a strong phrase
// combination; 'weak' = a single supporting phrase (never enough alone to override a filename).
// A single generic word like "audit" is deliberately NOT a signature.
const STRONG = [
  // Tax Audit Report — the 3CA/3CB/3CD forms
  (T, N) => (N.includes('FORMNO3CD') || N.includes('3CD') || N.includes('3CB') || N.includes('3CA') || T.includes('TAX AUDIT REPORT')) && { docType: 'Tax Audit Report (TAR)', refType: 'financials', strength: 'strong' },
  // GST returns (9C before 9, 3B before 1)
  (T, N) => (N.includes('GSTR9C') || T.includes('RECONCILIATION STATEMENT')) && { docType: 'GSTR-9C', refType: 'gst', strength: 'strong' },
  (T, N) => (N.includes('GSTR9') || (N.includes('GSTR') && T.includes('ANNUAL RETURN'))) && { docType: 'GSTR-9', refType: 'gst', strength: 'strong' },
  (T, N) => (N.includes('FORMGSTR3B') || N.includes('GSTR3B')) && { docType: 'GSTR-3B', refType: 'gst', strength: 'strong' },
  (T, N) => (N.includes('FORMGSTR1') || N.includes('GSTR1') || T.includes('DETAILS OF OUTWARD SUPPLIES')) && { docType: 'GSTR-1', refType: 'gst', strength: 'strong' },
  (T, N) => (N.includes('CMP08') || T.includes('FORM GST CMP-08')) && { docType: 'CMP-08', refType: 'gst', strength: 'strong' },
  // ITR acknowledgement (ITR-V) — must precede the ITR form check
  (T, N) => (N.includes('ITRV') || T.includes('RETURN ACKNOWLEDGEMENT') || T.includes('ACKNOWLEDGEMENT NUMBER')) && { docType: 'ITR Acknowledgement', refType: 'financials', strength: 'strong' },
  // Audited financial statements — a strong COMBINATION, never a single word
  (T, N) => ((T.includes("INDEPENDENT AUDITOR'S REPORT") || T.includes('INDEPENDENT AUDITORS REPORT') || T.includes('BALANCE SHEET')) && (T.includes('STATEMENT OF PROFIT AND LOSS') || T.includes('PROFIT AND LOSS'))) && { docType: 'Audited Balance Sheet', refType: 'financials', strength: 'strong' },
  // Income Tax Return form (after acknowledgement)
  (T, N) => (T.includes('INCOME TAX RETURN') && /ITR\s*-?\s*[1-7]/.test(T)) && { docType: 'ITR Form', refType: 'income_tax', strength: 'strong' },
  // TDS statements
  (T, N) => N.includes('27EQ') && { docType: '27EQ', refType: 'tds', strength: 'strong' },
  (T, N) => N.includes('24Q') && { docType: '24Q', refType: 'tds', strength: 'strong' },
  (T, N) => N.includes('26Q') && { docType: '26Q', refType: 'tds', strength: 'strong' },
  (T, N) => N.includes('27Q') && { docType: '27Q', refType: 'tds', strength: 'strong' },
  // ROC / MCA
  (T, N) => (N.includes('AOC4') || N.includes('MGT7A') || N.includes('MGT7')) && { docType: 'Annual', refType: 'roc', strength: 'strong' },
]
// Weak signals — only used when the filename gives nothing.
const WEAK = [
  (T, N) => T.includes('BALANCE SHEET') && { docType: 'Audited Balance Sheet', refType: 'financials', strength: 'weak' },
  (T, N) => T.includes('INCOME TAX RETURN') && { docType: 'ITR Form', refType: 'income_tax', strength: 'weak' },
]

// income_tax content maps to 'ITR Form' but also serves the standalone income_tax requirement;
// expose both services so matchFile picks whichever the client actually has.
function refTypesFor(sig) {
  if (sig.refType === 'income_tax' || (sig.refType === 'financials' && sig.docType === 'ITR Form')) return ['income_tax', 'financials']
  return [sig.refType]
}

export function classifyContent(text) {
  const { T, N } = prep(text)
  for (const rule of STRONG) { const r = rule(T, N); if (r) return { ...r, refTypes: refTypesFor(r) } }
  for (const rule of WEAK) { const r = rule(T, N); if (r) return { ...r, refTypes: refTypesFor(r) } }
  return null
}

// ── FY from document content → canonical "YYYY-YY" ───────────────────────────
// Deterministic Indian-FY rules. Never guesses when ambiguous.
export function contentFy(text) {
  const T = String(text || '').toUpperCase().replace(/\s+/g, ' ')
  // "year ended 31 March 2024" / "as at 31st March, 2024" → FY 2023-24 (Apr'23–Mar'24)
  let m = T.match(/31\s*(?:ST)?\s*MARCH[,\s]*(20\d{2})/)
  if (m) return fy(+m[1] - 1)
  // "Financial Year 2023-24" / "F.Y. 2023-24" / "for the year 2023-24"
  m = T.match(/(?:FINANCIAL\s*YEAR|F\.?\s*Y\.?)\s*(20\d{2})[\s\-\/]+(\d{2})/)
  if (m && (+m[1] + 1) % 100 === +m[2]) return fy(+m[1])
  // "Assessment Year 2024-25" → FY = AY start − 1 → 2023-24
  m = T.match(/(?:ASSESSMENT\s*YEAR|A\.?\s*Y\.?)\s*(20\d{2})[\s\-\/]+(\d{2})/)
  if (m && (+m[1] + 1) % 100 === +m[2]) return fy(+m[1] - 1)
  return null
}
function fy(startYear) { return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}` }

// ── period (month/quarter) from document content ─────────────────────────────
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
export function contentPeriod(text) {
  const s = String(text || '')
  // named month via the shared parser ("Tax period: April 2026")
  const named = detectPeriod(s)
  if (named && (named.month || named.quarter)) return named
  // numeric "Return period 042026" / "04-2026" / "04/2026" (MM then YYYY)
  const m = s.match(/(?:period|month)[^0-9]{0,10}(0[1-9]|1[0-2])[\s\-\/]?(20\d{2})/i)
  if (m) {
    const idx = +m[1] - 1
    const month = MONTHS[idx][0].toUpperCase() + MONTHS[idx].slice(1)
    return { month, monthIndex: idx, quarter: null, year: +m[2], label: `${month} ${m[2]}` }
  }
  return null
}

// Enough machine-readable text to trust content classification (else likely a scanned/image
// PDF). A genuinely scanned/image PDF yields no text layer (empty/near-empty); even a sparse
// text PDF clears this floor, so the threshold stays low to avoid false "Needs OCR".
export function hasUsableText(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  return t.length >= 20 && (t.match(/[A-Za-z]{3,}/g) || []).length >= 5
}

// ── merge content + filename (content-first) ─────────────────────────────────
// Returns the resolved suggestion plus provenance/conflict flags. `hasText` is whether usable
// machine-readable text was extracted; when false the file is flagged needsOcr and only the
// filename can suggest anything (low confidence).
// Does this file need the OCR fallback? Images have no machine-readable text layer; a PDF whose
// extracted text is insufficient is likely scanned. Pure — the browser passes the real flags.
export function needsOcrFallback({ hasText, mimeType } = {}) {
  const t = String(mimeType || '')
  if (t.startsWith('image/')) return true
  if (t === 'application/pdf') return hasText !== true
  return false
}

// textSource: 'pdf' (machine-readable text layer) | 'ocr' (recognised from a scan/image). It
// only changes the PROVENANCE label shown to the user — content is classified identically
// whether it came from the PDF text layer or from OCR (one classifier, no separate truth).
export function classifyDocument({ filename, contentText, hasText, textSource = 'pdf' } = {}) {
  // Trust an explicit hasText from the caller (the browser computes it via hasUsableText on the
  // extracted text); only fall back to measuring the text ourselves when it wasn't provided.
  const usable = hasText === false ? false : (hasText === true ? true : hasUsableText(contentText))
  const fromFile = parseFilename(filename)
  const content = usable ? classifyContent(contentText) : null
  const cFy = usable ? contentFy(contentText) : null
  const cPeriod = usable ? contentPeriod(contentText) : null
  const contentLabel = textSource === 'ocr' ? 'ocr' : 'content' // provenance for content wins

  let docType = null, refTypes = [], source = 'none', strength = null
  if (content && content.strength === 'strong') {
    docType = content.docType; refTypes = content.refTypes; source = contentLabel; strength = 'strong'
  } else if (fromFile.docType) {
    docType = fromFile.docType; refTypes = fromFile.refTypes; source = 'filename'; strength = content ? 'weak' : null
  } else if (content) {
    docType = content.docType; refTypes = content.refTypes; source = contentLabel; strength = 'weak'
  }

  // FY / period: content overrides filename.
  const fy = cFy || fromFile.fy
  const fySource = cFy ? 'content' : (fromFile.fy ? 'filename' : null)
  const period = cPeriod || fromFile.period

  // Conflicts (content is authoritative; we still surface the disagreement).
  const typeConflict = !!(content && content.strength === 'strong' && fromFile.docType && norm(content.docType) !== norm(fromFile.docType))
  const fyConflict = !!(cFy && fromFile.fy && cFy !== fromFile.fy)
  const periodConflict = !!(cPeriod && fromFile.period && norm(cPeriod.label || cPeriod.month) !== norm(fromFile.period.label || fromFile.period.month))

  return {
    filename, docType, refTypes, fy, period,
    source,            // 'content' | 'ocr' | 'filename' | 'none'
    strength,          // 'strong' | 'weak' | null
    fySource,          // 'content' | 'filename' | null
    typeConflict, fyConflict, periodConflict,
    needsOcr: !usable, // no usable machine-readable text (likely scanned/image)
    filenameDocType: fromFile.docType || null,
    contentDocType: content ? content.docType : null,
  }
}

// ── classify (content-first) THEN match to the selected client's requirements ─
// Confidence reflects PROVENANCE, not just candidate count:
//   high   = strong content signature + FY/period resolves to ONE requirement
//   medium = strong content but FY/period ambiguous (multiple candidates)
//   low    = filename-only or weak content signal
//   needs_ocr = no usable machine-readable text (scanned/image PDF)
//   unmatched = a document was identified but the client has no such requirement
export function classifyAndMatch({ filename, contentText, hasText, textSource = 'pdf' } = {}, requirements) {
  const cls = classifyDocument({ filename, contentText, hasText, textSource })
  const base = matchFile(cls, requirements)
  const strongContent = (cls.source === 'content' || cls.source === 'ocr') && cls.strength === 'strong'

  if (base.status === 'unmatched') {
    const identified = !!cls.docType
    // "No match" (unmatched) means a document WAS identified but the client has no such
    // requirement. When NOTHING could be identified (scanned/unreadable, or OCR garbage with no
    // signature), route to manual (needs_ocr) — never a false "No match" (spec §13/§28).
    return {
      ...cls, candidates: [], best: null,
      confidence: identified ? 'unmatched' : 'low',
      status: identified ? 'unmatched' : 'needs_ocr',
      needsUdin: requiresUdin(cls.docType),
    }
  }

  let confidence
  if (cls.needsOcr) confidence = 'low'
  else if (strongContent) confidence = base.confidence === 'high' ? 'high' : 'medium'
  else confidence = 'low' // filename or weak content

  const status = cls.needsOcr ? 'needs_ocr'
    : base.best.is_available === true ? 'duplicate'
      : confidence === 'high' ? 'matched' : 'needs_confirmation'

  return {
    ...cls, candidates: base.candidates, best: base.best,
    confidence, status,
    needsUdin: requiresUdin(base.best ? base.best.doc_type : cls.docType),
  }
}
