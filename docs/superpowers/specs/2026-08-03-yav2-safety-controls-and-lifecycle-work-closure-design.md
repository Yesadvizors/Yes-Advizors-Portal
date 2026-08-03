# YAV2 — Autonomous Safety Controls + Client Lifecycle & Work Management Closure — Design Spec

**Date:** 2026-08-03 · **Owner:** PJ · **Executor:** Claude Code
**Governing base:** `sync/integration` @ `a59d0e26548b8eaa7fea5ff8143ea98b868b3563` (== `origin/sync/integration` at authoring time)
**Working branch:** `feature/yav2-lifecycle-work-management-closure`
**Authorised environment:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` only. V1/Production `zcszesuvjrryxtigjglt` **prohibited**.
**Posture:** repository-only (frontend); no backend (no SQL/migration/RLS/RPC/permission/storage/mutation); no deploy; Draft PR(s) against `sync/integration`; PR #48 (paused redesign) untouched.

This deliverable has two parts, sequenced: **(1)** install machine-enforced autonomous safety controls, then **(2)** execute a repository-only Client Lifecycle & Work Management hardening closure *under* those controls.

---

## Part 1 — Autonomous Safety Controls (enforced hooks + brief doc)

### 1.1 Goal
Make this project's standing governance **machine-enforced** rather than adherence-dependent, so that autonomous execution (this package and future sessions) cannot violate it. The controls are *deny* rules only — they grant nothing and do not widen permissions.

### 1.2 Mechanism
A `PreToolUse` hook registered in **`.claude/settings.json`** (committed to the branch — NOT the git-ignored `settings.local.json`) invoking a cross-platform guard script **`.claude/hooks/guard.mjs`** (Node ESM; the repo already depends on Node). The script:

1. Reads the tool-call JSON from stdin (`{ tool_name, tool_input, ... }`).
2. Evaluates the call against the deny table (§1.3).
3. On a match: prints a one-line reason (naming the governing rule) to stderr and exits **non-zero** so Claude Code blocks the call. On no match: exits 0 (allow).

The hook `matcher` targets `Bash`, `PowerShell`, and the specific mutating MCP tool names. Read-only tools, tests, builds, and normal git are unaffected.

### 1.3 Deny table

| Guard | Trigger | Rationale |
|---|---|---|
| **G1 · V1/Prod ref** | Any `Bash`/`PowerShell` `command` containing the literal `zcszesuvjrryxtigjglt` | Global Rule 2 / B-1: V1/Production must never be queried or touched. |
| **G2 · Backend mutation (MCP)** | Tool name in: `mcp__claude_ai_Supabase__apply_migration`, `execute_sql`, `deploy_edge_function`, `create_branch`, `merge_branch`, `reset_branch`, `rebase_branch`, `delete_branch`, `create_project`, `pause_project`, `restore_project`, `confirm_cost` | These closure packages touch **no** backend; every prior package ran zero DB mutations. |
| **G3 · Deploy / promote** | `Bash`/`PowerShell` command matching `vercel\s+(deploy|--prod|promote)`, `vercel\s+.*--prod`, or tool `mcp__claude_ai_Vercel__deploy_to_vercel` / `update_project_deployment_protection` | Repository-only; "not deployed" is invariant across all packages. |
| **G4 · Destructive git** | command matching `git\s+push\s+.*(--force|-f)\b`, `git\s+reset\s+--hard`, `git\s+branch\s+-D`, `git\s+clean\s+-[a-z]*f`, `rm\s+-rf?\b.*`, `git\s+(checkout|switch)\s+main\b` | Prevent irreversible history/worktree loss and accidental work on `main`. |
| **G5 · Protected-branch merge** | `gh\s+pr\s+merge`, or `git\s+(merge\|push)` whose target resolves to `main` or `sync/integration` | Governing branches are integrated only by explicit human action; PRs stay Draft. |

Notes:
- G4/G5 command inspection is a conservative regex over the raw command string. False positives are acceptable (a blocked call can be run intentionally after lifting a guard); false negatives are the risk we minimise. Where a target branch cannot be statically determined, `git push`/`git merge` are allowed unless they literally name a protected branch (documented limitation).
- The guard is intentionally simple and dependency-free (no npm install) so it cannot itself fail-open on a missing module.

### 1.4 Documentation
**`docs/YAV2_AUTONOMOUS_SAFETY_CONTROLS.md`** records: each guard + rule reference, how the hook is wired, the known limitations (§1.3 notes), and the **explicit, logged procedure to lift a guard** (comment it in `guard.mjs` with a dated reason, or temporarily disable the hook block) — lifting is a deliberate act, never silent.

### 1.5 Acceptance
- `.claude/settings.json` present with the `PreToolUse` hook; `guard.mjs` present.
- **Positive control:** a dry command containing `zcszesuvjrryxtigjglt` is **blocked** (demonstrated once, recorded in the closure report).
- **Negative control:** a normal `git status` / `npm test` / read-only call is **allowed**.
- Uses the **update-config** skill for the `settings.json` edit.

---

## Part 2 — Client Lifecycle & Work Management Closure (repository-only)

### 2.1 Scope boundary (explicitly non-overlapping)
PR #49 (Core Operational) already hardened the task/follow-up/mark-filed **write** paths (re-entrancy, insert-error checks, retry idempotency, `todayLocal` ageing) and PR #51 (Compliance Reliability) hardened the compliance loaders and shared the compliance overdue/closed truth; PR #53 (Client 360) added the read-first workspace and the shared follow-up helper. **This package does NOT redo any of that** — those are recorded as done. It closes the *remaining* reliability/consistency gaps in the **existing** `Tasks.jsx` list workflow and `Clients.jsx` register/detail that those packages did not touch.

### 2.2 Approach
**Reuse-first hardening.** Extend existing shared truth (`src/helpers.js` task status/ageing, `src/lib/errors.js` `safeErrorMessage`, the `loadError` pattern already proven in `Clients.jsx`) rather than introduce parallel logic. No net-new write actions. Any genuinely-new capability is recorded as deferred, not invented.

*Rejected alternatives:* (a) a new work-management data layer — too broad and overlaps governed P7 backend; (b) a net-new UI surface behind a flag — that is the Client 360 model, not what "closure" means here.

### 2.3 Work Management — existing `Tasks.jsx` list workflow

| ID | Item | Severity | Change |
|---|---|---|---|
| **WM-1** | `Tasks.load()` (`Promise.all` over tasks / follow_ups / team) discards each query `error` → a failed load renders as the empty "No tasks match your filters." | **HIGH** (false-empty-on-outage) | Capture `error` from each read; render a **retryable error state distinct from empty**, mirroring the `loadError` pattern in `Clients.jsx`. A failed load is never presented as "no tasks." |
| **WM-2** | Assignee filter uses substring `.includes(fAssign)` → "Ann" matches "Anna". | Medium | Exact match (`(t.assigned_to || '') === fAssign`), null-safe. |
| **WM-3** | Follow-up ageing/overdue (today-not-overdue, local-date) introduced by PR #49 is not pinned by tests here. | Low | Lock with executable pure-logic tests so it cannot regress. No behaviour change. |
| **WM-4** | Non-owner Mark-Done uses a blocking `alert()`; some action failures inconsistent. | Low | Route the non-owner message and action failures through the existing inline `actionError` channel (business-safe, no raw `error.message`). |

### 2.4 Client Lifecycle — existing `Clients.jsx` register/detail

| ID | Item | Severity | Change |
|---|---|---|---|
| **CL-1** | Directors fetch effect (`useEffect` on `viewClient`) — `.then(({ data }))` discards `error`; no stale-response guard (late response for a previously-viewed client can overwrite); map never cleared. | Medium | Add error handling (console + no silent success); add a **stale/race guard** (ignore a response whose `viewClient` is no longer current, e.g. an `ignore` flag in the effect cleanup); replace rather than accrete the map entry. |
| **CL-2** | Lifecycle status defaults `null → 'Active'` (detail badge); no consistent Inactive/Archived representation; no status filter on the register. | Medium | Consistent status representation (no misleading default; render Draft/Active/Inactive/Archived the same way in the list row and detail badge via a small shared helper) **and a read-only status filter** on the register (parity with Tasks' filters). **No new write path** (status-transition control is deferred — §2.5). |
| **CL-3** | Redundant double ESC handler (`useEscapeKey(closeViewClient)` **and** a manual `window` `keydown` listener both close the modal); minor null-safety consistency in register fields. | Low | Remove the duplicate listener (keep one path); verify remaining register fields are null-safe (search already hardened in PR #49). |

### 2.5 Recorded backend dependencies (identified, NOT executed)
1. **Client-ID allocation race** (OnboardingWizard `maxNum+1`) → DB sequence / allocation RPC.
2. **`task_id` / `followup_id` uniqueness** → DB unique constraint (repository mitigation from PR #49 retained).
3. **Client status-transition control + Mark-Done / status role enforcement** → RLS/policy authority (the deferred CL-2 transition control and the Mark-Done gate are defence-in-depth only at the UI).
Bundle into governed P7/P8/P9. **None executed here.**

### 2.6 Deliverables
- Source changes: `src/components/Tasks.jsx`, `src/components/Clients.jsx`, and a small shared helper for lifecycle-status presentation (in `src/helpers.js` or `src/lib/`), plus any minimal supporting edit. No backend files.
- New tests: `tests/clientLifecycleWorkManagementClosure.test.js` — pure-logic (status presentation, exact-assignee predicate, follow-up ageing, error-state selection) + static source guards (Tasks load-error wiring, no substring assignee match, directors race-guard present, single ESC path, no raw `error.message`), in the established house style.
- Docs: `docs/YAV2_CLIENT_LIFECYCLE_WORK_MANAGEMENT_CLOSURE_REPORT.md` + `..._TEST_EVIDENCE.md`; a new section in `docs/YAV2_Master_Completion_Register.md`.
- **Draft PR(s)** against `sync/integration`. Safety controls (Part 1) and the closure (Part 2) may be split into two Draft PRs (infra vs functional) or delivered as one — decided in the implementation plan; both remain Draft.

### 2.7 Verification
- `npm test` full suite green (current baseline **477**; this package adds tests → new higher count, 0 fail).
- `vite build` exit 0.
- Non-auth boot check: app renders Login (not blank), HTTP 200, 0 console errors.
- Interactive authenticated smoke (Admin + non-Admin) is recorded as a **manual dependency** (needs a governed test-account credential + git-ignored `.env.local`, absent here) — same standing limitation as prior packages.

---

## 3. Execution sequence
1. Install Part 1 controls (`.claude/settings.json` + `guard.mjs` + doc) via the **update-config** skill; demonstrate positive + negative control.
2. Confirm baseline on the working branch: `npm ci` clean, baseline tests pass, build exit 0.
3. Implement Part 2 changes (WM-1..4, CL-1..3) with tests, under TDD where practical.
4. Full suite + build + boot verification; write closure report + test evidence + register section.
5. Open Draft PR(s) against `sync/integration`. Nothing merged, nothing deployed.

## 4. Out of scope / non-goals
- Any backend change (SQL, migration, RLS, RPC, grants, storage, MCP DB mutation).
- Any deploy, merge, or Production/V1 interaction.
- Redoing PR #49 / #51 / #53 work.
- A net-new UI surface or a client status-transition write action (deferred, recorded).
- Touching PR #48 (paused redesign).

## 5. Rollback
All Part 2 changes are additive/guarded on a dedicated branch — roll back per-file (`git checkout sync/integration -- <file>`) or discard the branch. Part 1 controls are removable by deleting the hook block / `guard.mjs`. No server-side state is changed, so there is nothing to roll back on the backend.
