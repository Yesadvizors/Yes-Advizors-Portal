/**
 * YAV2 Client Lifecycle & Work Management Closure — regression tests.
 * node:test — `npm test`. Convention OD-5: pure-logic + static source guards
 * (no jsdom/RTL, no invented DB shape). Non-overlapping with PR #49/#51/#53.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  clientStatusLabel, CLIENT_LIFECYCLE_STATUSES,
  isFollowUpOverdue, isFollowUpToday, todayLocal,
} from '../src/helpers.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

// ── 1. Client lifecycle status presentation (CL-2) ─────────────────────────────
test('CLW-1: clientStatusLabel never defaults a missing status to Active', () => {
  assert.equal(clientStatusLabel(null), 'Unknown')
  assert.equal(clientStatusLabel(undefined), 'Unknown')
  assert.equal(clientStatusLabel(''), 'Unknown')
  assert.equal(clientStatusLabel('   '), 'Unknown')
  assert.notEqual(clientStatusLabel(null), 'Active')
})

test('CLW-2: clientStatusLabel returns known + legacy statuses verbatim', () => {
  assert.equal(clientStatusLabel('Active'), 'Active')
  assert.equal(clientStatusLabel('Draft'), 'Draft')
  assert.equal(clientStatusLabel('Inactive'), 'Inactive')
  assert.equal(clientStatusLabel('Archived'), 'Archived')
  assert.equal(clientStatusLabel(' Active '), 'Active')          // trimmed
  assert.equal(clientStatusLabel('Suspended'), 'Suspended')      // legacy value preserved
  assert.ok(CLIENT_LIFECYCLE_STATUSES.includes('Inactive'))
  assert.ok(CLIENT_LIFECYCLE_STATUSES.includes('Archived'))
})

// ── 2. Follow-up ageing predicates (WM-3) ──────────────────────────────────────
test('CLW-3: follow-up due today is NOT overdue (local-date string compare)', () => {
  const today = todayLocal()
  assert.equal(isFollowUpToday(today, today), true)
  assert.equal(isFollowUpOverdue(today, today), false)          // due-today never overdue
})

test('CLW-4: follow-up overdue/today handle blank + past + future', () => {
  const today = '2026-08-03'
  assert.equal(isFollowUpOverdue('2026-08-02', today), true)
  assert.equal(isFollowUpOverdue('2026-08-04', today), false)
  assert.equal(isFollowUpOverdue('', today), false)
  assert.equal(isFollowUpOverdue(null, today), false)
  assert.equal(isFollowUpToday('2026-08-04', today), false)
  assert.equal(isFollowUpToday(null, today), false)
})
