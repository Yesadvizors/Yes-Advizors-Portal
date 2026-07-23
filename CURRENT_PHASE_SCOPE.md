# YAV2 Portal — Current Phase Scope (ROTATING — update per phase via reviewed PR)

> **This is a small, rotating file. It is NOT permanent governance and NOT permanent P6 content.** When the
> project moves to another module/phase/work package, Claude updates this file (governing issue, objective, scope,
> gates, next action) through a reviewed draft PR. Permanent rules live in `AI_GOVERNANCE.md`; live state in
> `PROJECT_STATUS.md`; process in `docs/AI_COLLABORATION_WORKFLOW.md`.

## Current module / phase / work package
- **Module 1 — P6: Controlled compliance generation (simple first release).**

## Governing issue
- **#14** — "P6 business scope — simple first-release compliance calendar". *(This issue is the CURRENT work-package
  scope only; it is not project-wide governance.)*

## Plain-language business objective
Provide a **simple calendar of common recurring statutory filings** — not a comprehensive legal-compliance,
payment, certificate, event-management or internal-workflow engine. **Business scope (Issue #14) overrides
technical completeness.**

## Included scope (per Issue #14 — summary; the issue governs)
GST (GSTR-1, GSTR-3B, CMP-08, GSTR-4, GSTR-9, GSTR-9C) · TDS **quarterly statements only** (24Q, 26Q, 27Q) ·
Income-tax return filing · Tax audit report · ROC (AOC-4, MGT-7/7A, DPT-3, DIR-3 KYC) · LLP (Form 8, Form 11) ·
Payroll (EPF monthly, ESIC monthly). Configuration-driven standard due dates; a readable calendar item + linked
tracker entry per included obligation.

## Excluded scope (per Issue #14 — later phases only, after separate PJ approval)
Accounting month-close generation · TDS payment dates · Form 16 / 16A · TCS · GST IFF · GST PMT-06 · Professional
Tax · ADT-1 · MR-3 · statutory-audit internal milestones · SECRETARIAL auto-generation · OTHER auto-generation ·
uncommon/optional/highly event-dependent compliances · full legal-compliance-engine features.

## Status of the earlier broad P6 due-date work
- The **earlier broad "Rev10" due-date matrix approach is NOT governing and NOT approved.** It was superseded by
  PJ's controlling simplification in **Issue #14**. It must not carry forward as the current scope; only the
  Issue #14 obligations are in scope.

## Current approvals & remaining gates
- **Approved:** P6 framework direction (that P6 produces a controlled compliance calendar). **Issue #14 narrows the
  first release to the simple scope above.**
- **Delivered:** the simplified scope + standard-due-date **proposal** (`docs/M1B_P6_First_Release_Scope_And_Due_Dates.md`)
  was ChatGPT-reviewed and **merged via PR #16** (`e0cb82b…`). Merging recorded the **proposal**; it did **not**
  approve the due-date rules.
- **Remaining gates:** **PJ approves the proposed standard due dates** (verify any HOLD/`verify` rows first) →
  separate written PJ authorisation for implementation authoring → PJ-gated migration/SQL authoring, then PJ-executed
  migration/SQL on **V2 only**, then commit/push to the base branch, merge and deployment (each separately PJ-gated).

## Governing base commit / branch
- **Base branch:** `ui/redesign-v1`. **Governing HEAD:** `e0cb82b15bd4cbaef434a161a1ee5dfd57a4c782` (last
  source/functional commit `270da9e…`/`3a5f439…`; commits since are documentation-only).

## Next exact action (P6)
- The simplified scope + standard-due-date **proposal** is merged (PR #16). **Next: PJ expressly approves (or
  amends) the proposed standard due dates** (verifying any HOLD/`verify` rows first). **No P6 implementation is
  authorised now**; implementation authoring requires **separate written PJ authorisation** thereafter.
- **In parallel (Issue #17):** a documentation-only reconciliation/live-alignment audit is recorded
  (`docs/YAV2_Localhost_GitHub_Vercel_Reconciliation_Audit.md`) — no reconciliation performed; local-only Rev10 P6
  material remains uncommitted (E-1, PJ retention decision).
