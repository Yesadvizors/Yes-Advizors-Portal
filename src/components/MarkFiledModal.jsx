import { useState } from 'react'
import { supabase } from '../supabase'

const BUCKET = 'secure-docs'

// ─── MARK AS FILED MODAL ────────────────────────────────────────
// Used for GST, ITR, TDS, ROC — any compliance record
// Simultaneously:
//   1. Updates the tracker row (status, ARN, filing date etc.)
//   2. Uploads return copy to Supabase storage
//   3. Creates document record linked to compliance
// ────────────────────────────────────────────────────────────────

export default function MarkFiledModal({ record, trackerType, client, user, onClose, onSaved }) {
  const [arn, setArn]             = useState(record.arn || '')
  const [filingDate, setFilingDate] = useState(record.filing_date || new Date().toISOString().split('T')[0])
  const [lateFee, setLateFee]     = useState(record.late_fee || '')
  const [remarks, setRemarks]     = useState(record.remarks || '')
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState('')

  // Build a human readable label for this record
  const recordLabel = [
    record.return_type || record.form_type || record.form_name || record.audit_type || record.compliance_name || 'Return',
    record.period || record.period_label || record.quarter || record.fy_label || ''
  ].filter(Boolean).join(' — ')

  const trackerTable = {
    gst:         'gst_tracker',
    income_tax:  'income_tax_tracker',
    tds:         'tds_tracker',
    roc:         'roc_tracker',
    llp:         'llp_tracker',
    audit:       'audit_tracker',
    trust:       'trust_ngo_tracker',
  }[trackerType] || 'gst_tracker'

  async function handleSave() {
    if (!filingDate) { setErr('Filing date is required'); return }
    setUploading(true)
    setErr('')

    try {
      // ── STEP 1: Upload document if file selected ──────────────
      let filePath = null
      let fileName = null
      let fileSize = null
      let mimeType = null

      if (file) {
        const safeName = file.name.replace(/[^\w.\-]+/g, '_')
        const compliancePeriod = recordLabel.replace(/[^\w\-]+/g, '_')
        filePath = `${client.client_id}/compliance/${trackerType}/${compliancePeriod}_${Date.now()}_${safeName}`

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { contentType: file.type })

        if (upErr) { setErr('Upload failed: ' + upErr.message); setUploading(false); return }

        fileName = file.name
        fileSize = file.size
        mimeType = file.type
      }

      // ── STEP 2: Update compliance tracker row ─────────────────
      const trackerUpdate = {
        return_filed:    true,
        filing_date:     filingDate,
        status:          'Filed',
        workflow_stage:  'Filed',
        filed_date:      new Date().toISOString(),
        remarks:         remarks || null,
        updated_at:      new Date().toISOString(),
      }

      // Add tracker-specific fields
      if (trackerType === 'gst') {
        trackerUpdate.arn      = arn || null
        trackerUpdate.late_fee = lateFee ? Number(lateFee) : 0
      }
      if (trackerType === 'tds') {
        trackerUpdate.token_number = arn || null
      }
      if (trackerType === 'income_tax') {
        trackerUpdate.acknowledgement_number = arn || null
      }
      if (trackerType === 'roc' || trackerType === 'llp') {
        trackerUpdate.srn = arn || null
      }

      const { error: trkErr } = await supabase
        .from(trackerTable)
        .update(trackerUpdate)
        .eq('id', record.id)

      if (trkErr) {
        if (filePath) await supabase.storage.from(BUCKET).remove([filePath])
        setErr('Could not update tracker: ' + trkErr.message)
        setUploading(false)
        return
      }

      // ── STEP 3: Save document record (if file uploaded) ───────
      if (filePath) {
        const { error: docErr } = await supabase.from('documents').insert({
          client_id:         client.client_id,
          client_name:       client.name,
          doc_type:          recordLabel,    // e.g. 'GSTR-1 — April 2024'
          doc_name:          fileName,
          file_path:         filePath,
          file_size:         fileSize,
          mime_type:         mimeType,
          uploaded_by:       user?.name || 'System',
          scope:             'compliance',
          compliance_type:   trackerType,
          compliance_ref_id: record.id,
          compliance_period: recordLabel,
          fy_label:          record.fy_label,
        })

        if (docErr) {
          // Tracker updated successfully, document save failed — log but don't block
          console.error('Document record save failed:', docErr.message)
        }
      }

      setUploading(false)
      onSaved()

    } catch (e) {
      setErr('Unexpected error: ' + e.message)
      setUploading(false)
    }
  }

  const inp = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff',
    fontFamily: 'inherit', boxSizing: 'border-box'
  }
  const lbl = {
    fontSize: 11, fontWeight: 600, color: 'var(--gray)',
    textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, padding: 24, fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif" }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>✅ Mark as Filed</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{recordLabel}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{client.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Filing Date */}
          <div>
            <label style={lbl}>Filing Date *</label>
            <input type="date" value={filingDate} onChange={e => setFilingDate(e.target.value)} style={inp} />
          </div>

          {/* ARN / Token / Ack / SRN based on tracker type */}
          <div>
            <label style={lbl}>
              {trackerType === 'gst'        ? 'ARN Number' :
               trackerType === 'tds'        ? 'Token / PRN Number' :
               trackerType === 'income_tax' ? 'Acknowledgement Number' :
               trackerType === 'roc' || trackerType === 'llp' ? 'SRN Number' :
               'Reference Number'}
            </label>
            <input value={arn} onChange={e => setArn(e.target.value)}
              placeholder={
                trackerType === 'gst'        ? 'e.g. AA2404012345678' :
                trackerType === 'tds'        ? 'e.g. PRNABC12345' :
                trackerType === 'income_tax' ? 'e.g. 987654321098765' :
                'Enter reference number'
              }
              style={inp} />
          </div>

          {/* Late fee — GST only */}
          {trackerType === 'gst' && (
            <div>
              <label style={lbl}>Late Fee (₹) — if any</label>
              <input type="number" value={lateFee} onChange={e => setLateFee(e.target.value)}
                placeholder="0" style={inp} />
            </div>
          )}

          {/* Remarks */}
          <div>
            <label style={lbl}>Remarks</label>
            <input value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder="Optional notes" style={inp} />
          </div>

          {/* Upload return copy */}
          <div>
            <label style={lbl}>Upload Return Copy (Optional)</label>
            <div style={{ border: '1.5px dashed #D1D5DB', borderRadius: 10, padding: '14px 16px', background: '#FAFAFA', textAlign: 'center' }}>
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                  <span style={{ fontSize: 20 }}>{file.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{(file.size / 1024).toFixed(0)} KB</div>
                  </div>
                  <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 16, marginLeft: 4 }}>✕</button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>📎 Attach return acknowledgement, filing confirmation or receipt</div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dkgreen)', background: 'var(--ltgreen)', border: '1px solid var(--green2)', padding: '6px 16px', borderRadius: 8, cursor: 'pointer' }}>
                    Choose File
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>PDF, JPG, PNG · max 10 MB</div>
                </>
              )}
            </div>
            {file && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#059669', fontWeight: 600 }}>
                ✓ File will be saved to Documents under "{recordLabel}"
              </div>
            )}
          </div>

          {err && <div style={{ fontSize: 12, color: '#DC2626', background: '#FEE2E2', padding: '8px 12px', borderRadius: 8 }}>{err}</div>}

          {/* Info box */}
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#166534' }}>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>✓ What will happen when you save:</div>
            <div>1. Compliance status → <strong>Filed</strong></div>
            {arn && <div>2. {trackerType === 'gst' ? 'ARN' : trackerType === 'tds' ? 'PRN' : trackerType === 'income_tax' ? 'Ack No.' : 'SRN'} saved to tracker</div>}
            {file && <div>{arn ? '3' : '2'}. Return copy uploaded to Documents</div>}
          </div>

        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={uploading} style={{
            padding: '9px 22px', fontSize: 13, fontWeight: 700,
            background: uploading ? '#9CA3AF' : 'var(--dkgreen)',
            color: '#fff', border: 'none', borderRadius: 8, cursor: uploading ? 'not-allowed' : 'pointer'
          }}>
            {uploading ? '⏳ Saving...' : '✅ Mark as Filed'}
          </button>
        </div>

      </div>
    </div>
  )
}
