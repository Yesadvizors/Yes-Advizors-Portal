import { ReadSection, yesno } from '../ClientMasterPreview'
import { readPersons } from '../../../services/clientMasterReads'
import { fmtDate } from '../../../helpers'

// Read-only. No Aadhaar column is projected or shown (verified 0015).
const columns = [
  { key: 'person_type', label: 'Type' },
  { key: 'full_name', label: 'Name' },
  { key: 'designation', label: 'Designation' },
  { key: 'pan', label: 'PAN' },
  { key: 'din', label: 'DIN' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'is_primary_contact', label: 'Primary', render: (r) => yesno(r.is_primary_contact) },
  { key: 'appointment_date', label: 'Appointed', render: (r) => (r.appointment_date ? fmtDate(r.appointment_date) : null) },
  { key: 'cessation_date', label: 'Ceased', render: (r) => (r.cessation_date ? fmtDate(r.cessation_date) : null) },
  { key: 'is_active', label: 'Active', render: (r) => yesno(r.is_active) },
  { key: 'row_version', label: 'Ver' },
]

export default function PersonsSection({ clientId }) {
  return (
    <ReadSection
      title="A · Persons"
      clientId={clientId}
      load={readPersons}
      columns={columns}
      emptyLabel="No person records for this client."
    />
  )
}
