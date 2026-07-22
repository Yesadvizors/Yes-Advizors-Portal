# YAV2 Portal — Project Status (concise, permanent checkpoint)

> The single concise project-wide state record — the persistent source of truth in place of long chat handshakes.
> Updated through a reviewed draft PR at the close of each work item. **Only merged, PJ-authorised content is
> treated as governing state**; unmerged draft-PR content is "proposed", not the source of truth, until it receives
> PASS and PJ authorises merge. Permanent rules: `AI_GOVERNANCE.md`. Current scope: `CURRENT_PHASE_SCOPE.md`.
> Process: `docs/AI_COLLABORATION_WORKFLOW.md`.

- **Repository / base branch:** `Yesadvizors/Yes-Advizors-Portal` · `ui/redesign-v1`.
- **Approved environment:** Supabase **V2 / yav2-dev** (`ogjrwemjefvccpyjwxuo`) only. **Prohibited:** V1/Production (`zcszesuvjrryxtigjglt`); Production merge/deploy.
- **Latest approved base commit (governing HEAD):** `270da9e6c425a9bdc46276d659b7fed432ab7b53`.
- **Active governance PR:** **#15** (this project-wide collaboration setup) — **draft, unapproved, unmerged.**
- **P6 implementation / due-date PR:** **none yet.**

## Closed modules / phases (CLOSED PASS)
- Portal V2 repo + Preview deployment + PJ admin login.
- R4-DB migration 0014 (financial-year repair) — never modify.
- M1-A migration 0015 (Client Master foundation).
- M1-B D1 discovery · D2a (0016 audit foundation) · D2b (0017/0018 CRUD RPCs + bypass closure).
- P5 service applicability (0021) + PG-1 OTHER-notes (0022); P5 UI CP-1…CP-7; **P5 & Module 1 runtime Steps 1–14 PASS — CLOSED PASS** (PJ final approval 2026-07-21 IST).

## Active module / phase
- **P6 — controlled compliance generation (simple first release).** Governed by Issue **#14** (simple calendar of
  common recurring statutory filings). The earlier broad "Rev10" due-date matrix approach is **not governing / not
  approved** — superseded by Issue #14. **Next P6 deliverable:** a short, documentation-only simplified scope +
  standard-due-date proposal for the Issue #14 obligations only, opened as a separate draft P6 PR after PR #15
  closes. **P6 implementation NOT authorised.**

## Current governing issues
- **Governance:** #13 (project-wide collaboration setup) → active PR #15 (draft).
- **Current work-package scope:** #14 (P6 simple first release).

## Blocked / not-yet-authorised actions
- P6 backend/frontend implementation; migration/SQL **authoring** (incl. any `0023`) without work-package
  authorisation; migration/SQL **execution**; Supabase access/writes; privilege changes; tracker/calendar/
  compliance generation; **direct** push to `ui/redesign-v1`; merge; deployment; any V1/Production action. Each
  requires separate PJ authorisation. *(Branch commits/pushes to a work-package's dedicated branch, to prepare its
  draft PR within approved scope, are permitted — see `AI_GOVERNANCE.md`.)*

## Next business decision / execution gate
- Close governance PR #15 (after ChatGPT PASS + PJ merge decision) → Claude opens the separate draft P6 PR linked
  to Issue #14 → ChatGPT reviews the simplified P6 scope + standard due dates → PJ approves → **separate written PJ
  authorisation** before any P6 implementation, migration/SQL authoring or execution, commit/push to base, merge or
  deployment.

_Last updated: 2026-07-22 IST (via the issue #13 setup PR #15 — draft/unapproved)._
