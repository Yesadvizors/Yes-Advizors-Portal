# YAV2 Authentication & Session Resilience — PJ UAT Checklist

## RESULT: **PASS** — PJ authenticated live UAT completed 2026-08-03 (Authorised V2 Admin/Manager). No findings. Manual-UAT blocker cleared.

PJ-verified: normal valid login **PASS** · invalid credentials safe message **PASS** · forgot-password no account-existence leak **PASS** · password-reset errors no raw text **PASS** · session restore after refresh **PASS** · transient verification failure shows "Couldn't verify your session" **PASS** · no false "account inactive" on transient failure **PASS** · retry works after network restored **PASS** · access remains fail-closed until verification succeeds **PASS** · ChatAgent no stale "Analysing…" state **PASS** · no raw null/undefined/backend/console errors **PASS**.

**Environment:** V2/yav2-dev via localhost (git-ignored, V2-public `.env.local` already present in this worktree). Authorised V2 Admin/Manager account. **Read-only auth testing** — no data writes required.

> A transient team-lookup failure can be simulated safely by toggling the browser to **Offline** (DevTools → Network → Offline), or by temporarily blocking the Supabase REST host, at the exact step noted. No backend change is needed.

Record each as **PASS / FAIL / NOT TESTABLE (reason)**.

## Sign-in (AS-1)
1. **Normal sign-in** with valid active credentials → lands in the portal. ( )
2. **Genuine inactive account** (or an email not in `team`) → shows **"Your account is not active. Contact Pankaj."** and stays on Login. ( )
3. **Transient verify failure:** enter valid credentials; set the network **Offline** immediately after clicking Sign in (so `signInWithPassword` may succeed from cache/session but the `team` lookup fails) → shows the **retryable** "We couldn't verify your account right now… try again" message, **NOT** "account not active"; you are **not** admitted. Re-enable network + retry → normal sign-in. ( )
4. **Wrong password** → "Email or password is incorrect." ( )

## Session restore (AS-2)
5. **Normal reload while signed in** → stays signed in (no flash to Login). ( )
6. **Transient restore failure:** while signed in, set network **Offline**, then reload → a **"Couldn't verify your session"** screen with **Retry** appears (NOT a silent drop to Login, NOT a permanent "Loading…"). Re-enable network → **Retry** returns you to the portal. ( )
7. **Sign in again** button on that screen → returns to the Login screen cleanly. ( )

## Password reset (AS-3, AS-5)
8. **Forgot password** with a valid active email → "Check your email" message; reset email received. ( )
9. **Forgot password** with an unknown email → **same** "Check your email" message (no account-existence leak). ( )
10. **Forgot password** with network **Offline** → generic **"We couldn't send the reset link right now. Please try again."** (identical regardless of account existence; no raw error text). ( )
11. **Set new password** flow (from a reset link) with an invalid/short password or an induced error → the error shown is **business-safe** (no raw provider/stack text). ( )

## Assistant (AS-4)
12. Open the **YA Assistant**, send a question that responds in **under ~1.5s** → the status does **not** flip to "Analysing…" after the answer has already arrived (no stale status); closing the panel mid-request leaves no console warning about setting state on an unmounted component. ( )

## General
13. No raw backend error / `null` / `undefined` shown anywhere in the auth flow. ( )
14. Layout/responsiveness of the Login, session-error and reset screens is usable on a narrow viewport. ( )

**Overall:** **PASS** (PJ, 2026-08-03). Findings: **None.**
