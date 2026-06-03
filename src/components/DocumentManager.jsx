import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'

const DOC_TYPES = [
  'PAN Card', 'Aadhaar Card', 'Photo', 'GST Certificate', 'Incorporation Certificate',
  'MOA / AOA', 'Partnership Deed', 'Bank Statement', 'Cancelled Cheque',
  'Address Proof', 'Board Resolution', 'DSC', 'Udyam Certificate', 'Other'
]

export default function DocumentManager({ client, user }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('PAN Card')
  const [err, setErr] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('documents').select('*').eq('client_id', client.client_id).order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  async function handleUpload(file) {
    if (!file) return
    setErr('')
    // Allow common doc types
    const okTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!okTypes.includes(file.type)) { setErr('Only JPG, PNG, or PDF files allowed'); return }
    if (file.size > 10 * 1024 * 1024) { setErr('File must be under 10 MB'); return }
    setUploading(true)
    // Unique path: client_id/doctype_timestamp.ext
    const ext = file.name.split('.').pop()
    const safe = docType.replace(/[^a-zA-Z0-9]/g, '_')
    const path = `${client.client_id}/${safe}_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('client-docs').upload(path, file)
    if (upErr) { setErr('Upload failed: ' + upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('client-docs').getPublicUrl(path)
    await supabase.from('documents').insert({
      client_id: client.client_id, client_name: client.name, doc_type: docType,
      doc_name: file.name, file_path: path, file_url: urlData.publicUrl,
      file_size: file.size, mime_type: file.type, uploaded_by: user.name
    })
    setUploading(false)
    load()
  }

  async function deleteDoc(d) {
    if (!confirm('Delete this document?')) return
    await supabase.storage.from('client-docs').remove([d.file_path])
    await supabase.from('documents').delete().eq('id', d.id)
    load()
  }

  function icon(mime) {
    if (mime === 'application/pdf') return '📄'
    if (mime && mime.startsWith('image')) return '🖼️'
    return '📎'
  }
  function sizeKB(b) { return b ? (b / 1024).toFixed(0) + ' KB' : '' }

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy2)', marginBottom: 10 }}>📁 Documents</div>

      {/* Upload row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={docType} onChange={e => setDocType(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5 }}>
          {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <label style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', borderRadius: 8, cursor: 'pointer' }}>
          {uploading ? 'Uploading...' : '+ Upload File'}
          <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={e => handleUpload(e.target.files[0])} style={{ display: 'none' }} disabled={uploading} />
        </label>
        <span style={{ fontSize: 11, color: 'var(--gray2)' }}>JPG, PNG, PDF · max 10MB</span>
      </div>
      {err && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 8 }}>{err}</div>}

      {/* Document list */}
      {loading ? <div style={{ fontSize: 12, color: 'var(--gray2)', padding: 12 }}>Loading documents...</div>
        : docs.length === 0 ? <div style={{ fontSize: 12.5, color: 'var(--gray2)', padding: 16, background: 'var(--ltgray)', borderRadius: 8, textAlign: 'center' }}>No documents uploaded yet.</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {docs.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
                <span style={{ fontSize: 18 }}>{icon(d.mime_type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{d.doc_type}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.doc_name} · {sizeKB(d.file_size)} · {d.uploaded_by} · {fmtDate(d.created_at)}</div>
                </div>
                <a href={d.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>View</a>
                <button onClick={() => deleteDoc(d)} style={{ background: 'none', border: 'none', color: 'var(--gray2)', cursor: 'pointer', fontSize: 13 }}>🗑</button>
              </div>
            ))}
          </div>}
    </div>
  )
}
