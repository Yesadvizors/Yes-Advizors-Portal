# YAV2 Authentication & Session Resilience Closure — Test Evidence

**Suite:** `npm test` (`node --test`) · **Result:** 489 → **494 pass / 0 fail** · **Build:** `vite build` exit 0 · `git diff --check` clean.
**New file:** `tests/authSessionResilienceClosure.test.js` (5 tests, AS-1..AS-5). **Amended:** `tests/appShellRuntime.test.js` R5 (updated to the new fail-closed shape). Convention OD-5 — pure-logic + static source guards; no jsdom.

## AS test list
| ID | Kind | What it locks |
|---|---|---|
| AS-1 | pure | `classifyMembership` fail-closed: error→`verify_failed` (error wins over member), null member→`not_active`, member→`granted` |
| AS-2 | pure | `AUTH_MESSAGES.verify_failed` ≠ `not_active`; neither contains raw provider words (error/exception/null/undefined) |
| AS-3 | static | `Login.jsx` captures the team-lookup `error` and uses `classifyMembership`; old unconditional "not active" verdict removed; forgot-flow transport error handled |
| AS-4 | static | `App.jsx` `loadUser` uses `classifyMembership`, `verify_failed`→`setSessionError` (not signout), has `retrySession`, uses `safeErrorMessage`, no `setNewPassErr(error.message)`, old `if (error \|\| !member)` removed |
| AS-5 | static | `ChatAgent.jsx` holds the analysing timer in a ref (`analysingTimer.current = setTimeout(...)`) and calls `clearTimeout` |
| R5 (amended) | static | `App.loadUser` fail-closed: only `granted` admits `cls.member`; `verify_failed`→retryable state (no grant); `not_active`→signOut+setUser(null); still requires `is_active === true` |

## Raw pass output (AS file)
```
✔ AS-1: classifyMembership is fail-closed and distinguishes transient from not-active
✔ AS-2: auth messages exist, differ, and are business-safe (no raw provider text)
✔ AS-3: Login checks the team-lookup error and classifies membership
✔ AS-4: App.loadUser distinguishes transient from not-active and never leaks raw error
✔ AS-5: ChatAgent holds the analysing timer in a ref and clears it
ℹ pass 5 / fail 0
```

## Full-suite tail
```
ℹ tests 494
ℹ pass 494
ℹ fail 0
```

**Non-auth boot check PASS** on localhost against V2/yav2-dev (Login renders, HTTP 200, 0 console errors). Authenticated UAT is a PJ manual step — see the UAT checklist.
