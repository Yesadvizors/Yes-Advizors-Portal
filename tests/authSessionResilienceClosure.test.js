/**
 * YAV2 Authentication & Session Resilience Closure — regression tests.
 * node:test — `npm test`. Convention OD-5: pure-logic + static source guards
 * (no jsdom/RTL, no invented DB shape). Non-overlapping with prior closures.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { classifyMembership, AUTH_MESSAGES } from '../src/lib/authSession.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

// ── 1. Membership classification (fail-closed; transient vs permanent) ─────────
test('AS-1: classifyMembership is fail-closed and distinguishes transient from not-active', () => {
  assert.equal(classifyMembership({ error: { message: 'network' }, member: null }).outcome, 'verify_failed')
  assert.equal(classifyMembership({ error: { message: 'network' }, member: { id: 1 } }).outcome, 'verify_failed') // error wins
  assert.equal(classifyMembership({ error: null, member: null }).outcome, 'not_active')
  assert.equal(classifyMembership({ error: undefined, member: undefined }).outcome, 'not_active')
  const g = classifyMembership({ error: null, member: { id: 7 } })
  assert.equal(g.outcome, 'granted')
  assert.deepEqual(g.member, { id: 7 })
})

test('AS-2: auth messages exist, differ, and are business-safe (no raw provider text)', () => {
  assert.ok(AUTH_MESSAGES.verify_failed && AUTH_MESSAGES.not_active)
  assert.notEqual(AUTH_MESSAGES.verify_failed, AUTH_MESSAGES.not_active)
  assert.doesNotMatch(AUTH_MESSAGES.verify_failed, /error|exception|null|undefined/i)
  assert.doesNotMatch(AUTH_MESSAGES.not_active, /error|exception|null|undefined/i)
})
