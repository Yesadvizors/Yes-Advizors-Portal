/**
 * Pure, testable helpers for the P2.1 READ-ONLY Client Master Preview.
 * No React, no Supabase — importable directly by node:test.
 */

/**
 * Mask a generic identifier value for read-only display: reveal ONLY the last four
 * characters; everything before them is masked. Values of four characters or fewer
 * are masked entirely (too short to reveal a last-four safely). Empty → null (the
 * table renders a dash). There is no way to recover the raw value from the output.
 */
export function maskIdValue(value) {
  const s = String(value ?? '').trim()
  if (s === '') return null
  if (s.length <= 4) return '•'.repeat(s.length)
  return '•'.repeat(s.length - 4) + s.slice(-4)
}

/**
 * Admin/Manager gate. Verified against the live `team` schema (migration 0002):
 * `is_admin` (boolean) and `portal_role` (portal_role_enum). Mirrors the server-side
 * public.is_admin_or_manager() (portal_role IN ('Admin','Manager')). No assumed field.
 */
export function isAdminOrManagerRole(user) {
  return (
    user?.is_admin === true ||
    user?.portal_role === 'Admin' ||
    user?.portal_role === 'Manager'
  )
}

/**
 * Whether the P2.1 Preview entry point is visible. Requires the feature flag to be
 * exactly the string 'true' AND the caller to be Admin/Manager. Default (unset/any
 * other value) → hidden.
 */
export function previewEntryVisible(flagValue, user) {
  return flagValue === 'true' && isAdminOrManagerRole(user)
}
