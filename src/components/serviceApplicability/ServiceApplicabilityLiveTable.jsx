import { StatusBadge, NotesCell, safeDate, formatFrequency, orNotAssigned, orDash, S } from './ServiceApplicabilityStates'
import { canEdit, canApprove, canDeactivate } from '../../lib/serviceApplicability'
import { W } from './ServiceApplicabilityModalShell'

/*
 * P5 CP-4/CP-5/CP-6 — LIVE table (Draft + Approved rows). Renders only the safe
 * business fields already derived by CP-3 (service_label / owner_name /
 * registration_label). No internal ids, no row_version, no actor UUIDs.
 *
 * The table itself performs NO writes: it renders per-row action buttons ONLY when the
 * matching callback prop is supplied by the section (which owns capability gating and
 * the modals), and only for the legal lifecycle transitions of each row:
 *   - Edit / Approve  → Draft only;  Deactivate → Draft or Approved.
 * The Actions column is shown only when at least one action callback is provided (so the
 * read-only mount stays a pure read-only table). Rows are shown in the hook's
 * deterministic order — the component never sorts or mutates them.
 *
 * @param {{rows: Array<any>, actions?: {onEdit?:Function, onApprove?:Function, onDeactivate?:Function}}} props
 */
export default function ServiceApplicabilityLiveTable({ rows, actions }) {
  const list = Array.isArray(rows) ? rows : []
  const a = actions || {}
  const hasActions = typeof a.onEdit === 'function' || typeof a.onApprove === 'function' || typeof a.onDeactivate === 'function'
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
            {hasActions && <th style={S.th} scope="col">Actions</th>}
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
              {hasActions && (
                <td style={S.td}>
                  <div style={W.actionsCell}>
                    {typeof a.onEdit === 'function' && canEdit(row) && (
                      <button type="button" style={W.rowAction} onClick={() => a.onEdit(row)}>Edit</button>
                    )}
                    {typeof a.onApprove === 'function' && canApprove(row) && (
                      <button type="button" style={W.rowAction} onClick={() => a.onApprove(row)}>Approve</button>
                    )}
                    {typeof a.onDeactivate === 'function' && canDeactivate(row) && (
                      <button type="button" style={W.rowActionDanger} onClick={() => a.onDeactivate(row)}>Deactivate</button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
