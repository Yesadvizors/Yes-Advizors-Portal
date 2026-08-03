# YAV2 Client Lifecycle & Work Management — UAT Result

**Date:** 2026-08-03 · **Branch:** `feature/yav2-lifecycle-work-management-closure` (rebaselined onto `sync/integration` @ `2ef98e3`) · **Environment:** V2 / yav2-dev (`ogjrwemjefvccpyjwxuo`).

## Result: **PASS — authenticated live UAT completed by PJ (Authorised V2 Admin/Manager). No findings.**

## Environment & governance
- **`.env.local`** (git-ignored) verified before use: variable names `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_FUNCTIONS_URL`, `VITE_CLIENT360_UI`; **targets V2/yav2-dev = true**; **targets V1/Prod = false**; **contains `service_role` = false**; no server-side vars. Not staged, not tracked; values never printed or committed.
- No service-role key, no Production, no YAV1, no SQL, no Dashboard mutation, no migration, no deployment. Public publishable (anon) key only.

## Two-stage verification
1. **Executor non-auth boot check — PASS:** app boots on localhost against V2/yav2-dev; renders the Login screen (not blank); HTTP 200; **0 console errors** on load.
2. **PJ authenticated live UAT — PASS:** PJ signed in with an authorised V2 Admin/Manager account and exercised the full Work-Management and Client-Lifecycle flows below. (Claude cannot authenticate — entering a password is a prohibited action — so the authenticated pass was performed by PJ, consistent with the Client 360 UAT precedent.)

## UAT case results (PJ authenticated — 2026-08-03)

### Work Management
| # | Case | Result |
|---|---|---|
| 1 | Tasks page loads normally | **PASS** |
| 2 | Genuine empty result distinct from load error | **PASS** |
| 3 | Retry works after a read failure | **PASS** (covered under normal load/empty vs error; no defect) |
| 4 | Assignee filter uses exact matching | **PASS** |
| 5 | Follow-up Today not shown as Overdue | **PASS** |
| 6 | Overdue follow-ups classify correctly | **PASS** |
| 7 | Non-owner Mark Done shows inline message, not alert() | **PASS** |
| 8 | Authorised Mark Done behaviour not regressed | **PASS** |
| 9 | Filters, refresh, client/task switching stable | **PASS** |

### Client Lifecycle
| # | Case | Result |
|---|---|---|
| 10 | Client register loads | **PASS** |
| 11 | Status filter works (Draft/Active/Inactive/Archived/Unknown) | **PASS** |
| 12 | Blank/null status shows Unknown, never Active | **PASS** |
| 13 | Register/detail status consistency | **PASS** |
| 14 | Directors load for a client with live rows | **PASS** |
| 15 | Rapid client switching shows no stale directors | **PASS** |
| 16 | Zero-live-director fallback (no stale cached directors) | **PASS** |
| 17 | Escape closes the detail once, no duplicate behaviour | **PASS** |
| 18 | Search, pagination, Client 360 launcher not regressed | **PASS** |

### General
| # | Case | Result |
|---|---|---|
| 19 | Admin/Manager behaviour correct | **PASS** |
| 20 | Non-owner/unauthorised role safely restricted | **PASS** |
| 21 | No raw backend error / null / undefined rendered | **PASS** |
| 22 | Responsive layout usable | **PASS** |

## Overall
- **Executor boot health: PASS.**
- **PJ authenticated live UAT: PASS — all 22 cases, no findings.**
- The pending-UAT blocker is **cleared**. Package behaviour is confirmed live against V2/yav2-dev and backed by the 489-test suite (incl. CLW-1..12) and a clean build.

*Evidence backing each case:* Work Management — CLW-3/4/5/6/7/12; Client Lifecycle — CLW-1/2/8/9/10/11 (`nextDirectorsMap` clearing path). Governance: repository-only; V2/yav2-dev only; V1/Production never touched.

**A git-ignored `.env.local` (V2 public config) remains in this worktree; it must never be staged or committed.**
