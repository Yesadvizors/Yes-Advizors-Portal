/**
 * The Indian financial year. One owner. Pure — no I/O, no React, no Supabase.
 *
 * WHY THIS EXISTS (R4)
 *
 * The FY was being decided in six different places, three of them by hand and three of
 * them wrong:
 *
 *   src/lib/compliance.js        ACCOUNTING_START_FY = '2024-25'   frozen literal
 *   src/lib/compliance.js        calendarFyWindow()               its own month arithmetic
 *   src/components/Compliance.jsx   FY_LIST = ['2025-26', ...]    frozen list, no 2026-27
 *   src/components/Compliance.jsx   useState('2024-25')           frozen "current" FY
 *   src/components/WorkDocuments.jsx FY_OPTIONS = [...]           a DIFFERENT frozen list
 *   src/components/WorkDocuments.jsx useState('2024-25')          frozen "current" FY
 *
 * Every one of them had to be remembered each April, and none of them had been. The point
 * of this module is that there is now nothing to remember.
 *
 * ── THE RULES ────────────────────────────────────────────────────────────────
 *
 *   The Indian FY runs 1 April to 31 March and is labelled by the year it STARTS in.
 *
 *     31 March 2026  ->  FY 2025-26     (the last day of the FY that began 1 Apr 2025)
 *      1 April 2026  ->  FY 2026-27     (the first day of the next one)
 *     January–March  ->  the FY that started in the PREVIOUS calendar year
 *
 *   That single day boundary is the whole reason this file exists. Every hand-rolled
 *   version of this logic in the codebase got 31 March / 1 April right and then got
 *   something else wrong.
 *
 * ── TIME ZONES: read this before "simplifying" anything below ────────────────
 *
 *   `new Date('2026-04-01')` is parsed as UTC midnight. In a zone behind UTC that is
 *   still 31 March locally, so `.getMonth()` returns 2 (March) and the date lands in the
 *   WRONG financial year — off by a whole year, on exactly the boundary that matters.
 *
 *   So a date given as a 'YYYY-MM-DD' string (which is what every date column in this
 *   database returns) is read by pulling the numbers straight out of the string. No Date
 *   object, no zone, no drift. A real Date object is read with the LOCAL accessors,
 *   because that is what the clock on the user's wall says, and the users are in India.
 */

/** The label of the earliest FY this system tracks. Mirrors get_client_start_fy()'s floor
 *  (supabase/migrations/0007_dependency_closure.sql:267 — v_base_fy := '2020-21'). */
export const MIN_FY = '2020-21'

/**
 * The latest FY the DATABASE can currently generate records for.
 *
 * ⚠️ This is not a preference. It is a hard-coded ceiling inside two SQL functions:
 *
 *   generate_client_compliance   v_current_fy VARCHAR(10) := '2025-26'
 *                                (0008_functions_rpc.sql:163)
 *   activate_accounting_service  WHERE fy_label >= p_start_fy AND fy_label <= '2025-26'
 *                                (0008_functions_rpc.sql:139)
 *
 * Both loop `fy_label >= start AND fy_label <= '2025-26'`. Once the real financial year
 * moves past 2025-26 — which it already has — those loops produce NOTHING for the current
 * year, and both RPCs still return success. Raising this ceiling requires a MIGRATION,
 * which is out of scope for R4, so the frontend's job is to DETECT the gap and say so
 * rather than let the UI report a success that did not happen.
 *
 * When the migration lands, this constant moves with it (or, better, the SQL stops
 * hard-coding a ceiling at all and this constant is deleted).
 */
export const BACKEND_MAX_FY = '2025-26'

const FY_LABEL = /^(\d{4})-(\d{2})$/

/** Is this a well-formed FY label, with a second half that actually follows the first? */
export function isValidFyLabel(label) {
  const m = FY_LABEL.exec(String(label ?? '').trim())
  if (!m) return false
  const start = parseInt(m[1], 10)
  // '2025-26' is valid; '2025-27' and '2025-25' are not. The two halves must be
  // consecutive years, or the label is not naming a financial year at all.
  return m[2] === String((start + 1) % 100).padStart(2, '0')
}

function requireValid(label, who) {
  if (!isValidFyLabel(label)) {
    throw new Error(`${who}: "${label}" is not a valid financial-year label (expected e.g. "2025-26")`)
  }
}

/** The calendar year an FY starts in. '2025-26' -> 2025. */
export function fyStartYear(label) {
  requireValid(label, 'fyStartYear')
  return parseInt(String(label).trim().slice(0, 4), 10)
}

/** Build the label for the FY beginning in `startYear`. 2025 -> '2025-26'. */
export function fyLabelFromStartYear(startYear) {
  const y = Number(startYear)
  if (!Number.isInteger(y) || y < 1900 || y > 9999) {
    throw new Error(`fyLabelFromStartYear: ${startYear} is not a usable calendar year`)
  }
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`
}

/**
 * Pull year and month out of a date without letting a time zone touch it.
 * Accepts 'YYYY-MM-DD' (or an ISO timestamp) and a Date. Returns null if unusable.
 */
function yearMonth(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    // Local accessors on purpose — the wall clock in India is the answer we want.
    return { year: value.getFullYear(), month: value.getMonth() + 1 }
  }
  if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(value.trim())
    if (!m) return null
    const month = parseInt(m[2], 10)
    if (month < 1 || month > 12) return null
    return { year: parseInt(m[1], 10), month }
  }
  return null
}

/**
 * The financial year a given date falls in.
 *
 *   1 April 2026 .. 31 March 2027  ->  '2026-27'
 *
 * Returns null for an unusable date, rather than guessing. A guessed FY is worse than no
 * FY: it silently files a return under the wrong year.
 */
export function fyForDate(date) {
  const ym = yearMonth(date)
  if (!ym) return null
  // April (4) onward starts the new FY. January–March still belong to the FY that began
  // in the previous calendar year.
  const startYear = ym.month >= 4 ? ym.year : ym.year - 1
  return fyLabelFromStartYear(startYear)
}

/** The FY we are in right now. */
export function currentFy(now = new Date()) {
  return fyForDate(now)
}

/** The FY before this one. '2025-26' -> '2024-25'. */
export function previousFy(label) {
  return fyLabelFromStartYear(fyStartYear(label) - 1)
}

/** The FY after this one. '2025-26' -> '2026-27'. */
export function nextFy(label) {
  return fyLabelFromStartYear(fyStartYear(label) + 1)
}

/** First day of the FY, as 'YYYY-MM-DD'. '2025-26' -> '2025-04-01'. */
export function fyStartDate(label) {
  return `${fyStartYear(label)}-04-01`
}

/** Last day of the FY, as 'YYYY-MM-DD'. '2025-26' -> '2026-03-31'.
 *  Always 31 March — a leap year lengthens February, it does not move the year end. */
export function fyEndDate(label) {
  return `${fyStartYear(label) + 1}-03-31`
}

/** Does this date fall inside this FY? */
export function isDateInFy(date, label) {
  const fy = fyForDate(date)
  return fy !== null && isValidFyLabel(label) && fy === String(label).trim()
}

/** Order two FY labels. Negative if a is earlier. Lexicographic works for these labels,
 *  but comparing the numbers says what we mean and survives a format change. */
export function compareFy(a, b) {
  return fyStartYear(a) - fyStartYear(b)
}

/** The later of two FY labels. */
export function maxFy(a, b) {
  return compareFy(a, b) >= 0 ? a : b
}

/** Every FY label from `from` to `to` inclusive. Empty if `from` is after `to` —
 *  which is exactly what the database does, and exactly how accounting can silently
 *  produce nothing. See fyCoverage(). */
export function fyRange(from, to) {
  requireValid(from, 'fyRange')
  requireValid(to, 'fyRange')
  const out = []
  for (let y = fyStartYear(from); y <= fyStartYear(to); y++) out.push(fyLabelFromStartYear(y))
  return out
}

/**
 * The FY a client's records should start from, given the date they came into existence.
 *
 * This mirrors the database's own get_client_start_fy() exactly
 * (0007_dependency_closure.sql:261) — the FY of the incorporation date, floored at
 * MIN_FY — so that the accounting tracker and the compliance trackers cover the same
 * span instead of quietly disagreeing.
 *
 * A missing date yields MIN_FY, which is what the database does with a NULL. It does NOT
 * yield "today": see the note on buildGenerateComplianceArgs in compliance.js for why
 * that particular default was silently destroying compliance generation.
 */
export function startFyFromDate(date, floor = MIN_FY) {
  requireValid(floor, 'startFyFromDate')
  const fy = fyForDate(date)
  if (fy === null) return floor
  return maxFy(fy, floor)
}

/**
 * The FY choices offered in a dropdown: newest first, back to MIN_FY.
 *
 * Replaces two DIFFERENT frozen arrays that had drifted apart —
 *   Compliance.jsx      ['2025-26' … '2020-21']   (6 entries)
 *   WorkDocuments.jsx   ['2025-26' … '2021-22']   (5 entries — a year short)
 * — and neither of which contained the current financial year, so the year everyone
 * actually needed to file for could not be selected at all.
 *
 * Historic years are preserved deliberately: they are valid choices for looking at past
 * records, and dropping them would break real filters.
 */
export function fyOptions(now = new Date(), earliest = MIN_FY) {
  const latest = currentFy(now)
  if (latest === null) return [earliest]
  // If the clock is somehow before MIN_FY, still offer something usable.
  if (compareFy(latest, earliest) < 0) return [earliest]
  return fyRange(earliest, latest).reverse()
}

/**
 * Can the database actually generate records for the financial year we are in?
 *
 * Pure, so both onboarding and re-sync can ask the same question and get the same answer.
 *
 * This is not a hypothetical. Today the answer is NO: the SQL ceiling is 2025-26 and the
 * real FY has moved past it, so `fy_label >= start AND fy_label <= '2025-26'` matches
 * nothing for the current year — and both RPCs return success anyway. Without this check
 * the UI would report "compliance records generated successfully" over an empty result.
 */
export function fyCoverage(now = new Date(), backendMaxFy = BACKEND_MAX_FY) {
  const fy = currentFy(now)
  if (fy === null || !isValidFyLabel(backendMaxFy)) {
    return { ok: false, currentFy: fy, backendMaxFy, missing: [], reason: 'The current financial year could not be determined.' }
  }

  if (compareFy(fy, backendMaxFy) <= 0) {
    return { ok: true, currentFy: fy, backendMaxFy, missing: [] }
  }

  const missing = fyRange(nextFy(backendMaxFy), fy)
  return {
    ok: false,
    currentFy: fy,
    backendMaxFy,
    missing,
    reason:
      `The database can only generate compliance records up to FY ${backendMaxFy}, but the current financial year is ${fy}. ` +
      `Records for ${missing.join(', ')} were NOT created. This needs a database update — please ask an administrator.`,
  }
}
