/** Due This Week — three items with date tiles + footer link. Presentational. */
import { DUE_THIS_WEEK } from '../mock/bentoMock'
import { IconArrowRight } from '../icons'

export default function DueThisWeek() {
  return (
    <section className="b-card">
      <div className="b-card-head">
        <span className="b-card-title">Due This Week</span>
        <button className="b-viewall" type="button">View calendar</button>
      </div>
      <div className="b-card-body">
        {DUE_THIS_WEEK.map(d => (
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
      <div className="b-card-foot">
        <button className="b-foot-link" type="button">See all due items <IconArrowRight size={14} /></button>
      </div>
    </section>
  )
}
