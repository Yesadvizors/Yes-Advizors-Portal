/** Operational Summary — donut + status bars + Top Areas. Presentational. */
import { OPERATIONAL } from '../mock/bentoMock'
import { IconCheckCircle, IconClock, IconCircle, IconMore, IconChevronDown, IconRupee, IconFile, IconBuilding, IconShield, IconGrid } from '../icons'

const TONE = { green: 'var(--b-green)', amber: 'var(--b-amber)', blue: 'var(--b-blue)' }
const STATUS_ICON = { done: IconCheckCircle, prog: IconClock, not: IconCircle }
const AREA_ICON = { rupee: IconRupee, file: IconFile, building: IconBuilding, shield: IconShield, grid: IconGrid }

function Donut({ pct }) {
  const r = 68, c = 2 * Math.PI * r, filled = (pct / 100) * c
  return (
    <div className="b-donut">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#EAEEF3" strokeWidth="18" />
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--b-green-donut)" strokeWidth="18"
          strokeLinecap="round" strokeDasharray={`${filled} ${c - filled}`} />
      </svg>
      <div className="b-donut-center">
        <span className="b-donut-pct">{pct}%</span>
        <span className="b-donut-cap">Completed</span>
      </div>
    </div>
  )
}

export default function OperationalSummary() {
  const { progress, statuses, topAreas } = OPERATIONAL
  return (
    <section className="b-card b-op">
      <div className="b-card-head">
        <span className="b-card-title">Operational Summary</span>
        <div className="b-head-actions">
          <button className="b-selector" type="button">This Month <IconChevronDown size={14} /></button>
          <button className="b-iconbtn" type="button" aria-label="More"><IconMore size={18} /></button>
        </div>
      </div>
      <div className="b-card-body">
        <div className="b-opgrid">
          <div className="b-donut-wrap">
            <span className="b-donut-label">Overall Progress</span>
            <Donut pct={progress} />
          </div>

          <div className="b-op-status">
            {statuses.map(s => {
              const Icon = STATUS_ICON[s.key]
              return (
                <div key={s.key} className="b-op-item">
                  <div className="b-op-item-top">
                    <span style={{ color: TONE[s.tone], display: 'flex' }}><Icon size={18} /></span>
                    <span className="nm">{s.label}</span>
                    <span className="ct">{s.count}</span>
                    <span className="pc" style={{ color: TONE[s.tone] }}>{s.pct}%</span>
                  </div>
                  <div className="b-op-bar"><span style={{ width: `${s.pct}%`, background: TONE[s.tone] }} /></div>
                </div>
              )
            })}
          </div>

          <div className="b-toparea-col">
            <div className="b-toparea-title">Top Areas</div>
            {topAreas.map(a => {
              const Icon = AREA_ICON[a.icon]
              return (
                <div key={a.key} className="b-toparea">
                  <span className="b-toparea-ico"><Icon size={16} /></span>
                  <span>
                    <div className="b-toparea-nm">{a.name}</div>
                    <div className="b-toparea-ct">{a.count} tasks</div>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
