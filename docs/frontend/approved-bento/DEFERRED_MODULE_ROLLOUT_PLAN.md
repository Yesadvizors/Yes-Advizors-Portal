# Deferred Module Rollout Plan

**Design implementation only — not approved for merge or deploy.**

Phase 1 delivers the approved **shell + Dashboard** only. Other modules are **not** redesigned;
they render a clearly-labelled placeholder inside the approved shell so it is fully navigable.
No module's internal content or business logic was changed.

## Proposed sequencing (each behind `VITE_APPROVED_BENTO_UI`, PJ-gated)

| Phase | Scope | Notes |
|---|---|---|
| **1 (this PR)** | Approved shell, header, Dashboard (presentational) | complete — awaiting PJ visual approval |
| 2 | Wire Dashboard panels to real read paths | see `DEFERRED_DATA_WIRING.md`; safe empty states; no writes |
| 3 | Clients + Client Master inside the approved shell | reuse existing reads/RBAC; re-skin only |
| 4 | Tasks, Documents, Compliance | preserve write affordances + capability gates |
| 5 | Team, Reports, Templates, Knowledge Hub, Settings | lower-risk read/config screens |
| 6 | Production enablement | separate PJ/release approval to flip the flag on |

## Guardrails for every later phase
- Repository-only, flag-gated, dark by default until release approval.
- No backend / DB / auth / deployment changes; no data writes or migrations.
- Preserve authentication, RBAC, capability controls, fail-closed behaviour, business rules.
- Each phase: tests + build green, visual review, Draft PR, stop for PJ approval.
