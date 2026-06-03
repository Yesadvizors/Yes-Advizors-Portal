import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import AddTaskModal from './AddTaskModal'
import FollowUpModal from './FollowUpModal'

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('All')
  const [fAssign, setFAssign] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [followTask, setFollowTask] = useState(null)

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  // Match assigned person by first name (Pankaj Joshi vs Pankaj)
  function isMyTask(t) {
    const first = user.name.split(' ')[0]
    const a = t.assigned_to || ''
    return a === user.name || a === first || user.name.startsWith(a) || a.startsWith(first)
  }

  async function markDone(t) {
    if (!isMyTask(t)) { alert('Only ' + t.assigned_to + ' can mark this done'); return }
    await supabase.from('tasks').update({ status: 'Done', completed_on: new Date().toISOString(), completed_by: user.name }).eq('id', t.id)
    loadTasks()
  }

  const today = new Date().toISOString().split('T')[0]
  const filtered = tasks.filter(t => {
    if (fStatus !== 'All' && t.status !== fStatus) return false
    if (fAssign !== 'All' && !(t.assigned_to || '').includes(fAssign)) return false
    if (search) {
      const s = search.toLowerCase()
      const hay = [t.task_name, t.client_name, t.assigned_to, t.notes, t.latest_update, t.next_action].join(' ').toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  const team = ['Pankaj', 'Shivam', 'Prashant', 'Ankit', 'Vega', 'Sejal', 'Simmi', 'Ayush']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Task Tracker</h1>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>All tasks for your firm</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ Add Task</button>
      </div>

      <div className="card" style={{ padding: 16, margin: '20px 0', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search task or client..."
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
          <option>All</option><option>Pending</option><option>In Progress</option><option>Waiting for Client</option><option>Document Received</option><option>Under Review</option><option>Filed / Completed</option><option>Done</option><option>On Hold</option>
        </select>
        <select value={fAssign} onChange={e => setFAssign(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
          <option>All</option>{team.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading tasks...</div>
          : filtered.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>No tasks yet. Click "+ Add Task" to create one.</div>
          : filtered.map(t => {
            const isDone = t.status === 'Done'
            const closed = isDone || t.status === 'Cancelled'
            const mine = isMyTask(t)
            return (
              <div key={t.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border2)', display: 'flex', alignItems: 'center', gap: 12, opacity: isDone ? 0.6 : 1 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, textDecoration: isDone ? 'line-through' : 'none' }}>{t.task_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray)' }}>{t.client_name || '—'} · {t.assigned_to || '—'} · Due: {t.due_date || '—'}</div>
                  {t.latest_update && <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 2 }}>📝 {t.latest_update}</div>}
                </div>
                <div style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: t.priority === 'Urgent' ? '#FEE2E2' : t.priority === 'High' ? '#FEF3C7' : '#F3F4F6', color: t.priority === 'Urgent' ? '#DC2626' : t.priority === 'High' ? '#D97706' : '#6B7280' }}>{t.priority}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!closed && mine && <button onClick={() => setFollowTask(t)} style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, background: 'var(--ltgreen)', color: 'var(--dkgreen)', border: '1px solid var(--green2)', borderRadius: 6, cursor: 'pointer' }}>+ Follow-up</button>}
                  {isDone ? <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Done</span>
                    : mine ? <button onClick={() => markDone(t)} style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>✓ Done</button>
                    : <span style={{ fontSize: 10.5, color: 'var(--gray2)', padding: '4px 8px', background: 'var(--ltgray)', borderRadius: 6 }}>👤 {t.assigned_to}</span>}
                </div>
              </div>
            )
          })}
      </div>

      {showAdd && <AddTaskModal user={user} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadTasks() }} />}
      {followTask && <FollowUpModal task={followTask} user={user} onClose={() => setFollowTask(null)} onSaved={() => { setFollowTask(null); loadTasks() }} />}
    </div>
  )
}
