import { useState, useEffect, useMemo } from 'react'
import { fmtDate } from '../helpers'
import { fetchReadiness } from '../lib/documentReadiness'
import {
  classifyRequirementState, requirementStateMeta, summariseChecklist, groupChecklist,
  filterChecklist, serviceCategoryLabel, requirementToManagePayload, isFyScoped,
} from '../lib/documentChecklist'

// Firm-wide Entity / Service / FY document-requirement CHECKLIST.
//
// One requirement = one row of the canonical v_requirement_document_readiness view (a
// tracker obligation for a client × service × FY). This surface answers "what documents are
// required, for which service, for which FY, and is each present?" across ALL clients, in the
// SAME requirement/readiness truth the Missing workflow, Client 360 and Compliance use — via
// the shared documentChecklist helper (no independent readiness rule). Actions route to the
// existing Manage Documents drawer (governed document_link / document_replace RPCs); this
// panel creates NO second upload path.
//
// Entity type is a CLIENT attribute (clients.client_type) — the backend generates the
// requirement rows themselves from entity type + services (server-side, at onboarding), so
// this panel annotates/filters by entity type but never re-derives which requirements apply.
// Test clients are excluded from the firm-wide checklist (seeded data, not real obligations).

const STATE_STYLE = {
  missing: { color: '#92722A', background: '#FEF9C3' },
  provided: { color: '#166534', background: '#DCFCE7' },
  replaced: { color: '#1E40AF', background: '#DBEAFE' },
}

function StateBadge({ row }) {
  const meta = requirementStateMeta(row)
  const s = STATE_STYLE[meta.key] || STATE_STYLE.missing
  return (
    <span className="dh-badge" style={{ ...s, fontWeight: 700 }} title={row.current_document_name || ''}>
      {meta.label}
    </span>
  )
}

export default function DocumentChecklistPanel({ clients = [], user, onManage }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fClient, setFClient] = useState('')
  const [fEntity, setFEntity] = useState('')
  const [fService, setFService] = useState('')
  const [fFY, setFFY] = useState('')
  const [fState, setFState] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true); setError(false)
    // NO refType/client filter → the whole checklist. A read failure sets an explicit error
    // state; it must NEVER be shown as "0 missing" (that would hide real, uncollected work).
    const { data, error: e } = await fetchReadiness({})
    if (e) { setError(true); setRows([]) } else setRows(data || [])
    setLoading(false)
  }

  // Client metadata (entity type / test flag) — real clients only; test clients are dropped
  // from the firm-wide checklist. clients is already loaded by the parent (no extra query).
  const clientMeta = useMemo(() => {
    const m = new Map()
    for (const c of clients) if (c && c.client_id) m.set(c.client_id, c)
    return m
  }, [clients])
  const testClientIds = useMemo(
    () => new Set(clients.filter(c => c && c.is_test_client === true && c.client_id).map(c => c.client_id)),
    [clients],
  )
  const entityTypeOf = (clientId) => {
    const c = clientMeta.get(clientId)
    return c && c.client_type ? c.client_type : ''
  }

  // Base set = requirements for non-test clients only.
  const baseRows = useMemo(() => rows.filter(r => r && !testClientIds.has(r.client_id)), [rows, testClientIds])
  const excludedTest = rows.length - baseRows.length

  const entityOptions = useMemo(
    () => [...new Set(baseRows.map(r => entityTypeOf(r.client_id)).filter(Boolean))].sort(),
    [baseRows, clientMeta],
  )
  const serviceOptions = useMemo(
    () => [...new Set(baseRows.map(r => r.requirement_ref_type).filter(Boolean))]
      .sort((a, b) => serviceCategoryLabel(a).localeCompare(serviceCategoryLabel(b))),
    [baseRows],
  )
  const fyOptions = useMemo(
    () => [...new Set(baseRows.map(r => r.fy_label).filter(Boolean))].sort().reverse(),
    [baseRows],
  )

  const filtered = useMemo(() => filterChecklist(baseRows, {
    clientId: fClient, entityType: fEntity, entityTypeOf, refType: fService, fyLabel: fFY, state: fState, search,
  }), [baseRows, fClient, fEntity, fService, fFY, fState, search, clientMeta])

  const counts = useMemo(() => summariseChecklist(filtered), [filtered])
  const grouped = useMemo(() => groupChecklist(filtered), [filtered])

  const CAP = 600
  let shown = 0

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input className="dh-search" placeholder="🔍 Search client, document, service…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="dh-sel" value={fClient} onChange={e => setFClient(e.target.value)}>
          <option value="">All Clients</option>
          {clients.filter(c => !testClientIds.has(c.client_id)).map(c => <option key={c.client_id} value={c.client_id}>{c.client_id} — {c.name}</option>)}
        </select>
        <select className="dh-sel" value={fEntity} onChange={e => setFEntity(e.target.value)}>
          <option value="">All Entity Types</option>
          {entityOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="dh-sel" value={fService} onChange={e => setFService(e.target.value)}>
          <option value="">All Services</option>
          {serviceOptions.map(t => <option key={t} value={t}>{serviceCategoryLabel(t)}</option>)}
        </select>
        <select className="dh-sel" value={fFY} onChange={e => setFFY(e.target.value)}>
          <option value="">All FY</option>
          {fyOptions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="dh-sel" value={fState} onChange={e => setFState(e.target.value)}>
          <option value="">All Readiness</option>
          <option value="missing">Missing</option>
          <option value="provided">Provided</option>
          <option value="replaced">Replaced</option>
        </select>
      </div>

      {/* Counts — Required / Missing / Provided / Replaced. Hidden while loading or on error so
          a failed load never renders a misleading "0 missing". */}
      {!loading && !error && (
        <div className="dh-stats" style={{ marginBottom: 14 }}>
          <div className="dh-stat"><div className="dh-stat-n">{counts.required}</div><div className="dh-stat-l">Required</div></div>
          <div className="dh-stat"><div className="dh-stat-n" style={{ color: counts.missing > 0 ? '#B45309' : '#166534' }}>{counts.missing}</div><div className="dh-stat-l">Missing</div></div>
          <div className="dh-stat"><div className="dh-stat-n">{counts.provided}</div><div className="dh-stat-l">Provided</div></div>
          <div className="dh-stat"><div className="dh-stat-n">{counts.replaced}</div><div className="dh-stat-l">Replaced</div></div>
        </div>
      )}

      {loading ? <div className="dh-empty">Loading document checklist…</div>
        : error ? <div className="dh-empty">Could not load the document checklist. <button className="dh-up" onClick={load} style={{ marginLeft: 8 }}>Retry</button></div>
          : filtered.length === 0 ? (
            <div className="dh-empty">
              <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#6B7280' }}>No requirements match this filter</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {grouped.map(svc => (
                <div key={svc.service}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#13241D' }}>{svc.serviceLabel}</div>
                    <div style={{ fontSize: 11.5, color: '#6B7280' }}>
                      {svc.summary.required} required · {svc.summary.missing} missing · {svc.summary.available} provided
                    </div>
                  </div>
                  {svc.groups.map(g => (
                    <div key={`${svc.service}:${g.fyLabel}`} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#374151', margin: '4px 0' }}>
                        {g.fyLabel === '—' ? 'Permanent / master (no FY)' : `FY ${g.fyLabel}`}
                        <span style={{ fontWeight: 500, color: '#9CA3AF' }}> · {g.summary.missing}/{g.summary.required} missing</span>
                      </div>
                      <table className="dh-table">
                        <thead><tr><th>Document</th><th>Client</th><th>Entity</th><th>FY / Period</th><th>Readiness</th><th>Current document</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                        <tbody>
                          {g.rows.map(r => {
                            if (shown >= CAP) return null
                            shown++
                            return (
                              <tr key={`${r.requirement_ref_type}:${r.requirement_ref_id}`}>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{r.requirement_label || r.doc_type}</div>
                                  {!isFyScoped(r) && <span className="dh-badge" style={{ background: '#EDE9FE', color: '#5B21B6', marginTop: 2 }}>Permanent</span>}
                                </td>
                                <td><div style={{ fontWeight: 600 }}>{r.client_name || r.client_id}</div><div style={{ fontSize: 10.5, color: '#9CA3AF' }}>{r.client_id}</div></td>
                                <td style={{ fontSize: 11.5, color: '#6B7280' }}>{entityTypeOf(r.client_id) || '—'}</td>
                                <td style={{ fontSize: 11.5, color: '#6B7280' }}>{r.fy_label || '—'}{r.period ? ` · ${r.period}` : ''}</td>
                                <td><StateBadge row={r} /></td>
                                <td style={{ fontSize: 11, color: '#6B7280', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {r.current_document_name || '—'}
                                  {r.latest_upload_at && <div style={{ fontSize: 10, color: '#9CA3AF' }}>{fmtDate(r.latest_upload_at)}</div>}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button className="dh-ibtn" title="Manage / upload document" style={{ width: 'auto', padding: '0 10px', fontSize: 11, fontWeight: 600 }}
                                    onClick={() => onManage?.(requirementToManagePayload(r))}>
                                    {classifyRequirementState(r) === 'missing' ? 'Upload' : 'Manage'}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

      {!loading && !error && filtered.length > CAP && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: '#9CA3AF' }}>Showing first {CAP} of {filtered.length} requirements. Narrow the filters to see the rest.</div>
      )}
      {!loading && !error && excludedTest > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#9CA3AF' }}>{excludedTest} requirement{excludedTest !== 1 ? 's' : ''} from test client(s) excluded.</div>
      )}
    </div>
  )
}
