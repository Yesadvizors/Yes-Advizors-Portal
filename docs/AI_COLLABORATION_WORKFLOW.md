# YAV2 Portal — AI Collaboration Workflow (project-wide, permanent)

**Applies to every YAV2 work package** — all present and future modules, phases, migrations, UI, backend,
documentation packages, runtime verification, releases and governance. Roles, environment restrictions and gates
are defined in `AI_GOVERNANCE.md`; the current work-item scope in `CURRENT_PHASE_SCOPE.md`; live state in
`PROJECT_STATUS.md`. Establishing issue: **#13**.

## Operating model (one line)
`PJ-approved GitHub issue → Claude branch + draft PR → ChatGPT review in GitHub → Claude consolidated correction → ChatGPT final review → PJ approval for execution / merge / deployment`

## Permanent sequence for every work package
1. **PJ approves a short business scope in a GitHub issue** (use the *AI work package* issue template). Business
   scope overrides technical completeness.
2. **`CURRENT_PHASE_SCOPE.md` points to that issue** (governing issue, objective, included/excluded scope, gates,
   base commit/branch, next action) — updated via a reviewed PR when the phase rotates.
3. **Claude reads the issue + `AI_GOVERNANCE.md` + `PROJECT_STATUS.md` + `CURRENT_PHASE_SCOPE.md`** — no need for PJ
   to re-explain governance, paths or environment.
4. **Claude completes the authorised package on a dedicated branch and opens a draft PR** against the working base
   branch (`ui/redesign-v1` unless PJ authorises otherwise), using the pull-request template. One complete package.
5. **ChatGPT / Codex reviews the PR directly** in GitHub and posts **one** package-level decision:
   **`PASS` / `PASS WITH SPECIFIC CORRECTIONS` / `FAIL`**. The reviewer does not expand approved scope.
6. **Claude applies one consolidated correction cycle** (only if corrections were requested). A further cycle is
   used **only** for a genuine security, data-integrity or business-rule issue — not for cosmetic/technical churn.
7. **ChatGPT performs the final review** and posts the final package-level decision.
8. **PJ separately approves** any remaining gate — commit/push (where governed), SQL/database execution (V2 only,
   PJ-executed), migration execution, merge, deployment, or Production action. None happen by default.
9. **After closure, Claude updates `PROJECT_STATUS.md`** and rotates **`CURRENT_PHASE_SCOPE.md`** to the next work
   package — through a reviewed PR.

## What PJ provides (only)
- The **business objective**; **genuine business decisions**; **approval for live actions** (execution/merge/deploy).

## What PJ does NOT need to do
- Paste long transcripts; upload routine ZIP review packages; repeat repository paths / environment restrictions;
  manually relay correction lists; or re-explain the same governance in each new chat. Review happens **in the PR**.

## Evidence handling
- Routine review is **in the PR** (diff, files, checks). **Formal evidence** that genuinely requires it (e.g.
  SHA-256 manifests, runtime captures, read-only SQL result captures for PJ-run verification) is attached to the
  issue/PR — not relayed by PJ between chats.

## Non-negotiable guardrails (every cycle)
- Authorised Supabase target is **V2 / yav2-dev (`ogjrwemjefvccpyjwxuo`)** only; **V1/Production
  (`zcszesuvjrryxtigjglt`) is prohibited** unless PJ authorises a Production release.
- Claude **never** executes SQL, accesses/modifies the database, changes privileges, creates/modifies migrations
  without PJ authorisation, generates compliance/tracker/calendar rows, merges, deploys, or pushes directly to
  `ui/redesign-v1`.
- Claude stays **within the active work-item scope**; ChatGPT keeps reviews **package-level** and **within the
  approved scope**.
