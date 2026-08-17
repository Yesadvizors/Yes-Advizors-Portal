import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'
import { documentRole, canManageDocument } from '../lib/documentAccess'
import {
  fetchRequirementVersions, fetchCompatibleDocuments,
  linkDocument, replaceDocument, archiveDocument, sha256Hex,
} from '../lib/documentReadiness'

const BUCKET = 'secure-docs'
const OK_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']

// One Manage Documents experience for a compliance requirement. Shows current document +
// full version history + compatible central documents (Use Existing) and, for permitted
// roles, Upload New / Replace / Archive / Link — ALL through the governed RPCs. Read-only
// roles still see readiness, the current document and history, with no mutation controls.
export default function ManageDocumentsDrawer({ requirement, user, onClose, onChanged }) {
  const req = requirement || {}
  const canManage = canManageDocument(documentRole(user))
  const [versions, setVersions] = useState([])
  const [compatible, setCompatible] = useState({ matched: [], all: [] })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [file, setFile] = useState(null)
  const [showAllExisting, setShowAllExisting] = useState(false)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !busy) { e.stopImmediatePropagation(); onClose() } }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [busy, onClose])

  useEffect(() => { reload() }, [req.refType, req.refId])
  async function reload() {
    setLoading(true); setErr('')
    const [v, c] = await Promise.all([
      fetchRequirementVersions(req.refType, req.refId),
      fetchCompatibleDocuments({ clientId: req.clientId, fyLabel: req.fyLabel, docType: req.docType }),
    ])
    if (v.error || c.error) setErr('Could not load document details. Please try again.')
    setVersions(v.data || [])
    setCompatible({ matched: c.matched || [], all: c.all || [] })
    setLoading(false)
  }

  const current = versions.find(x => x.is_current)?.document || null
  const previous = versions.filter(x => !x.is_current).map(x => x.document)

  async function openDoc(d, download) {
    setErr('')
    if (d.file_url) { window.open(d.file_url, '_blank'); return }
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 600, download ? { download: true } : undefined)
    if (error || !data) { setErr('Could not open the file. Please try again.'); return }
    window.open(data.signedUrl, '_blank')
  }

  // Link/replace an EXISTING central document to this requirement (Use Existing).
  async function useExisting(d) {
    if (!canManage) return
    setBusy('use:' + d.id); setErr('')
    const { error } = current
      ? await replaceDocument({ refType: req.refType, refId: req.refId, newDocumentId: d.id })
      : await linkDocument({ refType: req.refType, refId: req.refId, documentId: d.id, makeCurrent: true })
    setBusy('')
    if (error) { console.error('[ManageDocs] useExisting failed:', error); setErr('Could not link the document. Please try again.'); return }
    onChanged?.(); reload()
  }

  // Upload a NEW file, insert the canonical document, then link/replace via the governed RPC.
  async function uploadNew() {
    if (!canManage || !file) return
    if (!OK_TYPES.includes(file.type)) { setErr('Only PDF, JPG, PNG allowed'); return }
    if (file.size > 15 * 1024 * 1024) { setErr('File must be under 15 MB'); return }
    setBusy('upload'); setErr('')
    const hash = await sha256Hex(file)
    const safeName = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
    const path = `${req.clientId}/compliance/${Date.now()}_${safeName}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
    if (upErr) { console.error('[ManageDocs] upload failed:', upErr); setErr('Upload failed. Please try again.'); setBusy(''); return }
    const { data: doc, error: insErr } = await supabase.from('documents').insert({
      client_id: req.clientId, client_name: req.clientName || req.clientId,
      doc_type: req.docType || 'Other', doc_name: file.name, file_path: path,
      file_size: file.size, mime_type: file.type, uploaded_by: user?.name || 'System',
      scope: 'compliance', compliance_type: req.refType, compliance_ref_id: req.refId,
      compliance_period: req.period || (req.requirementLabel ? `${req.requirementLabel} — ${req.fyLabel || ''}` : null),
      fy_label: req.fyLabel || null, content_hash: hash || null,
    }).select().single()
    if (insErr) { console.error('[ManageDocs] record insert failed:', insErr); await supabase.storage.from(BUCKET).remove([path]); setErr('Could not save the document record.'); setBusy(''); return }
    const { error: linkErr } = current
      ? await replaceDocument({ refType: req.refType, refId: req.refId, newDocumentId: doc.id })
      : await linkDocument({ refType: req.refType, refId: req.refId, documentId: doc.id, makeCurrent: true })
    setBusy('')
    if (linkErr) { console.error('[ManageDocs] link/replace failed:', linkErr); setErr('Uploaded, but could not link. Please retry from Use Existing.'); reload(); return }
    setFile(null); onChanged?.(); reload()
  }

  async function archiveCurrent() {
    if (!canManage || !current) return
    if (!confirm('Archive the current document for this requirement? It stays in history and can be replaced.')) return
    setBusy('archive'); setErr('')
    const { error } = await archiveDocument(current.id)
    setBusy('')
    if (error) { console.error('[ManageDocs] archive failed:', error); setErr('Could not archive. Please try again.'); return }
    onChanged?.(); reload()
  }

  const otherExisting = (showAllExisting ? compatible.all : compatible.matched)
    .filter(d => !current || d.id !== current.id)

  return (
    <div style={S.overlay} onClick={busy ? undefined : onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        <div style={S.head}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A3D2C' }}>Manage Documents</div>
            <div style={{ fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {req.requirementLabel || req.docType} · {req.clientName || req.clientId} · {req.fyLabel || '—'}{req.period ? ` · ${req.period}` : ''}
            </div>
          </div>
          <button style={S.close} onClick={onClose} disabled={!!busy}>✕</button>
        </div>

        <div style={S.body}>
          {err && <div style={S.err}>{err}</div>}
          {loading ? <div style={{ color: '#6B7280', fontSize: 13, padding: '18px 0' }}>Loading…</div> : (
            <>
              {/* Readiness + current */}
              <Section title="Current document">
                {current ? (
                  <div style={S.docRow}>
                    <span style={S.avail}>✓ Available</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={S.docName}>{current.doc_name}</div>
                      <div style={S.docMeta}>{current.doc_type} · {fmtDate(current.created_at)} · {current.uploaded_by || '—'}</div>
                    </div>
                    <button style={S.mini} onClick={() => openDoc(current, false)}>View</button>
                    <button style={S.mini} onClick={() => openDoc(current, true)}>Download</button>
                    {canManage && <button style={S.miniDanger} onClick={archiveCurrent} disabled={busy === 'archive'}>Archive</button>}
                  </div>
                ) : <div style={S.missing}>— Missing · no current document linked to this requirement</div>}
              </Section>

              {/* Version history */}
              {previous.length > 0 && (
                <Section title={`Previous versions (${previous.length})`}>
                  {previous.map(d => (
                    <div key={d.id} style={S.docRow}>
                      <span style={S.superseded}>Superseded</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.docName}>{d.doc_name}</div>
                        <div style={S.docMeta}>{fmtDate(d.superseded_at || d.created_at)}</div>
                      </div>
                      <button style={S.mini} onClick={() => openDoc(d, false)}>View</button>
                    </div>
                  ))}
                </Section>
              )}

              {/* Upload new / replace */}
              {canManage && (
                <Section title={current ? 'Replace with a new upload' : 'Upload a document'}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0] || null)} style={{ fontSize: 12 }} />
                    <button style={S.primary} onClick={uploadNew} disabled={!file || busy === 'upload'}>
                      {busy === 'upload' ? 'Uploading…' : (current ? 'Upload & Replace' : 'Upload & Link')}
                    </button>
                  </div>
                  {req.refType === 'financials' && <div style={{ fontSize: 10.5, color: '#6B7280', marginTop: 4 }}>Replacing keeps the prior version in history and repoints the financial tracker.</div>}
                </Section>
              )}

              {/* Use existing central document */}
              {canManage && (
                <Section title="Use an existing central document">
                  {otherExisting.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      No {showAllExisting ? '' : 'matching '}central documents{showAllExisting ? '' : ' for this client / FY / type'}.
                      {!showAllExisting && compatible.all.length > 0 && <button style={S.linkbtn} onClick={() => setShowAllExisting(true)}>Show all client documents</button>}
                    </div>
                  ) : (
                    <>
                      {otherExisting.slice(0, 30).map(d => (
                        <div key={d.id} style={S.docRow}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={S.docName}>{d.doc_name}</div>
                            <div style={S.docMeta}>{d.doc_type} · {d.fy_label || '—'} · {fmtDate(d.created_at)}</div>
                          </div>
                          <button style={S.mini} onClick={() => openDoc(d, false)}>View</button>
                          <button style={S.primary} onClick={() => useExisting(d)} disabled={busy === 'use:' + d.id}>
                            {current ? 'Use (Replace)' : 'Use'}
                          </button>
                        </div>
                      ))}
                      {!showAllExisting && <button style={S.linkbtn} onClick={() => setShowAllExisting(true)}>Show all client documents</button>}
                    </>
                  )}
                </Section>
              )}

              {!canManage && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>You have read-only access. You can view and download the current document and history, but cannot upload, link, replace or archive.</div>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(4,28,20,.28)', zIndex: 5300, display: 'flex', justifyContent: 'flex-end' },
  panel: { width: '46%', minWidth: 360, maxWidth: 620, background: '#fff', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,.18)' },
  head: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #ECEEE9', background: '#FBFBF8' },
  close: { width: 30, height: 30, borderRadius: 8, border: '1px solid #D6DBD6', background: '#fff', cursor: 'pointer', flexShrink: 0 },
  body: { flex: 1, overflowY: 'auto', padding: 18 },
  err: { background: '#FEE2E2', color: '#DC2626', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 },
  docRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid #E2E5E1', borderRadius: 9, background: '#fff' },
  docName: { fontSize: 12.5, fontWeight: 600, color: '#13241D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  docMeta: { fontSize: 10.5, color: '#6B7280' },
  avail: { fontSize: 10.5, fontWeight: 700, color: '#166534', background: '#DCFCE7', padding: '2px 8px', borderRadius: 99, flexShrink: 0 },
  superseded: { fontSize: 10, fontWeight: 700, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99, flexShrink: 0 },
  missing: { fontSize: 12, color: '#92722A', background: '#FEFCE8', border: '1px solid #FDE68A', padding: '8px 12px', borderRadius: 9 },
  mini: { fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1px solid #D6DBD6', background: '#fff', color: '#374151', cursor: 'pointer', flexShrink: 0 },
  miniDanger: { fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1px solid #FCA5A5', background: '#fff', color: '#B91C1C', cursor: 'pointer', flexShrink: 0 },
  primary: { fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: 'none', background: '#0A3D2C', color: '#fff', cursor: 'pointer', flexShrink: 0 },
  linkbtn: { fontSize: 11.5, fontWeight: 600, color: '#0A3D2C', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginTop: 4 },
}
