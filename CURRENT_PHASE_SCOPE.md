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
- **Remaining gates:** **PJ approves or amends the proposed standard due dates and applicability inputs** →
  separate written PJ authorisation for implementation authoring → PJ-gated migration/SQL authoring, then PJ-executed
  migration/SQL on **V2 only**, then commit/push to the base branch, merge and deployment (each separately PJ-gated).

## Governing base commit / branch
- **Base branch:** `ui/redesign-v1`. **Governing HEAD:** `e0cb82b15bd4cbaef434a161a1ee5dfd57a4c782`. **Last
  application/source-change commit:** `3a5f439c15cafa493cd2d2320d7733f286441b6b` (commits since are documentation-only).

## Next exact action (P6)
- The simplified scope + standard-due-date **proposal** is merged (PR #16). **Next: PJ expressly approves (or
  amends) the proposed standard due dates and applicability inputs.** **No P6 implementation is authorised now**;
  implementation authoring requires **separate written PJ authorisation** thereafter.
- **In parallel (Issue #17):** a documentation-only reconciliation/live-alignment audit is recorded
  (`docs/YAV2_Localhost_GitHub_Vercel_Reconciliation_Audit.md`) — no reconciliation performed; local-only Rev10 P6
  material remains uncommitted (E-1, PJ retention decision).
- **In parallel (Issue #19):** a full-history, **read-only** functional-variance & recovery audit is recorded
  (`docs/YAV2_Full_History_Functional_Variance_And_Recovery_Audit.md`). **Conclusion `UNABLE TO CONCLUDE`** full
  functional/live alignment: **(a)** Git/source variance identified, including the **CONFIRMED source-level gap** —
  the **Director-KYC (dKYC) module + `dkyc-verify-upload` edge function** built on PRs #9/#10 but never merged into
  the redesign (FV-1); **(b)** full **Localhost↔GitHub↔Vercel↔Supabase↔n8n↔runtime synchronisation remains
  unverified** in this Git-history-only package. For admin/non-admin/RBAC, **source is present** so complete
  source-absence is ruled out; the **current failure cause remains runtime/DB/config/build/deployment/data dependent
  and must be verified** (FV-2). Proposes recovery programme **FR-0…FR-8**, each requiring **separate PJ approval**.
  **No recovery, no merge, no Supabase, no runtime, no deployment authorised by the audit.** *(PR #20 merged `683d45d…`.)*
- **In parallel (Issue #21):** a **full-system synchronisation & runtime variance** audit
  (`docs/YAV2_Full_System_Synchronisation_And_Runtime_Variance_Audit.md`). **Conclusion `UNABLE TO CONCLUDE`.**
  Provenance VERIFIED (local ↔ GitHub `683d45d` ↔ both Vercel projects building `ui/redesign-v1`;
  **application-source equivalent** — docs-only apart, same last source commit `3a5f439`; **not** proof of equal
  Vercel config/env/Supabase-target/runtime). Inspected metadata: `target:null`/`live:false` → **no Production-target
  deployment observed** (posture not fully certified). Live layers **UNVERIFIED within guardrails**: Supabase V2 (MCP
  reaches only prohibited V1; Claude never executes SQL), authenticated runtime (no test creds), per-project Vercel
  config/flag values, n8n (external, not in repo). **Hypotheses to TEST (not asserted):** source **gates** Service
  Applicability & Client Master Preview on `VITE_P5_UI`/`VITE_P2_PREVIEW` — missing/unset/false/mismatched flags would
  hide them despite present code (live values unverified); Auth↔`team` V2 data (precedent, not proven); dKYC absent;
  Edge Functions invoked but un-versioned in repo. Proposes **FR-1…FR-8**, each a **separate PJ-approved package**.
  **No Supabase/runtime/config/n8n/Vercel change, no recovery, no deployment authorised by the audit.** **Scope:**
  Issue #21/PR #22 is **only the full-system audit** — it does **not** commence, replace or satisfy PJ's later
  **48-hour full-history recovery & live-alignment programme** (separate PJ-approved issue/branch/design PR + gates).
  *(PR #22 merged `798afaa…`.)*

## Active programme (Issue #23 — Complete Historical Recovery, Consolidation & Live Alignment)
- **This is now the active work package.** Governed by Issue **#23**; branch `recovery/yav2-complete-history-live-alignment`
  from governing HEAD `798afaa…`; design doc `docs/YAV2_Complete_Historical_Recovery_Consolidation_And_Live_Alignment_Plan.md`.
- **Objective:** move the **complete approved YAV2 system** (architecture, DB/data model/structure, migrations, RLS,
  Auth, RBAC, security, privacy, storage, Edge Functions, audit logging, automation, integrations, frontend, backend,
  configuration, runtime, documentation, verification evidence) into **one controlled V2 live state** —
  `Localhost ↔ GitHub ↔ Vercel ↔ Supabase V2 ↔ Storage ↔ Edge ↔ n8n/WhatsApp ↔ Live Runtime`. No valid approved work
  may remain isolated only on localhost, an abandoned branch, an old/unmerged PR, an unexecuted migration, a ZIP, or
  documentation.
- **This first package is design + initial inventory only** (executable recovery design + initial source/history
  inventory): recovery design and **audit plans** for architecture/DB/migration/RLS/Auth/security/functions/audit/
  frontend/Edge/storage/Vercel/n8n, an initial historical decision inventory, provisional approval-to-live §18
  classifications, recovery **Packages A–H**, security test matrix, closure standard. **Present status: COMPLETE
  RECOVERY DESIGN PREPARED · INITIAL SOURCE/HISTORY INVENTORY COMPLETED · FULL HISTORICAL AND LIVE RECONCILIATION
  PENDING EXECUTION OF PACKAGES A–H.** The historical **audit/reconciliation is NOT yet complete**: row-by-row
  decision register, object-by-object/per-table DB register, migration-by-migration V2 reconciliation, table-by-table
  RLS matrix, role-by-role Auth/RBAC evidence, feature-by-feature approval-to-live status, and live Vercel/Supabase/
  Edge/storage/n8n evidence are **Package A/B execution deliverables**.
- **Not authorised now:** application recovery implementation; SQL/migration authoring or execution; DB mutation;
  Supabase/Auth/RLS/function/trigger/storage/Edge change; Vercel env change or redeploy; n8n change; Production/V1
  access; merge; cleanup; P6 implementation. **Each of Packages A–H and every live action is a separate PJ gate.**
- **Live layers PENDING within standing guardrails:** Claude never executes SQL; connected Supabase MCP reaches only
  the prohibited V1 project; no approved test-account credentials in-session. Live discovery/verification is delivered
  as plans, executed by PJ under Packages A–H.
- **First-PR file scope:** only `docs/YAV2_Complete_Historical_Recovery_Consolidation_And_Live_Alignment_Plan.md`,
  `PROJECT_STATUS.md`, `CURRENT_PHASE_SCOPE.md`.
