import { useState } from 'react'
import { ModalShell, Field, W } from './ServiceApplicabilityModalShell'
import { validateApprove, validateDeactivate, buildApprovePayload, buildDeactivatePayload } from '../../lib/serviceApplicability'
import { setServiceApplicabilityStatus } from '../../services/serviceApplicabilityWrites'
import { mapRpcError, ERROR_ACTIONS } from '../../lib/serviceApplicabilityErrors'
import { safeDate } from './ServiceApplicabilityStates'

/*
 * P5 CP-6 — approve / deactivate status modal (the ONLY lifecycle-transition write UI).
 *
 * Writes go through the CP-2 set_status wrapper only — no direct Supabase / .rpc / .from.
 * Only LEGAL transitions are offered by the section (approve: Draft only; deactivate:
 * Draft/Approved). Validation reuses the CP-1 validators; the RPC (and set_status guards)
 * remain the authority.
 *
 *  - approve   : validates the row already has effective_from and no effective_to
 *                (the Draft must be edited first if either is wrong); no field to collect;
 *  - deactivate: collects the stop date effective_to (>= effective_from); this is the ONLY
 *                place effective_to is set;
 *  - STALE_ROW_VERSION → onConflict (close + refresh + require reopen); no silent retry.
 *
 * @param {{ action:('approve'|'deactivate'), row:any, onClose:Function,
 *   onDone:(kind:'approve'|'deactivate') => void, onConflict:Function }} props
 */
export default function ServiceApplicabilityStatusModal({ action, row, onClose, onDone, onConflict }) {
  const isApprove = action === 'approve'
  const [effectiveTo, setEffectiveTo] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  const base = { id: row && row.id, rowVersion: row && row.row_version }

  async function handleConfirm() {
    if (busy) return
    setFormError(null)

    let validation
    let payload
    let kind
    if (isApprove) {
      validation = validateApprove(base, row)
      payload = buildApprovePayload(base)
      kind = 'approve'
    } else {
      validation = validateDeactivate({ ...base, effectiveTo }, row)
      payload = buildDeactivatePayload({ ...base, effectiveTo })
      kind = 'deactivate'
    }

    if (!validation.valid) { setErrors(validation.errors); return }
    setErrors({})
    setBusy(true)
    try {
      const res = await setServiceApplicabilityStatus(payload)
      if (res && res.error) {
        const mapped = mapRpcError(res.error)
        if (mapped.action === ERROR_ACTIONS.STALE) { onConflict(); return }
        setFormError(mapped.message)
        return
      }
      onDone(kind)
    } catch (err) {
      // Convert any thrown/rejected error through the SAME safe mapper — never a raw
      // technical error. Stale handling is preserved if a STALE token arrives here.
      const mapped = mapRpcError(err)
      if (mapped.action === ERROR_ACTIONS.STALE) { onConflict(); return }
      setFormError(mapped.message)
    } finally {
      setBusy(false) // busy ALWAYS returns to false, success or failure
    }
  }

  const serviceName = (row && (row.service_label || row.service_code)) || 'this service'
  const title = isApprove ? 'Approve service' : 'Deactivate service'
  const confirmLabel = isApprove ? 'Approve' : 'Deactivate'
  const confirmStyle = isApprove ? W.primary : W.danger

  return (
    <ModalShell
      title={title}
      subtitle={serviceName}
      onClose={onClose}
      busy={busy}
      footer={(
        <>
          <button type="button" style={W.ghost} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" style={{ ...confirmStyle, opacity: busy ? 0.6 : 1 }} onClick={handleConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      )}
    >
      {formError && <div style={W.formErr} role="alert">{formError}</div>}

      {isApprove ? (
        <>
          <div style={W.note}>
            Approving brings <strong>{serviceName}</strong> into force. The record keeps its start date
            ({safeDate(row && row.effective_from)}); the approval actor and time are recorded automatically.
          </div>
          {errors.effectiveFrom && <div style={W.formErr} role="alert">{errors.effectiveFrom}</div>}
          {errors.effectiveTo && <div style={W.formErr} role="alert">{errors.effectiveTo}</div>}
          {errors.status && <div style={W.formErr} role="alert">{errors.status}</div>}
        </>
      ) : (
        <>
          <div style={W.note}>
            Deactivating stops <strong>{serviceName}</strong>. It moves to history and cannot be edited;
            use “Start again” later to create a new draft. Approval evidence is preserved.
          </div>
          <Field label="Effective to (stop date)" htmlFor="p5-sa-eff-to" required error={errors.effectiveTo}
            hint="Not earlier than the start date.">
            <input id="p5-sa-eff-to" type="date" style={W.input} value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)} />
          </Field>
          {errors.status && <div style={W.formErr} role="alert">{errors.status}</div>}
        </>
      )}
    </ModalShell>
  )
}
