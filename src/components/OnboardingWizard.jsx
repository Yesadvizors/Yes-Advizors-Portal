import { useState } from 'react'
import { supabase } from '../supabase'
import { CLIENT_TYPES, TEAM } from '../helpers'

const SERVICES = [
  'GST Registration', 'GST Return Filing', 'Income Tax Return', 'TDS Return Filing',
  'Tax Audit', 'Statutory Audit', 'ROC / MCA Compliance', 'Accounting / Bookkeeping',
  'Payroll Processing', 'Company Incorporation', 'Trademark Registration', 'Advisory / Consulting'
]
const STATES = ['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal','Other']

export default function OnboardingWizard({ user, onClose, onSaved }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [f, setF] = useState({
    name: '', client_type: '', pan: '', gstin: '', tan: '', cin: '', date_of_incorporation: '',
    mobile: '', email: '', secondary_email: '', contact_person: '', contact_designation: '',
    address: '', city: '', state: '', pincode: '',
    directors: [], services: [], bank_name: '', bank_account: '',
    engagement_start: new Date().toISOString().split('T')[0], notes: ''
  })

  const set = (k, v) => setF({ ...f, [k]: v })
  const isCompany = ['Company (Pvt Ltd)', 'LLP', 'OPC (One Person Company)'].includes(f.client_type)

  function addDirector() { set('directors', [...f.directors, { name: '', din: '', pan: '', mobile: '' }]) }
  function updateDirector(i, k, v) { const d = [...f.directors]; d[i][k] = v; set('directors', d) }
  function removeDirector(i) { set('directors', f.directors.filter((_, x) => x !== i)) }
  function toggleService(s) { set('services', f.services.includes(s) ? f.services.filter(x => x !== s) : [...f.services, s]) }

  function next() {
    setErr('')
    if (step === 1) {
      if (!f.name.trim()) { setErr('Business / full name is required'); return }
      if (!f.client_type) { setErr('Please select client type'); return }
      if (!f.mobile || !/^\d{10}$/.test(f.mobile)) { setErr('Enter valid 10-digit mobile'); return }
    }
    setStep(step + 1)
  }
  function back() { setErr(''); setStep(step - 1) }

  async function submit() {
    setSaving(true); setErr('')
    const clientId = 'YA-' + Date.now().toString().slice(-6)
    const payload = {
      client_id: clientId, name: f.name.trim(), client_type: f.client_type,
      pan: f.pan.toUpperCase() || null, gstin: f.gstin.toUpperCase() || null, tan: f.tan.toUpperCase() || null,
      cin: f.cin.toUpperCase() || null, date_of_incorporation: f.date_of_incorporation || null,
      mobile: f.mobile, email: f.email || null, secondary_email: f.secondary_email || null,
      contact_person: f.contact_person || null, contact_designation: f.contact_designation || null,
      address: f.address || null, city: f.city || null, state: f.state || null, pincode: f.pincode || null,
      directors: f.directors, services: f.services,
      bank_name: f.bank_name || null, bank_account: f.bank_account || null,
      engagement_start: f.engagement_start || null, notes: f.notes || null,
      status: 'Active', onboarded_by: user.name
    }
    const { error } = await supabase.from('clients').insert(payload)
    setSaving(false)
    if (error) { setErr('Error saving: ' + error.message); return }
    onSaved()
  }

  const steps = ['Business', 'Directors', 'Services', 'Bank & Contact', 'Review']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, marginTop: 20, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'var(--navy)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>New Client Onboarding</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 12px', overflowX: 'auto' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', borderBottom: step === i + 1 ? '2px solid var(--dkgreen)' : '2px solid transparent' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: step > i + 1 ? 'var(--dkgreen)' : step === i + 1 ? 'var(--dkgreen)' : 'var(--ltgray2)', color: step >= i + 1 ? '#fff' : 'var(--gray2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{step > i + 1 ? '✓' : i + 1}</div>
              <span style={{ fontSize: 12, fontWeight: step === i + 1 ? 600 : 400, color: step === i + 1 ? 'var(--dkgreen)' : 'var(--gray)' }}>{s}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 24, maxHeight: '55vh', overflowY: 'auto' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Inp label="Business / Full Name *" v={f.name} on={v => set('name', v)} ph="As per PAN / MCA records" />
              <Row>
                <Sel label="Client Type *" v={f.client_type} on={v => set('client_type', v)} opts={CLIENT_TYPES} />
                <Inp label="Mobile *" v={f.mobile} on={v => set('mobile', v)} max={10} />
              </Row>
              <Row>
                <Inp label="PAN" v={f.pan} on={v => set('pan', v.toUpperCase())} max={10} upper />
                <Inp label="GSTIN" v={f.gstin} on={v => set('gstin', v.toUpperCase())} max={15} upper />
              </Row>
              <Row>
                <Inp label="TAN" v={f.tan} on={v => set('tan', v.toUpperCase())} max={10} upper />
                {isCompany ? <Inp label="CIN" v={f.cin} on={v => set('cin', v.toUpperCase())} max={21} upper /> : <Inp label="Email" v={f.email} on={v => set('email', v)} />}
              </Row>
              {isCompany && <Row>
                <Inp label="Date of Incorporation" v={f.date_of_incorporation} on={v => set('date_of_incorporation', v)} type="date" />
                <Inp label="Email" v={f.email} on={v => set('email', v)} />
              </Row>}
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14 }}>
                {isCompany ? 'Add directors / partners of the entity.' : 'For individuals/proprietors, you can skip this step or add the proprietor details.'}
              </div>
              {f.directors.map((d, i) => (
                <div key={i} style={{ background: 'var(--ltgray)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dkgreen)' }}>{isCompany ? 'Director / Partner' : 'Person'} {i + 1}</span>
                    <button onClick={() => removeDirector(i)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                  </div>
                  <Row>
                    <Inp label="Name" v={d.name} on={v => updateDirector(i, 'name', v)} small />
                    <Inp label="DIN (if any)" v={d.din} on={v => updateDirector(i, 'din', v)} small />
                  </Row>
                  <div style={{ height: 8 }} />
                  <Row>
                    <Inp label="PAN" v={d.pan} on={v => updateDirector(i, 'pan', v.toUpperCase())} max={10} upper small />
                    <Inp label="Mobile" v={d.mobile} on={v => updateDirector(i, 'mobile', v)} max={10} small />
                  </Row>
                </div>
              ))}
              <button onClick={addDirector} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, background: 'var(--ltgreen)', color: 'var(--dkgreen)', border: '1px solid var(--green2)', borderRadius: 8, cursor: 'pointer' }}>+ Add {isCompany ? 'Director / Partner' : 'Person'}</button>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14 }}>Select the services Yes Advizors will provide for this client.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                {SERVICES.map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: `1px solid ${f.services.includes(s) ? 'var(--green2)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: f.services.includes(s) ? 'var(--ltgreen)' : '#fff' }}>
                    <input type="checkbox" checked={f.services.includes(s)} onChange={() => toggleService(s)} />
                    <span style={{ fontSize: 13, color: f.services.includes(s) ? 'var(--dkgreen)' : 'var(--navy2)', fontWeight: f.services.includes(s) ? 600 : 400 }}>{s}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Inp label="Registered Address" v={f.address} on={v => set('address', v)} />
              <Row>
                <Inp label="City" v={f.city} on={v => set('city', v)} />
                <Sel label="State" v={f.state} on={v => set('state', v)} opts={STATES} />
              </Row>
              <Row>
                <Inp label="Pincode" v={f.pincode} on={v => set('pincode', v)} max={6} />
                <Inp label="Contact Person" v={f.contact_person} on={v => set('contact_person', v)} />
              </Row>
              <Row>
                <Inp label="Bank Name" v={f.bank_name} on={v => set('bank_name', v)} />
                <Inp label="Bank A/C No." v={f.bank_account} on={v => set('bank_account', v)} />
              </Row>
              <Inp label="Engagement Start Date" v={f.engagement_start} on={v => set('engagement_start', v)} type="date" />
            </div>
          )}

          {step === 5 && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14 }}>Review the details before saving.</div>
              <div style={{ background: 'var(--ltgray)', borderRadius: 10, padding: 16, fontSize: 13 }}>
                <ReviewRow k="Name" v={f.name} />
                <ReviewRow k="Type" v={f.client_type} />
                <ReviewRow k="Mobile" v={'+91 ' + f.mobile} />
                <ReviewRow k="PAN" v={f.pan || '—'} />
                <ReviewRow k="GSTIN" v={f.gstin || '—'} />
                {f.tan && <ReviewRow k="TAN" v={f.tan} />}
                {isCompany && f.cin && <ReviewRow k="CIN" v={f.cin} />}
                <ReviewRow k="Email" v={f.email || '—'} />
                {f.directors.length > 0 && <ReviewRow k="Directors" v={f.directors.map(d => d.name).filter(Boolean).join(', ') || '—'} />}
                <ReviewRow k="Services" v={f.services.length ? f.services.join(', ') : '—'} />
                {f.city && <ReviewRow k="Location" v={[f.city, f.state].filter(Boolean).join(', ')} />}
                <ReviewRow k="Engagement" v={f.engagement_start} />
              </div>
            </div>
          )}

          {err && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 12 }}>{err}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={step === 1 ? onClose : back} style={{ padding: '9px 18px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: 'var(--gray)' }}>{step === 1 ? 'Cancel' : '← Back'}</button>
          {step < 5
            ? <button onClick={next} style={{ padding: '9px 22px', fontSize: 13, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Next →</button>
            : <button onClick={submit} disabled={saving} style={{ padding: '9px 22px', fontSize: 13, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{saving ? 'Saving...' : '✓ Save Client'}</button>}
        </div>
      </div>
    </div>
  )
}

const inpStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3, fontSize: 13, outline: 'none' }
function Row({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div> }
function Inp({ label, v, on, max, upper, type, ph, small }) {
  return <div style={{ flex: 1 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>{label}</label>
    <input value={v} onChange={e => on(e.target.value)} maxLength={max} type={type || 'text'} placeholder={ph || ''} style={{ ...inpStyle, textTransform: upper ? 'uppercase' : 'none', padding: small ? '7px 10px' : '9px 12px' }} /></div>
}
function Sel({ label, v, on, opts }) {
  return <div style={{ flex: 1 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>{label}</label>
    <select value={v} onChange={e => on(e.target.value)} style={inpStyle}><option value="">Select...</option>{opts.map(o => <option key={o}>{o}</option>)}</select></div>
}
function ReviewRow({ k, v }) { return <div style={{ display: 'flex', padding: '5px 0', borderBottom: '1px solid var(--border2)' }}><span style={{ width: 110, color: 'var(--gray2)', fontSize: 12 }}>{k}</span><span style={{ flex: 1, fontWeight: 500 }}>{v}</span></div> }
