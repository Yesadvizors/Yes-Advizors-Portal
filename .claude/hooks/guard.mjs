#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YAV2 Autonomous Safety Guard — Claude Code PreToolUse hook
//
// Purpose: machine-enforce the YAV2 standing governance so autonomous work
// cannot violate it. This is a DENY/ASK backstop only — it grants nothing and
// never widens permissions. Read-only tools and normal git/test/build are
// unaffected (the guard falls through to the normal permission flow).
//
// Reads the PreToolUse event JSON on stdin: { tool_name, tool_input, ... }.
// Emits a JSON permission decision on stdout:
//   - deny  → the tool call is blocked (never-in-scope actions)
//   - ask   → the tool call requires explicit human approval (critical actions)
//   - (no output, exit 0) → normal permission flow (safe / irrelevant calls)
//
// Governance references: Master Completion Register (B-1 V1/Prod ref), the
// repository-only closure discipline (no backend mutation / no deploy / Draft-PR).
// See docs/YAV2_AUTONOMOUS_SAFETY_CONTROLS.md for the full rationale + how to
// deliberately lift a guard.
// ─────────────────────────────────────────────────────────────────────────────

const V1_PROD_REF = 'zcszesuvjrryxtigjglt' // prohibited V1/Production Supabase ref (B-1)

const SUPABASE_MUTATION_TOOLS = new Set([
  'mcp__claude_ai_Supabase__apply_migration',
  'mcp__claude_ai_Supabase__execute_sql',
  'mcp__claude_ai_Supabase__deploy_edge_function',
  'mcp__claude_ai_Supabase__create_branch',
  'mcp__claude_ai_Supabase__merge_branch',
  'mcp__claude_ai_Supabase__reset_branch',
  'mcp__claude_ai_Supabase__rebase_branch',
  'mcp__claude_ai_Supabase__delete_branch',
  'mcp__claude_ai_Supabase__create_project',
  'mcp__claude_ai_Supabase__pause_project',
  'mcp__claude_ai_Supabase__restore_project',
  'mcp__claude_ai_Supabase__confirm_cost',
])

const VERCEL_DEPLOY_TOOLS = new Set([
  'mcp__claude_ai_Vercel__deploy_to_vercel',
  'mcp__claude_ai_Vercel__update_project_deployment_protection',
])

function out(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  }))
  process.exit(0)
}
const allow = () => process.exit(0) // no output → let the normal permission flow decide

// rm -rf / -fr / -Rf … (a single flag cluster containing both r and f)
function isRmRf(cmd) {
  const clusters = cmd.match(/\brm\s+-[a-zA-Z]+/g)
  return !!clusters && clusters.some(c => /r/i.test(c) && /f/i.test(c))
}

function evaluate(evt) {
  const tool = evt.tool_name || ''
  const input = evt.tool_input || {}

  // ── Tool-name guards (MCP) ────────────────────────────────────────────────
  // G2 — backend mutation: prohibited in repository-only packages.
  if (SUPABASE_MUTATION_TOOLS.has(tool)) {
    return out('deny', `YAV2 governance: Supabase backend mutation (${tool}) is prohibited in a repository-only package — no SQL/migration/RPC/mutation is authorised. Blocked.`)
  }
  // G3 — deploy/promote via MCP: not part of a repository-only package.
  if (VERCEL_DEPLOY_TOOLS.has(tool)) {
    return out('ask', `YAV2 governance: deployment/promotion (${tool}) is outside repository-only scope and requires explicit human approval.`)
  }

  // ── Command guards (Bash / PowerShell share the `command` field) ──────────
  const cmd = typeof input.command === 'string' ? input.command : ''
  if (!cmd) return allow()

  // G1 — V1/Production reference: must never appear anywhere. (DENY, top priority.)
  if (cmd.includes(V1_PROD_REF)) {
    return out('deny', 'YAV2 governance (B-1): the V1/Production Supabase ref is prohibited and must never be referenced or queried. Blocked.')
  }

  // G4 — destructive git / filesystem: irreversible. (DENY.)
  const destructive = [
    /git\s+push\b[\s\S]*?(--force\b|--force-with-lease|\s-f\b)/, // force push
    /git\s+reset\b[\s\S]*?--hard\b/,                             // hard reset
    /git\s+branch\b[\s\S]*?\s-D\b/,                              // force branch delete
    /git\s+clean\b[\s\S]*?\s-[a-zA-Z]*f/,                        // clean -f/-fd/-fdx
    /git\s+checkout\b[\s\S]*?\s-f\b/,                            // force checkout
  ]
  if (destructive.some(re => re.test(cmd)) || isRmRf(cmd)) {
    return out('deny', 'YAV2 governance: destructive git/filesystem operation blocked (force-push / reset --hard / branch -D / clean -f / force-checkout / rm -rf). Use a safe, reversible alternative.')
  }

  // G4b — do not move the working tree onto `main`.
  if (/git\s+(checkout|switch)\b[\s\S]*?\bmain\b/.test(cmd)) {
    return out('deny', 'YAV2 governance: do not switch the working tree to `main`. Work happens on feature branches; the governing branch is sync/integration.')
  }

  // G3b — deploy/promote via CLI. (ASK.)
  if (/\bvercel\b[\s\S]*?\b(deploy|promote)\b/.test(cmd) || /\bvercel\b[\s\S]*?--prod\b/.test(cmd)) {
    return out('ask', 'YAV2 governance: Vercel deploy/promote is outside repository-only scope and requires explicit human approval.')
  }

  // G5 — protected-branch merge / push. (ASK — this package stops at a Draft PR.)
  if (/\bgh\s+pr\s+merge\b/.test(cmd)) {
    return out('ask', 'YAV2 governance: merging a PR requires explicit human approval — this package stops at a Draft PR.')
  }
  if (/git\s+merge\b[\s\S]*?\b(origin\/)?(main|sync\/integration)\b/.test(cmd)) {
    return out('ask', 'YAV2 governance: merging into a governing branch (main / sync/integration) requires explicit human approval.')
  }
  if (/git\s+push\b[\s\S]*?\b(main|sync\/integration)\b/.test(cmd)) {
    return out('ask', 'YAV2 governance: pushing directly to a governing branch (main / sync/integration) requires explicit human approval — push feature branches instead.')
  }

  return allow()
}

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', c => { raw += c })
process.stdin.on('end', () => {
  let evt
  try { evt = JSON.parse(raw || '{}') }
  catch { return out('ask', 'YAV2 safety guard could not parse the tool input — asking for human confirmation (fail-safe).') }
  try { evaluate(evt) }
  catch (e) { return out('ask', 'YAV2 safety guard internal error — asking for human confirmation (fail-safe): ' + (e && e.message)) }
})
