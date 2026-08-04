# YAV2 Operational Readiness & Cross-Module Consistency Closure — Specification

**Date:** 2026-08-04 · **Base:** `sync/integration` @ `5986060168e7b0006c64e86297734294023f3807` · **Branch:** `feature/yav2-operational-readiness-closure` · **Worktree:** `D:/Claude/Claude Code/YAV2-Operational-Readiness-Closure`
**Env:** V2/yav2-dev only. **Posture:** repository-only (frontend); no backend/SQL/migration/RLS/RPC/schema/policy/storage/Edge/auth-config; no new DB write path; no deploy; Draft PR; PR #48 untouched; visual design + role/RLS + fail-closed preserved.

## Approved scope
The 14 confirmed defects (OR-1..OR-14) in the discovery report:
- **Accessibility — keyboard activation** (OR-1..OR-6): make click-only controls (Dashboard/AdminHome metric cards, Compliance client-selector row, Tasks checklist item + dots, AddTaskModal client option) keyboard-activatable via a new shared `activateProps` helper. Only applied to elements with **no nested interactive children**.
- **Accessibility — labels/semantics** (OR-7): Clients detail-modal close `✕` gets an `aria-label`; the modal gets `role="dialog"` + `aria-modal="true"` (parity with Client 360).
- **Reliability hygiene** (OR-8): Clients `ResyncButton` done→idle `setTimeout` held in a ref and cleared on unmount.
- **Cross-module search consistency** (OR-9..OR-13): trim the search term (`search.trim().toLowerCase()`) in Clients, Tasks, Compliance, WorkDocuments, AddTaskModal.
- **Responsive** (OR-14): wrap the Compliance extracted-data `<table>` (l.635) in an `overflow-x:auto` container.

## Excluded scope
No redesign; no new feature; no backend/DB; no new write path; PR #48 untouched. **Deferred (documented, not implemented):** Clients register-row keyboard-activation (nested button — needs restructure); DocumentsHub `.dh-table` overflow (CSS-verification pending); nested-modal Escape capture listeners. Usage-tab visibility (PJ product decision) — unchanged.

## Expected behaviour / acceptance criteria
- OR-1..OR-6: each target control has `role="button"`, is focusable (`tabIndex=0`), and activates on **Enter/Space** as well as click; no visual change; no nested-interactive violation introduced.
- OR-7: the Clients detail modal exposes `role="dialog"` + `aria-modal`, and its close control has an accessible name.
- OR-8: no `setState` after unmount from the resync toast timer (timer cleared on unmount).
- OR-9..OR-13: a search term with leading/trailing whitespace matches as if trimmed.
- OR-14: the extracted-data table scrolls horizontally within its own container on a narrow viewport (page body does not overflow).
- All existing tests still pass; new focused tests pass; build exit 0; non-auth boot OK.

## `activateProps` contract
`activateProps(onActivate) → { role:'button', tabIndex:0, onClick:onActivate, onKeyDown }` where `onKeyDown` calls `onActivate` and `preventDefault()` on `Enter`/`Space` (`' '`/`'Spacebar'`). Pure; unit-tested.

## Testing requirements
`tests/operationalReadinessClosure.test.js` — pure tests for `activateProps` + static source guards for OR-1..OR-14 (≥20 assertions). Convention OD-5 (no jsdom). All existing tests pass.

## Rollback
Additive/guarded on a dedicated branch — per-file `git checkout sync/integration -- <file>` or discard branch. No backend state changed.

## UAT requirements
PJ authenticated UAT grouped by module (keyboard activation, dialog semantics, search-trim, responsive table). Automated + non-auth evidence separated from PJ-required evidence.

## Deferred dependencies
None backend. Frontend deferrals documented above.
