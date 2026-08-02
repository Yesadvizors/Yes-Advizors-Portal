/**
 * YAV2 Compliance Reliability & Consistency Closure — regression tests. node:test — `npm test`.
 *
 * Two kinds, matching project convention OD-5 (no jsdom/RTL — no DB shape invented):
 *   1. Pure-logic unit tests over the shared compliance date/status helpers
 *      (src/lib/compliance.js) — the single source of overdue/closed truth.
 *   2. Static source guards that lock in the consistency + resilience corrections
 *      across Compliance.jsx and the document components.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CLOSED_COMPLIANCE_STATUSES,
  MODULE_TERMINAL_STATUSES,
  COMPLETED_COMPLIANCE_STATUSES,
  isComplianceClosed,
  isComplianceCompleted,
  terminalStatusesFor,
  effectiveDueDate,
  complianceDateMeta,
  isComplianceOverdue,
  complianceRowGroup,
} from '../src/lib/compliance.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const TODAY = '2026-08-02'   // inject a fixed clock — the helpers accept `today`

// ── 1. Closed-status vocabulary — CONSERVATIVE global set (backend-grounded) ────
test('CR-1: global closed set is Filed/Completed/Closed/Not Applicable (+ defensive), NOT Reviewed/Uploaded', () => {
  // backend-authoritative terminal statuses
  for (const s of ['Filed', 'Completed', 'Closed', 'Not Applicable']) {
    assert.equal(isComplianceClosed(s), true, `${s} must be globally closed`)
  }
  // case + surrounding whitespace must not defeat it
  assert.equal(isComplianceClosed('  not applicable '), true)
  assert.equal(isComplianceClosed('FILED'), true)
  // Reviewed / Uploaded are NOT globally terminal (Reviewed = review_pending in the
  // backend view; Uploaded/Reviewed are financials-only). This is the CORRECTION.
  assert.equal(isComplianceClosed('Reviewed'), false)
  assert.equal(isComplianceClosed('Uploaded'), false)
  // other mid-workflow statuses stay open
  for (const s of ['Pending', 'In Progress', 'Data Pending', 'Not Started', 'Waiting for Client', 'Partner Approved', 'Filing Pending', 'Partner Approval Pending']) {
    assert.equal(isComplianceClosed(s), false, `${s} must be open`)
  }
  // null / undefined / '' never crash and are not closed
  assert.equal(isComplianceClosed(null), false)
  assert.equal(isComplianceClosed(undefined), false)
  assert.equal(isComplianceClosed(''), false)
  // the constant itself must not contain Uploaded/Reviewed
  assert.ok(!CLOSED_COMPLIANCE_STATUSES.includes('Uploaded'))
  assert.ok(!CLOSED_COMPLIANCE_STATUSES.includes('Reviewed'))
})

test('CR-1b: financials is the ONLY module where Uploaded/Reviewed are terminal', () => {
  // financials override → terminal
  assert.equal(isComplianceClosed('Uploaded', 'financials'), true)
  assert.equal(isComplianceClosed('Reviewed', 'financials'), true)
  // a standard tracker module key does NOT make them terminal
  assert.equal(isComplianceClosed('Reviewed', 'roc'), false)
  assert.equal(isComplianceClosed('Uploaded', 'gst'), false)
  assert.deepEqual(MODULE_TERMINAL_STATUSES.financials, ['Uploaded', 'Reviewed'])
  assert.ok(terminalStatusesFor('financials').includes('Reviewed'))
  assert.ok(!terminalStatusesFor('roc').includes('Reviewed'))
})

// ── 2. Due-date precedence (one definition) ────────────────────────────────────
test('CR-2: effectiveDueDate follows individual → extended → standard → response → due', () => {
  assert.equal(effectiveDueDate({ individual_due_date: 'A', extended_due_date: 'B', standard_due_date: 'C' }), 'A')
  assert.equal(effectiveDueDate({ extended_due_date: 'B', standard_due_date: 'C' }), 'B')
  assert.equal(effectiveDueDate({ standard_due_date: 'C', response_due_date: 'D' }), 'C')
  assert.equal(effectiveDueDate({ response_due_date: 'D' }), 'D')
  assert.equal(effectiveDueDate({ due_date: 'E' }), 'E')          // financials / activity fallback
  assert.equal(effectiveDueDate({}), null)
  assert.equal(effectiveDueDate(null), null)
})

// ── 3. "Due today" is NOT overdue; local date, not UTC ─────────────────────────
test('CR-3: a row due exactly today is due-today, never overdue', () => {
  const meta = complianceDateMeta(TODAY, 'Pending', TODAY)
  assert.equal(meta.overdue, false)
  assert.equal(meta.dueToday, true)
  assert.equal(meta.group, 'today')
})

test('CR-4: a past open date is overdue; a future date is not', () => {
  assert.equal(complianceDateMeta('2026-08-01', 'Pending', TODAY).overdue, true)
  assert.equal(complianceDateMeta('2026-08-03', 'Pending', TODAY).overdue, false)
})

// ── 4. Terminal statuses are never overdue (the IT/TDS/ROC/Notice bug) ──────────
test('CR-5: every closed status suppresses overdue even with a long-past due date', () => {
  const past = '2000-01-01'
  for (const s of CLOSED_COMPLIANCE_STATUSES) {
    const meta = complianceDateMeta(past, s, TODAY)
    assert.equal(meta.overdue, false, `${s} must not be overdue`)
    assert.equal(meta.group, 'closed')
  }
  // the same past date on an OPEN status IS overdue
  assert.equal(complianceDateMeta(past, 'In Progress', TODAY).overdue, true)
})

// ── 5. Due-soon window + invalid/missing dates ─────────────────────────────────
test('CR-6: due-soon is (today, today+7]; beyond is upcoming', () => {
  assert.equal(complianceDateMeta('2026-08-09', 'Pending', TODAY).dueSoon, true)   // +7
  assert.equal(complianceDateMeta('2026-08-10', 'Pending', TODAY).group, 'upcoming') // +8
  assert.equal(complianceDateMeta('2026-08-05', 'Pending', TODAY).dueSoon, true)
})

test('CR-7: missing / malformed / calendar-impossible dates never crash and read as nodate', () => {
  const bad = [
    null, undefined, '', 'not-a-date', 'N/A',
    '2026-13-01',  // month 13
    '2026-02-30',  // Feb 30
    '2026-00-10',  // month 00
    '2026-04-31',  // April 31
    '2026-13-40',  // both impossible
    '2025-02-29',  // not a leap year
  ]
  for (const b of bad) {
    const meta = complianceDateMeta(b, 'Pending', TODAY)
    assert.equal(meta.overdue, false, `${b} must not be overdue`)
    assert.equal(meta.dueToday, false, `${b} must not be due today`)
    assert.equal(meta.dueSoon, false, `${b} must not be due soon`)
    assert.equal(meta.hasDate, false, `${b} must have no date`)
    assert.equal(meta.group, 'nodate', `${b} must be group nodate`)
  }
})

test('CR-7b: valid leap-day and normal dates are accepted and classified', () => {
  // 2024 is a leap year → Feb 29 exists
  assert.equal(complianceDateMeta('2024-02-29', 'Pending', '2024-02-29').dueToday, true)
  assert.equal(complianceDateMeta('2024-02-29', 'Pending', '2024-03-01').overdue, true)
  // ordinary valid dates still work
  assert.equal(complianceDateMeta('2026-08-31', 'Pending', TODAY).group, 'upcoming')
  assert.equal(complianceDateMeta('2026-12-31', 'Pending', TODAY).hasDate, true)
})

test('CR-7c: a value that merely BEGINS with a valid date is rejected (no prefix acceptance)', () => {
  // trailing garbage after a real date prefix must NOT be accepted
  for (const bad of ['2026-08-02garbage', '2026-08-02-invalid', '2026-08-02Tnot-a-time', '2026-08-02T99:99:99']) {
    const meta = complianceDateMeta(bad, 'Pending', TODAY)
    assert.equal(meta.hasDate, false, `${bad} must have no date`)
    assert.equal(meta.group, 'nodate', `${bad} must be nodate`)
    assert.equal(meta.overdue, false, `${bad} must not be overdue`)
    assert.equal(meta.dueToday, false, `${bad} must not be due today`)
    assert.equal(meta.dueSoon, false, `${bad} must not be due soon`)
  }
  // exact date and genuinely-complete valid ISO timestamps are still accepted
  assert.equal(complianceDateMeta('2026-08-02', 'Pending', TODAY).dueToday, true)
  assert.equal(complianceDateMeta('2026-08-02T09:30:00Z', 'Pending', TODAY).dueToday, true)
  assert.equal(complianceDateMeta('2026-08-02 09:30:00', 'Pending', TODAY).dueToday, true)   // space-separated
  assert.equal(complianceDateMeta('2024-02-29', 'Pending', '2024-02-29').dueToday, true)     // leap day
})

test('CR-8: ISO timestamps compare on the date portion (a same-day timestamp is due-today)', () => {
  assert.equal(complianceDateMeta('2026-08-02T09:30:00Z', 'Pending', TODAY).dueToday, true)
  assert.equal(complianceDateMeta('2026-08-02T23:59:59', 'Pending', TODAY).overdue, false)
})

// ── 6. Row-level helpers agree (stat == badge, filter refinement) ──────────────
test('CR-9: isComplianceOverdue uses effectiveDueDate — extended date can rescue a past standard date', () => {
  // standard is past, but the extended date (which wins) is in the future → NOT overdue
  const row = { standard_due_date: '2026-07-01', extended_due_date: '2026-09-01', status: 'Pending' }
  assert.equal(isComplianceOverdue(row, TODAY), false)
  // no extension → the past standard date makes it overdue
  assert.equal(isComplianceOverdue({ standard_due_date: '2026-07-01', status: 'Pending' }, TODAY), true)
})

test('CR-9b: Reviewed/Uploaded overdue depends on the module (the core correction)', () => {
  const pastReviewed = { due_date: '2000-01-01', status: 'Reviewed' }
  const pastUploaded = { due_date: '2000-01-01', status: 'Uploaded' }
  // financials: Reviewed/Uploaded are terminal → never overdue
  assert.equal(isComplianceOverdue(pastReviewed, TODAY, 'financials'), false)
  assert.equal(isComplianceOverdue(pastUploaded, TODAY, 'financials'), false)
  // standard tracker (ROC): Reviewed is review-pending → a past due date IS overdue
  assert.equal(isComplianceOverdue({ standard_due_date: '2000-01-01', status: 'Reviewed' }, TODAY, 'roc'), true)
  // and with no module key at all (the DueCell path), Reviewed is likewise overdue-able
  assert.equal(isComplianceOverdue({ standard_due_date: '2000-01-01', status: 'Reviewed' }, TODAY), true)
})

test('CR-10: complianceRowGroup classifies a row consistently', () => {
  assert.equal(complianceRowGroup({ standard_due_date: '2026-07-01', status: 'Pending' }, TODAY), 'overdue')
  assert.equal(complianceRowGroup({ standard_due_date: TODAY, status: 'Pending' }, TODAY), 'today')
  assert.equal(complianceRowGroup({ standard_due_date: '2026-08-05', status: 'Pending' }, TODAY), 'duesoon')
  assert.equal(complianceRowGroup({ standard_due_date: '2027-01-01', status: 'Pending' }, TODAY), 'upcoming')
  assert.equal(complianceRowGroup({ status: 'Filed' }, TODAY), 'closed')
})

test('CR-10b: isComplianceCompleted — "not counted as completed" for terminal-but-not-done + review-pending', () => {
  // genuinely completed
  for (const s of ['Filed', 'Completed', 'Filed / Completed', 'Done']) {
    assert.equal(isComplianceCompleted(s), true, `${s} is completed`)
  }
  // terminal but NOT completed
  for (const s of ['Closed', 'Not Applicable', 'Cancelled']) {
    assert.equal(isComplianceCompleted(s), false, `${s} is terminal but not completed`)
  }
  // review-pending / mid-workflow → not completed on a standard tracker
  assert.equal(isComplianceCompleted('Reviewed'), false)
  assert.equal(isComplianceCompleted('Reviewed', 'roc'), false)
  assert.equal(isComplianceCompleted('Uploaded', 'roc'), false)
  // financials: Uploaded/Reviewed ARE the completion
  assert.equal(isComplianceCompleted('Reviewed', 'financials'), true)
  assert.equal(isComplianceCompleted('Uploaded', 'financials'), true)
})

test('CR-10c: reviewer status matrix — Reviewed/Uploaded not-Filed vs Filed/Not Applicable/Cancelled', () => {
  const past = '2000-01-01'
  // Reviewed-but-not-Filed on a standard tracker: pending, overdue-able, NOT completed
  assert.equal(isComplianceClosed('Reviewed'), false)
  assert.equal(complianceDateMeta(past, 'Reviewed', TODAY).overdue, true)
  assert.equal(isComplianceCompleted('Reviewed'), false)
  // Uploaded-but-not-Filed on a standard tracker: same
  assert.equal(complianceDateMeta(past, 'Uploaded', TODAY).overdue, true)
  assert.equal(isComplianceCompleted('Uploaded'), false)
  // Filed: terminal + completed, never overdue
  assert.equal(complianceDateMeta(past, 'Filed', TODAY).overdue, false)
  assert.equal(isComplianceCompleted('Filed'), true)
  // Not Applicable: terminal, never overdue, NOT completed
  assert.equal(complianceDateMeta(past, 'Not Applicable', TODAY).overdue, false)
  assert.equal(isComplianceCompleted('Not Applicable'), false)
  // Cancelled: terminal, never overdue, NOT completed
  assert.equal(complianceDateMeta(past, 'Cancelled', TODAY).overdue, false)
  assert.equal(isComplianceCompleted('Cancelled'), false)
})

test('CR-10d: boundary dates — day before/after today around a fixed clock', () => {
  assert.equal(complianceDateMeta('2026-08-01', 'Pending', TODAY).overdue, true)   // yesterday
  assert.equal(complianceDateMeta('2026-08-01', 'Pending', TODAY).dueToday, false)
  assert.equal(complianceDateMeta('2026-08-02', 'Pending', TODAY).dueToday, true)  // today
  assert.equal(complianceDateMeta('2026-08-02', 'Pending', TODAY).overdue, false)
  assert.equal(complianceDateMeta('2026-08-03', 'Pending', TODAY).overdue, false)  // tomorrow
  assert.equal(complianceDateMeta('2026-08-03', 'Pending', TODAY).dueSoon, true)
})

// ── 7. Static guards: Compliance.jsx consistency corrections ───────────────────
const COMPLIANCE = stripComments(read('../src/components/Compliance.jsx'))

test('CR-11: Compliance.jsx routes overdue through the shared helper, not ad-hoc Date math', () => {
  assert.match(COMPLIANCE, /from '\.\.\/lib\/compliance'/)
  assert.match(COMPLIANCE, /complianceDateMeta/)
  // the old UTC/local-mixing, due-today-wrong comparison must be gone from the cells
  assert.doesNotMatch(COMPLIANCE, /new Date\(eff\(r\)\)\s*<\s*new Date\(\)/)
})

test('CR-12: the Activity overdue stat and the row badge use the same shared, module-aware verdict', () => {
  // stat computed via isComplianceOverdue; badge via complianceDateMeta — both shared,
  // both threaded with act.id so financials Uploaded/Reviewed is terminal there only.
  assert.match(COMPLIANCE, /const overdue\s*=\s*filtered\.filter\(r => isComplianceOverdue\(r, today, act\.id\)\)/)
  assert.match(COMPLIANCE, /const meta\s*=\s*complianceDateMeta\(dueDate, r\.status, today, 7, act\.id\)/)
  // filed count uses the module-aware completed helper, not a hardcoded status list
  assert.match(COMPLIANCE, /const filed\s*=\s*filtered\.filter\(r => isComplianceCompleted\(r\.status, act\.id\)\)/)
})

test('CR-13: every compliance loader captures the query error (no false-empty)', () => {
  // no tracker loader may destructure only { data } and drop the error
  assert.doesNotMatch(COMPLIANCE, /\.then\(\(\{\s*data\s*\}\)\s*=>/)
  // the retryable error panel exists and is used
  assert.match(COMPLIANCE, /const Err = \(/)
  assert.match(COMPLIANCE, /onRetry=\{reload\}/)
})

test('CR-14: Financial write modals guard re-entry, check errors and never leak raw messages', () => {
  // re-entrancy guards
  assert.match(COMPLIANCE, /async function handleConfirm\(\)\s*\{\s*if \(saving\) return/)
  assert.match(COMPLIANCE, /async function handleSave\(\)\s*\{\s*if \(uploading\) return/)
  // review save is gated behind checked writes (throws on error, onDone only on success)
  assert.match(COMPLIANCE, /if \(error\) throw error/)
  assert.match(COMPLIANCE, /if \(trkErr\) throw trkErr/)
  // no raw supabase error text is concatenated into a user-facing message
  assert.doesNotMatch(COMPLIANCE, /set(Err|ExtractMsg)\([^)]*(upErr|docErr|updErr|e)\.message/)
})

// ── 8. Static guards: document components resilience ───────────────────────────
const WORKDOCS = stripComments(read('../src/components/WorkDocuments.jsx'))
const HUB = stripComments(read('../src/components/DocumentsHub.jsx'))
const MANAGER = stripComments(read('../src/components/DocumentManager.jsx'))

test('CR-15: WorkDocuments surfaces load + view failures and validates file type', () => {
  assert.match(WORKDOCS, /setLoadErr\(true\)/)               // load error state
  assert.match(WORKDOCS, /Could not open the document/)      // viewDoc no longer a dead click
  assert.match(WORKDOCS, /function isAllowedFile\(/)         // JS type allow-list
  assert.match(WORKDOCS, /isAllowedFile\(file\)/)
  assert.match(WORKDOCS, /\.limit\(1\)\.maybeSingle\(\)/)    // dup-check safe with >1 version
  assert.match(WORKDOCS, /uploaded_by: user\?\.name \|\| 'System'/) // null-safe
})

test('CR-16: every deleteDoc checks the record-delete error before reporting success', () => {
  // WorkDocuments (two views), DocumentsHub, DocumentManager
  const deleteErrChecks = (WORKDOCS.match(/if \(delErr\)/g) || []).length
  assert.ok(deleteErrChecks >= 2, 'WorkDocuments must check delete error in both views')
  assert.match(HUB, /if \(delErr\)/)
  assert.match(MANAGER, /if \(delErr\)/)
})

test('CR-17: document components no longer surface raw supabase error.message to users', () => {
  for (const src of [WORKDOCS, HUB, MANAGER]) {
    assert.doesNotMatch(src, /setErr\([^)]*(insErr|upErr|updErr|docErr)\.message/)
  }
})
