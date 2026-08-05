/** Attention Needed — pale-red panel, real actionable signals. Presentational. */
import { IconAlertTri, IconChevronRight } from '../icons'
import { StateNote, isNoteState } from './_state'

export default function AttentionNeeded({ items, loading, error }) {
  const empty = !loading && !error && (!items || items.length === 0)
  const note = isNoteState(loading, error, empty)
  return (
    <section className="b-card b-attention">
      <div className="b-card-head">
        <span className="b-card-title"><IconAlertTri size={18} /> Attention Needed</span>
        {!note && <button className="b-viewall" type="button">View all</button>}
      </div>
      <div className="b-card-body">
        {note
          ? <StateNote loading={loading} error={error} empty={empty} emptyText="All clear — nothing needs attention." />
          : items.map(a => (
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
