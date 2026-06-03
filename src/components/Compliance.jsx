import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Compliance({ user }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ client_name: '', compliance_type: 'GSTR-3B', period: '', due_date: '', assigned_to: 'Pankaj' })

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('compliance').select('*').order('due_date')
    setItems(data || [])
    setLoading(false)
  }

  const cTypes = ['GSTR-1', 'GSTR-3B', 'GSTR-9', 'ITR Filing', 'TDS Return (24Q)', 'TDS Return (26Q)', 'ROC Annual Filing', 'Advance Tax', 'Tax Audit', 'Other']
  const team = ['Pankaj', 'Shivam', 'Prashant', 'Ankit', 'Vega', 'Sejal', 'Simmi', 'Ayush']

  async function save() {
    if (!form.client_name.trim() || !form.due_date) { alert('Client name and due date required'); return }
    await supabase.from('compliance').insert({ ...form, status: 'Pending' })
    setShowAdd(false); setForm({ client_name: '', compliance_type: 'GSTR-3B', period: '', due_date: '', assigned_to: 'Pankaj' }); load()
  }

  async function updateStatus(item, status) {
    await supabase.from('compliance').update({ status, filed_on: status === 'Filed' ? new Date().toISOString().split('T')[0] : null }).eq('id', item.id)
    load()
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 700 }}>Compliance Tracker</h1><p style={{ fontSize: 14, color: 'var(--gray)' }}>GST, ITR, TDS, ROC deadlines</p></div>
        <button onClick={() => setShowAdd(true)} style={{ background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ Add Compliance</button>
      </div>

      <div className="card" style={{ overflow: 'hidden', marginTop: 20 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading...</div>
          : items.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>No compliance items yet. Click "+ Add Compliance".</div>
          : items.map(c => {
            const overdue = c.due_date < today && c.status !== 'Filed'
            return (
              <div key={c.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{c.compliance_type} — {c.client_name}</div>
                  <div style={{ fontSize: 12, color: overdue ? '#DC2626' : 'var(--gray)' }}>{c.period && c.period + ' · '}Due: {c.due_date} {overdue && '⚠ OVERDUE'} · {c.assigned_to}</div>
                </div>
                <select value={c.status} onChange={e => updateStatus(c, e.target.value)} style={{ padding: '5px 10px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: c.status === 'Filed' ? 'var(--ltgreen)' : '#fff', color: c.status === 'Filed' ? 'var(--dkgreen)' : 'var(--gray)' }}>
                  <option>Pending</option><option>In Progress</option><option>Filed</option>
                </select>
              </div>
            )
          })}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Add Compliance</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>Client Name *</label>
                <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>Type</label>
                  <select value={form.compliance_type} onChange={e => setForm({ ...form, compliance_type: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }}>{cTypes.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>Period</label>
                  <input value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} placeholder="e.g. Jun 2026" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>Due Date *</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>Assigned To</label>
                  <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }}>{team.map(m => <option key={m}>{m}</option>)}</select></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '9px 20px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
