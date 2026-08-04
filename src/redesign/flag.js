/**
 * Feature flag for the 2026 premium redesign prototype.
 *
 * DARK BY DEFAULT. Mirrors the repo's existing VITE_P5_UI / VITE_CLIENT360_UI
 * convention: the flag is a Vite env *string*, so only the exact string 'true'
 * enables it. Anything else — unset, '', 'false', 'FALSE', '0' — keeps the
 * legacy shell rendering unchanged.
 *
 * Usage (in App.jsx, after auth):
 *   if (redesignEnabled(import.meta.env.VITE_REDESIGN_2026)) return <RedesignApp .../>
 */
export function redesignEnabled(flagValue) {
  return String(flagValue).trim().toLowerCase() === 'true'
}
