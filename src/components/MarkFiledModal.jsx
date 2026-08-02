import { useState } from 'react'
import { supabase } from '../supabase'
import { Modal, Field, Input } from './ui'

const BUCKET = 'secure-docs'

// ── File picker component (presentational) ───────────────────────
function FilePicker({ label, hint, file, onChange }) {
  return (
    <div>
      <label className="ds-label" style={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <div style={{ border: '1.5px dashed var(--ds-border-strong)', borderRadius: 'var(--ds-r)', padding: '12px 14px', background: 'var(--ds-surface-2)', textAlign: 'center' }}>
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <span style={{ fontSize: 18 }}>{file.type === 'application/pdf' ? '📄' : '🖼️'}</span>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <div className="ds-truncate" style={{ fontSize: 'var(--ds-fs-sm)', fontWeight: 600, color: 'var(--ds-text)', maxWidth: 220 }}>{file.name}</div>
              <div style={{ fontSize: 'var(--ds-fs-2xs)', color: 'var(--ds-text-subtle)' }}>{(file.size / 1024).toFixed(0)} KB</div>
            </div>
            <button onClick={() => onChange(null)} aria-label="Remove file" className="ds-btn ds-btn-ghost ds-btn-sm" style={{ padding: '2px 7px', flexShrink: 0 }}>✕</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 'var(--ds-fs-sm)', color: 'var(--ds-text-subtle)', marginBottom: 6 }}>{hint}</div>
            <label className="ds-btn ds-btn-secondary ds-btn-sm" style={{ cursor: 'pointer' }}>
              Choose File
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => onChange(e.target.files[0] || null)} style={{ display: 'none' }} />
            </label>
            <div style={{ fontSize: 'var(--ds-fs-2xs)', color: 'var(--ds-text-faint)', marginTop: 5 }}>PDF, JPG, PNG · max 10 MB</div>
          </>
        )}
      </div>
      {file && <div style={{ marginTop: 4, fontSize: 'var(--ds-fs-2xs)', color: 'var(--ds-success)', fontWeight: 600 }}>✓ Will be saved to Documents</div>}
    </div>
  )
}

// ── Main modal ───────────────────────────────────────────────────
export default function MarkFiledModal({ record, trackerType, client, user, onClose, onSaved }) {
  const [arn, setArn]               = useState(record.arn || record.token_number || record.acknowledgement_number || record.srn || '')
  const [filingDate, setFilingDate] = useState(record.filing_date || new Date().toISOString().split('T')[0])
  const [lateFee, setLateFee]       = useState(record.late_fee || '')
  const [remarks, setRemarks]       = useState(record.remarks || '')
  const [fileForm, setFileForm]     = useState(null)
  const [fileReceipt, setFileReceipt] = useState(null)
  const [uploading, setUploading]   = useState(false)
  const [err, setErr]               = useState('')

  const isROC = ['roc', 'llp'].includes(trackerType)
  const isTDS = trackerType === 'tds'
  const isGST = trackerType === 'gst'
  const isITR = trackerType === 'income_tax'

  const trackerTable = {
    gst: 'gst_tracker', income_tax: 'income_tax_tracker',
    tds: 'tds_tracker', roc: 'roc_tracker',
    llp: 'llp_tracker', audit: 'audit_tracker', trust: 'trust_ngo_tracker',
  }[trackerType] || 'gst_tracker'

  const arnLabel =
    isGST ? 'ARN Number' :
    isTDS ? 'Token / PRN Number' :
    isITR ? 'Acknowledgement Number' :
    isROC ? 'SRN Number' : 'Reference Number'

  const arnPlaceholder =
    isGST ? 'e.g. AA2404012345678' :
    isTDS ? 'e.g. PRNABC12345' :
    isITR ? 'e.g. 987654321098765' :
    isROC ? 'e.g. S12345678' : 'Enter reference number'

  // Form name for ROC — e.g. "AOC-4", "MGT-7A"
  const formName = record.form_name || record.return_type || record.form_type || 'Form'

  const recordLabel = [
    record.return_type || record.form_type || record.form_name || record.audit_type || 'Return',
    record.period || record.period_label || record.quarter || record.fy_label || ''
  ].filter(Boolean).join(' — ')

  // Upload labels — ROC shows form-specific names
  const slot1Label = isROC
    ? `${formName} — Filed Form Copy`
    : isGST ? 'Filed Return Copy'
    : isTDS ? 'TDS Return Copy'
    : isITR ? 'ITR Acknowledgement'
    : 'Filed Copy'

  const slot1Hint = isROC
    ? `Attach the signed and submitted ${formName} form`
    : 'Attach the filed return document'

  const slot2Label = isROC
    ? `${formName} — MCA Challan & SRN Receipt`
    : isGST ? 'ARN Acknowledgement'
    : isTDS ? 'PRN / Token Receipt'
    : isITR ? 'ITR V / Verification'
    : 'Acknowledgement Receipt'

  const slot2Hint = isROC
    ? `Attach the MCA payment challan or SRN confirmation for ${formName}`
    : 'Attach the government acknowledgement'

  async function uploadFile(file, suffix) {
    if (!file) return null
    if (file.size > 10 * 1024 * 1024) { setErr('File must be under 10 MB'); return false }
    const safeName = file.name.replace(/[^\w.\-]+/g, '_')
    const period   = recordLabel.replace(/[^\w\-]+/g, '_')
    const path     = `${client.client_id}/compliance/${trackerType}/${period}_${suffix}_${Date.now()}_${safeName}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
    if (error) { setErr('Upload failed: ' + error.message); return false }
    return path
  }

  async function saveDoc(filePath, file, label) {
    if (!filePath || !file) return
    await supabase.from('documents').insert({
      client_id: client.client_id, client_name: client.name,
      doc_type: `${recordLabel} — ${label}`,
      doc_name: file.name, file_path: filePath,
      file_size: file.size, mime_type: file.type,
      uploaded_by: user?.name || 'System',
      scope: 'compliance', compliance_type: trackerType,
      compliance_ref_id: record.id,
      compliance_period: recordLabel, fy_label: record.fy_label,
    })
  }

  async function handleSave() {
    if (!filingDate) { setErr('Filing date is required'); return }
    setUploading(true); setErr('')
    try {
      const formPath    = await uploadFile(fileForm,    'form')
      if (formPath === false) { setUploading(false); return }
      const receiptPath = await uploadFile(fileReceipt, 'challan')
      if (receiptPath === false) { setUploading(false); return }

      // Update tracker
      const update = {
        return_filed: true, filing_date: filingDate,
        status: 'Filed', workflow_stage: 'Filed',
        filed_date: new Date().toISOString(),
        remarks: remarks || null, updated_at: new Date().toISOString(),
      }
      if (isGST) { update.arn = arn || null; update.late_fee = lateFee ? Number(lateFee) : 0 }
      if (isTDS) { update.token_number = arn || null }
      if (isITR) { update.acknowledgement_number = arn || null }
      if (isROC || trackerType === 'llp') {
        update.srn = arn || null
        update.documents_pending = false
        update.form_prepared = true
        update.form_reviewed = true
        update.return_filed = true
      }

      const { error: trkErr } = await supabase.from(trackerTable).update(update).eq('id', record.id)
      if (trkErr) {
        if (formPath)    await supabase.storage.from(BUCKET).remove([formPath])
        if (receiptPath) await supabase.storage.from(BUCKET).remove([receiptPath])
        setErr('Could not update tracker: ' + trkErr.message)
        setUploading(false); return
      }

      await saveDoc(formPath,    fileForm,    slot1Label)
      await saveDoc(receiptPath, fileReceipt, slot2Label)

      setUploading(false); onSaved()
    } catch (e) {
      setErr('Unexpected error: ' + e.message)
      setUploading(false)
    }
  }

  const filesAttached = [fileForm, fileReceipt].filter(Boolean).length

  return (
    <Modal
      title="✅ Mark as Filed"
      subtitle={`${recordLabel} · ${client.name}`}
      onClose={onClose}
      footer={<>
        <button onClick={onClose} className="ds-btn ds-btn-ghost">Cancel</button>
        <button onClick={handleSave} disabled={uploading} className="ds-btn ds-btn-primary">
          {uploading ? '⏳ Saving...' : '✅ Mark as Filed'}
        </button>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Field label="Filing Date *">
          <Input type="date" value={filingDate} max={new Date().toISOString().split('T')[0]} onChange={e => setFilingDate(e.target.value)} />
        </Field>

        <Field label={arnLabel}>
          <Input value={arn} onChange={e => setArn(e.target.value)} placeholder={arnPlaceholder} />
        </Field>

        {isGST && (
          <Field label="Late Fee (₹) — if any">
            <Input type="number" value={lateFee} onChange={e => setLateFee(e.target.value)} placeholder="0" />
          </Field>
        )}

        <Field label="Remarks">
          <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional notes" />
        </Field>

        {/* Two upload slots */}
        <div style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-r)', padding: '14px 16px', marginBottom: 4 }}>
          <div style={{ fontSize: 'var(--ds-fs-2xs)', fontWeight: 700, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
            Attach Documents
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FilePicker label={slot1Label} hint={slot1Hint} file={fileForm} onChange={setFileForm} />
            <FilePicker label={slot2Label} hint={slot2Hint} file={fileReceipt} onChange={setFileReceipt} />
          </div>
        </div>

        {/* Info box */}
        <div style={{ background: 'var(--ds-success-bg)', border: '1px solid var(--ds-success-bd)', borderRadius: 'var(--ds-r-sm)', padding: '10px 14px', fontSize: 'var(--ds-fs-xs)', color: 'var(--ds-success)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ What will happen when you save:</div>
          <div>1. Compliance status → <strong>Filed</strong></div>
          {arn && <div>2. {arnLabel} saved to tracker</div>}
          {filesAttached > 0 && <div>{arn ? '3' : '2'}. {filesAttached} file{filesAttached > 1 ? 's' : ''} saved to Documents</div>}
        </div>

        {err && <div role="alert" style={{ fontSize: 'var(--ds-fs-sm)', color: 'var(--ds-danger)', background: 'var(--ds-danger-bg)', border: '1px solid var(--ds-danger-bd)', padding: '8px 12px', borderRadius: 'var(--ds-r-sm)' }}>{err}</div>}
      </div>
    </Modal>
  )
}
