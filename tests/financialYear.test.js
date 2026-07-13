import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  MIN_FY, BACKEND_MAX_FY, isValidFyLabel, fyStartYear, fyLabelFromStartYear,
  fyForDate, currentFy, previousFy, nextFy, fyStartDate, fyEndDate, isDateInFy,
  compareFy, maxFy, fyRange, startFyFromDate, fyOptions, fyCoverage,
} from '../src/lib/financialYear.js'
import {
  accountingStartFy, buildGenerateComplianceArgs, calendarFyWindow,
  coverageGap, saveFullySucceeded,
} from '../src/lib/compliance.js'

/* ── The boundary. This is the whole point of the module. ────────────────── */

test('the 31 March / 1 April boundary — every date the spec names', () => {
  const cases = [
    ['2025-03-31', '2024-25', 'last day of FY 2024-25'],
    ['2025-04-01', '2025-26', 'first day of FY 2025-26'],
    ['2025-12-31', '2025-26', 'December is still the FY that began in April'],
    ['2026-01-01', '2025-26', 'January belongs to the FY that started LAST calendar year'],
    ['2026-03-31', '2025-26', 'the FY does not end until 31 March closes'],
    ['2026-04-01', '2026-27', 'and the new FY starts the very next day'],
  ]
  for (const [date, expected, why] of cases) {
    assert.equal(fyForDate(date), expected, `${date} -> expected ${expected} (${why})`)
  }
})

test('the boundary holds one day either side, across several years', () => {
  for (const y of [2021, 2024, 2025, 2026, 2027, 2030]) {
    assert.equal(fyForDate(`${y}-03-31`), `${y - 1}-${String(y % 100).padStart(2, '0')}`)
    assert.equal(fyForDate(`${y}-04-01`), `${y}-${String((y + 1) % 100).padStart(2, '0')}`)
  }
})

test('January to March always belong to the FY that started the previous calendar year', () => {
  for (const m of ['01', '02', '03']) {
    assert.equal(fyForDate(`2026-${m}-15`), '2025-26')
  }
  for (const m of ['04', '05', '12']) {
    assert.equal(fyForDate(`2026-${m}-15`), '2026-27')
  }
})

test('leap day: 29 February 2024 falls in FY 2023-24', () => {
  assert.equal(fyForDate('2024-02-29'), '2023-24')
  // A leap year lengthens February; it does not move the year end.
  assert.equal(fyEndDate('2023-24'), '2024-03-31')
  assert.equal(fyStartDate('2023-24'), '2023-04-01')
  assert.equal(isDateInFy('2024-02-29', '2023-24'), true)
  assert.equal(isDateInFy('2024-02-29', '2024-25'), false)
})

test('leap day 29 Feb 2028 likewise falls in FY 2027-28', () => {
  assert.equal(fyForDate('2028-02-29'), '2027-28')
})

/* ── Time zones: the trap that makes hand-rolled FY logic wrong ──────────── */

test('a YYYY-MM-DD date is read without a time zone — 1 April cannot slip into March', () => {
  // `new Date('2026-04-01')` is UTC midnight. West of Greenwich that is still 31 March
  // locally, and .getMonth() would say March — landing the date a WHOLE YEAR out, on
  // precisely the boundary that matters. Reading the string directly cannot drift.
  assert.equal(fyForDate('2026-04-01'), '2026-27')
  assert.equal(fyForDate('2026-03-31'), '2025-26')
  assert.equal(fyForDate('2026-04-01T00:00:00Z'), '2026-27')
  assert.equal(fyForDate('2026-04-01T23:59:59+05:30'), '2026-27')
})

test('a Date object is read from the local clock, consistently', () => {
  // Constructed with local components, so no UTC round-trip to drift.
  assert.equal(fyForDate(new Date(2026, 3, 1)), '2026-27')   // month 3 = April
  assert.equal(fyForDate(new Date(2026, 2, 31)), '2025-26')  // month 2 = March
})

/* ── previous / next / start / end ───────────────────────────────────────── */

test('previousFy and nextFy step by exactly one year', () => {
  assert.equal(previousFy('2025-26'), '2024-25')
  assert.equal(nextFy('2025-26'), '2026-27')
  assert.equal(previousFy('2020-21'), '2019-20')
  assert.equal(nextFy('2099-00'), '2100-01')          // century rollover
  assert.equal(nextFy(previousFy('2026-27')), '2026-27')
})

test('FY start and end dates', () => {
  assert.equal(fyStartDate('2025-26'), '2025-04-01')
  assert.equal(fyEndDate('2025-26'), '2026-03-31')
  assert.equal(fyStartDate('2026-27'), '2026-04-01')
  assert.equal(fyEndDate('2026-27'), '2027-03-31')
  // The end date of one FY is the day before the start of the next.
  assert.equal(fyForDate(fyEndDate('2025-26')), '2025-26')
  assert.equal(fyForDate(fyStartDate('2026-27')), '2026-27')
})

test('compareFy / maxFy / fyRange', () => {
  assert.ok(compareFy('2024-25', '2025-26') < 0)
  assert.ok(compareFy('2026-27', '2025-26') > 0)
  assert.equal(compareFy('2025-26', '2025-26'), 0)
  assert.equal(maxFy('2024-25', '2026-27'), '2026-27')
  assert.deepEqual(fyRange('2024-25', '2026-27'), ['2024-25', '2025-26', '2026-27'])
  assert.deepEqual(fyRange('2025-26', '2025-26'), ['2025-26'])
  // An inverted range is empty — which is EXACTLY how the SQL silently creates nothing.
  assert.deepEqual(fyRange('2026-27', '2025-26'), [])
})

/* ── Label validation ────────────────────────────────────────────────────── */

test('invalid FY labels are rejected', () => {
  const bad = [
    '2025', '25-26', '2025-2026', '2025_26', 'FY2025-26', '', null, undefined, {}, [],
    '2025-27',   // the halves are not consecutive years
    '2025-25',   // nor these
    '2025-24',   // going backwards
    'abcd-ef',
  ]
  for (const b of bad) {
    assert.equal(isValidFyLabel(b), false, `${JSON.stringify(b)} should be rejected`)
  }
})

test('valid FY labels are accepted, including the century rollover', () => {
  for (const good of ['2020-21', '2025-26', '2026-27', '2099-00', '2000-01']) {
    assert.equal(isValidFyLabel(good), true, `${good} should be accepted`)
  }
  assert.equal(isValidFyLabel('  2025-26  '), true, 'surrounding whitespace is tolerated')
})

test('the helpers refuse to operate on an invalid label rather than guessing', () => {
  for (const fn of [fyStartYear, previousFy, nextFy, fyStartDate, fyEndDate]) {
    assert.throws(() => fn('2025-27'), /not a valid financial-year label/)
    assert.throws(() => fn('nonsense'), /not a valid financial-year label/)
  }
  // A guessed FY is worse than a refusal: it files a return under the wrong year.
  assert.equal(fyForDate('not a date'), null)
  assert.equal(fyForDate(null), null)
  assert.equal(fyForDate(new Date('nonsense')), null)
  assert.equal(fyForDate('2026-13-01'), null, 'month 13 is not a month')
})

test('fyLabelFromStartYear round-trips with fyStartYear', () => {
  for (const y of [2020, 2025, 2026, 2099]) {
    assert.equal(fyStartYear(fyLabelFromStartYear(y)), y)
  }
})

/* ── Incorporation date -> start FY ──────────────────────────────────────── */

test('incorporation date maps to the FY it falls in, floored at MIN_FY', () => {
  assert.equal(startFyFromDate('2023-09-15'), '2023-24')
  assert.equal(startFyFromDate('2024-03-31'), '2023-24', 'still the old FY on 31 March')
  assert.equal(startFyFromDate('2024-04-01'), '2024-25', 'the new FY from 1 April')
  assert.equal(startFyFromDate('2026-04-01'), '2026-27')
})

test('an incorporation date before MIN_FY is floored, not honoured', () => {
  // The database does the same (get_client_start_fy floors at '2020-21'), and the
  // financial_years table does not go back further anyway.
  assert.equal(startFyFromDate('2005-06-01'), MIN_FY)
  assert.equal(startFyFromDate('1998-01-01'), MIN_FY)
  assert.equal(startFyFromDate('2020-03-31'), MIN_FY, '2019-20 is below the floor')
  assert.equal(startFyFromDate('2020-04-01'), '2020-21', 'exactly on the floor')
})

test('a missing incorporation date yields MIN_FY — the database rule — not "today"', () => {
  for (const missing of [null, undefined, '', 'garbage']) {
    assert.equal(startFyFromDate(missing), MIN_FY)
  }
})

/* ── Accounting start FY: the stale-default fix ──────────────────────────── */

test('accountingStartFy is derived per client, not frozen at 2024-25', () => {
  assert.equal(accountingStartFy({ date_of_incorporation: '2023-09-15' }), '2023-24')
  assert.equal(accountingStartFy({ date_of_incorporation: '2026-05-01' }), '2026-27')
  assert.equal(accountingStartFy({ date_of_incorporation: '2005-06-01' }), '2020-21')
  assert.equal(accountingStartFy({ date_of_incorporation: null }), '2020-21')
  assert.equal(accountingStartFy({}), '2020-21')
  assert.equal(accountingStartFy(null), '2020-21')
})

test('NO STALE DEFAULT: a client incorporated after 2024-25 never gets 2024-25', () => {
  // The old code sent p_start_fy = '2024-25' for EVERY client. A company incorporated in
  // 2026 would have been given accounting records for years before it existed.
  for (const doi of ['2025-04-01', '2025-12-31', '2026-04-01', '2026-07-13']) {
    const fy = accountingStartFy({ date_of_incorporation: doi })
    assert.notEqual(fy, '2024-25', `${doi} still produced the stale 2024-25 default`)
    assert.ok(compareFy(fy, '2024-25') > 0, `${doi} should start after 2024-25, got ${fy}`)
  }
})

test('the accounting start FY matches the database\'s own get_client_start_fy rule', () => {
  // Ported from 0007_dependency_closure.sql:261 — month >= 4 keeps the year, else year-1;
  // then floored at '2020-21'. If these ever disagree, accounting and the compliance
  // trackers silently cover different spans.
  const sqlRule = (iso) => {
    if (!iso) return '2020-21'
    const [y, m] = iso.split('-').map(Number)
    const start = m >= 4 ? y : y - 1
    const fy = `${start}-${String((start + 1) % 100).padStart(2, '0')}`
    return fy > '2020-21' ? fy : '2020-21'
  }
  for (const doi of ['2005-06-01', '2020-03-31', '2020-04-01', '2023-09-15',
                     '2024-03-31', '2024-04-01', '2026-04-01', null]) {
    assert.equal(accountingStartFy({ date_of_incorporation: doi }), sqlRule(doi),
      `frontend and database disagree about the start FY for ${doi}`)
  }
})

/* ── buildGenerateComplianceArgs: the destructive "|| today" default ─────── */

test('a missing incorporation date is passed as null, NOT as today', () => {
  const args = buildGenerateComplianceArgs({ id: 'x', client_type: 'LLP' })

  assert.equal(args.p_incorporation_date, null)

  // WHY THIS MATTERS. The old code sent today's date. The database then computed
  // get_client_start_fy(today) = the CURRENT FY, and looped
  //     WHERE fy_label >= <current FY> AND fy_label <= '2025-26'   (the SQL ceiling)
  // which, now that the real FY is past the ceiling, matches NOTHING. The client got no
  // compliance records at all and the RPC still returned success.
  const todayFy = currentFy(new Date('2026-07-13'))
  assert.deepEqual(fyRange(todayFy, BACKEND_MAX_FY), [],
    'sending today would have produced an empty range — i.e. zero compliance records')
})

test('a real incorporation date is passed through untouched', () => {
  const args = buildGenerateComplianceArgs({ id: 'x', client_type: 'LLP', date_of_incorporation: '2023-09-15' })
  assert.equal(args.p_incorporation_date, '2023-09-15')
})

/* ── Calendar FY window ──────────────────────────────────────────────────── */

test('calendarFyWindow covers this FY and the next, on both sides of the boundary', () => {
  assert.deepEqual(calendarFyWindow(new Date(2026, 2, 31)), { currentFY: '2025-26', nextFY: '2026-27' })
  assert.deepEqual(calendarFyWindow(new Date(2026, 3, 1)),  { currentFY: '2026-27', nextFY: '2027-28' })
  assert.deepEqual(calendarFyWindow(new Date(2026, 0, 15)), { currentFY: '2025-26', nextFY: '2026-27' })
})

test('nextFY never collapses onto currentFY', () => {
  for (let m = 0; m < 12; m++) {
    const { currentFY, nextFY } = calendarFyWindow(new Date(2026, m, 15))
    assert.notEqual(nextFY, currentFY, `month ${m}: the window covered only one FY`)
    assert.equal(nextFY, nextFy(currentFY))
  }
})

/* ── Dropdown options ────────────────────────────────────────────────────── */

test('fyOptions is newest-first, includes the CURRENT FY, and keeps the historic years', () => {
  const opts = fyOptions(new Date(2026, 6, 13))    // 13 July 2026 -> FY 2026-27

  assert.equal(opts[0], '2026-27', 'the current FY must be offered — it was missing before')
  assert.equal(opts[opts.length - 1], MIN_FY, 'historic years must remain selectable')
  assert.deepEqual(opts, ['2026-27', '2025-26', '2024-25', '2023-24', '2022-23', '2021-22', '2020-21'])

  // Descending, no gaps, no duplicates.
  for (let i = 1; i < opts.length; i++) {
    assert.equal(fyStartYear(opts[i - 1]) - fyStartYear(opts[i]), 1)
  }
  assert.equal(new Set(opts).size, opts.length)
  opts.forEach(o => assert.ok(isValidFyLabel(o), `${o} is not a valid label`))
})

test('fyOptions grows by itself each April — nobody has to remember', () => {
  const before = fyOptions(new Date(2027, 2, 31))   // 31 Mar 2027
  const after  = fyOptions(new Date(2027, 3, 1))    // 1 Apr 2027

  assert.equal(before[0], '2026-27')
  assert.equal(after[0], '2027-28')
  assert.equal(after.length, before.length + 1)
  assert.ok(!before.includes('2027-28'), 'the new FY must not appear before it starts')
})

/* ── The SQL ceiling ─────────────────────────────────────────────────────── */

test('fyCoverage is satisfied while the current FY is within the database ceiling', () => {
  const c = fyCoverage(new Date(2025, 5, 1), '2025-26')   // June 2025 -> FY 2025-26
  assert.equal(c.ok, true)
  assert.deepEqual(c.missing, [])
})

test('fyCoverage detects the gap once the FY passes the ceiling — and names the years', () => {
  const c = fyCoverage(new Date(2026, 6, 13), '2025-26')  // 13 July 2026 -> FY 2026-27
  assert.equal(c.ok, false)
  assert.equal(c.currentFy, '2026-27')
  assert.deepEqual(c.missing, ['2026-27'])
  assert.match(c.reason, /2026-27/)
  assert.match(c.reason, /2025-26/)
  assert.match(c.reason, /administrator/i)
  assert.doesNotMatch(c.reason, /retry/i, 'retrying cannot move a ceiling that lives in SQL')
})

test('fyCoverage reports EVERY missing year, not just the first', () => {
  const c = fyCoverage(new Date(2028, 6, 1), '2025-26')   // FY 2028-29
  assert.equal(c.ok, false)
  assert.deepEqual(c.missing, ['2026-27', '2027-28', '2028-29'])
})

test('the gap opens exactly on 1 April, not a day before', () => {
  assert.equal(fyCoverage(new Date(2026, 2, 31), '2025-26').ok, true,  '31 Mar 2026 is still covered')
  assert.equal(fyCoverage(new Date(2026, 3, 1),  '2025-26').ok, false, '1 Apr 2026 opens the gap')
})

test('TODAY the database ceiling is already behind the real financial year', () => {
  // This is not hypothetical. It is the live state of the system, and the reason the
  // frontend has to detect it rather than trust the RPC's success.
  const c = fyCoverage(new Date(2026, 6, 13))   // the real BACKEND_MAX_FY
  assert.equal(BACKEND_MAX_FY, '2025-26')
  assert.equal(c.ok, false)
  assert.deepEqual(c.missing, ['2026-27'])
})

/* ── STATIC: the frozen literals must not come back ──────────────────────── */

const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

const read = p => stripComments(readFileSync(new URL(p, import.meta.url), 'utf8'))

test('STATIC: no hard-coded FY literal survives in executable code', () => {
  const files = [
    '../src/lib/compliance.js',
    '../src/lib/complianceRunner.js',
    '../src/components/OnboardingWizard.jsx',
    '../src/components/Clients.jsx',
    '../src/components/Compliance.jsx',
    '../src/components/WorkDocuments.jsx',
  ]
  for (const f of files) {
    const src = read(f)
    const hits = src.match(/['"]20\d{2}-\d{2}['"]/g) || []
    assert.deepEqual(hits, [], `${f} still contains hard-coded FY literal(s): ${hits.join(', ')}`)
  }
})

test('STATIC: the FY constants live in financialYear.js and nowhere else', () => {
  // MIN_FY and BACKEND_MAX_FY are allowed to be literals — that is their whole job. They
  // are the single declared place where a year is written down.
  const fy = read('../src/lib/financialYear.js')
  assert.match(fy, /export const MIN_FY = '2020-21'/)
  assert.match(fy, /export const BACKEND_MAX_FY = '2025-26'/)
})

test('STATIC: ACCOUNTING_START_FY is gone', () => {
  for (const f of ['../src/lib/compliance.js', '../src/lib/complianceRunner.js',
                   '../src/components/OnboardingWizard.jsx']) {
    assert.doesNotMatch(read(f), /ACCOUNTING_START_FY/,
      `${f}: the frozen accounting start FY is back`)
  }
})

test('STATIC: components derive the FY rather than hard-coding a "current" one', () => {
  for (const f of ['../src/components/Compliance.jsx', '../src/components/WorkDocuments.jsx']) {
    const src = read(f)
    assert.match(src, /from '\.\.\/lib\/financialYear'/, `${f} must use the shared FY utility`)
    assert.match(src, /currentFy\(\)/, `${f} must derive the current FY`)
    assert.match(src, /fyOptions\(\)/, `${f} must derive its FY dropdown`)
    assert.doesNotMatch(src, /useState\('20\d{2}-\d{2}'\)/, `${f} still seeds state with a frozen FY`)
  }
})

test('STATIC: both compliance surfaces check FY coverage before claiming success', () => {
  for (const f of ['../src/components/OnboardingWizard.jsx', '../src/components/Clients.jsx']) {
    const src = read(f)
    assert.match(src, /fyCoverage\(\)/, `${f} must detect the FY ceiling gap`)
  }
  // And the re-sync button must not go green when the gap exists.
  assert.match(read('../src/components/Clients.jsx'), /if \(!coverage\.ok\)/)
})

test('STATIC: no hand-rolled month arithmetic decides an FY any more', () => {
  for (const f of ['../src/lib/compliance.js', '../src/components/Compliance.jsx',
                   '../src/components/WorkDocuments.jsx']) {
    assert.doesNotMatch(read(f), /getMonth\(\)\s*>=\s*3/,
      `${f}: FY month arithmetic must live in financialYear.js`)
  }
})

/* ────────────────────────────────────────────────────────────────────────────
   R4 Rev 1.1 — the coverage warning must not be gated on the runner having run.

   Rev 1.0 asked `comp.complianceRun && !coverage.ok`, which excused the ONE case where
   the gap is most invisible: an existing client whose compliance was found and retained.
   Those retained records were generated under the same SQL ceiling, so they are exactly
   the ones missing the current financial year — and the screen went green over them.
   ──────────────────────────────────────────────────────────────────────────── */

const BEHIND  = fyCoverage(new Date(2026, 6, 13), '2025-26')   // FY 2026-27 vs ceiling 2025-26
const CURRENT = fyCoverage(new Date(2025, 6, 13), '2025-26')   // FY 2025-26, ceiling reached

test('Rev 1.1 sanity: the two coverage fixtures are what the tests below assume', () => {
  assert.equal(BEHIND.ok, false)
  assert.deepEqual(BEHIND.missing, ['2026-27'])
  assert.equal(CURRENT.ok, true)
})

test('1. new client + compliance run + backend behind -> coverage warning shown', () => {
  const comp = {
    clientSaved: true, isDraft: false, complianceRun: true, existingRetained: false,
    stages: { check: { ok: true }, generate: { ok: true }, accounting: { ok: true }, calendar: { ok: true } },
  }
  assert.equal(coverageGap(comp, BEHIND), true)
  assert.equal(saveFullySucceeded(comp, BEHIND), false,
    'every stage was green, but the current financial year is missing — this is not full success')
})

test('2. existing client + existingRetained + complianceRun=false + backend behind -> warning shown', () => {
  // THE REVIEW DEFECT. Rev 1.0 returned false here and showed a green screen.
  const comp = {
    clientSaved: true, isDraft: false, complianceRun: false, existingRetained: true, stages: {},
  }
  assert.equal(comp.complianceRun && !BEHIND.ok, false,
    'demonstrates the Rev 1.0 bug: the old expression suppressed the warning')
  assert.equal(coverageGap(comp, BEHIND), true, 'the retained records do NOT cover the current FY')
  assert.equal(saveFullySucceeded(comp, BEHIND), false,
    '"existing compliance retained" must not read as green when the current year is absent')
})

test('3. existing client + backend coverage current -> no warning', () => {
  const comp = {
    clientSaved: true, isDraft: false, complianceRun: false, existingRetained: true, stages: {},
  }
  assert.equal(coverageGap(comp, CURRENT), false)
  assert.equal(saveFullySucceeded(comp, CURRENT), true)
})

test('4. a draft save raises no misleading compliance warning', () => {
  const draft = { clientSaved: true, isDraft: true, complianceRun: false, existingRetained: false, stages: {} }
  // Drafts deliberately do not generate compliance, so a missing FY is not their problem.
  assert.equal(coverageGap(draft, BEHIND), false)
  assert.equal(coverageGap(draft, CURRENT), false)
})

test('4b. a save that did not happen raises no compliance warning either', () => {
  const nothing = { clientSaved: false, isDraft: false, stages: {} }
  assert.equal(coverageGap(nothing, BEHIND), false, 'there is no client to lack compliance')
  assert.equal(saveFullySucceeded(nothing, BEHIND), false, 'but it is certainly not a success')
})

test('5. a FULL-SUCCESS onboarding result is impossible when the current FY is known missing', () => {
  // Exhaustive over every shape a completed non-draft save can take.
  const stageSets = [
    {},
    { check: { ok: true } },
    { check: { ok: true }, generate: { ok: true } },
    { check: { ok: true }, generate: { ok: true }, accounting: { ok: true } },
    { check: { ok: true }, generate: { ok: true }, accounting: { ok: true }, calendar: { ok: true } },
    { check: { ok: true }, generate: { ok: false, error: 'x' } },
  ]
  for (const complianceRun of [true, false]) {
    for (const existingRetained of [true, false]) {
      for (const stages of stageSets) {
        const comp = { clientSaved: true, isDraft: false, complianceRun, existingRetained, stages }
        assert.equal(saveFullySucceeded(comp, BEHIND), false,
          `full success was reported despite a known missing FY (run=${complianceRun}, retained=${existingRetained}, stages=${JSON.stringify(stages)})`)
        assert.equal(coverageGap(comp, BEHIND), true, 'and the warning must be shown in every one of these')
      }
    }
  }
})

test('with coverage current, full success still depends on the stages — R2 is not weakened', () => {
  const ok   = { check: { ok: true }, generate: { ok: true }, accounting: { ok: true }, calendar: { ok: true } }
  const bad  = { check: { ok: true }, generate: { ok: true }, accounting: { ok: false, error: 'x' } }
  const base = { clientSaved: true, isDraft: false, complianceRun: true, existingRetained: false }

  assert.equal(saveFullySucceeded({ ...base, stages: ok }, CURRENT), true)
  assert.equal(saveFullySucceeded({ ...base, stages: bad }, CURRENT), false,
    'a failed stage still blocks success even when the FY coverage is fine')
})

test('a missing or malformed coverage object fails CLOSED — it warns', () => {
  const comp = { clientSaved: true, isDraft: false, complianceRun: true, existingRetained: false, stages: {} }
  for (const bogus of [undefined, null, {}, { ok: 'true' }, { ok: 1 }]) {
    assert.equal(coverageGap(comp, bogus), true,
      'if we cannot prove the year is covered, we must not claim it is')
  }
})

test('STATIC: the Rev 1.0 runner-gated expression is gone from the wizard', () => {
  const src = read('../src/components/OnboardingWizard.jsx')
  assert.doesNotMatch(src, /comp\.complianceRun\s*&&\s*!coverage\.ok/,
    'the coverage warning is gated on the runner having run again — existingRetained slips through')
  assert.match(src, /coverageGap\(comp, coverage\)/, 'the wizard must use the shared pure helper')
  assert.match(src, /saveFullySucceeded\(comp, coverage\)/, 'and the single success gate')
})
