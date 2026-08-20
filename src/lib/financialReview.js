// D16-A — Financial review (manual + local-assisted) pure helpers.
//
// No React, no Supabase, no network, no external AI — importable by node:test. These drive the
// EXISTING Financial & ITR review flow (FinancialReviewModal) so financial figures can be
// entered/reviewed by hand and saved into the EXISTING client_financials / extracted_document_data
// schema — WITHOUT the undeployed, external extract-financial Edge function. No new DB columns.

// Canonical figure groups — every name is an EXISTING client_financials column.
export const PL_FIELDS = ['turnover', 'other_income', 'total_income', 'purchases', 'employee_cost', 'finance_cost', 'depreciation', 'other_expenses', 'ebitda', 'pbt', 'tax_expense', 'pat']
export const BS_FIELDS = ['equity_capital', 'reserves', 'net_worth', 'borrowings', 'trade_payables', 'fixed_assets', 'investments', 'trade_receivables', 'cash_bank', 'loans_advances', 'total_assets', 'total_liabilities']
export const ITR_FIELDS = ['gross_total_income', 'total_deductions', 'taxable_income', 'tax_payable', 'tax_paid', 'refund']
export const AUDIT_FIELDS = ['udin', 'auditor_name', 'audit_firm_frn']

// Which fields to present for manual entry per document type (when no extraction rows exist).
export const FIELDS_BY_DOC_TYPE = Object.freeze({
  'Audited Balance Sheet': [...PL_FIELDS, ...BS_FIELDS, ...AUDIT_FIELDS],
  'Tax Audit Report (TAR)': ['turnover', 'pbt', 'pat', 'tax_audit_applicable', ...AUDIT_FIELDS],
  'Computation of Income': [...ITR_FIELDS, 'turnover', 'pat'],
  'ITR Form': [...ITR_FIELDS],
  'ITR Acknowledgement': ['taxable_income', 'tax_payable', 'tax_paid', 'refund'],
})

// client_financials column typing for the structured save.
export const CF_NUMERIC = [...PL_FIELDS, ...BS_FIELDS, ...ITR_FIELDS]
export const CF_TEXT = ['auditor_name', 'audit_firm_frn', 'udin']
export const CF_BOOL = ['tax_audit_applicable']

// Blank → null (unavailable, never fabricated); otherwise the numeric value (currency symbols/
// separators stripped). Returns null for non-numeric junk too.
export function parseNum(v) {
  const s = String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')
  if (s === '') return null
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

// Blank → null; yes/true/y/1 → true; anything else → false.
export function parseBool(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase()
  if (s === '') return null
  return ['yes', 'true', 'y', '1'].includes(s)
}

function seedValue(fieldName, cfRow) {
  const v = cfRow ? cfRow[fieldName] : undefined
  if (v == null) return ''
  if (CF_BOOL.includes(fieldName)) return v ? 'Yes' : 'No'
  return String(v)
}

// Build the blank/pre-filled manual field set for a document type. Rows mirror the shape of
// extracted_document_data rows (id:null marks a manual field) and are seeded from any saved
// client_financials values so a re-review shows what was saved.
export function buildManualFields(docType, cfRow = {}) {
  const names = FIELDS_BY_DOC_TYPE[docType] || CF_NUMERIC
  return names.map((field_name) => ({
    id: null, manual: true, field_name, extracted_value: null,
    final_value: seedValue(field_name, cfRow),
    confidence_score: 'Manual', extraction_engine: 'manual',
  }))
}

// Map reviewed { field_name, value } entries → a client_financials payload (existing columns
// only). Numeric blanks → null (unavailable). Never invents a value.
export function mapToClientFinancials(entries) {
  const out = {}
  for (const e of Array.isArray(entries) ? entries : []) {
    const fn = e && e.field_name
    if (!fn) continue
    if (CF_NUMERIC.includes(fn)) out[fn] = parseNum(e.value)
    else if (CF_TEXT.includes(fn)) out[fn] = (String(e.value == null ? '' : e.value).trim() || null)
    else if (CF_BOOL.includes(fn)) out[fn] = parseBool(e.value)
  }
  return out
}

// Non-blocking accounting cross-checks. Returns human-readable warnings; NEVER changes figures
// (spec §15: review warning, not automatic overwrite). Only fires when both sides are present.
export function financialReviewWarnings(cf) {
  const w = []
  const n = (k) => (cf && typeof cf[k] === 'number' ? cf[k] : null)
  const tol = (x) => Math.max(1, Math.abs(x) * 0.01) // 1% tolerance (rounding-friendly)
  const ta = n('total_assets'), tl = n('total_liabilities')
  if (ta != null && tl != null && Math.abs(ta - tl) > tol(ta)) w.push(`Total Assets and Total Liabilities do not match (${ta} vs ${tl}).`)
  const pbt = n('pbt'), tax = n('tax_expense'), pat = n('pat')
  if (pbt != null && tax != null && pat != null && Math.abs((pbt - tax) - pat) > tol(pat)) w.push(`PAT does not equal PBT − Tax (${pat} vs ${pbt - tax}).`)
  const eq = n('equity_capital'), res = n('reserves'), nw = n('net_worth')
  if (eq != null && res != null && nw != null && Math.abs((eq + res) - nw) > tol(nw)) w.push(`Net Worth does not equal Equity + Reserves (${nw} vs ${eq + res}).`)
  return w
}
