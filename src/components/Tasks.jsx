import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import AddTaskModal from './AddTaskModal'
import FollowUpModal from './FollowUpModal'
import HistoryModal from './HistoryModal'
import { getDueMeta, priColor, isMyTask, TEAM, STATUS_OPTIONS } from '../helpers'

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([])
  const [fuCounts, setFuCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('All')
  const [fAssign, setFAssign] = useState('All')
  const [fFollow, setFFollow] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [followTask, setFollowTask] = useState(null)
  const [historyTask, setHistoryTask] = useState(null)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    setTasks(data || [])
    const { data: fu } = await supabase.from('follow_ups').select('task_id')
    const counts = {}
    ;(fu || []).forEach(f => { counts[f.task_id] = (counts[f.task_id] || 0) + 1 })
    setFuCounts(counts)
    setLoading(false)
  }

  async function markDone(t) {
    if (!isMyTask(t, user)) { alert('Only ' + t.assigned_to + ' can mark this done'); return }
    await supabase.from('tasks').update({ status: 'Done', completed_on: new Date().toISOString(), completed_by: user.name }).eq('id', t.id)
    load()
  }

  const today = new Date().toISOString().split('T')[0]
  const filtered = tasks.filter(t => {
    if (fStatus !== 'All' && t.status !== fStatus) return false
    if (fAssign !== 'All' && !(t.assigned_to || '').includes(fAssign)) return false
    if (fFollow === 'today' && t.next_followup_date !== today) return false
    if (fFollow === 'overdue' && !(t.next_followup_date && t.next_followup_date < today)) return false
    if (fFollow === 'pending' && !t.next_followup_date) return false
    if (search) {
      const s = search.toLowerCase()
      const hay = [t.task_name, t.client_name, t.assigned_to, t.notes, t.latest_update, t.next_action, t.task_id].join(' ').toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  function clearFilters() { setSearch(''); setFStatus('All'); setFAssign('All'); setFFollow('All') }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 700 }}>Task Tracker</h1><p style={{ fontSize: 14, color: 'var(--gray)' }}>All tasks · {filtered.length} shown</p></div>
        <button onClick={() => setShowAdd(true)} style={{ background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ Add Task</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16, margin: '20px 0' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search task, client, note, next action..." style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}><option>All</option>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select>
          <select value={fAssign} onChange={e => setFAssign(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}><option>All</option>{TEAM.map(m => <option key={m}>{m}</option>)}</select>
          <select value={fFollow} onChange={e => setFFollow(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}><option value="All">All follow-ups</option><option value="today">Follow-up today</option><option value="overdue">Follow-up overdue</option><option value="pending">Has follow-up date</option></select>
          <button onClick={clearFilters} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--gray)', cursor: 'pointer' }}>Clear</button>
        </div>
        {/* Quick chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray2)', alignSelf: 'center' }}>QUICK:</span>
          <button onClick={() => { setFFollow('today'); setFStatus('All') }} style={chip('#FFFBEB', '#92400E', '#FDE68A')}>📅 Follow-up Today</button>
          <button onClick={() => { setFFollow('overdue'); setFStatus('All') }} style={chip('#FEF2F2', '#DC2626', '#FECACA')}>⚠ Follow-up Overdue</button>
          <button onClick={() => { setFStatus('Waiting for Client'); setFFollow('All') }} style={chip('#FFFBEB', '#92400E', '#FDE68A')}>⏳ Waiting for Client</button>
          <button onClick={() => { setFStatus('Document Received'); setFFollow('All') }} style={chip('#ECFDF5', '#0D7A53', '#A7F3D0')}>📄 Document Received</button>
        </div>
      </div>

      {/* Task list */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading tasks...</div>
          : filtered.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>No tasks match your filters.</div>
          : filtered.map(t => {
            const isDone = t.status === 'Done'
            const closed = isDone || t.status === 'Cancelled'
            const mine = isMyTask(t, user)
            const m = getDueMeta(t.due_date, t.status)
            const pc = priColor(t.priority)
            const fc = fuCounts[t.task_id] || 0
            return (
              <div key={t.id} style={{ padding: '13px 18px', borderBottom: '1px solid var(--border2)', display: 'flex', alignItems: 'center', gap: 12, opacity: isDone ? 0.6 : 1 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, textDecoration: isDone ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.task_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray)' }}>{t.client_name || '—'} · {t.assigned_to || '—'}</div>
                  {t.latest_update && <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📝 {t.latest_update}</div>}
                </div>
                <div style={{ minWidth: 90, textAlign: 'right' }}>
                  {!closed && m.badge && <div style={{ fontSize: 11, color: m.color, fontWeight: m.daysLeft <= 7 ? 600 : 400 }}>{m.label}</div>}
                  {isDone && <div style={{ fontSize: 11, color: 'var(--gray2)' }}>Closed</div>}
                </div>
                <div style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: pc.bg, color: pc.c }}>{t.priority}</div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {!closed && mine && <button onClick={() => setFollowTask(t)} style={btn('var(--ltgreen)', 'var(--dkgreen)', 'var(--green2)')}>{fc > 0 ? '📝 Update' : '+ Follow-up'}</button>}
                  {fc > 0 && <button onClick={() => setHistoryTask(t)} style={btn('var(--ltgray)', 'var(--gray)', 'var(--border)')}>🕘 {fc}</button>}
                  {isDone ? <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Done</span>
                    : t.status === 'Cancelled' ? <span style={{ fontSize: 11, color: '#DC2626' }}>Cancelled</span>
                    : mine ? <button onClick={() => markDone(t)} style={{ ...btn('var(--dkgreen)', '#fff', 'var(--dkgreen)'), fontWeight: 600 }}>✓ Done</button>
                    : <span style={{ fontSize: 10.5, color: 'var(--gray2)', padding: '4px 8px', background: 'var(--ltgray)', borderRadius: 6 }}>👤 {t.assigned_to}</span>}
                </div>
              </div>
            )
          })}
      </div>

      {showAdd && <AddTaskModal user={user} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {followTask && <FollowUpModal task={followTask} user={user} onClose={() => setFollowTask(null)} onSaved={() => { setFollowTask(null); load() }} />}
      {historyTask && <HistoryModal task={historyTask} onClose={() => setHistoryTask(null)} />}
    </div>
  )
}

function chip(bg, c, border) { return { padding: '5px 12px', fontSize: 11, fontWeight: 600, border: `1px solid ${border}`, borderRadius: 99, background: bg, color: c, cursor: 'pointer' } }
function btn(bg, c, border) { return { padding: '5px 10px', fontSize: 11, fontWeight: 500, background: bg, color: c, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' } }
