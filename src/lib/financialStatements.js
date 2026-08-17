// Pure helpers for the Client 360 → Financials → Balance Sheet / P&L presentation.
// Maps a public.client_financials row (structured, reviewed extraction) onto the standard
// accounting layout. NO fabrication: a field that is null/absent renders as unavailable, and
// when no structured row exists at all the UI shows an honest "not yet available" state and
// falls back to source-document readiness.

// ₹ formatter (Indian grouping). null/undefined → null (caller shows a dash), never 0-as-value.
export function inr(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  const neg = n < 0
  const s = Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
  return (neg ? '(₹' : '₹') + s + (neg ? ')' : '')
}

// True when a client_financials row carries at least one structured monetary value — i.e.
// there is something real to present, not just an empty shell row.
const MONEY_KEYS = [
  'turnover', 'other_income', 'total_income', 'purchases', 'employee_cost', 'finance_cost',
  'depreciation', 'other_expenses', 'pbt', 'tax_expense', 'pat', 'ebitda', 'equity_capital',
  'reserves', 'net_worth', 'borrowings', 'trade_payables', 'fixed_assets', 'investments',
  'trade_receivables', 'cash_bank', 'loans_advances', 'total_assets', 'total_liabilities',
]
export function hasStructuredValues(row) {
  if (!row) return false
  return MONEY_KEYS.some(k => row[k] !== null && row[k] !== undefined && row[k] !== '' && Number.isFinite(Number(row[k])))
}

// Balance Sheet line groups (accounting order). Each line: { label, key, indent?, total? }.
export const BALANCE_SHEET = [
  { section: 'ASSETS', lines: [
    { label: 'Non-Current Assets', total: true },
    { label: 'Fixed assets', key: 'fixed_assets', indent: true },
    { label: 'Investments', key: 'investments', indent: true },
    { label: 'Current Assets', total: true },
    { label: 'Trade receivables', key: 'trade_receivables', indent: true },
    { label: 'Cash & bank', key: 'cash_bank', indent: true },
    { label: 'Loans & advances', key: 'loans_advances', indent: true },
    { label: 'TOTAL ASSETS', key: 'total_assets', grandTotal: true },
  ] },
  { section: 'EQUITY & LIABILITIES', lines: [
    { label: 'Equity', total: true },
    { label: 'Equity capital', key: 'equity_capital', indent: true },
    { label: 'Reserves & surplus', key: 'reserves', indent: true },
    { label: 'Net worth', key: 'net_worth', indent: true, subtotal: true },
    { label: 'Non-Current Liabilities', total: true },
    { label: 'Borrowings', key: 'borrowings', indent: true },
    { label: 'Current Liabilities', total: true },
    { label: 'Trade payables', key: 'trade_payables', indent: true },
    { label: 'TOTAL EQUITY & LIABILITIES', key: 'total_liabilities', grandTotal: true },
  ] },
]

// Profit & Loss lines (top → bottom).
export const PROFIT_AND_LOSS = [
  { label: 'Revenue from operations', key: 'turnover' },
  { label: 'Other income', key: 'other_income' },
  { label: 'Total income', key: 'total_income', subtotal: true },
  { label: 'Purchases / COGS', key: 'purchases' },
  { label: 'Employee cost', key: 'employee_cost' },
  { label: 'Other expenses', key: 'other_expenses' },
  { label: 'EBITDA', key: 'ebitda', subtotal: true },
  { label: 'Depreciation', key: 'depreciation' },
  { label: 'Finance cost', key: 'finance_cost' },
  { label: 'Profit before tax (PBT)', key: 'pbt', subtotal: true },
  { label: 'Tax expense', key: 'tax_expense' },
  { label: 'Profit after tax (PAT)', key: 'pat', grandTotal: true },
]

// Sort rows newest-FY first and index by fy_label for prior-year comparison.
export function byFy(rows) {
  const list = [...(rows || [])].sort((a, b) => String(b.fy_label).localeCompare(String(a.fy_label)))
  return { list, byLabel: Object.fromEntries(list.map(r => [r.fy_label, r])) }
}
