import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'

const DOC_TYPES = [
  'PAN Card', 'Aadhaar Card', 'Photo', 'GST Certificate', 'Incorporation Certificate',
  'MOA', 'AOA', 'Partnership Deed', 'Bank Statement', 'Cancelled Cheque',
  'Address Proof', 'Board Resolution', 'DSC', 'Udyam Certificate', 'IEC Certificate', 'Other'
]
const BUCKET = 'secure-docs'
const legacyBucket = d => (d.file_url ? 'client-docs' : BUCKET)
const DIR_PALETTE = [
  { bg: '#DBEAFE', text: '#1D4ED8' }, { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#F3E8FF', text: '#7C3AED' }, { bg: '#FCE7F3', text: '#BE185D' },
  { bg: '#D1FAE5', text: '#065F46' },
]
function initials(name) { return (name||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase() }
function sizeKB(b) { return b ? (b/1024).toFixed(0)+' KB' : '' }
function fileIcon(mime) {
  if (mime==='application/pdf') return '📄'
  if (mime&&mime.startsWith('image')) return '🖼️'
  return '📎'
}

const viewerCss = `
@keyframes dvSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}
.dv-panel{position:fixed;right:0;top:0;bottom:0;width:52%;min-width:340px;max-width:720px;background:#FDFDFB;border-left:1.5px solid #D6DBD6;box-shadow:-10px 0 50px rgba(4,28,20,.18);z-index:4500;display:flex;flex-direction:column;animation:dvSlide .32s cubic-bezier(.4,0,.2,1)}
@media(max-width:640px){.dv-panel{width:100%;min-width:unset}}
.dv-head{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #ECEEE9;background:#FBFBF8;flex-shrink:0}
.dv-body{flex:1;overflow:hidden;background:#F3F4F0;display:flex;align-items:stretch}
.dv-hbtn{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;padding:6px 11px;border-radius:8px;border:1px solid #D6DBD6;background:#fff;cursor:pointer;color:#4B5563;font-family:inherit;transition:.15s}
.dv-hbtn:hover{background:#F3F4F0}
.dv-close{width:30px;height:30px;border-radius:8px;border:1px solid #D6DBD6;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:#6B7280;transition:.2s;font-family:inherit}
.dv-close:hover{background:#FEE2E2;border-color:#FCA5A5;color:#DC2626;transform:rotate(90deg)}
`

export default function DocumentManager({ client, user }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('PAN Card')
  const [belongsTo, setBelongsTo] = useState('client')
  const [err, setErr] = useState('')
  const [viewer, setViewer] = useState(null) // { url, doc, isImage }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && viewer) {
        e.stopImmediatePropagation() // Prevent client modal from also closing
        setViewer(null)
      }
    }
    window.addEventListener('keydown', onKey, { capture: true }) // Fires before parent listeners
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [viewer])

  const directorNames = (client.directors||[]).map(d=>d.name).filter(Boolean)

  useEffect(()=>{ load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('documents').select('*')
      .eq('client_id', client.client_id).order('created_at', { ascending: false })
    setDocs(data||[])
    setLoading(false)
  }

  async function handleUpload(file) {
    if (!file) return
    setErr('')
    const okTypes = ['image/jpeg','image/jpg','image/png','application/pdf']
    if (!okTypes.includes(file.type)) { setErr('Only JPG, PNG, or PDF files allowed'); return }
    if (file.size > 10*1024*1024) { setErr('File must be under 10 MB'); return }
    setUploading(true)
    const safeName = (file.name||'file').replace(/[^\w.\-]+/g,'_')
    const isDir = belongsTo !== 'client'
    const path = `${client.client_id}/${isDir?'director':'client'}/${Date.now()}_${safeName}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
    if (upErr) { setErr('Upload failed: '+upErr.message); setUploading(false); return }
    const { error: insErr } = await supabase.from('documents').insert({
      client_id: client.client_id, client_name: client.name, doc_type: docType,
      doc_name: file.name, file_path: path, file_size: file.size,
      mime_type: file.type, uploaded_by: user.name,
      scope: isDir ? 'director' : 'client', director_name: isDir ? belongsTo : null
    })
    if (insErr) { await supabase.storage.from(BUCKET).remove([path]); setErr('Could not save record: '+insErr.message) }
    setUploading(false)
    load()
  }

  async function viewDoc(d) {
    setErr('')
    let url
    if (d.file_url) {
      url = d.file_url
    } else {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 600)
      if (error || !data) { setErr('Could not open file. Try again.'); return }
      url = data.signedUrl
    }
    setViewer({ url, doc: d, isImage: d.mime_type && d.mime_type.startsWith('image/') })
  }

  async function deleteDoc(d) {
    if (!confirm('Delete this document?')) return
    if (d.file_path) await supabase.storage.from(legacyBucket(d)).remove([d.file_path])
    await supabase.from('documents').delete().eq('id', d.id)
    if (viewer?.doc?.id === d.id) setViewer(null)
    load()
  }

  // Build grouped sections
  const companyDocs = docs.filter(d => d.scope !== 'director')
  const sections = [
    { key: 'client', label: 'Company', docs: companyDocs, isCompany: true },
    ...directorNames.map((name, i) => ({
      key: name, label: name,
      docs: docs.filter(d => d.scope==='director' && d.director_name===name),
      isCompany: false, palette: DIR_PALETTE[i % DIR_PALETTE.length]
    }))
  ]
  const knownNames = new Set(directorNames)
  const extraNames = [...new Set(docs.filter(d=>d.scope==='director'&&d.director_name&&!knownNames.has(d.director_name)).map(d=>d.director_name))]
  extraNames.forEach((name,i)=>{ sections.push({ key: name, label: name, docs: docs.filter(d=>d.director_name===name), isCompany: false, palette: DIR_PALETTE[(directorNames.length+i)%DIR_PALETTE.length] }) })

  return (
    <>
      <style>{viewerCss}</style>

      {/* Upload bar */}
      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy2)', display: 'flex', alignItems: 'center', gap: 7 }}>
            📁 Documents
            {!loading && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray2)', background: 'var(--ltgray)', padding: '1px 8px', borderRadius: 99 }}>{docs.length} file{docs.length!==1?'s':''}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', background: 'var(--ltgray)', borderRadius: 10, padding: '10px 12px' }}>
          {directorNames.length > 0 && (
            <select value={belongsTo} onChange={e=>setBelongsTo(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, background: '#fff' }}>
              <option value="client">🏢 Company</option>
              {directorNames.map(n=><option key={n} value={n}>👤 {n}</option>)}
            </select>
          )}
          <select value={docType} onChange={e=>setDocType(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, background: '#fff' }}>
            {DOC_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <label style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
            {uploading ? 'Uploading…' : '+ Upload File'}
            <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={e=>{ handleUpload(e.target.files[0]); e.target.value='' }}
              style={{ display: 'none' }} disabled={uploading} />
          </label>
          <span style={{ fontSize: 11, color: 'var(--gray2)' }}>JPG, PNG, PDF · max 10 MB</span>
        </div>

        {err && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{err}</div>}

        {/* Grouped sections */}
        {loading
          ? <div style={{ fontSize: 12.5, color: 'var(--gray2)', padding: '14px 0' }}>Loading…</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sections.map((sec, si) => (
                <div key={sec.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                    {sec.isCompany
                      ? <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--ltgreen)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🏢</div>
                      : <div style={{ width: 28, height: 28, borderRadius: '50%', background: sec.palette.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: sec.palette.text, flexShrink: 0 }}>{initials(sec.label)}</div>
                    }
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy2)' }}>{sec.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--gray2)' }}>{sec.docs.length===0 ? 'No files yet' : `${sec.docs.length} file${sec.docs.length!==1?'s':''}`}</span>
                  </div>

                  <div style={{ paddingLeft: 37, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {sec.docs.length===0
                      ? <div style={{ fontSize: 12, color: 'var(--gray2)', fontStyle: 'italic', padding: '6px 0' }}>No documents yet — use the upload bar above.</div>
                      : sec.docs.map(d => (
                          <div key={d.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', border: `1px solid ${viewer?.doc?.id===d.id ? 'var(--dkgreen)' : 'var(--border)'}`, borderRadius: 8, background: viewer?.doc?.id===d.id ? 'var(--ltgreen)' : '#fff', transition: '.15s' }}>
                            <span style={{ fontSize: 16 }}>{fileIcon(d.mime_type)}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy2)' }}>{d.doc_type}</div>
                              <div style={{ fontSize: 11, color: 'var(--gray)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {d.doc_name} · {sizeKB(d.file_size)} · {d.uploaded_by} · {fmtDate(d.created_at)}
                              </div>
                            </div>
                            <button onClick={()=>viewDoc(d)}
                              style={{ fontSize: 11.5, fontWeight: 600, color: viewer?.doc?.id===d.id ? 'var(--dkgreen)' : 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}>
                              {viewer?.doc?.id===d.id ? '▶ Viewing' : 'View'}
                            </button>
                            <button onClick={()=>deleteDoc(d)}
                              style={{ background: 'none', border: 'none', color: 'var(--gray2)', cursor: 'pointer', fontSize: 13, padding: '2px', flexShrink: 0 }}>🗑</button>
                          </div>
                        ))
                    }
                  </div>
                  {si < sections.length-1 && <div style={{ marginTop: 14, borderBottom: '1px dashed var(--border2)' }} />}
                </div>
              ))}
            </div>
        }
      </div>

      {/* ── SLIDE-IN DOCUMENT VIEWER PANEL ── */}
      {viewer && (
        <div className="dv-panel">
          <div className="dv-head">
            <span style={{ fontSize: 20 }}>{fileIcon(viewer.doc.mime_type)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#13241D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {viewer.doc.doc_type}
                {viewer.doc.scope==='director' && viewer.doc.director_name &&
                  <span style={{ fontSize: 10, background: '#DBEAFE', color: '#1D4ED8', padding: '1px 7px', borderRadius: 99, marginLeft: 7, fontWeight: 700 }}>👤 {viewer.doc.director_name}</span>
                }
              </div>
              <div style={{ fontSize: 11, color: '#8A9189', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {viewer.doc.doc_name} · {sizeKB(viewer.doc.file_size)}
              </div>
            </div>
            <a href={viewer.url} target="_blank" rel="noreferrer" className="dv-hbtn" title="Open in new tab">
              ↗ New tab
            </a>
            <button className="dv-close" onClick={()=>setViewer(null)} aria-label="Close viewer">✕</button>
          </div>

          <div className="dv-body">
            {viewer.isImage
              ? <img src={viewer.url} alt={viewer.doc.doc_name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', margin: 'auto', display: 'block', padding: 16 }} />
              : <iframe src={viewer.url} title={viewer.doc.doc_name}
                  style={{ width: '100%', height: '100%', border: 'none' }} />
            }
          </div>
        </div>
      )}
    </>
  )
}
