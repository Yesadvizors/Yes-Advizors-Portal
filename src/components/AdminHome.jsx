import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { CLOSED_TASK_STATUSES, pgStatusList } from '../helpers'
import { activateProps } from '../lib/a11y'

// Firm Overview — read-only, Admin-only executive dashboard.
// Admin-only: rendered only when user.is_admin === true (route guard in App.jsx)
// plus the internal guard below. All figures come from real database records.
// No PAN/GSTIN/financial/bank/document-content data is read.
//
// Definitions (fixed):
//   active client        : status='Active' AND is_draft != true AND is_test_client != true
//   compliance overdue / due-soon / by-area : from the AUTHORITATIVE v_firm_dashboard view
//     (E2E-C1) — the SAME source the Dashboard and the Compliance Firm Dashboard use. The old
//     compliance_calendar reads are gone: that table is unpopulated (0 rows on dev), so it made
//     Firm Overview show 0 overdue while Compliance/Dashboard (via v_firm_dashboard) showed the
//     real count. The view already applies the terminal-status truth server-side, so there is
//     no independent overdue rule / terminal list here.
//   open task            : status NOT IN CLOSED_TASK_STATUSES (Done, Cancelled, Filed / Completed) — the SHARED truth in helpers.js, derived below so Firm Overview counts match Dashboard/Tasks/Client 360
//   overdue task         : open task AND due_date < today (IST)
//   clients w/o documents: active clients having zero rows in documents
//   (team workload       : REMOVED — no reliable unique task→member link exists)
//   (awaiting review     : DEFERRED — no review-status field exists)

// E2E-1: derive the server-side open-task filter from the shared CLOSED_TASK_STATUSES so a
// Filed / Completed task is counted closed here exactly as it is in Tasks/Dashboard/Client 360.
const DONE_TASK = pgStatusList(CLOSED_TASK_STATUSES)
const num = (v) => Number(v) || 0

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
    const { today, todayStartISO } = istDates()
    try {
      const [
        activeRes, firmRes, openRes, overdueTaskRes, docsTodayRes, docClientRes,
      ] = await Promise.all([
        // Minimal select (client_id, cin) — serves active count + missing-CIN + no-docs
        supabase.from('clients').select('client_id,cin')
          .eq('status', 'Active').not('is_draft', 'is', true).not('is_test_client', 'is', true),
        // E2E-C1: compliance overdue / due-soon / by-area come from the AUTHORITATIVE
        // v_firm_dashboard view — the SAME source the Bento Dashboard and the Compliance Firm
        // Dashboard use (the view applies the terminal-status truth server-side). One aggregate
        // read replaces three empty compliance_calendar reads.
        supabase.from('v_firm_dashboard').select('category,total,overdue,pending,due_in_7_days'),
        supabase.from('tasks').select('*', { count: 'exact', head: true })
          .not('status', 'in', DONE_TASK),
        supabase.from('tasks').select('*', { count: 'exact', head: true })
          .not('status', 'in', DONE_TASK).lt('due_date', today),
        supabase.from('documents').select('*', { count: 'exact', head: true })
          .gte('created_at', todayStartISO),
        // Only client_id column, for the no-documents calculation
        supabase.from('documents').select('client_id'),
      ])

      const firstErr = activeRes.error || firmRes.error || openRes.error
        || overdueTaskRes.error || docsTodayRes.error || docClientRes.error
      if (firstErr) throw firstErr

      const active = activeRes.data || []
      const docClientIds = new Set((docClientRes.data || []).map(r => r.client_id))

      // Compliance aggregates from the authoritative view (same numbers as Dashboard/Compliance).
      const firm = firmRes.data || []
      const overdueCompliance = firm.reduce((a, r) => a + num(r.overdue), 0)
      const complianceDueSoon = firm.reduce((a, r) => a + num(r.due_in_7_days), 0)
      // Per-area breakdown for the panel — categories that carry any open work, worst first.
      const complianceByArea = firm
        .map(r => ({ category: r.category || '—', overdue: num(r.overdue), dueSoon: num(r.due_in_7_days), pending: num(r.pending), total: num(r.total) }))
        .filter(r => r.overdue + r.dueSoon + r.pending > 0)
        .sort((a, b) => (b.overdue - a.overdue) || (b.dueSoon - a.dueSoon) || (b.pending - a.pending))

      const loadedAt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true,
      }).format(new Date())

      setD({
        activeClients: active.length,
        missingCin: active.filter(c => !c.cin || c.cin.trim() === '').length,
        clientsNoDocs: active.filter(c => !docClientIds.has(c.client_id)).length,
        complianceDueSoon,
        overdueCompliance,
        openTasks: openRes.count || 0,
        overdueTasks: overdueTaskRes.count || 0,
        docsToday: docsTodayRes.count || 0,
        complianceByArea,
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
    <div {...(tab ? activateProps(() => goTo?.(tab)) : {})}
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
        {metric(icons.calendar, 'Compliance due (7 days)', d.complianceDueSoon, false, 'compliance')}
        {metric(icons.alert, 'Overdue compliance', d.overdueCompliance, true, 'compliance')}
        {metric(icons.task, 'Open tasks', d.openTasks, false, 'tasks')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 18 }}>
        {panel(icons.calendar, 'Compliance by area', (
          // E2E-C1: from v_firm_dashboard (the authoritative view) — the same category figures
          // the Compliance Firm Dashboard shows, so Firm Overview and Compliance never disagree.
          d.complianceByArea.length === 0 ? emptyState('No open compliance obligations.') : d.complianceByArea.map((r, i) => (
            <div key={r.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < d.complianceByArea.length - 1 ? `1px solid ${C.hair}` : 'none' }}>
              <span style={{ fontSize: 13, color: C.ink }}>{r.category}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {r.overdue > 0 && <span style={{ fontSize: 11.5, fontWeight: 700, color: C.red, background: C.redSoft, padding: '2px 8px', borderRadius: 99 }}>{r.overdue} overdue</span>}
                {r.dueSoon > 0 && <span style={{ fontSize: 11.5, fontWeight: 700, color: C.amber, background: C.amberSoft, padding: '2px 8px', borderRadius: 99 }}>{r.dueSoon} due soon</span>}
                <span style={{ fontSize: 12.5, color: C.muted }}>{r.pending} pending</span>
              </span>
            </div>
          ))
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
