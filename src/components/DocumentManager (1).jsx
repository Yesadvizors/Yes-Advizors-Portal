import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'

const DOC_TYPES = [
  'PAN Card', 'Aadhaar Card', 'Photo', 'GST Certificate', 'Incorporation Certificate',
  'MOA / AOA', 'Partnership Deed', 'Bank Statement', 'Cancelled Cheque',
  'Address Proof', 'Board Resolution', 'DSC', 'Udyam Certificate', 'Other'
]

const BUCKET = 'secure-docs'
const legacyBucket = d => (d.file_url ? 'client-docs' : BUCKET)

// Soft colours for up to 5 directors
const DIR_PALETTE = [
  { bg: '#DBEAFE', text: '#1D4ED8' },
  { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#F3E8FF', text: '#7C3AED' },
  { bg: '#FCE7F3', text: '#BE185D' },
  { bg: '#D1FAE5', text: '#065F46' },
]

function initials(name) {
  return (name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
function sizeKB(b) { return b ? (b / 1024).toFixed(0) + ' KB' : '' }
function fileIcon(mime) {
  if (mime === 'application/pdf') return '📄'
  if (mime && mime.startsWith('image')) return '🖼️'
  return '📎'
}

export default function DocumentManager({ client, user }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('PAN Card')
  const [belongsTo, setBelongsTo] = useState('client')
  const [err, setErr] = useState('')

  const directorNames = (client.directors || []).map(d => d.name).filter(Boolean)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('documents').select('*')
      .eq('client_id', client.client_id)
      .order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  async function handleUpload(file) {
    if (!file) return
    setErr('')
    const okTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!okTypes.includes(file.type)) { setErr('Only JPG, PNG, or PDF files allowed'); return }
    if (file.size > 10 * 1024 * 1024) { setErr('File must be under 10 MB'); return }
    setUploading(true)
    const safeName = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
    const isDir = belongsTo !== 'client'
    const path = `${client.client_id}/${isDir ? 'director' : 'client'}/${Date.now()}_${safeName}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
    if (upErr) { setErr('Upload failed: ' + upErr.message); setUploading(false); return }
    const { error: insErr } = await supabase.from('documents').insert({
      client_id: client.client_id, client_name: client.name, doc_type: docType,
      doc_name: file.name, file_path: path, file_size: file.size,
      mime_type: file.type, uploaded_by: user.name,
      scope: isDir ? 'director' : 'client',
      director_name: isDir ? belongsTo : null
    })
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path])
      setErr('Could not save record: ' + insErr.message)
    }
    setUploading(false)
    load()
  }

  async function viewDoc(d) {
    setErr('')
    if (d.file_url) { openLink(d.file_url); return }
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 300)
    if (error || !data) { setErr('Could not open file. Try again.'); return }
    openLink(data.signedUrl)
  }
  function openLink(url) {
    const a = document.createElement('a')
    a.href = url; a.target = '_blank'; a.rel = 'noreferrer'
    document.body.appendChild(a); a.click(); a.remove()
  }
  async function deleteDoc(d) {
    if (!confirm('Delete this document?')) return
    if (d.file_path) await supabase.storage.from(legacyBucket(d)).remove([d.file_path])
    await supabase.from('documents').delete().eq('id', d.id)
    load()
  }

  // Build sections: Company first, then each known director
  const companyDocs = docs.filter(d => d.scope !== 'director')
  const sections = [
    { key: 'client', label: 'Company', docs: companyDocs, isCompany: true },
    ...directorNames.map((name, i) => ({
      key: name, label: name, docs: docs.filter(d => d.scope === 'director' && d.director_name === name),
      isCompany: false, palette: DIR_PALETTE[i % DIR_PALETTE.length]
    }))
  ]
  // Also surface any director docs whose name isn't in client.directors (edge case)
  const knownNames = new Set(directorNames)
  const extraNames = [...new Set(docs.filter(d => d.scope === 'director' && d.director_name && !knownNames.has(d.director_name)).map(d => d.director_name))]
  extraNames.forEach((name, i) => {
    sections.push({ key: name, label: name, docs: docs.filter(d => d.director_name === name), isCompany: false, palette: DIR_PALETTE[(directorNames.length + i) % DIR_PALETTE.length] })
  })

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy2)', display: 'flex', alignItems: 'center', gap: 7 }}>
          📁 Documents
          {!loading && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray2)', background: 'var(--ltgray)', padding: '1px 8px', borderRadius: 99 }}>{docs.length} file{docs.length !== 1 ? 's' : ''}</span>}
        </div>
      </div>

      {/* Upload bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', background: 'var(--ltgray)', borderRadius: 10, padding: '10px 12px' }}>
        {directorNames.length > 0 && (
          <select value={belongsTo} onChange={e => setBelongsTo(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, background: '#fff' }}>
            <option value="client">🏢 Company</option>
            {directorNames.map(n => <option key={n} value={n}>👤 {n}</option>)}
          </select>
        )}
        <select value={docType} onChange={e => setDocType(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, background: '#fff' }}>
          {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <label style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
          {uploading ? 'Uploading…' : '+ Upload File'}
          <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={e => { handleUpload(e.target.files[0]); e.target.value = '' }}
            style={{ display: 'none' }} disabled={uploading} />
        </label>
        <span style={{ fontSize: 11, color: 'var(--gray2)' }}>JPG, PNG, PDF · max 10 MB</span>
      </div>

      {err && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{err}</div>}

      {/* Grouped sections */}
      {loading
        ? <div style={{ fontSize: 12.5, color: 'var(--gray2)', padding: '14px 0' }}>Loading documents…</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sections.map(sec => (
              <div key={sec.key}>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  {sec.isCompany
                    ? <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--ltgreen)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🏢</div>
                    : <div style={{ width: 28, height: 28, borderRadius: '50%', background: sec.palette.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: sec.palette.text, flexShrink: 0 }}>{initials(sec.label)}</div>
                  }
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy2)' }}>{sec.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--gray2)' }}>
                    {sec.docs.length === 0 ? 'No files yet' : `${sec.docs.length} file${sec.docs.length !== 1 ? 's' : ''}`}
                  </span>
                </div>

                {/* Section rows */}
                <div style={{ paddingLeft: 37, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {sec.docs.length === 0
                    ? <div style={{ fontSize: 12, color: 'var(--gray2)', fontStyle: 'italic', padding: '6px 0' }}>
                        No documents uploaded yet — use the upload bar above.
                      </div>
                    : sec.docs.map(d => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }}>
                          <span style={{ fontSize: 16 }}>{fileIcon(d.mime_type)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy2)' }}>{d.doc_type}</div>
                            <div style={{ fontSize: 11, color: 'var(--gray)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {d.doc_name} · {sizeKB(d.file_size)} · {d.uploaded_by} · {fmtDate(d.created_at)}
                            </div>
                          </div>
                          <button onClick={() => viewDoc(d)}
                            style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}>
                            View
                          </button>
                          <button onClick={() => deleteDoc(d)}
                            style={{ background: 'none', border: 'none', color: 'var(--gray2)', cursor: 'pointer', fontSize: 13, padding: '2px', flexShrink: 0 }}>
                            🗑
                          </button>
                        </div>
                      ))
                  }
                </div>

                {/* Divider between sections (not after last) */}
                {sec.key !== sections[sections.length - 1].key && (
                  <div style={{ marginTop: 14, borderBottom: '1px dashed var(--border2)' }} />
                )}
              </div>
            ))}
          </div>
      }
    </div>
  )
}
