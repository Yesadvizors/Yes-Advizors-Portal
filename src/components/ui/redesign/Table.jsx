/**
 * Table — presentational, responsive. Collapses to stacked cards under 560px
 * (via `.is-stacky`). columns: [{ key, header, align, render, cellClass }].
 * On mobile each cell shows its column header via data-label.
 */
export function Table({ columns, rows, rowKey = (r, i) => i, onRowClick, stacky = true, empty }) {
  if (!rows || rows.length === 0) {
    return <div className="rd-table-wrap"><div className="rd-state"><div className="rd-state-title">{empty?.title || 'Nothing to show'}</div>{empty?.desc && <div className="rd-state-desc">{empty.desc}</div>}</div></div>
  }
  return (
    <div className="rd-table-wrap">
      <table className={`rd-table${stacky ? ' is-stacky' : ''}`}>
        <thead>
          <tr>{columns.map(c => <th key={c.key} style={c.align === 'right' ? { textAlign: 'right' } : undefined}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              className={onRowClick ? 'rd-table-row-click' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map(c => (
                <td
                  key={c.key}
                  data-label={c.header}
                  className={[c.align === 'right' && 'rd-td-num', c.cellClass].filter(Boolean).join(' ') || undefined}
                >
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
