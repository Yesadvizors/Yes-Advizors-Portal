# Branch Protection Policy — Yes Advizors Portal

**Repository:** Yesadvizors/Yes-Advizors-Portal  
**Protected branch:** main  
**Owner / final approver:** Pankaj Joshi (PJ)

Defines branch-protection rules for `main`, enforced at the GitHub platform level so no production code reaches `main` without review and approval.

## 1. Why this exists

`main` is the production code source of truth. Vercel may deploy from `main`, while Supabase edge-function deployments must still follow the separate approval gate. A direct push or an unreviewed merge can break production for all users. Branch protection makes the required process unavoidable.

## 2. Required settings on `main`

GitHub path: **Settings → Branches → Branch protection rule**  
Or, on newer GitHub UI: **Settings → Rules → Rulesets**

Required settings:

- Require a pull request before merging: **ON**
- Required approvals: **1**
- Dismiss stale approvals on new commits: **ON**
- Require branches to be up to date before merging: **ON** recommended
- Restrict who can push to matching branches: **ON**
- Block force pushes: **ON**
- Restrict deletions: **ON**
- Do not allow bypassing the above settings: **ON**
- Require linear history: optional, recommended

## 3. How to verify it is active

1. Go to **Settings → Branches** or **Settings → Rules → Rulesets**.
2. Confirm a rule targets `main`.
3. Confirm the settings in Section 2 are enabled.
4. Confirm that direct push to `main` is rejected.

## 4. Relationship to deploy and database changes

Branch protection governs code merges to `main`. It does **not** by itself gate:

- Supabase production edge-function deployments
- Database SQL or migrations
- Manual environment/config changes

Those remain separately controlled:

- No production deploy without Pankaj’s explicit approval.
- No database change without draft SQL, review, and Pankaj’s explicit approval.

## 5. PR approval — who opens vs who approves

Normal workflow:

- Claude/automation opens the PR.
- Pankaj reviews and approves.

If Pankaj opens a PR manually, GitHub may not count his own approval toward the required approval rule. In that case:

- another trusted reviewer should approve, or
- for this first documentation PR only, it may be merged before the strict required-approval rule is fully enabled.

This avoids a single-person author/approver deadlock.

## 6. Frozen production baseline

- `ai-agent` v47 is live and accepted for controlled internal use.
- v47 must not be changed without approval.
- v46 rollback is preserved and must remain available.
- No database change is allowed without separate explicit approval.

Last updated: 2026-06-12.
