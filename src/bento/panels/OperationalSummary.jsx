/** Operational Summary — donut + status bars + Top Areas from real task/compliance
 *  data. Presentational (all figures supplied via props). */
import { IconCheckCircle, IconClock, IconCircle, IconMore, IconChevronDown, IconRupee, IconFile, IconBuilding, IconShield, IconGrid } from '../icons'
import { StateNote, isNoteState } from './_state'

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

export default function OperationalSummary({ operational, loading, error }) {
  const note = isNoteState(loading, error, false)
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
        {note ? (
          <StateNote loading={loading} error={error} emptyText="" />
        ) : (
          <div className="b-opgrid">
            <div className="b-donut-wrap">
              <span className="b-donut-label">Overall Progress</span>
              <Donut pct={operational.progress} />
            </div>
            <div className="b-op-status">
              {operational.statuses.map(st => {
                const Icon = STATUS_ICON[st.key]
                return (
                  <div key={st.key} className="b-op-item">
                    <div className="b-op-item-top">
                      <span style={{ color: TONE[st.tone], display: 'flex' }}><Icon size={18} /></span>
                      <span className="nm">{st.label}</span>
                      <span className="ct">{st.count}</span>
                      <span className="pc" style={{ color: TONE[st.tone] }}>{st.pct}%</span>
                    </div>
                    <div className="b-op-bar"><span style={{ width: `${st.pct}%`, background: TONE[st.tone] }} /></div>
                  </div>
                )
              })}
            </div>
            <div className="b-toparea-col">
              <div className="b-toparea-title">Top Areas</div>
              {operational.topAreas.length === 0
                ? <div className="b-toparea-ct">No compliance areas.</div>
                : operational.topAreas.map(a => {
                  const Icon = AREA_ICON[a.icon] || IconGrid
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
        )}
      </div>
    </section>
  )
}
