/**
 * Client Master prototype — DESIGN-ONLY, mock-driven.
 * A full-page workspace (deliberately NOT an oversized modal): toolbar with
 * search + filter chips, then a compact, scannable client table. No writes.
 */
import { useMemo, useState } from 'react'
import { Card, Badge, Table, Button, Toolbar, SearchInput, FilterChip } from '../../components/ui/redesign'
import { IconPlus, IconChevronRight, IconBuilding } from '../../components/ui/redesign/icons'
import { CLIENTS } from '../mock/mockData'

const RISK_TONE = { high: 'danger', medium: 'warning', low: 'neutral' }
const STATUS_TONE = { active: 'success', onboarding: 'info' }

export default function ClientMasterPrototype() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const counts = useMemo(() => ({
    all: CLIENTS.length,
    active: CLIENTS.filter(c => c.status === 'active').length,
    onboarding: CLIENTS.filter(c => c.status === 'onboarding').length,
    high: CLIENTS.filter(c => c.risk === 'high').length,
  }), [])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CLIENTS.filter(c => {
      const matchQ = !q || c.name.toLowerCase().includes(q) || c.pan.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
      const matchF = filter === 'all'
        || (filter === 'high' ? c.risk === 'high' : c.status === filter)
      return matchQ && matchF
    })
  }, [query, filter])

  return (
    <>
      <div className="rd-page-header">
        <div>
          <h1 className="rd-page-title">Client Master</h1>
          <div className="rd-page-subtitle">{CLIENTS.length} clients · manage entities, identifiers and engagements</div>
        </div>
        <div className="rd-page-actions">
          <Button variant="secondary" size="sm">Import</Button>
          <Button variant="primary" size="sm" icon={<IconPlus size={15} />}>Add client</Button>
        </div>
      </div>

      <Toolbar>
        <SearchInput placeholder="Search name, PAN or client ID…" value={query} onChange={e => setQuery(e.target.value)} />
        <FilterChip active={filter === 'all'} count={counts.all} onClick={() => setFilter('all')}>All</FilterChip>
        <FilterChip active={filter === 'active'} count={counts.active} onClick={() => setFilter('active')}>Active</FilterChip>
        <FilterChip active={filter === 'onboarding'} count={counts.onboarding} onClick={() => setFilter('onboarding')}>Onboarding</FilterChip>
        <FilterChip active={filter === 'high'} count={counts.high} onClick={() => setFilter('high')}>High risk</FilterChip>
      </Toolbar>

      <Card pad={false}>
        <Table
          stacky
          rows={rows}
          rowKey={r => r.id}
          onRowClick={() => {}}
          empty={{ title: 'No matching clients', desc: 'Try a different search term or clear the filters.' }}
          columns={[
            { key: 'name', header: 'Client', render: r => (
              <div className="rd-row">
                <span className="rd-c360-mark" style={{ width: 34, height: 34, borderRadius: 9 }}><IconBuilding size={17} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="rd-cell-primary rd-truncate">{r.name}</div>
                  <div className="rd-cell-sub">{r.id} · {r.type}</div>
                </div>
              </div>
            ) },
            { key: 'pan', header: 'PAN / GSTIN', render: r => (
              <div><div className="rd-num">{r.pan}</div><div className="rd-cell-sub rd-num">{r.gstin}</div></div>
            ) },
            { key: 'services', header: 'Services', render: r => (
              <div className="rd-row" style={{ flexWrap: 'wrap', gap: 4 }}>
                {r.services.map(s => <Badge key={s} tone="neutral">{s}</Badge>)}
              </div>
            ) },
            { key: 'status', header: 'Status', render: r => <Badge tone={STATUS_TONE[r.status]} dot>{r.status}</Badge> },
            { key: 'risk', header: 'Risk', render: r => <Badge tone={RISK_TONE[r.risk]}>{r.risk}</Badge> },
            { key: 'open', header: 'Open', align: 'right', render: r => <span className="rd-num">{r.open}</span> },
            { key: 'go', header: '', render: () => <span className="rd-muted" style={{ display: 'flex', justifyContent: 'flex-end' }}><IconChevronRight size={16} /></span> },
          ]}
        />
      </Card>
    </>
  )
}
