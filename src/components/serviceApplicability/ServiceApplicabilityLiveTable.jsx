import { StatusBadge, NotesCell, safeDate, formatFrequency, orNotAssigned, orDash, S } from './ServiceApplicabilityStates'

/*
 * P5 CP-4 — read-only LIVE table (Draft + Approved rows). Renders only the safe
 * business fields already derived by CP-3 (service_label / owner_name /
 * registration_label). No internal ids, no row_version, no actor UUIDs, no action
 * column, no mutation controls. Rows are shown in the hook's deterministic order —
 * the component never sorts or mutates them.
 *
 * @param {{rows: Array<any>}} props  props.rows = hook liveRows (Draft/Approved only)
 */
export default function ServiceApplicabilityLiveTable({ rows }) {
  const list = Array.isArray(rows) ? rows : []
  // Effective To is only meaningful when present; show the column only if some row has it.
  const showEffectiveTo = list.some((r) => r && r.effective_to)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th} scope="col">Service</th>
            <th style={S.th} scope="col">Status</th>
            <th style={S.th} scope="col">Effective From</th>
            {showEffectiveTo && <th style={S.th} scope="col">Effective To</th>}
            <th style={S.th} scope="col">Frequency</th>
            <th style={S.th} scope="col">Registration</th>
            <th style={S.th} scope="col">Owner</th>
            <th style={S.th} scope="col">Notes</th>
            <th style={S.th} scope="col">Updated At</th>
          </tr>
        </thead>
        <tbody>
          {list.map((row, i) => (
            <tr key={(row && row.id) || i}>
              <td style={S.td}>{orDash(row.service_label)}</td>
              <td style={S.td}><StatusBadge status={row.status} /></td>
              <td style={S.td}>{safeDate(row.effective_from)}</td>
              {showEffectiveTo && <td style={S.td}>{safeDate(row.effective_to)}</td>}
              <td style={S.td}>{formatFrequency(row.frequency)}</td>
              <td style={S.td}>{orNotAssigned(row.registration_label)}</td>
              <td style={S.td}>{orNotAssigned(row.owner_name)}</td>
              <td style={S.td}><NotesCell text={row.notes} /></td>
              <td style={S.td}>{safeDate(row.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
