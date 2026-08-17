/**
 * Feature flag for the approved "Bento Workspace" dashboard (Concept 6).
 *
 * DARK BY DEFAULT. Mirrors the repo's existing VITE_P5_UI / VITE_CLIENT360_UI
 * convention: Vite env values are strings, so only the exact string 'true'
 * enables it. Anything else — unset, '', 'false', '0' — leaves the current
 * production-safe shell and dashboard rendering unchanged.
 *
 * Usage (App.jsx, after auth):
 *   if (approvedBentoEnabled(import.meta.env.VITE_APPROVED_BENTO_UI)) return <BentoApp .../>
 */
export function approvedBentoEnabled(flagValue) {
  return String(flagValue).trim().toLowerCase() === 'true'
}

/**
 * AI assistant availability. The ai-agent edge function is NOT deployed on the dev
 * project, so the assistant must be HIDDEN by default (honesty): only the exact string
 * 'true' surfaces it. Anything else — unset, '', 'false' — hides the entry point so the
 * UI never claims AI is online when the backend is absent. Set VITE_AI_ENABLED='true'
 * only in an environment where the ai-agent function is actually deployed.
 */
export function aiAssistantEnabled(flagValue) {
  return String(flagValue).trim().toLowerCase() === 'true'
}
