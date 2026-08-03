# YAV2 Client Lifecycle & Work Management Closure — Test Evidence

**Suite:** `npm test` (`node --test`) · **Result:** 477 → **487 pass / 0 fail** · **Build:** `vite build` exit 0.
**New file:** `tests/clientLifecycleWorkManagementClosure.test.js` (10 tests, CLW-1..10). Convention OD-5 — pure-logic + static source guards; no jsdom/RTL; no invented DB shape.

## CLW test list

| ID | Kind | What it locks |
|---|---|---|
| CLW-1 | pure | `clientStatusLabel` never defaults a missing status to `Active` (null/undefined/blank → `Unknown`) |
| CLW-2 | pure | `clientStatusLabel` returns known + legacy statuses verbatim (trimmed); `CLIENT_LIFECYCLE_STATUSES` includes Inactive/Archived |
| CLW-3 | pure | follow-up **due today is NOT overdue** (local-date string compare) |
| CLW-4 | pure | follow-up overdue/today handle blank + past + future correctly |
| CLW-5 | static | `Tasks.load` captures each query `error`, sets `loadError`, renders a retryable error state distinct from empty (WM-1) |
| CLW-6 | static | Tasks assignee filter is exact (`!== fAssign`), not substring `.includes` (WM-2) |
| CLW-7 | static | Tasks uses `isFollowUpOverdue`/`isFollowUpToday` and the non-owner path is inline `setActionError` (no `alert(`) (WM-3/WM-4) |
| CLW-8 | static | `Clients` directors fetch has a race guard (`ignore`) and surfaces load errors (CL-1) |
| CLW-9 | static | no `c.status || 'Active'`; consistent `clientStatusLabel(c.status)`; status filter present (CL-2) |
| CLW-10 | static | single Escape handler — `useEscapeKey` kept, no duplicate `addEventListener('keydown'` (CL-3) |

## Raw pass output (CLW file)

```
✔ CLW-1: clientStatusLabel never defaults a missing status to Active
✔ CLW-2: clientStatusLabel returns known + legacy statuses verbatim
✔ CLW-3: follow-up due today is NOT overdue (local-date string compare)
✔ CLW-4: follow-up overdue/today handle blank + past + future
✔ CLW-5: Tasks.load captures query errors and renders a retryable error state (WM-1)
✔ CLW-6: Tasks assignee filter is exact, not substring (WM-2)
✔ CLW-7: Tasks uses shared follow-up predicates and no non-owner alert (WM-3/WM-4)
✔ CLW-8: directors fetch has a race guard and surfaces errors (CL-1)
✔ CLW-9: no null->Active default; consistent status label + read-only filter (CL-2)
✔ CLW-10: single Escape handler — no manual window keydown alongside useEscapeKey (CL-3)
ℹ pass 10 / fail 0
```

## Full-suite tail

```
ℹ tests 487
ℹ pass 487
ℹ fail 0
```

Interactive authenticated smoke remains a manual dependency (governed test account + git-ignored `.env.local`, absent here).
