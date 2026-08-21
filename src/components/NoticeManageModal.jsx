import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  NOTICE_AUTHORITIES, NOTICE_WORKFLOW_STAGES, NOTICE_STATUS_OPTIONS,
  validateNotice, buildNoticeInsertPayload, buildNoticeUpdatePayload, buildNoticeClosurePayload,
  isNoticeClosed, noticeEvidenceRequirement,
} from '../lib/noticeWorkflow'

// D17 — add / edit / assign / status / close a notice, and open governed evidence documents.
// Writes ONLY existing notice_tracker columns via the standard client (RLS is the authority).
// No new schema, no RPC, no service role, no external AI. Gated by the caller (canManage).
export default function NoticeManageModal({ notice, client, user, teamMembers = [], onClose, onSaved, onManageEvidence }) {
  const isEdit = !!(notice && notice.id)
  const [f, setF] = useState(() => seed(notice))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [fieldErr, setFieldErr] = useState({})

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !saving) { e.stopImmediatePropagation(); onClose() } }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [saving, onClose])

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  const closed = isNoticeClosed(f.status)

  async function save(closeIt) {
    if (saving) return
    setErr(''); setFieldErr({})
    const { ok, errors } = validateNotice(f)
    if (!ok) { setFieldErr(errors); setErr('Please correct the highlighted fields.'); return }
    setSaving(true)
    const nowIso = new Date().toISOString()
    try {
      let error
      if (closeIt) {
        // Close an existing notice — canonical terminal status + reply-filed capture.
        if (!isEdit) { setErr('Save the notice before closing it.'); setSaving(false); return }
        ;({ error } = await supabase.from('notice_tracker')
          .update(buildNoticeClosurePayload({ status: 'Closed', replyFiledDate: f.reply_filed_date || nowIso.slice(0, 10), remarks: f.remarks }, nowIso))
          .eq('id', notice.id))
      } else if (isEdit) {
        ;({ error } = await supabase.from('notice_tracker')
          .update(buildNoticeUpdatePayload(f, notice.assigned_to, nowIso)).eq('id', notice.id))
      } else {
        ;({ error } = await supabase.from('notice_tracker')
          .insert(buildNoticeInsertPayload(f, client.id, nowIso)))
      }
      if (error) { console.error('[Notice] save failed:', error); setErr('Could not save the notice. You may not have permission, or a value is invalid. Please retry.'); setSaving(false); return }
      setSaving(false)
      onSaved()
    } catch (e) { console.error('[Notice] save error:', e); setErr('Could not save the notice. Please retry.'); setSaving(false) }
  }

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.head}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>📨 {isEdit ? 'Manage Notice' : 'Add Notice'}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{client?.name}{f.fy_label ? ` · FY ${f.fy_label}` : ''}{closed ? ' · ✓ Closed' : ''}</div>
          </div>
          <button onClick={onClose} disabled={saving} style={S.close}>✕</button>
        </div>

        <div style={S.body}>
          <Row>
            <Field label="Authority *" err={fieldErr.authority}>
              <select style={inp} value={f.authority} onChange={e => set('authority', e.target.value)} disabled={saving}>
                <option value="">— Select —</option>
                {NOTICE_AUTHORITIES.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Notice Type *" err={fieldErr.notice_type}>
              <input style={inp} value={f.notice_type} onChange={e => set('notice_type', e.target.value)} placeholder="e.g. Sec 143(2) Scrutiny" disabled={saving} />
            </Field>
          </Row>
          <Row>
            <Field label="Section"><input style={inp} value={f.section} onChange={e => set('section', e.target.value)} disabled={saving} /></Field>
            <Field label="Financial Year"><input style={inp} value={f.fy_label} onChange={e => set('fy_label', e.target.value)} placeholder="e.g. 2025-26" disabled={saving} /></Field>
          </Row>
          <Row>
            <Field label="Notice Date"><input type="date" style={inp} value={f.notice_date} onChange={e => set('notice_date', e.target.value)} disabled={saving} /></Field>
            <Field label="Date of Receipt"><input type="date" style={inp} value={f.date_of_receipt} onChange={e => set('date_of_receipt', e.target.value)} disabled={saving} /></Field>
          </Row>
          {/* Deadlines — the effective response due is individual → extended → response */}
          <Row>
            <Field label="Response Due Date"><input type="date" style={inp} value={f.response_due_date} onChange={e => set('response_due_date', e.target.value)} disabled={saving} /></Field>
            <Field label="Extended Due Date"><input type="date" style={inp} value={f.extended_due_date} onChange={e => set('extended_due_date', e.target.value)} disabled={saving} /></Field>
          </Row>
          <Row>
            <Field label="Individual Due Date"><input type="date" style={inp} value={f.individual_due_date} onChange={e => set('individual_due_date', e.target.value)} disabled={saving} /></Field>
            <Field label="Linked Compliance Period"><input style={inp} value={f.linked_compliance_period} onChange={e => set('linked_compliance_period', e.target.value)} disabled={saving} /></Field>
          </Row>
          {/* Assignment */}
          <Row>
            <Field label="Assigned To">
              <select style={inp} value={f.assigned_to} onChange={e => set('assigned_to', e.target.value)} disabled={saving}>
                <option value="">— Unassigned —</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.display_name || m.full_name || m.email}</option>)}
              </select>
              {teamMembers.length === 0 && <div style={hint}>No active team members available to assign.</div>}
            </Field>
            <Field label="Workflow Stage">
              <select style={inp} value={f.workflow_stage} onChange={e => set('workflow_stage', e.target.value)} disabled={saving}>
                <option value="">—</option>
                {NOTICE_WORKFLOW_STAGES.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
          </Row>
          {/* Status + reply tracking */}
          <Row>
            <Field label="Status" err={fieldErr.status}>
              <select style={inp} value={f.status} onChange={e => set('status', e.target.value)} disabled={saving}>
                <option value="">—</option>
                {NOTICE_STATUS_OPTIONS.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Demand Raised (₹)" err={fieldErr.demand_raised}>
              <input style={inp} value={f.demand_raised} onChange={e => set('demand_raised', e.target.value)} placeholder="0" disabled={saving} />
            </Field>
          </Row>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '4px 0 8px' }}>
            <Check label="Reply prepared" v={f.reply_prepared} on={v => set('reply_prepared', v)} disabled={saving} />
            <Check label="Reply reviewed" v={f.reply_reviewed} on={v => set('reply_reviewed', v)} disabled={saving} />
            <Check label="Reply filed" v={f.reply_filed} on={v => set('reply_filed', v)} disabled={saving} />
          </div>
          <Row>
            <Field label="Reply Filed Date"><input type="date" style={inp} value={f.reply_filed_date} onChange={e => set('reply_filed_date', e.target.value)} disabled={saving} /></Field>
            <Field label="Acknowledgement No."><input style={inp} value={f.acknowledgement_number} onChange={e => set('acknowledgement_number', e.target.value)} disabled={saving} /></Field>
          </Row>
          <Field label="Documents Required"><input style={inp} value={f.documents_required} onChange={e => set('documents_required', e.target.value)} disabled={saving} /></Field>
          <Field label="Remarks"><textarea style={{ ...inp, minHeight: 48 }} value={f.remarks} onChange={e => set('remarks', e.target.value)} disabled={saving} /></Field>

          {/* Evidence — governed documents (requirement_ref_type='notice'); edit only */}
          {isEdit && onManageEvidence && (
            <button type="button" onClick={() => onManageEvidence(noticeEvidenceRequirement(notice, client))}
              style={{ ...S.btnGhost, marginTop: 4 }}>📁 Manage Evidence Documents</button>
          )}
        </div>

        {err && <div style={S.err}>⚠️ {err}</div>}
        <div style={S.foot}>
          <button onClick={onClose} disabled={saving} style={S.btnGhost}>Cancel</button>
          <div style={{ display: 'flex', gap: 10 }}>
            {isEdit && !closed && <button onClick={() => save(true)} disabled={saving} style={S.btnClose}>✓ Close Notice</button>}
            <button onClick={() => save(false)} disabled={saving} style={S.btn}>{saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Notice')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function seed(n) {
  const g = (k) => (n && n[k] != null ? n[k] : '')
  return {
    authority: g('authority'), notice_type: g('notice_type'), section: g('section'), fy_label: g('fy_label'),
    notice_date: g('notice_date'), date_of_receipt: g('date_of_receipt'),
    response_due_date: g('response_due_date'), extended_due_date: g('extended_due_date'), individual_due_date: g('individual_due_date'),
    linked_compliance_period: g('linked_compliance_period'), assigned_to: g('assigned_to'),
    workflow_stage: g('workflow_stage'), status: g('status'),
    reply_prepared: n?.reply_prepared === true, reply_reviewed: n?.reply_reviewed === true, reply_filed: n?.reply_filed === true,
    reply_filed_date: g('reply_filed_date'), acknowledgement_number: g('acknowledgement_number'),
    demand_raised: n?.demand_raised != null ? String(n.demand_raised) : '', documents_required: g('documents_required'), remarks: g('remarks'),
  }
}

const inp = { width: '100%', padding: '7px 9px', border: '1px solid #D6DBD6', borderRadius: 7, fontSize: 12.5, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }
const hint = { fontSize: 10, color: '#9CA3AF', marginTop: 2 }
const Row = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>{children}</div>
function Field({ label, err, children }) {
  return <label style={{ display: 'block', marginBottom: 8 }}><span style={{ fontSize: 10.5, fontWeight: 600, color: err ? '#DC2626' : '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 3 }}>{label}</span>{children}{err && <div style={{ fontSize: 10, color: '#DC2626', marginTop: 2 }}>{err}</div>}</label>
}
function Check({ label, v, on, disabled }) {
  return <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', cursor: disabled ? 'default' : 'pointer' }}><input type="checkbox" checked={v} disabled={disabled} onChange={e => on(e.target.checked)} />{label}</label>
}
const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 5200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' },
  modal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 22px 12px', borderBottom: '1px solid #EEF0ED' },
  close: { width: 30, height: 30, borderRadius: 8, border: '1px solid #D6DBD6', background: '#fff', cursor: 'pointer' },
  body: { padding: '14px 22px', overflowY: 'auto', flex: 1 },
  err: { margin: '0 22px', padding: '9px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#991B1B' },
  foot: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', borderTop: '1px solid #EEF0ED' },
  btn: { padding: '9px 20px', border: 'none', borderRadius: 8, background: '#0A3D2C', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnClose: { padding: '9px 18px', border: '1px solid #16A34A', borderRadius: 8, background: '#F0FDF4', color: '#166534', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnGhost: { padding: '8px 16px', border: '1px solid #D6DBD6', borderRadius: 8, background: '#fff', color: '#374151', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
}
