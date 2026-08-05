/**
 * useBentoDashboard — loads the real read-only V2 dashboard data and shapes it
 * for the approved panels. Fails closed (state 'error' on any read failure);
 * never surfaces raw Supabase errors. `enabled: false` skips all IO (used by the
 * design-only standalone preview, which supplies demo data instead).
 */
import { useState, useEffect, useCallback } from 'react'
import { fetchDashboardData } from './data/dashboardReads'
import { buildDashboard } from './data/dashboardModel'
import { todayLocal } from '../helpers'

export function useBentoDashboard({ enabled = true } = {}) {
  const [state, setState] = useState(enabled ? 'loading' : 'idle') // 'loading' | 'ready' | 'error' | 'idle'
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const raw = await fetchDashboardData()
      setData(buildDashboard(raw, todayLocal()))
      setState('ready')
    } catch (e) {
      console.error('[BentoDashboard] load failed:', e)
      setData(null)
      setState('error')
    }
  }, [])

  useEffect(() => { if (enabled) load() }, [enabled, load])

  return { state, data, reload: load }
}
