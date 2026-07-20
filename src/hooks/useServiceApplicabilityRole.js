import { useMemo } from 'react'
import { deriveCapabilities } from '../lib/serviceApplicabilityData'

/**
 * P5 role/capability hook. Thin React wrapper over the pure `deriveCapabilities`
 * (tested directly). Receives the current team-row `user` (the same object App.jsx
 * loads fail-closed from `team`, verified fields is_admin / portal_role / is_active),
 * mirroring the existing `useClientMasterRole(user)` pattern.
 *
 * Admin and Manager are IDENTICAL (approved OD-1). Active Admin/Manager → all
 * capabilities true; inactive users, other roles, and a missing/unresolved user fail
 * closed (all false). No UI-only Admin restriction; no new backend policy — the
 * Migration 0021 RPCs remain the authority.
 *
 * @param {any} user  the authenticated team member (undefined while unresolved)
 * @returns {{loading:boolean, error:null, role:(string|null), isActive:boolean,
 *   canView:boolean, canCreate:boolean, canEdit:boolean, canApprove:boolean,
 *   canDeactivate:boolean, canRestart:boolean}}
 */
export function useServiceApplicabilityRole(user) {
  return useMemo(() => {
    const loading = user === undefined // not yet resolved by the app shell
    const caps = deriveCapabilities(user == null ? null : user)
    return { loading, error: null, ...caps }
  }, [user])
}
