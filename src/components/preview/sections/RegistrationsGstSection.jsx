import { useState, useEffect } from 'react'
import { Card, TableView, Muted, Err, yesno } from '../ClientMasterPreview'
import { readRegistrations, readGstDetails } from '../../../services/clientMasterReads'
import { fmtDate } from '../../../helpers'

/*
 * F · Registrations and G · GST detail. Registrations load first; GST detail loads
 * by registration_id (gst_registration_details has no client_id). The two loads are
 * tracked independently — a GST failure still shows the registrations, and vice
 * versa. Read-only.
 */
const regCols = [
  { key: 'reg_type', label: 'Type' },
  { key: 'jurisdiction', label: 'Jurisdiction' },
  { key: 'reg_number', label: 'Number' },
  { key: 'status', label: 'Status' },
  { key: 'effective_from', label: 'From', render: (r) => (r.effective_from ? fmtDate(r.effective_from) : null) },
  { key: 'effective_to', label: 'To', render: (r) => (r.effective_to ? fmtDate(r.effective_to) : null) },
  { key: 'registered_on', label: 'Registered', render: (r) => (r.registered_on ? fmtDate(r.registered_on) : null) },
  { key: 'is_active', label: 'Active', render: (r) => yesno(r.is_active) },
  { key: 'row_version', label: 'Ver' },
]
const gstCols = [
  { key: 'registration_id', label: 'Registration' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'state_code', label: 'State' },
  { key: 'filing_frequency', label: 'Filing' },
  { key: 'composition', label: 'Composition', render: (r) => yesno(r.composition) },
  { key: 'registration_date', label: 'Reg. date', render: (r) => (r.registration_date ? fmtDate(r.registration_date) : null) },
  { key: 'cancellation_date', label: 'Cancelled', render: (r) => (r.cancellation_date ? fmtDate(r.cancellation_date) : null) },
  { key: 'row_version', label: 'Ver' },
]

export default function RegistrationsGstSection({ clientId }) {
  const [reg, setReg] = useState({ loading: true, error: null, rows: [] })
  const [gst, setGst] = useState({ loading: true, error: null, rows: [] })

  useEffect(() => {
    let alive = true
    setReg({ loading: true, error: null, rows: [] })
    setGst({ loading: true, error: null, rows: [] })
    Promise.resolve(readRegistrations(clientId))
      .then(({ data, error }) => {
        if (!alive) return
        if (error) {
          setReg({ loading: false, error: error.message || String(error), rows: [] })
          setGst({ loading: false, error: 'Registrations did not load.', rows: [] })
          return
        }
        const rows = data || []
        setReg({ loading: false, error: null, rows })
        Promise.resolve(readGstDetails(rows.map((r) => r.id)))
          .then(({ data: g, error: ge }) => {
            if (!alive) return
            setGst(ge
              ? { loading: false, error: ge.message || String(ge), rows: [] }
              : { loading: false, error: null, rows: g || [] })
          })
          .catch((e) => { if (alive) setGst({ loading: false, error: e?.message || String(e), rows: [] }) })
      })
      .catch((e) => {
        if (!alive) return
        setReg({ loading: false, error: e?.message || String(e), rows: [] })
        setGst({ loading: false, error: 'Registrations did not load.', rows: [] })
      })
    return () => { alive = false }
  }, [clientId])

  return (
    <>
      <Card title="F · Registrations" count={reg.loading || reg.error ? undefined : reg.rows.length}>
        {reg.loading ? <Muted>Loading…</Muted>
          : reg.error ? <Err>{reg.error}</Err>
            : reg.rows.length === 0 ? <Muted>No registration records for this client.</Muted>
              : <TableView columns={regCols} rows={reg.rows} />}
      </Card>
      <Card title="G · GST Registration Detail" count={gst.loading || gst.error ? undefined : gst.rows.length}>
        {gst.loading ? <Muted>Loading…</Muted>
          : gst.error ? <Err>{gst.error}</Err>
            : gst.rows.length === 0 ? <Muted>No GST detail for this client.</Muted>
              : <TableView columns={gstCols} rows={gst.rows} />}
      </Card>
    </>
  )
}
