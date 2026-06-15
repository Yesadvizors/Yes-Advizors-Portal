import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Overlay, Field, Row, Actions, inp, errBox, btnPrimary, btnGhost } from './DINHolderModal'

// Link a DIN holder to an existing company via dkyc_link_holder_to_company.
// Client list is read from public.clients (existing RLS allows authenticated
// SELECT of id/client_id/name). No access to din_holder_companies or
// director_kyc_records from the frontend.

const ERR_TEXT = {
  FORBIDDEN_ROLE:    'You do not have permission to link companies.',
  NO_ACTOR_IDENTITY: 'Your account is not linked for Director KYC actions yet.',
  HOLDER_NOT_FOUND:  'That DIN holder could not be found.',
  CLIENT_NOT_FOUND:  'That company could not be found.',
  LINK_ALREADY_EXISTS: 'This holder is already linked to that company.',
}

export default function CompanyLinkModal({ holder, onClose, onSaved }) {
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [relationship, setRelationship] = useState('Director')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('id, client_id, name')
      .eq('is_draft', false)
      .order('name')
    if (error) { setErr('Could not load companies: ' + error.message); setClients([]); setLoading(false); return }
    setClients(data || [])
    setLoading(false)
  }

  async function save() {
    setErr(''); setSaving(true)
    const { data, error } = await supabase.rpc('dkyc_link_holder_to_company', {
      p_din_holder_id: holder.id,
      p_client_id: clientId,
      p_relationship: relationship || 'Director',
      p_appointment_date: appointmentDate || null,
    })
    setSaving(false)
    if (error) { setErr(error.message || 'Could not link the company.'); return }
    if (data && data.ok === false) { setErr(ERR_TEXT[data.error] || data.error || 'Could not link the company.'); return }
    onSaved()
  }

  const canSave = !!clientId && !saving

  return (
    <Overlay title={`Link company — ${holder.name}`} onClose={onClose}>
      <Field label="Company" required>
        {loading
          ? <div style={{ fontSize: 13, color: 'var(--gray2)' }}>Loading companies…</div>
          : (
            <select value={clientId} onChange={e => setClientId(e.target.value)} style={inp()}>
              <option value="">Select a company…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.client_id})</option>)}
            </select>
          )}
      </Field>
      <Row>
        <Field label="Relationship">
          <select value={relationship} onChange={e => setRelationship(e.target.value)} style={inp()}>
            <option>Director</option><option>Designated Partner</option><option>Other</option>
          </select>
        </Field>
        <Field label="Appointment date">
          <input type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} style={inp()} />
        </Field>
      </Row>

      {err && <div style={errBox}>{err}</div>}

      <Actions>
        <button onClick={onClose} style={btnGhost}>Cancel</button>
        <button onClick={save} disabled={!canSave} style={{ ...btnPrimary, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Linking…' : 'Link company'}
        </button>
      </Actions>
    </Overlay>
  )
}
