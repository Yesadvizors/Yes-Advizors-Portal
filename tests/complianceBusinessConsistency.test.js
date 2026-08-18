/**
 * YAV2 Compliance Business UAT & Cross-Module Consistency — regression tests.
 * node:test. Convention OD-5: pure-logic + static source guards (no jsdom/RTL).
 *
 * Anchors the SINGLE compliance truth (src/lib/compliance.js) and proves every module
 * that classifies a compliance row reuses it — no independent hardcoded terminal set.
 * Resolves E2E-D1: Partner Approved is NON-TERMINAL (mid-workflow), consistent across
 * Compliance page, Dashboard (v_firm_dashboard), Firm Overview and Client 360.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import {
  CLOSED_COMPLIANCE_STATUSES, COMPLETED_COMPLIANCE_STATUSES,
  isComplianceClosed, isComplianceCompleted, isComplianceOverdue, complianceDateMeta,
} from '../src/lib/compliance.js'
import { pgStatusList } from '../src/helpers.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const TODAY = '2026-08-18'

// ── 1/2. Closed vs open classification ────────────────────────────────────────
test('CB-1: the backend-authoritative terminal set is closed; workflow stages stay open', () => {
  for (const s of ['Filed', 'Completed', 'Closed', 'Not Applicable']) assert.equal(isComplianceClosed(s), true, `${s} closed`)
  for (const s of ['Not Started', 'In Progress', 'Reviewed', 'Filing Pending', 'Payment Pending', 'Waiting for Client']) {
    assert.equal(isComplianceClosed(s), false, `${s} must stay open`)
  }
  // case/whitespace insensitive
  assert.equal(isComplianceClosed('  filed  '), true)
})

// ── E2E-D1: Partner Approved is NON-TERMINAL ──────────────────────────────────
test('CB-D1: Partner Approved is NON-terminal (mid-workflow before Filed) — never counted closed/completed', () => {
  assert.equal(isComplianceClosed('Partner Approved'), false)
  assert.equal(isComplianceCompleted('Partner Approved'), false)
  assert.ok(!CLOSED_COMPLIANCE_STATUSES.includes('Partner Approved'))
  assert.ok(!COMPLETED_COMPLIANCE_STATUSES.includes('Partner Approved'))
})

// ── 3-7. Ageing safety (due today, past-due, missing date, unknown) ───────────
test('CB-3: a compliance due TODAY is NOT overdue', () => {
  const m = complianceDateMeta(TODAY, 'In Progress', TODAY)
  assert.equal(m.overdue, false)
  assert.equal(m.dueToday, true)
})
test('CB-4: past-due OPEN is overdue', () => {
  assert.equal(complianceDateMeta('2026-08-01', 'In Progress', TODAY).overdue, true)
  assert.equal(isComplianceOverdue({ due_date: '2026-08-01', status: 'In Progress' }, TODAY), true)
})
test('CB-5: past-due CLOSED is NOT overdue', () => {
  for (const s of ['Filed', 'Completed', 'Closed', 'Not Applicable']) {
    assert.equal(complianceDateMeta('2026-08-01', s, TODAY).overdue, false, `${s} past-due must not be overdue`)
  }
})
test('CB-5b: a past-due Partner Approved row IS overdue (non-terminal)', () => {
  assert.equal(complianceDateMeta('2026-08-01', 'Partner Approved', TODAY).overdue, true)
})
test('CB-6: missing/invalid due date never fabricates overdue', () => {
  assert.equal(complianceDateMeta(null, 'In Progress', TODAY).overdue, false)
  assert.equal(complianceDateMeta('', 'In Progress', TODAY).overdue, false)
  assert.equal(complianceDateMeta('not-a-date', 'In Progress', TODAY).overdue, false)
  assert.equal(complianceDateMeta('2026-02-30', 'In Progress', TODAY).overdue, false) // impossible day
})
test('CB-7: unknown status fails safe — treated as OPEN (visible), never silently completed/closed', () => {
  assert.equal(isComplianceClosed('Frobnicated'), false)
  assert.equal(isComplianceCompleted('Frobnicated'), false)
  assert.equal(complianceDateMeta('2026-08-01', 'Frobnicated', TODAY).overdue, true) // stays visible/overdue
})

// ── 8-11,14. Every module reuses the shared truth — no independent hardcoded set ──
test('CB-9: Firm Overview (AdminHome) derives the compliance terminal filter from the shared set', () => {
  const code = strip(read('src/components/AdminHome.jsx'))
  assert.match(code, /import \{ CLOSED_COMPLIANCE_STATUSES \} from '\.\.\/lib\/compliance'/)
  assert.match(code, /const DONE_COMPLIANCE = pgStatusList\(CLOSED_COMPLIANCE_STATUSES\)/)
  // the old independent hardcoded list (incl. Partner Approved) is gone
  assert.doesNotMatch(code, /DONE_COMPLIANCE = '\("Filed","Completed","Partner Approved"/)
})
test('CB-11: the Compliance page uses the shared compliance truth (no local closed set)', () => {
  const code = strip(read('src/components/Compliance.jsx'))
  assert.match(code, /from '\.\.\/lib\/compliance'/)
  assert.match(code, /isComplianceOverdue|complianceDateMeta/)
})
test('CB-10: Client 360 uses the shared compliance truth', () => {
  const code = strip(read('src/lib/client360.js'))
  assert.match(code, /from '\.\/compliance\.js'/)
  assert.match(code, /isComplianceClosed|isComplianceCompleted|complianceDateMeta/)
})
test('CB-14: no module hardcodes a conflicting terminal set that includes Partner Approved', () => {
  for (const f of ['src/components/AdminHome.jsx', 'src/components/Compliance.jsx', 'src/lib/client360.js', 'src/bento/data/dashboardModel.js']) {
    assert.doesNotMatch(strip(read(f)), /"Partner Approved"|'Partner Approved'/, `${f} must not hardcode Partner Approved as terminal`)
  }
})

// ── The derived server filter equals the authoritative view's terminal set ─────
test('CB-view: pgStatusList(CLOSED_COMPLIANCE_STATUSES) contains the view terminal set and excludes Partner Approved', () => {
  const list = pgStatusList(CLOSED_COMPLIANCE_STATUSES)
  for (const s of ['Filed', 'Completed', 'Closed', 'Not Applicable']) assert.ok(list.includes(`"${s}"`), `${s} in filter`)
  assert.ok(!list.includes('"Partner Approved"'))
})
