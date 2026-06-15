import { useState } from 'react'
import { supabase } from '../supabase'

// Add a standalone DIN holder via the deployed dkyc_add_din_holder RPC.
// Admin/Manager only (server-enforced via dkyc_is_admin_or_manager()).

const ERR_TEXT = {
  FORBIDDEN_ROLE:    'You do not have permission to add DIN holders.',
  NO_ACTOR_IDENTITY: 'Your account is not linked for Director KYC actions yet.',
  INVALID_DIN:       'DIN must be exactly 8 digits.',
  NAME_REQUIRED:     'Full name is required.',
  DIN_ALREADY_EXISTS:'A holder with this DIN already exists.',
}

export default function DINHolderModal({ onClose, onSaved }) {
  const [f, setF] = useState({
    din: '', full_name: '', din_allotment_date: '', email: '', mobile: '',
    residential_address: '', dsc_expiry: '', dsc_status: 'Unknown',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setF(prev => ({ ...prev, [k]: v })) }

  const dinValid = /^[0-9]{8}$/.test(f.din.trim())
  const canSave = dinValid && f.full_name.trim().length > 0 && !saving

  async function save() {
    setErr(''); setSaving(true)
    const { data, error } = await supabase.rpc('dkyc_add_din_holder', {
      p_din: f.din.trim(),
      p_full_name: f.full_name.trim(),
      p_din_allotment_date: f.din_allotment_date || null,
      p_email: f.email.trim() || null,
      p_mobile: f.mobile.trim() || null,
      p_residential_address: f.residential_address.trim() || null,
      p_dsc_expiry: f.dsc_expiry || null,
      p_dsc_status: f.dsc_status || 'Unknown',
    })
    setSaving(false)
    if (error) { setErr(error.message || 'Could not save the holder.'); return }
    if (data && data.ok === false) { setErr(ERR_TEXT[data.error] || (data.detail || data.error || 'Could not save the holder.')); return }
    onSaved()
  }

  return (
    <Overlay onClose={onClose} title="Add DIN Holder">
      <Row>
        <Field label="DIN (8 digits)" required>
          <input value={f.din} onChange={e => set('din', e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
            inputMode="numeric" placeholder="12345678" style={inp(f.din && !dinValid)} />
          {f.din && !dinValid && <Hint error>DIN must be exactly 8 digits.</Hint>}
        </Field>
        <Field label="DIN allotment date">
          <input type="date" value={f.din_allotment_date} onChange={e => set('din_allotment_date', e.target.value)} style={inp()} />
        </Field>
      </Row>
      <Field label="Full name" required>
        <input value={f.full_name} onChange={e => set('full_name', e.target.value)} placeholder="As per DIN records" style={inp()} />
      </Field>
      <Row>
        <Field label="Email"><input value={f.email} onChange={e => set('email', e.target.value)} style={inp()} /></Field>
        <Field label="Mobile"><input value={f.mobile} onChange={e => set('mobile', e.target.value)} style={inp()} /></Field>
      </Row>
      <Field label="Residential address">
        <textarea value={f.residential_address} onChange={e => set('residential_address', e.target.value)} rows={2} style={{ ...inp(), resize: 'vertical' }} />
      </Field>
      <Row>
        <Field label="DSC expiry"><input type="date" value={f.dsc_expiry} onChange={e => set('dsc_expiry', e.target.value)} style={inp()} /></Field>
        <Field label="DSC status">
          <select value={f.dsc_status} onChange={e => set('dsc_status', e.target.value)} style={inp()}>
            <option>Unknown</option><option>Valid</option><option>Expired</option>
          </select>
        </Field>
      </Row>

      {err && <div style={errBox}>{err}</div>}

      <Actions>
        <button onClick={onClose} style={btnGhost}>Cancel</button>
        <button onClick={save} disabled={!canSave} style={{ ...btnPrimary, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Saving…' : 'Add holder'}
        </button>
      </Actions>
    </Overlay>
  )
}

/* ---- shared modal primitives (kept local to avoid touching shared files) ---- */
export function Overlay({ title, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, zIndex: 1000, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 560, padding: 24, marginTop: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--gray2)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
export function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14, flex: 1 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gray)', marginBottom: 5 }}>
        {label}{required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}
export function Row({ children }) { return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{children}</div> }
export function Actions({ children }) { return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>{children}</div> }
export function Hint({ error, children }) { return <div style={{ fontSize: 11, color: error ? 'var(--red)' : 'var(--gray2)', marginTop: 4 }}>{children}</div> }
export const inp = (bad) => ({ width: '100%', padding: '9px 11px', border: `1px solid ${bad ? 'var(--red)' : 'var(--border)'}`, borderRadius: 8, outline: 'none', fontSize: 14 })
export const errBox = { background: '#FEF2F2', color: 'var(--red)', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', fontSize: 13, margin: '6px 0 14px' }
export const btnPrimary = { background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600 }
export const btnGhost = { background: '#fff', color: 'var(--gray)', border: '1px solid var(--border)', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
