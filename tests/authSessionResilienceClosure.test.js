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

// ── 2. Login source guards (AS-1, AS-5) ────────────────────────────────────────
test('AS-3: Login checks the team-lookup error and classifies membership', () => {
  const code = stripComments(read('../src/components/Login.jsx'))
  assert.match(code, /error: memberErr/)                 // lookup error captured
  assert.match(code, /classifyMembership\(\{ error: memberErr, member \}\)/)
  // the old unconditional "not active" verdict on a null member is gone
  assert.doesNotMatch(code, /if \(!member\) \{ await supabase\.auth\.signOut\(\); setErr\('Your account is not active/)
  // forgot flow wraps transport errors (anti-enumeration preserved)
  assert.match(code, /password reset request failed/)
  assert.match(code, /couldn't send the reset link/)
})

// ── 3. App source guards (AS-2, AS-3) ──────────────────────────────────────────
test('AS-4: App.loadUser distinguishes transient from not-active and never leaks raw error', () => {
  const code = stripComments(read('../src/App.jsx'))
  assert.match(code, /classifyMembership\(\{ error, member \}\)/)
  assert.match(code, /verify_failed'\) \{ setSessionError\(true\); return \}/) // transient → retry, not signout
  assert.match(code, /retrySession/)
  assert.match(code, /setNewPassErr\(safeErrorMessage\(error\)\)/)
  assert.doesNotMatch(code, /setNewPassErr\(error\.message\)/)               // no raw provider text
  // the old conflating guard is gone
  assert.doesNotMatch(code, /if \(error \|\| !member\) \{/)
})

// ── 4. ChatAgent source guard (AS-4) ───────────────────────────────────────────
test('AS-5: ChatAgent holds the analysing timer in a ref and clears it', () => {
  const code = stripComments(read('../src/components/ChatAgent.jsx'))
  assert.match(code, /analysingTimer = useRef\(null\)/)
  assert.match(code, /analysingTimer\.current = setTimeout/)
  assert.match(code, /clearTimeout\(analysingTimer\.current\)/)
  // the analysing tick is captured to the ref (not a bare, unclearable setTimeout)
  assert.match(code, /analysingTimer\.current = setTimeout\(\(\) => setThinkingText\('Analysing/)
})
