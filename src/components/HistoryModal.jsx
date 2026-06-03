import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, overflow: 'hidden' }}>
        <div style={{ background: 'var(--navy)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.task_name}</div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)' }}>{task.client_name || '—'} · {task.assigned_to} · {logs.length} follow-up{logs.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 22, cursor: 'pointer', paddingLeft: 16 }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {loading ? <div style={{ textAlign: 'center', color: 'var(--gray2)', padding: 20 }}>Loading...</div>
            : logs.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray2)', fontSize: 13, background: 'var(--ltgray)', borderRadius: 12 }}>No follow-up added yet.</div>
            : logs.map((l, ri) => (
              <div key={l.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: ri === 0 ? 'var(--green)' : 'var(--border2)', marginTop: 3 }} />
                  {ri < logs.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', margin: '4px 0', minHeight: 16 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--dkgreen)', background: 'var(--ltgreen)', padding: '2px 8px', borderRadius: 99 }}>{l.updated_by}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--gray2)' }}>{fmtDate(l.created_at)}</span>
                    {l.status_at_time && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--ltgray)', color: '#374151' }}>{l.status_at_time}</span>}
                    {ri === 0 && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)', background: 'var(--ltgreen)', padding: '2px 6px', borderRadius: 99, marginLeft: 'auto' }}>LATEST</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--navy2)', lineHeight: 1.55 }}>{l.note}</div>
                  {l.next_action && <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 4 }}>🎯 Next: {l.next_action}</div>}
                  {l.next_followup_date && <div style={{ fontSize: 11, color: '#D97706', marginTop: 2 }}>📅 Follow-up: {fmtDate(l.next_followup_date)}</div>}
                </div>
              </div>
            ))}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--ltgray2)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer', color: 'var(--gray)' }}>Close</button>
        </div>
      </div>
    </div>
  )
}
