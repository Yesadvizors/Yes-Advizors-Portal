/** Quick Actions — 2×4 grid of eight action tiles. Presentational. */
import { QUICK_ACTIONS } from '../mock/bentoMock'
import { IconUserPlus, IconPlusSquare, IconUpload, IconTimer, IconCalendar, IconChart, IconNote, IconRequestDoc } from '../icons'

const ICON = {
  'user-plus': IconUserPlus, plus: IconPlusSquare, upload: IconUpload, timer: IconTimer,
  calendar: IconCalendar, chart: IconChart, note: IconNote, request: IconRequestDoc,
}

export default function QuickActions({ onAction }) {
  return (
    <section className="b-card">
      <div className="b-card-head">
        <span className="b-card-title">Quick Actions</span>
      </div>
      <div className="b-card-body">
        <div className="b-qa-grid">
          {QUICK_ACTIONS.map(a => {
            const Icon = ICON[a.icon]
            return (
              <button key={a.key} className="b-qa" type="button" onClick={() => onAction?.(a.key)}>
                <span className="b-qa-ico"><Icon size={20} /></span>
                <span className="b-qa-label">{a.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
