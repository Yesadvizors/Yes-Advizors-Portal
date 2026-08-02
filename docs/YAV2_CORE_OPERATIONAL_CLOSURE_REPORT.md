# YAV2 Core Operational Workflow Closure — Repository-Only Completion Sprint

**Status:** IMPLEMENTED — repository-only; not merged, not deployed. Draft PR against `sync/integration`.
**Package type:** functional completion (NOT presentation/redesign — the redesign package is paused, PR #48, untouched).

| Field | Value |
|---|---|
| Governing base branch | `sync/integration` |
| Governing base SHA | `c4babefdcd50ce2d23005e597f27ba0d41b9674a` (local == origin == expected) |
| Feature branch | `feature/yav2-core-operational-closure` |
| Worktree | `D:/Claude/Claude Code/YAV2-Core-Operational-Closure` |
| Authorised env | V2 dev only · Supabase ref `ogjrwemjefvccpyjwxuo` (no V1/Prod; no SQL/migration/RLS/mutation executed) |
| Tests | **383 → 397** (14 added; 0 fail) |
| Build | `vite build` exit 0 |
| Runtime | Boots to Login (not blank); HTTP 200; **0 console errors** |

## 1. Scope
Complete/verify/harden the end-to-end operational workflow at the **repository (frontend) level**: Client → onboarding → tasks/follow-up → compliance → documents → team/role access → audit/error handling. Backend (queries, RPCs, RLS, migrations, permissions, storage) is out of scope and heavily governed (all CLOSED per the Master Completion Register); backend-dependent items are recorded, not executed.

## 2. Preflight evidence
`origin` fetched + pruned; local `sync/integration` = `origin/sync/integration` = expected `c4babef…9674a`; working tree clean; paused redesign branch (`fc0dd32`, PR #48) not touched. New worktree + branch created from the verified SHA; `npm ci` clean; **baseline 383 tests pass, build exit 0**.

## 3. Functional inventory (Phase 2)
Five parallel read-only inventories (client/onboarding, tasks/follow-up, compliance, documents, shell/access/audit) produced a consolidated defect map. Verified **sound** (no change needed): OnboardingWizard write path (guarded double-submit, real false-success handling, validation, orphan cleanup), `complianceRunner.js`/`compliance.js` (fail-closed), the whole `serviceApplicability/*` suite (busy guards, `mapRpcError`, focus trap), AuditLog error handling, and shell role-gating (`user?.is_admin === true` in nav AND render; never defaults an unknown role to admin; no admin flash).

## 4. Changes made (defects corrected)
All changes are repository-level, preserve backend contracts/route names/calculations, and add no DB fields.

### 4A Client Master
- **Broken recovery path closed:** `ResyncButton` was defined but **never rendered** while OnboardingWizard's partial-failure screen tells users to "use Re-sync Compliance on the Clients page." Now rendered in the client detail modal. *(HIGH)*
- Null-safe client search (`c.name` could crash the whole register). Business-safe PIN-reset error (was raw `error.message`).

### 4B Client onboarding
- Verified robust; the only gap (the missing Re-sync control) is closed in 4A. No change to the onboarding data model.

### 4C Task management — **count correctness (HIGH)**
- `helpers.js`: added `CLOSED_TASK_STATUSES` / `COMPLETED_TASK_STATUSES` (incl. **"Filed / Completed"**, which the follow-up modal can set). Previously a "Filed / Completed" task was counted **Pending/Overdue and never Completed**. `getDueMeta` now uses the closed set and guards invalid dates.
- `todayLocal()` replaces `new Date().toISOString().split('T')[0]` in Dashboard + Tasks — UTC gave "yesterday" 00:00–05:30 IST, so overdue/due-today cards disagreed with the local ageing badges.
- `AddTaskModal`: re-entrancy guard, **insert-error check (no false success)**, stronger `task_id` (random suffix), dropdown `key={c.client_id}` (was undefined `c.id`), null-safe client filter.

### 4D Follow-up management
- `FollowUpModal`: checks **both** the follow-up insert AND the task update (no false success / partial write); error UI; past-date rejection + `min`; load-error state; delete-error check.
- `HistoryModal`: surfaces a load error instead of a false "No follow-up added yet."

### 4E Compliance tracker
- `MarkFiledModal`: re-entrancy guard; **missing-client guard** (was `client.name`/`client.client_id` crash); `saveDoc` now returns its error so a failed document insert does **not** show clean success; business-safe error messages.
- `Compliance.jsx`: GST card `period.split(' ')` null-guarded (was a whole-card crash on a null period).

### 4F Document management
- `WorkDocuments`: **removes the orphaned storage object** when the `completed_documents` insert fails; business-safe upload errors.
- `DocumentsHub`: download signed-URL error is now surfaced (was a silent dead click); business-safe upload error.
- `DocumentManager`: `uploaded_by: user?.name || 'System'` (crash guard); duplicate React key fixed for same-named director sections.

### 4G Team & role-aware access
- Role-gating verified correct (documented). `Team.taskCount` null-name guard (a null `team.name` blanked the grid).

### 4H Audit & error handling
- `App.jsx`: session bootstrap wrapped in **try/finally + `.catch`** — a transient failure no longer leaves the app stuck on "Loading…" or raises an unhandled rejection.
- `main.jsx`: the whole app is now wrapped in **`ErrorBoundary`** (a render error in the shell no longer blanks the page).
- `ErrorBoundary` + `Usage`: user-facing/detail error text routed through `safeErrorMessage` (no raw `error.message`).

## 5. Tests added (Phase 6)
`tests/coreOperationalClosure.test.js` — **14 tests**: pure-logic (closed/completed sets; "Filed/Completed" never overdue; invalid-date safety; `fmtDate` "—"; `todayLocal` local format; `isMyTask` empty-assignee) + static source guards (write-path double-submit/error checks, count-set wiring, App try/finally + root ErrorBoundary, ResyncButton rendered, WorkDocuments orphan cleanup). One brittle pre-existing static assertion in `rapidLaunchFrontendFixes.test.js` was updated to match the improved (still-correct) Save-disabled guard. **No V1/Prod, no live-DB mutation; static/logic only.**

## 6. Test / build / runtime results (Phase 7)
- **Full suite: 397 pass / 0 fail.** **Build: exit 0.**
- Boot verified in a browser: renders the Login screen (page text "Welcome back / Sign in →" — not blank), HTTP 200, **no console errors**, no failed module imports.
- `supabase.js` still throws an understandable dev error when env vars are absent (verified behaviour).

## 7. Backend dependencies (identified, NOT executed)
1. **Client-ID allocation race** (OnboardingWizard `maxNum+1`, already documented in code): durable fix = a DB sequence or allocation RPC. Repo mitigation not safe.
2. **`task_id` / `followup_id` uniqueness**: repo mitigation applied (timestamp + random suffix); durable fix = a DB unique constraint + insert-error surfacing.
3. **Role enforcement** for compliance Mark-Filed and Clients edit/reset-PIN: the UI hides/guards are defence-in-depth only; the authority is RLS/policy on those tables (governed P7/P8/P9).
These align with the register's phased governance; none was executed here.

## 8. Manual verification still required
1. **Interactive authenticated smoke** (Admin + non-Admin) requires a test-account password, which is not available and requires a governed reset (out of scope). Repository logic is covered by tests/mocks and the non-auth boot check; interactive login is recorded as a separate manual dependency.

## 9. Observed but deferred (repository-level, lower priority — for a follow-up sprint)
- **Compliance overdue consistency** across tabs (IT/TDS/ROC use `new Date(x) < new Date()`; GST/Activity use string compare; overdue filter vs stat/badge use different due columns and closed-status sets). Crash-safety and the shared task-status sets are done; a shared `isOverdue()` unification across Compliance's ~12 cells is deferred (higher-risk refactor in a 1646-line file).
- **Compliance per-loader error states** (~12 tab loaders discard `error` → false-empty / false-hidden tabs). Deferred.
- WorkDocuments: `viewDoc` error surfacing, JS file-type validation, unused `loading` render, `maybeSingle()`→`limit(1)` for 2+ versions.
- Login post-signin team-lookup error → generic message; `loadUser` transient-vs-permanent distinction; ChatAgent `setTimeout` cleanup; AdminHome console error scrubbing.
- **Usage tab visibility** (firm-wide API spend visible to all roles) — a product/access decision for PJ (intended visibility ambiguous), not auto-changed.

## 10. Completion register updates
See `docs/YAV2_Master_Completion_Register.md` new section **"Core Operational Workflow Closure (branch `feature/yav2-core-operational-closure`)"**. Percentages in §11 below.

## 11. Revised completion (three views — honest, not invented)
This register tracks per-package status; the single weighted overall figure lives in the separate governing model (BASELINE.md), last recorded ≈ **43.7%**. This package is a frontend reliability-hardening increment across the whole core operational flow.
1. **Work-item completion (this package):** of ~47 identified repository-level (non-backend) defects, **27 closed (~57%)**; ~17 deferred (mostly medium/low error-visibility, consistency, and defence-in-depth); 3 recorded as backend dependencies. **By severity: HIGH/critical defects closed ≈ 100%** (count correctness, false-success on both task write paths, loading-lock, blank-screen resilience, broken recovery path), medium ≈ 60%, low ≈ 40%.
2. **Weighted functional completion:** **ESTIMATE ≈ 43.7% → ~45.0%** (**≈ +1.3 pp**), using the governing model's increment methodology (cf. G-11 +0.30, V-4 +0.50 for single-panel fixes; this hardens the entire core operational workflow + adds regression tests). **Not authoritatively re-derived here** — the governing model owns the weighted figure.
3. **Time-estimate completion:** this sprint delivered ~27 corrections + 14 tests. Remaining deferred repository hardening (Compliance overdue unification + per-loader error states + the WorkDocuments/Login/ChatAgent items) is of comparable effort; backend-dependent items are separate phases. Estimated **≈ 55–60%** of the identified core-operational-flow repository hardening effort completed this sprint.

**Separation:** fully complete = §4 items (tests + build green); complete pending manual = interactive authenticated smoke (§8); backend-blocked = §7; deferred repository = §9. The paused presentation/redesign work is **not** counted as functionally complete.

## 12. Rollback instructions
All changes are additive/guarded on a dedicated branch. To roll back: `git -C <worktree> checkout sync/integration -- <file>` for any single file, or discard the branch entirely (`git branch -D feature/yav2-core-operational-closure` after removing the worktree). No DB/migration/RLS/storage change was made, so there is nothing to roll back server-side. `.env.local` is local/git-ignored and not part of the branch.

## 13. Next recommended large package
**Compliance Reliability & Consistency Closure** — unify overdue logic across all Compliance tabs behind a shared `isOverdue()` + single closed-status set, add error states to every Compliance/tracker loader (kill false-empty/false-hidden), and finish the WorkDocuments error-visibility items — repository-only, with regression tests. Backend items (§7) should be bundled into the governed P7/P8/P9 backend gates.
