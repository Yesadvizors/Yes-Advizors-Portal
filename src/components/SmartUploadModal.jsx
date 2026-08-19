import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../supabase'
import { documentRole, canUploadDocument } from '../lib/documentAccess'
import { fetchReadiness, sha256Hex, findByContentHash } from '../lib/documentReadiness'
import { serviceCategoryLabel } from '../lib/documentChecklist'
import { currentFy } from '../lib/financialYear'
import { requiresUdin, requiresTaxAuditApplicable, clientServiceCategories } from '../lib/smartUploadMatch'
import { classifyAndMatch, hasUsableText, needsOcrFallback, classifyContent } from '../lib/documentContent'
import { extractPdfText } from '../lib/pdfText'
import { ocrFile } from '../lib/ocr'
import { mapWithLimit } from '../lib/concurrency'

const BUCKET = 'secure-docs'
const OK_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
const MAX_BYTES = 15 * 1024 * 1024

let _seq = 0
const nextId = () => `su${Date.now()}_${_seq++}`

const CONFIDENCE = {
  high: { label: 'High', color: '#166534', bg: '#DCFCE7' },
  medium: { label: 'Needs confirmation', color: '#92722A', bg: '#FEF9C3' },
  low: { label: 'Low — pick requirement', color: '#B45309', bg: '#FEF3C7' },
  unmatched: { label: 'No match', color: '#B91C1C', bg: '#FEE2E2' },
}
const SOURCE_LABEL = { content: 'Detected from PDF content', ocr: 'Detected from OCR', filename: 'Detected from filename', none: 'Not detected' }
const UPLOAD_TONE = {
  done: ['#16A34A', '✓ Uploaded'], error: ['#DC2626', '✕ Failed'],
  uploading: ['#6366F1', '↑ Uploading…'], skipped: ['#B45309', '⚠ Needs action'],
}

// Central Smart Upload — select a client ONCE, drop many files, auto-match each to an EXISTING
// requirement (v_requirement_document_readiness), confirm/correct, then upload+link via the
// governed RPCs. It is an ADDITIONAL fast entry layer — the row-wise Upload / Manage / bulk
// flows are unchanged. No new document store, no compliance-status write, no OCR/AI.
export default function SmartUploadModal({ clients = [], user, onClose, onDone }) {
  const canUpload = canUploadDocument(documentRole(user))
  const [clientId, setClientId] = useState('')
  const [reqs, setReqs] = useState([])
  const [reqLoading, setReqLoading] = useState(false)
  const [loadError, setLoadError] = useState(false) // requirement-read failure — NEVER shown as "no matches"
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)
  const reqSeq = useRef(0) // stale-response guard: a late fetch for a previous client must not overwrite

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !busy) { e.stopImmediatePropagation(); onClose() } }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [busy, onClose])

  const client = useMemo(() => clients.find(c => c.client_id === clientId) || null, [clients, clientId])
  const serviceCats = useMemo(() => clientServiceCategories(reqs), [reqs])

  // Load the SELECTED client's requirements once (batch), then match every file in memory (no
  // per-file query). A read failure sets loadError — distinct from "no requirement matched".
  async function selectClient(id) {
    const seq = ++reqSeq.current
    setClientId(id); setItems([]); setReqs([]); setLoadError(false)
    if (!id) return
    setReqLoading(true)
    const { data, error } = await fetchReadiness({ clientId: id })
    if (seq !== reqSeq.current) return // a newer client selection superseded this response — drop it
    if (error) { setLoadError(true); setReqs([]) } else setReqs(data || [])
    setReqLoading(false)
  }

  // Content-FIRST classify + match one queued row against the current requirements (pure).
  // Uses already-extracted contentText; document content overrides the filename.
  function classifyRow(r, requirements) {
    const m = classifyAndMatch({ filename: r.file.name, contentText: r.contentText, hasText: r.hasText }, requirements)
    // Auto rows always follow the best match (which may only be known AFTER content extraction);
    // a user's explicit pick/skip (userChose) is preserved.
    const chosen = r.userChose ? r.chosenId : (m.best ? m.best.requirement_ref_id : '')
    return { ...r, match: m, chosenId: chosen }
  }
  const rematch = (rows, requirements) => rows.map(r => classifyRow(r, requirements))
  // Stop OCR-ing further pages once a strong signature is already present (cheaper + faster).
  const ocrEnough = (t) => hasUsableText(t) && !!classifyContent(t)

  async function addFiles(fileList) {
    const files = Array.from(fileList || [])
    const rows = files.map(file => ({
      // chosenId null = "not chosen yet" → defaults to the best auto-match; '' = user chose to skip.
      id: nextId(), file, chosenId: '', userChose: false, udin: '', udinDate: '', taApplicable: null, remarks: '',
      hash: null, dupId: null, uploadStatus: '', uploadError: '',
      contentText: '', hasText: false, reading: file.type === 'application/pdf', ocrPending: false, ocrRunning: false,
    }))
    setItems(prev => rematch([...prev, ...rows], reqs))

    // Phase 1 — local PDF text-layer extraction + hash. Files that yield no usable text (scanned
    // PDFs) and images are queued for the OCR fallback (Phase 2); the rest classify immediately.
    const ocrJobs = []
    for (const row of rows) {
      let contentText = '', hasText = false
      if (row.file.type === 'application/pdf') { contentText = await extractPdfText(row.file); hasText = hasUsableText(contentText) }
      const hash = await sha256Hex(row.file)
      let dupId = null
      if (hash) { const { data } = await findByContentHash({ clientId, contentHash: hash }); if (data) dupId = data.id }
      if (!hasText && needsOcrFallback({ hasText, mimeType: row.file.type })) {
        setItems(prev => prev.map(it => it.id === row.id ? { ...it, hash, dupId, reading: false, ocrPending: true } : it))
        ocrJobs.push({ id: row.id, file: row.file })
      } else {
        setItems(prev => prev.map(it => it.id === row.id ? classifyRow({ ...it, contentText, hasText, textSource: 'pdf', reading: false, hash, dupId }, reqs) : it))
      }
    }

    // Phase 2 — bounded local OCR (≤2 concurrent) for scanned PDFs / images. Runs the SAME
    // content classifier on the OCR text (provenance 'ocr'). One failed OCR never blocks others.
    if (ocrJobs.length) {
      await mapWithLimit(ocrJobs, 2, async (job) => {
        setItems(prev => prev.map(it => it.id === job.id ? { ...it, ocrRunning: true } : it))
        const ocrText = await ocrFile(job.file, { maxPages: 5, enough: ocrEnough })
        const hasText = hasUsableText(ocrText)
        setItems(prev => prev.map(it => it.id === job.id
          ? classifyRow({ ...it, contentText: ocrText, hasText, textSource: 'ocr', ocrRunning: false, ocrPending: false }, reqs) : it))
      })
    }
  }

  const patch = (id, p) => setItems(prev => prev.map(it => it.id === id ? { ...it, ...p } : it))
  const remove = (id) => setItems(prev => prev.filter(it => it.id !== id))

  const reqById = useMemo(() => Object.fromEntries(reqs.map(r => [r.requirement_ref_id, r])), [reqs])
  const chosenReq = (it) => reqById[it.chosenId] || null
  const chosenDocType = (it) => { const r = chosenReq(it); return r ? r.doc_type : (it.match && it.match.docType) }

  // Upload one file and LINK it to its chosen requirement via the governed RPCs. Mirrors the
  // existing FinancialUploadModal / ManageDocumentsDrawer flow exactly (secure-docs + documents
  // + document_link/replace; financials also repoints financials_tracker + carries UDIN). Never
  // writes a compliance filing status. Returns true only on full success.
  async function uploadAndLink(it) {
    const req = chosenReq(it)
    if (!req) { patch(it.id, { uploadStatus: 'skipped', uploadError: 'No requirement selected' }); return false }
    if (!OK_TYPES.includes(it.file.type)) { patch(it.id, { uploadStatus: 'error', uploadError: 'Only PDF, JPG, PNG allowed' }); return false }
    if (it.file.size > MAX_BYTES) { patch(it.id, { uploadStatus: 'error', uploadError: 'File exceeds 15 MB' }); return false }
    const refType = req.requirement_ref_type
    const dt = req.doc_type
    if (requiresUdin(dt) && !it.udin) { patch(it.id, { uploadStatus: 'skipped', uploadError: 'UDIN required for ' + dt }); return false }

    patch(it.id, { uploadStatus: 'uploading', uploadError: '' })
    const safeName = (it.file.name || 'file').replace(/[^\w.\-]+/g, '_')
    const path = `${clientId}/compliance/${refType}_${(req.fy_label || 'na')}_${Date.now()}_${safeName}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, it.file, { contentType: it.file.type })
    if (upErr) { console.error('[SmartUpload] storage upload failed:', upErr); patch(it.id, { uploadStatus: 'error', uploadError: 'Upload failed' }); return false }

    const { data: docData, error: insErr } = await supabase.from('documents').insert({
      client_id: clientId, client_name: client?.name || clientId,
      doc_type: dt, doc_name: it.file.name, file_path: path,
      file_size: it.file.size, mime_type: it.file.type, uploaded_by: user?.name || 'System',
      scope: 'compliance', compliance_type: refType, compliance_ref_id: req.requirement_ref_id,
      compliance_period: req.period || `${dt} — ${req.fy_label || ''}`.trim(),
      fy_label: req.fy_label || null, content_hash: it.hash || null,
    }).select().single()
    if (insErr) { console.error('[SmartUpload] record insert failed:', insErr); await supabase.storage.from(BUCKET).remove([path]); patch(it.id, { uploadStatus: 'error', uploadError: 'Could not save record' }); return false }
    const docId = docData.id

    // Link (or replace an existing current document) — the ONLY mutation path.
    if (req.is_available === true) {
      const { error: repErr } = await supabase.rpc('document_replace', {
        p_requirement_ref_type: refType, p_requirement_ref_id: req.requirement_ref_id,
        p_new_document_id: docId, p_sync_financials: refType === 'financials',
      })
      if (repErr) { console.error('[SmartUpload] replace failed:', repErr); patch(it.id, { uploadStatus: 'error', uploadError: 'Could not replace document' }); return false }
    } else {
      const { error: linkErr } = await supabase.rpc('document_link', {
        p_requirement_ref_type: refType, p_requirement_ref_id: req.requirement_ref_id,
        p_document_id: docId, p_make_current: true,
      })
      if (linkErr) { console.error('[SmartUpload] link failed:', linkErr); patch(it.id, { uploadStatus: 'error', uploadError: 'Could not link document' }); return false }
    }

    // Financials: repoint the tracker + carry UDIN / Tax-Audit-Applicable (existing behaviour).
    // This is document/UDIN metadata — NOT a compliance filing status transition.
    if (refType === 'financials') {
      const upd = {
        document_id: docId, status: 'Uploaded', uploaded_by: user?.name || 'System',
        udin_number: it.udin || null, udin_date: it.udinDate || null,
        tax_audit_applicable: requiresTaxAuditApplicable(dt) ? it.taApplicable : null,
        remarks: it.remarks || null, updated_at: new Date().toISOString(),
      }
      const { error: tErr } = await supabase.from('financials_tracker').update(upd).eq('id', req.requirement_ref_id)
      if (tErr) { console.error('[SmartUpload] financials tracker update failed:', tErr); patch(it.id, { uploadStatus: 'error', uploadError: 'Linked, but tracker update failed' }); return false }
    }

    patch(it.id, { uploadStatus: 'done', uploadError: '' })
    return true
  }

  async function confirmUpload() {
    if (!clientId || busy) return
    setBusy(true)
    let anySaved = false
    // Deterministic, per-file. A later failure NEVER discards an earlier success.
    for (const it of items) {
      if (it.uploadStatus === 'done') { anySaved = true; continue }
      if (!it.chosenId) { patch(it.id, { uploadStatus: 'skipped', uploadError: 'No requirement matched — pick one or use row-wise upload' }); continue }
      const latest = items.find(x => x.id === it.id) || it
      const ok = await uploadAndLink({ ...latest })
      anySaved = anySaved || ok
    }
    setBusy(false)
    if (anySaved) onDone?.()
  }

  const matchable = items.filter(it => it.chosenId).length
  const done = items.filter(it => it.uploadStatus === 'done').length
  const canConfirm = clientId && matchable > 0 && !busy && !loadError

  if (!canUpload) {
    return <Shell onClose={onClose} title="Smart Upload"><div style={{ fontSize: 13, color: '#6B7280', padding: '10px 0' }}>You do not have permission to upload documents.</div></Shell>
  }

  return (
    <Shell onClose={busy ? undefined : onClose} title="Smart Upload — auto-match to requirements" wide>
      {/* STEP 1 — client */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 12, marginBottom: 12, alignItems: 'end' }}>
        <Field label="Client *">
          <select className="su-inp" value={clientId} onChange={e => selectClient(e.target.value)} disabled={busy}>
            <option value="">— Select client —</option>
            {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_id} — {c.name}</option>)}
          </select>
        </Field>
        {client && (
          <div style={{ fontSize: 11.5, color: '#4B5563', display: 'flex', gap: 14, flexWrap: 'wrap', paddingBottom: 8 }}>
            <span><strong>{client.client_type || 'Entity —'}</strong></span>
            <span>FY {currentFy()}</span>
            <span>Services: {reqLoading ? '…' : (serviceCats.length ? serviceCats.map(serviceCategoryLabel).join(', ') : 'none with requirements')}</span>
          </div>
        )}
      </div>

      {loadError && (
        <div role="alert" style={{ background: '#FEE2E2', color: '#B91C1C', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
          Could not load this client's requirements. <button className="su-chip" onClick={() => selectClient(clientId)} style={{ marginLeft: 8 }}>Retry</button>
        </div>
      )}

      {/* STEP 2 — files */}
      {clientId && !loadError && (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          style={{ border: `1.5px dashed ${drag ? '#0A3D2C' : '#CBD5CF'}`, borderRadius: 12, padding: '16px 14px', textAlign: 'center', background: drag ? '#F0FBF5' : '#FAFCFB', cursor: 'pointer', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0A3D2C' }}>＋ Drag & drop documents, or click to select</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>PDF, JPG, PNG · up to 15 MB each · e.g. GSTR-1, GSTR-3B, Audited FS, TAR, ITR</div>
          <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
        </div>
      )}

      {/* STEP 3 — match grid */}
      {items.length > 0 && (
        <div style={{ border: '1px solid #E2E5E1', borderRadius: 10, marginBottom: 12, maxHeight: 340, overflowY: 'auto' }}>
          {items.map(it => {
            const m = it.match || {}
            const isDup = m.status === 'duplicate'
            const ocring = it.ocrRunning || it.ocrPending
            const bs = (it.reading || ocring) ? { color: '#3730A3', bg: '#EEF2FF' }
              : m.status === 'needs_ocr' ? { color: '#6D28D9', bg: '#EDE9FE' }
                : (CONFIDENCE[isDup ? 'high' : m.confidence] || CONFIDENCE.unmatched)
            const badgeText = it.reading ? 'Reading…' : ocring ? 'OCR…' : m.status === 'needs_ocr' ? 'OCR failed — pick manually' : isDup ? 'Replace existing' : bs.label
            const dt = chosenDocType(it)
            const showUdin = requiresUdin(dt)
            const req = chosenReq(it)
            const [utone, ulabel] = UPLOAD_TONE[it.uploadStatus] || [null, null]
            return (
              <div key={it.id} style={{ padding: '9px 11px', borderBottom: '1px solid #F0F2EF' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#13241D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={it.file.name}>{it.file.name}</div>
                    <div style={{ fontSize: 10.5, color: '#374151', marginTop: 1 }}>
                      {it.reading ? 'Reading document…'
                        : ocring ? 'Running OCR (local)…'
                          : m.docType ? <>{m.docType}{m.fy ? ` · FY ${m.fy}` : ''}{m.period?.label ? ` · ${m.period.label}` : ''}</>
                            : 'Could not identify — choose a requirement'}
                    </div>
                    {!it.reading && !ocring && m.source && m.source !== 'none' && (
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>
                        {SOURCE_LABEL[m.source]}{m.fySource === 'content' ? ' · FY from content' : ''}
                      </div>
                    )}
                    {m.typeConflict && <div style={{ fontSize: 10, color: '#B45309', marginTop: 2 }}>⚠ Filename suggests “{m.filenameDocType}” but content indicates “{m.contentDocType}”. Document content used.</div>}
                    {m.fyConflict && <div style={{ fontSize: 10, color: '#B45309', marginTop: 2 }}>⚠ Filename FY differs from the document’s FY ({m.fy}). Document FY used.</div>}
                    {m.periodConflict && !m.fyConflict && <div style={{ fontSize: 10, color: '#B45309', marginTop: 2 }}>⚠ Filename period differs from the document ({m.period?.label}). Document period used.</div>}
                    {!it.reading && !ocring && m.status === 'needs_ocr' && <div style={{ fontSize: 10, color: '#6D28D9', marginTop: 2 }}>Unable to identify automatically (scanned/unreadable) — please choose the requirement.</div>}
                  </div>
                  <span className="su-badge" style={{ color: bs.color, background: bs.bg }}>{badgeText}</span>
                  {ulabel && <span style={{ fontSize: 10.5, fontWeight: 700, color: utone }}>{ulabel}</span>}
                  {it.uploadStatus !== 'done' && !busy && <button className="su-x" onClick={() => remove(it.id)} title="Remove">✕</button>}
                </div>
                {/* requirement selector (only the client's requirements — never fabricated) */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                  <select className="su-mini" style={{ minWidth: 260 }} value={it.chosenId} disabled={busy}
                    onChange={e => patch(it.id, { chosenId: e.target.value, userChose: true })}>
                    <option value="">— No requirement (skip / use row-wise) —</option>
                    {reqs.map(r => (
                      <option key={r.requirement_ref_id} value={r.requirement_ref_id}>
                        {serviceCategoryLabel(r.requirement_ref_type)} · {r.requirement_label}{r.fy_label ? ` · FY ${r.fy_label}` : ''}{r.is_available ? ' (has current doc → replace)' : ''}
                      </option>
                    ))}
                  </select>
                  {req?.is_available && <span style={{ fontSize: 10.5, color: '#B45309' }}>Existing: {req.current_document_name || 'current document'} — will replace</span>}
                </div>
                {/* UDIN fields for Audited BS / TAR */}
                {showUdin && it.chosenId && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                    <input className="su-mini" style={{ width: 150 }} placeholder="UDIN Number" value={it.udin} disabled={busy} onChange={e => patch(it.id, { udin: e.target.value })} />
                    <input className="su-mini" type="date" style={{ width: 140 }} value={it.udinDate} disabled={busy} onChange={e => patch(it.id, { udinDate: e.target.value })} title="UDIN Date" />
                    {requiresTaxAuditApplicable(dt) && (
                      <select className="su-mini" value={it.taApplicable === null ? '' : String(it.taApplicable)} disabled={busy}
                        onChange={e => patch(it.id, { taApplicable: e.target.value === '' ? null : e.target.value === 'true' })} title="Tax Audit Applicable?">
                        <option value="">Tax Audit Applicable?</option><option value="true">Yes</option><option value="false">No</option>
                      </select>
                    )}
                  </div>
                )}
                {it.uploadError && <div style={{ fontSize: 10.5, color: it.uploadStatus === 'error' ? '#DC2626' : '#B45309', marginTop: 4 }}>{it.uploadError}</div>}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11.5, color: '#6B7280' }}>
          {items.length > 0 && `${matchable}/${items.length} mapped${done ? ` · ${done} uploaded` : ''}`}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="su-btn ghost" onClick={onClose} disabled={busy}>Close</button>
          <button className="su-btn" onClick={confirmUpload} disabled={!canConfirm}>{busy ? 'Uploading…' : `Confirm & Upload ${matchable || ''}`.trim()}</button>
        </div>
      </div>

      <style>{`
        .su-inp{width:100%;padding:8px 10px;border:1px solid #D6DBD6;border-radius:8px;font-size:12.5px;box-sizing:border-box;font-family:inherit;background:#fff}
        .su-mini{padding:4px 7px;border:1px solid #D6DBD6;border-radius:6px;font-size:11px;font-family:inherit;background:#fff}
        .su-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap}
        .su-btn{padding:8px 16px;border:none;border-radius:8px;background:#0A3D2C;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer}
        .su-btn:disabled{background:#9CA3AF;cursor:not-allowed}
        .su-btn.ghost{background:#fff;color:#374151;border:1px solid #D6DBD6}
        .su-chip{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:6px;border:1px solid #D6DBD6;background:#fff;cursor:pointer;font-family:inherit}
        .su-x{background:none;border:none;color:#9CA3AF;cursor:pointer;font-size:14px}
      `}</style>
    </Shell>
  )
}

function Field({ label, children }) {
  return <label style={{ display: 'block' }}><span style={{ fontSize: 10.5, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 4 }}>{label}</span>{children}</label>
}
function Shell({ title, children, onClose, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 5300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: wide ? 720 : 460, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          {onClose && <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #D6DBD6', background: '#fff', cursor: 'pointer' }}>✕</button>}
        </div>
        {children}
      </div>
    </div>
  )
}
