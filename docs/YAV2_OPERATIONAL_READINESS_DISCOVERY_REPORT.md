# YAV2 Operational Readiness & Cross-Module Consistency — Discovery Report

**Date:** 2026-08-04 · **Base:** `sync/integration` @ `5986060168e7b0006c64e86297734294023f3807` · **Branch:** `feature/yav2-operational-readiness-closure`

## Method & context
A repository-wide operational audit of the existing frontend. **Prior closures already hardened most reliability** (PR #49 core workflow, #51 compliance, #53 client 360, #57 lifecycle/work, #59 auth/session, #61 frontend reliability & UX). This audit therefore targets the **genuinely-untapped** areas — chiefly **keyboard accessibility** of click-only controls, a remaining timer-hygiene site, **cross-module search-trim consistency**, and one responsive table gap. Findings are classified honestly; intentional product behaviour and already-closed items are excluded (no artificial count).

## Defect register (confirmed, repository-only)
| ID | Module | File:line | Current behaviour | Evidence | Sev | User impact | Correction | Backend dep | Decision | Verify |
|---|---|---|---|---|---|---|---|---|---|---|
| **OR-1** | Dashboard | `Dashboard.jsx:92` | Metric card is a `<div onClick>` — not keyboard-activatable | clickable `div`, no role/tabIndex/keydown | MED | keyboard/SR users can't open the tab | shared `activateProps` (role=button, tabIndex, Enter/Space) | no | IMPLEMENT | pure test + static guard |
| **OR-2** | Admin Home | `AdminHome.jsx:157` | Metric card `<div onClick>` not keyboard-activatable | same | MED | same | `activateProps` | no | IMPLEMENT | static guard |
| **OR-3** | Compliance | `Compliance.jsx:1463` | Client-selector row `<div onClick>` not keyboard-activatable (no nested control) | same | MED | can't pick a client via keyboard | `activateProps` | no | IMPLEMENT | static guard |
| **OR-4** | Tasks | `Tasks.jsx:103` | Checklist item `<div onClick>` not keyboard-activatable | same | LOW-MED | can't toggle checklist by keyboard | `activateProps` | no | IMPLEMENT | static guard |
| **OR-5** | Tasks | `Tasks.jsx:326` | Checklist-dots expander `<div onClick>` not keyboard-activatable | same | LOW | can't expand by keyboard | `activateProps` | no | IMPLEMENT | static guard |
| **OR-6** | Work Mgmt | `AddTaskModal.jsx:269` | Client-search option `<div onClick>` not keyboard-activatable | same | MED | can't pick a client by keyboard | `activateProps` | no | IMPLEMENT | static guard |
| **OR-7** | Clients | `Clients.jsx` (cd-close / cd-modal) | Detail-modal close `✕` has no `aria-label`; the modal has no `role="dialog"`/`aria-modal` | `<button className="cd-close" …>✕</button>`; `<div className="cd-modal">` | MED | SR users can't identify the dialog or its close | add `aria-label` + `role="dialog"`/`aria-modal` (parity with Client 360) | no | IMPLEMENT | static guard |
| **OR-8** | Clients | `Clients.jsx` ResyncButton (~l.137) | `done→idle` `setTimeout` never cleared | uncleared timer | LOW | setState-after-unmount warning if modal closes within 4s | hold in a ref + clear on unmount | no | IMPLEMENT | static guard |
| **OR-9** | Clients | `Clients.jsx:237` | Search term not trimmed (`search.toLowerCase()`) | untrimmed compare | LOW | trailing/pasted spaces → no match | `search.trim().toLowerCase()` | no | IMPLEMENT | static guard |
| **OR-10** | Tasks | `Tasks.jsx` (filter) | Search term not trimmed | untrimmed | LOW | same | trim | no | IMPLEMENT | static guard |
| **OR-11** | Compliance | `Compliance.jsx:1451,1571` | Search terms not trimmed | untrimmed | LOW | same | trim | no | IMPLEMENT | static guard |
| **OR-12** | Documents | `WorkDocuments.jsx:478` | Search term not trimmed | untrimmed | LOW | same | trim | no | IMPLEMENT | static guard |
| **OR-13** | Work Mgmt | `AddTaskModal.jsx:199` | Client-search term not trimmed | untrimmed | LOW | same | trim | no | IMPLEMENT | static guard |
| **OR-14** | Compliance | `Compliance.jsx:635` | Extracted-data `<table>` has no `overflow-x` wrapper | preceded directly by `) : (`, no wrapper (other tables wrap) | LOW-MED | horizontal clipping on narrow screens | wrap in `overflowX:'auto'` | no | IMPLEMENT | static guard |

## Shared utility (new)
`src/lib/a11y.js` → `activateProps(onActivate)` returns `{ role:'button', tabIndex:0, onClick, onKeyDown }` (Enter/Space activate, `preventDefault` on Space). Pure and unit-testable; spread onto click-only controls **without nested interactive children**.

## Classification of findings
- **Confirmed defect (implement):** OR-1..OR-14 above.
- **Working but poor keyboard support (implement):** the a11y items (OR-1..OR-7).
- **Intentional product behaviour (not changed):** overlay backdrop-close divs (Clients:318, Client360:101, ClientMasterPreview:95) — click-to-close on the backdrop only, ESC also closes; Usage-tab firm-wide visibility (PJ product decision).
- **Deferred — higher risk / needs restructure (documented, NOT implemented):**
  - **Clients register row keyboard-activation** (`Clients.jsx:282`) — the row nests a real "Edit Draft" `<button>`, so wrapping the row in `role="button"` would create a nested-interactive violation. Needs a row restructure (separate the activatable region). Deferred to a focused a11y follow-up.
  - **DocumentsHub `.dh-table` overflow** (`DocumentsHub.jsx:210`) — no inline wrapper, but overflow may be handled in `dh-table` CSS; not a confirmed defect without CSS verification. Deferred pending confirmation.
  - **Nested-modal Escape (capture-phase keydown listeners** in DocumentManager/DocumentsHub/Compliance) — could double-close in a rare nested-modal path; not confirmed harmful; deferred (risk).
- **Backend dependency:** **none** — every implemented item is frontend-only.
- **False positives excluded:** index keys on static/derived lists; tables already wrapped in `overflow-x`; icon buttons that already carry `aria-label`/`title`.

## Target
~14 genuine repository-only corrections across 7 modules (Dashboard, Admin Home, Clients, Tasks, Work Management, Compliance, Documents) + 1 shared a11y utility. No artificial inflation; the honest remaining set after six prior closures is concentrated in accessibility + consistency.
