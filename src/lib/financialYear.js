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
 * The latest FY the DATABASE can generate records for.
 *
 * There is deliberately NO frozen constant here any more — that constant WAS the defect.
 *
 * HISTORY. The original migration (0008_functions_rpc.sql) hard-coded a ceiling:
 *
 *   generate_client_compliance   v_current_fy VARCHAR(10) := '2025-26'   (0008:163)
 *   activate_accounting_service  WHERE fy_label >= p_start_fy AND fy_label <= '2025-26' (0008:139)
 *
 * This module was written against that migration: it carried `BACKEND_MAX_FY = '2025-26'`
 * so it could DETECT the gap that opened once the real FY moved past that literal, and
 * warn instead of letting the UI report a success over an empty range.
 *
 * SUPERSEDED. Migration 0014_r4db_financial_year_repair.sql REMOVED that ceiling. Both RPCs
 * now take their ceiling from public.get_current_fy() — governed by the financial_years
 * table, derived from the IST date, fail-closed — and an empty FY range is now an EXPLICIT
 * database error, not a silent success (0014 SECTION 2 / SECTION 4). The P6 SELECT-only
 * diagnosis (docs/M1B_P6_SELECT_Only_Diagnosis_Closure_Report.md §4.1/§4.3/§4.4) verified
 * the live backend generates through the current FY — FY 2026-27 today — and is NOT capped
 * at 2025-26.
 *
 * So the backend's maximum generatable FY is simply "the current FY", which the frontend
 * already computes with currentFy(). The frozen `BACKEND_MAX_FY = '2025-26'` constant was
 * therefore stale, and fyCoverage() raising a "database can only generate up to FY 2025-26"
 * warning for the current year was a false alarm. Both are removed here.
 *
 * If a future, LIVE-VERIFIED backend limit ever needs asserting, pass it explicitly to
 * fyCoverage(backendMaxFy) — do not reintroduce a hard-coded literal in this module.
 *
 * (Note: '2025-26' still legitimately appears in the backend as
 * get_unknown_incorporation_start_fy() — the start-FY POLICY ANCHOR for a client with no
 * incorporation date (0014 SECTION 2b). That is a FLOOR, not a ceiling: an intentional
 * business rule, unrelated to this module, and must not be "corrected".)
 */

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
 * Can the database generate records for the financial year we are in?
 *
 * Pure, so both onboarding and re-sync can ask the same question and get the same answer.
 *
 * Post-0014 the answer for the current FY is YES: the RPCs generate through
 * get_current_fy(), which IS the current FY. So the ceiling defaults to the current FY and
 * the current year is always covered — the obsolete "database can only generate up to FY
 * 2025-26" warning this function used to raise for the current year is gone.
 *
 * The function stays FAIL-CLOSED and keeps an explicit ceiling parameter for two reasons:
 *   1. If the current FY cannot be determined — a broken clock, or financial_years not
 *      seeded for today (the same condition get_current_fy() itself raises on) — it reports
 *      not-ok rather than claiming coverage it cannot prove.
 *   2. A caller that has fetched the backend's real get_current_fy() (a live SELECT) may
 *      pass it as `backendMaxFy` to surface a genuine frontend/backend mismatch. When such
 *      an explicit ceiling lags the current FY, the missing years are named and the user is
 *      told this needs a database update — that path is preserved verbatim below.
 */
export function fyCoverage(now = new Date(), backendMaxFy = currentFy(now)) {
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
