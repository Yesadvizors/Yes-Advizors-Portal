import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { documentRole, canUploadDocument } from '../lib/documentAccess'
import { sha256Hex, suggestDocType, findByContentHash } from '../lib/documentReadiness'

const BUCKET = 'secure-docs'
const OK_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
const MAX_BYTES = 15 * 1024 * 1024

const DOC_TYPES = [
  'PAN Card', 'Aadhaar Card', 'Photo', 'GST Certificate', 'Incorporation Certificate',
  'MOA', 'AOA', 'Partnership Deed', 'Bank Statement', 'Cancelled Cheque', 'Address Proof',
  'Board Resolution', 'DSC', 'Udyam Certificate', 'IEC Certificate', 'Audited Balance Sheet',
  'Computation of Income', 'Tax Audit Report (TAR)', 'ITR Form', 'ITR Acknowledgement',
  'Balance Sheet', 'Profit & Loss', 'Audit Report', 'GSTR-1', 'GSTR-3B', 'Other',
]
const DOC_CATEGORIES = ['kyc', 'financial', 'compliance', 'statutory', 'correspondence', 'other']

let _seq = 0
const nextId = () => `f${Date.now()}_${_seq++}`

// One useful bulk uploader: many files → classify once → upload once. Canonical documents
// only (secure-docs + documents). No competing repository. Duplicate-aware via content_hash.
export default function BulkUploadModal({ clients = [], fixedClientId = null, user, onClose, onDone }) {
  const canUpload = canUploadDocument(documentRole(user))
  const [clientId, setClientId] = useState(fixedClientId || '')
  const [fyLabel, setFyLabel] = useState('')
  const [category, setCategory] = useState('')
  const [scope, setScope] = useState('client')
  const [items, setItems] = useState([]) // {id,file,docType,period,status,error,hash,dupId,action}
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !busy) { e.stopImmediatePropagation(); onClose() } }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [busy, onClose])

  if (!canUpload) {
    return (
      <Shell onClose={onClose} title="Upload Documents">
        <div style={{ fontSize: 13, color: '#6B7280', padding: '10px 0' }}>You do not have permission to upload documents.</div>
      </Shell>
    )
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || [])
    const rows = files.map(file => ({
      id: nextId(), file, docType: suggestDocType(file.name) || 'Other', period: '',
      status: 'hashing', error: '', hash: null, dupId: null, action: null,
    }))
    setItems(prev => [...prev, ...rows])
    // hash + dedup check in the background per file
    for (const row of rows) {
      const hash = await sha256Hex(row.file)
      let dupId = null
      if (hash) {
        const { data } = await findByContentHash({ clientId: clientId || fixedClientId, contentHash: hash })
        if (data) dupId = data.id
      }
      setItems(prev => prev.map(it => it.id === row.id
        ? { ...it, hash, dupId, status: dupId ? 'duplicate' : 'ready' } : it))
    }
  }

  const patch = (id, p) => setItems(prev => prev.map(it => it.id === id ? { ...it, ...p } : it))
  const remove = (id) => setItems(prev => prev.filter(it => it.id !== id))

  async function uploadOne(it) {
    if (it.status === 'done') return true
    if (it.dupId && it.action === 'skip') { patch(it.id, { status: 'done' }); return true }
    if (it.dupId && !it.action) { patch(it.id, { status: 'duplicate', error: 'Choose an action for this duplicate' }); return false }
    if (!OK_TYPES.includes(it.file.type)) { patch(it.id, { status: 'error', error: 'Only PDF, JPG, PNG allowed' }); return false }
    if (it.file.size > MAX_BYTES) { patch(it.id, { status: 'error', error: 'File exceeds 15 MB' }); return false }
    patch(it.id, { status: 'uploading', error: '' })
    const client = clients.find(c => c.client_id === clientId)
    const safeName = (it.file.name || 'file').replace(/[^\w.\-]+/g, '_')
    const folder = scope === 'director' ? 'director' : (scope === 'compliance' ? 'compliance' : 'client')
    const path = `${clientId}/${folder}/${Date.now()}_${safeName}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, it.file, { contentType: it.file.type })
    if (upErr) { console.error('[BulkUpload] storage upload failed:', upErr); patch(it.id, { status: 'error', error: 'Upload failed' }); return false }
    const { error: insErr } = await supabase.from('documents').insert({
      client_id: clientId, client_name: client?.name || clientId,
      doc_type: it.docType, doc_name: it.file.name, file_path: path,
      file_size: it.file.size, mime_type: it.file.type, uploaded_by: user?.name || 'System',
      scope, fy_label: fyLabel || null, doc_category: category || null,
      compliance_period: it.period || null, content_hash: it.hash || null,
    })
    if (insErr) {
      console.error('[BulkUpload] record insert failed:', insErr)
      await supabase.storage.from(BUCKET).remove([path]) // no orphan object on a failed record
      patch(it.id, { status: 'error', error: 'Could not save record' }); return false
    }
    patch(it.id, { status: 'done', error: '' })
    return true
  }

  async function uploadAll() {
    if (!clientId) return
    setBusy(true)
    // Only (re)upload files not already done — a retry never repeats a successful file.
    const pending = items.filter(it => it.status !== 'done')
    let anySaved = false
    for (const it of pending) { const ok = await uploadOne(it); anySaved = anySaved || ok }
    setBusy(false)
    if (anySaved) onDone?.()
  }

  const dupCount = items.filter(it => it.status === 'duplicate' && !it.action).length
  const doneCount = items.filter(it => it.status === 'done').length
  const failed = items.filter(it => it.status === 'error')
  const canStart = clientId && items.length > 0 && !busy && dupCount === 0

  return (
    <Shell onClose={busy ? undefined : onClose} title="Upload Documents" wide>
      {/* Batch metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <Field label="Client *">
          <select className="bu-inp" value={clientId} disabled={!!fixedClientId} onChange={e => setClientId(e.target.value)}>
            <option value="">— Select client —</option>
            {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_id} — {c.name}</option>)}
          </select>
        </Field>
        <Field label="Financial Year (applies to all)">
          <input className="bu-inp" placeholder="e.g. 2026-27" value={fyLabel} onChange={e => setFyLabel(e.target.value)} />
        </Field>
        <Field label="Category (applies to all)">
          <select className="bu-inp" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">—</option>{DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Scope (applies to all)">
          <select className="bu-inp" value={scope} onChange={e => setScope(e.target.value)}>
            <option value="client">Company</option><option value="director">Director</option><option value="compliance">Compliance</option>
          </select>
        </Field>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        style={{ border: `1.5px dashed ${drag ? '#0A3D2C' : '#CBD5CF'}`, borderRadius: 12, padding: '18px 14px', textAlign: 'center', background: drag ? '#F0FBF5' : '#FAFCFB', cursor: 'pointer', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0A3D2C' }}>＋ Drag & drop files here, or click to select</div>
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>PDF, JPG, PNG · up to 15 MB each · multiple files supported</div>
        <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
          onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
      </div>

      {/* Queue */}
      {items.length > 0 && (
        <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #E2E5E1', borderRadius: 10, marginBottom: 12 }}>
          {items.map(it => (
            <div key={it.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #F0F2EF' }}>
              <StatusDot status={it.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#13241D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={it.file.name}>{it.file.name}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                  <select className="bu-mini" value={it.docType} onChange={e => patch(it.id, { docType: e.target.value })} disabled={busy}>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input className="bu-mini" style={{ width: 90 }} placeholder="Period" value={it.period} onChange={e => patch(it.id, { period: e.target.value })} disabled={busy} />
                  {it.status === 'duplicate' && (
                    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 10.5, color: '#B45309', fontWeight: 700 }}>⚠ Duplicate</span>
                      <button className="bu-chip" onClick={() => patch(it.id, { action: 'skip' })} title="Use the existing document, don't re-upload">Use Existing</button>
                      <button className="bu-chip" onClick={() => patch(it.id, { action: 'new', status: 'ready' })} title="Upload anyway as a new document">Upload as New</button>
                    </span>
                  )}
                  {it.action === 'skip' && <span style={{ fontSize: 10.5, color: '#166534' }}>Will use existing</span>}
                  {it.error && it.status === 'error' && <span style={{ fontSize: 10.5, color: '#DC2626' }}>{it.error}</span>}
                </div>
              </div>
              {it.status !== 'done' && !busy && <button className="bu-x" onClick={() => remove(it.id)} title="Remove">✕</button>}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11.5, color: '#6B7280' }}>
          {items.length > 0 && `${doneCount}/${items.length} uploaded${failed.length ? ` · ${failed.length} failed` : ''}${dupCount ? ` · ${dupCount} duplicate(s) need a choice` : ''}`}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="bu-btn ghost" onClick={onClose} disabled={busy}>Close</button>
          {failed.length > 0 && !busy && <button className="bu-btn ghost" onClick={uploadAll}>Retry failed</button>}
          <button className="bu-btn" onClick={uploadAll} disabled={!canStart}>{busy ? 'Uploading…' : `Upload ${items.filter(i => i.status !== 'done').length || ''}`.trim()}</button>
        </div>
      </div>

      <style>{`
        .bu-inp{width:100%;padding:8px 10px;border:1px solid #D6DBD6;border-radius:8px;font-size:12.5px;box-sizing:border-box;font-family:inherit;background:#fff}
        .bu-mini{padding:4px 7px;border:1px solid #D6DBD6;border-radius:6px;font-size:11px;font-family:inherit;background:#fff}
        .bu-btn{padding:8px 16px;border:none;border-radius:8px;background:#0A3D2C;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer}
        .bu-btn:disabled{background:#9CA3AF;cursor:not-allowed}
        .bu-btn.ghost{background:#fff;color:#374151;border:1px solid #D6DBD6}
        .bu-chip{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:6px;border:1px solid #D6DBD6;background:#fff;cursor:pointer;font-family:inherit}
        .bu-x{background:none;border:none;color:#9CA3AF;cursor:pointer;font-size:14px}
      `}</style>
    </Shell>
  )
}

function Field({ label, children }) {
  return <label style={{ display: 'block' }}><span style={{ fontSize: 10.5, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 4 }}>{label}</span>{children}</label>
}
function StatusDot({ status }) {
  const map = { hashing: ['#F59E0B', '…'], ready: ['#3B82F6', '•'], duplicate: ['#B45309', '⚠'], uploading: ['#6366F1', '↑'], done: ['#16A34A', '✓'], error: ['#DC2626', '✕'], queued: ['#9CA3AF', '•'] }
  const [color, ch] = map[status] || map.queued
  return <span style={{ width: 18, textAlign: 'center', color, fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{ch}</span>
}
function Shell({ title, children, onClose, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 5200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: wide ? 640 : 460, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          {onClose && <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #D6DBD6', background: '#fff', cursor: 'pointer' }}>✕</button>}
        </div>
        {children}
      </div>
    </div>
  )
}
