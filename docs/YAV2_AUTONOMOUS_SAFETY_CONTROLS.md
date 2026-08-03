# YAV2 Autonomous Safety Controls

**Status:** Active (repository-level infrastructure). **Date:** 2026-08-03 · **Owner:** PJ · **Executor:** Claude Code

Machine-enforced guardrails that make the YAV2 standing governance non-optional for autonomous work. They are **deny/ask backstops only** — they grant nothing and never widen permissions. Read-only tools and normal git/test/build are unaffected.

## Mechanism

A Claude Code **`PreToolUse`** hook runs a dependency-free Node guard, **`.claude/hooks/guard.mjs`**, before every `Bash`, `PowerShell`, and mutating Supabase/Vercel MCP tool call. The guard reads the tool-call JSON on stdin and returns a permission decision:

- **`deny`** — the call is blocked (actions never in scope for a repository-only package).
- **`ask`** — the call requires explicit human approval (critical, human-gated actions).
- *(no output / exit 0)* — the normal permission flow proceeds (safe / irrelevant calls).

Wiring (`.claude/settings.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|PowerShell|mcp__claude_ai_Supabase|mcp__claude_ai_Vercel",
        "hooks": [
          { "type": "command", "command": "node",
            "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/guard.mjs"], "timeout": 15 }
        ]
      }
    ]
  }
}
```

## Deny / Ask table

| Guard | Decision | Trigger | Governing rule |
|---|---|---|---|
| **G1 · V1/Prod ref** | DENY | any command containing `zcszesuvjrryxtigjglt` | B-1 — V1/Production must never be referenced or queried |
| **G2 · Backend mutation** | DENY | Supabase MCP: `apply_migration`, `execute_sql`, `deploy_edge_function`, `create/merge/reset/rebase/delete_branch`, `create/pause/restore_project`, `confirm_cost` | repository-only packages touch no backend |
| **G3 · Deploy / promote** | ASK | `vercel deploy/promote/--prod`; Vercel MCP `deploy_to_vercel`, `update_project_deployment_protection` | "not deployed" is invariant; deploy needs human approval |
| **G4 · Destructive git/fs** | DENY | `push --force`/`-f`, `reset --hard`, `branch -D`, `clean -f*`, force-checkout, `rm -rf`; `checkout`/`switch main` | prevent irreversible loss / working on main |
| **G5 · Protected-branch merge/push** | ASK | `gh pr merge`; `git merge`/`git push` targeting `main` or `sync/integration` | governing branches integrate only by explicit human action; PRs stay Draft |

**Known limitations (by design):** command matching is a conservative regex over the raw command string — false positives are acceptable (a blocked call can be re-run intentionally after lifting a guard), while false negatives are minimised. Separate-flag destructive forms (e.g. `rm -r -f`) and non-literal branch targets may not match. The guard covers `Bash`/`PowerShell` commands and the named MCP tools; it does not police file edits.

## Fail-safe behaviour

If the guard cannot parse its input or hits an internal error, it returns **`ask`** (human confirmation) rather than silently allowing — it fails safe, not open, without bricking the session.

## Validation performed (2026-08-03)

- `node --check` on the guard: OK.
- 35/35 simulation cases pass (safe→allow, all DENY cases, all ASK cases, read-only Supabase/Vercel→allow).
- Live in-session controls: a command containing the V1/Prod ref was **blocked**; a safe command **passed**.
- `claude doctor`: no installation issues. The hook hot-reloaded without a restart (the settings watcher was already watching `.claude/`).

## How to deliberately lift a guard

Lifting a guard is an intentional, logged act — never silent:

1. Edit `.claude/hooks/guard.mjs`, comment out the specific rule with a dated reason, or
2. temporarily remove the `PreToolUse` block from settings, then restore it immediately after the authorised action, or
3. set `disableAllHooks: true` in settings for a scoped, clearly-logged window.

Record any lift (what, why, when, by whom) in the closure/handshake notes.

## Active vs committed copies

- **Active enforcement (this machine/session):** the guard lives at `~/.claude/hooks/yav2-safety-guard.mjs` and is bound via the git-ignored `.claude/settings.local.json`, so it is active without adding untracked files to any governing worktree.
- **Committed infrastructure (this file's repo copy):** `.claude/settings.json` + `.claude/hooks/guard.mjs` are the reviewable, team-shared version. When this branch merges, remove the duplicate `PreToolUse` block from the local `.claude/settings.local.json` to avoid the guard firing twice (harmless, but tidy).
- **Global (user-level) enforcement:** the same guard is also registered in `~/.claude/settings.json` (`PreToolUse` → `~/.claude/hooks/yav2-safety-guard.mjs`, matcher `Bash|PowerShell|mcp__claude_ai_Supabase|mcp__claude_ai_Vercel`), so protection applies even when Claude Code is launched from another repository. The user-level and project-level hooks reference the identical guard and matcher, so they return identical decisions and do not conflict. The user-level `~/.claude/CLAUDE.md` carries the **PJ AUTONOMOUS WORKING POLICY** (routine reversible work proceeds; production/V1/credentials/DB-mutation/deploy prohibited unless separately authorised; destructive/irreversible actions need approval; feature branches + isolated worktrees mandatory; cancelled ops verified before retry; non-Git files backed up; one package per run; complete final reporting). Existing user settings were backed up before modification.
