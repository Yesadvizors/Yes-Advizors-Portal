/** Shared loading/error/empty body for data-driven panels (preserves the card
 *  header/structure; never shows raw errors). Returns null when content should
 *  render instead. */
export function StateNote({ loading, error, empty, emptyText }) {
  if (loading) return <div className="b-panel-note">Loading…</div>
  if (error) return <div className="b-panel-note">Couldn’t load — please retry.</div>
  if (empty) return <div className="b-panel-note">{emptyText}</div>
  return null
}
export const isNoteState = (loading, error, empty) => !!(loading || error || empty)
