import { useState, useEffect, useRef, useCallback } from 'react'
import {
  readClientCompliance,
  readClientTasks,
  readClientFollowUps,
  readClientDocuments,
  readClientNotices,
  readClientFinancials,
  readClientReadiness,
  readClientFinancialStatements,
} from '../services/client360Reads'

/**
 * Client 360° data hook (CP-3 equivalent). READ-ONLY: uses only the six read functions —
 * no direct Supabase query, no write, no RPC, no UI/toast.
 *
 * Unlike the Service Applicability section (which fails the WHOLE section closed on any
 * read error), the workspace loads six INDEPENDENT panels and keeps them independent:
 * a failure in one panel surfaces an error for THAT panel only and never blanks the
 * others (spec G/H). Each panel therefore carries its own `{ rows, error }`.
 *
 * Both client keys are needed because the sources are split across the uuid/text divide:
 *   compliance + notices → client.id (uuid);  tasks/follow-ups/documents/financials → client.client_id (text).
 *
 * Stale-response protection: a monotonic request token is captured before the reads and
 * a late response for a superseded client (or after unmount) is dropped. refresh keeps
 * the currently-shown rows visible and only replaces panels whose new read succeeds. No
 * polling, no retries.
 *
 * @param {object|null} client  a public.clients row ({ id, client_id, ... })
 */
const EMPTY_PANELS = () => ({
  compliance: { rows: [], error: null },
  tasks: { rows: [], error: null },
  followUps: { rows: [], error: null },
  documents: { rows: [], error: null },
  notices: { rows: [], error: null },
  financials: { rows: [], error: null },
  readiness: { rows: [], error: null },
  financialStatements: { rows: [], error: null },
})

export function useClient360Data(client) {
  const clientUuid = client && client.id != null ? String(client.id) : ''
  const clientCode = client && client.client_id != null ? String(client.client_id) : ''
  const hasClient = clientUuid.trim() !== '' || clientCode.trim() !== ''

  const [state, setState] = useState(() => ({
    loading: hasClient,
    refreshing: false,
    missingClient: !hasClient,
    panels: EMPTY_PANELS(),
  }))

  const seqRef = useRef(0)
  const mountedRef = useRef(true)

  const load = useCallback(
    async (mode) => {
      const seq = ++seqRef.current // invalidate any in-flight request FIRST
      if (!hasClient) {
        setState({ loading: false, refreshing: false, missingClient: true, panels: EMPTY_PANELS() })
        return
      }

      setState((prev) =>
        mode === 'refresh'
          ? { ...prev, refreshing: true }
          : { loading: true, refreshing: false, missingClient: false, panels: EMPTY_PANELS() },
      )

      // Each read returns a { data, error } result (it does not throw); a rejected promise
      // is still handled defensively via .catch so one bad panel cannot reject Promise.all.
      const safe = (p) => Promise.resolve(p).then(
        (r) => r || { data: null, error: { message: 'UNKNOWN' } },
        () => ({ data: null, error: { message: 'UNKNOWN' } }),
      )

      const [compliance, tasks, followUps, documents, notices, financials, readiness, financialStatements] = await Promise.all([
        safe(readClientCompliance(clientUuid)),
        safe(readClientTasks(clientCode)),
        safe(readClientFollowUps(clientCode)),
        safe(readClientDocuments(clientCode)),
        safe(readClientNotices(clientUuid)),
        safe(readClientFinancials(clientCode)),
        safe(readClientReadiness(clientCode)),
        safe(readClientFinancialStatements(clientCode)),
      ])

      if (seq !== seqRef.current || !mountedRef.current) return // stale/unmounted — drop

      const toPanel = (res, prevRows) =>
        res.error
          ? { rows: mode === 'refresh' ? prevRows : [], error: true } // keep prior data on refresh; never show empty as success
          : { rows: res.data || [], error: null }

      setState((prev) => ({
        loading: false,
        refreshing: false,
        missingClient: false,
        panels: {
          compliance: toPanel(compliance, prev.panels.compliance.rows),
          tasks: toPanel(tasks, prev.panels.tasks.rows),
          followUps: toPanel(followUps, prev.panels.followUps.rows),
          documents: toPanel(documents, prev.panels.documents.rows),
          notices: toPanel(notices, prev.panels.notices.rows),
          financials: toPanel(financials, prev.panels.financials.rows),
          readiness: toPanel(readiness, prev.panels.readiness.rows),
          financialStatements: toPanel(financialStatements, prev.panels.financialStatements.rows),
        },
      }))
    },
    [clientUuid, clientCode, hasClient],
  )

  useEffect(() => {
    mountedRef.current = true
    load('initial')
    return () => { mountedRef.current = false }
  }, [load])

  const refresh = useCallback(() => load('refresh'), [load])

  return { ...state, refresh }
}

export default useClient360Data
