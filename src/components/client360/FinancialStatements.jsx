import { useMemo, useState } from 'react'
import {
  inr, hasStructuredValues, BALANCE_SHEET, PROFIT_AND_LOSS, byFy,
} from '../../lib/financialStatements'

/**
 * Client 360 → Financials → structured Balance Sheet / P&L.
 * PRESENTATIONAL: consumes client_financials rows (from useClient360Data). Renders a
 * professional accounting layout with FY selector + prior-year comparison WHEN real
 * structured data exists; otherwise an HONEST "not yet available" state. Never fabricates
 * values — a missing field shows a dash. Source documents live in the sibling readiness table.
 */
export default function FinancialStatements({ panel }) {
  const rows = panel?.rows || []
  const { list, byLabel } = useMemo(() => byFy(rows), [rows])
  const fyList = list.map(r => r.fy_label)
  const [fy, setFy] = useState(fyList[0] || '')
  const current = byLabel[fy] || list[0] || null

  // prior FY = the next-oldest label after the selected one
  const priorLabel = fyList[fyList.indexOf(current?.fy_label) + 1]
  const prior = priorLabel ? byLabel[priorLabel] : null

  if (panel?.loading) return <div style={S.muted}>Loading financial statements…</div>
  if (panel?.error) return <div style={S.error}>Financial statements could not be loaded.</div>

  const structured = current && hasStructuredValues(current)

  if (!structured) {
    return (
      <div style={S.emptyWrap} role="note">
        <div style={S.emptyTitle}>Structured Balance Sheet & P&amp;L data is not yet available</div>
        <div style={S.emptyCopy}>
          No reviewed structured financial values exist for this client yet. Once audited financial
          statements are uploaded and reviewed (extraction populates <code>client_financials</code>),
          the Balance Sheet and Profit &amp; Loss will appear here. Until then, use the source-document
          readiness below to see which financial documents are available or missing.
        </div>
      </div>
    )
  }

  const val = (row, key) => (row ? inr(row[key]) : null)

  return (
    <div>
      <div style={S.head}>
        <div style={S.title}>Financial Statements</div>
        <label style={S.fyLabel}>
          Financial Year&nbsp;
          <select value={fy} onChange={e => setFy(e.target.value)} style={S.fySelect}>
            {fyList.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
      </div>
      {current.reviewed === false && <div style={S.warn}>These values are extracted but not yet reviewed — treat as provisional.</div>}

      <StatementTable
        heading="Balance Sheet"
        currentLabel={current.fy_label}
        priorLabel={prior?.fy_label}
        rows={BALANCE_SHEET.flatMap(g => [{ section: g.section }, ...g.lines])}
        cur={current} prior={prior} val={val}
      />

      <StatementTable
        heading="Profit &amp; Loss"
        currentLabel={current.fy_label}
        priorLabel={prior?.fy_label}
        rows={PROFIT_AND_LOSS}
        cur={current} prior={prior} val={val}
      />
    </div>
  )
}

function StatementTable({ heading, currentLabel, priorLabel, rows, cur, prior, val }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={S.stmtHead} dangerouslySetInnerHTML={{ __html: heading }} />
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}> </th>
            <th style={{ ...S.th, textAlign: 'right' }}>{currentLabel}</th>
            {priorLabel && <th style={{ ...S.th, textAlign: 'right' }}>{priorLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            if (r.section) return (
              <tr key={`s${i}`}><td colSpan={priorLabel ? 3 : 2} style={S.sectionRow}>{r.section}</td></tr>
            )
            const emphasis = r.grandTotal ? S.grand : r.subtotal || r.total ? S.subtotal : null
            return (
              <tr key={r.key || `l${i}`}>
                <td style={{ ...S.cell, ...(r.indent ? S.indent : null), ...emphasis }}>{r.label}</td>
                <td style={{ ...S.cellNum, ...emphasis }}>{r.key ? (val(cur, r.key) ?? '—') : ''}</td>
                {priorLabel && <td style={{ ...S.cellNum, ...emphasis }}>{r.key ? (val(prior, r.key) ?? '—') : ''}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const S = {
  muted: { fontSize: 12.5, color: '#6B7280', padding: '14px 0' },
  error: { fontSize: 12.5, color: '#B91C1C', padding: '14px 0' },
  emptyWrap: { border: '1px dashed #D6DBD6', borderRadius: 10, background: '#FAFCFB', padding: '18px 16px' },
  emptyTitle: { fontSize: 13.5, fontWeight: 700, color: '#13241D', marginBottom: 6 },
  emptyCopy: { fontSize: 12.5, color: '#6B7280', lineHeight: 1.55 },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 14, fontWeight: 700, color: '#13241D' },
  fyLabel: { fontSize: 12, color: '#6B7280' },
  fySelect: { padding: '6px 10px', border: '1px solid #D6DBD6', borderRadius: 8, fontSize: 12.5, background: '#fff' },
  warn: { fontSize: 11.5, color: '#92722A', background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 10px', marginBottom: 12 },
  stmtHead: { fontSize: 12, fontWeight: 700, color: '#0A3D2C', textTransform: 'uppercase', letterSpacing: '.5px', margin: '4px 0 6px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: 10.5, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', padding: '6px 10px', borderBottom: '1.5px solid #E2E5E1', textAlign: 'left' },
  sectionRow: { fontSize: 10.5, fontWeight: 800, color: '#374151', letterSpacing: '.5px', padding: '10px 10px 4px', textTransform: 'uppercase' },
  cell: { fontSize: 12.5, color: '#374151', padding: '5px 10px', borderBottom: '1px solid #F0F2EF' },
  cellNum: { fontSize: 12.5, color: '#13241D', padding: '5px 10px', borderBottom: '1px solid #F0F2EF', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  indent: { paddingLeft: 24, color: '#4B5563' },
  subtotal: { fontWeight: 700, color: '#13241D' },
  total: { fontWeight: 700 },
  grand: { fontWeight: 800, color: '#0A3D2C', borderTop: '1.5px solid #CBD5CF' },
}
