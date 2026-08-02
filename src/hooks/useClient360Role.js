import { useMemo } from 'react'
import { deriveClient360Capabilities } from '../lib/client360'

/**
 * Client 360° role hook. Thin useMemo wrapper over the pure deriveClient360Capabilities
 * (unit-tested directly). Fails closed for anyone who is not an active Admin/Manager.
 *
 * `loading` is true only while the user is still undefined (session bootstrapping); a
 * resolved null user is a decided "no access", not loading.
 *
 * @param {object|null|undefined} user  the `team` row threaded through the app
 */
export function useClient360Role(user) {
  return useMemo(() => {
    const caps = deriveClient360Capabilities(user)
    return { loading: user === undefined, ...caps }
  }, [user])
}

export default useClient360Role
