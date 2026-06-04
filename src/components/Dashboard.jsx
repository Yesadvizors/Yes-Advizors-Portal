import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { getDueMeta } from '../helpers'

export default function Dashboard({ user, goTo }) {
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [compliance, setCompliance] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [t, c, cm, tm] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('compliance').select('*'),
      supabase.from('team').select('name').eq('is_active', true).order('name')
    ])
    setTasks(t.data || [])
    setClients(c.data || [])
    setCompliance(cm.data || [])
    setTeamMembers((tm.data || []).map(m => m.name))
    setLoading(false)
  }

  const today = new Date().toISOString().split('T')[0]
  const open = tasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled')
  const overdue = open.filter(t => t.due_date && t.due_date < today)
  const dueToday = open.filter(t => t.due_date === today)
  const thisWeek = open.filter(t => { const m = getDueMeta(t.due_date, t.status); return m.daysLeft !== null && m.daysLeft >= 0 && m.daysLeft <= 7 })
  const followToday = tasks.filter(t => t.next_followup_date === today)
  const compDue = compliance.filter(c => c.status !== 'Filed' && c.due_date >= today)
  const compOverdue = compliance.filter(c => c.status !== 'Filed' && c.due_date < today)

  const cards = [
    { label:'TOTAL TASKS',      value: tasks.length,                                    color:'#1A2942', tab:'tasks' },
    { label:'PENDING',          value: open.length,                                     color:'#1D4ED8', tab:'tasks' },
    { label:'OVERDUE',          value: overdue.length,                                  color:'#DC2626', tab:'tasks' },
    { label:'DUE TODAY',        value: dueToday.length,                                 color:'#D97706', bg:'#FFFBEB', tab:'tasks' },
    { label:'COMPLETED',        value: tasks.filter(t => t.status==='Done').length,     color:'#0D7A53', tab:'tasks' },
    { label:'FOLLOW-UP TODAY',  value: followToday.length,                              color:'#7C3AED', bg:'#F5F3FF', tab:'tasks' },
    { label:'ACTIVE CLIENTS',   value: clients.length,                                  color:'#0369A1', tab:'clients' },
    { label:'COMPLIANCE DUE',   value: compDue.length + compOverdue.length,             color:'#BE185D', tab:'compliance' },
  ]

  // Dynamic team workload from team table
  const workload = teamMembers.map(name => ({
    name,
    count: open.filter(t => { const a = t.assigned_to || ''; return a === name || a.startsWith(name.split(' ')[0]) }).length
  })).sort((a, b) => b.count - a.count)

  return (
    <div>
      <h1 style={{ fontSize:24, fontWeight:700, color:'var(--navy2)', marginBottom:4 }}>Welcome, {user.name}</h1>
      <p style={{ fontSize:14, color:'var(--gray)', marginBottom:24 }}>Firm overview · {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}</p>

      {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--gray2)' }}>Loading...</div> : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14 }}>
            {cards.map(c => (
              <div key={c.label} onClick={() => goTo && goTo(c.tab)} className="card"
                style={{ padding:18, borderTop:`3px solid ${c.color}`, background:c.bg||'#fff', cursor:'pointer' }}>
                <div style={{ fontSize:10.5, fontWeight:600, color:'var(--gray2)', letterSpacing:0.5, marginBottom:8 }}>{c.label}</div>
                <div style={{ fontSize:30, fontWeight:700, color:c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {(overdue.length > 0 || compOverdue.length > 0) && (
            <div className="card" style={{ padding:18, marginTop:20, background:'#FEF2F2', border:'1px solid #FECACA' }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#DC2626', marginBottom:6 }}>⚠ Attention needed</div>
              <div style={{ fontSize:13, color:'#7F1D1D' }}>
                {overdue.length > 0 && `${overdue.length} overdue task${overdue.length>1?'s':''}`}
                {overdue.length > 0 && compOverdue.length > 0 && ' · '}
                {compOverdue.length > 0 && `${compOverdue.length} overdue compliance filing${compOverdue.length>1?'s':''}`}
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:16, marginTop:20 }}>
            <div className="card" style={{ padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Team Workload (open tasks)</h3>
              {workload.length === 0
                ? <div style={{ fontSize:13, color:'var(--gray2)' }}>No team members found.</div>
                : workload.map(w => (
                  <div key={w.name} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <span style={{ fontSize:13, width:80, color:'var(--gray)', flexShrink:0 }}>{w.name}</span>
                    <div style={{ flex:1, height:8, background:'var(--ltgray)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ width:`${Math.min(w.count*12,100)}%`, height:'100%', background:'var(--dkgreen)', borderRadius:99 }} />
                    </div>
                    <span style={{ fontSize:13, fontWeight:600, width:24, textAlign:'right' }}>{w.count}</span>
                  </div>
                ))}
            </div>

            <div className="card" style={{ padding:20 }}>
              <h3 style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Due This Week ({thisWeek.length})</h3>
              {thisWeek.length === 0
                ? <div style={{ fontSize:13, color:'var(--gray2)' }}>Nothing due this week. 🎉</div>
                : thisWeek.slice(0,6).map(t => {
                    const m = getDueMeta(t.due_date, t.status)
                    return (
                      <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid var(--border2)' }}>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.task_name}</div>
                          <div style={{ fontSize:11, color:'var(--gray)' }}>{t.client_name} · {t.assigned_to}</div>
                        </div>
                        <span style={{ fontSize:11, color:m.color, fontWeight:600, marginLeft:8 }}>{m.label}</span>
                      </div>
                    )
                  })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
