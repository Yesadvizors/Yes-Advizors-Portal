# YAV2 Portal — AI Governance (project-wide, permanent)

**Scope:** This document governs **the entire YAV2 Portal project** — all present and future modules, phases,
migrations, UI work, backend work, documentation packages, runtime verification, releases and governance work.
It is **not** specific to any single phase. Phase-specific scope lives in `CURRENT_PHASE_SCOPE.md`; live state
lives in `PROJECT_STATUS.md`; the step-by-step process lives in `docs/AI_COLLABORATION_WORKFLOW.md`.

Establishing issue: **#13** ("Project-wide Claude–ChatGPT shared review workflow").

## 1. Roles (permanent)
- **PJ — final business authority.** Approves business scope and genuine business decisions; authorises database/
  runtime execution, migrations, commit/push where separately gated, merge, deployment and any Production action.
- **Claude Code — technical & documentation author.** Completes exactly the authorised work item on a **dedicated
  branch** and opens/updates a **draft pull request**. Produces the complete package (docs, tests, evidence).
- **ChatGPT / Codex — independent package-level reviewer & release controller.** Reviews the **pull request
  directly in GitHub** and returns exactly one package-level decision: **`PASS`**, **`PASS WITH SPECIFIC
  CORRECTIONS`**, or **`FAIL`**.

## 2. Environment restrictions (permanent)
- **Repository:** `Yesadvizors/Yes-Advizors-Portal`.
- **Normal working base branch:** `ui/redesign-v1` — unless PJ **expressly** authorises another base branch.
- **Authorised Supabase target only:** **V2 / `yav2-dev`**, project ref **`ogjrwemjefvccpyjwxuo`**.
- **Strictly prohibited** unless PJ separately authorises a Production release: **V1 / Production**, project ref
  **`zcszesuvjrryxtigjglt`**.
- **No Production merge/deploy by default.**
- **Direct pushes to `ui/redesign-v1` are not made by Claude** — work lands via branch + PR + PJ-gated merge.

## 3. Approval gates (permanent, each separately controlled by PJ)
1. **Business scope** — approved by PJ in a GitHub issue before work starts.
2. **Genuine business decisions** — ruled by PJ (recommendations offered; never decided silently by Claude/ChatGPT).
3. **Migration / SQL authoring** (writing a migration or SQL file, without running it) — Claude may author only when
   the **work-package issue explicitly authorises** it. Authoring is not execution.
4. **Migration / SQL / database execution** — a **separate** gate: **PJ-executed on V2 (`yav2-dev`) only.** Claude
   **never** executes SQL or accesses/modifies the database. **No Production execution** without a separate
   Production release decision.
5. **Commit / push** —
   - Approval of a **work-package issue authorises Claude to commit and push only to that work item's dedicated
     work branch**, as needed to prepare/update its draft PR, **within the approved scope**.
   - **Direct push to `ui/redesign-v1` (the base branch) is NOT authorised** by a work-package approval and is done
     only under a separate express PJ authorisation.
   - Where PJ **expressly imposes a special commit gate** for a particular package, **that special gate controls**.
6. **Merge** — PJ decision; PRs are opened as **draft** and are not merged by Claude.
7. **Deployment / Production** — separate PJ approval; never by default.

## 4. Package & review discipline (permanent)
- **One complete Claude package per authorised work item** (all deliverables + evidence, on the branch/PR).
- **One consolidated ChatGPT review** per package (a single package-level decision).
- **One consolidated correction cycle maximum**, **unless** a genuine **security, data-integrity, or business-rule**
  issue requires a further cycle. Cosmetic/technical-completeness churn does not justify extra cycles.
- **ChatGPT must not expand an approved business scope** merely for technical completeness. Scope is set by the
  work-item issue and by PJ; a reviewer flags scope concerns to PJ rather than widening the package.
- **Claude must not proceed outside the active work-item scope.** Out-of-scope ideas are recorded for a future
  PJ-approved issue, not implemented.

## 5. Shared source of truth (permanent)
- The **GitHub issue + branch + pull request** are the single shared source of truth for each work item.
- **No long transcript or ZIP relay through PJ** unless formal evidence genuinely requires it (e.g. hashes,
  runtime captures). Routine review happens **in the PR**, not by PJ copying material between chats.
- `PROJECT_STATUS.md` (state) and `CURRENT_PHASE_SCOPE.md` (current scope) keep both AIs aligned without PJ
  re-explaining governance, paths or restrictions in each new chat.

## 6. Prohibited by default (any work item, unless the item's issue + PJ expressly authorise it)
Touching V1/Production or ref `zcszesuvjrryxtigjglt`; **executing SQL or accessing/modifying Supabase (never,
regardless of authoring authorisation)**; **authoring** a migration/SQL file without explicit work-package
authorisation; changing database privileges; generating tracker/calendar/compliance rows; merging a PR; deploying;
**pushing directly to `ui/redesign-v1`** (committing/pushing to the work item's **dedicated work branch** within
scope is permitted — §5); acting outside the active work-item scope.

## 7. Change control for these governance files
`AI_GOVERNANCE.md`, `docs/AI_COLLABORATION_WORKFLOW.md`, the PR/issue templates, `PROJECT_STATUS.md` and
`CURRENT_PHASE_SCOPE.md` are themselves changed only through a reviewed **draft PR** against the working base
branch — same workflow as any other package.
