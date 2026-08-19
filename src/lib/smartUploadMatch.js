// Central Smart Upload — deterministic filename → requirement matching engine.
//
// Pure, node:test-importable. NO React, NO Supabase, NO network, NO AI/OCR. It parses a
// filename into a document-type / service / FY / period suggestion, then matches it ONLY
// against a client's EXISTING requirement rows (from v_requirement_document_readiness) — it
// never fabricates a requirement. The UI must let the user confirm/correct before any upload.
//
// This is filename-based matching, deliberately transparent — NOT AI. Confidence reflects how
// unambiguously the filename resolves to ONE existing requirement, nothing more.

// ── normalisation ───────────────────────────────────────────────────────────
export const norm = (s) => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]+/g, '')

// ── document-type hints (most specific first) ───────────────────────────────
// Each maps a filename pattern → a canonical docType + the service (requirement_ref_type) it
// belongs to. Ordering matters: GSTR-9C before GSTR-9, TAR before generic financials, etc.
// `refTypes` may list more than one plausible service (e.g. an "ITR" file could be the
// financials "ITR Form" or the standalone income_tax "Income Tax Return") — ambiguity is
// resolved by matching against the client's real requirements, not by guessing here.
const DOC_HINTS = [
  // GST (specific → general)
  [/gstr[\s_\-]*9\s*c/i, { docType: 'GSTR-9C', refTypes: ['gst'] }],
  [/gstr[\s_\-]*9/i, { docType: 'GSTR-9', refTypes: ['gst'] }],
  [/gstr[\s_\-]*3\s*b/i, { docType: 'GSTR-3B', refTypes: ['gst'] }],
  [/gstr[\s_\-]*4/i, { docType: 'GSTR-4', refTypes: ['gst'] }],
  [/gstr[\s_\-]*1/i, { docType: 'GSTR-1', refTypes: ['gst'] }],
  [/cmp[\s_\-]*08/i, { docType: 'CMP-08', refTypes: ['gst'] }],
  // TDS
  [/27\s*eq/i, { docType: '27EQ', refTypes: ['tds'] }],
  [/24\s*q/i, { docType: '24Q', refTypes: ['tds'] }],
  [/26\s*q/i, { docType: '26Q', refTypes: ['tds'] }],
  [/27\s*q/i, { docType: '27Q', refTypes: ['tds'] }],
  // ROC / MCA
  [/aoc[\s_\-]*4|mgt[\s_\-]*7|roc[\s_\-]*annual/i, { docType: 'Annual', refTypes: ['roc'] }],
  // Financials & ITR (specific → general)
  [/tax[\s_\-]*audit|(^|[^a-z])tar([^a-z]|$)|3c[db]/i, { docType: 'Tax Audit Report (TAR)', refTypes: ['financials'] }],
  [/computation|(^|[^a-z])coi([^a-z]|$)/i, { docType: 'Computation of Income', refTypes: ['financials'] }],
  [/itr[\s_\-]*v|itr[\s_\-]*ack|acknowledg/i, { docType: 'ITR Acknowledgement', refTypes: ['financials'] }],
  [/audited|balance[\s_\-]*sheet|financial[\s_\-]*statement|(^|[^a-z])fs([^a-z]|$)|(^|[^a-z])bs([^a-z]|$)/i, { docType: 'Audited Balance Sheet', refTypes: ['financials'] }],
  // "ITR" / "income tax return" is ambiguous: financials "ITR Form" OR income_tax "Income Tax Return"
  [/itr[\s_\-]*form/i, { docType: 'ITR Form', refTypes: ['financials', 'income_tax'] }],
  [/income[\s_\-]*tax[\s_\-]*return|(^|[^a-z])itr([^a-z]|$)/i, { docType: 'ITR Form', refTypes: ['financials', 'income_tax'] }],
  // Accounting (books/ledger for a month)
  [/accounting|book[\s_\-]*keep|ledger|trial[\s_\-]*balance/i, { docType: 'Accounting', refTypes: ['accounting'] }],
  // Audit (statutory)
  [/statutory[\s_\-]*audit|audit[\s_\-]*report/i, { docType: 'Audit', refTypes: ['audit'] }],
  // Notices
  [/notice|(^|[^a-z])scn([^a-z]|$)|response/i, { docType: 'Notice', refTypes: ['notice'] }],
]

export function detectDocType(filename) {
  const n = String(filename || '')
  for (const [re, hint] of DOC_HINTS) if (re.test(n)) return hint
  return null
}

// ── financial-year parsing → canonical "YYYY-YY" ─────────────────────────────
// Handles 2025-26, 2025-2026, FY2025-26, F.Y. 25-26, 2025_26. A lone 4-digit year is NOT
// forced into an FY (ambiguous between two years) — it is returned via detectYear for period
// matching only.
export function detectFy(filename) {
  const s = String(filename || '')
  let m = s.match(/(20\d{2})[\s_\-]+(20\d{2})/) // 2025-2026
  if (m) { const a = +m[1]; const b = +m[2]; if (b === a + 1) return fyLabel(a) }
  m = s.match(/(20\d{2})[\s_\-]+(\d{2})/) // 2025-26
  if (m) { const a = +m[1]; const b = +m[2]; if ((a + 1) % 100 === b) return fyLabel(a) }
  m = s.match(/(?:fy|f\.y\.?)[\s_\-]*(\d{2})[\s_\-]+(\d{2})/i) // FY25-26
  if (m) { const a = 2000 + +m[1]; const b = +m[2]; if ((a + 1) % 100 === b) return fyLabel(a) }
  return null
}
function fyLabel(startYear) { return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}` }

export function detectYear(filename) {
  const m = String(filename || '').match(/(20\d{2})/)
  return m ? +m[1] : null
}

// ── period parsing (month / quarter) ─────────────────────────────────────────
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

export function detectPeriod(filename) {
  const s = String(filename || '').toLowerCase()
  const q = s.match(/(?:^|[^a-z])q([1-4])(?:[^0-9]|$)/)
  let month = null, monthIndex = -1
  for (let i = 0; i < MONTHS.length; i++) {
    const re = new RegExp(`(^|[^a-z])(${MONTHS[i]}|${MONTH_ABBR[i]})([^a-z]|$)`, 'i')
    if (re.test(s)) { month = MONTHS[i][0].toUpperCase() + MONTHS[i].slice(1); monthIndex = i; break }
  }
  const year = detectYear(filename)
  if (!month && !q) return null
  return {
    month, // "April" | null
    monthIndex, // 0-based, or -1
    quarter: q ? `Q${q[1]}` : null,
    year,
    label: month ? `${month}${year ? ' ' + year : ''}` : (q ? `Q${q[1]}${year ? ' ' + year : ''}` : ''),
  }
}

// A requirement's period may store the month in full ("April 2026") or abbreviated
// ("Apr-2026"); accept either form.
function monthForms(monthIndex) {
  if (monthIndex < 0) return []
  return [norm(MONTHS[monthIndex]), norm(MONTH_ABBR[monthIndex])]
}

// ── parse a filename into a full suggestion ─────────────────────────────────
export function parseFilename(filename) {
  const hint = detectDocType(filename)
  return {
    filename: String(filename || ''),
    docType: hint ? hint.docType : null,
    refTypes: hint ? hint.refTypes : [],
    fy: detectFy(filename),
    period: detectPeriod(filename),
  }
}

// ── UDIN requirement (preserve the existing FinancialUploadModal rule) ──────
export const UDIN_DOC_TYPES = Object.freeze(['Audited Balance Sheet', 'Tax Audit Report (TAR)'])
export const TAX_AUDIT_APPLICABLE_DOC_TYPES = Object.freeze(['Tax Audit Report (TAR)'])
export function requiresUdin(docType) { return UDIN_DOC_TYPES.includes(docType) }
export function requiresTaxAuditApplicable(docType) { return TAX_AUDIT_APPLICABLE_DOC_TYPES.includes(docType) }

// ── score one requirement row against a parsed file ─────────────────────────
// Returns null when the file cannot be this requirement (hard FY/period mismatch, or no
// type/service signal at all). Otherwise a score; higher = stronger, more specific match.
function scoreRequirement(parsed, req) {
  if (!req) return null
  const reqType = norm(req.doc_type)
  const reqLabel = norm(req.requirement_label)
  const hintType = norm(parsed.docType)

  // document-type signal
  let typeScore = 0
  if (hintType && (reqType === hintType || reqLabel.includes(hintType))) typeScore = 3
  else if (parsed.refTypes.includes(req.requirement_ref_type)) typeScore = 1 // service-only signal
  if (typeScore === 0) return null // no type and no service link → not a candidate

  // FY: a parsed FY that disagrees with the requirement disqualifies it outright.
  let fyScore = 0
  if (parsed.fy) {
    if (req.fy_label === parsed.fy) fyScore = 2
    else return null
  }

  // Period (month/quarter): a parsed period that disagrees with a period-bearing requirement
  // disqualifies it. Year alone (no month/quarter) never disqualifies.
  let periodScore = 0
  if (parsed.period && (parsed.period.month || parsed.period.quarter)) {
    const reqPeriod = norm(req.period)
    if (reqPeriod) {
      const monthOk = monthForms(parsed.period.monthIndex).some((w) => reqPeriod.includes(w))
      const wantQ = parsed.period.quarter ? norm(parsed.period.quarter) : null
      const qOk = wantQ && reqPeriod.includes(wantQ)
      if (!monthOk && !qOk) return null
      // Year disambiguation: "April 2026" must not match the April 2025 requirement. If the
      // filename carries a year and the requirement's period names a (different) year, reject;
      // a matching year is a stronger signal.
      const reqYear = (String(req.period).match(/(20\d{2})/) || [])[1]
      if (parsed.period.year && reqYear) {
        if (String(parsed.period.year) !== reqYear) return null
        periodScore = 3
      } else {
        periodScore = 2
      }
    }
  }
  return typeScore * 10 + fyScore + periodScore
}

// ── match one parsed file against a client's requirement rows ───────────────
// requirements: rows from v_requirement_document_readiness for the SELECTED client only.
// Returns { candidates, best, confidence, status }.
//   confidence: 'high' | 'medium' | 'low' | 'unmatched'
//   status:     'matched' | 'needs_confirmation' | 'unmatched' | 'duplicate'
export function matchFile(parsed, requirements) {
  const scored = []
  for (const req of Array.isArray(requirements) ? requirements : []) {
    const score = scoreRequirement(parsed, req)
    if (score != null) scored.push({ req, score })
  }
  scored.sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    return { candidates: [], best: null, confidence: 'unmatched', status: 'unmatched' }
  }

  const candidates = scored.map((s) => s.req)
  const best = scored[0].req
  const topScore = scored[0].score
  const topCount = scored.filter((s) => s.score === topScore).length
  const strongType = topScore >= 30 // typeScore===3 → doc-type (not service-only) matched

  let confidence
  if (topCount === 1 && strongType && topScore >= 32) confidence = 'high' // single, doc-type + FY/period resolved
  else if (strongType) confidence = 'medium'                              // doc-type matched but ambiguous/underspecified
  else confidence = 'low'                                                 // service-only signal

  // A requirement that already has a CURRENT linked document is a replacement decision.
  const status = best.is_available === true
    ? 'duplicate'
    : confidence === 'high' ? 'matched' : 'needs_confirmation'

  return { candidates, best, confidence, status }
}

// ── build the full per-file plan for a batch (pure) ─────────────────────────
// files: [{ id, filename }]. Returns one row per file with its parse + match. entityType/fy
// are display context only. This is deterministic and side-effect free — the UI renders it,
// lets the user correct it, and only THEN uploads.
export function buildMatchPlan(files, requirements) {
  return (Array.isArray(files) ? files : []).map((f) => {
    const parsed = parseFilename(f && f.filename)
    const match = matchFile(parsed, requirements)
    return {
      id: f && f.id,
      filename: f && f.filename,
      parsed,
      ...match,
      needsUdin: requiresUdin(match.best ? match.best.doc_type : parsed.docType),
    }
  })
}

// ── active service categories a client actually has requirements for ────────
export function clientServiceCategories(requirements) {
  return [...new Set((Array.isArray(requirements) ? requirements : []).map((r) => r && r.requirement_ref_type).filter(Boolean))]
}
