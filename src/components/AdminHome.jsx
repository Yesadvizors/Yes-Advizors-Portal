import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'

// Firm Overview — read-only, Admin-only executive dashboard.
// Admin-only: rendered only when user.is_admin === true (route guard in App.jsx)
// plus the internal guard below. All figures come from real database records.
// No PAN/GSTIN/financial/bank/document-content data is read.
//
// Definitions (fixed):
//   active client        : status='Active' AND is_draft != true AND is_test_client != true
//   due this month       : compliance_calendar.due_date within current IST month AND status not completed
//   overdue compliance   : is_overdue = true AND status not completed
//   open task            : status NOT IN ('Done','Cancelled')   (authoritative: helpers.js)
//   overdue task         : open task AND due_date < today (IST)
//   clients w/o documents: active clients having zero rows in documents
//   (team workload       : REMOVED — no reliable unique task→member link exists)
//   (awaiting review     : DEFERRED — no review-status field exists)

const DONE_TASK = '("Done","Cancelled")'
const DONE_COMPLIANCE = '("Filed","Completed","Partner Approved","Not Applicable","Closed")'

// India-local (Asia/Kolkata, UTC+5:30) date helper — applied consistently.
function istDates() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()) // 'YYYY-MM-DD' in IST
  const [y, m] = today.split('-')
  const daysInMonth = new Date(Number(y), Number(m), 0).getDate()
  return {
    today,
    monthStart: `${y}-${m}-01`,
    monthEnd: `${y}-${m}-${String(daysInMonth).padStart(2, '0')}`,
    todayStartISO: `${today}T00:00:00+05:30`,
  }
}

const C = {
  ink: '#0F1B2D', body: '#3D4A5C', muted: '#8A94A6', hair: '#EAEDF1',
  surface: '#FFFFFF', blue: '#1F5FCC', blueSoft: '#EEF3FC',
  red: '#C2374A', redSoft: '#FBEEF0', amber: '#B57A12', amberSoft: '#FBF3E4',
  green: '#1E7A53', greenSoft: '#EAF5EF',
}

export default function AdminHome({ user, goTo }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [d, setD] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    const { today, monthStart, monthEnd, todayStartISO } = istDates()
    try {
      const [
        activeRes, dueRes, overdueRes, openRes, overdueTaskRes, docsTodayRes, upcomingRes, docClientRes,
      ] = await Promise.all([
        // Minimal select (client_id, cin) — serves active count + missing-CIN + no-docs
        supabase.from('clients').select('client_id,cin')
          .eq('status', 'Active').not('is_draft', 'is', true).not('is_test_client', 'is', true),
        // Headline counts (no rows downloaded)
        supabase.from('compliance_calendar').select('*', { count: 'exact', head: true })
          .gte('due_date', monthStart).lte('due_date', monthEnd).not('status', 'in', DONE_COMPLIANCE),
        supabase.from('compliance_calendar').select('*', { count: 'exact', head: true })
          .eq('is_overdue', true).not('status', 'in', DONE_COMPLIANCE),
        supabase.from('tasks').select('*', { count: 'exact', head: true })
          .not('status', 'in', DONE_TASK),
        supabase.from('tasks').select('*', { count: 'exact', head: true })
          .not('status', 'in', DONE_TASK).lt('due_date', today),
        supabase.from('documents').select('*', { count: 'exact', head: true })
          .gte('created_at', todayStartISO),
        // Upcoming deadlines: filtered + ordered in DB; deduped to 5 distinct
        // name+date entries in JS (no client count shown — counts can't be
        // computed reliably without over/under-stating under a row limit).
        supabase.from('compliance_calendar').select('compliance_name,period,due_date,days_to_due')
          .gte('due_date', today).not('status', 'in', DONE_COMPLIANCE)
          .order('due_date', { ascending: true }).limit(100),
        // Only client_id column, for the no-documents calculation
        supabase.from('documents').select('client_id'),
      ])

      const firstErr = activeRes.error || dueRes.error || overdueRes.error || openRes.error
        || overdueTaskRes.error || docsTodayRes.error || upcomingRes.error || docClientRes.error
      if (firstErr) throw firstErr

      const active = activeRes.data || []
      const docClientIds = new Set((docClientRes.data || []).map(r => r.client_id))

      // First 5 distinct (name + date) upcoming deadlines — no client count
      const seen = new Set()
      const upcoming = []
      for (const r of (upcomingRes.data || [])) {
        const key = `${r.compliance_name}|${r.due_date}`
        if (seen.has(key)) continue
        seen.add(key)
        upcoming.push(r)
        if (upcoming.length >= 5) break
      }

      const loadedAt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true,
      }).format(new Date())

      setD({
        activeClients: active.length,
        missingCin: active.filter(c => !c.cin || c.cin.trim() === '').length,
        clientsNoDocs: active.filter(c => !docClientIds.has(c.client_id)).length,
        dueThisMonth: dueRes.count || 0,
        overdueCompliance: overdueRes.count || 0,
        openTasks: openRes.count || 0,
        overdueTasks: overdueTaskRes.count || 0,
        docsToday: docsTodayRes.count || 0,
        upcoming,
        loadedAt,
      })
    } catch (e) {
      console.error('[AdminHome] dashboard load failed:', e)
      setError('Something went wrong while loading the dashboard.')
    } finally {
      setLoading(false)
    }
  }

  if (user?.is_admin !== true) {
    return <div style={{ padding: 48, textAlign: 'center', color: C.muted, fontSize: 14 }}>This dashboard is available to Admin users only.</div>
  }

  if (loading) return (
    <div style={{ padding: 64, textAlign: 'center', color: C.muted, fontSize: 14 }}>
      <div style={{ width: 22, height: 22, border: `2px solid ${C.hair}`, borderTopColor: C.blue, borderRadius: '50%', margin: '0 auto 14px', animation: 'yaspin 0.7s linear infinite' }} />
      Loading dashboard…
      <style>{`@keyframes yaspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ padding: 56, textAlign: 'center' }}>
      <div style={{ color: C.red, fontSize: 14, marginBottom: 14 }}>{error}</div>
      <button onClick={load} style={{ background: C.blue, color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
    </div>
  )

  const now = new Date()
  const ico = (path) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
  const icons = {
    clients: ico(<><path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" /><path d="M3 21v-1a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v1" /></>),
    calendar: ico(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>),
    alert: ico(<><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>),
    task: ico(<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>),
    doc: ico(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>),
    bell: ico(<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>),
  }

  const metric = (icon, label, value, urgent, tab) => (
    <div onClick={tab ? () => goTo?.(tab) : undefined}
      style={{ background: C.surface, border: `1px solid ${C.hair}`, borderRadius: 14, padding: '18px 20px', cursor: tab ? 'pointer' : 'default', boxShadow: '0 1px 2px rgba(16,27,45,0.04)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: urgent ? C.redSoft : C.blueSoft, color: urgent ? C.red : C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: urgent && value > 0 ? C.red : C.ink, letterSpacing: '-0.02em' }}>{value}</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 7, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  )

  const panel = (icon, title, children) => (
    <div style={{ background: C.surface, border: `1px solid ${C.hair}`, borderRadius: 14, boxShadow: '0 1px 2px rgba(16,27,45,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '15px 20px', borderBottom: `1px solid ${C.hair}` }}>
        <span style={{ color: C.muted, display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{title}</span>
      </div>
      <div style={{ padding: '8px 20px 16px' }}>{children}</div>
    </div>
  )

  const emptyState = (text) => (
    <div style={{ padding: '34px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>{text}</div>
  )

  const alerts = []
  if (d.overdueCompliance > 0) alerts.push({ tone: 'red', text: `${d.overdueCompliance} compliance item(s) overdue` })
  if (d.overdueTasks > 0) alerts.push({ tone: 'red', text: `${d.overdueTasks} task(s) past due date` })
  if (d.missingCin > 0) alerts.push({ tone: 'amber', text: `${d.missingCin} active client(s) missing CIN` })
  if (alerts.length === 0) alerts.push({ tone: 'green', text: 'No alerts needing attention right now.' })
  const toneColor = (t) => t === 'red' ? C.red : t === 'amber' ? C.amber : C.green
  const toneSoft = (t) => t === 'red' ? C.redSoft : t === 'amber' ? C.amberSoft : C.greenSoft

  return (
    <div style={{ color: C.body }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em', margin: 0 }}>Firm overview</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '5px 0 0' }}>{now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.hair}`, padding: '6px 12px', borderRadius: 99 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
          Updated at {d.loadedAt}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        {metric(icons.clients, 'Active clients', d.activeClients, false, 'clients')}
        {metric(icons.calendar, 'Compliance due this month', d.dueThisMonth, false, 'compliance')}
        {metric(icons.alert, 'Overdue compliance', d.overdueCompliance, true, 'compliance')}
        {metric(icons.task, 'Open tasks', d.openTasks, false, 'tasks')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 18 }}>
        {panel(icons.calendar, 'Upcoming statutory deadlines', (
          d.upcoming.length === 0 ? emptyState('No upcoming deadlines.') : d.upcoming.map((r, i) => {
            const urgent = r.days_to_due != null && r.days_to_due <= 3
            const soon = r.days_to_due != null && r.days_to_due <= 7
            const col = urgent ? C.red : soon ? C.amber : C.body
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < d.upcoming.length - 1 ? `1px solid ${C.hair}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: col }} />
                  <span style={{ fontSize: 13, color: C.ink }}>{r.compliance_name}{r.period && !(r.compliance_name || '').includes(r.period) ? <span style={{ color: C.muted }}> · {r.period}</span> : ''}</span>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: col }}>{fmtDate(r.due_date)}</span>
              </div>
            )
          })
        ))}

        {panel(icons.doc, 'Documents', (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${C.hair}` }}>
              <span style={{ fontSize: 13, color: C.body }}>Uploaded today</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{d.docsToday}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0' }}>
              <span style={{ fontSize: 13, color: C.body }}>Clients with no uploaded documents</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: d.clientsNoDocs > 0 ? C.amber : C.ink }}>{d.clientsNoDocs}</span>
            </div>
          </div>
        ))}
      </div>

      {panel(icons.bell, 'Alerts for admin', (
        alerts.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', marginTop: i === 0 ? 4 : 8, background: toneSoft(a.tone), borderRadius: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: toneColor(a.tone), flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: C.ink }}>{a.text}</span>
          </div>
        ))
      ))}
    </div>
  )
}
