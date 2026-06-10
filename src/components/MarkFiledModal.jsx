import { useState } from 'react'
import { supabase } from '../supabase'
import { useEscapeKey } from '../useEscapeKey'

const BUCKET = 'secure-docs'

// ── File picker component ────────────────────────────────────────
function FilePicker({ label, hint, file, onChange }) {
  const inp = { fontSize:13, outline:'none', background:'#fff', fontFamily:'inherit', boxSizing:'border-box' }
  return (
    <div>
      <label style={{ fontSize:11, fontWeight:600, color:'var(--gray)', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:4 }}>
        {label}
      </label>
      <div style={{ border:'1.5px dashed #D1D5DB', borderRadius:10, padding:'12px 14px', background:'#FAFAFA', textAlign:'center' }}>
        {file ? (
          <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center' }}>
            <span style={{ fontSize:18 }}>{file.type==='application/pdf'?'📄':'🖼️'}</span>
            <div style={{ textAlign:'left', minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#111827', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:220 }}>{file.name}</div>
              <div style={{ fontSize:10, color:'#6B7280' }}>{(file.size/1024).toFixed(0)} KB</div>
            </div>
            <button onClick={() => onChange(null)} style={{ background:'none', border:'none', color:'#9CA3AF', cursor:'pointer', fontSize:16, flexShrink:0 }}>✕</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize:12, color:'#6B7280', marginBottom:6 }}>{hint}</div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--dkgreen)', background:'var(--ltgreen)', border:'1px solid var(--green2)', padding:'5px 14px', borderRadius:8, cursor:'pointer' }}>
              Choose File
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => onChange(e.target.files[0]||null)} style={{ display:'none' }} />
            </label>
            <div style={{ fontSize:10, color:'#9CA3AF', marginTop:5 }}>PDF, JPG, PNG · max 10 MB</div>
          </>
        )}
      </div>
      {file && <div style={{ marginTop:4, fontSize:10, color:'#059669', fontWeight:600 }}>✓ Will be saved to Documents</div>}
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

  useEscapeKey(onClose)

  const isROC = ['roc','llp'].includes(trackerType)
  const isTDS = trackerType === 'tds'
  const isGST = trackerType === 'gst'
  const isITR = trackerType === 'income_tax'

  const trackerTable = {
    gst:'gst_tracker', income_tax:'income_tax_tracker',
    tds:'tds_tracker', roc:'roc_tracker',
    llp:'llp_tracker', audit:'audit_tracker', trust:'trust_ngo_tracker',
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
    if (file.size > 10*1024*1024) { setErr('File must be under 10 MB'); return false }
    const safeName = file.name.replace(/[^\w.\-]+/g,'_')
    const period   = recordLabel.replace(/[^\w\-]+/g,'_')
    const path     = `${client.client_id}/compliance/${trackerType}/${period}_${suffix}_${Date.now()}_${safeName}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType:file.type })
    if (error) { setErr('Upload failed: '+error.message); return false }
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
      if (formPath===false) { setUploading(false); return }
      const receiptPath = await uploadFile(fileReceipt, 'challan')
      if (receiptPath===false) { setUploading(false); return }

      // Update tracker
      const update = {
        return_filed:true, filing_date:filingDate,
        status:'Filed'::text, workflow_stage:'Filed',
        filed_date:new Date().toISOString(),
        remarks:remarks||null, updated_at:new Date().toISOString(),
      }
      if (isGST) { update.arn=arn||null; update.late_fee=lateFee?Number(lateFee):0 }
      if (isTDS) { update.token_number=arn||null }
      if (isITR) { update.acknowledgement_number=arn||null }
      if (isROC||trackerType==='llp') {
        update.srn=arn||null
        update.documents_pending=false
        update.form_prepared=true
        update.form_reviewed=true
        update.return_filed=true
      }

      const { error:trkErr } = await supabase.from(trackerTable).update(update).eq('id',record.id)
      if (trkErr) {
        if (formPath)    await supabase.storage.from(BUCKET).remove([formPath])
        if (receiptPath) await supabase.storage.from(BUCKET).remove([receiptPath])
        setErr('Could not update tracker: '+trkErr.message)
        setUploading(false); return
      }

      await saveDoc(formPath,    fileForm,    slot1Label)
      await saveDoc(receiptPath, fileReceipt, slot2Label)

      setUploading(false); onSaved()
    } catch(e) {
      setErr('Unexpected error: '+e.message)
      setUploading(false)
    }
  }

  const inp = { width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, outline:'none', background:'#fff', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:600, color:'var(--gray)', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:4 }
  const filesAttached = [fileForm,fileReceipt].filter(Boolean).length

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:500, padding:24, fontFamily:"'Plus Jakarta Sans',-apple-system,sans-serif", maxHeight:'90vh', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>✅ Mark as Filed</div>
            <div style={{ fontSize:12, color:'#6B7280', marginTop:3 }}>{recordLabel}</div>
            <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>{client.name}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#9CA3AF' }}>✕</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Filing Date */}
          <div>
            <label style={lbl}>Filing Date *</label>
            <input type="date" value={filingDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setFilingDate(e.target.value)} style={inp} />
          </div>

          {/* Reference number */}
          <div>
            <label style={lbl}>{arnLabel}</label>
            <input value={arn} onChange={e => setArn(e.target.value)} placeholder={arnPlaceholder} style={inp} />
          </div>

          {/* Late fee — GST only */}
          {isGST && (
            <div>
              <label style={lbl}>Late Fee (₹) — if any</label>
              <input type="number" value={lateFee} onChange={e => setLateFee(e.target.value)} placeholder="0" style={inp} />
            </div>
          )}

          {/* Remarks */}
          <div>
            <label style={lbl}>Remarks</label>
            <input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional notes" style={inp} />
          </div>

          {/* Two upload slots */}
          <div style={{ background:'#F8FAF9', border:'1px solid #E5E7EB', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:.8, marginBottom:12 }}>
              Attach Documents
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <FilePicker label={slot1Label} hint={slot1Hint} file={fileForm} onChange={setFileForm} />
              <FilePicker label={slot2Label} hint={slot2Hint} file={fileReceipt} onChange={setFileReceipt} />
            </div>
          </div>

          {/* Info box */}
          <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'10px 14px', fontSize:11, color:'#166534' }}>
            <div style={{ fontWeight:700, marginBottom:4 }}>✓ What will happen when you save:</div>
            <div>1. Compliance status → <strong>Filed</strong></div>
            {arn && <div>2. {arnLabel} saved to tracker</div>}
            {filesAttached > 0 && <div>{arn?'3':'2'}. {filesAttached} file{filesAttached>1?'s':''} saved to Documents</div>}
          </div>

          {err && <div style={{ fontSize:12, color:'#DC2626', background:'#FEE2E2', padding:'8px 12px', borderRadius:8 }}>{err}</div>}
        </div>

        {/* Buttons */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ padding:'9px 20px', fontSize:13, border:'1px solid var(--border)', borderRadius:8, background:'#fff', cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={uploading} style={{
            padding:'9px 22px', fontSize:13, fontWeight:700,
            background:uploading?'#9CA3AF':'var(--dkgreen)',
            color:'#fff', border:'none', borderRadius:8, cursor:uploading?'not-allowed':'pointer'
          }}>
            {uploading ? '⏳ Saving...' : '✅ Mark as Filed'}
          </button>
        </div>

      </div>
    </div>
  )
}
