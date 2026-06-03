import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { CLIENT_TYPES, fmtDate } from '../helpers'

export default function Clients({ user }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [viewClient, setViewClient] = useState(null)
  const [form, setForm] = useState(blank())
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  function blank() { return { name: '', client_type: '', mobile: '', email: '', pan: '', gstin: '', tan: '', address: '' } }

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.client_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile || '').includes(search) ||
    (c.pan || '').toLowerCase().includes(search.toLowerCase())
  )

  async function save() {
    if (!form.name.trim()) { setErr('Client name required'); return }
    if (!form.client_type) { setErr('Select client type'); return }
    setErr(''); setSaving(true)
    const clientId = 'YA-' + Date.now().toString().slice(-6)
    const { error } = await supabase.from('clients').insert({ ...form, pan: form.pan.toUpperCase(), gstin: form.gstin.toUpperCase(), tan: form.tan.toUpperCase(), client_id: clientId, onboarded_by: user.name })
    setSaving(false)
    if (error) { setErr('Error: ' + error.message); return }
    setShowAdd(false); setForm(blank()); load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 700 }}>Clients</h1><p style={{ fontSize: 14, color: 'var(--gray)' }}>{clients.length} onboarded clients</p></div>
        <button onClick={() => setShowAdd(true)} style={{ background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ New Client</button>
      </div>

      <div className="card" style={{ padding: 16, margin: '20px 0' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by name, client ID, mobile, or PAN..." style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading...</div>
          : filtered.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>No clients found. Click "+ New Client".</div>
          : filtered.map(c => (
            <div key={c.id} onClick={() => setViewClient(c)} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name} {c.quick_onboarded && <span style={{ fontSize: 10, color: '#D97706', background: '#FFFBEB', padding: '1px 7px', borderRadius: 99, marginLeft: 6 }}>Quick</span>}</div>
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>{[c.client_type, c.mobile && '+91 ' + c.mobile, c.pan].filter(Boolean).join(' · ')}</div>
              </div>
              <span style={{ fontSize: 11, background: 'var(--ltgreen)', color: 'var(--dkgreen)', padding: '3px 10px', borderRadius: 99 }}>{c.client_id}</span>
            </div>
          ))}
      </div>

      {/* View client detail */}
      {viewClient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div><div style={{ fontSize: 17, fontWeight: 700 }}>{viewClient.name}</div><div style={{ fontSize: 12, color: 'var(--gray)' }}>{viewClient.client_id}</div></div>
              <button onClick={() => setViewClient(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray)' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
              <Field label="Type" value={viewClient.client_type} />
              <Field label="Status" value={viewClient.status} />
              <Field label="Mobile" value={viewClient.mobile ? '+91 ' + viewClient.mobile : '—'} />
              <Field label="Email" value={viewClient.email || '—'} />
              <Field label="PAN" value={viewClient.pan || '—'} />
              <Field label="GSTIN" value={viewClient.gstin || '—'} />
              <Field label="TAN" value={viewClient.tan || '—'} />
              <Field label="Onboarded" value={fmtDate(viewClient.created_at)} />
            </div>
            {viewClient.address && <div style={{ marginTop: 10, fontSize: 13 }}><span style={{ color: 'var(--gray)' }}>Address: </span>{viewClient.address}</div>}
          </div>
        </div>
      )}

      {/* Add client */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>New Client Onboarding</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Inp label="Full Name / Business Name *" v={form.name} on={v => setForm({ ...form, name: v })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><Lbl>Client Type *</Lbl><select value={form.client_type} onChange={e => setForm({ ...form, client_type: e.target.value })} style={inpStyle}><option value="">Select...</option>{CLIENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <Inp label="Mobile" v={form.mobile} on={v => setForm({ ...form, mobile: v })} max={10} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Inp label="PAN" v={form.pan} on={v => setForm({ ...form, pan: v.toUpperCase() })} max={10} upper />
                <Inp label="GSTIN" v={form.gstin} on={v => setForm({ ...form, gstin: v.toUpperCase() })} max={15} upper />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Inp label="TAN" v={form.tan} on={v => setForm({ ...form, tan: v.toUpperCase() })} max={10} upper />
                <Inp label="Email" v={form.email} on={v => setForm({ ...form, email: v })} />
              </div>
              <Inp label="Address" v={form.address} on={v => setForm({ ...form, address: v })} />
              <div style={{ fontSize: 11, color: '#DC2626', minHeight: 16 }}>{err}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '9px 20px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Client'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inpStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }
function Lbl({ children }) { return <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>{children}</label> }
function Inp({ label, v, on, max, upper }) { return <div><Lbl>{label}</Lbl><input value={v} onChange={e => on(e.target.value)} maxLength={max} style={{ ...inpStyle, textTransform: upper ? 'uppercase' : 'none' }} /></div> }
function Field({ label, value }) { return <div><div style={{ fontSize: 11, color: 'var(--gray2)' }}>{label}</div><div style={{ fontWeight: 500 }}>{value}</div></div> }
