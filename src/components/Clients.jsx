import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Clients({ user }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', client_type: '', mobile: '', email: '', pan: '', gstin: '', address: '' })
  const [err, setErr] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  const types = ['Individual', 'Proprietorship', 'Partnership Firm', 'Company (Pvt Ltd)', 'LLP', 'OPC (One Person Company)', 'Trust / NGO']
  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.client_id || '').toLowerCase().includes(search.toLowerCase()) || (c.mobile || '').includes(search))

  async function saveClient() {
    if (!form.name.trim()) { setErr('Client name required'); return }
    if (!form.client_type) { setErr('Select client type'); return }
    setErr('')
    const clientId = 'YA-' + Date.now().toString().slice(-6)
    const { error } = await supabase.from('clients').insert({ ...form, client_id: clientId, onboarded_by: user.name })
    if (error) { setErr('Error: ' + error.message); return }
    setShowAdd(false); setForm({ name: '', client_type: '', mobile: '', email: '', pan: '', gstin: '', address: '' }); load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 700 }}>Clients</h1><p style={{ fontSize: 14, color: 'var(--gray)' }}>All onboarded clients</p></div>
        <button onClick={() => setShowAdd(true)} style={{ background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ New Client</button>
      </div>

      <div className="card" style={{ padding: 16, margin: '20px 0' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search client by name, ID, or mobile..." style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading...</div>
          : filtered.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>No clients yet. Click "+ New Client".</div>
          : filtered.map(c => (
            <div key={c.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name} {c.quick_onboarded && <span style={{ fontSize: 10, color: '#D97706', background: '#FFFBEB', padding: '1px 7px', borderRadius: 99, marginLeft: 6 }}>Quick</span>}</div>
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>{[c.client_type, c.mobile && '+91 ' + c.mobile, c.pan].filter(Boolean).join(' · ')}</div>
              </div>
              <span style={{ fontSize: 11, background: 'var(--ltgreen)', color: 'var(--dkgreen)', padding: '3px 10px', borderRadius: 99 }}>{c.client_id}</span>
            </div>
          ))}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>New Client Onboarding</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>Full Name / Business Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>Client Type *</label>
                  <select value={form.client_type} onChange={e => setForm({ ...form, client_type: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }}><option value="">Select...</option>{types.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>Mobile</label>
                  <input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} maxLength={10} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>PAN</label>
                  <input value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })} maxLength={10} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3, textTransform: 'uppercase' }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>GSTIN</label>
                  <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })} maxLength={15} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3, textTransform: 'uppercase' }} /></div>
              </div>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }} /></div>
              <div style={{ fontSize: 11, color: '#DC2626', minHeight: 16 }}>{err}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '9px 20px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveClient} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Save Client</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
