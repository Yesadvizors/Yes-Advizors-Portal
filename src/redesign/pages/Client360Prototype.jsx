/**
 * Client 360 prototype — DESIGN-ONLY, mock-driven. The flagship command-centre:
 * a hero identity band, summary KPIs, a compliance calendar and task list, plus
 * a right rail with contact, documents and an activity timeline. No writes.
 */
import { useState } from 'react'
import { Card, MetricCard, Badge, Table, Button } from '../../components/ui/redesign'
import {
  IconBuilding, IconPhone, IconMail, IconFile, IconPlus, IconExternal, IconChevronRight,
} from '../../components/ui/redesign/icons'
import { CLIENT_360 as C } from '../mock/mockData'

const COMP_TONE = { overdue: 'danger', due: 'warning', filed: 'success', upcoming: 'neutral' }
const PRIO_TONE = { high: 'danger', medium: 'warning', low: 'neutral' }
const TABS = ['Overview', 'Compliance', 'Tasks', 'Documents', 'Activity']

export default function Client360Prototype() {
  const [tab, setTab] = useState('Overview')
  const healthTone = C.healthScore >= 75 ? 'var(--rd-success)' : C.healthScore >= 50 ? 'var(--rd-warning)' : 'var(--rd-danger)'

  return (
    <>
      <div className="rd-row" style={{ marginBottom: 14, color: 'var(--rd-text-subtle)', fontSize: 'var(--rd-fs-sm)' }}>
        <span>Client Master</span><IconChevronRight size={13} /><span style={{ color: 'var(--rd-text-muted)', fontWeight: 600 }}>{C.name}</span>
      </div>

      {/* Hero */}
      <div className="rd-c360-hero">
        <div className="rd-c360-id">
          <span className="rd-c360-mark"><IconBuilding size={24} /></span>
          <div style={{ minWidth: 0 }}>
            <div className="rd-row" style={{ gap: 10 }}>
              <span className="rd-c360-name rd-truncate">{C.name}</span>
              <Badge tone="danger">High risk</Badge>
            </div>
            <div className="rd-c360-meta">
              <span>{C.type}</span><span>{C.since}</span>
              <span><b>PAN</b> {C.pan}</span><span><b>GSTIN</b> {C.gstin}</span><span><b>CIN</b> {C.cin}</span>
            </div>
          </div>
        </div>
        <div className="rd-row" style={{ gap: 18, alignItems: 'center' }}>
          <div className="rd-c360-health">
            <div className="rd-metric-label">Health score</div>
            <div className="rd-c360-health-val" style={{ color: healthTone }}>{C.healthScore}</div>
          </div>
          <div className="rd-page-actions">
            <Button variant="secondary" size="sm" icon={<IconExternal size={14} />}>Open master</Button>
            <Button variant="primary" size="sm" icon={<IconPlus size={15} />}>New task</Button>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="rd-metric-grid" style={{ marginBottom: 18 }}>
        {C.summary.map(s => <MetricCard key={s.label} label={s.label} value={s.value} accent={s.accent} />)}
      </div>

      {/* In-page tabs (presentational) */}
      <div className="rd-tabs" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t} type="button" className={`rd-tab${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="rd-grid-360">
        <div className="rd-stack">
          <Card title="Compliance calendar" pad={false}
            action={<Button variant="ghost" size="sm">View all</Button>}>
            <Table
              stacky
              rows={C.compliance}
              rowKey={(r, i) => i}
              columns={[
                { key: 'item', header: 'Filing', render: r => (
                  <div><div className="rd-cell-primary">{r.item}</div><div className="rd-cell-sub">{r.area} · {r.period}</div></div>
                ) },
                { key: 'due', header: 'Due', render: r => <span className="rd-num">{r.due}</span> },
                { key: 'status', header: 'Status', render: r => <Badge tone={COMP_TONE[r.status]} dot>{r.status}</Badge> },
              ]}
            />
          </Card>

          <Card title="Open tasks" pad={false}
            action={<Button variant="ghost" size="sm" icon={<IconPlus size={14} />}>Add</Button>}>
            <Table
              stacky
              rows={C.tasks}
              rowKey={r => r.id}
              columns={[
                { key: 'title', header: 'Task', render: r => <span className="rd-cell-primary">{r.title}</span> },
                { key: 'owner', header: 'Owner', render: r => <span className="rd-num">{r.owner}</span> },
                { key: 'priority', header: 'Priority', render: r => <Badge tone={PRIO_TONE[r.priority]}>{r.priority}</Badge> },
                { key: 'due', header: 'Due', align: 'right', render: r => <span className="rd-num rd-muted">{r.due}</span> },
              ]}
            />
          </Card>
        </div>

        <div className="rd-stack">
          <Card title="Primary contact">
            <div className="rd-kv">
              <div className="rd-cell-primary">{C.contact.person}</div>
              <div className="rd-row rd-muted"><IconPhone size={15} /><span className="rd-num">{C.contact.phone}</span></div>
              <div className="rd-row rd-muted"><IconMail size={15} /><span className="rd-truncate">{C.contact.email}</span></div>
              <hr className="rd-divider" />
              <div className="rd-kv-row"><span className="rd-kv-k">Engagement manager</span><span className="rd-kv-v">{C.manager}</span></div>
            </div>
          </Card>

          <Card title="Recent documents" pad={false}
            action={<Button variant="ghost" size="sm">All</Button>}>
            <div style={{ padding: '4px 0' }}>
              {C.documents.map(d => (
                <button key={d.name} type="button" className="rd-attention-item">
                  <span className="rd-attention-ico is-info"><IconFile size={15} /></span>
                  <span className="rd-attention-body">
                    <span className="rd-attention-title rd-truncate">{d.name}</span>
                    <span className="rd-attention-meta">{d.kind} · {d.when}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Activity">
            <div className="rd-timeline">
              {C.timeline.map(t => (
                <div key={t.id} className="rd-timeline-item">
                  <span className={`rd-timeline-dot${t.done ? '' : ' is-muted'}`} />
                  <div className="rd-timeline-body">
                    <div className="rd-timeline-title">{t.title}</div>
                    <div className="rd-timeline-meta">{t.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
