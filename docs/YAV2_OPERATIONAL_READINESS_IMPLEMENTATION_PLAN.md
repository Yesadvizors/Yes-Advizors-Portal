# Operational Readiness & Cross-Module Consistency — Implementation Plan

> REQUIRED SUB-SKILL: executing-plans. Checkbox steps.

**Goal:** Implement OR-1..OR-14 (discovery report) — accessibility (keyboard + labels), one timer-hygiene fix, cross-module search-trim, one responsive wrap — plus a shared `activateProps` a11y helper.

## Global Constraints
Repository-only; no backend/SQL/RLS/RPC/schema/policy/storage/Edge/auth-config; no new DB write path; V2/yav2-dev only; V1/Prod prohibited; no deploy; Draft PR; PR #48 untouched; preserve visual design + role/RLS + fail-closed; guard active (avoid trigger tokens / V1 ref in commit msgs & PR bodies; use `--body-file`). Base `5986060`; baseline 506 tests, build exit 0.

## Batches
### Batch 1 — shared a11y utility (Task 1)
- [ ] Create `src/lib/a11y.js` (`activateProps`). Pure tests (role/tabIndex; Enter/Space activate + preventDefault; other keys do nothing). Commit.

### Batch 2 — accessibility keyboard activation (Task 2, OR-1..OR-6)
- [ ] `Dashboard.jsx:92`, `AdminHome.jsx:157`, `Compliance.jsx:1463`, `Tasks.jsx:103` + `:326`, `AddTaskModal.jsx:269`: replace the bare `onClick={fn}` with `{...activateProps(fn)}` (import `activateProps`). Static guards. Test + build. Commit.

### Batch 3 — accessibility labels/semantics + timer hygiene (Task 3, OR-7, OR-8)
- [ ] `Clients.jsx`: add `role="dialog"` + `aria-modal="true"` + `aria-label` to the `cd-modal`; add `aria-label="Close client record"` to the `cd-close` button. ResyncButton: hold the done→idle `setTimeout` in a `useRef`, clear it via an unmount `useEffect`. Static guards. Test + build. Commit.

### Batch 4 — cross-module search-trim (Task 4, OR-9..OR-13)
- [ ] Trim the search term at each filter: `Clients.jsx`, `Tasks.jsx`, `Compliance.jsx` (2 sites), `WorkDocuments.jsx`, `AddTaskModal.jsx` → `search.trim().toLowerCase()`. Update any existing static guard that matched the old expression. Static guards. Test + build. Commit.

### Batch 5 — responsive (Task 5, OR-14)
- [ ] `Compliance.jsx:635`: wrap the extracted-data `<table>` in `<div style={{ overflowX:'auto' }}>…</div>`. Static guard. Test + build. Commit.

### Batch 6 — verify, docs, Draft PR (Task 6)
- [ ] Full suite + build + `git diff --check` + scans (secret/prohibited/scope/raw-error/alert/console.log/TODO/V1/PR#48).
- [ ] Non-auth boot check against V2/yav2-dev.
- [ ] Test evidence + UAT checklist (by module) + closure report + register entry (Status Draft).
- [ ] Commit; push; Draft PR (`--body-file`). Do NOT mark Ready / merge.
- [ ] Consolidated report.

## Self-Review
Every OR maps to a batch + test. `activateProps` name consistent. No placeholders. No nested-interactive conversions (Clients row deferred).
