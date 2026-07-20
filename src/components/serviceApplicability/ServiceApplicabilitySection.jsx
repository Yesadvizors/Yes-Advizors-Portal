import { useServiceApplicabilityRole } from '../../hooks/useServiceApplicabilityRole'
import { useServiceApplicabilityData } from '../../hooks/useServiceApplicabilityData'
import ServiceApplicabilityLiveTable from './ServiceApplicabilityLiveTable'
import ServiceApplicabilityHistory from './ServiceApplicabilityHistory'
import { LoadingState, ErrorState, EmptyLiveState, RefreshButton } from './ServiceApplicabilityStates'

/*
 * P5 CP-4 — first visible, READ-ONLY Service Applicability section.
 *
 * Gating (fail closed):
 *  - hidden unless VITE_P5_UI === 'true' (case-insensitive; absent/blank/false → hidden);
 *  - hidden while the role is loading (never flash restricted content);
 *  - hidden for role errors / non-Admin-Manager / inactive users (no denied panel).
 *
 * When hidden it passes a null clientId to the data hook, so NO reads run for a hidden
 * section. Capability rules live only in useServiceApplicabilityRole; data access only
 * in useServiceApplicabilityData (the four CP-2 reads). No write wrapper, no RPC, no
 * direct Supabase, no mutation controls. Refresh calls only the hook's refresh.
 *
 * @param {{clientId: string, user: any}} props  clientId = authoritative clients.id (uuid)
 */
export default function ServiceApplicabilitySection({ clientId, user }) {
  const env = import.meta.env || {}
  const flagEnabled = String(env.VITE_P5_UI).toLowerCase() === 'true'

  const role = useServiceApplicabilityRole(user)
  const visible = flagEnabled && !role.loading && !role.error && role.canView === true

  // Hidden → null clientId → the data hook is idle (no reads for a hidden section).
  const data = useServiceApplicabilityData(visible ? clientId : null)

  if (!flagEnabled) return null
  if (role.loading) return null // do not flash restricted content
  if (role.error || role.canView !== true) return null // fail closed; no permission-denied panel

  return (
    <section aria-labelledby="p5-sa-heading" style={ST.card}>
      <div style={ST.head}>
        <h3 id="p5-sa-heading" style={ST.title}>Service Applicability</h3>
        <RefreshButton onClick={data.refresh} refreshing={data.refreshing} />
      </div>

      {data.loading ? (
        <LoadingState />
      ) : data.error ? (
        <ErrorState message={data.error.message} onRetry={data.refresh} />
      ) : (
        <>
          {data.liveRows.length === 0 ? (
            <EmptyLiveState />
          ) : (
            <ServiceApplicabilityLiveTable rows={data.liveRows} />
          )}
          <ServiceApplicabilityHistory rows={data.historyRows} />
        </>
      )}
    </section>
  )
}

const ST = {
  card: { border: '1px solid #E2E5E1', borderRadius: 10, padding: '12px 14px', background: '#FAFCFB' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 13, fontWeight: 700, color: '#0A3D2C', margin: 0 },
}
