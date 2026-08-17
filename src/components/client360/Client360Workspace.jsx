/**
 * Client 360° Operational Workspace — orchestrator.
 *
 * A full-screen overlay launched from the client list/detail flow with the full client
 * row (both keys). It composes: a header, the operational summary cards, the
 * attention-required panel, and nine tabbed sections. READ-first: the only mutations are
 * the two quick actions, which REUSE existing, already-permission-checked modals
 * (AddTaskModal, OnboardingWizard) and the embedded DocumentManager — this component
 * issues no Supabase query, no .rpc and no write of its own.
 *
 * Access: fails closed. The launcher is Admin/Manager-gated; as defence-in-depth the
 * workspace also renders a safe restricted notice (not a raw error) if a non-authorised
 * user reaches it. (This differs from the Service Applicability section's silent-null —
 * a full page the user explicitly opened should explain itself rather than look broken.)
 *
 * Reliability (spec G/H): each section resolves its own loading/error/empty state and a
 * failure in one panel never blanks the others; failed loads surface in the attention
 * panel and are never presented as clean.
 */

import { useMemo, useState } from 'react'
import { useEscapeKey } from '../../useEscapeKey'
import { todayLocal } from '../../helpers'
import { useClient360Role } from '../../hooks/useClient360Role'
import { useClient360Data } from '../../hooks/useClient360Data'
import {
  buildClientHeader, summarizeCompliance, summarizeTasks, summarizeFollowUps,
  summarizeDocuments, summarizeNotices, summarizeFinancials, summarizeTeam,
  buildAttentionItems, sortAttention,
} from '../../lib/client360'
import { S, C, StatCard, Panel, Badge, dash } from './Client360Primitives'
import {
  OverviewSection, ComplianceSection, TasksSection, FollowUpsSection,
  DocumentsSection, FinancialsSection, NoticesSection, TeamAccessSection, ActivitySection,
} from './Client360Sections'
import AddTaskModal from '../AddTaskModal'
import OnboardingWizard from '../OnboardingWizard'

// Conceptual hierarchy: Overview → obligations → execution → evidence → financials →
// notices → people → activity. Follow-ups sit within execution (kept reachable). RBAC/roles
// live under Admin (Part 14), so the people tab reads "People", not "Team & access".
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'followups', label: 'Follow-ups' },
  { id: 'documents', label: 'Documents' },
  { id: 'financials', label: 'Financials' },
  { id: 'notices', label: 'Notices' },
  { id: 'team', label: 'People' },
  { id: 'activity', label: 'Activity' },
]

export default function Client360Workspace({ client, user, onClose }) {
  const role = useClient360Role(user)
  useEscapeKey(onClose)
  const [tab, setTab] = useState('overview')
  const [showAddTask, setShowAddTask] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const today = useMemo(() => todayLocal(), [])
  const data = useClient360Data(role.canView ? client : null)
  const { panels, loading, refreshing, refresh } = data

  const header = useMemo(() => buildClientHeader(client), [client])

  // Panel adapters: rows + this-panel error + shared initial-loading + retry.
  const p = (name) => ({ rows: panels[name].rows, error: panels[name].error, loading, onRetry: refresh })

  const summaries = useMemo(() => ({
    compliance: summarizeCompliance(panels.compliance.rows, today),
    tasks: summarizeTasks(panels.tasks.rows, today),
    followUps: summarizeFollowUps(panels.tasks.rows, today),
    documents: summarizeDocuments(panels.documents.rows),
    notices: summarizeNotices(panels.notices.rows, today),
    financials: summarizeFinancials(panels.financials.rows, header.currentFy),
    team: summarizeTeam(panels.tasks.rows, panels.compliance.rows),
    // Document readiness (canonical, current-links only) — requirement-specific, NOT "zero docs".
    readiness: (() => {
      const rows = panels.readiness.rows || []
      const available = rows.filter(r => r.is_available).length
      return { total: rows.length, available, missing: rows.length - available }
    })(),
  }), [panels, today, header.currentFy])

  const attention = useMemo(() => sortAttention(buildAttentionItems({
    header,
    compliance: summaries.compliance,
    tasks: summaries.tasks,
    followUps: summaries.followUps,
    documents: summaries.documents,
    notices: summaries.notices,
    team: summaries.team,
    financials: summaries.financials,
    errors: {
      compliance: panels.compliance.error, tasks: panels.tasks.error, followUps: panels.followUps.error,
      documents: panels.documents.error, notices: panels.notices.error, financials: panels.financials.error,
    },
  })), [header, summaries, panels])

  // Per-panel error flags used to keep summary cards from showing a false zero on failure.
  const err = {
    compliance: panels.compliance.error, tasks: panels.tasks.error,
    documents: panels.documents.error, notices: panels.notices.error, financials: panels.financials.error,
    readiness: panels.readiness.error,
  }

  const stop = (e) => e.stopPropagation()

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.panel} role="dialog" aria-modal="true" aria-label={role.canView ? `Client 360 workspace for ${dash(header.name)}` : 'Client 360 workspace'} onClick={stop}>
        {/* Header — client identity is shown ONLY to an authorised viewer (F1); the
            restricted state must not expose the client's name/code/details. */}
        <div style={S.head}>
          <div>
            <div style={S.eyebrow}>CLIENT 360° · OPERATIONAL WORKSPACE</div>
            {role.canView ? (
              <>
                <div style={S.title}>{dash(header.name)} <span style={S.code}>{dash(header.code)}</span></div>
                <div style={S.pills}>
                  {header.entityType && <span style={S.pill}>{header.entityType}</span>}
                  {/* E2E-3: header.status is single-sourced via clientStatusLabel (blank -> 'Unknown').
                      Fallback is a neutral dash, never a fabricated 'Active'. */}
                  <span style={S.pill}>{header.status || '—'}</span>
                  <span style={S.pill}>FY {header.currentFy}</span>
                  {header.isDraft && <span style={S.pill}>Draft</span>}
                </div>
              </>
            ) : (
              <div style={S.title}>Client workspace</div>
            )}
          </div>
          <button style={S.close} onClick={onClose} aria-label="Close workspace">✕</button>
        </div>

        {!role.canView ? (
          <div style={S.body}>
            <Panel title="Restricted">
              <div style={{ fontSize: 13, color: C.muted }}>
                This workspace is available to Admin and Manager roles only.
              </div>
            </Panel>
          </div>
        ) : (
          <div style={S.body}>
            {/* Operational summary cards — each distinguishes zero from a failed load. */}
            <div style={S.statGrid}>
              <StatCard label="Open compliance" value={summaries.compliance.open} toneName="neutral" error={err.compliance} onClick={() => setTab('compliance')} />
              <StatCard label="Overdue compliance" value={summaries.compliance.overdue} toneName="critical" error={err.compliance} onClick={() => setTab('compliance')} />
              <StatCard label="Due today" value={summaries.compliance.dueToday} toneName="warning" error={err.compliance} onClick={() => setTab('compliance')} />
              <StatCard label="Due soon (7d)" value={summaries.compliance.dueSoon} toneName="warning" error={err.compliance} onClick={() => setTab('compliance')} />
              <StatCard label="Open tasks" value={summaries.tasks.open} toneName="neutral" error={err.tasks} onClick={() => setTab('tasks')} />
              <StatCard label="Overdue tasks" value={summaries.tasks.overdue} toneName="critical" error={err.tasks} onClick={() => setTab('tasks')} />
              <StatCard label="Pending follow-ups" value={summaries.followUps.pending} toneName="warning" error={err.tasks} onClick={() => setTab('followups')} />
              <StatCard label="Overdue follow-ups" value={summaries.followUps.overdue} toneName="critical" error={err.tasks} onClick={() => setTab('followups')} />
              <StatCard label="Documents" value={summaries.documents.total} toneName="neutral" error={err.documents} onClick={() => setTab('documents')} />
              <StatCard label="Document readiness" value={`${summaries.readiness.available}/${summaries.readiness.total}`} toneName={summaries.readiness.missing > 0 ? 'warning' : 'good'} error={err.readiness} onClick={() => setTab('documents')} />
              <StatCard label="Missing documents" value={summaries.readiness.missing} toneName={summaries.readiness.missing > 0 ? 'critical' : 'good'} error={err.readiness} onClick={() => setTab('documents')} />
              <StatCard label="Open notices" value={summaries.notices.open} toneName="critical" error={err.notices} onClick={() => setTab('notices')} />
              <StatCard label="Overdue notice responses" value={summaries.notices.overdueResponse} toneName="critical" error={err.notices} onClick={() => setTab('notices')} />
              <StatCard label="Financial documents pending" value={summaries.financials.pending} toneName="warning" error={err.financials} onClick={() => setTab('financials')} />
              <StatCard label="Assigned team" value={summaries.team.hasAssignment ? summaries.team.assignees.length : 'None'} toneName={summaries.team.hasAssignment ? 'good' : 'warning'} error={err.tasks} onClick={() => setTab('team')} />
            </div>

            {/* Attention required */}
            <Panel title="Attention required" right={<button type="button" style={{ ...S.ghost, ...(refreshing ? { opacity: 0.6, cursor: 'default' } : null) }} onClick={refresh} disabled={refreshing} aria-busy={refreshing} aria-label="Refresh workspace">{refreshing ? '⏳ Refreshing…' : '↻ Refresh'}</button>}>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {attention.map((it) => (
                  <li key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Badge toneName={it.severity}>{it.severity}</Badge>
                    {it.target ? (
                      // Clear link affordance: solid underline + link colour + weight.
                      // Explicit textDecorationLine avoids any unintended line-through (UAT-01).
                      <button type="button" onClick={() => setTab(it.target)} style={{ appearance: 'none', border: 'none', background: 'none', padding: 0, fontSize: 13, color: C.ink2, fontWeight: 600, cursor: 'pointer', textAlign: 'left', textDecorationLine: 'underline', textDecorationStyle: 'solid' }}>{it.label}</button>
                    ) : (
                      <span style={{ fontSize: 13, color: C.body }}>{it.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>

            {/* Tabs */}
            <div role="tablist" aria-label="Client 360 sections" style={S.tabs}>
              {TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={tab === t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
              ))}
            </div>

            <div role="tabpanel">
              {tab === 'overview' && (
                <OverviewSection header={header} compliancePanel={p('compliance')} today={today}
                  canEditClient={role.canEditClient} onEditClient={() => setShowEdit(true)} />
              )}
              {tab === 'compliance' && <ComplianceSection panel={p('compliance')} today={today} />}
              {tab === 'tasks' && <TasksSection panel={p('tasks')} canCreateTask={role.canCreateTask} onCreateTask={() => setShowAddTask(true)} />}
              {tab === 'followups' && <FollowUpsSection tasksPanel={p('tasks')} followUpsPanel={p('followUps')} today={today} />}
              {tab === 'documents' && <DocumentsSection client={client} user={user} canUpload={role.canUploadDocument} />}
              {tab === 'financials' && <FinancialsSection panel={p('financials')} statementsPanel={p('financialStatements')} header={header} />}
              {tab === 'notices' && <NoticesSection panel={p('notices')} today={today} />}
              {tab === 'team' && <TeamAccessSection team={summaries.team} tasksPanel={p('tasks')} />}
              {tab === 'activity' && (
                <ActivitySection followUpsPanel={p('followUps')} documentsPanel={p('documents')} tasksPanel={p('tasks')} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick actions — reuse existing, permission-checked flows. */}
      {showAddTask && role.canCreateTask && (
        <AddTaskModal user={user} presetClient={client}
          onClose={() => setShowAddTask(false)}
          onSaved={() => { setShowAddTask(false); refresh() }} />
      )}
      {showEdit && role.canEditClient && (
        <OnboardingWizard user={user} editClient={client}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); refresh() }} />
      )}
    </div>
  )
}
