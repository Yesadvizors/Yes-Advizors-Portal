/** KPI row — six semantic-coloured compact cards. Presentational. */
import { KPIS } from '../mock/bentoMock'
import { IconClipboard, IconClock, IconAlertCircle, IconCalendar, IconUsers, IconShield, IconArrowRight } from '../icons'

const ICONS = { total: IconClipboard, pending: IconClock, overdue: IconAlertCircle, today: IconCalendar, clients: IconUsers, compliance: IconShield }

function Trend({ trend }) {
  const cls = trend.tone === 'up' ? 'up' : trend.tone === 'down' ? 'down' : ''
  return (
    <div className="b-kpi-trend">
      <b className={cls}>{trend.dir === 'up' ? '↑' : '↓'} {trend.pct}</b>
      <span>vs last week</span>
    </div>
  )
}

export default function KpiRow() {
  return (
    <div className="b-kpis">
      {KPIS.map(k => {
        const Icon = ICONS[k.key]
        return (
          <div key={k.key} className={`b-kpi t-${k.tone}`}>
            <div className="b-kpi-top">
              <span className="b-kpi-ico"><Icon size={20} /></span>
              <span className="b-kpi-label">{k.label}</span>
            </div>
            <div className="b-kpi-val">{k.value}</div>
            <Trend trend={k.trend} />
          </div>
        )
      })}
    </div>
  )
}
