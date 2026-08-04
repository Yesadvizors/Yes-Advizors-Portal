/** Attention Needed — pale-red panel, four rows. Presentational. */
import { ATTENTION } from '../mock/bentoMock'
import { IconAlertTri, IconChevronRight } from '../icons'

export default function AttentionNeeded() {
  return (
    <section className="b-card b-attention">
      <div className="b-card-head">
        <span className="b-card-title"><IconAlertTri size={18} /> Attention Needed</span>
        <button className="b-viewall" type="button">View all</button>
      </div>
      <div className="b-card-body">
        {ATTENTION.map(a => (
          <button key={a.id} className="b-attn-row" type="button">
            <span className="b-attn-dot" />
            <span className="b-attn-body">
              <span className="b-attn-title">{a.title}</span>
              <span className="b-attn-sub">{a.sub}</span>
            </span>
            <span className="b-attn-chev"><IconChevronRight size={16} /></span>
          </button>
        ))}
      </div>
    </section>
  )
}
