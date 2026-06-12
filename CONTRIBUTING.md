# Contributing & Development Workflow — Yes Advizors Portal

Applies to all code, deploy, and database work on `Yesadvizors/Yes-Advizors-Portal`.

## 1. Roles

- **Coder / Deployer / Implementer:** Claude  
  Writes code, prepares branches/PRs, prepares draft SQL, and deploys/executes only after approval.

- **Reviewer / Approval Checker:** ChatGPT  
  Reviews PRs, REVIEW PACKs, SQL drafts, risk, rollback, permissions, and testing evidence.

- **Final Approver:** Pankaj / PJ  
  Sole authority to approve merge, production deployment, and database execution.

Standard flow:

```text
Claude prepares → PR + REVIEW PACK → Pankaj sends to ChatGPT → ChatGPT reviews → Pankaj approves → Claude merges/deploys/executes
```

## 2. Hard rules

1. No direct push to `main`.
2. Every task uses branch + pull request.
3. One task = one branch = one PR.
4. No production deploy without Pankaj’s explicit approval.
5. No database change without Pankaj’s explicit approval.
6. Every database change must be presented first as draft SQL.
7. Every PR must include the REVIEW PACK template in Section 4.
8. Claude stops after PR + REVIEW PACK and waits.
9. Claude merges/deploys/executes only after Pankaj’s explicit approval.
10. After implementation, Claude saves a final log/report.

## 3. Branching & PR

- Branch naming examples:
  - `docs/governance-workflow`
  - `feat/staff-individual-logins`
  - `fix/resolver-edge-case`
  - `chore/security-cleanup`

- Base branch: `main`
- Keep branches focused and small.
- PR title should be clear and specific.
- PR body must contain the REVIEW PACK.
- Do not merge a PR without recorded Pankaj approval.

> PR author/approval note: Normal workflow is Claude/automation opens the PR and Pankaj approves. If Pankaj opens a PR manually, GitHub may not count his own approval toward the required approval rule. In that case, another trusted reviewer should approve, or this first documentation PR may be merged before the strict required-approval rule is fully enabled.

## 4. Mandatory REVIEW PACK

Every PR must include:

```text
REVIEW PACK

1. Objective:
2. Current stable version:
3. Proposed change:
4. Files/functions affected:
5. Database tables affected:
6. Permission impact:
7. Security impact:
8. Risk level: Low / Medium / High
9. Rollback plan:
10. Test cases:
11. Expected result:
12. What will NOT be touched:
13. Approval required before:
    - Merge: Yes/No
    - Deployment: Yes/No
    - DB change: Yes/No
    - Staff access change: Yes/No
```

A PR without a complete REVIEW PACK is not ready for review.

## 5. Database change procedure

For any DB change:

1. Prepare draft SQL only.
2. Include expected result.
3. Include rollback SQL where possible.
4. Include validation queries.
5. Stop and wait for review.
6. Get approval.
7. Take fresh backup if non-trivial.
8. Execute in a transaction where possible.
9. Run validation.
10. Report result.

No direct DB execution without approval.

## 6. Final log/report after implementation

After approved implementation, provide:

```text
FINAL LOG / REPORT

1. Version/build:
2. Commit SHA:
3. Files changed:
4. DB change performed: Yes/No
5. Deployment performed: Yes/No
6. Logs checked:
7. Tests passed/failed:
8. Rollback status:
9. Risks/warnings:
10. Final conclusion:
```

## 7. Frozen production baseline

- `ai-agent` v47 is live and accepted for controlled internal use.
- v47 must not be changed without approval.
- v46 rollback is preserved and must remain available.
- Database changes require separate explicit approval.

Last updated: 2026-06-12.
