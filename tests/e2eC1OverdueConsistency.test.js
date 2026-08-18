/**
 * YAV2 E2E-C1 — Compliance Overdue Single-Source Consistency. node:test.
 * Static source guards + pure checks. The defect: Firm Overview read the (empty, unpopulated)
 * compliance_calendar → 0 overdue, while Compliance + Dashboard read v_firm_dashboard → 2.
 * Fix: Firm Overview now derives compliance overdue/due-soon/by-area from v_firm_dashboard —
 * the SAME authoritative view, so all surfaces agree. No independent overdue rule.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { complianceDateMeta, isComplianceClosed } from '../src/lib/compliance.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const ADMIN = strip(read('src/components/AdminHome.jsx'))
const COMP = read('src/components/Compliance.jsx')          // raw (image/* comment breaks strip)
const DMODEL = strip(read('src/bento/data/dashboardModel.js'))
const TODAY = '2026-08-18'

// ── The exact E2E-C1 regression: all three firm surfaces use v_firm_dashboard ──
test('C1-1: Firm Overview + Compliance Firm Dashboard + Bento Dashboard all source compliance from v_firm_dashboard', () => {
  assert.match(ADMIN, /from\('v_firm_dashboard'\)/)          // Firm Overview (was compliance_calendar)
  assert.match(COMP, /from\('v_firm_dashboard'\)/)          // Compliance Firm Dashboard tab
  assert.match(DMODEL, /raw\.firm|v_firm_dashboard/)        // Bento Dashboard model consumes the firm view
})
test('C1-2: Firm Overview no longer reads the empty compliance_calendar and keeps no independent overdue rule', () => {
  assert.doesNotMatch(ADMIN, /compliance_calendar/)
  assert.doesNotMatch(ADMIN, /is_overdue/)                 // stale stored flag no longer authoritative
  assert.doesNotMatch(ADMIN, /DONE_COMPLIANCE/)
  // overdue/due-soon are summed straight from the view's per-category rows
  assert.match(ADMIN, /overdueCompliance = firm\.reduce\(\(a, r\) => a \+ num\(r\.overdue\)/)
  assert.match(ADMIN, /complianceDueSoon = firm\.reduce\(\(a, r\) => a \+ num\(r\.due_in_7_days\)/)
})
test('C1-3: the alert + cards read the view-derived overdue (same number Compliance/Dashboard show)', () => {
  assert.match(ADMIN, /d\.overdueCompliance > 0.*compliance item\(s\) overdue/)
  assert.match(ADMIN, /'Overdue compliance', d\.overdueCompliance/)
  assert.match(ADMIN, /'Compliance due \(7 days\)', d\.complianceDueSoon/)
})

// ── No duplicate business logic; shared overdue truth still holds (Section 8) ──
test('C1-4: due today NOT overdue; past-due open overdue; past-due closed NOT overdue; missing date safe', () => {
  assert.equal(complianceDateMeta(TODAY, 'In Progress', TODAY).overdue, false)   // due today
  assert.equal(complianceDateMeta('2026-08-01', 'In Progress', TODAY).overdue, true)  // past-due open
  for (const s of ['Filed', 'Completed', 'Closed', 'Not Applicable']) {
    assert.equal(complianceDateMeta('2026-08-01', s, TODAY).overdue, false)     // past-due closed
  }
  assert.equal(complianceDateMeta(null, 'In Progress', TODAY).overdue, false)   // missing date
})
test('C1-5: Partner Approved remains NON-terminal (overdue-eligible) — unchanged by the re-source', () => {
  assert.equal(isComplianceClosed('Partner Approved'), false)
  assert.equal(complianceDateMeta('2026-08-01', 'Partner Approved', TODAY).overdue, true)
})

// ── Error state ≠ zero overdue (Section 14) ───────────────────────────────────
test('C1-6: a failed load shows a retryable error, never a false "0 overdue"', () => {
  // firmRes.error is aggregated into firstErr → throw → setError + Retry (not a 0-value render)
  assert.match(ADMIN, /const firstErr = activeRes\.error \|\| firmRes\.error/)
  assert.match(ADMIN, /if \(firstErr\) throw firstErr/)
  assert.match(ADMIN, /setError\('Something went wrong while loading the dashboard\.'\)/)
})

// ── Query safety: one aggregate read, no per-client N+1 (Section 13) ──────────
test('C1-7: compliance is one aggregate view read, not a per-client loop', () => {
  // exactly one v_firm_dashboard read in AdminHome
  assert.equal((ADMIN.match(/from\('v_firm_dashboard'\)/g) || []).length, 1)
})
