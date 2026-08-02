/**
 * Client 360° — tab section components.
 *
 * Pure presentation over already-loaded rows. NO Supabase / .rpc / data access here
 * (the DocumentsSection embeds the existing DocumentManager, which owns its own reads
 * and role-consistent upload flow — a reuse, not a new data path). Every section resolves
 * its own loading / error / empty state via <SectionState> so one panel failing never
 * blanks the page, and no raw backend error text is shown.
 */

import { useMemo } from 'react'
import { fmtDate, getDueMeta } from '../../helpers'
import {
  complianceRowTag, followUpState, isFollowUpPending, summarizeFinancials,
  buildActivityFeed, complianceByCategory,
} from '../../lib/client360'
import DocumentManager from '../DocumentManager'
import { S, C, Badge, Panel, SectionState, DataTable, KeyVal, dash, dateText, yesno } from './Client360Primitives'

// group → { toneName, label } for the shared compliance verdict
const AGE = {
  overdue: { toneName: 'critical', label: 'Overdue' },
  today: { toneName: 'warning', label: 'Due today' },
  duesoon: { toneName: 'warning', label: 'Due soon' },
  upcoming: { toneName: 'good', label: 'Upcoming' },
  closed: { toneName: 'good', label: 'Closed' },
  nodate: { toneName: 'neutral', label: 'No date' },
  none: { toneName: 'neutral', label: '—' },
}
function AgeBadge({ group }) {
  const a = AGE[group] || AGE.none
  return <Badge toneName={a.toneName}>{a.label}</Badge>
}

// ── Overview ───────────────────────────────────────────────────────────────
export function OverviewSection({ header, compliancePanel, today, onEditClient, canEditClient }) {
  const cats = useMemo(
    () => complianceByCategory(compliancePanel.rows, today),
    [compliancePanel.rows, today],
  )
  const h = header
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Panel
        title="Client details"
        right={canEditClient ? <button type="button" style={S.ghost} onClick={onEditClient}>✏️ Edit client</button> : null}
      >
        <KeyVal items={[
          { label: 'Legal name', value: h.name },
          { label: 'Client code', value: h.code },
          { label: 'Entity type', value: h.entityType },
          { label: 'Status', value: h.status },
          { label: 'PAN', value: h.pan },
          { label: 'TAN', value: h.tan },
          { label: 'CIN / LLPIN', value: h.cin },
          { label: 'GSTIN', value: h.gstin },
          { label: 'GST registered on', value: h.gstRegisteredOn ? fmtDate(h.gstRegisteredOn) : null },
          { label: 'Primary contact', value: h.primaryContact },
          { label: 'Contact designation', value: h.primaryContactDesignation },
          { label: 'Email', value: h.email },
          { label: 'Mobile', value: h.mobile },
          { label: 'Date of incorporation', value: h.incorporation ? fmtDate(h.incorporation) : null },
          { label: 'Current financial year', value: h.currentFy },
          { label: 'Client start FY', value: h.clientStartFy },
          { label: 'Onboarded by', value: h.onboardedBy },
        ]} />
      </Panel>

      <Panel title="Compliance by category">
        <SectionState
          loading={compliancePanel.loading}
          error={compliancePanel.error}
          empty={cats.length === 0}
          onRetry={compliancePanel.onRetry}
          errorMessage="Compliance data could not be loaded."
          emptyLabel="No compliance obligations recorded for this client."
        >
          <DataTable
            columns={[
              { key: 'category', label: 'Category' },
              { key: 'total', label: 'Total', render: (r) => r.total },
              { key: 'open', label: 'Open', render: (r) => r.open },
              { key: 'overdue', label: 'Overdue', render: (r) => (r.overdue > 0 ? <Badge toneName="critical">{r.overdue}</Badge> : '0') },
            ]}
            rows={cats}
          />
        </SectionState>
      </Panel>
    </div>
  )
}

// ── Compliance ───────────────────────────────────────────────────────────
export function ComplianceSection({ panel, today }) {
  const rows = useMemo(() => {
    const withTag = (panel.rows || []).map((r) => ({ ...r, _group: complianceRowTag(r.due_date, r.status, today) }))
    const rank = { overdue: 0, today: 1, duesoon: 2, upcoming: 3, nodate: 4, closed: 5, none: 6 }
    return withTag.sort((a, b) => (rank[a._group] ?? 9) - (rank[b._group] ?? 9) || String(a.due_date).localeCompare(String(b.due_date)))
  }, [panel.rows, today])

  return (
    <Panel title="Compliance obligations">
      <SectionState
        loading={panel.loading} error={panel.error} empty={rows.length === 0} onRetry={panel.onRetry}
        errorMessage="Compliance data could not be loaded." emptyLabel="No compliance obligations recorded for this client."
      >
        <DataTable
          columns={[
            { key: 'compliance_name', label: 'Compliance' },
            { key: 'compliance_type', label: 'Type' },
            { key: 'period', label: 'Period', render: (r) => dash(r.period || r.fy_label) },
            { key: 'due_date', label: 'Due', render: (r) => dateText(r.due_date) },
            { key: 'status', label: 'Status' },
            { key: '_group', label: 'Ageing', render: (r) => <AgeBadge group={r._group} /> },
          ]}
          rows={rows}
        />
      </SectionState>
    </Panel>
  )
}

// ── Tasks ────────────────────────────────────────────────────────────────
export function TasksSection({ panel, canCreateTask, onCreateTask }) {
  const rows = useMemo(() => {
    const list = panel.rows || []
    return [...list].sort((a, b) => {
      const am = getDueMeta(a.due_date, a.status).daysLeft
      const bm = getDueMeta(b.due_date, b.status).daysLeft
      const av = am == null ? 1e9 : am, bv = bm == null ? 1e9 : bm
      return av - bv
    })
  }, [panel.rows])

  return (
    <Panel
      title="Tasks"
      right={canCreateTask ? <button type="button" style={S.action} onClick={onCreateTask}>+ Create task</button> : null}
    >
      <SectionState
        loading={panel.loading} error={panel.error} empty={rows.length === 0} onRetry={panel.onRetry}
        errorMessage="Tasks could not be loaded." emptyLabel="No tasks for this client."
      >
        <DataTable
          columns={[
            { key: 'task_name', label: 'Task' },
            { key: 'work_type', label: 'Type' },
            { key: 'assigned_to', label: 'Assigned to' },
            { key: 'due_date', label: 'Due', render: (r) => {
              const m = getDueMeta(r.due_date, r.status)
              return <span>{dateText(r.due_date)}{m.badge ? <span style={{ marginLeft: 6, fontSize: 11, color: m.color }}>{m.badge}</span> : null}</span>
            } },
            { key: 'status', label: 'Status' },
            { key: 'priority', label: 'Priority' },
          ]}
          rows={rows}
        />
      </SectionState>
    </Panel>
  )
}

// ── Follow-ups (derived from open tasks' next_followup_date) ────────────────
export function FollowUpsSection({ tasksPanel, today }) {
  const rows = useMemo(
    () => (tasksPanel.rows || []).filter(isFollowUpPending)
      .map((t) => ({ ...t, _fu: followUpState(t, today) }))
      .sort((a, b) => String(a.next_followup_date).localeCompare(String(b.next_followup_date))),
    [tasksPanel.rows, today],
  )
  const fuBadge = (state) => state === 'overdue'
    ? <Badge toneName="critical">Overdue</Badge>
    : state === 'today' ? <Badge toneName="warning">Today</Badge> : <Badge toneName="good">Upcoming</Badge>

  return (
    <Panel title="Pending follow-ups">
      <SectionState
        loading={tasksPanel.loading} error={tasksPanel.error} empty={rows.length === 0} onRetry={tasksPanel.onRetry}
        errorMessage="Follow-ups could not be loaded (they are derived from tasks)."
        emptyLabel="No pending follow-ups scheduled."
      >
        <DataTable
          columns={[
            { key: 'task_name', label: 'Task' },
            { key: 'next_action', label: 'Next action' },
            { key: 'next_followup_date', label: 'Follow-up due', render: (r) => dateText(r.next_followup_date) },
            { key: '_fu', label: 'State', render: (r) => fuBadge(r._fu) },
            { key: 'assigned_to', label: 'Assigned to' },
          ]}
          rows={rows}
        />
      </SectionState>
    </Panel>
  )
}

// ── Documents (reuses the existing per-client DocumentManager) ──────────────
export function DocumentsSection({ client, user }) {
  return (
    <Panel title="Documents">
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
        Documents for this client. Upload, view and manage use the existing document manager.
      </div>
      <DocumentManager client={client} user={user} />
    </Panel>
  )
}

// ── Financials ─────────────────────────────────────────────────────────────
export function FinancialsSection({ panel, header }) {
  const fin = useMemo(() => summarizeFinancials(panel.rows, header.currentFy), [panel.rows, header.currentFy])
  const rows = useMemo(
    () => [...(panel.rows || [])].sort((a, b) => String(b.fy_label).localeCompare(String(a.fy_label))),
    [panel.rows],
  )
  const statusTone = (s) => (s === 'Reviewed' ? 'good' : s === 'Not Uploaded' || !s ? 'critical' : 'warning')
  return (
    <Panel title="Financials & review status">
      <SectionState
        loading={panel.loading} error={panel.error} empty={rows.length === 0} onRetry={panel.onRetry}
        errorMessage="Financials could not be loaded." emptyLabel="No financial documents tracked for this client."
      >
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>
          {header.currentFy}: {fin.focus.length} tracked · {fin.reviewed} reviewed · {fin.pending} pending review
        </div>
        <DataTable
          columns={[
            { key: 'fy_label', label: 'FY' },
            { key: 'doc_type', label: 'Document' },
            { key: 'status', label: 'Status', render: (r) => <Badge toneName={statusTone(r.status)}>{dash(r.status)}</Badge> },
            { key: 'extraction_status', label: 'Extraction' },
            { key: 'updated_at', label: 'Updated', render: (r) => dateText(r.updated_at) },
          ]}
          rows={rows}
        />
      </SectionState>
    </Panel>
  )
}

// ── Notices ──────────────────────────────────────────────────────────────
export function NoticesSection({ panel, today }) {
  const rows = useMemo(
    () => (panel.rows || []).map((n) => ({
      ...n,
      _group: complianceRowTag(n.individual_due_date || n.extended_due_date || n.response_due_date, n.status, today),
    })),
    [panel.rows, today],
  )
  return (
    <Panel title="Notices">
      <SectionState
        loading={panel.loading} error={panel.error} empty={rows.length === 0} onRetry={panel.onRetry}
        errorMessage="Notices could not be loaded." emptyLabel="No notices recorded for this client."
      >
        <DataTable
          columns={[
            { key: 'authority', label: 'Authority' },
            { key: 'notice_type', label: 'Type' },
            { key: 'section', label: 'Section' },
            { key: 'notice_date', label: 'Notice date', render: (r) => dateText(r.notice_date) },
            { key: 'response_due_date', label: 'Response due', render: (r) => dateText(r.individual_due_date || r.extended_due_date || r.response_due_date) },
            { key: '_group', label: 'Ageing', render: (r) => (r.reply_filed ? <Badge toneName="good">Replied</Badge> : <AgeBadge group={r._group} />) },
            { key: 'demand_raised', label: 'Demand', render: (r) => (r.demand_raised != null ? `₹${r.demand_raised}` : '—') },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
        />
      </SectionState>
    </Panel>
  )
}

// ── Team & access (derived — no client↔team assignment exists in the repo) ──
export function TeamAccessSection({ team, tasksPanel }) {
  return (
    <Panel title="Team & access">
      <SectionState
        loading={tasksPanel.loading} error={tasksPanel.error} empty={false} onRetry={tasksPanel.onRetry}
        errorMessage="Assignment data could not be loaded (derived from tasks)."
      >
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>
          The repository has no dedicated client-to-team / relationship-manager assignment field.
          The people below are derived from who is assigned to this client's tasks.
        </div>
        {team.assignees.length === 0 ? (
          <Badge toneName="warning">No team member is assigned to this client</Badge>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {team.assignees.map((n) => (
              <span key={n} style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, background: C.greenSoft, border: `1px solid ${C.border}`, borderRadius: 99, padding: '4px 12px' }}>{n}</span>
            ))}
          </div>
        )}
        {team.unresolvedComplianceAssignees > 0 && (
          <div style={{ fontSize: 12, color: C.faint, marginTop: 12 }}>
            {team.unresolvedComplianceAssignees} compliance obligation assignee(s) are recorded by ID only;
            resolving them to names requires a backend join (recorded as a dependency).
          </div>
        )}
      </SectionState>
    </Panel>
  )
}

// ── Recent activity (reliable per-client sources only) ──────────────────────
export function ActivitySection({ followUpsPanel, documentsPanel, tasksPanel }) {
  const feed = useMemo(
    () => buildActivityFeed({
      followUps: followUpsPanel.rows, documents: documentsPanel.rows, tasks: tasksPanel.rows,
    }),
    [followUpsPanel.rows, documentsPanel.rows, tasksPanel.rows],
  )
  const anyError = followUpsPanel.error || documentsPanel.error || tasksPanel.error
  const loading = followUpsPanel.loading || documentsPanel.loading || tasksPanel.loading
  const typeLabel = { follow_up: 'Follow-up', document: 'Document', task: 'Task' }
  const typeTone = { follow_up: 'good', document: 'neutral', task: 'warning' }

  return (
    <Panel title="Recent activity">
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
        Assembled from follow-ups, document uploads and task creation for this client. A unified
        firm-wide audit feed is a backend dependency and is not shown here.
      </div>
      <SectionState
        loading={loading} error={anyError} empty={feed.length === 0} onRetry={tasksPanel.onRetry}
        errorMessage="Some activity sources could not be loaded."
        emptyLabel="No recent activity recorded for this client."
      >
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {feed.map((e, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: `1px solid ${C.border2}` }}>
              <span style={{ marginTop: 1 }}><Badge toneName={typeTone[e.type]}>{typeLabel[e.type] || e.type}</Badge></span>
              <span style={{ flex: 1, fontSize: 13, color: C.body }}>{e.title}
                {e.actor ? <span style={{ color: C.faint }}> · {e.actor}</span> : null}</span>
              <span style={{ fontSize: 12, color: C.faint, whiteSpace: 'nowrap' }}>{dateText(e.ts)}</span>
            </li>
          ))}
        </ul>
      </SectionState>
    </Panel>
  )
}
