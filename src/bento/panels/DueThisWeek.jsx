/** Due This Week — real task due dates in the next 7 days. Presentational. */
import { IconArrowRight } from '../icons'
import { StateNote, isNoteState } from './_state'

export default function DueThisWeek({ items, loading, error }) {
  const empty = !loading && !error && (!items || items.length === 0)
  const note = isNoteState(loading, error, empty)
  return (
    <section className="b-card">
      <div className="b-card-head">
        <span className="b-card-title">Due This Week</span>
        {!note && <button className="b-viewall" type="button">View calendar</button>}
      </div>
      <div className="b-card-body">
        {note
          ? <StateNote loading={loading} error={error} empty={empty} emptyText="Nothing due in the next 7 days." />
          : items.map(d => (
            <div key={d.id} className="b-due-row">
              <span className="b-due-date">
                <div className="b-due-day">{d.day}</div>
                <div className="b-due-mon">{d.mon}</div>
              </span>
              <span className="b-due-body">
                <div className="b-due-title">{d.title}</div>
                <div className="b-due-sub">{d.sub}</div>
              </span>
              <span className="b-due-chip">{d.chip}</span>
            </div>
          ))}
      </div>
      {!note && (
        <div className="b-card-foot">
          <button className="b-foot-link" type="button">See all due items <IconArrowRight size={14} /></button>
        </div>
      )}
    </section>
  )
}
