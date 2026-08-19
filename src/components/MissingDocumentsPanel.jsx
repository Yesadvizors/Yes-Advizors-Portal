import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'
import { fetchReadiness } from '../lib/documentReadiness'
import { documentRole, canUploadDocument } from '../lib/documentAccess'
import { serviceCategoryLabel, requirementToManagePayload } from '../lib/documentChecklist'

// Missing-document view (requirement-specific — NOT "client has zero docs"). Lists every
// requirement with no CURRENT linked document, filterable by client / entity type / service /
// FY, with Create Task + Manage actions. Test clients are excluded (seeded data, not real
// obligations); entity type comes from the client row (clients.client_type), never re-derived.
export default function MissingDocumentsPanel({ clients = [], user, onManage }) {
  const canUpload = canUploadDocument(documentRole(user))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fClient, setFClient] = useState('')
  const [fEntity, setFEntity] = useState('')
  const [fFY, setFFY] = useState('')
  const [fType, setFType] = useState('')
  const [taskFor, setTaskFor] = useState({})   // requirement_ref_id -> 'creating' | 'done' | 'error'

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true); setError(false)
    const { data, error } = await fetchReadiness({ missingOnly: true })
    if (error) { setError(true); setRows([]) } else setRows(data)
    setLoading(false)
  }

  const clientMeta = useMemo(() => {
    const m = new Map()
    for (const c of clients) if (c && c.client_id) m.set(c.client_id, c)
    return m
  }, [clients])
  const testClientIds = useMemo(() => new Set(clients.filter(c => c && c.is_test_client === true && c.client_id).map(c => c.client_id)), [clients])
  const entityTypeOf = (clientId) => { const c = clientMeta.get(clientId); return c && c.client_type ? c.client_type : '' }
  const baseRows = useMemo(() => rows.filter(r => r && !testClientIds.has(r.client_id)), [rows, testClientIds])

  const fyOptions = useMemo(() => [...new Set(baseRows.map(r => r.fy_label).filter(Boolean))].sort().reverse(), [baseRows])
  const typeOptions = useMemo(() => [...new Set(baseRows.map(r => r.requirement_ref_type).filter(Boolean))].sort((a, b) => serviceCategoryLabel(a).localeCompare(serviceCategoryLabel(b))), [baseRows])
  const entityOptions = useMemo(() => [...new Set(baseRows.map(r => entityTypeOf(r.client_id)).filter(Boolean))].sort(), [baseRows, clientMeta])
  const filtered = useMemo(() => baseRows.filter(r =>
    (!fClient || r.client_id === fClient) && (!fFY || r.fy_label === fFY) &&
    (!fType || r.requirement_ref_type === fType) && (!fEntity || entityTypeOf(r.client_id) === fEntity)
  ), [baseRows, fClient, fFY, fType, fEntity, clientMeta])

  async function createTask(r) {
    if (!canUpload) return
    setTaskFor(p => ({ ...p, [r.requirement_ref_id]: 'creating' }))
    // Tasks has no compliance/document reference column (future enhancement — see report),
    // so requirement context is carried in task_name + notes using existing fields only.
    const { error } = await supabase.from('tasks').insert({
      task_name: `Obtain ${r.requirement_label || r.doc_type || 'document'} — ${r.client_name || r.client_id}${r.fy_label ? ` (FY ${r.fy_label})` : ''}`,
      client_id: r.client_id, client_name: r.client_name || r.client_id,
      work_type: 'Document Collection', priority: 'Normal', status: 'Pending',
      due_date: r.due_date || null, assigned_by: user?.name || 'System',
      notes: `Missing document for ${r.requirement_ref_type} requirement (ref ${r.requirement_ref_id}). Created from document readiness.`,
    })
    setTaskFor(p => ({ ...p, [r.requirement_ref_id]: error ? 'error' : 'done' }))
    if (error) console.error('[MissingDocs] create task failed:', error)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <select className="dh-sel" value={fClient} onChange={e => setFClient(e.target.value)}>
          <option value="">All Clients</option>
          {clients.filter(c => !testClientIds.has(c.client_id)).map(c => <option key={c.client_id} value={c.client_id}>{c.client_id} — {c.name}</option>)}
        </select>
        <select className="dh-sel" value={fEntity} onChange={e => setFEntity(e.target.value)}>
          <option value="">All Entity Types</option>
          {entityOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="dh-sel" value={fType} onChange={e => setFType(e.target.value)}>
          <option value="">All Services</option>
          {typeOptions.map(t => <option key={t} value={t}>{serviceCategoryLabel(t)}</option>)}
        </select>
        <select className="dh-sel" value={fFY} onChange={e => setFFY(e.target.value)}>
          <option value="">All FY</option>
          {fyOptions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#6B7280' }}>{filtered.length} missing requirement{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? <div className="dh-empty">Loading readiness…</div>
        : error ? <div className="dh-empty">Could not load document readiness. <button className="dh-up" onClick={load} style={{ marginLeft: 8 }}>Retry</button></div>
        : filtered.length === 0 ? <div className="dh-empty"><div style={{ fontSize: 40, marginBottom: 10 }}>✓</div><div style={{ fontSize: 15, fontWeight: 600, color: '#166534' }}>No missing documents for this filter</div></div>
        : (
          <table className="dh-table">
            <thead><tr><th>Client</th><th>Requirement</th><th>Service</th><th>FY / Period</th><th>Due</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {filtered.slice(0, 300).map(r => (
                <tr key={`${r.requirement_ref_type}:${r.requirement_ref_id}`}>
                  <td><div style={{ fontWeight: 600 }}>{r.client_name || r.client_id}</div><div style={{ fontSize: 10.5, color: '#9CA3AF' }}>{r.client_id}</div></td>
                  <td>{r.requirement_label || r.doc_type}</td>
                  <td><span className="dh-badge" style={{ background: '#EEF2FF', color: '#3730A3' }}>{serviceCategoryLabel(r.requirement_ref_type)}</span></td>
                  <td style={{ fontSize: 11.5, color: '#6B7280' }}>{r.fy_label || '—'}{r.period ? ` · ${r.period}` : ''}</td>
                  <td style={{ fontSize: 11.5, color: r.due_date ? '#B45309' : '#6B7280' }}>{r.due_date ? fmtDate(r.due_date) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="dh-ibtn" title="Manage documents" style={{ width: 'auto', padding: '0 10px', fontSize: 11, fontWeight: 600 }}
                        onClick={() => onManage?.(requirementToManagePayload(r))}>Manage</button>
                      {canUpload && (
                        taskFor[r.requirement_ref_id] === 'done'
                          ? <span style={{ fontSize: 11, color: '#166534', alignSelf: 'center' }}>✓ Task created</span>
                          : <button className="dh-ibtn" title="Create a task to obtain this document" style={{ width: 'auto', padding: '0 10px', fontSize: 11, fontWeight: 600 }}
                              disabled={taskFor[r.requirement_ref_id] === 'creating'} onClick={() => createTask(r)}>
                              {taskFor[r.requirement_ref_id] === 'creating' ? '…' : taskFor[r.requirement_ref_id] === 'error' ? 'Retry task' : '+ Task'}
                            </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      {filtered.length > 300 && <div style={{ marginTop: 10, fontSize: 11.5, color: '#9CA3AF' }}>Showing first 300 of {filtered.length}. Narrow the filters to see more.</div>}
    </div>
  )
}
