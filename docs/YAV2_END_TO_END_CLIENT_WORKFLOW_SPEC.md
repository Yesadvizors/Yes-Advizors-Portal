# YAV2 End-to-End Client Workflow & Data Consistency Closure — Specification

**Date:** 2026-08-04 · **Base:** `sync/integration` @ `9a5810e2172c5bcbd5c55e96aece102ad2d1a686` · **Branch:** `feature/yav2-end-to-end-client-workflow-closure` · **Worktree:** `D:/Claude/Claude Code/YAV2-End-To-End-Client-Workflow`
**Env:** V2/yav2-dev only. **Posture:** repository-only (frontend); no backend/SQL/migration/RLS/RPC/schema/policy/storage/Edge/auth-config; no new DB write path; no deploy; Draft PR; PR #48 untouched; visual design + role/RLS + fail-closed + business rules + feature flags preserved.

## Approved scope (E2E-1..E2E-3)
- **E2E-1** Firm Overview task counts: derive AdminHome's `DONE_TASK` server-side filter from the shared `CLOSED_TASK_STATUSES` (new pure `pgStatusList` util in `helpers.js`) so open/overdue task counts include `Filed / Completed` as closed — matching Dashboard/Tasks/Client 360.
- **E2E-2** Team open-task counts: `Team.taskCount` uses the shared `isTaskClosed` instead of an inline `Done/Cancelled` check.
- **E2E-3** Client 360 lifecycle label: `buildClientHeader` derives `status` via `clientStatusLabel` (blank → 'Unknown'), and the workspace renders it directly — matching the Clients register (no silent null→'Active').

## Workflow truth sources (authoritative shared helpers — reused, not duplicated)
- **Task open/closed/completed:** `isTaskClosed` / `isTaskCompleted` / `CLOSED_TASK_STATUSES` (`src/helpers.js`).
- **Compliance ageing/closed/completed:** `complianceDateMeta` / `isComplianceClosed` / `isComplianceCompleted` (`src/lib/compliance.js`).
- **Client 360 summaries:** `src/lib/client360.js` (already reuses the above).
- **Client lifecycle label:** `clientStatusLabel` (`src/helpers.js`).
- **Local date:** `todayLocal`.

## Identity / linking / lifecycle / count rules (preserved; this package only removes divergences)
- Client identity keys unchanged (uuid for compliance/notices; text YA-code for tasks/follow-ups/documents/financials).
- A task/compliance row's closed/open classification is **single-sourced** through the shared helpers everywhere.
- Lifecycle label is **single-sourced** through `clientStatusLabel` everywhere a status is shown.

## Excluded scope
No redesign; no new feature; no backend/DB; no new write path; PR #48 untouched. **Deferred (documented, NOT implemented):** E2E-D1 — AdminHome `DONE_COMPLIANCE` "Partner Approved" divergence (business/data decision for PJ; reconcile compliance terminal-status vocabulary in a future governed package).

## Acceptance criteria
- `pgStatusList(CLOSED_TASK_STATUSES)` yields a Postgres IN-list that includes `"Filed / Completed"`; AdminHome's `DONE_TASK` is derived from it (no hardcoded `("Done","Cancelled")`).
- `Team.taskCount` excludes any `isTaskClosed` status (incl. `Filed / Completed`).
- Client 360 header shows the same lifecycle label as the Clients register (`clientStatusLabel`), with blank → 'Unknown' (never silent 'Active').
- All existing tests pass; new focused tests pass (≥20 assertions); build exit 0; non-auth boot OK.

## Testing
`tests/endToEndClientWorkflowClosure.test.js` — pure (`pgStatusList`, `isTaskClosed`/`clientStatusLabel` consistency anchors) + static source guards (AdminHome/Team/Client360 reuse the shared truth; no divergent inline sets). OD-5 (no jsdom).

## Rollback
Additive/guarded on a dedicated branch — per-file `git checkout sync/integration -- <file>` or discard branch. No backend state changed.

## PJ UAT
Authenticated UAT: confirm Firm Overview / Team / Client 360 task counts and the Client 360 lifecycle label agree with Dashboard/Tasks/Clients for a client with a `Filed / Completed` task and a blank status.

## Deferred dependencies
E2E-D1 (compliance "Partner Approved") — PJ review. No other backend dependency.
