import { useState } from 'react'
import { StatusBadge, safeDate, formatFrequency, orNotAssigned, orDash, S } from './ServiceApplicabilityStates'

/*
 * P5 CP-4 — read-only Inactive HISTORY, collapsed by default. Shows a count and an
 * accessible expand/collapse toggle (aria-expanded). No restart / edit / approve
 * controls, no action column, no internal ids or row_version. Deterministic order
 * from the hook; the component never sorts or mutates rows.
 *
 * @param {{rows: Array<any>}} props  props.rows = hook historyRows (Inactive only)
 */
export default function ServiceApplicabilityHistory({ rows }) {
  const list = Array.isArray(rows) ? rows : []
  const [expanded, setExpanded] = useState(false)
  if (list.length === 0) return null

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded ? 'true' : 'false'}
        aria-controls="p5-sa-history-body"
        style={S2.toggle}
      >
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>{' '}
        Inactive history ({list.length})
      </button>

      {expanded && (
        <div id="p5-sa-history-body" style={{ overflowX: 'auto', marginTop: 6 }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th} scope="col">Service</th>
                <th style={S.th} scope="col">Status</th>
                <th style={S.th} scope="col">Effective From</th>
                <th style={S.th} scope="col">Effective To</th>
                <th style={S.th} scope="col">Frequency</th>
                <th style={S.th} scope="col">Registration</th>
                <th style={S.th} scope="col">Owner</th>
                <th style={S.th} scope="col">Updated At</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row, i) => (
                <tr key={(row && row.id) || i}>
                  <td style={S.td}>{orDash(row.service_label)}</td>
                  <td style={S.td}><StatusBadge status={row.status} /></td>
                  <td style={S.td}>{safeDate(row.effective_from)}</td>
                  <td style={S.td}>{safeDate(row.effective_to)}</td>
                  <td style={S.td}>{formatFrequency(row.frequency)}</td>
                  <td style={S.td}>{orNotAssigned(row.registration_label)}</td>
                  <td style={S.td}>{orNotAssigned(row.owner_name)}</td>
                  <td style={S.td}>{safeDate(row.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const S2 = {
  toggle: { background: 'transparent', border: 'none', color: '#0A3D2C', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 0' },
}
