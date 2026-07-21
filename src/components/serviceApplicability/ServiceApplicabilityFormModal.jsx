import { useMemo, useState } from 'react'
import { ModalShell, Field, W } from './ServiceApplicabilityModalShell'
import {
  FREQUENCIES,
  validateCreate,
  validateEdit,
  buildCreatePayload,
  buildUpdatePayload,
} from '../../lib/serviceApplicability'
import { FREQUENCY_LABELS } from './ServiceApplicabilityStates'
import { createServiceApplicability, updateServiceApplicability } from '../../services/serviceApplicabilityWrites'
import { mapRpcError, ERROR_ACTIONS } from '../../lib/serviceApplicabilityErrors'

/*
 * P5 CP-5 — create / edit Draft form modal (the ONLY create/edit write UI).
 *
 * Boundary: writes go through the CP-2 service wrappers only (create/update); there is
 * NO direct Supabase / .rpc / .from here. Client-side validation reuses the CP-1 pure
 * validators, and the RPC arg shapes come from the CP-1 builders — the DB RPCs (and the
 * PG-1 OTHER-notes + optimistic-lock guards) remain the authority.
 *
 *  - create: service is chosen from availableServiceCodes (codes with no LIVE row);
 *  - edit  : service is IMMUTABLE (shown read-only) and only Draft rows are editable;
 *  - effective_to is NEVER exposed here (set only by the Deactivate modal);
 *  - notes are required when the service is OTHER (enforced by validators + PG-1);
 *  - on STALE_ROW_VERSION the modal does not silently retry: it calls onConflict so the
 *    section closes it, refreshes authoritative data, and requires the user to reopen.
 *
 * @param {{
 *   mode: ('create'|'edit'), clientId: string, row?: any, seed?: any,
 *   catalogue: any[], availableServiceCodes: string[], teamMembers: any[], registrations: any[],
 *   onClose: Function, onSaved: (kind:'create'|'edit') => void, onConflict: Function
 * }} props
 */
export default function ServiceApplicabilityFormModal({
  mode, clientId, row, seed, catalogue = [], availableServiceCodes = [],
  teamMembers = [], registrations = [], onClose, onSaved, onConflict,
}) {
  const isEdit = mode === 'edit'
  const init = isEdit ? fromRow(row) : fromSeed(seed)
  const [form, setForm] = useState(init)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // Active catalogue rows available for a NEW row (create). Edit uses the row's own code.
  const createOptions = useMemo(
    () => availableServiceCodes
      .map((code) => catalogue.find((c) => c && c.code === code) || { code, label: code })
      .filter(Boolean),
    [availableServiceCodes, catalogue],
  )

  const selectedCode = isEdit ? (row && row.service_code) : form.serviceCode
  const selectedCat = catalogue.find((c) => c && c.code === selectedCode) || null
  const requiresRegistration = selectedCat ? selectedCat.requires_registration === true : false
  const notesRequired = selectedCode === 'OTHER'

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setFormError(null)

    let validation
    let payload
    let write
    let kind
    if (isEdit) {
      const input = {
        id: row && row.id,
        rowVersion: row && row.row_version,
        serviceCode: row && row.service_code,
        effectiveFrom: form.effectiveFrom,
        frequency: form.frequency,
        linkedRegistrationId: form.linkedRegistrationId,
        ownerTeamId: form.ownerTeamId,
        notes: form.notes,
      }
      validation = validateEdit(input, catalogue, row)
      payload = buildUpdatePayload(input)
      write = updateServiceApplicability
      kind = 'edit'
    } else {
      const input = {
        clientId,
        serviceCode: form.serviceCode,
        effectiveFrom: form.effectiveFrom,
        frequency: form.frequency,
        linkedRegistrationId: form.linkedRegistrationId,
        ownerTeamId: form.ownerTeamId,
        notes: form.notes,
      }
      validation = validateCreate(input, catalogue)
      payload = buildCreatePayload(input)
      write = createServiceApplicability
      kind = 'create'
    }

    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }
    setErrors({})
    setBusy(true)
    try {
      const res = await write(payload)
      if (res && res.error) {
        const mapped = mapRpcError(res.error)
        if (mapped.action === ERROR_ACTIONS.STALE) { onConflict(); return }
        // surface a field-level hint for the OTHER-notes rule; otherwise a form-level error
        if (mapped.code === 'OTHER_NOTES_REQUIRED') setErrors((prev) => ({ ...prev, notes: mapped.message }))
        setFormError(mapped.message)
        return
      }
      onSaved(kind)
    } catch (err) {
      // Any thrown/rejected error is converted through the SAME safe mapper — never a raw
      // technical error is shown. Stale handling is preserved if a STALE token arrives here.
      const mapped = mapRpcError(err)
      if (mapped.action === ERROR_ACTIONS.STALE) { onConflict(); return }
      setFormError(mapped.message)
    } finally {
      setBusy(false) // busy ALWAYS returns to false, success or failure
    }
  }

  const title = isEdit ? 'Edit draft service' : 'Add service (Draft)'
  const subtitle = isEdit && row ? (row.service_label || row.service_code) : undefined

  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      busy={busy}
      footer={(
        <>
          <button type="button" style={W.ghost} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="p5-sa-form" style={{ ...W.primary, opacity: busy ? 0.6 : 1 }} disabled={busy}>
            {busy ? 'Saving…' : (isEdit ? 'Save changes' : 'Create draft')}
          </button>
        </>
      )}
    >
      <form id="p5-sa-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {formError && <div style={W.formErr} role="alert">{formError}</div>}

        <Field label="Service" htmlFor="p5-sa-service" required error={errors.serviceCode}>
          {isEdit ? (
            <div id="p5-sa-service" style={W.fixed}>{(row && (row.service_label || row.service_code)) || '—'}</div>
          ) : (
            <select id="p5-sa-service" style={W.input} value={form.serviceCode} onChange={set('serviceCode')}>
              <option value="">Select a service…</option>
              {createOptions.map((c) => (
                <option key={c.code} value={c.code}>{c.label || c.code}</option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Effective from" htmlFor="p5-sa-eff-from" error={errors.effectiveFrom}
          hint="Optional while Draft; required before approval.">
          <input id="p5-sa-eff-from" type="date" style={W.input} value={form.effectiveFrom} onChange={set('effectiveFrom')} />
        </Field>

        <Field label="Frequency" htmlFor="p5-sa-freq" error={errors.frequency}>
          <select id="p5-sa-freq" style={W.input} value={form.frequency} onChange={set('frequency')}>
            <option value="">Not set</option>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>{FREQUENCY_LABELS[f] || f}</option>
            ))}
          </select>
        </Field>

        <Field label="Linked registration" htmlFor="p5-sa-reg" required={requiresRegistration}
          error={errors.linkedRegistrationId}
          hint={requiresRegistration ? 'This service requires a registration.' : 'Optional.'}>
          <select id="p5-sa-reg" style={W.input} value={form.linkedRegistrationId} onChange={set('linkedRegistrationId')}>
            <option value="">None</option>
            {registrations.map((r) => (
              <option key={r.id} value={r.id}>
                {[r.reg_type, r.reg_number].filter(Boolean).join(' · ') || r.id}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Owner" htmlFor="p5-sa-owner" error={errors.ownerTeamId} hint="Optional — an active team member.">
          <select id="p5-sa-owner" style={W.input} value={form.ownerTeamId} onChange={set('ownerTeamId')}>
            <option value="">Unassigned</option>
            {teamMembers.map((t) => (
              <option key={t.id} value={t.id}>{t.name || t.id}</option>
            ))}
          </select>
        </Field>

        <Field label="Notes" htmlFor="p5-sa-notes" required={notesRequired} error={errors.notes}
          hint={notesRequired ? "Required for the 'Other' service." : 'Optional.'}>
          <textarea id="p5-sa-notes" style={W.textarea} value={form.notes} onChange={set('notes')}
            placeholder={notesRequired ? 'Describe this service…' : ''} />
        </Field>
      </form>
    </ModalShell>
  )
}

const asStr = (v) => (v === null || v === undefined ? '' : String(v))

function fromRow(row) {
  const r = row || {}
  return {
    serviceCode: asStr(r.service_code),
    effectiveFrom: asStr(r.effective_from),
    frequency: asStr(r.frequency),
    linkedRegistrationId: asStr(r.linked_registration_id),
    ownerTeamId: asStr(r.owner_team_id),
    notes: asStr(r.notes),
  }
}

function fromSeed(seed) {
  const s = seed || {}
  return {
    serviceCode: asStr(s.serviceCode),
    effectiveFrom: asStr(s.effectiveFrom),
    frequency: asStr(s.frequency),
    linkedRegistrationId: asStr(s.linkedRegistrationId),
    ownerTeamId: asStr(s.ownerTeamId),
    notes: asStr(s.notes),
  }
}
