# YAV2 Portal — Current Phase Scope (ROTATING — update per phase via reviewed PR)

> **This is a small, rotating file. It is NOT permanent governance and NOT permanent P6 content.** When the
> project moves to another module/phase/work package, Claude updates this file (governing issue, objective, scope,
> gates, next action) through a reviewed draft PR. Permanent rules live in `AI_GOVERNANCE.md`; live state in
> `PROJECT_STATUS.md`; process in `docs/AI_COLLABORATION_WORKFLOW.md`.

## Current module / phase / work package
- **Module 1 — P6: Controlled compliance generation (first release).**

## Governing issue
- **#14** — "P6 business scope — simple first-release compliance calendar". *(This issue is the CURRENT work-package
  scope only; it is not project-wide governance.)*

## Plain-language business objective
Provide a **simple calendar of common recurring statutory filings** — not a comprehensive legal-compliance,
payment, certificate, event-management or internal-workflow engine. Business scope overrides technical completeness.

## Included scope (per issue #14 — summary; the issue governs)
GST (GSTR-1, GSTR-3B, CMP-08, GSTR-4, GSTR-9, GSTR-9C) · TDS **quarterly statements only** (24Q, 26Q, 27Q) ·
Income-tax return filing · Tax audit report · ROC (AOC-4, MGT-7/7A, DPT-3, DIR-3 KYC) · LLP (Form 8, Form 11) ·
Payroll (EPF monthly, ESIC monthly). Configuration-driven standard due dates; readable calendar item + linked
tracker entry per obligation.

## Excluded scope (per issue #14 — later phases only, after separate PJ approval)
Accounting month-close generation · TDS payment dates · Form 16 / 16A · TCS · GST IFF · GST PMT-06 · Professional
Tax · ADT-1 · MR-3 · statutory-audit internal milestones · SECRETARIAL auto-generation · OTHER auto-generation ·
uncommon/optional/highly event-dependent compliances · full legal-compliance-engine features.

## Current approvals & remaining gates
- **Approved:** P6 framework decisions D-01 (service→output mapping), D-06 (sample-data treatment), D-12 (due-date
  framework) — RULED APPROVED by PJ (2026-07-22 IST). First-release business scope narrowed by issue #14.
- **Remaining gates:** ChatGPT reviews the due-date rules + source evidence → PJ approves the **verified** rules /
  obligation codes (HOLD rows excluded) → ChatGPT final conformance → **separate written PJ authorisation** for
  implementation authoring → PJ-gated SQL execution (V2 only), commit/push, merge and deployment.
- **HOLD:** several due-date rows require primary-text verification (esp. all Income Tax + TDS under the Income-tax
  Act 2025 / Rules 2026); HOLD rows must not be approved until upgraded. See the P6 due-date matrix + evidence
  register under `docs/`.

## Governing base commit / branch
- **Base branch:** `ui/redesign-v1`. **Governing base commit:** `270da9e6c425a9bdc46276d659b7fed432ab7b53`.

## Next exact action
- ChatGPT independently reviews the current P6 package (due-date rules + source evidence) in its PR; **PJ is not
  asked to approve any row still on HOLD**. Implementation remains NOT authorised.
