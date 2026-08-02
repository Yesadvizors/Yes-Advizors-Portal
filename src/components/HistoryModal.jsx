import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'
import { Modal, LoadingState, EmptyState, Badge } from './ui'

export default function HistoryModal({ task, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('follow_ups').select('*').eq('task_id', task.task_id).order('created_at', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }

  return (
    <Modal
      title={task.task_name}
      subtitle={`${task.client_name || '—'} · ${task.assigned_to} · ${logs.length} follow-up${logs.length !== 1 ? 's' : ''}`}
      onClose={onClose}
      footer={<button className="ds-btn ds-btn-secondary" onClick={onClose}>Close</button>}
    >
      {loading ? (
        <LoadingState label="Loading..." />
      ) : logs.length === 0 ? (
        <EmptyState icon="🗒️" title="No follow-up added yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {logs.map((l, ri) => (
            <div key={l.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: ri < logs.length - 1 ? '1px solid var(--ds-border-2)' : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: ri === 0 ? 'var(--ds-brand)' : 'var(--ds-border-strong)', marginTop: 3 }} />
                {ri < logs.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--ds-border)', margin: '4px 0', minHeight: 16 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                  <Badge tone="success">{l.updated_by}</Badge>
                  <span style={{ fontSize: 'var(--ds-fs-xs)', color: 'var(--ds-text-subtle)' }}>{fmtDate(l.created_at)}</span>
                  {l.status_at_time && <Badge tone="neutral">{l.status_at_time}</Badge>}
                  {ri === 0 && <span style={{ marginLeft: 'auto' }}><Badge tone="success" dot>LATEST</Badge></span>}
                </div>
                <div style={{ fontSize: 'var(--ds-fs-sm)', color: 'var(--ds-text)', lineHeight: 'var(--ds-lh)' }}>{l.note}</div>
                {l.next_action && <div style={{ fontSize: 'var(--ds-fs-xs)', color: 'var(--ds-info)', marginTop: 4 }}>🎯 Next: {l.next_action}</div>}
                {l.next_followup_date && <div style={{ fontSize: 'var(--ds-fs-xs)', color: 'var(--ds-warning)', marginTop: 2 }}>📅 Follow-up: {fmtDate(l.next_followup_date)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
