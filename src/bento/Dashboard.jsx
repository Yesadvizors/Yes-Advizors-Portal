/** Approved Bento dashboard composition (Concept 6). Data-driven, presentational.
 *  `state`: 'loading' | 'ready' | 'error'. `data`: shaped by useBentoDashboard
 *  (real V2 reads) or supplied as demo data by the standalone design preview. */
import KpiRow from './panels/KpiRow'
import AttentionNeeded from './panels/AttentionNeeded'
import OperationalSummary from './panels/OperationalSummary'
import TeamWorkload from './panels/TeamWorkload'
import DueThisWeek from './panels/DueThisWeek'
import RecentActivity from './panels/RecentActivity'
import QuickActions from './panels/QuickActions'

export default function Dashboard({ data, state = 'ready', onQuickAction, onReload }) {
  const loading = state === 'loading' || state === 'idle'
  const error = state === 'error'
  const d = data || {}
  return (
    <div className="b-content">
      {error && (
        <div className="b-error-banner" role="alert">
          <span>Couldn’t load the dashboard. Your data is safe — please retry.</span>
          {onReload && <button type="button" onClick={onReload}>Retry</button>}
        </div>
      )}
      {/* Part 3B — "What needs attention today?" leads the dashboard, full-width. */}
      <AttentionNeeded items={d.attention} loading={loading} error={error} />
      <KpiRow kpis={d.kpis} loading={loading} error={error} />
      <div className="b-row2">
        <OperationalSummary operational={d.operational} loading={loading} error={error} />
        <TeamWorkload team={d.team} loading={loading} error={error} />
      </div>
      <div className="b-row3">
        <DueThisWeek items={d.dueThisWeek} loading={loading} error={error} />
        <RecentActivity items={d.recentActivity} loading={loading} error={error} />
        <QuickActions onAction={onQuickAction} />
      </div>
    </div>
  )
}
