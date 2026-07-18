import { ReadSection, yesno } from '../ClientMasterPreview'
import { readContacts } from '../../../services/clientMasterReads'

const columns = [
  { key: 'contact_type', label: 'Type' },
  { key: 'person_name', label: 'Name' },
  { key: 'designation', label: 'Designation' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'is_primary', label: 'Primary', render: (r) => yesno(r.is_primary) },
  { key: 'is_active', label: 'Active', render: (r) => yesno(r.is_active) },
  { key: 'row_version', label: 'Ver' },
]

export default function ContactsSection({ clientId }) {
  return (
    <ReadSection
      title="C · Contacts"
      clientId={clientId}
      load={readContacts}
      columns={columns}
      emptyLabel="No contact records for this client."
    />
  )
}
