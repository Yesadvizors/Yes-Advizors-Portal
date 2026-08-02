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
| Tests | **383 → 399** (16 added; 0 fail) |
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
- `AddTaskModal`: re-entrancy guard, **insert-error check (no false success)**, dropdown `key={c.client_id}` (was undefined `c.id`), null-safe client filter. **`task_id` external format preserved** (`YA-TSK-`+6 digits) — collision safety is the re-entrancy guard + insert-error surfacing, not a format change (see §7.2 / correction pass §14).

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
`tests/coreOperationalClosure.test.js` — **16 tests**: pure-logic (closed/completed sets; "Filed/Completed" never overdue; invalid-date safety; `fmtDate` "—"; `todayLocal` local format; `isMyTask` empty-assignee) + static source guards (write-path double-submit/error checks, count-set wiring, App try/finally + root ErrorBoundary, ResyncButton rendered, WorkDocuments orphan cleanup) + retry-idempotency for the Follow-up and Mark-Filed partial-write paths (CO-15/CO-16). One brittle pre-existing static assertion in `rapidLaunchFrontendFixes.test.js` was updated to match the improved (still-correct) Save-disabled guard. **No V1/Prod, no live-DB mutation; static/logic only.**

## 6. Test / build / runtime results (Phase 7)
- **Full suite: 399 pass / 0 fail.** **Build: exit 0.**
- Boot verified in a browser: renders the Login screen (page text "Welcome back / Sign in →" — not blank), HTTP 200, **no console errors**, no failed module imports.
- `supabase.js` still throws an understandable dev error when env vars are absent (verified behaviour).

## 7. Backend dependencies (identified, NOT executed)
1. **Client-ID allocation race** (OnboardingWizard `maxNum+1`, already documented in code): durable fix = a DB sequence or allocation RPC. Repo mitigation not safe.
2. **`task_id` / `followup_id` uniqueness**: repository mitigation = re-entrancy guard + insert-error surfacing (a collision now shows a visible error to retry, not a silent success). The original external id formats are preserved (the earlier longer-id format change was **reverted** after review, because the formats' DB/RPC/automation consumers are unverified from the repo). Durable fix = a DB unique constraint on `task_id`/`followup_id`.
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
2. **Weighted functional completion:** **PROVISIONAL ESTIMATE ONLY — approximately 45.0%**, pending authoritative recalculation in the governing weighted model. This package is a small positive increment on the last recorded ≈43.7%; the exact delta is **not** presented as final or approved and is **not** re-derived here.
3. **Time-estimate completion:** this sprint delivered ~27 corrections + 16 tests. Remaining deferred repository hardening (Compliance overdue unification + per-loader error states + the WorkDocuments/Login/ChatAgent items) is of comparable effort; backend-dependent items are separate phases. Estimated **≈ 55–60%** of the identified core-operational-flow repository hardening effort completed this sprint.

**Separation:** fully complete = §4 items (tests + build green); complete pending manual = interactive authenticated smoke (§8); backend-blocked = §7; deferred repository = §9. The paused presentation/redesign work is **not** counted as functionally complete.

## 12. Rollback instructions
All changes are additive/guarded on a dedicated branch. To roll back: `git -C <worktree> checkout sync/integration -- <file>` for any single file, or discard the branch entirely (`git branch -D feature/yav2-core-operational-closure` after removing the worktree). No DB/migration/RLS/storage change was made, so there is nothing to roll back server-side. `.env.local` is local/git-ignored and not part of the branch.

## 13. Next recommended large package
**Compliance Reliability & Consistency Closure** — unify overdue logic across all Compliance tabs behind a shared `isOverdue()` + single closed-status set, add error states to every Compliance/tracker loader (kill false-empty/false-hidden), and finish the WorkDocuments error-visibility items — repository-only, with regression tests. Backend items (§7) should be bundled into the governed P7/P8/P9 backend gates.

## 14. Correction pass (independent review — PASS WITH SPECIFIC CORRECTIONS)

### 14.1 ID format & collision (item 1) — findings + resolution
Repository consumers of `task_id` (`YA-TSK-…`) and `followup_id` (`FU-…`): **written** only in `AddTaskModal` and `FollowUpModal`; **read** only as opaque equality keys (`.eq('task_id', …)` / `.eq('followup_id'|'id', …)`). **No regex, `.match`, `.length`, `substr`, prefix, format or slice assumption exists in any src/test/doc.** External consumers that could not be verified from the repo: **DB column type / CHECK constraint, RPCs, and WhatsApp/automation flows** (Supabase access is prohibited in this package). Because compatibility of a longer format could **not** be proven, the previous `+ Math.random()` suffix was **reverted** — the original external formats (`YA-TSK-`+6 digits; `FU-`+8 digits) are preserved. Collision safety is now the **re-entrancy guard + insert-error surfacing** (a collision produces a visible error to retry, never a silent false success). Tests CO-7 / CO-15 assert the preserved format and absence of `Math.random`.

### 14.2 Follow-up partial-write (item 2) — exact behavior
`save()` inserts the follow-up first; **only after that succeeds** does it update the parent task.
- Insert fails → nothing written; error shown; no `onSaved`.
- Insert succeeds, task update fails → **follow-up IS committed and discoverable** (the list is refreshed via `loadLogs()` and shows it); the task summary (`latest_update`/`next_followup_date`/`status`) is NOT updated. An **accurate partial message** is shown ("Your follow-up was saved (it appears in the list above), but the task summary could not be updated…"); **no clean success**.
- **Retry safety:** the committed follow-up id + frozen update payload are held in `savedLog`; a retry **skips the insert** and re-runs only the task update, so it **cannot create a duplicate log**. No backend transaction/RPC added. Test CO-15.

### 14.3 Mark-Filed partial-state (item 3) — exact behavior
`handleSave()` uploads files → updates the tracker to Filed → inserts the two document records.
- Tracker update fails → uploaded files are removed; nothing committed; error; no `onSaved`.
- Tracker Filed, a document-record insert fails → tracker **stays Filed**, files remain in storage, saved records persist; **no clean success** — an accurate message is shown ("Marked as Filed. A document record could not be saved — click 'Mark as Filed' again to retry…").
- **Retry safety:** once filed, the paths are held in `filed` and per-document success in `docSaved`; a retry **does not re-upload, does not re-update the tracker, and only re-attempts the unsaved document record** — so storage objects, the tracker update, and document rows are **not duplicated**. **Recovery path:** click Mark as Filed to retry the record, or attach the file later from the client's Documents. No storage/table/RPC/RLS change. Test CO-16.

### 14.4 Exact PR file count (item 4)
- Source files changed: **17**
- Existing tests amended: **1** (`tests/rapidLaunchFrontendFixes.test.js`)
- New tests added: **1** (`tests/coreOperationalClosure.test.js`, **16** tests)
- Documentation files changed: **3**
- **Total PR files: 22**

Tests: **383 → 399 pass / 0 fail** (this correction pass added the 2 retry-idempotency tests). Build exit 0.
