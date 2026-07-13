import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  COMPLIANCE_STAGES, CLIENT_TYPE_RPC_MAP, accountingStartFy,
  buildGenerateComplianceArgs, calendarFyWindow, calendarRowsToInsert,
  complianceOutcome, complianceMessage, checklistItem,
} from '../src/lib/compliance.js'
import { safeErrorMessage, safeErrorDetail } from '../src/lib/errors.js'

/* Expected wording, quoted from the R2 requirement. Asserted verbatim: a paraphrase
   that drifts back towards "success" is exactly the failure this task exists to stop. */
const MSG_A = 'Client saved and compliance records generated successfully.'
const MSG_B = 'Client saved, but compliance setup failed. Retry is required.'
const OK = { ok: true }
const FAIL = e => ({ ok: false, error: e })
const ALL_OK = { check: OK, generate: OK, accounting: OK, calendar: OK }

/* ── A. Everything succeeds ─────────────────────────────────────────────── */

test('A: RPC success — all stages ok -> success message', () => {
  const msg = complianceMessage({ clientSaved: true, complianceRun: true, stages: ALL_OK })
  assert.equal(msg, MSG_A)
  assert.equal(complianceOutcome(ALL_OK).ok, true)
})

/* ── B. Client saved, compliance failed ─────────────────────────────────── */

test('B: RPC failure — every attempted stage failed -> "compliance setup failed. Retry is required."', () => {
  const stages = { check: FAIL('down'), }
  const msg = complianceMessage({ clientSaved: true, complianceRun: true, stages })
  assert.equal(msg, MSG_B)
  assert.equal(complianceOutcome(stages).allFailed, true)
})

test('B: client saved but compliance generation failed — never claims overall success', () => {
  const stages = { check: OK, generate: FAIL('permission denied for function [42501]') }
  const msg = complianceMessage({ clientSaved: true, complianceRun: true, stages })

  assert.match(msg, /compliance/i)
  assert.match(msg, /failed/i)
  assert.match(msg, /Retry is required/)
  assert.doesNotMatch(msg, /generated successfully/)
  assert.notEqual(msg, MSG_A)
})

/* ── C. Compliance already exists ───────────────────────────────────────── */

test('C: existing compliance is reported as RETAINED, and no duplicates are claimed', () => {
  const msg = complianceMessage({ clientSaved: true, complianceRun: false, existingRetained: true })

  assert.match(msg, /retained/i)
  assert.match(msg, /no duplicates/i)
  assert.doesNotMatch(msg, /failed/i)
  // Must not claim it generated anything — it generated nothing.
  assert.doesNotMatch(msg, /generated successfully/)
})

/* ── D. Nothing saves ───────────────────────────────────────────────────── */

test('D: nothing saved — states plainly that NO change was completed', () => {
  const msg = complianceMessage({ clientSaved: false })

  assert.match(msg, /No change was completed/i)
  assert.match(msg, /not saved/i)
  assert.doesNotMatch(msg, /^Client saved/)
})

test('D: a missing argument object still fails closed to "nothing saved"', () => {
  assert.match(complianceMessage(), /No change was completed/i)
  assert.match(complianceMessage({}), /No change was completed/i)
})

/* ── E. Partial failure — name the stage ────────────────────────────────── */

test('E: accounting activation failure — names that stage, and only that stage', () => {
  const stages = { check: OK, generate: OK, accounting: FAIL('deadlock detected'), calendar: OK }
  const msg = complianceMessage({ clientSaved: true, complianceRun: true, stages })

  assert.match(msg, /accounting activation/)
  assert.doesNotMatch(msg, /calendar population/)
  assert.doesNotMatch(msg, /compliance generation/)
  assert.doesNotMatch(msg, /generated successfully/)
  assert.match(msg, /Retry is required/)
})

test('E: calendar population failure — names that stage, and does not claim success', () => {
  const stages = { check: OK, generate: OK, accounting: OK, calendar: FAIL('insert failed') }
  const msg = complianceMessage({ clientSaved: true, complianceRun: true, stages })

  assert.match(msg, /calendar population/)
  assert.doesNotMatch(msg, /accounting activation/)
  assert.doesNotMatch(msg, /generated successfully/)
})

test('E: two failed stages are BOTH named', () => {
  const stages = { check: OK, generate: OK, accounting: FAIL('x'), calendar: FAIL('y') }
  const msg = complianceMessage({ clientSaved: true, complianceRun: true, stages })

  assert.match(msg, /accounting activation/)
  assert.match(msg, /calendar population/)
})

/* ── The core guarantee: success is claimed ONLY when every stage succeeded ── */

test('the success message appears ONLY when all attempted stages succeeded', () => {
  const keys = ['check', 'generate', 'accounting', 'calendar']

  // Every non-empty subset of failures -> must NOT be the success message.
  for (let mask = 1; mask < 16; mask++) {
    const stages = {}
    keys.forEach((k, i) => { stages[k] = (mask >> i) & 1 ? FAIL('boom') : OK })
    const msg = complianceMessage({ clientSaved: true, complianceRun: true, stages })

    assert.notEqual(msg, MSG_A, `mask ${mask} produced the success message despite a failure`)
    assert.doesNotMatch(msg, /generated successfully/, `mask ${mask} claimed success`)
    assert.match(msg, /Retry is required/, `mask ${mask} did not tell the user to retry`)
  }

  // The all-succeeded case is the ONLY one that says so.
  assert.equal(complianceMessage({ clientSaved: true, complianceRun: true, stages: ALL_OK }), MSG_A)
})

test('an empty stage map is NOT success — nothing ran, so nothing succeeded', () => {
  const outcome = complianceOutcome({})
  assert.equal(outcome.ok, false)
  assert.equal(outcome.attempted.length, 0)
})

test('a stage that is merely truthy is not "ok" — only ok === true counts', () => {
  // Guards against a future `stages.generate = {}` or `{ ok: 'yes' }` reading as success.
  for (const bad of [{}, { ok: 'true' }, { ok: 1 }, { ok: null }, { error: 'x' }]) {
    const stages = { check: OK, generate: bad }
    assert.notEqual(
      complianceMessage({ clientSaved: true, complianceRun: true, stages }), MSG_A,
      `stage ${JSON.stringify(bad)} was treated as success`,
    )
  }
})

/* ── Retry / idempotency: the calendar guard ────────────────────────────── */

const GST = (id, due = '2026-01-20') => ({
  id, client_id: 'c-1', fy_label: '2025-26', return_type: 'GSTR-3B',
  period: 'December 2025', standard_due_date: due, status: 'Not Started',
})

test('retry does not duplicate: trackers already on the calendar are not re-inserted', () => {
  const gstRows = [GST('t1'), GST('t2'), GST('t3')]

  // First run: calendar is empty, so all three go in.
  const first = calendarRowsToInsert(gstRows, [], '2026-07-12')
  assert.equal(first.length, 3)

  // Retry: those three are now present. NOTHING is inserted a second time.
  const alreadyThere = first.map(r => r.compliance_tracker_id)
  const second = calendarRowsToInsert(gstRows, alreadyThere, '2026-07-12')
  assert.deepEqual(second, [], 'a retry would have duplicated every calendar row')

  // A third press is likewise inert.
  assert.equal(calendarRowsToInsert(gstRows, alreadyThere, '2026-07-12').length, 0)
})

test('retry inserts ONLY the genuinely missing trackers (partial calendar)', () => {
  const gstRows = [GST('t1'), GST('t2'), GST('t3')]
  const rows = calendarRowsToInsert(gstRows, ['t1', 't3'], '2026-07-12')

  assert.equal(rows.length, 1)
  assert.equal(rows[0].compliance_tracker_id, 't2')
})

test('the calendar guard never deletes or rewrites — it only ever returns rows to ADD', () => {
  // calendarRowsToInsert is pure and returns new rows. There is no delete path, and the
  // input rows are not mutated. This is what makes retry non-destructive.
  const gstRows = [GST('t1')]
  const snapshot = JSON.parse(JSON.stringify(gstRows))
  calendarRowsToInsert(gstRows, ['t1'], '2026-07-12')
  assert.deepEqual(gstRows, snapshot, 'the source rows were mutated')
})

test('calendar rows carry the tracker id — without it, dedupe on retry is impossible', () => {
  const rows = calendarRowsToInsert([GST('t1')], [], '2026-07-12')
  assert.equal(rows[0].compliance_tracker_id, 't1')
  assert.equal(rows[0].client_id, 'c-1')
  assert.equal(rows[0].compliance_type, 'GST')
})

test('overdue / due-soon flags are computed against the given date', () => {
  const today = '2026-07-12'
  const [overdue] = calendarRowsToInsert([GST('a', '2026-07-01')], [], today)
  const [soon]    = calendarRowsToInsert([GST('b', '2026-07-15')], [], today)
  const [later]   = calendarRowsToInsert([GST('c', '2026-09-01')], [], today)

  assert.equal(overdue.is_overdue, true)
  assert.equal(overdue.is_due_soon, false)
  assert.equal(soon.is_due_soon, true)
  assert.equal(soon.is_overdue, false)
  assert.equal(later.is_due_soon, false)
  assert.equal(later.is_overdue, false)
})

test('a Filed return is never marked overdue', () => {
  const filed = { ...GST('f', '2020-01-01'), status: 'Filed' }
  const [row] = calendarRowsToInsert([filed], [], '2026-07-12')
  assert.equal(row.is_overdue, false)
})

test('null / malformed gst rows are skipped, not turned into junk calendar entries', () => {
  const rows = calendarRowsToInsert([null, undefined, { id: null }, GST('t1')], [], '2026-07-12')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].compliance_tracker_id, 't1')
})

/* ── RPC arguments: one shared builder, no drift between call sites ─────── */

test('buildGenerateComplianceArgs maps every client type the UI can produce', () => {
  for (const [uiType, rpcType] of Object.entries(CLIENT_TYPE_RPC_MAP)) {
    const args = buildGenerateComplianceArgs({ id: 'x', client_type: uiType })
    assert.equal(args.p_client_type, rpcType)
  }
  // Public Limited Company is the one that is NOT an identity mapping — the RPC's
  // enum calls it "Limited Company". Getting this wrong generates the wrong schedule.
  assert.equal(CLIENT_TYPE_RPC_MAP['Public Limited Company'], 'Limited Company')
})

test('buildGenerateComplianceArgs derives the has_* flags from the identifiers', () => {
  const args = buildGenerateComplianceArgs({
    id: 'u-1', client_type: 'LLP', gstin: '29ABCDE1234F1Z5', tan: null, cin: 'U123',
    date_of_incorporation: '2020-04-01',
  })
  assert.equal(args.p_client_id, 'u-1')
  assert.equal(args.p_has_gstin, true)
  assert.equal(args.p_has_tan, false)
  assert.equal(args.p_has_cin, true)
  assert.equal(args.p_tan, null)
  assert.equal(args.p_incorporation_date, '2020-04-01')
})

test('an unknown client type falls back rather than sending undefined to the RPC', () => {
  const args = buildGenerateComplianceArgs({ id: 'x', client_type: 'Something New' })
  assert.equal(args.p_client_type, 'Private Limited Company')
  assert.notEqual(args.p_client_type, undefined)
})

/* ── FY window ──────────────────────────────────────────────────────────── */

test('calendarFyWindow: April onwards is the new FY; Jan–Mar is still the old one', () => {
  assert.deepEqual(calendarFyWindow(new Date('2026-04-01T00:00:00Z')), { currentFY: '2026-27', nextFY: '2027-28' })
  assert.deepEqual(calendarFyWindow(new Date('2026-03-31T00:00:00Z')), { currentFY: '2025-26', nextFY: '2026-27' })
  assert.deepEqual(calendarFyWindow(new Date('2026-07-12T00:00:00Z')), { currentFY: '2026-27', nextFY: '2027-28' })
})

test('nextFY is always the year after currentFY — the old expression could return currentFY twice', () => {
  // The original code had:
  //   nextFY = currentFY.split('-')[0] === String(currentYear) ? ...next... : currentFY
  // In Jan–Mar that ELSE branch fires, so nextFY === currentFY and the `.in()` filter
  // silently covered one FY instead of two.
  for (const d of ['2026-01-15', '2026-02-28', '2026-03-31', '2026-04-01', '2026-12-31']) {
    const { currentFY, nextFY } = calendarFyWindow(new Date(`${d}T00:00:00Z`))
    assert.notEqual(nextFY, currentFY, `${d}: nextFY collapsed onto currentFY`)
    assert.equal(parseInt(nextFY, 10), parseInt(currentFY, 10) + 1)
  }
})

/* ── Checklist rendering ────────────────────────────────────────────────── */

test('checklistItem shows ✅ only on a real success', () => {
  assert.equal(checklistItem(OK, 'done', 'not done').icon, '✅')
  assert.equal(checklistItem(FAIL('nope'), 'done', 'not done').icon, '⚠️')
  assert.equal(checklistItem(undefined, 'done', 'not done').icon, '⚠️')
  assert.equal(checklistItem({}, 'done', 'not done').icon, '⚠️')
})

test('a failed checklist line carries the reason, not just a shrug', () => {
  const item = checklistItem(FAIL('permission denied [42501]'), 'done', 'NOT generated')
  assert.match(item.text, /NOT generated/)
  assert.match(item.text, /permission denied/)
  assert.match(item.text, /42501/)
})

/* ── Error redaction on the compliance path ─────────────────────────────── */

test('compliance errors are shown, but secrets in them are not', () => {
  const leaky = {
    message: 'failed at https://xyz.supabase.co/rest/v1/rpc?apikey=eyJhbGciOi.JIUzI1NiJ9.abc123',
    code: '42501',
  }
  const out = safeErrorDetail(leaky)

  assert.doesNotMatch(out, /supabase\.co/)
  assert.doesNotMatch(out, /eyJ/)
  assert.match(out, /\[link removed\]/)
  assert.match(out, /42501/)          // the diagnosis survives
})

test('a null/odd error still yields usable text rather than crashing the message path', () => {
  assert.equal(safeErrorMessage(null), 'Unknown error')
  assert.equal(safeErrorMessage(undefined), 'Unknown error')
  assert.equal(safeErrorMessage({}), 'Unknown error')
  assert.match(safeErrorDetail({ code: 'PGRST301' }), /PGRST301/)
})

/* ── STATIC: the defects must not come back ─────────────────────────────── */

const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

const read = p => stripComments(readFileSync(new URL(p, import.meta.url), 'utf8'))

test('STATIC: no compliance RPC result is discarded — every .rpc() is destructured', () => {
  for (const file of ['../src/components/Clients.jsx', '../src/components/OnboardingWizard.jsx']) {
    const src = read(file)

    // The exact shape of the original bug: `await supabase.rpc(` with nothing bound to it.
    const bare = /(?<!=\s*)(?<!\w)await\s+supabase\s*\n?\s*\.rpc\s*\(/g
    const matches = [...src.matchAll(bare)].filter(m => {
      // Look backwards: a legitimate call is preceded by `= await` or `} = await`.
      const before = src.slice(Math.max(0, m.index - 40), m.index)
      return !/=\s*$/.test(before)
    })
    assert.equal(matches.length, 0,
      `${file}: an RPC result is not destructured — its error can never be seen`)
  }
})

test('STATIC: Clients.jsx no longer shows an unconditional "Synced!"', () => {
  const src = read('../src/components/Clients.jsx')
  assert.doesNotMatch(src, /'✅ Synced!'/, 'the unconditional success label is back')
  // Rev 1.1: the compliance I/O moved into the shared runner, so what must be checked here
  // is that the button's success state is gated on the FULL outcome — not on one RPC.
  assert.match(src, /if \(!outcome\.ok\)/, 'the re-sync must gate success on every stage')
})

test('STATIC: OnboardingWizard does not swallow compliance errors in a bare catch', () => {
  const src = read('../src/components/OnboardingWizard.jsx')
  assert.doesNotMatch(src, /Compliance auto-generate warning/,
    'the console.warn-and-carry-on swallow is back')
  assert.doesNotMatch(src, /console\.warn\([^)]*comp/i)
})

test('STATIC: the success checklist is data-driven, not a hard-coded row of ticks', () => {
  const src = read('../src/components/OnboardingWizard.jsx')

  // The checklist renders from a computed array, not from a literal one.
  assert.match(src, /rows\.map\(/, 'the checklist must render from the computed rows')

  // The accounting and calendar lines must come from checklistItem(), which cannot
  // print ✅ unless the stage reported ok === true.
  assert.doesNotMatch(src, /icon: '✅', text: 'Accounting tracker/,
    'the accounting line is hard-coded to ✅ again')
  assert.doesNotMatch(src, /icon: '✅', text: 'Compliance calendar/,
    'the calendar line is hard-coded to ✅ again')
  assert.match(src, /checklistItem\(\s*comp\.stages\.accounting/, 'accounting line must derive from its stage')
  assert.match(src, /checklistItem\(\s*\n?\s*comp\.stages\.calendar/, 'calendar line must derive from its stage')

  // The tracker ticks (GST / ITR / TDS / ROC) describe ONE rpc — generate_client_compliance
  // — and may only be shown when that call reported success. They must sit inside that guard.
  assert.match(src, /if \(gen && gen\.ok\)/,
    'the tracker ticks must be guarded by the generate stage having actually succeeded')

  // The original hard-coded array had these two rows adjacent, unconditionally.
  assert.doesNotMatch(
    src,
    /icon: '✅', text: 'GST returns tracker[^\n]*\n\s*\{ icon: '✅', text: 'Income Tax tracker/,
    'the unconditional hard-coded checklist array is back',
  )
})

test('STATIC: the success screen renders the honest headline, not a fixed one', () => {
  const src = read('../src/components/OnboardingWizard.jsx')
  assert.match(src, /const headline = complianceMessage\(comp\)/)
  // R4 Rev 1.1: the single success gate now also requires the CURRENT financial year to be
  // covered, so a green screen is impossible over a known-missing FY. R2's requirement —
  // that celebratory styling is conditional on nothing having failed — still holds inside
  // saveFullySucceeded(), which checks complianceOutcome().anyFailed first.
  assert.match(src, /const allWell = saveFullySucceeded\(comp, coverage\)/,
    'the celebratory styling must be conditional on nothing having failed')
})

test('STATIC: the calendar insert goes through the dedupe guard, never a bare insert', () => {
  // Rev 1.1: this now lives in the shared runner, so BOTH onboarding and re-sync get it.
  // Previously only onboarding deduped, because only onboarding touched the calendar.
  const src = read('../src/lib/complianceRunner.js')
  assert.match(src, /calendarRowsToInsert\(/, 'the idempotency guard is not being used')
  assert.match(src, /from\('compliance_calendar'\)\s*\n?\s*\.select\(/,
    'existing calendar rows must be read before inserting, or retry duplicates them')
  assert.match(src, /const \{ error: insErr \} = await sb\.from\('compliance_calendar'\)\.insert\(/,
    'the calendar insert must report its error')
  assert.match(src, /if \(exErr\)/, 'a failed existence-read must fail closed, not insert blindly')
})

test('R4: the accounting start FY is DERIVED per client, never the old frozen 2024-25', () => {
  // This test previously asserted the opposite — that ACCOUNTING_START_FY was still
  // pinned to '2024-25' — precisely so that R2 could not quietly do R4's job. R4 has now
  // done it deliberately, so the guard is inverted: the frozen literal must NOT come back.
  assert.equal(accountingStartFy({ date_of_incorporation: '2023-09-15' }), '2023-24')
  assert.equal(accountingStartFy({ date_of_incorporation: '2026-04-01' }), '2026-27')
  assert.equal(accountingStartFy({ date_of_incorporation: null }), '2020-21')
})

test('every stage key has user-facing wording', () => {
  for (const [key, label] of Object.entries(COMPLIANCE_STAGES)) {
    assert.equal(typeof label, 'string')
    assert.ok(label.length > 3, `stage ${key} has no readable label`)
  }
})
