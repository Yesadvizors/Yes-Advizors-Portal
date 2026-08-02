# YAV2 Core Operational Workflow Closure — Test & Build Evidence

Branch `feature/yav2-core-operational-closure` @ base `c4babefdcd50ce2d23005e597f27ba0d41b9674a`.
Runner: `node --test` (`npm test`). Build: `vite build`. No V1/Production; no live-DB mutation; static/logic tests only.

## Baseline (before this package)
- `node --test`: **383 pass / 0 fail**
- `vite build`: **exit 0**

## After this package
- `node --test`: **397 pass / 0 fail** (14 added)
- `vite build`: **exit 0** (`✓ built`)
- `git diff --check`: clean (no whitespace/conflict markers)
- Secret / prohibited-pattern scan of the diff: **none** (no service-role key, JWT/private key, password, `.env` value, or V1/Prod ref `zcszesuvjrryxtigjglt`)
- `.env.local`: git-ignored, **not tracked / not committed**

## Runtime (browser smoke, non-authenticated)
- Local Vite (port 5175, git-ignored `.env.local` → approved yav2-dev anon key). HTTP 200.
- App **renders the Login screen** — page text: "YA / TEAM PORTAL / Welcome back / Sign in → / Forgot password?" (**not blank**).
- Console: **0 errors / 0 exceptions**; no failed module import; no undefined-component crash.
- Interactive authenticated module smoke: **NOT run** — no test-account password available (governed reset required); recorded as a manual verification dependency.

## New tests — `tests/coreOperationalClosure.test.js` (14)
| ID | Assertion |
|---|---|
| CO-1 | Closed/completed status sets include "Filed / Completed"; Cancelled is closed but not completed |
| CO-2 | A "Filed / Completed" (or Done/Cancelled) task with a past due date is never "🔴 Overdue"; a Pending one is |
| CO-3 | `getDueMeta` never crashes on an invalid due date |
| CO-4 | `fmtDate` returns "—" for null/invalid, never literal "Invalid Date" |
| CO-5 | `todayLocal()` is a local `YYYY-MM-DD` (not the UTC `toISOString` date) |
| CO-6 | `isMyTask` is false for a blank/null assignee and a null user (no `startsWith("")` leak) |
| CO-7 | AddTaskModal guards double-submit, checks the insert error, only saves on success, keys on `client_id` |
| CO-8 | FollowUpModal checks insert AND task-update errors before `onSaved`; validates the follow-up date |
| CO-9 | HistoryModal surfaces a load error instead of a false empty state |
| CO-10 | MarkFiledModal guards double-submit + missing client; no clean success on document-save failure |
| CO-11 | Dashboard + Tasks use the shared closed/completed sets and `todayLocal()` |
| CO-12 | App bootstrap cannot hang (finally + catch); root wrapped in `ErrorBoundary` |
| CO-13 | Clients renders `<ResyncButton client={c} />` (recovery path exists) |
| CO-14 | WorkDocuments removes the orphaned storage object when the record insert fails |

## Amended existing test
- `tests/rapidLaunchFrontendFixes.test.js` FE-M1: the static assertion for the AddTaskModal Save-disabled guard was updated from `disabled={teamStatus !== 'ready'}` to `disabled={teamStatus !== 'ready' || saving}` to match the added in-flight double-submit guard (intent unchanged — Save is still disabled unless the roster loaded).
