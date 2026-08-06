/**
 * TasksBentoView — approved "Bento Workspace" visual skin for the Task Tracker
 * list (Core Operations package). PRESENTATIONAL ONLY.
 * ----------------------------------------------------------------------------
 * Renders the task register in the approved Bento language: header + Add Task,
 * summary cards, search + filters, a responsive task table with status/priority/
 * due chips, assignee display, checklist progress, loading skeletons, empty and
 * safe-error states and pagination. Clicking a row/title opens the detail drawer
 * (composed by the Tasks container). Row actions call handlers from the container;
 * the assignee-only Follow-up / Mark Done gating is decided by the container via
 * `isMine` — this view performs NO data access and holds NO business logic.
 */
import { getDueMeta, isTaskClosed, isTaskCompleted } from '../../helpers'
import {
  ModuleHeader, PrimaryButton, SummaryCards, Toolbar, SearchBox, FilterSelect,
  StatusChip, SkeletonList, EmptyState, ErrorState, Pagination, IconChevronRight,
} from './primitives'
import { IconClipboard, IconClock, IconAlertCircle, IconCheckCircle, IconUserPlus } from '../icons'

const PRIORITY_TONE = { Urgent: 'red', High: 'amber', Normal: 'blue', Low: 'subtle' }
const statusTone = (t) =>
  isTaskCompleted(t.status) ? 'green' : isTaskClosed(t.status) ? 'subtle' : t.status === 'Pending' ? 'blue' : 'amber'

function DueChip({ t }) {
  if (isTaskClosed(t.status)) return <StatusChip label="Closed" tone="subtle" dot={false} />
  const m = getDueMeta(t.due_date, t.status)
  if (!m || !m.badge) return <span className="b-tk-muted">—</span>
  const tone = m.daysLeft < 0 ? 'red' : m.daysLeft <= 7 ? 'amber' : 'subtle'
  return <StatusChip label={m.label} tone={tone} />
}

function ChecklistProgress({ t }) {
  const flags = [t.checklist_1, t.checklist_2, t.checklist_3]
  const done = flags.filter(Boolean).length
  const color = done === 3 ? 'var(--b-green)' : done >= 1 ? 'var(--b-amber)' : 'var(--b-text-faint)'
  return (
    <span className="b-tk-checks" title={`${done}/3 steps complete`}>
      {flags.map((v, i) => <span key={i} className="b-tk-dot" style={{ background: v ? color : 'var(--b-border-strong)' }} />)}
      <span className="b-tk-checks-n" style={{ color }}>{done}/3</span>
    </span>
  )
}

const ROW_COLS = 'minmax(200px, 2.4fr) 1.1fr 0.9fr 1.1fr auto 22px'

export default function TasksBentoView({
  summary, filtered, pageRows,
  search, onSearch,
  fStatus, onStatus, statuses,
  fAssign, onAssign, assignees,
  loading, loadError, onRetry,
  safePage, totalPages, pageSize, onPrev, onNext,
  onAddTask, onOpenTask, onFollowUp, onMarkDone,
  isMine, fuCountOf, completingId,
}) {
  const cards = [
    { key: 'total', tone: 'blue', label: 'Total Tasks', value: summary.total, Icon: IconClipboard },
    { key: 'open', tone: 'amber', label: 'Open', value: summary.open, Icon: IconClock },
    { key: 'overdue', tone: 'red', label: 'Overdue', value: summary.overdue, Icon: IconAlertCircle },
    { key: 'completed', tone: 'green', label: 'Completed', value: summary.completed, Icon: IconCheckCircle },
  ]
  const showPagination = !loading && !loadError && filtered.length > pageSize

  return (
    <div className="b-mod">
      <ModuleHeader title="Task Tracker" subtitle={`${filtered.length} shown`}>
        <PrimaryButton onClick={onAddTask} icon={<IconUserPlus size={17} />}>Add Task</PrimaryButton>
      </ModuleHeader>

      <SummaryCards cards={cards} />

      <Toolbar>
        <SearchBox value={search} onChange={onSearch} placeholder="Search tasks by name, client, assignee…" label="Search tasks" />
        <FilterSelect value={fStatus} onChange={onStatus} label="Filter by status"
          options={[{ value: 'All', label: 'All statuses' }, ...statuses.map(s => ({ value: s, label: s }))]} />
        <FilterSelect value={fAssign} onChange={onAssign} label="Filter by assignee"
          options={[{ value: 'All', label: 'All assignees' }, ...assignees.map(a => ({ value: a, label: a }))]} />
      </Toolbar>

      <section className="b-mod-table">
        {loading ? (
          <SkeletonList rows={6} />
        ) : loadError ? (
          <ErrorState title="Couldn’t load the task tracker" onRetry={onRetry} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No tasks found" copy="No tasks match your search or filters." />
        ) : (
          <>
            <div className="b-mod-head-row" style={{ display: 'grid', gridTemplateColumns: ROW_COLS, gap: 12 }} aria-hidden="true">
              <span>Task</span><span>Due</span><span>Priority</span><span>Status</span><span>Progress</span><span />
            </div>
            {pageRows.map(t => {
              const mine = isMine(t)
              const done = isTaskCompleted(t.status)
              const closed = isTaskClosed(t.status)
              const fc = fuCountOf(t)
              return (
                <button key={t.id} type="button" className="b-mod-row b-tk-row" style={{ gridTemplateColumns: ROW_COLS }}
                  onClick={() => onOpenTask(t)}>
                  <span className="b-tk-c-main">
                    {t.work_type && <span className="b-tk-wtype">{t.work_type}</span>}
                    <span className="b-tk-name" style={{ textDecoration: done ? 'line-through' : 'none' }}>{t.task_name}</span>
                    <span className="b-tk-sub">{(t.client_name || '—')} · {(t.assigned_to || 'Unassigned')}</span>
                  </span>
                  <span data-label="Due"><DueChip t={t} /></span>
                  <span data-label="Priority"><StatusChip label={t.priority || 'Normal'} tone={PRIORITY_TONE[t.priority] || 'blue'} dot={false} /></span>
                  <span data-label="Status"><StatusChip label={closed && !done ? (t.status || 'Closed') : t.status || '—'} tone={statusTone(t)} /></span>
                  <span data-label="Progress" className="b-tk-c-actions" onClick={e => e.stopPropagation()}>
                    <ChecklistProgress t={t} />
                    {!closed && mine && (
                      <button type="button" className="b-tk-act" onClick={() => onFollowUp(t)}>{fc > 0 ? `Update (${fc})` : '+ Follow-up'}</button>
                    )}
                    {!done && t.status !== 'Cancelled' && mine && (
                      <button type="button" className="b-tk-act b-tk-act-done" disabled={completingId !== null} onClick={() => onMarkDone(t)}>
                        {completingId === t.id ? 'Saving…' : 'Mark done'}
                      </button>
                    )}
                    {!mine && !done && <span className="b-tk-assignee">{t.assigned_to || '—'}</span>}
                  </span>
                  <span className="b-tk-chev" aria-hidden="true"><IconChevronRight size={16} /></span>
                </button>
              )
            })}
          </>
        )}
      </section>

      {showPagination && (
        <Pagination safePage={safePage} totalPages={totalPages} total={filtered.length} pageSize={pageSize}
          onPrev={onPrev} onNext={onNext} unit="tasks" />
      )}
    </div>
  )
}
