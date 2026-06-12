# Phase 3 — GitHub PR Safety Gate / AI PR Reviewer

Status: Prepared as CI-only governance support.

## Purpose

This phase adds a GitHub Actions PR safety gate for pull requests targeting `main`.

It is designed to strengthen the existing governance workflow without changing the application, database, Supabase edge functions, users, roles, assignments, or production v47 logic.

## What this adds

1. **REVIEW PACK gate**
   - Hard check.
   - Fails if a PR to `main` does not include the required REVIEW PACK sections.

2. **High-risk change detector**
   - Advisory check.
   - Detects high-risk file patterns such as:
     - `supabase/functions/**`
     - SQL/migration files
     - secret-like file names
     - permission/auth/role-related files
     - lockfiles
     - GitHub workflow files
     - production/deploy config

3. **Optional AI PR reviewer**
   - Advisory only.
   - Runs only if `ANTHROPIC_API_KEY` is configured as a repository secret.
   - If no key is configured, the job skips cleanly.
   - It never approves, merges, deploys, or changes code.

## What this does not touch

- `ai-agent` v47 production logic
- v46 rollback
- Supabase database
- Supabase edge functions
- Users
- Roles
- Assignments
- Vercel production deployment
- API keys or secrets

## Security notes

- The workflow uses GitHub's built-in `GITHUB_TOKEN` with:
  - `contents: read`
  - `pull-requests: write`
- `pull-requests: write` is used only to post advisory PR comments.
- No admin or secrets permission is requested.
- No AI API key is added by this phase.

## Recommended rollout

1. Merge this workflow only after ChatGPT review and Pankaj approval.
2. Keep it non-required initially.
3. Open a test PR to confirm REVIEW PACK enforcement.
4. Only after successful test, optionally make the REVIEW PACK gate a required status check.
5. Decide separately whether to configure an AI API key.

## Rollback

Revert this PR or delete `.github/workflows/pr-safety-gate.yml` and the related `.github/scripts/` files.

No database rollback is required because this phase does not touch the database.

## Approval position

This phase can support future fast development, but it does not itself authorize:

- production deployment
- database execution
- staff access changes
- v47 logic changes
- merge without Pankaj approval
