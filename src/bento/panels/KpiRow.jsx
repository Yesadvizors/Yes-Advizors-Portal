/** KPI row — six semantic cards, data-driven. Presentational. */
import { IconClipboard, IconClock, IconAlertCircle, IconCalendar, IconUsers, IconShield } from '../icons'

const ICONS = { total: IconClipboard, pending: IconClock, overdue: IconAlertCircle, today: IconCalendar, clients: IconUsers, compliance: IconShield }
// Fixed card definitions so the six-card structure is preserved in every state.
const KPI_META = [
  { key: 'total', tone: 'blue', label: 'Total Tasks' },
  { key: 'pending', tone: 'amber', label: 'Pending' },
  { key: 'overdue', tone: 'red', label: 'Overdue' },
  { key: 'today', tone: 'green', label: 'Due Today' },
  { key: 'clients', tone: 'blue', label: 'Active Clients' },
  { key: 'compliance', tone: 'purple', label: 'Compliance Due' },
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
