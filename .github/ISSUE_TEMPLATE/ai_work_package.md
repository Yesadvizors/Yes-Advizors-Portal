---
name: AI work package
about: PJ-approved work-package scope for a Claude → ChatGPT collaboration cycle (governed by AI_GOVERNANCE.md)
title: "<module/phase> — <short business objective>"
labels: ["ai-work-package"]
assignees: []
---

<!-- Governed by AI_GOVERNANCE.md, docs/AI_COLLABORATION_WORKFLOW.md, CURRENT_PHASE_SCOPE.md. Keep it short:
     business scope overrides technical completeness. This issue is the single source of truth for the work item. -->

## Business objective (plain language)
<!-- What outcome the business wants, in one short paragraph. No technical rule-engine detail. -->

## Included items
<!-- The specific items in scope for THIS work package. -->

## Excluded items
<!-- Explicitly out of scope. Excluded items are considered only in a later phase after separate PJ approval. -->

## Permitted environment
- Supabase **V2 / yav2-dev** (`ogjrwemjefvccpyjwxuo`) only. Base branch: `ui/redesign-v1` unless PJ authorises otherwise.

## Prohibited actions (unless expressly authorised here + by PJ)
- V1/Production (`zcszesuvjrryxtigjglt`); **SQL execution / Supabase access / DB modification (never)**; privilege change; **authoring** a migration/SQL file without explicit authorisation above; generate tracker/calendar/compliance rows; merge; deploy; **direct push to `ui/redesign-v1`** (branch commits/pushes to this item's dedicated branch within scope are allowed); act outside this scope.

## Genuine PJ decisions required
<!-- Only real business decisions (with recommendation + options). Technical mechanics are Claude→ChatGPT recommendations, not PJ decisions. -->

## Acceptance criteria
<!-- Objective, checkable completion conditions for the package. -->

## Author / reviewer responsibilities
- **Claude Code:** complete the package on a dedicated branch; open/update a **draft PR**; one consolidated package.
- **ChatGPT / Codex:** review the PR directly; return one decision — **PASS / PASS WITH SPECIFIC CORRECTIONS / FAIL**; do not expand approved scope.

## Required evidence
<!-- e.g. tests + results, build, consistency checks, SHA-256 manifest, runtime capture — only what genuinely requires evidence. -->

## Gates (each separately controlled by PJ)
- [ ] Business scope approved (this issue) — **also authorises Claude to commit/push to this item's dedicated work branch** (within scope) to prepare its draft PR.
- [ ] Genuine business decisions ruled by PJ.
- [ ] Implementation authoring authorised (separate written PJ approval).
- [ ] **Migration / SQL authoring** authorised (writing a file, not running it) — explicit here if in scope.
- [ ] **Migration / SQL / database execution** authorised — **separate** gate, **PJ-executed on V2 only** (Claude never executes SQL / touches the DB).
- [ ] **Direct push to `ui/redesign-v1`** authorised (separate; not implied by scope approval).
- [ ] Merge authorised.
- [ ] Deployment / Production authorised.
