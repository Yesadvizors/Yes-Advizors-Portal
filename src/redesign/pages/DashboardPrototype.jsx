/**
 * Dashboard prototype — DESIGN-ONLY, mock-driven.
 * Action-first: risk & attention, deadlines, and team workload lead; vanity
 * metrics are deliberately absent. No data writes, no live reads.
 */
import { Card, MetricCard, Badge, Table, Button } from '../../components/ui/redesign'
import { IconAlert, IconClock, IconInbox, IconClients, IconChevronRight, IconPlus } from '../../components/ui/redesign/icons'
import { DASHBOARD_METRICS, DASHBOARD_DEADLINES, DASHBOARD_WORKLOAD, DASHBOARD_ATTENTION, CURRENT_FY } from '../mock/mockData'

const METRIC_ICON = {
  overdue: <IconAlert size={18} />, due7: <IconClock size={18} />, open: <IconInbox size={18} />, clients: <IconClients size={18} />,
}
const DUE_TONE = { overdue: 'danger', due: 'warning' }
const ATT_ICON = { danger: <IconAlert size={16} />, warning: <IconClock size={16} />, info: <IconInbox size={16} /> }

export default function DashboardPrototype() {
  return (
    <>
      <div className="rd-page-header">
        <div>
          <h1 className="rd-page-title">Good morning, Priya</h1>
          <div className="rd-page-subtitle">Here’s what needs attention across the firm · {CURRENT_FY}</div>
        </div>
        <div className="rd-page-actions">
          <Button variant="secondary" size="sm">View all deadlines</Button>
          <Button variant="primary" size="sm" icon={<IconPlus size={15} />}>New task</Button>
        </div>
      </div>

      <div className="rd-metric-grid" style={{ marginBottom: 22 }}>
        {DASHBOARD_METRICS.map(m => (
          <MetricCard key={m.key} label={m.label} value={m.value} accent={m.accent}
            icon={METRIC_ICON[m.key]} foot={m.foot} trend={m.trend} />
        ))}
      </div>

      <div className="rd-grid-360">
        <div className="rd-stack">
          <Card title="Upcoming deadlines" pad={false}
            action={<Button variant="ghost" size="sm" icon={<IconChevronRight size={14} />}>All</Button>}>
            <Table
              stacky
              columns={[
                { key: 'client', header: 'Client', render: r => (
                  <div><div className="rd-cell-primary rd-truncate">{r.client}</div><div className="rd-cell-sub">{r.task}</div></div>
                ) },
                { key: 'due', header: 'Due', render: r => <Badge tone={DUE_TONE[r.status]} dot>{r.due}</Badge> },
                { key: 'owner', header: 'Owner', render: r => <span className="rd-num">{r.owner}</span> },
              ]}
              rows={DASHBOARD_DEADLINES}
              rowKey={r => r.id}
            />
          </Card>

          <Card title="Team workload" pad={false}>
            <Table
              stacky
              columns={[
                { key: 'name', header: 'Member', render: r => (
                  <div className="rd-row"><span className="rd-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{r.initials}</span><span className="rd-cell-primary">{r.name}</span></div>
                ) },
                { key: 'open', header: 'Open', align: 'right', render: r => <span className="rd-num">{r.open}</span> },
                { key: 'overdue', header: 'Overdue', align: 'right', render: r => (
                  r.overdue > 0 ? <Badge tone="danger">{r.overdue}</Badge> : <span className="rd-muted rd-num">0</span>
                ) },
                { key: 'load', header: 'Capacity', render: r => (
                  <div style={{ minWidth: 90 }}>
                    <div className="rd-progress"><div className="rd-progress-fill" style={{ width: `${r.load}%`, background: r.load > 80 ? 'var(--rd-danger)' : r.load > 60 ? 'var(--rd-warning)' : 'var(--rd-brand)' }} /></div>
                    <div className="rd-cell-sub">{r.load}%</div>
                  </div>
                ) },
              ]}
              rows={DASHBOARD_WORKLOAD}
              rowKey={r => r.initials}
            />
          </Card>
        </div>

        <Card title="Needs attention" pad={false}>
          <div style={{ padding: '6px 0' }}>
            {DASHBOARD_ATTENTION.map(a => (
              <button key={a.id} type="button" className="rd-attention-item">
                <span className={`rd-attention-ico is-${a.tone}`}>{ATT_ICON[a.tone]}</span>
                <span className="rd-attention-body">
                  <span className="rd-attention-title">{a.title}</span>
                  <span className="rd-attention-meta">{a.meta}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
