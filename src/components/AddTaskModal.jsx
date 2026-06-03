import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function AddTaskModal({ user, onClose, onSaved }) {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [showDD, setShowDD] = useState(false)
  const [selected, setSelected] = useState(null)
  const [showQuick, setShowQuick] = useState(false)
  // Quick onboard fields
  const [qName, setQName] = useState(''); const [qMobile, setQMobile] = useState('')
  const [qType, setQType] = useState(''); const [qPan, setQPan] = useState('')
  const [qErr, setQErr] = useState('')
  // Task fields
  const [task, setTask] = useState(''); const [assign, setAssign] = useState('Pankaj')
  const [due, setDue] = useState(new Date().toISOString().split('T')[0])
  const [priority, setPriority] = useState('Normal'); const [notes, setNotes] = useState('')

  useEffect(() => { loadClients() }, [])
  async function loadClients() {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data || [])
    setShowDD(true)
  }

  const team = ['Pankaj', 'Shivam', 'Prashant', 'Ankit', 'Vega', 'Sejal', 'Simmi', 'Ayush']
  const types = ['Individual', 'Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited Company', 'Public Limited Company', 'Section 8 Company', 'HUF']
  const matches = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  function pick(c) { setSelected(c); setSearch(c.name); setShowDD(false) }

  async function saveQuick() {
    if (!qName.trim()) { setQErr('Client name required'); return }
    if (!/^\d{10}$/.test(qMobile)) { setQErr('Enter valid 10-digit mobile'); return }
    if (!qType) { setQErr('Select client type'); return }
    setQErr('')
    const clientId = 'YA-Q-' + Date.now().toString().slice(-6)
    const { data, error } = await supabase.from('clients').insert({
      client_id: clientId, name: qName.trim(), client_type: qType, mobile: qMobile, pan: qPan.toUpperCase(), quick_onboarded: true, onboarded_by: user.name
    }).select().single()
    if (error) { setQErr('Error saving: ' + error.message); return }
    setClients([data, ...clients])
    setSelected(data); setSearch(data.name); setShowQuick(false); setShowDD(false)
  }

  async function saveTask() {
    if (!selected) { alert('Please select a client first'); return }
    if (!task.trim()) { alert('Task name required'); return }
    const taskId = 'YA-TSK-' + Date.now().toString().slice(-6)
    await supabase.from('tasks').insert({
      task_id: taskId, task_name: task.trim(), client_id: selected.client_id, client_name: selected.name,
      assigned_to: assign, assigned_by: user.name, due_date: due, priority, status: 'Pending', notes: notes.trim()
    })
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Add New Task</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray)' }}>✕</button>
        </div>

        {/* Client search */}
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Client *</label>
        <div style={{ position: 'relative' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setShowDD(true); setSelected(null) }} onFocus={() => setShowDD(true)}
            placeholder="🔍 Type client name..." style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
          {showDD && !selected && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
              {matches.map(c => (
                <div key={c.id} onClick={() => pick(c)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border2)', fontSize: 13 }}>
                  <div style={{ fontWeight: 500 }}>{c.name}</div>
                  {(c.client_type || c.mobile) && <div style={{ fontSize: 11, color: 'var(--gray)' }}>{[c.client_type, c.mobile && '+91 ' + c.mobile].filter(Boolean).join(' · ')}</div>}
                </div>
              ))}
              <div onClick={() => { setShowQuick(true); setQName(search); setShowDD(false) }} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--dkgreen)', background: 'var(--ltgreen)' }}>
                ➕ Client not in list? Quick Add New Client
              </div>
            </div>
          )}
        </div>

        {selected && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--ltgreen)', border: '1px solid var(--green2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dkgreen)' }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: 'var(--gray)' }}>{selected.client_type}</div></div>
            <button onClick={() => { setSelected(null); setSearch('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)' }}>✕</button>
          </div>
        )}

        {/* Quick onboard */}
        {showQuick && (
          <div style={{ marginTop: 12, background: 'var(--ltgray)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dkgreen)', textTransform: 'uppercase', marginBottom: 12 }}>⚡ Quick Client Onboarding</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)' }}>Name *</label>
                <input value={qName} onChange={e => setQName(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 7, marginTop: 3, background: '#fff' }} /></div>
              <div><label style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)' }}>Mobile *</label>
                <input value={qMobile} onChange={e => setQMobile(e.target.value)} maxLength={10} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 7, marginTop: 3, background: '#fff' }} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)' }}>Type *</label>
                <select value={qType} onChange={e => setQType(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 7, marginTop: 3, background: '#fff' }}>
                  <option value="">Select...</option>{types.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)' }}>PAN</label>
                <input value={qPan} onChange={e => setQPan(e.target.value)} maxLength={10} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 7, marginTop: 3, textTransform: 'uppercase', background: '#fff' }} /></div>
            </div>
            <div style={{ fontSize: 11, color: '#DC2626', minHeight: 16, marginBottom: 8 }}>{qErr}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowQuick(false)} style={{ flex: 1, padding: 8, fontSize: 12, border: '1px solid var(--border)', borderRadius: 7, background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveQuick} style={{ flex: 2, padding: 8, fontSize: 12, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer' }}>✓ Save & Select</button>
            </div>
          </div>
        )}

        {/* Task fields */}
        {selected && (
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Task Name *</label>
            <input value={task} onChange={e => setTask(e.target.value)} placeholder="e.g. GSTR-3B Filing — June 2026" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase' }}>Assigned To</label>
                <select value={assign} onChange={e => setAssign(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4 }}>{team.map(m => <option key={m}>{m}</option>)}</select></div>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase' }}>Due Date</label>
                <input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4 }} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase' }}>Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4 }}><option>Normal</option><option>High</option><option>Urgent</option></select></div>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase' }}>Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4 }} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={onClose} style={{ padding: '9px 20px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveTask} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Save Task</button>
            </div>
          </div>
        )}

        {!selected && !showQuick && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={onClose} style={{ padding: '9px 20px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}
