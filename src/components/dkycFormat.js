// Shared Director KYC date helpers (Phase 2B consolidated).
// Mon-YYYY display, month/year <-> first-of-month date, strict validation.
// No +3 / no client-side Next KYC math. Date-ONLY strings (YYYY-MM-DD) are parsed
// from their components — never via new Date('YYYY-MM-DD') — to avoid timezone
// shifts (UTC parse can roll a date back a day / change the month for some users).

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function parts(v) {
  if (!v) return null
  if (v instanceof Date) {
    if (isNaN(v)) return null
    return { y: v.getFullYear(), m: v.getMonth() + 1, d: v.getDate() }
  }
  const s = String(v)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return { y: +m[1], m: +m[2], d: +m[3] }
  const ym = s.match(/^(\d{4})-(\d{2})$/)
  if (ym) return { y: +ym[1], m: +ym[2], d: 1 }
  return null
}

export function monYYYY(v) {
  const p = parts(v)
  if (!p || p.m < 1 || p.m > 12) return ''
  return `${MONTHS[p.m - 1]}-${p.y}`
}

export function dateToMonthYear(v) {
  const p = parts(v)
  if (!p) return { month: '', year: '' }
  return { month: String(p.m), year: String(p.y) }
}

export function monthYearToFirstOfMonth(month, year) {
  const m = parseInt(month, 10)
  if (!m || m < 1 || m > 12) return null
  if (!/^\d{4}$/.test(String(year))) return null
  const y = parseInt(year, 10)
  return `${y}-${String(m).padStart(2, '0')}-01`
}

const LOWER_BOUND_YEAR = 1900

export function validateLastKyc(month, year) {
  if (!month && !year) return { ok: true }
  if (!month || !year) return { ok: false, error: 'Select both month and year for Last KYC.' }
  if (!/^\d{4}$/.test(String(year))) return { ok: false, error: 'Year must be exactly four digits.' }
  const y = parseInt(year, 10)
  const m = parseInt(month, 10)
  if (y < LOWER_BOUND_YEAR) return { ok: false, error: `Year must be ${LOWER_BOUND_YEAR} or later.` }
  const now = new Date()
  const cy = now.getFullYear(), cm = now.getMonth() + 1
  if (y > cy || (y === cy && m > cm)) return { ok: false, error: 'Last KYC cannot be later than the current month/year.' }
  return { ok: true }
}

export function validateAllotment(dateStr) {
  if (!dateStr) return { ok: true }
  const p = parts(dateStr)
  if (!p || p.m < 1 || p.m > 12 || p.d < 1 || p.d > 31) return { ok: false, error: 'Enter a valid allotment date.' }
  if (p.y < LOWER_BOUND_YEAR) return { ok: false, error: `Allotment year must be ${LOWER_BOUND_YEAR} or later.` }
  const now = new Date()
  const ty = now.getFullYear(), tm = now.getMonth() + 1, tdv = now.getDate()
  const cmp = (p.y - ty) || (p.m - tm) || (p.d - tdv)
  if (cmp > 0) return { ok: false, error: 'Allotment date cannot be later than today.' }
  return { ok: true }
}

export function sameDate(a, b) {
  const pa = parts(a), pb = parts(b)
  if (!pa && !pb) return true
  if (!pa || !pb) return false
  return pa.y === pb.y && pa.m === pb.m && pa.d === pb.d
}

export function fmtDateOnly(v) {
  const p = parts(v)
  if (!p || p.m < 1 || p.m > 12) return '—'
  return `${String(p.d).padStart(2, '0')} ${MONTHS[p.m - 1]} ${p.y}`
}
