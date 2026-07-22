<!-- YAV2 Portal — pull request template. Governed by AI_GOVERNANCE.md + docs/AI_COLLABORATION_WORKFLOW.md. -->

## Linked work-package issue
- Closes / relates to: #<!-- work-package issue number, e.g. #14 --> · Governance: #13

## Exact authorised scope
<!-- The precise scope authorised by the linked issue + PJ. Do not exceed it. -->

## Out of scope (explicit)
<!-- What this PR deliberately does NOT do. Out-of-scope ideas are recorded for a future PJ-approved issue. -->

## Changed files
<!-- List every changed/added file (paths). -->

## Tests / checks
<!-- Tests run + results, builds, consistency/scanner checks, SHA-256 where evidence requires. -->

## SQL / database / migration activity confirmation
- [ ] **No SQL executed** by the author.
- [ ] **No Supabase access or modification**; no privilege change.
- [ ] **No migration created or modified** (incl. `0023` / any migration) — or, if a migration file is *authored* for later PJ execution, it is **not executed** and is listed above.
- [ ] **No tracker / calendar / compliance rows generated.**

## V1 / Production confirmation
- [ ] **V1 / Production (`zcszesuvjrryxtigjglt`) untouched**; authorised target was **V2 / yav2-dev (`ogjrwemjefvccpyjwxuo`)** only.
- [ ] **No Production merge or deployment** in this PR.

## Governing base
- **Base branch:** `ui/redesign-v1` (or PJ-authorised base): <!-- --> · **Governing base commit:** <!-- 40-char SHA -->

## PJ approvals
- **Obtained:** <!-- business scope / decisions already ruled -->
- **Still required before merge/execution:** <!-- e.g. rule approval, SQL execution, commit/push, merge, deployment -->

## Commit / merge state
- [ ] Commits/pushes are to this work item's **dedicated work branch** only (authorised by the linked work-package
      issue, within scope) — **no direct push to `ui/redesign-v1`**.
- [ ] Opened as **draft**; **not to be merged** by the author. **Merge into the base branch, migration/SQL
      execution, and deployment remain separately PJ-gated.**

---
## Reviewer decision (ChatGPT / Codex — one package-level decision only)
> Choose exactly one. Do not expand approved business scope for technical completeness.

- [ ] **PASS**
- [ ] **PASS WITH SPECIFIC CORRECTIONS**
- [ ] **FAIL**

**Notes / specific corrections:**
