/** Approved Bento dashboard composition (Concept 6). Presentational.
    Row 1: six KPIs. Row 2: Attention · Operational Summary · Team Workload.
    Row 3: Due This Week · Recent Activity · Quick Actions. */
import KpiRow from './panels/KpiRow'
import AttentionNeeded from './panels/AttentionNeeded'
import OperationalSummary from './panels/OperationalSummary'
import TeamWorkload from './panels/TeamWorkload'
import DueThisWeek from './panels/DueThisWeek'
import RecentActivity from './panels/RecentActivity'
import QuickActions from './panels/QuickActions'

export default function Dashboard() {
  return (
    <div className="b-content">
      <KpiRow />
      <div className="b-row2">
        <AttentionNeeded />
        <OperationalSummary />
        <TeamWorkload />
      </div>
      <div className="b-row3">
        <DueThisWeek />
        <RecentActivity />
        <QuickActions />
      </div>
    </div>
  )
}
