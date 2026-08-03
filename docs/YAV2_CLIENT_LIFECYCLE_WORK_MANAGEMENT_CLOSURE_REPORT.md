# YAV2 Client Lifecycle & Work Management Closure — Repository-Only Completion Sprint

**Status:** IMPLEMENTED — repository-only; not merged, not deployed. Draft PR against `sync/integration`.
**Package type:** functional reliability + consistency hardening of the EXISTING client-lifecycle and work-management surfaces (NOT presentation/redesign — PR #48 untouched; NOT a net-new UI surface).

| Field | Value |
|---|---|
| Governing base branch | `sync/integration` |
| Governing base SHA | `a59d0e26548b8eaa7fea5ff8143ea98b868b3563` (local == origin at cut) |
| Feature branch | `feature/yav2-lifecycle-work-management-closure` |
| Isolated worktree | `D:/Claude/Claude Code/YAV2-Client-Lifecycle-Work-Management` |
| Authorised env | V2/yav2-dev `ogjrwemjefvccpyjwxuo` only (no V1/Prod; no SQL/migration/RLS/RPC/mutation) |
| Autonomous safety controls | ACTIVE (PreToolUse guard; separate infra PR #56) — enforced throughout |
| Tests | **477 → 489** (12 added; 0 fail) |
| Build | `vite build` exit 0 |
| Runtime | Built app serves HTTP 200 with the app shell; authenticated boot is a manual dependency (§7) |

## 1. Scope
Close the remaining repository-level reliability/consistency gaps in the **existing** work-management (`Tasks.jsx`) and client-lifecycle (`Clients.jsx`) surfaces that the prior closures did not touch. Backend is out of scope and recorded, not executed.

**Explicitly non-overlapping.** PR #49 (Core Operational) already hardened the task/follow-up/mark-filed WRITE paths (re-entrancy, insert-error checks, retry idempotency, `todayLocal` ageing); PR #51 (Compliance Reliability) hardened the compliance loaders and shared the compliance overdue/closed truth; PR #53 (Client 360) added the read-first workspace and the shared follow-up helper. **None of that is redone here** — it is recorded as done.

## 2. Preflight
Cut from `sync/integration` @ `a59d0e2` in a dedicated isolated worktree; governing worktree returned to `sync/integration` (= origin) and kept clean; `npm ci` clean; **baseline 477 tests pass, build exit 0**. PR #48 (`feature/yav2-professional-redesign-launch` @ `fc0dd32`) not touched.

## 3. Changes made (repository-level; no backend contract change; no new DB field; no new write path)

### 3A Work Management — `src/components/Tasks.jsx`
- **WM-1 (HIGH) — false-empty-on-outage closed + rejection-safe.** `load()` discarded the `error` on all three reads (`tasks`, `follow_ups`, `team`); a failed load rendered as the empty "No tasks match your filters." — indistinguishable from "no tasks." `load()` is now wrapped in **try/catch/finally**: a response-level Supabase error is *thrown* into the same catch as a rejected request or any unexpected exception; the catch surfaces a **retryable error state distinct from empty** and clears tasks/follow-up counts/team; the `finally` **always resets `loading`**. Raw detail goes to console only. This is the same false-empty class PR #51 fixed for Compliance; `Tasks.jsx` had been missed. *(Review correction 2 hardened the exception path + guaranteed loading cleanup.)*
- **WM-2 — exact assignee filter.** The assignee filter used substring `.includes(fAssign)` ("Ann" matched "Anna"); now an exact, null-safe match (`(t.assigned_to || '') !== fAssign`).
- **WM-3 — shared follow-up ageing.** The inline `next_followup_date !== today` / `< today` logic is replaced by pure, tested helpers `isFollowUpToday` / `isFollowUpOverdue` (local-date string compare; **due-today is not overdue**). Behaviour unchanged; locked by tests so it cannot regress.
- **WM-4 — inline non-owner message.** The non-owner Mark-Done blocking `alert()` is routed through the existing inline `actionError` channel (business-safe, no raw `error.message`).

### 3B Client Lifecycle — `src/components/Clients.jsx`
- **CL-1 — directors fetch hardened.** The `client_directors` fetch discarded its `error` and had no race guard (a late response for a previously-viewed client could overwrite the current one). Now: error surfaced to console (no silent discard); a **stale-response race guard** (`ignore` flag in the effect cleanup) drops a response after the viewed client changed; and a pure reducer `nextDirectorsMap()` **replaces on non-empty rows and CLEARS (deletes) the cached entry on an empty result** — so stale directors from a previous state cannot survive after the DB rows are gone; the legacy `c.directors` fallback is preserved (a deleted key renders via the fallback, never a stale array). *(Review correction 1.)*
- **CL-2 — consistent lifecycle-status representation + read-only filter.** The detail badge defaulted `null → 'Active'` (an inactive/mis-saved client shown as Active); now a small pure `clientStatusLabel()` renders blank/null as **"Unknown"** and known/legacy values verbatim, used consistently in the detail badge. A **read-only status filter** was added to the register (parity with Tasks' filters). **No status-transition write control** — deferred (§6).
- **CL-3 — single Escape handler.** `Clients.jsx` had both `useEscapeKey(closeViewClient)` and a duplicate manual `window` `keydown` listener closing the modal; the redundant listener was removed.

### 3C Shared pure helpers — `src/helpers.js`
Added `CLIENT_LIFECYCLE_STATUSES`, `clientStatusLabel`, `isFollowUpOverdue`, `isFollowUpToday`, and `nextDirectorsMap` (pure, tested). Reuse-first — no parallel logic introduced.

## 4. Tests added
`tests/clientLifecycleWorkManagementClosure.test.js` — **12 tests** (CLW-1..12): pure-logic (status label never defaults Active; known/legacy verbatim; follow-up due-today-not-overdue; blank/past/future; **CLW-11 executable `nextDirectorsMap` — replace on rows, clear the key on an empty/null result, no mutation**) + static source guards (Tasks load-error wiring; exact assignee; shared follow-up predicates + no non-owner alert; directors race/error guard **+ clearing reducer**; no `null→Active`; consistent label + filter; single Escape handler; **CLW-12 Tasks.load try/catch/finally with guaranteed `setLoading(false)` and cleared state on failure**). Convention OD-5 — no jsdom/RTL, no invented DB shape; static/logic only.

## 5. Test / build / runtime results
- **Full suite: 489 pass / 0 fail** (477 baseline + 12 CLW). **Build: exit 0.**
- No pre-existing static-guard test in any other file needed amending (0 amended) — the edits did not violate prior guards.
- Non-auth boot: the built app serves **HTTP 200** with the app shell (`<title>Yes Advizors — Team Portal</title>`).

## 6. Deferred (recorded, NOT built)
- **Guarded client status-transition control** (Active↔Inactive/Archive) — a new write path; explicitly out of scope this package (PJ decision: filter + read-only display only). Recorded for a future package; authority is RLS.

## 7. Backend dependencies (identified, NOT executed)
1. **Client-ID allocation race** (OnboardingWizard `maxNum+1`) → DB sequence / allocation RPC.
2. **`task_id` / `followup_id` uniqueness** → DB unique constraint (repository mitigation from PR #49 retained; unchanged here).
3. **Role enforcement** for the deferred status-transition control and for Mark-Done → RLS/policy (UI gates are defence-in-depth). Bundle into governed P7/P8/P9. **None executed here.**

## 8. Live verification & manual dependency
- **Live boot check (non-auth) — PASS:** the app was run on localhost against **V2/yav2-dev** (`ogjrwemjefvccpyjwxuo`) using a git-ignored, verified **V2 public** `.env.local` (VITE_ vars only; no `service_role`; does not target V1). It renders the Login screen (not blank), HTTP 200, **0 console errors** on load — bundle + environment + Supabase client initialise cleanly.
- **Authenticated UAT — deferred to PJ:** the 22 Work-Management/Client-Lifecycle UAT cases require an authenticated session. This executor **cannot** authenticate — entering a password is a prohibited action for Claude and no test-account credential is available — so, as with the Client 360 UAT, the authenticated live pass must be performed by PJ. Each case is backed by the 489-test suite (incl. CLW-1..12) and a clean build, with a per-case PJ checklist. See `docs/YAV2_CLIENT_LIFECYCLE_WORK_MANAGEMENT_UAT_RESULT.md`.

## 9. Rollback
All changes are additive/guarded on a dedicated branch — roll back per-file (`git checkout sync/integration -- <file>`) or discard the branch. No backend state changed, so nothing to roll back server-side. `.env.local` is local/git-ignored and not part of the branch.

## 10. Completion register
See `docs/YAV2_Master_Completion_Register.md` new section "Client Lifecycle & Work Management Closure". The authoritative whole-project weighted figure is owned by the separate governing model / blueprint and is **not** re-derived here.
