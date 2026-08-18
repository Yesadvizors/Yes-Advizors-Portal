# YAV2 E2E-C1 — Compliance Overdue Single-Source Consistency — closure

**Governing base:** `3bae9da3ad7fc91b8359328e8dfb9e7f226faeb8` (origin/sync/integration; PR #70/#72/#73/#74).
**Branch:** `feature/yav2-e2e-c1-overdue-consistency` · **head:** `0be75084fc87d6404916f372511b339f78d764c2`.
**No DB/backend/deployment changes.** Repository-only re-source. Dev only (`ogjrwemjefvccpyjwxuo`).

## B. E2E-C1 reproduced: **YES**
Firm Overview showed **Overdue compliance = 0** while the Compliance page and the Bento Dashboard showed **2**.

## D. Root cause (read-only DB + source trace)
`compliance_calendar` is **unpopulated — 0 rows** on dev. Firm Overview (`AdminHome`) read it for overdue (`is_overdue=true`), "due this month" (month window) and "upcoming deadlines" — all empty → **0 / 0 / "no upcoming"**. The Compliance Firm Dashboard tab and the Bento Dashboard both read the **authoritative `v_firm_dashboard`** view (Income Tax overdue **2**, Accounting overdue 0 → **2**). Same obligations, **different data source** → the 0-vs-2 mismatch. Not a stale flag; the calendar table was simply never populated.

## Data-source matrix (before)
| Surface | Source | Overdue derivation | Result |
|---|---|---|---|
| Compliance → Firm Dashboard | `v_firm_dashboard` (view) | view: NOT IN (Filed,Completed,Closed,Not Applicable) AND due<today | **2** |
| Bento Dashboard | `v_firm_dashboard` (via dashboardModel) | Σ firm.overdue | **2** |
| Firm Overview (AdminHome) | `compliance_calendar` (empty) | `is_overdue=true` | **0** ❌ |
| Client 360 | per-client reads (scope differs) | shared `complianceDateMeta` | per-client |

## E/F. Authoritative source selected: **`v_firm_dashboard`**
Current, complete, client- and FY-consistent, status-consistent, and **already the source for 2 of the 3 firm surfaces**. It applies the terminal-status truth server-side (so Partner Approved stays non-terminal). Usable with no DB mutation. `compliance_calendar` is empty/unused; choosing the view is correctness, not convenience.

## G. Code changes (Option A — repository-only re-source; H. DB change required: **NO**)
`AdminHome`:
- Removed the three `compliance_calendar` reads + the `DONE_COMPLIANCE` filter + the `CLOSED_COMPLIANCE_ENUM_STATUSES` import (no independent overdue rule remains).
- Added ONE `v_firm_dashboard` read; derives `overdueCompliance = Σ overdue`, `complianceDueSoon = Σ due_in_7_days`, and a per-area breakdown.
- Cards: "Overdue compliance" = view overdue (**2**); "Compliance due this month" → **"Compliance due (7 days)"** = Σ due_in_7_days (matches Dashboard + the Compliance "Due in 7 Days" card).
- Panel: always-empty "Upcoming statutory deadlines" → **"Compliance by area"** (category · overdue · due-soon · pending) from the same view.
- Fewer queries (6 vs 8); one aggregate read, no per-client loop.

## I–L. Results — UAT (authenticated, dev, Bento), no console/network errors
| Surface | Before | After |
|---|---|---|
| Compliance (Firm Dashboard) | Overdue 2 | Overdue 2 |
| **Firm Overview** | **Overdue 0** | **Overdue 2** ✅ (Income Tax 2 overdue / 35 pending · Accounting 456 pending; alert "2 compliance item(s) overdue") |
| Bento Dashboard | "2 compliance items overdue" | "2 compliance items overdue" |
| Client 360 (Aarti & Co) | 0 obligations → 0 open/overdue | unchanged, consistent (per-client scope) |

All three firm surfaces now agree on **2 overdue**. (Client 360 is per-client scope — legitimately different granularity, not a mismatch.)

## M. Date/timezone
Unchanged. `v_firm_dashboard` computes due<today server-side; the shared `complianceDateMeta` (used by the Compliance page + Client 360) keeps due-today NOT overdue, closed NOT overdue, missing-date safe. No new timezone helper introduced.

## N. Error/empty state
`firmRes.error` is aggregated into `firstErr` → `throw` → retryable error banner. A failed read never renders a false "0 overdue".

## O–Q. Verification
- **Tests:** `node --test` → **735 passed / 0 failed** (728 governing + 7 new).
- **Build:** clean. **`git diff --check`:** clean.
- **Scans:** no `.env`/secrets, no SQL/migration/RLS/RPC/grants/service-role/Edge/storage/auth, no V1/production reference, no new deps, no debugger/alert/console.log/dangerouslySetInnerHTML introduced.

## R. Files changed (4)
`src/components/AdminHome.jsx`, `tests/e2eC1OverdueConsistency.test.js` (new), `tests/complianceBusinessConsistency.test.js` (CB-9 updated), `tests/endToEndClientWorkflowClosure.test.js` (E2E-1 import updated).

## T. Remaining limitation
`compliance_calendar` remains **unpopulated** on dev. This package makes Firm Overview independent of it (correct), so no functional gap remains for these surfaces. If a row-level firm-wide "upcoming deadlines" list is desired later, it would need either a populated `compliance_calendar` (DB backfill — not done) or a tracker-aggregating read model — a separate decision. **No DB follow-up is required to close E2E-C1.**

## Governance
PR #48 untouched · PR #71 untouched · no merge, no deploy, no DB action.
