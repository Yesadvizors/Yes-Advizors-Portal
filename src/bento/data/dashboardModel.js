/**
 * Approved Bento Dashboard — PURE view-model builders (no IO).
 * ----------------------------------------------------------------------------
 * Transforms real read-only rows (see dashboardReads.js) into the exact panel
 * shapes the approved layout renders. Pure + deterministic (takes `today` as a
 * YYYY-MM-DD string) so every rule is unit-tested. Reuses the shared task-status
 * truth from ../../helpers (CLOSED/COMPLETED sets) — the same truth PR #65 uses.
 *
 * Definitions (also in docs/frontend/approved-bento/DASHBOARD_DATA_SOURCES.md):
 *   open        = NOT isTaskClosed(status)                         (Pending KPI)
 *   overdue     = open AND due_date < today                        (Overdue KPI)
 *   due today   = open AND due_date === today                      (Due Today KPI)
 *   completed   = isTaskCompleted(status)  [Done, Filed / Completed]
 *   not started = status === 'Pending'
 *   in progress = open AND status !== 'Pending'
 *   cancelled   = closed AND NOT completed  (excluded from progress denominator)
 *   complianceDue = Σ v_firm_dashboard(overdue + pending)          (Compliance Due KPI)
 *   active client = is_test_client !== true AND status Active AND is_draft !== true
 *   utilisation  = min(100, round(openAssigned / CAPACITY * 100)), CAPACITY = 15
 */
import { isTaskClosed, isTaskCompleted } from '../../helpers.js'

export const WORKLOAD_CAPACITY = 15 // open tasks treated as ~100% utilisation
const AREA_ICONS = ['rupee', 'file', 'building', 'shield', 'grid']

const s = (n) => (n === 1 ? '' : 's')
const num = (v) => Number(v) || 0

/** Whole-day difference between two YYYY-MM-DD strings (dueDate − today). */
export function daysUntil(dueDate, today) {
  if (!dueDate) return null
  const p = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN }
  const a = p(dueDate), b = p(today)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((a - b) / 86400000)
}

const isOpen = (t) => !isTaskClosed(t.status)

export function utilisationTone(pct) {
  if (pct >= 80) return 'green-strong'
  if (pct >= 65) return 'green'
  if (pct >= 50) return 'amber'
  return 'blue'
}

function matchAssignee(assignedTo, name) {
  const a = (assignedTo || '').trim()
  if (!a || !name) return false
  const first = name.split(' ')[0]
  return a === name || a === first || name.startsWith(a) || a.startsWith(first)
}

export function buildKpis(raw, today) {
  const tasks = raw.tasks || []
  const open = tasks.filter(isOpen)
  const overdue = open.filter(t => { const d = daysUntil(t.due_date, today); return d !== null && d < 0 })
  const dueThisWeek = open.filter(t => { const d = daysUntil(t.due_date, today); return d !== null && d >= 0 && d <= 7 })
  const realClients = (raw.clients || []).filter(c => c.is_test_client !== true)
  const activeClients = realClients.filter(c => c.status === 'Active' && c.is_draft !== true)
  // Part 3C — four primary KPIs only (Active Clients, Open Tasks, Overdue, Due This Week).
  // Deeper counts (Total Tasks, Due Today, Compliance Due) live in their dedicated panels /
  // the Compliance snapshot, so the dashboard header stays a small, decision-useful set.
  return [
    { key: 'clients', tone: 'blue',  label: 'Active Clients', value: activeClients.length, foot: 'excl. drafts & test' },
    { key: 'open',    tone: 'amber', label: 'Open Tasks',     value: open.length,          foot: 'not yet closed' },
    { key: 'overdue', tone: 'red',   label: 'Overdue',        value: overdue.length,       foot: 'past due date' },
    { key: 'week',    tone: 'green', label: 'Due This Week',  value: dueThisWeek.length,   foot: 'open · next 7 days' },
  ]
}

export function buildOperational(raw) {
  const tasks = raw.tasks || []
  const completed = tasks.filter(t => isTaskCompleted(t.status)).length
  const notStarted = tasks.filter(t => t.status === 'Pending').length
  const inProgress = tasks.filter(t => isOpen(t) && t.status !== 'Pending').length
  const denom = completed + inProgress + notStarted
  const pct = (n) => (denom ? Math.round((n / denom) * 100) : 0)
  const areas = [...(raw.firm || [])].sort((a, b) => num(b.total) - num(a.total))
  let topAreas
  if (areas.length > 5) {
    const head = areas.slice(0, 4)
    const othersCount = areas.slice(4).reduce((acc, r) => acc + num(r.total), 0)
    topAreas = [...head.map((r, i) => ({ key: r.category || `a${i}`, icon: AREA_ICONS[i], name: r.category || '—', count: num(r.total) })),
      { key: 'others', icon: 'grid', name: 'Others', count: othersCount }]
  } else {
    topAreas = areas.map((r, i) => ({ key: r.category || `a${i}`, icon: AREA_ICONS[i % AREA_ICONS.length], name: r.category || '—', count: num(r.total) }))
  }
  return {
    progress: pct(completed),
    statuses: [
      { key: 'done', label: 'Completed',   count: completed,  pct: pct(completed),  tone: 'green' },
      { key: 'prog', label: 'In Progress', count: inProgress, pct: pct(inProgress), tone: 'amber' },
      { key: 'not',  label: 'Not Started', count: notStarted, pct: pct(notStarted), tone: 'blue' },
    ],
    topAreas,
  }
}

export function buildTeamWorkload(raw) {
  const open = (raw.tasks || []).filter(isOpen)
  return (raw.team || []).map(m => {
    const count = open.filter(t => matchAssignee(t.assigned_to, m.name)).length
    const pct = Math.min(100, Math.round((count / WORKLOAD_CAPACITY) * 100))
    return { id: m.id, name: m.name, role: m.role || 'Team member', open: count, pct, tone: utilisationTone(pct) }
  }).sort((a, b) => b.pct - a.pct).slice(0, 6)
}

export function buildAttention(raw, today) {
  const tasks = raw.tasks || []
  const open = tasks.filter(isOpen)
  const overdue = open.filter(t => { const d = daysUntil(t.due_date, today); return d !== null && d < 0 })
  const dueToday = open.filter(t => daysUntil(t.due_date, today) === 0)
  const followOverdue = tasks.filter(t => t.next_followup_date && t.next_followup_date < today)
  const compOverdue = (raw.firm || []).reduce((acc, r) => acc + num(r.overdue), 0)
  const compSoon = (raw.firm || []).reduce((acc, r) => acc + num(r.due_in_7_days), 0)

  const items = []
  if (overdue.length) {
    const clients = new Set(overdue.map(t => (t.client_name || '').trim()).filter(Boolean)).size
    items.push({ id: 'ov-tasks', title: `${overdue.length} task${s(overdue.length)} overdue`, sub: clients ? `Across ${clients} client${s(clients)}` : 'Needs action' })
  }
  if (compOverdue) items.push({ id: 'ov-comp', title: `${compOverdue} compliance item${s(compOverdue)} overdue`, sub: 'Across compliance areas' })
  if (dueToday.length) items.push({ id: 'due-today', title: `${dueToday.length} task${s(dueToday.length)} due today`, sub: 'Due by end of day' })
  if (followOverdue.length) items.push({ id: 'follow', title: `${followOverdue.length} follow-up${s(followOverdue.length)} overdue`, sub: 'Awaiting your action' })
  if (compSoon) items.push({ id: 'comp-soon', title: `${compSoon} compliance item${s(compSoon)} due in 7 days`, sub: 'Upcoming deadlines' })
  return items.slice(0, 4)
}

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
export function buildDueThisWeek(raw, today) {
  const open = (raw.tasks || []).filter(isOpen)
  return open
    .map(t => ({ t, d: daysUntil(t.due_date, today) }))
    .filter(x => x.d !== null && x.d >= 0 && x.d <= 7)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
    .map(({ t, d }) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t.due_date)
      const chip = d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : `Due in ${d} days`
      return {
        id: t.id,
        day: m ? m[3] : '—',
        mon: m ? MON[+m[2] - 1] : '',
        title: t.task_name || 'Task',
        sub: t.client_name || '—',
        chip,
      }
    })
}

// No safe non-admin activity/audit source exists in V2 dev — explicit empty state
// (never fabricated). Dependency recorded in DASHBOARD_DATA_SOURCES.md.
export function buildRecentActivity() { return [] }

export function buildDashboard(raw, today) {
  const r = raw || { tasks: [], clients: [], firm: [], team: [] }
  return {
    kpis: buildKpis(r, today),
    operational: buildOperational(r),
    team: buildTeamWorkload(r),
    attention: buildAttention(r, today),
    dueThisWeek: buildDueThisWeek(r, today),
    recentActivity: buildRecentActivity(),
  }
}
