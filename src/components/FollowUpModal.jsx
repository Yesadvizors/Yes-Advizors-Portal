import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Modal, Field, Input, Select, Textarea, Badge } from './ui'

export default function FollowUpModal({ task, user, onClose, onSaved }) {
  const [logs, setLogs] = useState([])
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadLogs() }, [])
  async function loadLogs() {
    const { data } = await supabase.from('follow_ups').select('*').eq('task_id', task.task_id).order('created_at', { ascending: false })
    setLogs(data || [])
  }

  async function save() {
    if (!note.trim()) { alert('Please enter a follow-up note'); return }
    setSaving(true)
    const fuId = 'FU-' + Date.now().toString().slice(-8)
    await supabase.from('follow_ups').insert({
      followup_id: fuId, task_id: task.task_id, client_id: task.client_id, client_name: task.client_name,
      updated_by: user.name, note: note.trim(), next_action: nextAction.trim() || null,
      next_followup_date: nextDate || null, status_at_time: status || task.status
    })
    // Update parent task
    const upd = { latest_update: note.trim(), next_action: nextAction.trim() || null, next_followup_date: nextDate || null, last_updated: new Date().toISOString() }
    if (status) upd.status = status
    await supabase.from('tasks').update(upd).eq('id', task.id)
    setSaving(false)
    onSaved()
  }

  async function delLog(id) {
    if (!confirm('Delete this follow-up?')) return
    await supabase.from('follow_ups').delete().eq('id', id)
    loadLogs()
  }

  return (
    <Modal
      title={task.task_name}
      subtitle={`${task.client_name || '—'} · ${task.assigned_to} · ${task.status}`}
      onClose={onClose}
      busy={saving}
      footer={<>
        <button className="ds-btn ds-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="ds-btn ds-btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : '+ Save follow-up'}</button>
      </>}
    >
      {/* Existing follow-ups */}
      <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {logs.length === 0 ? (
          <div className="ds-td-muted" style={{ textAlign: 'center', padding: 12, fontSize: 'var(--ds-fs-sm)', background: 'var(--ds-surface-3)', borderRadius: 'var(--ds-r-sm)' }}>No follow-ups yet.</div>
        ) : logs.map(l => (
          <div key={l.id} style={{ background: 'var(--ds-surface-3)', borderRadius: 'var(--ds-r-sm)', padding: '9px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <Badge tone="success">{l.updated_by}</Badge>
              <span style={{ fontSize: 'var(--ds-fs-xs)', color: 'var(--ds-text-subtle)' }}>{new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
              {l.status_at_time && <Badge tone="neutral">{l.status_at_time}</Badge>}
              <button onClick={() => delLog(l.id)} aria-label="Delete follow-up" className="ds-btn ds-btn-ghost ds-btn-sm" style={{ marginLeft: 'auto', padding: '2px 7px' }}>🗑</button>
            </div>
            <div style={{ fontSize: 'var(--ds-fs-sm)', color: 'var(--ds-text)', lineHeight: 'var(--ds-lh)' }}>{l.note}</div>
            {l.next_action && <div style={{ fontSize: 'var(--ds-fs-xs)', color: 'var(--ds-info)', marginTop: 2 }}>→ {l.next_action}</div>}
          </div>
        ))}
      </div>

      {/* New follow-up form */}
      <div className="ds-form-grid">
        <Field label="Updated by">
          <Input value={user.name} disabled />
        </Field>
        <Field label="Status update">
          <Select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">No change</option>
            <option>In Progress</option>
            <option>Waiting for Client</option>
            <option>Document Received</option>
            <option>Under Review</option>
            <option>Filed / Completed</option>
            <option>On Hold</option>
          </Select>
        </Field>
      </div>
      <Field label="Remark / update" required>
        <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="e.g. Email sent to client requesting GST docs..." />
      </Field>
      <div className="ds-form-grid">
        <Field label="Next action">
          <Input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="e.g. Call Friday" />
        </Field>
        <Field label="Follow-up date">
          <Input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
