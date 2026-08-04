# End-to-End Client Workflow & Data Consistency — Implementation Plan

> REQUIRED SUB-SKILL: executing-plans. Checkbox steps.

**Goal:** Single-source the divergent count/label computations (E2E-1 AdminHome task filter, E2E-2 Team taskCount, E2E-3 Client 360 lifecycle label) onto the existing shared truth helpers.

## Global Constraints
Repository-only; no backend/SQL/RLS/RPC/schema/policy/storage/Edge/auth-config; no new DB write path; V2/yav2-dev only; V1/Prod prohibited; no deploy; Draft PR; PR #48 untouched; preserve visual design + role/RLS + fail-closed + business rules + flags; guard active (avoid trigger tokens / V1 ref in commit msgs & PR bodies; use `--body-file`). Base `9a5810e`; baseline 521 tests, build exit 0.

## Tasks
### Task 1 — shared `pgStatusList` util + pure tests
- [ ] Add `pgStatusList(values)` to `src/helpers.js` → returns a Postgres IN-list `("a","b")` with each value double-quoted (handles spaces/slashes). Pure tests. Commit.

### Task 2 — E2E-1 AdminHome task filter derived from shared truth
- [ ] `AdminHome.jsx`: `import { CLOSED_TASK_STATUSES, pgStatusList } from '../helpers'`; replace `const DONE_TASK = '("Done","Cancelled")'` with `const DONE_TASK = pgStatusList(CLOSED_TASK_STATUSES)`; fix the header comment. Static guard. Test + build. Commit.

### Task 3 — E2E-2 Team taskCount uses isTaskClosed
- [ ] `Team.jsx`: `import { isTaskClosed } from '../helpers'`; in `taskCount`, replace `t.status !== 'Done' && t.status !== 'Cancelled'` with `!isTaskClosed(t.status)`. Static guard. Test + build. Commit.

### Task 4 — E2E-3 Client 360 lifecycle label via clientStatusLabel
- [ ] `src/lib/client360.js`: `import { clientStatusLabel } from '../helpers.js'`; in `buildClientHeader`, change `status: clean(c.status) || (client ? 'Active' : null)` → `status: client ? clientStatusLabel(c.status) : null`.
- [ ] `Client360Workspace.jsx:113`: `{header.status || 'Active'}` → `{header.status || '—'}`. Static guard. Test + build. Commit.

### Task 5 — verify, docs, Draft PR
- [ ] Full suite + build + `git diff --check` + scans (secret/prohibited/scope/raw-error/alert/debug/TODO/V1/PR#48).
- [ ] Non-auth boot check against V2/yav2-dev.
- [ ] Test evidence + UAT checklist + closure report + register entry (Status Draft).
- [ ] Commit; push; Draft PR (`--body-file`). Do NOT mark Ready / merge.
- [ ] Consolidated report.

## Self-Review
Every E2E maps to a task + test. Shared-truth reuse (no new divergent set). Compliance "Partner Approved" documented, not changed. No placeholders.
