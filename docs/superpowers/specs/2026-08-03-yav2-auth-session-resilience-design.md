# YAV2 — Authentication & Session Resilience Closure — Design Spec

**Date:** 2026-08-03 · **Owner:** PJ · **Executor:** Claude Code
**Governing base:** `sync/integration` @ `61b6a9910557c2a4214350ee3be5dee7fd874ad5`
**Working branch:** `feature/yav2-auth-session-resilience-closure` · **Worktree:** `D:/Claude/Claude Code/YAV2-Auth-Session-Resilience`
**Authorised env:** V2/yav2-dev `ogjrwemjefvccpyjwxuo` only. V1/Production prohibited.
**Posture:** repository-only (frontend); no backend (no SQL/migration/RLS/RPC/mutation); no deploy; Draft PR against `sync/integration`; PR #48 untouched.

## 1. Problem
Transient backend errors during authentication are treated as permanent verdicts:
- **`Login.handleLogin`** — after a successful `signInWithPassword`, the `team` membership lookup does **not** check its query `error`. A network/RLS blip yields `member = null`, so an **active** user is signed out with **"Your account is not active. Contact Pankaj."** — a false, misleading lockout.
- **`App.loadUser`** — `if (error || !member)` conflates a transient error with "not a member" → a session-restore blip **silently signs a valid user out** (drops to Login) with no distinction or retry.
- **`App.handleSetNewPassword`** — shows **raw `error.message`** to the user (OD-5 violation).
- **`ChatAgent.send`** — a `setTimeout(...'Analysing…', 1500)` is never cleared → a **stale `setThinkingText`** fires after the request completes or the component unmounts.
- **`Login.handleForgot`** — the `team` lookup and `resetPasswordForEmail` errors are unchecked; a transport failure still shows "check your email" (nothing sent).

## 2. Approach — reuse-first, fail-closed preserved
A single shared pure helper classifies a membership-verification result; both `Login` and `App` consume it, so the transient-vs-permanent distinction lives in one tested place. **Security is unchanged: an unverifiable membership still DENIES access** — only the *message* becomes accurate and retryable (never "inactive", never a silent drop). No new auth mechanism; no backend/RLS change.

New `src/lib/authSession.js`:
```js
// Classify the result of the active-member lookup. Fail-closed: only 'granted'
// admits the user. A transient error is 'verify_failed' (retryable, NOT "inactive").
export function classifyMembership({ error, member }) {
  if (error) return { outcome: 'verify_failed' }
  if (!member) return { outcome: 'not_active' }
  return { outcome: 'granted', member }
}
export const AUTH_MESSAGES = {
  verify_failed: "We couldn't verify your account right now. Please check your connection and try again.",
  not_active: 'Your account is not active. Contact Pankaj.',
}
```

## 3. Scope (exact)
- **AS-1 (HIGH)** `Login.handleLogin`: destructure `{ data: member, error }`; use `classifyMembership`. On `verify_failed` → sign out + `AUTH_MESSAGES.verify_failed` (retryable, access denied). On `not_active` → sign out + `AUTH_MESSAGES.not_active`. On `granted` → `onLogin(member)`.
- **AS-2 (MED)** `App.loadUser`: use `classifyMembership`. On `granted` → `setUser`. On `not_active` → sign out + `setUser(null)` (as today). On `verify_failed` → **do not silently sign out**; set a session-error state that renders a retryable "couldn't verify your session" screen with a Retry that re-runs `loadUser`; access is not granted. (Fail-closed retained.)
- **AS-3 (MED)** `App.handleSetNewPassword`: `setNewPassErr(safeErrorMessage(error))` instead of `error.message`.
- **AS-4 (LOW)** `ChatAgent.send`: hold the timer id in a ref; clear it when the request resolves (`finally`) and on unmount (effect cleanup) so the stale `setThinkingText` cannot fire.
- **AS-5 (LOW)** `Login.handleForgot`: wrap the lookup + `resetPasswordForEmail` in try/catch; on a genuine transport error show a retryable message that is **identical regardless of whether the account exists** (anti-enumeration preserved — the message is a generic "couldn't send right now, please retry", not "no such account").

## 4. Non-goals
No new auth flow/redesign; no password/credential entry by the executor; no backend/RLS/`team`-table change; no session-token handling change; Usage-tab visibility unchanged (recorded PJ decision); no net-new UI surface; PR #48 untouched.

## 5. Testing (OD-5: pure-logic + static source guards; no jsdom)
`tests/authSessionResilienceClosure.test.js`:
- Pure: `classifyMembership` (error→verify_failed; null member→not_active; member→granted); `AUTH_MESSAGES` verify_failed ≠ not_active and neither is empty.
- Static guards: `Login.jsx` destructures the team-lookup `error` and uses `classifyMembership` (no bare `const { data: member } =` without error); `App.jsx` `loadUser` uses `classifyMembership` and has a verify-failed retry path (not just `error || !member` silent signout); `App.jsx` uses `safeErrorMessage` in the password path (no `error.message` to state); `ChatAgent.jsx` clears the timer (ref + `clearTimeout`); no raw `error.message` rendered in the auth files.

## 6. Verification
`npm test` full suite green (baseline 489 + new); `vite build` exit 0; non-auth localhost boot check against V2/yav2-dev (Login renders, HTTP 200, 0 console errors) where the git-ignored V2 `.env.local` is safely available. Authenticated UAT (transient-error simulation, retry, no false lockout) recorded as a short PJ checklist.

## 7. Rollback
Additive/guarded on a dedicated branch — per-file `git checkout sync/integration -- <file>` or discard branch. No backend state changed.
