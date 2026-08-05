/** Team Workload — real team members + utilisation. Presentational. */
import { StateNote, isNoteState } from './_state'

const BAR = { 'green-strong': '#157A39', green: 'var(--b-green)', amber: 'var(--b-amber)', blue: 'var(--b-blue)' }
const initials = (n) => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

export default function TeamWorkload({ team, loading, error }) {
  const empty = !loading && !error && (!team || team.length === 0)
  const note = isNoteState(loading, error, empty)
  return (
    <section className="b-card">
      <div className="b-card-head">
        <span className="b-card-title">Team Workload</span>
        {!note && <button className="b-viewall" type="button">View all</button>}
      </div>
      <div className="b-card-body">
        {note
          ? <StateNote loading={loading} error={error} empty={empty} emptyText="No active team members." />
          : team.map(m => (
            <div key={m.id} className="b-team-row">
              <span className="b-team-av">{initials(m.name)}</span>
              <span className="b-team-meta">
                <div className="b-team-name">{m.name}</div>
                <div className="b-team-role">{m.role}</div>
              </span>
              <span className="b-team-right">
                <div className="b-team-pct">{m.pct}%</div>
                <div className="b-team-bar"><span style={{ width: `${m.pct}%`, background: BAR[m.tone] }} /></div>
              </span>
            </div>
          ))}
      </div>
    </section>
  )
}
