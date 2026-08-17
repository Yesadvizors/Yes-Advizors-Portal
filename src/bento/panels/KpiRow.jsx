/** KPI row — four primary cards (Active Clients, Open Tasks, Overdue, Due This Week).
 *  Intentionally small (Part 3C) so the dashboard leads with attention, not a stat wall. */
import { IconClipboard, IconAlertCircle, IconCalendar, IconUsers } from '../icons'

const ICONS = { clients: IconUsers, open: IconClipboard, overdue: IconAlertCircle, week: IconCalendar }
// Fixed card definitions so the four-card structure is preserved in every state.
const KPI_META = [
  { key: 'clients', tone: 'blue', label: 'Active Clients' },
  { key: 'open', tone: 'amber', label: 'Open Tasks' },
  { key: 'overdue', tone: 'red', label: 'Overdue' },
  { key: 'week', tone: 'green', label: 'Due This Week' },
]

function Foot({ k, loading, error }) {
  if (loading) return <span className="b-skel b-skel-line" />
  if (error) return <span>—</span>
  if (k?.trend) {
    const cls = k.trend.tone === 'up' ? 'up' : k.trend.tone === 'down' ? 'down' : ''
    return <><b className={cls}>{k.trend.dir === 'up' ? '↑' : '↓'} {k.trend.pct}</b> <span>vs last week</span></>
  }
  return <span>{k?.foot || ''}</span>
}

export default function KpiRow({ kpis, loading, error }) {
  const byKey = Object.fromEntries((kpis || []).map(k => [k.key, k]))
  return (
    <div className="b-kpis">
      {KPI_META.map(meta => {
        const k = byKey[meta.key]
        const Icon = ICONS[meta.key]
        return (
          <div key={meta.key} className={`b-kpi t-${meta.tone}`}>
            <div className="b-kpi-top">
              <span className="b-kpi-ico"><Icon size={20} /></span>
              <span className="b-kpi-label">{meta.label}</span>
            </div>
            <div className="b-kpi-val">{loading ? <span className="b-skel b-skel-val" /> : error ? '—' : (k ? k.value : '—')}</div>
            <div className="b-kpi-trend"><Foot k={k} loading={loading} error={error} /></div>
          </div>
        )
      })}
    </div>
  )
}
