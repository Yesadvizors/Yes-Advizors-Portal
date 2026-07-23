# YAV2 Portal — Project Status (concise, permanent checkpoint)

> The single concise project-wide state record — the persistent source of truth in place of long chat handshakes.
> Updated through a reviewed draft PR at the close of each work item. **Only merged, PJ-authorised content is
> treated as governing state**; unmerged draft-PR content is "proposed", not the source of truth, until it receives
> PASS and PJ authorises merge. Permanent rules: `AI_GOVERNANCE.md`. Current scope: `CURRENT_PHASE_SCOPE.md`.
> Process: `docs/AI_COLLABORATION_WORKFLOW.md`.

- **Repository / base branch:** `Yesadvizors/Yes-Advizors-Portal` · `ui/redesign-v1`.
- **Approved environment:** Supabase **V2 / yav2-dev** (`ogjrwemjefvccpyjwxuo`) only. **Prohibited:** V1/Production (`zcszesuvjrryxtigjglt`); Production merge/deploy.
- **Governing HEAD (`ui/redesign-v1`):** `6ef948f3af811abe23fa60439b3540e37f5cc4b9` (after PR #18 merge). **Last application/source-change commit:** `3a5f439c15cafa493cd2d2320d7733f286441b6b` (verified via `git log -- src`; every commit since is documentation-only).
- **Merged governance:** PR **#15** (project-wide collaboration setup, #13) → merged `e6b7ec6…`.
- **Merged P6 due-date proposal:** PR **#16** (Issue #14 simplified scope + standard due dates) → merged `e0cb82b…` — the due-date rules are **PROPOSED, PJ approval pending** (merge recorded the proposal document; it did not approve the rules).
- **Merged reconciliation audit:** PR **#18** (reconciliation/live-alignment audit, Issue #17) → **merged `6ef948f…`** (governing).
- **Active draft PR (proposed, NOT yet governing):** **#20** *(full-history functional variance & recovery audit, Issue #19)*. The status changes in this checkpoint block are **proposed inside the unmerged PR #20**; they become governing only after ChatGPT PASS + PJ-authorised merge.
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
- **Full-history recovery work package:** **#19** (full-history functional variance & recovery audit) — active draft PR; read-only. See `docs/YAV2_Full_History_Functional_Variance_And_Recovery_Audit.md`. **Conclusion: `UNABLE TO CONCLUDE` full functional/live alignment** — provenance aligned (`6ef948f`), but runtime/DB/config unverifiable here **and one CONFIRMED source-level gap**: the **Director-KYC (dKYC) module + `dkyc-verify-upload` edge function** were built on PRs #9/#10, never merged, and are **absent from the governing redesign** (variance FV-1). For reported admin/non-admin/RBAC failures the **source is present**, so complete source-absence is ruled out; the **current failure cause remains runtime/DB/config/build/deployment/data dependent and must be verified** (FV-2) — the historical P5 root cause is not assumed to be the current cause. **Full Localhost↔GitHub↔Vercel↔Supabase↔n8n↔runtime synchronisation remains unverified** in this read-only Git-history package (see FR-1/FR-8). Recovery programme **FR-0…FR-8** proposed — each a **separate PJ-approved package** (nothing authorised by the audit).

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

_Last updated: 2026-07-23 IST (via Issue #19 full-history functional variance & recovery audit — draft/unapproved)._
