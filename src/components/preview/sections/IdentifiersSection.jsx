import { ReadSection, yesno } from '../ClientMasterPreview'
import { readIdentifiers } from '../../../services/clientMasterReads'
import { maskIdValue } from '../../../lib/clientMaster'
import { fmtDate } from '../../../helpers'

// id_value is masked to the last four characters only — never rendered in full,
// and with no copy action, raw tooltip, or expandable raw data. Type/status/active
// are preserved. (Aadhaar identifier types are excluded by the D2b server contract.)
const columns = [
  { key: 'id_type', label: 'Type' },
  { key: 'id_value', label: 'Value (masked)', render: (r) => maskIdValue(r.id_value) },
  { key: 'issued_on', label: 'Issued', render: (r) => (r.issued_on ? fmtDate(r.issued_on) : null) },
  { key: 'status', label: 'Status' },
  { key: 'is_active', label: 'Active', render: (r) => yesno(r.is_active) },
  { key: 'row_version', label: 'Ver' },
]

export default function IdentifiersSection({ clientId }) {
  return (
    <ReadSection
      title="B · Identifiers"
      clientId={clientId}
      load={readIdentifiers}
      columns={columns}
      emptyLabel="No identifier records for this client."
    />
  )
}
