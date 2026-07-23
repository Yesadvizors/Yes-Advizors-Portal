# YAV2 Portal — Project Status (concise, permanent checkpoint)

> The single concise project-wide state record — the persistent source of truth in place of long chat handshakes.
> Updated through a reviewed draft PR at the close of each work item. **Only merged, PJ-authorised content is
> treated as governing state**; unmerged draft-PR content is "proposed", not the source of truth, until it receives
> PASS and PJ authorises merge. Permanent rules: `AI_GOVERNANCE.md`. Current scope: `CURRENT_PHASE_SCOPE.md`.
> Process: `docs/AI_COLLABORATION_WORKFLOW.md`.

- **Repository / base branch:** `Yesadvizors/Yes-Advizors-Portal` · `ui/redesign-v1`.
- **Approved environment:** Supabase **V2 / yav2-dev** (`ogjrwemjefvccpyjwxuo`) only. **Prohibited:** V1/Production (`zcszesuvjrryxtigjglt`); Production merge/deploy.
- **Governing HEAD (`ui/redesign-v1`):** `b2ceb30edccc7a209c4459fdb5c9df7caa51bcfb` (after PR #24 merge). **Last application/source-change commit:** `3a5f439c15cafa493cd2d2320d7733f286441b6b` (verified via `git log -- src`; every commit since is documentation-only).
- **Merged governance:** PR **#15** (project-wide collaboration setup, #13) → merged `e6b7ec6…`.
- **Merged P6 due-date proposal:** PR **#16** (Issue #14 simplified scope + standard due dates) → merged `e0cb82b…` — the due-date rules are **PROPOSED, PJ approval pending** (merge recorded the proposal document; it did not approve the rules).
- **Merged reconciliation audit:** PR **#18** (reconciliation/live-alignment audit, Issue #17) → **merged `6ef948f…`**.
- **Merged full-history variance audit:** PR **#20** (full-history functional variance & recovery audit, Issue #19) → **merged `683d45d…`**.
- **Merged full-system synchronisation audit:** PR **#22** (full-system synchronisation & runtime variance audit, Issue #21) → **merged `798afaa…`**.
- **Merged recovery design:** PR **#24** (complete historical recovery, consolidation & live-alignment design, Issue #23) → **merged `b2ceb30…`** (governing).
- **Active draft PR (proposed, NOT yet governing):** **#25** *(Package A — historical evidence & live-state discovery, Issue #23)*. The status changes in this checkpoint block are **proposed inside the unmerged PR #25**; they become governing only after ChatGPT PASS + PJ-authorised merge.
- **Alignment (audit, Issue #17):** source-code / GitHub-branch / Vercel-deployment-SHA were aligned at merge; **runtime, database/migration and environment/config verification remain NOT FULLY VERIFIABLE.** See `docs/YAV2_Localhost_GitHub_Vercel_Reconciliation_Audit.md`.

## Closed modules / phases (CLOSED PASS)
- Portal V2 repo + Preview deployment + PJ admin login.
- R4-DB migration 0014 (financial-year repair) — never modify.
- M1-A migration 0015 (Client Master foundation).
- M1-B D1 discovery · D2a (0016 audit foundation) · D2b (0017/0018 CRUD RPCs + bypass closure).
- P5 service applicability (0021) + PG-1 OTHER-notes (0022); P5 UI CP-1…CP-7; **P5 & Module 1 runtime Steps 1–14 PASS — CLOSED PASS** (PJ final approval 2026-07-21 IST).

## Active module / phase
- **P6 — controlled compliance generation (simple first release).** Governed by Issue **#14** (simple calendar of
  common recurring statutory filings). The earlier broad "Rev10" due-date matrix approach is **not governing / not
  approved** — superseded by Issue #14 (its files remain **local-only, uncommitted** — audit exception E-1).
  **Delivered (merged, PR #16):** the documentation-only simplified scope + standard-due-date **proposal** for the
  Issue #14 obligations. **Next P6 gate:** PJ approves or amends the proposed standard due dates and applicability inputs →
  **separate written PJ authorisation** before any P6 implementation. **P6 implementation NOT authorised.**
- **Reconciliation / live-alignment (Issue #17):** audit recorded (`docs/YAV2_Localhost_GitHub_Vercel_Reconciliation_Audit.md`) —
  `ALIGNMENT WITH SPECIFIC EXCEPTIONS` (E-1 local-only material; E-2 stale status docs — **proposed to be corrected
  by this draft PR #18, not yet governing until merged**; E-3 legacy `0012` provenance gap). No reconciliation performed yet.

## Current governing issues
- **Governance:** #13 (project-wide collaboration setup) — PR #15 merged.
- **Current work-package scope:** #14 (P6 simple first release) — proposal merged (PR #16); PJ due-date approval pending.
- **Reconciliation work package:** #17 (audit, reconciliation & live alignment) — PR #18 merged (`6ef948f…`).
- **Full-history recovery work package:** **#19** (full-history functional variance & recovery audit) — **PR #20 merged (`683d45d…`)**. Confirmed source-level gap **FV-1**: Director-KYC (dKYC) module + `dkyc-verify-upload` edge function built on PRs #9/#10, never merged, absent from the governing redesign. Admin/non-admin/RBAC: source present, current cause runtime/DB/config-dependent (FV-2). See `docs/YAV2_Full_History_Functional_Variance_And_Recovery_Audit.md`.
- **Full-system synchronisation work package:** **#21** (full-system synchronisation & runtime variance audit) — **PR #22 merged (`798afaa…`)**; primarily read-only. See `docs/YAV2_Full_System_Synchronisation_And_Runtime_Variance_Audit.md`. **Conclusion: `UNABLE TO CONCLUDE`.** Provenance VERIFIED (local ↔ GitHub `683d45d` ↔ Vercel inspected latest deployments; both projects build `ui/redesign-v1` and are **application-source equivalent** — docs-only apart, same last source commit `3a5f439`; this does **not** prove equal Vercel config/env/Supabase-target/runtime). Inspected metadata shows `target:null`/`live:false` → **no Production-target deployment observed** (Production posture not fully certified). Live layers **UNVERIFIED within guardrails**: Supabase V2 (MCP reaches only prohibited V1; Claude never executes SQL), authenticated runtime (no test creds), per-project Vercel config/flag values, n8n (external/not in repo). **Hypotheses to TEST (not asserted):** source **gates** Service Applicability & Client Master Preview on `VITE_P5_UI`/`VITE_P2_PREVIEW` — missing/unset/false/mismatched flags would hide them despite present code (code-gating High; live values unverified); Auth↔`team` V2 data (precedent, not proven current cause); dKYC absent; Edge Functions (`ai-agent`/`extract-financial`/`scan-document`) invoked but **un-versioned in repo**. Recovery **FR-1…FR-8** proposed — each **separate PJ approval** (nothing authorised by the audit). **Scope:** Issue #21/PR #22 is **only the full-system audit** — it does **not** commence, replace or satisfy PJ's later **48-hour full-history recovery & live-alignment programme** (a separate PJ-approved issue/branch/design PR + live-action gates).
- **Complete historical recovery programme:** **#23** (complete historical recovery, consolidation & live alignment) — active draft PR (design-only); branch `recovery/yav2-complete-history-live-alignment` from `798afaa`. See `docs/YAV2_Complete_Historical_Recovery_Consolidation_And_Live_Alignment_Plan.md`. Design goal: move the **complete approved YAV2 system** (architecture, DB/migrations/RLS/Auth/RBAC/security/privacy/storage/Edge/audit/automation/integrations/frontend/backend/config/runtime/docs/evidence) into one controlled V2 live state. **This first package is design + initial inventory only** — recovery design (architecture/DB/migration/RLS/Auth/security/functions/audit/frontend/Edge/storage/Vercel/n8n audit **plans**), an **initial** source/history inventory, historical decision register (initial inventory), approval-to-live reconciliation (provisional §18 states), recovery **Packages A–H**, security test matrix, closure standard. **Present status: COMPLETE RECOVERY DESIGN PREPARED · INITIAL SOURCE/HISTORY INVENTORY COMPLETED · FULL HISTORICAL AND LIVE RECONCILIATION PENDING EXECUTION OF PACKAGES A–H.** The historical **audit/reconciliation is NOT yet complete** — row-by-row decision register, object-by-object/per-table DB register, migration-by-migration V2 reconciliation, table-by-table RLS matrix, role-by-role Auth/RBAC evidence, feature-by-feature approval-to-live status, and live Vercel/Supabase/Edge/storage/n8n evidence are **Package A/B execution deliverables**. **Nothing implemented/executed/deployed**; every live action is a separate PJ gate. Live layers PENDING within standing guardrails (Claude never executes SQL; MCP reaches only prohibited V1; no test creds). *(Design PR #24 merged `b2ceb30…`.)*
  - **Package A (Issue #23) — active draft PR #25:** read-only historical evidence & live-state discovery. Deliverables `docs/YAV2_Package_A_Historical_Evidence_And_Live_State_Discovery.md` + `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql` (PJ executes on V2). **Conclusion: `PACKAGE A PARTIAL — PJ EVIDENCE REQUIRED`.** Claude-side read-only discovery complete (baseline b2ceb30 verified ↔ Vercel governing deploy `dpl_6zvEGXX67…`@`b2ceb30`; full source/tables/RPCs/Edge/flags inventory; approval-to-live register, every item classified, no `UNKNOWN`). **PJ evidence required to reach Package B:** run the V2 discovery SQL; supply Vercel env-var presence/scope/V2-target evidence (no secrets); confirm exact portal URL; approved test-account runtime evidence; n8n/WhatsApp export. Overall governance indicator ≈30% (provenance strong; config/live-DB/runtime unverified).

## Blocked / not-yet-authorised actions
- P6 backend/frontend implementation; migration/SQL **authoring** (incl. any `0023`) without work-package
  authorisation; migration/SQL **execution**; Supabase access/writes; privilege changes; tracker/calendar/
  compliance generation; **direct** push to `ui/redesign-v1`; merge; deployment; any V1/Production action. Each
  requires separate PJ authorisation. *(Branch commits/pushes to a work-package's dedicated branch, to prepare its
  draft PR within approved scope, are permitted — see `AI_GOVERNANCE.md`.)*

## Next business decision / execution gate
- **Reconciliation (Issue #17):** ChatGPT reviews this audit/status PR → PJ decides E-1 retention and E-3 `0012`
  scheduling → future reconciliation packages (runtime/config, DB/migration verification) — each separately gated.
- **P6 (Issue #14):** PJ approves or amends the proposed standard due dates and applicability inputs → **separate written PJ
  authorisation** before any P6 implementation, migration/SQL authoring or execution, commit/push to base, merge or
  deployment. **Local-only Rev10 P6 material is not committed** (E-1 retention is a PJ decision).

_Last updated: 2026-07-23 IST (via Issue #23 Package A — historical evidence & live-state discovery — draft/unapproved)._
