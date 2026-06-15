import { useState } from 'react'
import { supabase } from '../supabase'
import { Overlay, Field, Row, Actions, Hint, inp, errBox, btnPrimary, btnGhost } from './DINHolderModal'
import { MONTHS, monYYYY, fmtDateOnly, dateToMonthYear, monthYearToFirstOfMonth, validateLastKyc, validateAllotment, sameDate } from './dkycFormat'

// Per-director KYC tracker (Phase 2B consolidated).
// Opening is READ-ONLY (no writes). One explicit Save runs the atomic sequence:
//   validate -> (link if company_link_exists !== true) -> update tracker ->
//   reload from server -> verify submitted values -> success only on match.
// DIN is read-only (onboarding). Next KYC is server-derived (Mon-YYYY); no +3.

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
const VERIFY_FAIL_MSG = 'The server responded, but the saved values could not be verified. Please do not re-enter the data until this is reviewed.'

function changeDoneToParam(v) { if (v === 'yes') return true; if (v === 'no') return false; return null }
function changeDoneFromBool(v) { if (v === true) return 'yes'; if (v === false) return 'no'; return 'unknown' }
function readErr(error, map) {
  const msg = (error && (error.message || String(error))) || ''
  for (const k of Object.keys(map)) if (msg.includes(k)) return map[k]
  return msg || 'Something went wrong. Please try again.'
}

export default function DirectorTrackerModal({ clientId, clientName, director, onClose, onSaved }) {
  const [row, setRow] = useState(director)
  const linkExists = row.company_link_exists === true
  const [holderId, setHolderId] = useState(row.din_holder_id || null)
  const holderInactive = row.din_holder_exists === true && row.din_holder_active !== true
  const linkInactive = row.company_link_exists === true && row.company_link_active !== true
  const blocked = holderInactive || linkInactive
  const blockedMsg = holderInactive
    ? 'This DIN holder is inactive. Please review/reactivate it before tracking KYC.'
    : (linkInactive ? 'This company link is inactive. Please review/reactivate it before tracking KYC.' : '')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState('')
  const [allotment, setAllotment] = useState(row.din_allotment_date ? String(row.din_allotment_date).slice(0, 10) : '')
  const allotmentLocked = !!row.din_allotment_date
  const seedMY = dateToMonthYear(row.last_kyc_month)
  const [kycMonth, setKycMonth] = useState(seedMY.month)
  const [kycYear, setKycYear] = useState(seedMY.year)
  const [changeDone, setChangeDone] = useState(changeDoneFromBool(row.kyc_change_done))
  const nextKycText = monYYYY(row.next_kyc_month) || 'Calculated after saving Last KYC.'

  function adoptRow(fresh) {
    setRow(fresh)
    setHolderId(fresh.din_holder_id || null)
    setAllotment(fresh.din_allotment_date ? String(fresh.din_allotment_date).slice(0, 10) : '')
    const my = dateToMonthYear(fresh.last_kyc_month)
    setKycMonth(my.month); setKycYear(my.year)
    setChangeDone(changeDoneFromBool(fresh.kyc_change_done))
  }

  async function fetchFreshRow() {
    const { data, error } = await supabase.rpc('dkyc_list_client_directors', { p_client_id: clientId })
    if (error) return { error }
    const match = (Array.isArray(data) ? data : []).find(d => d.director_id === director.director_id)
    return { row: match || null }
  }

  async function save() {
    setErr(''); setSuccess('')
    if (blocked) { setErr(blockedMsg); return }
    const aV = validateAllotment(allotmentLocked ? '' : allotment)
    if (!aV.ok) { setErr(aV.error); return }
    const kV = validateLastKyc(kycMonth, kycYear)
    if (!kV.ok) { setErr(kV.error); return }

    const seed = dateToMonthYear(row.last_kyc_month)
    const setAllot = !allotmentLocked && !!allotment
    const lastKycFirstOfMonth = monthYearToFirstOfMonth(kycMonth, kycYear)
    const setLast = !!lastKycFirstOfMonth && !(kycMonth === seed.month && kycYear === seed.year)
    const setChange = changeDone !== changeDoneFromBool(row.kyc_change_done)
    if (!setAllot && !setLast && !setChange) { setErr('Change at least one field before saving.'); return }

    setBusy(true)
    let effectiveHolderId = holderId
    if (row.company_link_exists !== true) {
      const { data: linkData, error: linkErr } = await supabase.rpc('dkyc_link_client_director', {
        p_client_id: clientId,
        p_director_id: director.director_id,
        p_relationship: director.role || null,
        p_appointment_date: director.appointment_date || null,
      })
      if (linkErr) { setBusy(false); setErr(readErr(linkErr, LINK_ERR)); return }
      if (linkData && linkData.ok === false) { setBusy(false); setErr(LINK_ERR[linkData.error] || linkData.error || 'Could not start tracking.'); return }
      effectiveHolderId = linkData.din_holder_id
      setHolderId(effectiveHolderId)
    }
    if (!effectiveHolderId) { setBusy(false); setErr('Could not resolve the DIN holder. Please try again.'); return }

    const { data: updData, error: updErr } = await supabase.rpc('dkyc_update_holder_tracker', {
      p_din_holder_id: effectiveHolderId,
      p_set_allotment: setAllot,
      p_din_allotment_date: setAllot ? allotment : null,
      p_set_last_kyc: setLast,
      p_last_kyc_month: setLast ? lastKycFirstOfMonth : null,
      p_set_change_done: setChange,
      p_change_done: setChange ? changeDoneToParam(changeDone) : null,
    })
    if (updErr) { setBusy(false); setErr(readErr(updErr, UPD_ERR)); return }
    if (updData && updData.ok === false) { setBusy(false); setErr(UPD_ERR[updData.error] || updData.error || 'Could not save.'); return }

    const fresh = await fetchFreshRow()
    setBusy(false)
    if (fresh.error || !fresh.row) { setErr(VERIFY_FAIL_MSG); return }

    const fr = fresh.row
    const okAllot = setAllot ? sameDate(fr.din_allotment_date, allotment) : true
    const okLast = setLast ? sameDate(fr.last_kyc_month, lastKycFirstOfMonth) : true
    const okChange = setChange ? (fr.kyc_change_done === changeDoneToParam(changeDone)) : true
    const expectedLastKyc = setLast ? lastKycFirstOfMonth : row.last_kyc_month
    const okNext = expectedLastKyc ? !!fr.next_kyc_month : fr.next_kyc_month == null

    if (!(okAllot && okLast && okChange && okNext)) { adoptRow(fr); setErr(VERIFY_FAIL_MSG); return }

    adoptRow(fr)
    setSuccess('Saved and verified successfully.')
    if (typeof onSaved === 'function') onSaved(fr)
  }

  const yearBad = kycYear !== '' && !/^\d{4}$/.test(String(kycYear))

  return (
    <Overlay title={`Director KYC — ${row.name}`} onClose={onClose}>
      <div className="card" style={{ padding: 14, marginBottom: 16, background: 'var(--ltgray)', border: 'none' }}>
        <DL>
          <DT>Company</DT><DD>{clientName}</DD>
          <DT>Director</DT><DD>{row.name}</DD>
          <DT>DIN Number</DT><DD><span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{row.din}</span> <span style={{ color: 'var(--gray2)', fontSize: 11 }}>(from Client Onboarding · read-only)</span></DD>
        </DL>
      </div>

      {!linkExists && !blocked && (
        <div style={{ background: 'var(--ltblue)', color: 'var(--blue)', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>
          Not tracked yet. Saving will create the company link, then record the KYC details in one step.
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
          ? <Hint>Already recorded ({fmtDateOnly(row.din_allotment_date)}); allotment date is set once.</Hint>
          : <Hint>Not in onboarding — enter once if known (cannot be later than today).</Hint>}
      </Field>

      <Row>
        <Field label="Last KYC (Month / Year)">
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={kycMonth} onChange={e => setKycMonth(e.target.value)} style={{ ...inp(), flex: 1 }}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input type="text" inputMode="numeric" maxLength={4} value={kycYear}
              onChange={e => setKycYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="YYYY" style={{ ...inp(yearBad), width: 90 }} />
          </div>
          <Hint error={yearBad}>{yearBad ? 'Year must be exactly four digits.' : 'Stored as first day of month. Displayed as Mon-YYYY.'}</Hint>
        </Field>
        <Field label="Next KYC (Mon-YYYY)">
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

      {success && <div style={{ background: 'var(--ltgreen)', color: 'var(--dkgreen)', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{success}</div>}
      {err && <div style={errBox}>{err}</div>}

      <Actions>
        <button onClick={onClose} style={btnGhost}>Close</button>
        <button onClick={save} disabled={busy || blocked} style={{ ...btnPrimary, opacity: (busy || blocked) ? 0.5 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </Actions>
    </Overlay>
  )
}

function DL({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 8, columnGap: 12, fontSize: 13 }}>{children}</div> }
function DT({ children }) { return <div style={{ color: 'var(--gray)', fontWeight: 600 }}>{children}</div> }
function DD({ children }) { return <div>{children}</div> }
