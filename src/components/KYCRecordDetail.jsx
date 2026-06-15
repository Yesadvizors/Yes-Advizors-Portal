import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Overlay, Field, Actions, inp, errBox, btnPrimary, btnGhost } from './DINHolderModal'

// Record detail + workflow + due-date override.
// Reads via dkyc_get_record_detail (access-gated server-side).
// Workflow/override via the deployed RPCs. Manager-only controls are
// conditioned on user role for UX; the server is the authoritative gate.
// No assignment control in Phase 2A.

function isManager(user) {
  return user?.is_admin === true || user?.portal_role === 'Manager'
}
function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

const ADVANCE_NEXT = {
  'Prepared': 'Reviewed',
  'Reviewed': 'Partner Approved',
  'Partner Approved': 'Filed',
}

export default function KYCRecordDetail({ recordId, user, onClose, onChanged }) {
  const manager = isManager(user)
  const [rec, setRec] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const [notes, setNotes] = useState('')
  const [showOverride, setShowOverride] = useState(false)
  const [ovDate, setOvDate] = useState('')
  const [ovReason, setOvReason] = useState('')

  useEffect(() => { load() }, [recordId])

  async function load() {
    setLoading(true); setErr('')
    const { data, error } = await supabase.rpc('dkyc_get_record_detail', { p_record_id: recordId })
    if (error) { setErr(error.message || 'Could not load the record.'); setLoading(false); return }
    if (data && data.ok === false) { setErr(data.error === 'ACCESS_DENIED' ? 'You do not have access to this record.' : data.error); setLoading(false); return }
    setRec(data.record)
    setNotes(data.record?.preparation_notes || '')
    setLoading(false)
  }

  async function runRpc(fn, args) {
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc(fn, args)
    setBusy(false)
    if (error) { setErr(error.message || 'Action failed.'); return false }
    if (data && data.ok === false) { setErr(humanError(data)); return false }
    await load()
    if (onChanged) onChanged()
    return true
  }

  function humanError(data) {
    const map = {
      FORBIDDEN_ROLE: 'You do not have permission for that action.',
      NO_ACTOR_IDENTITY: 'Your account is not linked for Director KYC actions yet.',
      NOT_ASSIGNED: 'This record is not assigned to you.',
      WRONG_STAGE: 'That action is not available at the current stage.',
      INVALID_TRANSITION: 'That stage change is not allowed.',
      RECORD_FILED_OVERRIDE_BLOCKED: 'This record is filed; due-date overrides are blocked.',
      DUE_DATE_REQUIRED: 'A due date is required.',
      REASON_REQUIRED: 'A reason is required.',
      RECORD_NOT_FOUND: 'Record not found.',
    }
    return map[data.error] || data.detail || data.error || 'Action failed.'
  }

  const stage = rec?.workflow_stage
  const canPrepare = stage === 'Assigned' || stage === 'In Progress'
  const canSubmit = stage === 'In Progress'
  const advanceTo = manager ? ADVANCE_NEXT[stage] : null
  const canOverride = manager && stage !== 'Filed'

  return (
    <Overlay title="KYC Record" onClose={onClose}>
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray2)' }}>Loading…</div>
      ) : err && !rec ? (
        <div style={errBox}>{err}</div>
      ) : rec ? (
        <div>
          <div className="card" style={{ padding: 14, marginBottom: 16, background: 'var(--ltgray)', border: 'none' }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{rec.full_name} <span style={{ color: 'var(--gray)', fontWeight: 600 }}>· DIN {rec.din}</span></div>
            <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>
              {String(rec.record_type).replace(/_/g, ' ')} · Stage: <strong>{stage}</strong>
            </div>
          </div>

          <DL>
            <DT>Compliance cycle</DT><DD>{rec.compliance_cycle || '—'}</DD>
            <DT>Trigger date</DT><DD>{fmtDate(rec.trigger_date)}</DD>
            {rec.change_type && (<><DT>Change type</DT><DD>{String(rec.change_type).replace(/_/g, ' ')}</DD></>)}
            <DT>Standard due</DT><DD>{fmtDate(rec.standard_due_date)}</DD>
            <DT>Effective due</DT><DD><strong>{fmtDate(rec.effective_due_date)}</strong></DD>
            {rec.historical_completed_date && (<><DT>Historical completed</DT><DD>{fmtDate(rec.historical_completed_date)}</DD></>)}
            {rec.company_name && (<><DT>Company</DT><DD>{rec.company_name} ({rec.company_code}) · {rec.company_relationship}</DD></>)}
            {rec.email && (<><DT>Email</DT><DD>{rec.email}</DD></>)}
            {rec.mobile && (<><DT>Mobile</DT><DD>{rec.mobile}</DD></>)}
            {manager && rec.due_date_override_reason && (<><DT>Override reason</DT><DD>{rec.due_date_override_reason}</DD></>)}
          </DL>

          {stage !== 'Filed' && (
            <Field label="Preparation notes">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inp(), resize: 'vertical' }} />
            </Field>
          )}

          {err && <div style={errBox}>{err}</div>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {canPrepare && (
              <button disabled={busy} onClick={() => runRpc('dkyc_save_preparation', { p_record_id: recordId, p_notes: notes || null })} style={btnGhost}>
                Save notes (In Progress)
              </button>
            )}
            {canSubmit && (
              <button disabled={busy} onClick={() => runRpc('dkyc_submit_prepared', { p_record_id: recordId })} style={btnPrimary}>
                Submit as Prepared
              </button>
            )}
            {advanceTo && (
              <button disabled={busy} onClick={() => runRpc('dkyc_advance_stage', { p_record_id: recordId, p_to_stage: advanceTo })} style={btnPrimary}>
                Advance → {advanceTo}
              </button>
            )}
            {canOverride && (
              <button disabled={busy} onClick={() => setShowOverride(v => !v)} style={btnGhost}>
                {showOverride ? 'Cancel override' : 'Override due date'}
              </button>
            )}
          </div>

          {showOverride && canOverride && (
            <div className="card" style={{ padding: 14, marginTop: 14 }}>
              <Field label="New due date" required>
                <input type="date" value={ovDate} onChange={e => setOvDate(e.target.value)} style={inp()} />
              </Field>
              <Field label="Reason" required>
                <textarea value={ovReason} onChange={e => setOvReason(e.target.value)} rows={2} style={{ ...inp(), resize: 'vertical' }} />
              </Field>
              <Actions>
                <button
                  disabled={busy || !ovDate || !ovReason.trim()}
                  onClick={async () => {
                    const ok = await runRpc('dkyc_override_due_date', { p_record_id: recordId, p_due_date: ovDate, p_reason: ovReason.trim() })
                    if (ok) { setShowOverride(false); setOvDate(''); setOvReason('') }
                  }}
                  style={{ ...btnPrimary, opacity: (!ovDate || !ovReason.trim()) ? 0.5 : 1 }}>
                  Apply override
                </button>
              </Actions>
            </div>
          )}
        </div>
      ) : null}
    </Overlay>
  )
}

function DL({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, columnGap: 12, fontSize: 13, marginBottom: 16 }}>{children}</div> }
function DT({ children }) { return <div style={{ color: 'var(--gray)', fontWeight: 600 }}>{children}</div> }
function DD({ children }) { return <div>{children}</div> }
