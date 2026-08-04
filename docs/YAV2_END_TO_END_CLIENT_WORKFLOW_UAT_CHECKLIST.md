# YAV2 End-to-End Client Workflow & Data Consistency — PJ UAT Checklist (~20–30 min)

## Verification status (2026-08-04)
| Check | Result |
|---|---|
| Automated tests | **PASS — 528/528** |
| Production build | **PASS** |
| Non-authenticated runtime smoke test | **PASS** (Login renders, HTTP 200, 0 console errors, V2/yav2-dev) |
| Initial authenticated smoke test | **PASS** |
| **Complete real-data end-to-end UAT** | **DEFERRED** |

**Reason for deferral:** complete operational acceptance will be performed after real client records, documents, tasks, services and compliance data are entered. PJ will maintain a detailed discrepancy register during that full-system test. **PJ full UAT is NOT recorded as PASS.**

### Usability observation (documented; NOT a defect in this package; no source change)
- **Task title / client task row is not clickable from the Tasks list** to open a detail view.
- **Classification:** future usability enhancement.
- **Not a blocker** for the present data-consistency package.

**Environment:** V2/yav2-dev via localhost (git-ignored V2-public `.env.local` present). Authorised V2 Admin/Manager. Client 360 needs `VITE_CLIENT360_UI=true`. The key checks need a client that has at least one task in status **"Filed / Completed"** and (if available) a client whose status is **blank/null**. Record each **PASS / FAIL / NOT TESTABLE (reason)**.

## Task-count consistency (E2E-1, E2E-2)
1. Pick a client with a **"Filed / Completed"** task. In **Tasks**, confirm that task shows as done/closed (not open). ( )
2. **Firm Overview (Admin Home) → Open tasks / Overdue tasks:** these counts do **not** include that `Filed / Completed` task (i.e. they match what Tasks/Dashboard show). Cross-check the Open-tasks figure against the Dashboard "Pending" and the Tasks list. ( )
3. **Team:** the assignee of that `Filed / Completed` task shows an **Open tasks** number that excludes it (matches the Tasks list for that person). ( )
4. General: Firm Overview, Dashboard, Tasks and Team agree on open/overdue task counts for a sampled client/assignee. ( )

## Lifecycle-label consistency (E2E-3)
5. Open a client whose status is **blank/null** (or set one via the normal flow). In the **Clients** register it shows **"Unknown"**. Open that client's **Client 360** → the header shows the **same** label ("Unknown"), **not** "Active". ( )
6. For an **Active** client, both Clients and Client 360 show "Active"; for a **Draft/Inactive** client, both show the same label. ( )

## Regression / integrity
7. Firm Overview loads normally; compliance counts and other metrics are unchanged. ( )
8. Team page loads; member open-task counts are correct for active members. ( )
9. Client 360 opens, all tabs/summary cards load, refresh works, no raw `null`/`undefined`/backend error. ( )
10. No new console/runtime errors anywhere exercised above. ( )

## Note for PJ (documented data-quality item, NOT changed here)
- **Compliance "Partner Approved":** Firm Overview treats `Partner Approved` compliance rows as done, but the app's shared compliance closed-set does not list it. Please confirm whether **"Partner Approved" is a genuine terminal compliance status**; a future governed package will reconcile the compliance terminal-status vocabulary accordingly. (No change made in this package.)

**Overall (partial):** automated + build + non-auth smoke + initial authenticated smoke = **PASS**; **complete real-data end-to-end UAT = DEFERRED** (to be completed after real data entry, with a PJ discrepancy register). Findings so far: **none blocking**; one usability observation recorded above.
