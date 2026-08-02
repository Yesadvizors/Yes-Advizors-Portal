import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { getDueMeta } from '../helpers'
import { PageHeader, MetricCard, Card, LoadingState, ErrorState, EmptyState } from './ui'

export default function Dashboard({ user, goTo }) {
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [trackerSummary, setTrackerSummary] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    setError(null)
    const [t, c, cm, tm] = await Promise.all([
      supabase.from('tasks').select('id,task_name,status,due_date,assigned_to,client_name,next_followup_date'),
      supabase.from('clients').select('client_id,status,is_draft,is_test_client'),
      supabase.from('v_firm_dashboard').select('category,total,completed,overdue,pending,due_in_7_days'),
      supabase.from('team').select('id,name').eq('is_active', true).order('name')
    ])
    // If any core query failed, show an error rather than a dashboard of zeros —
    // a data outage must not look like a firm with nothing due.
    const firstError = [t, c, cm, tm].map(r => r.error).find(Boolean)
    if (firstError) {
      // Keep the raw error in the console only; users see a business-safe message.
      console.error('[Dashboard] Failed to load dashboard data:', firstError)
      setError(true); setLoading(false); return
    }
    setTasks(t.data || [])
    setClients(c.data || [])
    setTrackerSummary(cm.data || [])
    setTeamMembers(tm.data || [])
    setLoading(false)
  }

  const today = new Date().toISOString().split('T')[0]
  const open = tasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled')
  const overdue = open.filter(t => t.due_date && t.due_date < today)
  const dueToday = open.filter(t => t.due_date === today)
  const thisWeek = open.filter(t => { const m = getDueMeta(t.due_date, t.status); return m.daysLeft !== null && m.daysLeft >= 0 && m.daysLeft <= 7 })
  const followToday = tasks.filter(t => t.next_followup_date === today)
  const compTotal = trackerSummary.reduce((s,r) => s + (Number(r.overdue)||0) + (Number(r.pending)||0), 0)
  const compOverdueTotal = trackerSummary.reduce((s,r) => s + (Number(r.overdue)||0), 0)
  const compOverdue = { length: compOverdueTotal }

  // Client counts. Same definition of "active client" as AdminHome.jsx (see its
  // header comment): status Active, not a draft, not a test client. Compared with
  // !== true / === true rather than truthiness, because these columns default to
  // null for real clients.
  const realClients = clients.filter(c => c.is_test_client !== true)
  const activeClients = realClients.filter(c => c.status === 'Active' && c.is_draft !== true)
  const draftClients = realClients.filter(c => c.status === 'Draft' || c.is_draft === true)

  const cards = [
    { label:'TOTAL TASKS',      value: tasks.length,                                    color:'#1A2942', tab:'tasks' },
    { label:'PENDING',          value: open.length,                                     color:'#1D4ED8', tab:'tasks' },
    { label:'OVERDUE',          value: overdue.length,                                  color:'#DC2626', tab:'tasks' },
    { label:'DUE TODAY',        value: dueToday.length,                                 color:'#D97706', tab:'tasks' },
    { label:'COMPLETED',        value: tasks.filter(t => t.status==='Done').length,     color:'#0D7A53', tab:'tasks' },
    { label:'FOLLOW-UP TODAY',  value: followToday.length,                              color:'#7C3AED', tab:'tasks' },
    { label:'ACTIVE CLIENTS',   value: activeClients.length,                            color:'#0369A1', tab:'clients' },
    { label:'DRAFT CLIENTS',    value: draftClients.length,                             color:'#64748B', tab:'clients' },
    { label:'COMPLIANCE DUE',   value: compTotal,                                       color:'#BE185D', tab:'compliance' },
  ]

  // Dynamic team workload from team table. Keyed by team.id — team.name is not
  // unique, so two members sharing a name would collide as React keys.
  const workload = teamMembers.map(({ id, name }) => ({
    id,
    name,
    count: open.filter(t => { const a = t.assigned_to || ''; return a === name || a.startsWith(name.split(' ')[0]) }).length
  })).sort((a, b) => b.count - a.count)

  const todayLong = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })

  return (
    <div>
      <PageHeader title={`Welcome, ${user.name}`} subtitle={`Firm overview · ${todayLong}`} />

      {loading ? <Card><LoadingState label="Loading firm overview…" /></Card>
       : error ? (
        <Card>
          <ErrorState
            title="Couldn't load the dashboard"
            message="We couldn't load the dashboard information. Please retry. If the problem continues, contact the portal administrator."
          />
          <div style={{ textAlign:'center', paddingBottom:24, marginTop:-8 }}>
            <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={load}>Retry</button>
          </div>
        </Card>
       ) : (
        <>
          <div className="ds-metric-grid">
            {cards.map(c => (
              <MetricCard key={c.label} label={c.label} value={c.value} accent={c.color} onClick={() => goTo && goTo(c.tab)} />
            ))}
          </div>

          {(overdue.length > 0 || compOverdue.length > 0) && (
            <Card className="ds-card-pad" style={{ marginTop:20, background:'var(--ds-danger-bg)', borderColor:'var(--ds-danger-bd)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }} aria-hidden="true">⚠️</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:650, color:'var(--ds-danger)' }}>Attention needed</div>
                  <div style={{ fontSize:13, color:'#7F1D1D', marginTop:2 }}>
                    {overdue.length > 0 && `${overdue.length} overdue task${overdue.length>1?'s':''}`}
                    {overdue.length > 0 && compOverdue.length > 0 && ' · '}
                    {compOverdue.length > 0 && `${compOverdue.length} overdue compliance filing${compOverdue.length>1?'s':''}`}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:16, marginTop:20 }}>
            <Card>
              <div className="ds-card-head">
                <div className="ds-card-title">Team workload</div>
                <span className="ds-muted" style={{ fontSize:12 }}>Open tasks</span>
              </div>
              <div className="ds-card-body">
                {workload.length === 0
                  ? <EmptyState icon="🧑‍💼" title="No team members" message="No active team members were found." />
                  : workload.map(w => (
                    <div key={w.id} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:11 }}>
                      <span className="ds-truncate" style={{ fontSize:13, width:96, color:'var(--ds-text-muted)', flexShrink:0 }}>{w.name}</span>
                      <div style={{ flex:1, height:8, background:'var(--ds-n-100)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ width:`${Math.min(w.count*12,100)}%`, height:'100%', background:'var(--ds-brand)', borderRadius:99, transition:'width .3s ease' }} />
                      </div>
                      <span className="ds-mono-num" style={{ fontSize:13, fontWeight:650, width:24, textAlign:'right' }}>{w.count}</span>
                    </div>
                  ))}
              </div>
            </Card>

            <Card>
              <div className="ds-card-head">
                <div className="ds-card-title">Due this week</div>
                <span className="ds-badge ds-badge-neutral">{thisWeek.length}</span>
              </div>
              <div className="ds-card-body">
                {thisWeek.length === 0
                  ? <EmptyState icon="🎉" title="All clear" message="Nothing is due in the next seven days." />
                  : thisWeek.slice(0,6).map(t => {
                      const m = getDueMeta(t.due_date, t.status)
                      return (
                        <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--ds-border-2)' }}>
                          <div style={{ minWidth:0, flex:1 }}>
                            <div className="ds-truncate" style={{ fontSize:13, fontWeight:550 }}>{t.task_name}</div>
                            <div className="ds-muted" style={{ fontSize:11.5, marginTop:1 }}>{t.client_name} · {t.assigned_to}</div>
                          </div>
                          <span style={{ fontSize:11.5, color:m.color, fontWeight:650, marginLeft:10, whiteSpace:'nowrap' }}>{m.label}</span>
                        </div>
                      )
                    })}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
