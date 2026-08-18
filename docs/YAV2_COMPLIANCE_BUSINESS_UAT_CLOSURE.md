# YAV2 Compliance Business UAT & Cross-Module Consistency — closure

**Governing base:** `d6e9e1dd1845e397379e60305b37ac5f56e92118` (origin/sync/integration; contains PR #70 + PR #72).
**Branch:** `feature/yav2-compliance-business-uat-closure` · **head:** `c1fef9e83f94e8592cd282ac0fb6cf15794edc9a`.
**No DB/backend/deployment changes.** No SQL/migration/RLS/RPC/grants/enum/storage/auth/Edge/service-role. Dev only (`ogjrwemjefvccpyjwxuo`).

## A. Compliance architecture findings
`src/lib/compliance.js` is an excellent single source of compliance truth and is already reused by the Compliance page, Client 360 and (via the DB view `v_firm_dashboard`) the Dashboard:
- `CLOSED_COMPLIANCE_STATUSES` = Filed, Completed, Closed, Not Applicable (+ defensive task statuses).
- `isComplianceClosed` / `isComplianceCompleted` / `complianceDateMeta` / `isComplianceOverdue` — pure, module-aware, case/whitespace-insensitive; **due-today is NOT overdue**, missing/invalid dates never fabricate overdue, strict date validation.
- Documented (grounded in `compliance_status_enum` + `v_client_compliance_summary`): the terminal set is Filed/Completed/Closed/Not Applicable; **Reviewed, Partner Approved, Filing Pending, Payment Pending are mid-workflow (non-terminal)**.

**The one drift:** `AdminHome` (Firm Overview) hardcoded `DONE_COMPLIANCE = ("Filed","Completed","Partner Approved","Not Applicable","Closed")` — an independent list that (a) treated `Partner Approved` as terminal, diverging from every other surface, and (b) drifted from the shared truth.

## I. Partner Approved (E2E-D1) — RESOLVED: NON-TERMINAL
Repository evidence is definitive: `compliance_status_enum` orders Partner Approved **before** Filed; the authoritative `v_client_compliance_summary` / `v_firm_dashboard` views treat completed as (Filed, Completed) and overdue as NOT IN (Filed, Completed, Closed, Not Applicable). Filing/statutory completion follows Partner Approval ⇒ **non-terminal**. Fix: AdminHome now derives its compliance terminal filter from the shared truth (`DONE_COMPLIANCE = pgStatusList(CLOSED_COMPLIANCE_ENUM_STATUSES)`), dropping Partner Approved. Firm Overview now classifies a Partner Approved row as open/overdue-eligible exactly as Dashboard / Client 360 / Compliance. **No backend/status-vocabulary change.** Latent on current dev data (0 Partner Approved rows).

### Runtime-UAT-caught regression (fixed in-session)
The first cut used `pgStatusList(CLOSED_COMPLIANCE_STATUSES)`, which included the defensive **non-enum** statuses `Filed / Completed`/`Cancelled`/`Done`. Because `status` is `compliance_status_enum`, a server-side `not.in(...)` filter with those raised *"invalid input value for enum"* → Firm Overview errored. Fixed by adding the shared **enum-safe** subset `CLOSED_COMPLIANCE_ENUM_STATUSES = [Filed, Completed, Closed, Not Applicable]` (and deriving `CLOSED_COMPLIANCE_STATUSES` from it — contents unchanged). Verified in-browser afterwards.

## B–H. Business UAT (authenticated, dev, Bento skin) — no console/network errors
| Surface | Result |
|---|---|
| Dashboard | ✅ Bento IA preserved (grouped nav, Attention-first, 4 KPIs); loads |
| Compliance → Firm Dashboard | ✅ Total 493, Pending 491, Overdue 2, Completed 0 (shared-truth computed) |
| Compliance → Activity-wise | ✅ FY selector (2026-27…2020-21), status filters (Not Started/In Progress/Filed/Overdue…), truthful empty state ("No … records"), no errors |
| Compliance → Client-wise | ✅ tab present/renders |
| Firm Overview (Reports/AdminHome) | ✅ renders after enum-safe fix; Active 17, Compliance due this month 0, Overdue compliance 0, Open tasks 4; error state distinct from empty (Retry) |
| Client 360 → Compliance (Aarti & Co) | ✅ Open/Overdue compliance 0; truthful "No compliance obligations recorded"; consistent with 0 obligations; no false zero |
| Clients register | ✅ 19 clients; status vocab Draft/Active/Inactive/Archived/**Unknown**; all Active shown consistently (E2E-3 preserved) |

## F/D. Compliance business rules (verified)
Closed statuses classify closed; open stays open; **due today ≠ overdue**; past-due open = overdue; **past-due closed ≠ overdue**; missing due date never overdue; unknown status fails safe (stays visible/open, never silently completed). Covered by `complianceDateMeta` + new tests.

## J. Error/empty states
`AdminHome.load()` aggregates all sub-query errors → `throw` → `setError` + Retry (no false-empty). `Compliance.jsx` loaders use distinct `loadErr` → `<Err onRetry>` states, separate from truthful empty. No raw null/undefined/backend error rendered.

## K. Role/access
Admin session verified (`portal_role=Admin`). Firm Overview is admin-only (route + internal guard). No blank-status/Partner-Approved fixtures and no non-admin authorised session available in dev → those cases covered by tests/source guards (no user/role mutation performed).

## Observed pre-existing inconsistency (NOT introduced here; deferred)
**E2E-C1 — compliance overdue count data source:** Firm Overview's "Overdue compliance" reads the stored `compliance_calendar.is_overdue` boolean (showed **0**), while the Compliance page computes overdue **live from the tracker tables** (showed **2**). Same concept, different data source — a pre-existing architectural difference, not a status-truth drift (both now use the identical terminal set). Resolving it requires either a `compliance_calendar` backfill (DB) or re-sourcing AdminHome to the trackers (larger frontend change) — **out of this package's safe scope; PJ decision.**

## L/M/N. Verification
- **Tests:** `node --test` → **719 passed / 0 failed** (705 governing + 14 new).
- **Build:** clean. **`git diff --check`:** clean.
- **Scans:** no `.env`/secrets, no SQL/migration/RLS/RPC/grants/service-role/Edge/storage/auth, no V1/production reference, no new deps, no debugger/alert/console.log/dangerouslySetInnerHTML introduced.

## O. Files changed (3): +~130 / −8
`src/components/AdminHome.jsx`, `src/lib/compliance.js`, `tests/complianceBusinessConsistency.test.js`.

## Q. Completion register
Not edited here (governed docs flow). Evidence for the register update is in this doc + the PR body: PR #70 = CLOSED/PASS (`5a78e7a`), PR #72 = CLOSED/PASS (`d6e9e1d`), Compliance Business UAT = MERGE-READY. **PR #48 and PR #71 untouched.**
