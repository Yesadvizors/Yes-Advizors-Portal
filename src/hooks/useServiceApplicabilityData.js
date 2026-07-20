import { useState, useEffect, useRef, useCallback } from 'react'
import {
  readServiceCatalogue,
  readClientServiceApplicability,
  readActiveTeamMembers,
  readClientRegistrations,
} from '../services/serviceApplicabilityReads'
import {
  buildServiceApplicabilityViewModel,
  makeHookError,
  missingClientState,
  emptyServiceApplicabilityDatasets,
  makeRequestSequencer,
} from '../lib/serviceApplicabilityData'

/**
 * P5 client-scoped data-loading hook (CP-3). READ-ONLY: uses only the four CP-2 read
 * functions — no direct Supabase query, no write wrapper, no RPC, no UI/toast. Loads
 * the four independent reads in parallel, checks every {data,error}, derives the view
 * model, and fails closed on any read failure or missing clientId.
 *
 * Stale-response protection uses a request sequencer (pure, tested directly). EVERY
 * load attempt calls seq.begin() FIRST — before the missing-clientId guard — so an
 * in-flight request for a previous client is invalidated the moment clientId becomes
 * null/blank/missing; its late result is then rejected by shouldApply() and cannot
 * overwrite the authoritative CLIENT_ID_REQUIRED state. This does NOT rely on
 * mountedRef alone (a new effect re-sets mountedRef=true after a clientId change).
 *
 * refresh keeps valid current data visible; on failure it retains prior data and
 * surfaces the error. No polling, no retries.
 *
 * @param {string} clientId  clients.id (uuid)
 * @returns {{loading:boolean, refreshing:boolean, error:(null|{code:string,message:string}),
 *   catalogue:any[], liveRows:any[], historyRows:any[], teamMembers:any[],
 *   registrations:any[], availableServiceCodes:string[], refresh:Function}}
 */
export function useServiceApplicabilityData(clientId) {
  const hasClient = clientId != null && String(clientId).trim() !== ''

  const [state, setState] = useState(() =>
    hasClient
      ? { loading: true, refreshing: false, error: null, ...emptyServiceApplicabilityDatasets() }
      : missingClientState(),
  )

  const seqRef = useRef(null)
  if (seqRef.current === null) seqRef.current = makeRequestSequencer()
  const mountedRef = useRef(true)

  const load = useCallback(
    async (mode) => {
      const seq = seqRef.current.begin() // invalidate any in-flight request FIRST
      // Fail closed: no clientId → no reads; CLIENT_ID_REQUIRED + empty datasets.
      if (!(clientId != null && String(clientId).trim() !== '')) {
        setState(missingClientState())
        return
      }

      setState((prev) =>
        mode === 'refresh'
          ? { ...prev, refreshing: true, error: null } // keep valid current data visible
          : { ...emptyServiceApplicabilityDatasets(), loading: true, refreshing: false, error: null },
      )

      let cat
      let appl
      let team
      let regs
      try {
        ;[cat, appl, team, regs] = await Promise.all([
          readServiceCatalogue(),
          readClientServiceApplicability(clientId),
          readActiveTeamMembers(),
          readClientRegistrations(clientId),
        ])
      } catch (e) {
        if (!seqRef.current.shouldApply(seq, mountedRef.current)) return // stale/unmounted — drop
        setState((prev) =>
          mode === 'refresh'
            ? { ...prev, refreshing: false, error: makeHookError('UNKNOWN_READ_FAILED') }
            : { ...emptyServiceApplicabilityDatasets(), loading: false, refreshing: false, error: makeHookError('UNKNOWN_READ_FAILED') },
        )
        return
      }

      if (!seqRef.current.shouldApply(seq, mountedRef.current)) return // a newer request/unmount won — drop

      const failCode = cat && cat.error
        ? 'CATALOGUE_READ_FAILED'
        : appl && appl.error
          ? 'APPLICABILITY_READ_FAILED'
          : team && team.error
            ? 'TEAM_READ_FAILED'
            : regs && regs.error
              ? 'REGISTRATION_READ_FAILED'
              : null

      if (failCode) {
        // Do not present partial data as complete. On refresh, retain prior valid data
        // and surface the error; on initial load, fail closed with empty datasets.
        setState((prev) =>
          mode === 'refresh'
            ? { ...prev, refreshing: false, error: makeHookError(failCode) }
            : { ...emptyServiceApplicabilityDatasets(), loading: false, refreshing: false, error: makeHookError(failCode) },
        )
        return
      }

      const vm = buildServiceApplicabilityViewModel({
        catalogue: cat.data || [],
        applicability: appl.data || [],
        team: team.data || [],
        registrations: regs.data || [],
      })
      setState({
        loading: false,
        refreshing: false,
        error: null,
        catalogue: vm.catalogue,
        liveRows: vm.liveRows,
        historyRows: vm.historyRows,
        teamMembers: team.data || [],
        registrations: regs.data || [],
        availableServiceCodes: vm.availableServiceCodes,
      })
    },
    [clientId],
  )

  useEffect(() => {
    mountedRef.current = true
    load('initial') // clientId change re-runs this (load depends on clientId) → clears prior data
    return () => {
      mountedRef.current = false
    }
  }, [load])

  const refresh = useCallback(() => load('refresh'), [load])

  return { ...state, refresh }
}
