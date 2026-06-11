import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'

const BUCKET = 'secure-docs'
const legacyBucket = d => (d.file_url ? 'client-docs' : BUCKET)

function sizeKB(b) { return b ? (b < 1024*1024 ? (b/1024).toFixed(0)+' KB' : (b/1024/1024).toFixed(1)+' MB') : '—' }
function fileIcon(mime) {
  if (mime === 'application/pdf') return '📄'
  if (mime && mime.startsWith('image')) return '🖼️'
  return '📎'
}

const SCOPE_BADGE = {
  client:     { label: 'Company',    bg: '#DBEAFE', text: '#1D4ED8' },
  director:   { label: 'Director',   bg: '#F3E8FF', text: '#7C3AED' },
  compliance: { label: 'Compliance', bg: '#D1FAE5', text: '#065F46' },
}

const DOC_TYPES = [
  'PAN Card', 'Aadhaar Card', 'Photo', 'GST Certificate', 'Incorporation Certificate',
  'MOA', 'AOA', 'Partnership Deed', 'Bank Statement', 'Cancelled Cheque',
  'Address Proof', 'Board Resolution', 'DSC', 'Udyam Certificate', 'IEC Certificate',
  'Balance Sheet', 'Profit & Loss', 'Audit Report', 'Tax Audit Report', 'Director Report',
  'PF Certificate', 'ESI Certificate', 'Shop & Establishment Certificate', 'Other'
]

const css = `
@keyframes dvSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}
.dh-wrap{font-family:'Plus Jakarta Sans',-apple-system,sans-serif}
.dh-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:18px}
.dh-search{flex:1;min-width:220px;padding:9px 14px;border:1px solid #D6DBD6;border-radius:9px;font-size:13px;outline:none;font-family:inherit}
.dh-search:focus{border-color:#0A3D2C}
.dh-sel{padding:9px 12px;border:1px solid #D6DBD6;border-radius:9px;font-size:12.5px;background:#fff;cursor:pointer;font-family:inherit;outline:none}
.dh-up{padding:9px 18px;background:#0A3D2C;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
.dh-up:hover{background:#0c4d37}
.dh-stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.dh-stat{background:#F8FAF9;border:1px solid #E2E5E1;border-radius:10px;padding:10px 16px;min-width:90px}
.dh-stat-n{font-size:20px;font-weight:700;color:#13241D}
.dh-stat-l{font-size:11px;color:#6B7280;margin-top:2px}
.dh-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #E2E5E1;border-radius:12px;overflow:hidden}
.dh-table thead th{background:#F4F6F3;font-size:10.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#6B7280;text-align:left;padding:11px 14px;border-bottom:1px solid #E2E5E1}
.dh-table tbody td{padding:11px 14px;border-bottom:1px solid #F0F2EF;font-size:12.5px;color:#13241D;vertical-align:middle}
.dh-table tbody tr:hover{background:#FAFCFB}
.dh-table tbody tr:last-child td{border-bottom:none}
.dh-badge{display:inline-block;font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:99px}
.dh-act{display:inline-flex;gap:6px}
.dh-ibtn{width:30px;height:30px;border-radius:7px;border:1px solid #D6DBD6;background:#fff;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;justify-content:center}
.dh-ibtn:hover{background:#F3F4F0}
.dh-ibtn.del:hover{background:#FEE2E2;border-color:#FCA5A5}
.dh-empty{text-align:center;padding:50px 20px;color:#9CA3AF}
.dv-panel{position:fixed;right:0;top:0;bottom:0;width:52%;min-width:340px;max-width:720px;background:#fff;box-shadow:-8px 0 30px rgba(0,0,0,0.18);z-index:5000;display:flex;flex-direction:column;animation:dvSlide .25s ease}
@media(max-width:640px){.dv-panel{width:100%;min-width:unset}}
.dv-head{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #ECEEE9}
.dv-body{flex:1;overflow:hidden;background:#F3F4F0;display:flex}
.dv-close{width:30px;height:30px;border-radius:8px;border:1px solid #D6DBD6;background:#fff;cursor:pointer}
.dv-close:hover{background:#FEE2E2;border-color:#FCA5A5;color:#DC2626}
.dh-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:4500;display:flex;align-items:center;justify-content:center;padding:16px}
.dh-modal{background:#fff;border-radius:16px;width:100%;max-width:460px;padding:22px}
.dh-fld{margin-bottom:13px}
.dh-lbl{font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px}
.dh-inp{width:100%;padding:9px 12px;border:1px solid #D6DBD6;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box;font-family:inherit}
`

export default function DocumentsHub({ user }) {
  const [docs, setDocs] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fClient, setFClient] = useState('')
  const [fType, setFType] = useState('')
  const [fScope, setFScope] = useState('')
  const [fFY, setFFY] = useState('')
  const [viewer, setViewer] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [docsRes, clientsRes] = await Promise.all([
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('client_id, name').order('client_id')
    ])
    setDocs(docsRes.data || [])
    setClients(clientsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && viewer) { e.stopImmediatePropagation(); setViewer(null) } }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [viewer])

  const fyOptions = useMemo(() => [...new Set(docs.map(d => d.fy_label).filter(Boolean))].sort().reverse(), [docs])
  const typeOptions = useMemo(() => [...new Set(docs.map(d => d.doc_type).filter(Boolean))].sort(), [docs])

  const filtered = useMemo(() => {
    return docs.filter(d => {
      if (fClient && d.client_id !== fClient) return false
      if (fType && d.doc_type !== fType) return false
      if (fScope && (d.scope || 'client') !== fScope) return false
      if (fFY && d.fy_label !== fFY) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${d.client_name||''} ${d.doc_type||''} ${d.doc_name||''} ${d.director_name||''} ${d.compliance_period||''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [docs, fClient, fType, fScope, fFY, search])

  async function viewDoc(d) {
    setErr('')
    let url
    if (d.file_url) url = d.file_url
    else {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 600)
      if (error || !data) { setErr('Could not open file.'); return }
      url = data.signedUrl
    }
    setViewer({ url, doc: d, isImage: d.mime_type && d.mime_type.startsWith('image/') })
  }

  async function downloadDoc(d) {
    let url
    if (d.file_url) url = d.file_url
    else {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 600, { download: true })
      url = data?.signedUrl
    }
    if (url) window.open(url, '_blank')
  }

  async function deleteDoc(d) {
    if (!confirm(`Delete "${d.doc_type}" for ${d.client_name}?`)) return
    if (d.file_path) await supabase.storage.from(legacyBucket(d)).remove([d.file_path])
    await supabase.from('documents').delete().eq('id', d.id)
    if (viewer?.doc?.id === d.id) setViewer(null)
    load()
  }

  const scopeOf = d => d.scope || 'client'

  return (
    <div className="dh-wrap">
      <style>{css}</style>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#13241D' }}>Document Management</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>All documents across all clients — onboarding, compliance & manual uploads in one place</div>
      </div>

      <div className="dh-stats">
        <div className="dh-stat"><div className="dh-stat-n">{docs.length}</div><div className="dh-stat-l">Total Docs</div></div>
        <div className="dh-stat"><div className="dh-stat-n">{docs.filter(d=>scopeOf(d)==='client').length}</div><div className="dh-stat-l">Company</div></div>
        <div className="dh-stat"><div className="dh-stat-n">{docs.filter(d=>scopeOf(d)==='director').length}</div><div className="dh-stat-l">Director</div></div>
        <div className="dh-stat"><div className="dh-stat-n">{docs.filter(d=>scopeOf(d)==='compliance').length}</div><div className="dh-stat-l">Compliance</div></div>
        <div className="dh-stat"><div className="dh-stat-n">{new Set(docs.map(d=>d.client_id)).size}</div><div className="dh-stat-l">Clients</div></div>
      </div>

      <div className="dh-toolbar">
        <input className="dh-search" placeholder="🔍 Search by client, type, name…" value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="dh-sel" value={fClient} onChange={e=>setFClient(e.target.value)}>
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_id} — {c.name}</option>)}
        </select>
        <select className="dh-sel" value={fType} onChange={e=>setFType(e.target.value)}>
          <option value="">All Types</option>
          {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="dh-sel" value={fScope} onChange={e=>setFScope(e.target.value)}>
          <option value="">All Scopes</option>
          <option value="client">Company</option>
          <option value="director">Director</option>
          <option value="compliance">Compliance</option>
        </select>
        <select className="dh-sel" value={fFY} onChange={e=>setFFY(e.target.value)}>
          <option value="">All FY</option>
          {fyOptions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button className="dh-up" onClick={()=>setShowUpload(true)}>+ Upload</button>
      </div>

      {err && <div style={{ background:'#FEE2E2', color:'#DC2626', padding:'8px 14px', borderRadius:8, fontSize:12, marginBottom:12 }}>{err}</div>}

      {loading ? (
        <div className="dh-empty">Loading documents…</div>
      ) : filtered.length === 0 ? (
        <div className="dh-empty">
          <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 600, color:'#6B7280' }}>No documents found</div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>{search||fClient||fType||fScope||fFY ? 'Try adjusting filters' : 'Upload your first document'}</div>
        </div>
      ) : (
        <table className="dh-table">
          <thead>
            <tr>
              <th>Client</th><th>Document Type</th><th>Scope</th><th>Period / FY</th>
              <th>Uploaded By</th><th>Date</th><th>Size</th><th style={{textAlign:'right'}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => {
              const sb = SCOPE_BADGE[scopeOf(d)] || SCOPE_BADGE.client
              return (
                <tr key={d.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{d.client_name || d.client_id}</div>
                    <div style={{ fontSize: 10.5, color: '#9CA3AF' }}>{d.client_id}</div>
                  </td>
                  <td>
                    <span style={{ marginRight: 6 }}>{fileIcon(d.mime_type)}</span>
                    {d.doc_type}
                    {d.director_name && <div style={{ fontSize: 10.5, color:'#7C3AED' }}>{d.director_name}</div>}
                  </td>
                  <td><span className="dh-badge" style={{ background: sb.bg, color: sb.text }}>{sb.label}</span></td>
                  <td style={{ fontSize: 11.5, color:'#6B7280' }}>{d.compliance_period || d.fy_label || '—'}</td>
                  <td style={{ fontSize: 11.5, color:'#6B7280' }}>{d.uploaded_by || '—'}</td>
                  <td style={{ fontSize: 11.5, color:'#6B7280' }}>{fmtDate(d.created_at)}</td>
                  <td style={{ fontSize: 11.5, color:'#6B7280' }}>{sizeKB(d.file_size)}</td>
                  <td style={{ textAlign:'right' }}>
                    <span className="dh-act">
                      <button className="dh-ibtn" title="View" onClick={()=>viewDoc(d)}>👁</button>
                      <button className="dh-ibtn" title="Download" onClick={()=>downloadDoc(d)}>⬇</button>
                      <button className="dh-ibtn del" title="Delete" onClick={()=>deleteDoc(d)}>🗑</button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 10, fontSize: 11.5, color:'#9CA3AF' }}>Showing {filtered.length} of {docs.length} documents</div>

      {showUpload && <UploadModal clients={clients} user={user} onClose={()=>setShowUpload(false)} onDone={()=>{ setShowUpload(false); load() }} />}

      {viewer && (
        <div className="dv-panel">
          <div className="dv-head">
            <span style={{ fontSize: 18 }}>{fileIcon(viewer.doc.mime_type)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{viewer.doc.doc_type}</div>
              <div style={{ fontSize: 11, color:'#6B7280' }}>{viewer.doc.client_name}</div>
            </div>
            <button className="dv-close" onClick={()=>downloadDoc(viewer.doc)} title="Download">⬇</button>
            <button className="dv-close" onClick={()=>setViewer(null)} title="Close">✕</button>
          </div>
          <div className="dv-body">
            {viewer.isImage
              ? <img src={viewer.url} alt="" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', margin:'auto' }} />
              : <iframe src={viewer.url} title="doc" style={{ width:'100%', height:'100%', border:'none' }} />
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── Upload Modal ──────────────────────────────────────────────
function UploadModal({ clients, user, onClose, onDone }) {
  const [clientId, setClientId] = useState('')
  const [docType, setDocType] = useState('Balance Sheet')
  const [fyLabel, setFyLabel] = useState('')
  const [scope, setScope] = useState('client')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    function onKey(e){ if(e.key==='Escape'){ e.stopImmediatePropagation(); onClose() } }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [])

  async function handleSave() {
    setErr('')
    if (!clientId) { setErr('Please select a client (must exist in onboarding)'); return }
    if (!file) { setErr('Please choose a file'); return }
    const okTypes = ['image/jpeg','image/jpg','image/png','application/pdf']
    if (!okTypes.includes(file.type)) { setErr('Only JPG, PNG, or PDF allowed'); return }
    if (file.size > 10*1024*1024) { setErr('File must be under 10 MB'); return }

    const client = clients.find(c => c.client_id === clientId)
    setUploading(true)
    const safeName = (file.name||'file').replace(/[^\w.\-]+/g,'_')
    const folder = scope === 'director' ? 'director' : (scope === 'compliance' ? 'compliance' : 'client')
    const path = `${clientId}/${folder}/${Date.now()}_${safeName}`

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
    if (upErr) { setErr('Upload failed: '+upErr.message); setUploading(false); return }

    const { error: insErr } = await supabase.from('documents').insert({
      client_id: clientId, client_name: client?.name || clientId,
      doc_type: docType, doc_name: file.name, file_path: path,
      file_size: file.size, mime_type: file.type, uploaded_by: user?.name || 'System',
      scope, fy_label: fyLabel || null
    })
    if (insErr) { await supabase.storage.from(BUCKET).remove([path]); setErr('Could not save: '+insErr.message); setUploading(false); return }
    setUploading(false)
    onDone()
  }

  return (
    <div className="dh-modal-bg">
      <div className="dh-modal">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontSize:16, fontWeight:700 }}>Upload Document</div>
          <button className="dv-close" onClick={onClose}>✕</button>
        </div>

        <div className="dh-fld">
          <label className="dh-lbl">Client * (must exist in onboarding)</label>
          <select className="dh-inp" value={clientId} onChange={e=>setClientId(e.target.value)}>
            <option value="">— Select Client —</option>
            {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.client_id} — {c.name}</option>)}
          </select>
        </div>

        <div className="dh-fld">
          <label className="dh-lbl">Document Type</label>
          <select className="dh-inp" value={docType} onChange={e=>setDocType(e.target.value)}>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="dh-fld">
            <label className="dh-lbl">Scope</label>
            <select className="dh-inp" value={scope} onChange={e=>setScope(e.target.value)}>
              <option value="client">Company</option>
              <option value="director">Director</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>
          <div className="dh-fld">
            <label className="dh-lbl">Financial Year</label>
            <input className="dh-inp" placeholder="e.g. 2023-24" value={fyLabel} onChange={e=>setFyLabel(e.target.value)} />
          </div>
        </div>

        <div className="dh-fld">
          <label className="dh-lbl">File (PDF, JPG, PNG · max 10 MB)</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setFile(e.target.files[0]||null)} style={{ fontSize:12.5 }} />
        </div>

        {err && <div style={{ background:'#FEE2E2', color:'#DC2626', padding:'8px 12px', borderRadius:8, fontSize:12, marginBottom:12 }}>{err}</div>}

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
          <button onClick={onClose} style={{ padding:'9px 20px', border:'1px solid #D6DBD6', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={uploading} style={{ padding:'9px 22px', border:'none', borderRadius:8, background:uploading?'#9CA3AF':'#0A3D2C', color:'#fff', fontSize:13, fontWeight:700, cursor:uploading?'not-allowed':'pointer' }}>
            {uploading ? '⏳ Uploading…' : '⬆ Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}
