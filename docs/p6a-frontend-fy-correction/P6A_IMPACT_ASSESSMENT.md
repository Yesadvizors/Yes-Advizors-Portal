# P6A — Wider P6 Impact Assessment (repository-only)

> Phase 5 deliverable. Repository-only analysis. Items that require live V2 read-only evidence are explicitly flagged. No Supabase access occurred.

## Affected screens and components

| Area | Affected? | Notes |
|---|---|---|
| Onboarding success screen (`OnboardingWizard.jsx`) | **Yes (direct)** | Success screen no longer shows the false "FY 2025-26 limitation"; green success now correct for the current year. |
| Re-sync Compliance button (`Clients.jsx` `ResyncButton`) | **Yes (direct)** | No longer alerts a false "needs a database update"; completes green for the current year. |
| FY utility (`src/lib/financialYear.js`) | **Yes (direct)** | `BACKEND_MAX_FY` removed; `fyCoverage()` ceiling dynamic. Owner of the fix. |
| Compliance Tracker modal (`Compliance.jsx` / `complianceTabs.js`) | **No** | Already data-driven from the live `financial_years` table + actual tracker rows; defaults FY to `currentFy()`. No stale ceiling. Reviewed, unchanged. |
| Work Documents (`WorkDocuments.jsx`) | **No** | Uses `currentFy()` / `fyOptions()`; no coverage/ceiling logic. Unchanged. |
| Compliance runner (`complianceRunner.js`) | **No** | Executes RPC stages and records `{ok,error}`; no FY/coverage/ceiling references. Unchanged. |
| Service Applicability surfaces | **No** | Independent of FY coverage. Unchanged. |

## Affected roles

- The corrected surfaces (onboarding, Re-sync) are used by the roles permitted to create/manage clients and trigger compliance setup (Admin/Manager per existing gating). **No role gating is changed.** The fix only alters *what message those roles see*; it does not grant or remove any capability. Role-based access, capability gates, and the Client Master preview flag are untouched.

## Affected compliance modules

- **Compliance generation (GST/IT/TDS/ROC) and accounting activation:** the frontend now stops falsely reporting the current FY as ungeneratable. The **actual generation is backend-owned and unchanged**; the frontend only reports outcomes.
- **Compliance calendar:** unchanged; still populated via existing stages/idempotency guard.

## Task-generation impact

- No task-generation code path is modified. The correction is limited to *coverage reporting/messaging*. Generation requests still flow through the existing CP-2 wrappers/RPCs; the DB remains the sole write authority and now (post-`0014`) fails loud on an empty FY range.

## Service-applicability impact

- **None.** Service applicability is orthogonal to FY coverage and its code is untouched. (The broader P6 register item on service-applicability enforcement is out of scope here.)

## Financial-year data flow (after correction)

```
financial_years (V2, FY 2022-23…2030-31, active)
      │  (SELECT, live)                         ┌─ Compliance.jsx / complianceTabs.js  (unchanged, data-driven)
      ▼                                         │
get_current_fy() = 2026-27  ──(backend ceiling)─┤─ generate_client_compliance_core() / activate_accounting_service()
      ▲                                         │        (generate THROUGH get_current_fy(); RAISE on empty range)
      │ (same India/IST FY rule, pure)          │
currentFy() (src/lib/financialYear.js) ─────────┴─ fyCoverage(default ceiling = currentFy())  → ok for current FY
      │
      ├─ fyOptions()  → dropdown capped at current FY (unchanged)
      └─ Clients.jsx / OnboardingWizard.jsx  → coverage.reason messaging (no stale ceiling)
```
The frontend `currentFy()` and backend `get_current_fy()` implement the **same** Indian-FY rule, so the coverage default is aligned with backend capability by construction.

## Audit-log implications

- **None.** No audit event contract, write path, or lineage column is touched. No new events emitted; the change is display/logic-only on the client. Protected audit/tracker counts are unaffected (no writes performed by this package).

## RLS or grant assumptions

- **No RLS policy or grant is read, assumed, or changed.** The correction does not depend on any RLS/grant behaviour; it consumes existing RPC outcomes and pure FY math. (The broader P6 register items on FORCE RLS / grant least-privilege / `search_path` hardening are **out of scope** and remain UNAUTHORISED.)

## Rollback approach

- Local-only discard (nothing committed). Single-file-set revert or branch delete + recreate from `c0009fc9…`. No data-state rollback (no migration/backfill). See review package §12.

## Deployment risks

- **This package does not deploy.** If later deployed: frontend-only, low blast radius (two message surfaces). Risk is limited to user-visible copy/logic; no schema, data, or backend behaviour changes. Standard Preview verification before any Production promotion (separately governed) is recommended.

## Required future SELECT-only V2 checks

See review package §11: confirm live `get_current_fy()=2026-27`; confirm deployed generation functions are the `0014` definitions (migration ledger was not independently visible); live Preview UI runtime check of the corrected screens; optional future wiring of a live `get_current_fy()` value as the explicit coverage ceiling.

## What CANNOT be verified without Supabase V2 read-only evidence

- Whether the **currently deployed** DB functions match the `0014` source in-repo (behaviour-inferred only; ledger not visible).
- The **live** value of `get_current_fy()` at any given verification moment.
- Live **runtime** rendering of the corrected screens against V2 data.
- Any RLS/grant/`search_path` live posture (not needed for this fix, and out of scope).
