import { useMemo } from 'react'
import { isAdminOrManagerRole } from '../lib/clientMaster'

/**
 * P2.1 role gate for the READ-ONLY Client Master Preview. Thin React wrapper over the
 * pure `isAdminOrManagerRole` predicate (verified team fields `is_admin` / `portal_role`,
 * migration 0002; mirrors server public.is_admin_or_manager()). `canWrite` is ALWAYS
 * false in P2.1 — no mutation is performed anywhere in P2.1.
 */
export function useClientMasterRole(user) {
  return useMemo(
    () => ({ isAdminOrManager: isAdminOrManagerRole(user), canWrite: false }),
    [user]
  )
}
