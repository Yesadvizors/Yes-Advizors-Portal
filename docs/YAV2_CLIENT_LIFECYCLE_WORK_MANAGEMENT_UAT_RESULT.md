# YAV2 Client Lifecycle & Work Management — UAT Result

**Date:** 2026-08-03 · **Branch:** `feature/yav2-lifecycle-work-management-closure` (rebaselined onto `sync/integration` @ `2ef98e3`) · **Environment:** V2 / yav2-dev (`ogjrwemjefvccpyjwxuo`) via localhost dev server.

## Environment & governance
- **`.env.local`** (git-ignored) verified before use: variable names `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_FUNCTIONS_URL`, `VITE_CLIENT360_UI`; **targets V2/yav2-dev = true**; **targets V1/Prod = false**; **contains `service_role` = false**; no server-side vars. It is **not staged, not tracked** (`git check-ignore` confirms), and its values were **never printed or committed**.
- No service-role key, no Production, no YAV1, no SQL, no Supabase Dashboard mutation, no migration, no deployment were used. Localhost only, public publishable (anon) key only.

## Method & hard limitation
A non-authenticated live boot check was performed against V2/yav2-dev. **The authenticated Work-Management and Client-Lifecycle flows could not be driven by this executor:** logging in requires entering a password, which is a **prohibited action for Claude** (safety rule: "entering passwords to authenticate" is not permitted), and **no test-account credential is available in this session**. Per project precedent (the Client 360 UAT was performed by PJ for the same reason), the **authenticated live UAT must be performed by PJ**. Every case below therefore carries its code/test-backed evidence and an explicit PJ verification step.

## Boot health (live, non-auth) — **PASS**
- App boots against V2/yav2-dev with the git-ignored `.env.local`; renders the Login screen ("Yes Advizors — Team Portal / Welcome back / Sign in →"), **not blank**; HTTP 200; **0 console errors/exceptions** on load. Confirms the bundle, environment wiring, and Supabase client initialise cleanly against the authorised project.

## UAT case results

Legend: **PASS** (verified live) · **NT** = NOT TESTABLE live by executor (reason: authenticated session required — password entry prohibited for Claude + no test account; PJ to perform) · each NT lists the in-repo evidence and the PJ check.

### Work Management
| # | Case | Result | Evidence / PJ check |
|---|---|---|---|
| 1 | Tasks page loads normally | NT | Build transforms `Tasks.jsx`; boot health PASS. PJ: log in, open Tasks — list renders. |
| 2 | Genuine empty result distinct from load error | NT | **CLW-5** (retryable error state distinct from empty) + **CLW-12** (try/catch/finally). PJ: with a client that has no tasks → "No tasks match your filters"; contrast with an induced read failure → "Couldn't load the task tracker" + Retry. |
| 3 | Retry works after a read failure | NT | **CLW-5** (`onClick={load}` retry) + **CLW-12**. PJ: induce a failure (e.g. offline), confirm Retry re-runs `load`. |
| 4 | Assignee filter uses exact matching | NT | **CLW-6** (`(t.assigned_to \|\| '') !== fAssign`, no substring). PJ: pick an assignee whose name is a prefix of another; confirm only exact matches show. |
| 5 | Follow-up Today not shown as Overdue | NT | **CLW-3** (`isFollowUpToday` true / `isFollowUpOverdue` false for today). PJ: a task with `next_followup_date = today` appears under "Follow-up Today", not "Overdue". |
| 6 | Overdue follow-ups classify correctly | NT | **CLW-4** (past < today ⇒ overdue). PJ: a past `next_followup_date` appears under "Follow-up Overdue". |
| 7 | Non-owner Mark Done shows inline message, not alert() | NT | **CLW-7** (no `alert(`; `setActionError('Only …')`). PJ: as a non-owner, click Done — an inline business-safe banner appears, no browser alert. |
| 8 | Authorised Mark Done not regressed | NT | `markDone` logic unchanged except the non-owner branch; re-entrancy guard intact. PJ: as owner, Mark Done succeeds and the row closes. |
| 9 | Filters, refresh, client/task switching stable | NT | Pure filter predicates unchanged aside from WM-2/WM-3. PJ: exercise filters + refresh; no crash/stale state. |

### Client Lifecycle
| # | Case | Result | Evidence / PJ check |
|---|---|---|---|
| 10 | Client register loads | NT | `Clients.load` already had `loadError` (PR #49); build transforms `Clients.jsx`. PJ: open Clients — register renders. |
| 11 | Status filter works (Draft/Active/Inactive/Archived/Unknown) | NT | **CLW-9** (filter present) + **CLW-1/2** (`clientStatusLabel`). PJ: filter by each status where data exists. |
| 12 | Blank/null status shows Unknown, never Active | NT | **CLW-1** (`null/blank → 'Unknown'`, never 'Active'). PJ: a client with no status shows "Unknown". |
| 13 | Detail status matches the register | NT | **CLW-9** (`clientStatusLabel(c.status)` in the detail badge; `c.status \|\| 'Active'` removed). PJ: open a client — badge equals the register status. |
| 14 | Directors load for a client with live rows | NT | **CLW-8** (fetch + `nextDirectorsMap`). PJ: open a client with `client_directors` rows — directors render. |
| 15 | Switching clients fast doesn't show prior client's directors | NT | **CLW-8** (race guard `ignore`). PJ: rapidly open client A then B — B never shows A's directors. |
| 16 | Client with zero live rows doesn't retain stale directors; uses legacy fallback | NT | **CLW-11** (executable: empty result deletes the key → legacy `c.directors` fallback). PJ: open a client whose director rows were removed — no stale list; legacy fallback (or empty) shows. |
| 17 | Escape closes the detail once, no duplicate behaviour | NT | **CLW-10** (single `useEscapeKey`; duplicate window listener removed). PJ: press Esc — modal closes once. |
| 18 | Search, pagination, Client 360 launcher not regressed | NT | Search predicate wrapped with the status filter; pagination + launcher untouched. PJ: search, page, open Client 360. |
| 19 | Admin/Manager behaviour correct | NT | Role gating unchanged by this package. PJ: as Admin/Manager, controls present as before. |
| 20 | Non-owner/unauthorised role safely restricted | NT | Mark-Done owner gate (`isMyTask`) + existing role gates unchanged; UI gating is defence-in-depth (RLS is the authority — recorded dependency). PJ: as a restricted role, actions are unavailable/denied. |
| 21 | No raw backend error/null/undefined rendered | NT | `safeErrorMessage` retained; new messages are business-safe; missing values render `—`. PJ: confirm no raw `null`/`undefined`/stack text. |
| 22 | Responsive layout usable | NT | Status filter added inside a `flex-wrap` row; no layout-breaking change. PJ: narrow the viewport — filters wrap, no horizontal overflow. |

## Overall
- **Live boot health: PASS.**
- **Cases 1–22: NOT TESTABLE by executor** (authenticated session required; password entry is prohibited for Claude and no test account is available). All are backed by the 489-test suite (incl. CLW-1..12) and a clean build; a focused PJ manual authenticated UAT is the remaining step, with the per-case checks above.
- No defects were surfaced (no authenticated live testing occurred); the defect-correction gate therefore has no live findings to correct. If PJ's manual UAT surfaces defects, they will be handled in a single controlled correction pass.

**A git-ignored `.env.local` (V2 public config) is present in this worktree** to let PJ run the authenticated UAT directly against the feature branch. It must never be staged or committed.
