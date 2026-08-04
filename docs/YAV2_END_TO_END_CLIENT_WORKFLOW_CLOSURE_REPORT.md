# YAV2 End-to-End Client Workflow & Data Consistency Closure — Report

**Status:** IMPLEMENTED — repository-only; not merged, not deployed. Draft PR against `sync/integration`.
**Package type:** cross-module data-consistency closure (single-sourcing count/label truth; not a redesign, not a new feature).

| Field | Value |
|---|---|
| Governing base | `sync/integration` @ `9a5810e2172c5bcbd5c55e96aece102ad2d1a686` |
| Feature branch | `feature/yav2-end-to-end-client-workflow-closure` |
| Isolated worktree | `D:/Claude/Claude Code/YAV2-End-To-End-Client-Workflow` |
| Authorised env | V2/yav2-dev `ogjrwemjefvccpyjwxuo` only (no V1/Prod; no SQL/migration/RLS/RPC/schema/policy/storage/Edge/auth-config) |
| Safety controls | ACTIVE |
| Tests | **521 → 528** (7 added; 0 fail) |
| Build | `vite build` exit 0 |
| Runtime | Non-auth boot check PASS (Login renders, HTTP 200, 0 console errors, V2/yav2-dev) |

## 1. Scope
An end-to-end audit of the client workflow (Onboarding → Client Master → Directors/Registrations → Services → Compliance → Tasks/Follow-ups → Documents → Client 360 → Dashboard/Firm Overview) for **cross-module data consistency**. The genuine remaining defects were places computing counts/labels **independently** of the shared truth helpers and thus **disagreeing** with the rest of the app. All fixes reuse existing shared helpers; no backend, no new DB path; visual design, roles, fail-closed and business rules preserved.

## 2. Defects closed (E2E-1..E2E-3)
- **E2E-1 (HIGH) — Firm Overview task counts.** `AdminHome` computed open/overdue task counts with a hardcoded `DONE_TASK='("Done","Cancelled")'` that **omitted `Filed / Completed`**, so a `Filed / Completed` task was counted **open/overdue** in Firm Overview but **closed** by Dashboard/Tasks/Client 360. Now the server-side filter is **derived from the shared `CLOSED_TASK_STATUSES`** via a new pure `pgStatusList` util — counts agree and the filter can't drift again.
- **E2E-2 (HIGH) — Team open-task counts.** `Team.taskCount` used an inline `status !== 'Done' && status !== 'Cancelled'` (same `Filed / Completed` omission). Now uses the shared `isTaskClosed`, so per-member "Open tasks" agrees with the rest of the app.
- **E2E-3 (MED) — Client 360 lifecycle label.** The Client 360 header defaulted a blank status to **'Active'**, while the Clients register uses `clientStatusLabel` (blank → **'Unknown'**). `buildClientHeader` now derives the label via `clientStatusLabel`, and the workspace renders it directly — the same client shows the same status in both places.

## 3. Discrepancies / data-quality findings (documented, NOT auto-changed)
- **E2E-D1 — AdminHome `DONE_COMPLIANCE` divergence** (`AdminHome.jsx:22`): includes `"Partner Approved"` (absent from the shared `CLOSED_COMPLIANCE_STATUSES`) and omits the defensive entries. Whether **"Partner Approved" is a genuine terminal compliance status** is a **business/data decision for PJ**; changing either side alters real compliance counts. **Recommended future governed package:** reconcile the compliance terminal-status vocabulary between `src/lib/compliance.js` and `AdminHome.jsx`, confirmed against the backend `compliance_status_enum`. No change made here. Affected (read-only observation): `compliance_calendar.status` / `compliance_status_enum` (backend), `AdminHome.jsx` (frontend).

## 4. Backend dependencies
**None** for the implemented items. The only backend-adjacent item (E2E-D1) is documented and deferred to PJ.

## 5. Results
- **Full suite: 528 pass / 0 fail** (521 baseline + 7). **Build: exit 0.** `git diff --check` clean.
- **Non-auth boot check PASS** (Login renders, HTTP 200, 0 console errors, V2/yav2-dev).
- **Scans:** scope = 9 approved files (5 source, 1 test, 3 docs); no prohibited/SQL/migration files; no secrets; no `alert()`/`console.log`/`debugger`/`TODO`/raw-error introduced; no V1/Prod ref; PR #48 untouched.

## 6. Manual verification (PJ)
Authenticated UAT — `docs/YAV2_END_TO_END_CLIENT_WORKFLOW_UAT_CHECKLIST.md`: confirm Firm Overview / Team / Client 360 counts and the Client 360 lifecycle label agree with Dashboard/Tasks/Clients (esp. for a client with a `Filed / Completed` task and a blank status). The 528 tests + clean build + boot check are the in-repo verification.

## 7. Rollback
Additive/guarded on a dedicated branch — per-file `git checkout sync/integration -- <file>` or discard branch. No backend state changed.
