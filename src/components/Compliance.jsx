import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Compliance({ user }) {
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [form, setForm] = useState({ client_id: '', client_name: '', compliance_type: 'GSTR-3B', period: '', due_date: '', assigned_to: '' })

  useEffect(() => { load() }, [])
  useEffect(() => { setForm(f => ({ ...f, assigned_to: user?.name || '' })) }, [user])

  async function load() {
    setLoading(true)
    const [{ data: comp }, { data: cl }, { data: tm }] = await Promise.all([
      supabase.from('compliance').select('*').order('due_date'),
      supabase.from('clients').select('client_id,name').eq('status','Active').order('name'),
      supabase.from('team').select('name').eq('is_active', true).order('name')
    ])
    setItems(comp || [])
    setClients(cl || [])
    setTeamMembers(tm?.map(t => t.name) || [])
    setLoading(false)
  }

  const cTypes = ['GSTR-1','GSTR-3B','GSTR-9','ITR Filing','TDS Return (24Q)','TDS Return (26Q)','ROC Annual Filing','Advance Tax','Tax Audit','Other']

  function handleClientChange(clientId) {
    const cl = clients.find(c => c.client_id === clientId)
    setForm(f => ({ ...f, client_id: clientId, client_name: cl?.name || '' }))
  }

  async function save() {
    if (!form.client_name.trim() || !form.due_date) { alert('Client and due date are required'); return }
    await supabase.from('compliance').insert({ ...form, status: 'Pending' })
    setShowAdd(false)
    setForm({ client_id: '', client_name: '', compliance_type: 'GSTR-3B', period: '', due_date: '', assigned_to: user?.name || '' })
    load()
  }

  async function updateStatus(item, status) {
    await supabase.from('compliance').update({ status, filed_on: status==='Filed' ? new Date().toISOString().split('T')[0] : null }).eq('id', item.id)
    load()
  }

  const today = new Date().toISOString().split('T')[0]
  const filtered = items.filter(c =>
    (!search || c.client_name?.toLowerCase().includes(search.toLowerCase()) || c.compliance_type?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatus || c.status === filterStatus)
  )
  const inp = { width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8, marginTop:3, fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:600, color:'var(--gray)', textTransform:'uppercase', letterSpacing:0.5 }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6, flexWrap:'wrap', gap:12 }}>
        <div><h1 style={{ fontSize:24, fontWeight:700 }}>Compliance Tracker</h1><p style={{ fontSize:14, color:'var(--gray)' }}>GST, ITR, TDS, ROC deadlines</p></div>
        <button onClick={() => setShowAdd(true)} style={{ background:'var(--dkgreen)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>+ Add Compliance</button>
      </div>

      <div className="card" style={{ padding:14, marginTop:20, display:'flex', gap:10, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search client or compliance type..."
          style={{ flex:'1 1 220px', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, outline:'none' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, background:'#fff', minWidth:140 }}>
          <option value="">All statuses</option>
          <option>Pending</option><option>In Progress</option><option>Filed</option>
        </select>
        <span style={{ fontSize:13, color:'var(--gray)', alignSelf:'center' }}>{filtered.length} item{filtered.length!==1?'s':''}</span>
      </div>
      <div className="card" style={{ overflow:'hidden', marginTop:4 }}>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--gray2)' }}>Loading...</div>
          : filtered.length === 0
          ? <div style={{ padding:40, textAlign:'center', color:'var(--gray2)' }}>{items.length === 0 ? 'No compliance items yet. Click "+ Add Compliance".' : 'No items match your search.'}</div>
          : filtered.map(c => {
              const overdue = c.due_date < today && c.status !== 'Filed'
              return (
                <div key={c.id} style={{ padding:'14px 18px', borderBottom:'1px solid var(--border2)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:500 }}>{c.compliance_type} — {c.client_name}</div>
                    <div style={{ fontSize:12, color: overdue ? '#DC2626' : 'var(--gray)' }}>{c.period && c.period + ' · '}Due: {c.due_date} {overdue && '⚠ OVERDUE'} · {c.assigned_to}</div>
                  </div>
                  <select value={c.status} onChange={e => updateStatus(c, e.target.value)}
                    style={{ padding:'5px 10px', fontSize:12, border:'1px solid var(--border)', borderRadius:6, background: c.status==='Filed'?'var(--ltgreen)':'#fff', color: c.status==='Filed'?'var(--dkgreen)':'var(--gray)' }}>
                    <option>Pending</option><option>In Progress</option><option>Filed</option>
                  </select>
                </div>
              )
            })}
      </div>

      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:460, padding:26 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:700 }}>Add Compliance Item</div>
              <button onClick={() => setShowAdd(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--gray)' }}>✕</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Client — from onboarding database */}
              <div>
                <label style={lbl}>Client *</label>
                <select value={form.client_id} onChange={e => handleClientChange(e.target.value)} style={inp} required>
                  <option value="">Select onboarded client...</option>
                  {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.name} ({c.client_id})</option>)}
                </select>
                {clients.length === 0 && !loading && <div style={{ fontSize:11, color:'var(--red)', marginTop:3 }}>No active clients found. Please onboard clients first.</div>}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={lbl}>Compliance Type</label>
                  <select value={form.compliance_type} onChange={e => setForm({ ...form, compliance_type: e.target.value })} style={inp}>
                    {cTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Period</label>
                  <input value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} placeholder="e.g. Jun 2026" style={inp} />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={lbl}>Due Date *</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Assigned To</label>
                  <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={inp}>
                    <option value="">Select team member...</option>
                    {teamMembers.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 }}>
              <button onClick={() => setShowAdd(false)} style={{ padding:'9px 20px', fontSize:13, border:'1px solid var(--border)', borderRadius:8, background:'#fff', cursor:'pointer' }}>Cancel</button>
              <button onClick={save} style={{ padding:'9px 20px', fontSize:13, fontWeight:600, background:'var(--dkgreen)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
