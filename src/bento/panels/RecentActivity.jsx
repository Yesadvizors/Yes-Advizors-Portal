/** Recent Activity — real activity source only. No safe non-admin activity/audit
 *  source exists in V2 dev, so this shows an explicit empty state (never
 *  fabricated). Dependency recorded in DASHBOARD_DATA_SOURCES.md. Presentational. */
import { IconCheckCircle, IconUpload, IconClock, IconUsers } from '../icons'
import { StateNote, isNoteState } from './_state'

const ICON = { check: IconCheckCircle, upload: IconUpload, clock: IconClock, users: IconUsers }
const TINT = {
  green: { c: 'var(--b-green)', bg: 'var(--b-green-tint)' },
  blue: { c: 'var(--b-blue)', bg: 'var(--b-blue-tint)' },
  amber: { c: 'var(--b-amber)', bg: 'var(--b-amber-tint)' },
}

export default function RecentActivity({ items, loading, error }) {
  const empty = !loading && !error && (!items || items.length === 0)
  const note = isNoteState(loading, error, empty)
  return (
    <section className="b-card">
      <div className="b-card-head">
        <span className="b-card-title">Recent Activity</span>
        {!note && <button className="b-viewall" type="button">View all</button>}
      </div>
      <div className="b-card-body">
        {note
          ? <StateNote loading={loading} error={error} empty={empty} emptyText="No activity feed available yet." />
          : items.map(a => {
            const Icon = ICON[a.icon] || IconClock; const t = TINT[a.tone] || TINT.green
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
