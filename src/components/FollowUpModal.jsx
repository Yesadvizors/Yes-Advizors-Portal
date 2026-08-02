import { useState, useEffect } from 'react'
import { useEscapeKey } from '../useEscapeKey'
import { supabase } from '../supabase'
import { todayLocal } from '../helpers'

export default function FollowUpModal({ task, user, onClose, onSaved }) {
  const [logs, setLogs] = useState([])
  useEscapeKey(onClose)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loadError, setLoadError] = useState(false)

  useEffect(() => { loadLogs() }, [])
  async function loadLogs() {
    const { data, error } = await supabase.from('follow_ups').select('*').eq('task_id', task.task_id).order('created_at', { ascending: false })
    if (error) { console.error('[FollowUpModal] load follow-ups failed:', error); setLoadError(true); return }
    setLoadError(false)
    setLogs(data || [])
  }

  async function save() {
    if (saving) return  // re-entrancy guard
    if (!note.trim()) { alert('Please enter a follow-up note'); return }
    if (nextDate && nextDate < todayLocal()) { setSaveError('Follow-up date cannot be in the past.'); return }
    setSaving(true); setSaveError('')
    const fuId = 'FU-' + Date.now().toString().slice(-8) + Math.floor(100 + Math.random() * 900)
    const { error: insErr } = await supabase.from('follow_ups').insert({
      followup_id: fuId, task_id: task.task_id, client_id: task.client_id, client_name: task.client_name,
      updated_by: user.name, note: note.trim(), next_action: nextAction.trim() || null,
      next_followup_date: nextDate || null, status_at_time: status || task.status
    })
    if (insErr) {
      console.error('[FollowUpModal] follow-up insert failed:', insErr)
      setSaving(false); setSaveError("Couldn't save the follow-up. Please try again.")
      return
    }
    // Update the parent task ONLY after the follow-up was recorded, so the task's
    // latest_update/next_followup_date never diverge from the logged history.
    const upd = { latest_update: note.trim(), next_action: nextAction.trim() || null, next_followup_date: nextDate || null, last_updated: new Date().toISOString() }
    if (status) upd.status = status
    const { error: updErr } = await supabase.from('tasks').update(upd).eq('id', task.id)
    if (updErr) {
      console.error('[FollowUpModal] task update failed:', updErr)
      setSaving(false); setSaveError('Follow-up saved, but the task summary could not be updated. Please refresh.')
      return
    }
    setSaving(false)
    onSaved()  // only after both writes confirmed
  }

  async function delLog(id) {
    if (!confirm('Delete this follow-up?')) return
    const { error } = await supabase.from('follow_ups').delete().eq('id', id)
    if (error) { console.error('[FollowUpModal] delete failed:', error); setSaveError("Couldn't delete the follow-up. Please try again."); return }
    loadLogs()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        <div style={{ background: 'var(--navy)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.task_name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{task.client_name || '—'} · {task.assigned_to} · {task.status}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer', paddingLeft: 12 }}>✕</button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Logs */}
          <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {loadError ? <div role="alert" style={{ textAlign: 'center', padding: 12, color: '#DC2626', fontSize: 12, background: '#FEF2F2', borderRadius: 8 }}>Couldn't load follow-ups. <button onClick={loadLogs} style={{ background: 'none', border: 'none', color: 'var(--dkgreen)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>Retry</button></div>
              : logs.length === 0 ? <div style={{ textAlign: 'center', padding: 12, color: 'var(--gray2)', fontSize: 12, background: 'var(--ltgray)', borderRadius: 8 }}>No follow-ups yet.</div>
              : logs.map(l => (
                <div key={l.id} style={{ background: 'var(--ltgray)', borderRadius: 8, padding: '9px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--dkgreen)', background: 'var(--ltgreen)', padding: '2px 7px', borderRadius: 99 }}>{l.updated_by}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--gray2)' }}>{new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    {l.status_at_time && <span style={{ fontSize: 10, color: 'var(--gray)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 99 }}>{l.status_at_time}</span>}
                    <button onClick={() => delLog(l.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--gray2)', cursor: 'pointer', fontSize: 12 }}>🗑</button>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--navy2)', lineHeight: 1.5 }}>{l.note}</div>
                  {l.next_action && <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 2 }}>→ {l.next_action}</div>}
                </div>
              ))}
          </div>

          {/* Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div><label style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)' }}>Updated By</label>
              <input value={user.name} disabled style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3, background: '#F8FAFC', fontWeight: 600 }} /></div>
            <div><label style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)' }}>Status Update</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }}>
                <option value="">No change</option><option>In Progress</option><option>Waiting for Client</option><option>Document Received</option><option>Under Review</option><option>Filed / Completed</option><option>On Hold</option></select></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)' }}>Remark / Update *</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="e.g. Email sent to client requesting GST docs..." style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3, resize: 'none', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div><label style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)' }}>Next Action</label>
              <input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="e.g. Call Friday" style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }} /></div>
            <div><label style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)' }}>Follow-up Date</label>
              <input type="date" value={nextDate} min={todayLocal()} onChange={e => setNextDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3 }} /></div>
          </div>
          {saveError && <div role="alert" style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>{saveError}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} disabled={saving} style={{ padding: '8px 18px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: '8px 18px', fontSize: 12, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : '+ Save Follow-up'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}