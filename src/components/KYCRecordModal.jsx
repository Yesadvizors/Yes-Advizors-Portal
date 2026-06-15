import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Overlay, Field, Row, Actions, Hint, inp, errBox, btnPrimary, btnGhost } from './DINHolderModal'

// Create a KYC record via dkyc_create_kyc_record. Admin/Manager only.
// Per-type fields mirror the server's complete record-type validation.
// Holder list is read from public.din_holders using the column-level SELECT
// grant established in Phase 1 (id, din, full_name). No record-table access.

const RECORD_TYPES = [
  { v: 'PERIODIC_KYC', label: 'Periodic DIR-3 KYC' },
  { v: 'EVENT_UPDATE', label: 'Event update (email / mobile / address change)' },
  { v: 'REACTIVATION', label: 'Reactivation (deactivated DIN)' },
  { v: 'HISTORICAL',   label: 'Historical (already-filed past record)' },
]
const CHANGE_TYPES = ['EMAIL', 'MOBILE', 'RESIDENTIAL_ADDRESS', 'MULTIPLE', 'OTHER']

const ERR_TEXT = {
  FORBIDDEN_ROLE:    'You do not have permission to create KYC records.',
  NO_ACTOR_IDENTITY: 'Your account is not linked for Director KYC actions yet.',
  HOLDER_NOT_FOUND:  'Select a valid DIN holder.',
  CYCLE_REQUIRED:    'Compliance cycle (year) is required for this type.',
  TRIGGER_DATE_REQUIRED: 'Trigger date is required for this type.',
  CHANGE_TYPE_REQUIRED:  'Change type is required for an event update.',
  HISTORICAL_COMPLETED_DATE_REQUIRED: 'Historical completed date is required.',
  REACTIVATION_DUE_DATE_REQUIRED: 'A target due date is required for reactivation (no active statutory grace rule).',
  STANDARD_DUE_DATE_UNRESOLVED: 'The statutory due date could not be resolved. Check the cycle/trigger date.',
  COMPANY_LINK_MISMATCH: 'The selected company link does not belong to this holder.',
  PERIODIC_KYC_ALREADY_EXISTS: 'A periodic KYC for this holder and cycle already exists.',
  PERIODIC_NO_EVENT_OR_HISTORICAL_FIELDS: 'Periodic KYC cannot carry event/historical fields.',
  EVENT_NO_CYCLE_OR_HISTORICAL: 'Event update cannot carry cycle/historical fields.',
  REACTIVATION_NO_CYCLE_CHANGE_OR_HISTORICAL: 'Reactivation cannot carry cycle/change/historical fields.',
  HISTORICAL_NO_EVENT_FIELDS: 'Historical cannot carry event fields.',
  RECORD_TYPE_CONSTRAINT_VIOLATION: 'The field combination is not valid for this record type.',
}

const CY_MIN = 2014, CY_MAX = 2100

export default function KYCRecordModal({ onClose, onSaved }) {
  const [holders, setHolders] = useState([])
  const [loadingHolders, setLoadingHolders] = useState(true)
  const [holderId, setHolderId] = useState('')
  const [recordType, setRecordType] = useState('PERIODIC_KYC')
  const [cycle, setCycle] = useState('')
  const [triggerDate, setTriggerDate] = useState('')
  const [changeType, setChangeType] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [historicalDate, setHistoricalDate] = useState('')
  const [reactivationDue, setReactivationDue] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { loadHolders() }, [])

  async function loadHolders() {
    setLoadingHolders(true)
    const { data, error } = await supabase
      .from('din_holders')
      .select('id, din, full_name')
      .eq('is_active', true)
      .order('full_name')
    if (error) { setErr('Could not load DIN holders: ' + error.message); setHolders([]); setLoadingHolders(false); return }
    setHolders(data || [])
    setLoadingHolders(false)
  }

  const cycleNum = cycle ? parseInt(cycle, 10) : null
  const cycleValid = cycleNum !== null && cycleNum >= CY_MIN && cycleNum <= CY_MAX

  function validClient() {
    if (!holderId) return false
    if (recordType === 'PERIODIC_KYC') return cycleValid
    if (recordType === 'EVENT_UPDATE') return !!triggerDate && !!changeType
    if (recordType === 'REACTIVATION') return !!triggerDate && !!reactivationDue
    if (recordType === 'HISTORICAL')   return cycleValid && !!historicalDate
    return false
  }
  const canSave = validClient() && !saving

  async function save() {
    setErr(''); setSaving(true)
    const args = {
      p_din_holder_id: holderId,
      p_record_type: recordType,
      p_compliance_cycle: (recordType === 'PERIODIC_KYC' || recordType === 'HISTORICAL') ? cycleNum : null,
      p_trigger_date: (recordType === 'EVENT_UPDATE' || recordType === 'REACTIVATION') ? triggerDate : null,
      p_change_type: recordType === 'EVENT_UPDATE' ? changeType : null,
      p_change_summary: recordType === 'EVENT_UPDATE' ? (changeSummary.trim() || null) : null,
      p_historical_completed_date: recordType === 'HISTORICAL' ? historicalDate : null,
      p_reactivation_due_date: recordType === 'REACTIVATION' ? reactivationDue : null,
      p_din_holder_company_id: null,
    }
    const { data, error } = await supabase.rpc('dkyc_create_kyc_record', args)
    setSaving(false)
    if (error) { setErr(error.message || 'Could not create the record.'); return }
    if (data && data.ok === false) { setErr(ERR_TEXT[data.error] || (data.detail || data.error || 'Could not create the record.')); return }
    onSaved()
  }

  return (
    <Overlay title="Create KYC Record" onClose={onClose}>
      <Field label="DIN holder" required>
        {loadingHolders
          ? <div style={{ fontSize: 13, color: 'var(--gray2)' }}>Loading holders…</div>
          : holders.length === 0
            ? <Hint error>No DIN holders yet. Add a DIN holder first.</Hint>
            : (
              <select value={holderId} onChange={e => setHolderId(e.target.value)} style={inp()}>
                <option value="">Select a holder…</option>
                {holders.map(h => <option key={h.id} value={h.id}>{h.full_name} — {h.din}</option>)}
              </select>
            )}
      </Field>

      <Field label="Record type" required>
        <select value={recordType} onChange={e => setRecordType(e.target.value)} style={inp()}>
          {RECORD_TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
      </Field>

      {(recordType === 'PERIODIC_KYC' || recordType === 'HISTORICAL') && (
        <Field label={`Compliance cycle year (${CY_MIN}–${CY_MAX})`} required>
          <input value={cycle} onChange={e => setCycle(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            inputMode="numeric" placeholder="e.g. 2025" style={inp(cycle && !cycleValid)} />
          {recordType === 'PERIODIC_KYC' && <Hint>Periodic DIR-3 KYC is due 30 June of the cycle year.</Hint>}
          {recordType === 'HISTORICAL' && <Hint>Historical due date is 30 September of the cycle year.</Hint>}
          {cycle && !cycleValid && <Hint error>Year must be between {CY_MIN} and {CY_MAX}.</Hint>}
        </Field>
      )}

      {(recordType === 'EVENT_UPDATE' || recordType === 'REACTIVATION') && (
        <Field label="Trigger date" required>
          <input type="date" value={triggerDate} onChange={e => setTriggerDate(e.target.value)} style={inp()} />
        </Field>
      )}

      {recordType === 'EVENT_UPDATE' && (
        <>
          <Field label="Change type" required>
            <select value={changeType} onChange={e => setChangeType(e.target.value)} style={inp()}>
              <option value="">Select…</option>
              {CHANGE_TYPES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Change summary">
            <textarea value={changeSummary} onChange={e => setChangeSummary(e.target.value)} rows={2} style={{ ...inp(), resize: 'vertical' }} />
          </Field>
        </>
      )}

      {recordType === 'REACTIVATION' && (
        <Field label="Target due date" required>
          <input type="date" value={reactivationDue} onChange={e => setReactivationDue(e.target.value)} style={inp()} />
          <Hint>Reactivation has no active statutory grace rule, so a target due date must be set manually.</Hint>
        </Field>
      )}

      {recordType === 'HISTORICAL' && (
        <Field label="Historical completed date" required>
          <input type="date" value={historicalDate} onChange={e => setHistoricalDate(e.target.value)} style={inp()} />
          <Hint>Historical records are stored as already-filed.</Hint>
        </Field>
      )}

      {err && <div style={errBox}>{err}</div>}

      <Actions>
        <button onClick={onClose} style={btnGhost}>Cancel</button>
        <button onClick={save} disabled={!canSave} style={{ ...btnPrimary, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Creating…' : 'Create record'}
        </button>
      </Actions>
    </Overlay>
  )
}
