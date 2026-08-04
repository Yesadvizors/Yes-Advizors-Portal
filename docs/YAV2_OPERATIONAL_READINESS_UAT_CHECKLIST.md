# YAV2 Operational Readiness & Cross-Module Consistency — PJ UAT Checklist (by module, ~20–30 min)

## RESULT: **PASS** — PJ authenticated live UAT completed 2026-08-04 (Authorised V2 Admin/Manager). No findings. Manual-UAT blocker cleared.

PJ-verified: Dashboard/Firm-Overview/Compliance keyboard nav (Tab/Enter/Space) · Tasks checklist dots+items keyboard · Add Task client-result keyboard select · Client Record dialog + close control · search trimming in Clients/Tasks/Compliance/Work Documents/Add Task · Compliance extracted-data table on narrow viewport · Re-sync timer + closing Client Record before reset · no console/runtime errors — **all PASS**.

**Environment:** V2/yav2-dev via localhost (git-ignored V2-public `.env.local` present). Authorised V2 Admin/Manager. Client 360 needs `VITE_CLIENT360_UI=true`. Keyboard testing: use **Tab** to focus and **Enter/Space** to activate. Record each **PASS / FAIL / NOT TESTABLE (reason)**.

## Accessibility — keyboard activation (OR-1..OR-6)
1. **Dashboard:** Tab to a metric card → it receives a visible focus ring; press **Enter** (and **Space**) → it navigates to the matching tab. ( )
2. **Admin Home (Firm Overview):** Tab to a metric card with a target → **Enter/Space** navigates; a non-clickable card is not focusable. ( )
3. **Compliance:** on the client-selector list, Tab to a client row → **Enter/Space** selects that client. ( )
4. **Tasks:** Tab to a task's checklist-dots → **Enter/Space** expands the checklist; within the panel, Tab to a checklist item → **Enter/Space** toggles it. ( )
5. **Add Task:** type to search a client, Tab into the results, **Enter/Space** picks a client. ( )
6. Mouse click still works exactly as before for all of the above (no regression). ( )

## Accessibility — dialog semantics (OR-7)
7. Open a client's detail record → a screen reader announces a **dialog** ("Client record for …"); the **✕** close control announces "Close client record"; Escape and ✕ both close it. ( )

## Reliability (OR-8)
8. On a client record, click **Re-sync Compliance**; before the "completed" state clears (~4s), close the record → no console warning about setting state on an unmounted component. ( )

## Cross-module search consistency (OR-9..OR-13)
9. **Clients** search: type a term with a **trailing space** (or paste "  name  ") → results match as if trimmed (not empty). ( )
10. **Tasks** search with surrounding spaces → matches correctly. ( )
11. **Compliance** search (client list + compliance list) with surrounding spaces → matches. ( )
12. **Work Documents** search with surrounding spaces → matches. ( )
13. **Add Task** client search with surrounding spaces → matches. ( )

## Responsive (OR-14)
14. Open Compliance → a financial document's **Extract Data** result table: on a **narrow viewport**, the table scrolls horizontally **within its own container**; the page body does not overflow sideways. ( )

## General
15. No raw `null`/`undefined`/backend error text anywhere exercised above; no new console errors. ( )
16. Existing role-aware controls unchanged (non-admins still don't see admin-only actions). ( )

**Overall:** **PASS** (PJ, 2026-08-04). Findings: **None.**
