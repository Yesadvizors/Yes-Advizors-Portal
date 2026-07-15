import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  fyChoicesFromCoverage, defaultFy, visibleComplianceTabs, hasCategoryData, COMPLIANCE_TABS,
} from '../src/lib/complianceTabs.js'

const S = (...xs) => new Set(xs)

/* The confirmed live shape for PJ & CO: no GST, records only in 2025-26 and 2026-27,
   real accounting + income-tax data. financial_years seeded 2020-21 .. 2030-31. */
const LIVE = S('2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26',
               '2026-27', '2027-28', '2028-29', '2029-30', '2030-31')

const PJCO = {
  liveFys: LIVE,
  dataFys: S('2025-26', '2026-27'),   // has compliance in these two only
  gst: S(),                            // NO gst rows anywhere
  tds: S(),
  roc: S(),
  llp: S(),
}

/* ── FY selector is driven by real coverage, not a synthetic range ──────────── */

test('FY choices are exactly the client years-with-data, current FY included, newest first', () => {
  assert.deepEqual(fyChoicesFromCoverage(PJCO, '2026-27'), ['2026-27', '2025-26'])
})

test('the current FY is offered even if the client has no data yet (so it can be the default)', () => {
  const fresh = { ...PJCO, dataFys: S() }
  assert.deepEqual(fyChoicesFromCoverage(fresh, '2026-27'), ['2026-27'])
})

test('FY choices never include a year absent from live financial_years', () => {
  // A stray tracker fy_label not present/active in financial_years is dropped.
  const odd = { ...PJCO, dataFys: S('2025-26', '2099-00') }
  assert.deepEqual(fyChoicesFromCoverage(odd, '2026-27'), ['2026-27', '2025-26'])
})

test('the stale FY 2023-24 is NOT offered when the client has no 2023-24 data', () => {
  assert.ok(!fyChoicesFromCoverage(PJCO, '2026-27').includes('2023-24'))
})

test('while coverage is loading (null) there are no FY choices', () => {
  assert.deepEqual(fyChoicesFromCoverage(null, '2026-27'), [])
})

test('the default FY is the current one when offered, else the newest available', () => {
  assert.equal(defaultFy(['2026-27', '2025-26'], '2026-27'), '2026-27')
  assert.equal(defaultFy(['2025-26', '2024-25'], '2026-27'), '2025-26')  // current not offered
  assert.equal(defaultFy([], '2026-27'), '2026-27')
})

/* ── Tab visibility is driven by real rows, not client attributes ───────────── */

test('PJ & CO: NO GST tab in any FY (zero gst_tracker rows), despite any registration flag', () => {
  for (const fy of ['2025-26', '2026-27']) {
    const keys = visibleComplianceTabs(PJCO, fy).map(t => t.key)
    assert.ok(!keys.includes('gst'), `GST tab must not show for ${fy}`)
    assert.ok(!keys.includes('tds'), `TDS tab must not show for ${fy}`)
    assert.ok(!keys.includes('roc'), `ROC tab must not show for ${fy}`)
  }
})

test('PJ & CO: the universal tabs are still present, so the modal is not empty', () => {
  const keys = visibleComplianceTabs(PJCO, '2026-27').map(t => t.key)
  assert.deepEqual(keys, ['it', 'financials', 'audit', 'acc', 'notices'])
})

test('a GST tab appears ONLY in the FYs that actually have gst_tracker rows', () => {
  const gstClient = { ...PJCO, gst: S('2026-27') }   // GST rows in the current year only
  assert.ok(visibleComplianceTabs(gstClient, '2026-27').some(t => t.key === 'gst'))
  assert.ok(!visibleComplianceTabs(gstClient, '2025-26').some(t => t.key === 'gst'),
    'no GST rows in 2025-26 -> no GST tab in 2025-26')
})

test('the ROC tab shows for either roc_tracker OR llp_tracker rows', () => {
  const rocOnly = { ...PJCO, roc: S('2026-27') }
  const llpOnly = { ...PJCO, llp: S('2026-27') }
  assert.ok(visibleComplianceTabs(rocOnly, '2026-27').some(t => t.key === 'roc'))
  assert.ok(visibleComplianceTabs(llpOnly, '2026-27').some(t => t.key === 'roc'))
  assert.ok(!visibleComplianceTabs(PJCO,   '2026-27').some(t => t.key === 'roc'))
})

test('TDS tab shows only with tds_tracker rows for the selected FY', () => {
  const tds = { ...PJCO, tds: S('2025-26') }
  assert.ok(visibleComplianceTabs(tds, '2025-26').some(t => t.key === 'tds'))
  assert.ok(!visibleComplianceTabs(tds, '2026-27').some(t => t.key === 'tds'))
})

test('while coverage is loading, no conditional tab is shown — universal only', () => {
  const keys = visibleComplianceTabs(null, '2026-27').map(t => t.key)
  assert.deepEqual(keys, ['it', 'financials', 'audit', 'acc', 'notices'])
  assert.equal(hasCategoryData(null, 'gst', '2026-27'), false)
})

test('a fully-registered client shows every conditional tab where it has rows', () => {
  const full = {
    liveFys: LIVE, dataFys: S('2026-27'),
    gst: S('2026-27'), tds: S('2026-27'), roc: S('2026-27'), llp: S(),
  }
  const keys = visibleComplianceTabs(full, '2026-27').map(t => t.key)
  assert.deepEqual(keys, ['gst', 'it', 'tds', 'roc', 'financials', 'audit', 'acc', 'notices'])
})

test('the tab set is a stable, deduped ordering', () => {
  const keys = COMPLIANCE_TABS.map(t => t.key)
  assert.equal(new Set(keys).size, keys.length)
  assert.equal(keys[0], 'gst')   // order preserved for the UI
})

/* ── STATIC: the modal must not regress to attribute-based gating ───────────── */

// Matched against RAW source. These patterns only ever occur as executable code — the
// component comments do not contain them — so a comment-stripping pass (fragile on this
// large CSS-heavy file) is unnecessary and would itself risk false results.
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')

test('STATIC: ClientPanel derives tabs from coverage, not from client.gstin / tan / client_type', () => {
  const src = read('../src/components/Compliance.jsx')

  // The modal must use the pure rules.
  assert.match(src, /visibleComplianceTabs\(coverage, fy\)/, 'tabs must come from the shared rule')
  assert.match(src, /fyChoicesFromCoverage\(coverage, currentFy\(\)\)/, 'FY list must come from coverage')

  // The old attribute-based gating must be gone from the modal's tab list.
  assert.doesNotMatch(src, /show:\s*!!client\.gstin/, 'GST tab must not be gated on client.gstin')
  assert.doesNotMatch(src, /show:\s*!!client\.tan/, 'TDS tab must not be gated on client.tan')
  assert.doesNotMatch(src, /show:\s*\[[^\]]*\]\.includes\(client\.client_type\)/,
    'ROC/financials tabs must not be gated on client.client_type')

  // The FY dropdown must not render the static synthetic list.
  assert.doesNotMatch(src, /\{FY_LIST\.map\(f=><option/, 'the modal FY selector must use per-client choices')
})

test('STATIC: the GST card is never rendered without rows (no template obligation)', () => {
  const src = read('../src/components/Compliance.jsx')
  assert.match(src, /if \(rows\.length === 0\) return <Empty label="GST" \/>/,
    'GSTTab must show an empty state instead of the GSTR-1 / GSTR-3B header template')
})
