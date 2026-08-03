# Authentication & Session Resilience Closure — Implementation Plan

> REQUIRED SUB-SKILL: executing-plans. Steps use checkbox syntax.

**Goal:** Repository-only hardening so transient backend errors during sign-in / session-restore never masquerade as "account not active" or silently log a valid user out, no raw error leaks in the auth flow, and the ChatAgent timer can't fire stale state.

**Architecture:** One shared pure `classifyMembership` helper (fail-closed) consumed by `Login` and `App`; message routing via `safeErrorMessage`; ChatAgent timer held in a ref and cleared. Tests = pure-logic + static source guards (OD-5).

## Global Constraints
- Repository-only; no backend/SQL/migration/RLS/RPC/mutation; V2/yav2-dev only; V1/Prod prohibited; no deploy; Draft PR; PR #48 untouched.
- Fail-closed preserved: unverifiable membership still DENIES access; only the message changes.
- No raw `error.message` to users; no hardcoded fallbacks (OD-5).
- Safety guard active: avoid literal trigger tokens / the V1 ref in commit messages & PR bodies (use `--body-file`).
- Base `sync/integration` @ `61b6a99`. Baseline: 489 tests, build exit 0.

## File Structure
- **Create** `src/lib/authSession.js` — `classifyMembership`, `AUTH_MESSAGES`.
- **Modify** `src/components/Login.jsx` — AS-1 (handleLogin), AS-5 (handleForgot).
- **Modify** `src/App.jsx` — AS-2 (loadUser + verify-failed retry state), AS-3 (safeErrorMessage).
- **Modify** `src/components/ChatAgent.jsx` — AS-4 (timer ref + clear).
- **Create** `tests/authSessionResilienceClosure.test.js`.
- **Create** closure report, test evidence, UAT checklist; **modify** register.

## Task 0: Baseline
- [ ] `npm ci`; `npm test` (expect 489 pass); `npx vite build` (exit 0).

## Task 1: Shared helper + pure tests (TDD)
- [ ] Write `tests/authSessionResilienceClosure.test.js` pure tests:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { classifyMembership, AUTH_MESSAGES } from '../src/lib/authSession.js'
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\{\/\*[\s\S]*?\*\/\}/g,'').replace(/(^|[^:])\/\/.*$/gm,'$1')

test('AS-1: classifyMembership is fail-closed and distinguishes transient from not-active', () => {
  assert.equal(classifyMembership({ error: { message: 'network' }, member: null }).outcome, 'verify_failed')
  assert.equal(classifyMembership({ error: { message: 'network' }, member: { id: 1 } }).outcome, 'verify_failed') // error wins
  assert.equal(classifyMembership({ error: null, member: null }).outcome, 'not_active')
  const g = classifyMembership({ error: null, member: { id: 7 } })
  assert.equal(g.outcome, 'granted'); assert.deepEqual(g.member, { id: 7 })
})
test('AS-2: messages exist, differ, and are business-safe (no raw provider text)', () => {
  assert.ok(AUTH_MESSAGES.verify_failed && AUTH_MESSAGES.not_active)
  assert.notEqual(AUTH_MESSAGES.verify_failed, AUTH_MESSAGES.not_active)
  assert.doesNotMatch(AUTH_MESSAGES.verify_failed, /error|exception|null|undefined/i)
})
```
- [ ] Run → FAIL (module missing).
- [ ] Create `src/lib/authSession.js` (per spec §2). Run → PASS.
- [ ] Commit.

## Task 2: Login.jsx (AS-1, AS-5)
- [ ] AS-1 — replace the post-signin lookup block:
```js
const { data: member, error: memberErr } = await supabase.from('team').select('*')
  .ilike('email', email.trim()).eq('is_active', true).maybeSingle()
setLoading(false)
const cls = classifyMembership({ error: memberErr, member })
if (cls.outcome !== 'granted') {
  await supabase.auth.signOut()
  setErr(cls.outcome === 'verify_failed' ? AUTH_MESSAGES.verify_failed : AUTH_MESSAGES.not_active)
  return
}
onLogin(cls.member)
```
- [ ] AS-5 — wrap handleForgot lookup + reset in try/catch; on a thrown transport error set a generic retryable message (identical regardless of account existence); keep the existing "sent" behaviour on success. Import `classifyMembership, AUTH_MESSAGES`.
- [ ] Add static guards to the test file (Login destructures `error`, uses `classifyMembership`, no bare `const { data: member } =` without error). Run tests + build. Commit.

## Task 3: App.jsx (AS-2, AS-3)
- [ ] AS-2 — add `const [sessionError, setSessionError] = useState(false)`; rewrite `loadUser`:
```js
async function loadUser(email) {
  const { data: member, error } = await supabase.from('team').select('*')
    .ilike('email', email).eq('is_active', true).maybeSingle()
  const cls = classifyMembership({ error, member })
  if (cls.outcome === 'granted') { setSessionError(false); setUser(cls.member); return }
  if (cls.outcome === 'verify_failed') { setSessionError(true); return } // do NOT silently sign out
  await supabase.auth.signOut(); setUser(null)                            // not_active
}
```
  Render a retryable session-error screen when `sessionError && !user` (Retry re-runs the session bootstrap / `loadUser`). Import `classifyMembership`.
- [ ] AS-3 — `import { safeErrorMessage } from './lib/errors'`; in `handleSetNewPassword`: `setNewPassErr(safeErrorMessage(error))`.
- [ ] Add static guards (App uses `classifyMembership`, has a verify-failed branch that is not a signout, uses `safeErrorMessage`, no `error.message` to state). Run tests + build. Commit.

## Task 4: ChatAgent.jsx (AS-4)
- [ ] Add `const analysingTimer = useRef(null)`. In `send`, set `analysingTimer.current = setTimeout(...)`; in a `finally` clear it (`clearTimeout(analysingTimer.current)`). Add an unmount effect: `useEffect(() => () => clearTimeout(analysingTimer.current), [])`.
- [ ] Static guard: ChatAgent holds the timer in a ref and calls `clearTimeout`. Run tests + build. Commit.

## Task 5: Verify, docs, Draft PR
- [ ] Full suite + build + `git diff --check` + secret/prohibited/scope scans.
- [ ] Non-auth boot check against V2/yav2-dev (copy verified V2-public `.env.local`; Login renders, HTTP 200, 0 console errors).
- [ ] Write closure report + test evidence + UAT checklist (transient-error simulation, retry, no false lockout) + register entry (Status: Draft, not merged).
- [ ] Commit; push; open Draft PR against `sync/integration` (`--body-file`). Do NOT mark Ready; do NOT merge.
- [ ] Consolidated review report.

## Self-Review (authoring)
Spec coverage: AS-1 (T2, tests) · AS-2 (T3, tests) · AS-3 (T3) · AS-4 (T4) · AS-5 (T2). Helper names consistent (`classifyMembership`, `AUTH_MESSAGES`). No placeholders.
