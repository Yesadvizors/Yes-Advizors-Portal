import { ReadSection, yesno } from '../ClientMasterPreview'
import { readAddresses } from '../../../services/clientMasterReads'
import { fmtDate } from '../../../helpers'

const columns = [
  { key: 'address_type', label: 'Type' },
  { key: 'line1', label: 'Line 1' },
  { key: 'line2', label: 'Line 2' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'pincode', label: 'Pincode' },
  { key: 'is_primary', label: 'Primary', render: (r) => yesno(r.is_primary) },
  { key: 'effective_from', label: 'From', render: (r) => (r.effective_from ? fmtDate(r.effective_from) : null) },
  { key: 'effective_to', label: 'To', render: (r) => (r.effective_to ? fmtDate(r.effective_to) : null) },
  { key: 'is_active', label: 'Active', render: (r) => yesno(r.is_active) },
  { key: 'row_version', label: 'Ver' },
]

export default function AddressesSection({ clientId }) {
  return (
    <ReadSection
      title="D · Addresses"
      clientId={clientId}
      load={readAddresses}
      columns={columns}
      emptyLabel="No address records for this client."
    />
  )
}
