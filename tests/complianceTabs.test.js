import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  fyChoicesFromCoverage, defaultFy, visibleComplianceTabs, hasCategoryData, COMPLIANCE_TABS,
} from '../src/lib/complianceTabs.js'

const S = (...xs) => new Set(xs)

/* PJ & CO: no GST/TDS/ROC rows in any FY. financial_years is active 2020-21 .. 2030-31. */
const LIVE = S('2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26',
               '2026-27', '2027-28', '2028-29', '2029-30', '2030-31')

const PJCO = {
  liveFys: LIVE,
  gst: S(), tds: S(), roc: S(), llp: S(),   // no conditional rows anywhere
}

const NEWEST_FIRST = ['2030-31', '2029-30', '2028-29', '2027-28', '2026-27',
                      '2025-26', '2024-25', '2023-24', '2022-23', '2021-22', '2020-21']

/* ── FY selector: EVERY active financial year, newest first (not data-restricted) ── */

test('req: the dropdown lists EVERY active financial year, newest first', () => {
  assert.deepEqual(fyChoicesFromCoverage(PJCO, '2026-27'), NEWEST_FIRST)
})

test('req: FY 2022-23 and every other active FY is selectable even with zero client data', () => {
  const choices = fyChoicesFromCoverage(PJCO, '2026-27')
  for (const fy of ['2022-23', '2020-21', '2024-25', '2030-31']) {
    assert.ok(choices.includes(fy), `${fy} must be selectable`)
  }
  assert.equal(choices.length, 11, 'all 11 active FYs are offered, not just the 2 with data')
})

test('req: the current FY (2026-27) is present and is the default', () => {
  const choices = fyChoicesFromCoverage(PJCO, '2026-27')
  assert.ok(choices.includes('2026-27'))
  assert.equal(defaultFy(choices, '2026-27'), '2026-27')
})

test('the FY list is NOT restricted to years the client has data in', () => {
  // PJ & CO has data only in 2025-26/2026-27, yet the dropdown offers all 11 active FYs.
  assert.deepEqual(fyChoicesFromCoverage(PJCO, '2026-27'), NEWEST_FIRST)
})

test('the current FY is guaranteed offerable even if somehow absent from the table', () => {
  const narrow = { ...PJCO, liveFys: S('2025-26', '2024-25') }
  const choices = fyChoicesFromCoverage(narrow, '2026-27')
  assert.equal(choices[0], '2026-27')                  // newest first, current guaranteed
  assert.deepEqual(choices, ['2026-27', '2025-26', '2024-25'])
})

test('while coverage is loading (null) there are no FY choices', () => {
  assert.deepEqual(fyChoicesFromCoverage(null, '2026-27'), [])
})

test('the default FY is the current one when offered, else the newest available', () => {
  assert.equal(defaultFy(['2026-27', '2025-26'], '2026-27'), '2026-27')
  assert.equal(defaultFy(['2025-26', '2024-25'], '2026-27'), '2025-26')  // current not offered
  assert.equal(defaultFy([], '2026-27'), '2026-27')
})

test('req: a selected empty FY (2022-23) hides GST/TDS/ROC but keeps the universal tabs', () => {
  const keys = visibleComplianceTabs(PJCO, '2022-23').map(t => t.key)
  assert.deepEqual(keys, ['it', 'financials', 'audit', 'acc', 'notices'])
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
    liveFys: LIVE,
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

// The body of ClientPanel only (the modal itself). The per-tab loaders and MarkFiledModal
// are separate top-level functions, so this isolates the FY-select / summary / coverage path.
const clientPanelBody = src => {
  const start = src.indexOf('function ClientPanel(')
  const next = src.indexOf('\nfunction ', start + 1)
  return src.slice(start, next === -1 ? undefined : next)
}

test('req: selecting an FY creates NO records — the modal FY/summary path is read-only', () => {
  const body = clientPanelBody(read('../src/components/Compliance.jsx'))
  // Every Supabase call the modal makes on open / FY change must be a read.
  assert.doesNotMatch(body, /\.insert\(/,  'the modal must not insert when an FY is selected')
  assert.doesNotMatch(body, /\.upsert\(/,  'the modal must not upsert when an FY is selected')
  assert.doesNotMatch(body, /\.update\(/,  'the modal must not update when an FY is selected')
  assert.doesNotMatch(body, /\.delete\(/,  'the modal must not delete when an FY is selected')
  assert.doesNotMatch(body, /\.rpc\(/,     'the modal must not call an RPC when an FY is selected')
  // It does read coverage and the summary.
  assert.match(body, /\.select\(/, 'the modal reads via select')
})

test('req: an empty FY yields zero summary cards, not an error', () => {
  const src = read('../src/components/Compliance.jsx')
  // maybeSingle -> an FY with no summary row returns { data: null } instead of raising.
  assert.match(src, /v_client_compliance_summary'\)\.select\('\*'\)[^\n]*\.maybeSingle\(\)/,
    'summary must use maybeSingle so an empty FY returns null (zero cards), not an error')
  // Cards fall back to 0 when the value is absent.
  assert.match(src, /c\.val\s*\?\?\s*0/, 'cards must render 0 when the summary value is absent')
})

test('req: the FY coverage load is SELECT-only (no automatic generation on open)', () => {
  const body = clientPanelBody(read('../src/components/Compliance.jsx'))
  // The coverage Promise.all reads financial_years + the four conditional trackers.
  assert.match(body, /from\('financial_years'\)\.select\('fy_label'\)\.eq\('is_active', true\)/,
    'the FY list must be loaded from ALL active financial_years')
})
