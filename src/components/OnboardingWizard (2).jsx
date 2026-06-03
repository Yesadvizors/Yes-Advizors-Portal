import { useState } from 'react'
import { supabase } from '../supabase'
import { ALL_CLIENT_TYPES, VALIDATORS, EXTRA_VALIDATORS, personConfig } from '../helpers'

export default function OnboardingWizard({ user, onClose, onSaved }) {
  const [done, setDone] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [f, setF] = useState({
    name: '', mobile: '', email: '', client_type: '', pan: '', gstin: '', tan: '',
    address: '', num_directors: 0, pf_no: '', esi_no: '', udyam_no: ''
  })
  const [directors, setDirectors] = useState([])
  const [activeDir, setActiveDir] = useState(0)

  const cfg = personConfig(f.client_type)
  const emptyDir = () => ({ name: '', din: '', email: '', mobile: '', pan: '', aadhaar: '', photo: null, photoName: '', panFile: null, panFileName: '', aadhaarFile: null, aadhaarFileName: '' })

  function fieldError(key, val) {
    switch (key) {
      case 'mobile': return VALIDATORS.mobile(val) === true ? null : VALIDATORS.mobile(val)
      case 'email': if (val && val.length > 40) return 'Email max 40 characters'; return VALIDATORS.email(val) === true ? null : VALIDATORS.email(val)
      case 'pan': return VALIDATORS.pan(val) === true ? null : VALIDATORS.pan(val)
      case 'gstin': return VALIDATORS.gstin(val) === true ? null : VALIDATORS.gstin(val)
      case 'tan': return VALIDATORS.tan(val) === true ? null : VALIDATORS.tan(val)
      case 'esi_no': return VALIDATORS.esi(val) === true ? null : VALIDATORS.esi(val)
      case 'udyam_no': return EXTRA_VALIDATORS.udyam(val) === true ? null : EXTRA_VALIDATORS.udyam(val)
      case 'pf_no': return EXTRA_VALIDATORS.pf(val) === true ? null : EXTRA_VALIDATORS.pf(val)
      default: return null
    }
  }
  function set(k, v) {
    setF(prev => ({ ...prev, [k]: v }))
    setErrors(prev => ({ ...prev, [k]: fieldError(k, v) }))
  }

  function setNumDirectors(n) {
    const num = Math.max(0, Math.min(5, parseInt(n) || 0))
    setF(prev => ({ ...prev, num_directors: num }))
    setDirectors(prev => {
      const arr = [...prev]
      if (num > arr.length) { for (let i = arr.length; i < num; i++) arr.push(emptyDir()) }
      else { arr.length = num }
      return arr
    })
    setActiveDir(0)
  }
  function addDirector() {
    if (directors.length >= 5) { alert('Maximum 5 allowed'); return }
    setDirectors(prev => { const arr = [...prev, emptyDir()]; setF(p => ({ ...p, num_directors: arr.length })); return arr })
  }
  function removeDirector(i) {
    setDirectors(prev => { const arr = prev.filter((_, x) => x !== i); setF(p => ({ ...p, num_directors: arr.length })); return arr })
  }
  function updateDir(i, k, v) {
    setDirectors(prev => { const d = [...prev]; d[i] = { ...d[i], [k]: v }; return d })
    let err = null
    if (k === 'pan') err = VALIDATORS.pan(v) === true ? null : VALIDATORS.pan(v)
    if (k === 'aadhaar') err = VALIDATORS.aadhaar(v) === true ? null : VALIDATORS.aadhaar(v)
    if (k === 'din') err = VALIDATORS.din(v) === true ? null : VALIDATORS.din(v)
    if (k === 'mobile') err = VALIDATORS.mobile(v) === true ? null : VALIDATORS.mobile(v)
    if (k === 'email') err = VALIDATORS.email(v) === true ? null : VALIDATORS.email(v)
    if (['pan', 'aadhaar', 'din', 'mobile', 'email'].includes(k)) setErrors(prev => ({ ...prev, ['dir' + i + k]: err }))
  }
  function uploadFile(i, field, nameField, file, imageOnly) {
    if (!file) return
    const ok = imageOnly ? ['image/jpeg', 'image/jpg', 'image/png'] : ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!ok.includes(file.type)) { alert(imageOnly ? 'Only JPG, JPEG, PNG allowed' : 'Only JPG, PNG, PDF allowed'); return }
    const reader = new FileReader()
    reader.onload = e => setDirectors(prev => { const d = [...prev]; d[i] = { ...d[i], [field]: e.target.result, [nameField]: file.name }; return d })
    reader.readAsDataURL(file)
  }

  function dirHeading(d, i) {
    if (d.name && d.name.trim()) return d.name.trim()
    return `${cfg.role} ${i + 1}`
  }

  function dataul_split(dataurl) {
    const [head, body] = dataurl.split(',')
    const mime = head.match(/:(.*?);/)[1]
    const bstr = atob(body)
    let n = bstr.length
    const u8 = new Uint8Array(n)
    while (n--) u8[n] = bstr.charCodeAt(n)
    return new Blob([u8], { type: mime })
  }
  async function uploadDirDoc(clientId, clientName, dataUrl, docType, personName) {
    if (!dataUrl) return
    try {
      const blob = dataul_split(dataUrl)
      const ext = blob.type === 'application/pdf' ? 'pdf' : blob.type.includes('png') ? 'png' : 'jpg'
      const safe = (docType + '_' + (personName || 'person')).replace(/[^a-zA-Z0-9]/g, '_')
      const path = `${clientId}/${safe}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('client-docs').upload(path, blob)
      if (upErr) return
      const { data: urlData } = supabase.storage.from('client-docs').getPublicUrl(path)
      await supabase.from('documents').insert({
        client_id: clientId, client_name: clientName, doc_type: docType + (personName ? ' — ' + personName : ''),
        doc_name: `${docType} (${personName || 'person'})`, file_path: path, file_url: urlData.publicUrl,
        file_size: blob.size, mime_type: blob.type, uploaded_by: user.name
      })
    } catch (e) { }
  }

  function validate() {
    const e = {}
    if (!f.name.trim()) e.name = 'Customer name is required'
    if (!f.mobile) e.mobile = 'Mobile is required'; else { const r = fieldError('mobile', f.mobile); if (r) e.mobile = r }
    if (!f.client_type) e.client_type = 'Select client type'
    ;['email', 'pan', 'gstin', 'tan', 'esi_no', 'udyam_no', 'pf_no'].forEach(k => { if (f[k]) { const r = fieldError(k, f[k]); if (r) e[k] = r } })
    directors.forEach((d, i) => {
      if (d.din) { const r = VALIDATORS.din(d.din); if (r !== true) e['dir' + i + 'din'] = r }
      if (d.pan) { const r = VALIDATORS.pan(d.pan); if (r !== true) e['dir' + i + 'pan'] = r }
      if (d.aadhaar) { const r = VALIDATORS.aadhaar(d.aadhaar); if (r !== true) e['dir' + i + 'aadhaar'] = r }
      if (d.mobile) { const r = VALIDATORS.mobile(d.mobile); if (r !== true) e['dir' + i + 'mobile'] = r }
      if (d.email) { const r = VALIDATORS.email(d.email); if (r !== true) e['dir' + i + 'email'] = r }
    })
    setErrors(e)
    return Object.keys(e).filter(k => e[k]).length === 0
  }

  async function submit(isDraft) {
    if (!isDraft && !validate()) { alert('Please fix the errors before submitting'); return }
    setSaving(true)
    const clientId = 'YA-' + Date.now().toString().slice(-6)
    const payload = {
      client_id: clientId, name: f.name.trim(), mobile: f.mobile, email: f.email || null,
      client_type: f.client_type, pan: f.pan.toUpperCase() || null, gstin: f.gstin.toUpperCase() || null,
      tan: f.tan.toUpperCase() || null, address: f.address || null,
      num_directors: directors.length, pf_no: f.pf_no || null, esi_no: f.esi_no || null, udyam_no: f.udyam_no || null,
      directors: directors.map(d => ({ name: d.name, din: d.din, email: d.email, mobile: d.mobile, pan: d.pan, aadhaar: d.aadhaar, role: cfg.role })),
      status: isDraft ? 'Draft' : 'Active', is_draft: isDraft, onboarded_by: user.name
    }
    const { error } = await supabase.from('clients').insert(payload)
    if (error) { setSaving(false); alert('Error: ' + error.message); return }
    for (const d of directors) {
      const pname = d.name || cfg.role
      if (d.photo) await uploadDirDoc(clientId, f.name.trim(), d.photo, 'Photo', pname)
      if (d.panFile) await uploadDirDoc(clientId, f.name.trim(), d.panFile, 'PAN Card', pname)
      if (d.aadhaarFile) await uploadDirDoc(clientId, f.name.trim(), d.aadhaarFile, 'Aadhaar Card', pname)
    }
    setSaving(false)
    if (isDraft) { alert('Draft saved'); onSaved(); return }
    setDone(payload)
  }

  function resetForm() {
    if (!confirm('Reset the entire form?')) return
    setF({ name: '', mobile: '', email: '', client_type: '', pan: '', gstin: '', tan: '', address: '', num_directors: 0, pf_no: '', esi_no: '', udyam_no: '' })
    setDirectors([]); setErrors({}); setActiveDir(0)
  }

  // SUCCESS SUMMARY
  if (done) {
    return (
      <Overlay maxWidth={560}>
        <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #ECFDF5, #A7F3D0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 36, color: 'var(--dkgreen)' }}>✓</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--dkgreen)' }}>Client onboarding completed</div>
          <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>All details and documents have been saved successfully.</div>
        </div>
        <div style={{ background: 'var(--ltgray)', borderRadius: 14, padding: 20, marginTop: 8 }}>
          <SumRow k="Customer Name" v={done.name} />
          <SumRow k="Client Type" v={done.client_type} />
          <SumRow k="PAN" v={done.pan || '—'} />
          <SumRow k="GSTIN" v={done.gstin || '—'} />
          <SumRow k={cfg.countLabel} v={done.num_directors} />
          <SumRow k="Mobile" v={'+91 ' + done.mobile} />
          <SumRow k="Email" v={done.email || '—'} />
          <SumRow k="Client ID" v={done.client_id} last />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onSaved} style={btnP}>Done</button>
        </div>
      </Overlay>
    )
  }

  const isCompanyOrLLP = ['Private Limited Company', 'Public Limited Company', 'Section 8 Company', 'LLP'].includes(f.client_type)

  return (
    <Overlay maxWidth={860}>
      {/* Header band */}
      <div style={{ background: 'linear-gradient(135deg, var(--navy), var(--navy2))', margin: -28, marginBottom: 0, padding: '22px 28px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#fff' }}>Client Onboarding</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Capture client, statutory & director details</div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', width: 34, height: 34, borderRadius: 8 }}>✕</button>
      </div>

      <div style={{ maxHeight: '64vh', overflowY: 'auto', padding: '24px 4px 4px' }}>
        {/* Section 1 — Client details */}
        <SectionCard icon="🏢" title="Client Details" subtitle="Basic and statutory information">
          <Grid>
            <Field label="Name of Customer" req err={errors.name}><input style={inp} value={f.name} onChange={e => set('name', e.target.value)} placeholder="As per PAN / MCA records" /></Field>
            <Field label="Client Type" req err={errors.client_type}><select style={inp} value={f.client_type} onChange={e => set('client_type', e.target.value)}><option value="">Select type...</option>{ALL_CLIENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
          </Grid>
          <Grid>
            <Field label="Mobile No." req err={errors.mobile}><input style={inp} value={f.mobile} onChange={e => set('mobile', e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="10-digit mobile" /></Field>
            <Field label="Email ID" err={errors.email}><input style={inp} value={f.email} onChange={e => set('email', e.target.value.slice(0, 40))} maxLength={40} placeholder="name@example.com" /></Field>
          </Grid>
          <Grid>
            <Field label="PAN" err={errors.pan}><input style={{ ...inp, textTransform: 'uppercase' }} value={f.pan} onChange={e => set('pan', e.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F" /></Field>
            <Field label="GSTIN" err={errors.gstin}><input style={{ ...inp, textTransform: 'uppercase' }} value={f.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} maxLength={15} placeholder="22ABCDE1234F1Z5" /></Field>
          </Grid>
          <Grid>
            <Field label="TAN" err={errors.tan}><input style={{ ...inp, textTransform: 'uppercase' }} value={f.tan} onChange={e => set('tan', e.target.value.toUpperCase())} maxLength={10} placeholder="ABCD12345E" /></Field>
            <Field label="Udyam Aadhaar / MSME" err={errors.udyam_no}><input style={{ ...inp, textTransform: 'uppercase' }} value={f.udyam_no} onChange={e => set('udyam_no', e.target.value.toUpperCase())} placeholder="UDYAM-XX-00-0000000" /></Field>
          </Grid>
          <Grid>
            <Field label="PF No." err={errors.pf_no}><input style={inp} value={f.pf_no} onChange={e => set('pf_no', e.target.value.toUpperCase())} placeholder="e.g. DLCPM1234567000" /></Field>
            <Field label="ESI No." err={errors.esi_no}><input style={inp} value={f.esi_no} onChange={e => set('esi_no', e.target.value.replace(/\D/g, ''))} maxLength={17} placeholder="17-digit ESI number" /></Field>
          </Grid>
          <Field label="Address"><textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }} value={f.address} onChange={e => set('address', e.target.value)} placeholder="Registered / business address" /></Field>
          {f.client_type && (
            <div style={{ marginTop: 4, maxWidth: 320 }}>
              <Field label={cfg.countLabel}>
                <select style={inp} value={f.num_directors} onChange={e => setNumDirectors(e.target.value)}>
                  <option value="0">Select number...</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            </div>
          )}
        </SectionCard>

        {/* Section 2 — People */}
        {directors.length > 0 && (
          <SectionCard icon="👤" title={`${cfg.role} Details`} subtitle={`${directors.length} ${cfg.role.toLowerCase()}${directors.length > 1 ? 's' : ''} · documents upload per person`}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {directors.map((d, i) => (
                <button key={i} onClick={() => setActiveDir(i)}
                  style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: activeDir === i ? 700 : 500, background: activeDir === i ? 'var(--dkgreen)' : '#fff', color: activeDir === i ? '#fff' : 'var(--gray)', border: `1px solid ${activeDir === i ? 'var(--dkgreen)' : 'var(--border)'}`, borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, maxWidth: 170, boxShadow: activeDir === i ? '0 2px 8px rgba(13,122,83,0.25)' : 'none' }}>
                  {d.name && d.name.trim() && <span style={{ color: activeDir === i ? '#fff' : 'var(--dkgreen)' }}>✓</span>}
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dirHeading(d, i)}</span>
                </button>
              ))}
              {directors.length < 5 && <button onClick={() => { addDirector(); setActiveDir(directors.length) }} style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, background: 'var(--ltgreen)', color: 'var(--dkgreen)', border: '1px dashed var(--green2)', borderRadius: 999, cursor: 'pointer' }}>+ Add</button>}
            </div>

            {directors[activeDir] && (() => {
              const d = directors[activeDir]; const i = activeDir
              return (
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ltgreen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dkgreen)', fontWeight: 700, fontSize: 14 }}>{(d.name || cfg.role)[0].toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy2)' }}>{dirHeading(d, i)}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--gray2)' }}>{cfg.role} {i + 1}</div>
                      </div>
                    </div>
                    <button onClick={() => { removeDirector(i); setActiveDir(Math.max(0, i - 1)) }} style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, padding: '6px 12px', borderRadius: 8 }}>Remove</button>
                  </div>
                  <Grid>
                    <Field label="Name"><input style={inp} value={d.name} onChange={e => updateDir(i, 'name', e.target.value)} placeholder="Full name" /></Field>
                    <Field label="Mobile No." err={errors['dir' + i + 'mobile']}><input style={inp} value={d.mobile} onChange={e => updateDir(i, 'mobile', e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="10-digit mobile" /></Field>
                  </Grid>
                  <Grid>
                    <Field label="Email ID" err={errors['dir' + i + 'email']}><input style={inp} value={d.email} onChange={e => updateDir(i, 'email', e.target.value.slice(0, 40))} maxLength={40} placeholder="name@example.com" /></Field>
                    {isCompanyOrLLP && <Field label="DIN / DPIN" err={errors['dir' + i + 'din']}><input style={inp} value={d.din} onChange={e => updateDir(i, 'din', e.target.value.replace(/\D/g, ''))} maxLength={8} placeholder="8-digit DIN/DPIN" /></Field>}
                  </Grid>

                  {/* Documents sub-section */}
                  <div style={{ marginTop: 8, padding: 16, background: 'var(--ltgray)', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>📎 Documents</div>
                    <Grid>
                      <Field label="PAN Number" err={errors['dir' + i + 'pan']}>
                        <input style={{ ...inp, textTransform: 'uppercase' }} value={d.pan} onChange={e => updateDir(i, 'pan', e.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F" />
                        <FileBtn label={d.panFileName || 'Upload PAN file'} done={!!d.panFile} onPick={file => uploadFile(i, 'panFile', 'panFileName', file, false)} />
                      </Field>
                      <Field label="Aadhaar" err={errors['dir' + i + 'aadhaar']}>
                        <input style={inp} value={d.aadhaar} onChange={e => updateDir(i, 'aadhaar', e.target.value.replace(/\D/g, ''))} maxLength={12} placeholder="12-digit Aadhaar" />
                        <FileBtn label={d.aadhaarFileName || 'Upload Aadhaar file'} done={!!d.aadhaarFile} onPick={file => uploadFile(i, 'aadhaarFile', 'aadhaarFileName', file, false)} />
                      </Field>
                    </Grid>
                    <Field label="Photo">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <FileBtn label={d.photoName || 'Choose photo (JPG/PNG)'} done={!!d.photo} onPick={file => uploadFile(i, 'photo', 'photoName', file, true)} accept=".jpg,.jpeg,.png,image/jpeg,image/png" />
                        {d.photo && <img src={d.photo} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--green2)' }} />}
                      </div>
                    </Field>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                    <button onClick={() => setActiveDir(Math.max(0, i - 1))} disabled={i === 0} style={{ padding: '8px 16px', fontSize: 12.5, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: i === 0 ? 'not-allowed' : 'pointer', color: 'var(--gray)', opacity: i === 0 ? 0.4 : 1 }}>← Previous</button>
                    {i < directors.length - 1 && <button onClick={() => setActiveDir(i + 1)} style={{ padding: '8px 16px', fontSize: 12.5, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Next →</button>}
                  </div>
                </div>
              )
            })()}
          </SectionCard>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 8, paddingTop: 18, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <button onClick={resetForm} style={btnGhost}>Reset Form</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => submit(true)} disabled={saving} style={btnGhost}>Save Draft</button>
          <button onClick={() => submit(false)} disabled={saving} style={btnP}>{saving ? 'Saving & uploading...' : 'Submit Onboarding'}</button>
        </div>
      </div>
    </Overlay>
  )
}

const inp = { width: '100%', padding: '10px 13px', border: '1px solid var(--border)', borderRadius: 9, marginTop: 5, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
const btnP = { padding: '11px 24px', fontSize: 13.5, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer' }
const btnGhost = { padding: '11px 20px', fontSize: 13.5, fontWeight: 500, background: '#fff', color: 'var(--gray)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer' }

function FileBtn({ label, onPick, accept, done }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, padding: '7px 12px', fontSize: 11.5, fontWeight: 600, background: done ? 'var(--ltgreen)' : '#fff', color: 'var(--dkgreen)', border: `1px solid ${done ? 'var(--green2)' : 'var(--border)'}`, borderRadius: 7, cursor: 'pointer', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {done ? '✓' : '📎'} {label}
      <input type="file" accept={accept || '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf'} onChange={e => onPick(e.target.files[0])} style={{ display: 'none' }} />
    </label>
  )
}
function Overlay({ children, maxWidth = 860 }) {
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
    <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth, marginTop: 24, marginBottom: 24, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>{children}</div>
  </div>
}
function SectionCard({ icon, title, subtitle, children }) {
  return (
    <div style={{ marginBottom: 18, border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--ltgray)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        <div><div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--navy2)' }}>{title}</div><div style={{ fontSize: 12, color: 'var(--gray)' }}>{subtitle}</div></div>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  )
}
function Grid({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>{children}</div> }
function Field({ label, err, req, children }) {
  return <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray)' }}>{label}{req && <span style={{ color: '#DC2626' }}> *</span>}</label>{children}{err && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>⚠ {err}</div>}</div>
}
function SumRow({ k, v, last }) { return <div style={{ display: 'flex', padding: '8px 0', borderBottom: last ? 'none' : '1px solid var(--border2)' }}><span style={{ width: 150, color: 'var(--gray2)', fontSize: 12.5 }}>{k}</span><span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>{v}</span></div> }
