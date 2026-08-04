/** Recent Activity — four entries with coloured circular icons. Presentational. */
import { ACTIVITY } from '../mock/bentoMock'
import { IconCheckCircle, IconUpload, IconClock, IconUsers } from '../icons'

const ICON = { check: IconCheckCircle, upload: IconUpload, clock: IconClock, users: IconUsers }
const TINT = {
  green: { c: 'var(--b-green)', bg: 'var(--b-green-tint)' },
  blue: { c: 'var(--b-blue)', bg: 'var(--b-blue-tint)' },
  amber: { c: 'var(--b-amber)', bg: 'var(--b-amber-tint)' },
}

export default function RecentActivity() {
  return (
    <section className="b-card">
      <div className="b-card-head">
        <span className="b-card-title">Recent Activity</span>
        <button className="b-viewall" type="button">View all</button>
      </div>
      <div className="b-card-body">
        {ACTIVITY.map(a => {
          const Icon = ICON[a.icon]; const t = TINT[a.tone]
          return (
            <div key={a.id} className="b-act-row">
              <span className="b-act-ico" style={{ '--b-act-color': t.c, '--b-act-tint': t.bg }}><Icon size={17} /></span>
              <span className="b-act-body">
                <div className="b-act-title">{a.title}</div>
                <div className="b-act-sub">{a.sub}</div>
              </span>
              <span className="b-act-time">{a.time}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
