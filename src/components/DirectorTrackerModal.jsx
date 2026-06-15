import { useState } from 'react'
import { supabase } from '../supabase'
import { Overlay, Field, Row, Actions, Hint, inp, errBox, btnPrimary, btnGhost } from './DINHolderModal'

// Per-director KYC tracker (Phase 2B). Opening this modal is READ-ONLY:
// it only displays the values already returned by dkyc_list_client_directors.
// The linking RPC (dkyc_link_client_director) is called ONLY on an explicit
// user action ("Start Tracking" when no holder is linked yet), and the tracker
// update RPC (dkyc_update_holder_tracker) only on "Save".
// DIN is read-only and comes from onboarding. Next KYC is derived (read-only).

const LINK_ERR = {
  FORBIDDEN_ROLE: 'You do not have permission for this action.',
  NO_ACTOR_IDENTITY: 'Your account is not linked for Director KYC actions yet.',
  CLIENT_NOT_FOUND: 'That company could not be found.',
  CLIENT_IS_DRAFT: 'This company is still a draft.',
  CLIENT_DRAFT_STATE_UNKNOWN: 'This company’s draft status is unknown.',
  CLIENT_CODE_MISSING: 'This company has no client code.',
  DIRECTOR_NOT_FOUND_FOR_CLIENT: 'This director does not belong to the selected company.',
  INVALID_OR_MISSING_DIN: 'DIN is missing in Client Onboarding. Please update the director record first.',
  HOLDER_INACTIVE: 'A DIN holder for this DIN exists but is inactive. It will not be reused automatically.',
  HOLDER_RESOLVE_FAILED: 'Could not resolve the DIN holder. Please try again.',
}
const UPD_ERR = {
  ...LINK_ERR,
  HOLDER_NOT_FOUND: 'DIN holder not found.',
  NO_FIELDS_TO_UPDATE: 'Nothing to save — change at least one field.',
  ALLOTMENT_DATE_REQUIRED: 'Enter the DIN allotment date.',
  LAST_KYC_MONTH_REQUIRED: 'Select the Last KYC month.',
  KYC_FREQUENCY_NOT_CONFIGURED: 'KYC frequency is not configured. Contact the administrator.',
}

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}
// MM-YYYY display from a date or null
function toMonthInput(d) {
  if (!d) return ''
  try { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` }
  catch { return '' }
}
// month input "YYYY-MM" -> first-of-month "YYYY-MM-01"
function monthToFirstOfMonth(m) {
  if (!m) return null
  return `${m}-01`
}
function changeDoneToParam(v) {
  if (v === 'yes') return true
  if (v === 'no') return false
  return null // not recorded
}
function changeDoneFromBool(v) {
  if (v === true) return 'yes'
  if (v === false) return 'no'
  return 'unknown'
}

export default function DirectorTrackerModal({ clientId, clientName, director, onClose, onSaved }) {
  // Linked state is determined ONLY by the server flag company_link_exists.
  // Never inferred from din_holder_id (a DIN match does not prove a company link).
  const [linkExists, setLinkExists] = useState(director.company_link_exists === true)
  const [holderId, setHolderId] = useState(director.din_holder_id || null)
  const linked = linkExists

  // Blocking conditions from server flags (read-only on open).
  const holderInactive = director.din_holder_exists === true && director.din_holder_active !== true
  const linkInactive = director.company_link_exists === true && director.company_link_active !== true
  const blocked = holderInactive || linkInactive
  const blockedMsg = holderInactive
    ? 'This DIN holder is inactive. Please review/reactivate it before tracking KYC.'
    : (linkInactive ? 'This company link is inactive. Please review/reactivate it before tracking KYC.' : '')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  // Editable tracker fields (seeded from the read-only RPC row).
  const [allotment, setAllotment] = useState(director.din_allotment_date ? String(director.din_allotment_date).slice(0, 10) : '')
  const allotmentLocked = !!director.din_allotment_date // write-once: locked once present
  const [lastKycMonth, setLastKycMonth] = useState(toMonthInput(director.last_kyc_month))
  const [changeDone, setChangeDone] = useState(changeDoneFromBool(director.kyc_change_done))

  // Next KYC is server/config-derived only. No client-side calculation.
  // Show the server value when present; otherwise indicate it is computed on save.
  const nextKycText = director.next_kyc_display || 'Calculated after saving Last KYC.'

  function readErr(error, map) {
    const msg = (error && (error.message || String(error))) || ''
    for (const k of Object.keys(map)) if (msg.includes(k)) return map[k]
    return msg || 'Something went wrong. Please try again.'
  }

  // Explicit user action — NOT called on open.
  async function startTracking() {
    if (blocked) { setErr(blockedMsg); return }
    setBusy(true); setErr(''); setNotice('')
    const { data, error } = await supabase.rpc('dkyc_link_client_director', {
      p_client_id: clientId,
      p_director_id: director.director_id,
      p_relationship: director.role || null,
      p_appointment_date: director.appointment_date || null,
    })
    setBusy(false)
    if (error) { setErr(readErr(error, LINK_ERR)); return }
    if (data && data.ok === false) { setErr(LINK_ERR[data.error] || data.error || 'Could not start tracking.'); return }
    setHolderId(data.din_holder_id)
    setLinkExists(true)
    setNotice(data.reused ? 'Existing DIN holder reused.' : 'DIN holder created and linked.')
  }

  // Explicit user action — Save tracker fields.
  async function save() {
    if (blocked) { setErr(blockedMsg); return }
    if (!holderId) { setErr('Start tracking first to create/link the DIN holder.'); return }
    const setAllot = !allotmentLocked && !!allotment
    const setLast = !!lastKycMonth && lastKycMonth !== toMonthInput(director.last_kyc_month)
    const setChange = changeDone !== changeDoneFromBool(director.kyc_change_done)
    if (!setAllot && !setLast && !setChange) { setErr('Change at least one field before saving.'); return }

    setBusy(true); setErr(''); setNotice('')
    const { data, error } = await supabase.rpc('dkyc_update_holder_tracker', {
      p_din_holder_id: holderId,
      p_set_allotment: setAllot,
      p_din_allotment_date: setAllot ? allotment : null,
      p_set_last_kyc: setLast,
      p_last_kyc_month: setLast ? monthToFirstOfMonth(lastKycMonth) : null,
      p_set_change_done: setChange,
      p_change_done: setChange ? changeDoneToParam(changeDone) : null,
    })
    setBusy(false)
    if (error) { setErr(readErr(error, UPD_ERR)); return }
    if (data && data.ok === false) { setErr(UPD_ERR[data.error] || data.error || 'Could not save.'); return }
    onSaved()
  }

  return (
    <Overlay title={`Director KYC — ${director.name}`} onClose={onClose}>
      {/* Read-only context (no DSC fields) */}
      <div className="card" style={{ padding: 14, marginBottom: 16, background: 'var(--ltgray)', border: 'none' }}>
        <DL>
          <DT>Company</DT><DD>{clientName}</DD>
          <DT>Director</DT><DD>{director.name}</DD>
          <DT>DIN Number</DT><DD><span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{director.din}</span> <span style={{ color: 'var(--gray2)', fontSize: 11 }}>(from Client Onboarding · read-only)</span></DD>
        </DL>
      </div>

      {!linked && !blocked && (
        <div style={{ background: 'var(--ltblue)', color: 'var(--blue)', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>
          This director is not being tracked yet. Click <strong>Start Tracking</strong> to create/reuse the DIN holder, then record the KYC details.
        </div>
      )}

      {blocked && (
        <div style={{ background: '#FEF2F2', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>
          {blockedMsg}
        </div>
      )}

      <Field label="DIN Allotment Date">
        <input type="date" value={allotment} disabled={allotmentLocked}
          onChange={e => setAllotment(e.target.value)}
          style={{ ...inp(), background: allotmentLocked ? '#F8FAFC' : '#fff' }} />
        {allotmentLocked
          ? <Hint>Already recorded ({fmtDate(director.din_allotment_date)}); allotment date is set once.</Hint>
          : <Hint>Not in onboarding — enter once if known.</Hint>}
      </Field>

      <Row>
        <Field label="Last KYC (MM-YYYY)">
          <input type="month" value={lastKycMonth} onChange={e => setLastKycMonth(e.target.value)} style={inp()} />
          <Hint>Stored as the first day of the selected month.</Hint>
        </Field>
        <Field label="Next KYC (MM-YYYY)">
          <input value={nextKycText} disabled style={{ ...inp(), background: '#F8FAFC' }} />
          <Hint>Server-derived; refreshes after you save Last KYC.</Hint>
        </Field>
      </Row>

      <Field label="Change Done">
        <select value={changeDone} onChange={e => setChangeDone(e.target.value)} style={inp()}>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="unknown">Not recorded</option>
        </select>
      </Field>

      {notice && <div style={{ background: 'var(--ltgreen)', color: 'var(--dkgreen)', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{notice}</div>}
      {err && <div style={errBox}>{err}</div>}

      <Actions>
        <button onClick={onClose} style={btnGhost}>Close</button>
        {!linked ? (
          <button onClick={startTracking} disabled={busy || blocked} style={{ ...btnPrimary, opacity: (busy || blocked) ? 0.5 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}>
            {busy ? 'Starting…' : 'Start Tracking'}
          </button>
        ) : (
          <button onClick={save} disabled={busy || blocked} style={{ ...btnPrimary, opacity: (busy || blocked) ? 0.5 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        )}
      </Actions>
    </Overlay>
  )
}

function DL({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 8, columnGap: 12, fontSize: 13 }}>{children}</div> }
function DT({ children }) { return <div style={{ color: 'var(--gray)', fontWeight: 600 }}>{children}</div> }
function DD({ children }) { return <div>{children}</div> }
