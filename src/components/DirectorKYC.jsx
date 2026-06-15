import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import DirectorTrackerModal from './DirectorTrackerModal'
import DINHolderModal from './DINHolderModal'
import { monYYYY, fmtDateOnly } from './dkycFormat'

// Director KYC — Phase 2B consolidated (Pankaj-only).
// Two ways in:
//   (A) Global search by director OR company name via dkyc_search_directors,
//       returning one row per company-director relationship (Company, Director, DIN, ...).
//   (B) Per-company view via dkyc_list_client_directors (select a company).
// DIN is read-only from onboarding; no DSC fields. Standalone DIN-holder
// creation remains a secondary exceptional path.

function changeDoneLabel(v) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return 'Not recorded'
}
// Map a search-RPC row (client_id/company_name/director_name) and a list-RPC row
// (no company fields) into a single shape the modal + grid understand.
function normalizeRow(r, companyNameFallback, clientIdFallback) {
  return {
    director_id: r.director_id,
    client_id: r.client_id || clientIdFallback,
    company_name: r.company_name || companyNameFallback || '',
    name: r.director_name || r.name,
    din: r.din,
    din_present: r.din_present,
    din_holder_id: r.din_holder_id,
    din_holder_exists: r.din_holder_exists,
    din_holder_active: r.din_holder_active,
    din_allotment_date: r.din_allotment_date,
    last_kyc_month: r.last_kyc_month,
    kyc_change_done: r.kyc_change_done,
    next_kyc_month: r.next_kyc_month,
    din_holder_company_id: r.din_holder_company_id,
    company_link_exists: r.company_link_exists,
    company_link_active: r.company_link_active,
    role: r.role || null,
    appointment_date: r.appointment_date || null,
  }
}

const ERR = {
  CLIENT_NOT_FOUND: 'That company could not be found.',
  CLIENT_IS_DRAFT: 'This company is still a draft. Complete onboarding before Director KYC.',
  CLIENT_DRAFT_STATE_UNKNOWN: 'This company’s draft status is unknown. Please review it in Client Onboarding.',
  CLIENT_CODE_MISSING: 'This company has no client code. Please review it in Client Onboarding.',
  KYC_FREQUENCY_NOT_CONFIGURED: 'KYC frequency is not configured. Contact the administrator.',
}
function readErr(error) {
  const msg = (error && (error.message || String(error))) || ''
  for (const k of Object.keys(ERR)) if (msg.includes(k)) return ERR[k]
  return msg || 'Something went wrong. Please try again.'
}

export default function DirectorKYC({ user }) {
  const [mode, setMode] = useState('search')
  const [query, setQuery] = useState('')
  const [searchRows, setSearchRows] = useState([])
  const [searched, setSearched] = useState(false)
  const [clients, setClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [companyRows, setCompanyRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [trackDir, setTrackDir] = useState(null)
  const [showStandalone, setShowStandalone] = useState(false)

  useEffect(() => { if (mode === 'company' && clients.length === 0) loadClients() }, [mode])

  async function runSearch() {
    const q = query.trim()
    setErr('')
    if (q.length < 2) { setErr('Type at least 2 characters to search.'); return }
    setBusy(true); setSearched(true)
    const { data, error } = await supabase.rpc('dkyc_search_directors', { p_query: q })
    setBusy(false)
    if (error) { setErr(readErr(error)); setSearchRows([]); return }
    setSearchRows((Array.isArray(data) ? data : []).map(r => normalizeRow(r)))
  }

  async function loadClients() {
    setLoadingClients(true)
    const { data, error } = await supabase.from('clients').select('id, client_id, name').eq('is_draft', false).order('name')
    setLoadingClients(false)
    if (error) { setErr('Could not load companies: ' + error.message); return }
    setClients(data || [])
  }
  async function loadCompanyDirectors(cid) {
    if (!cid) { setCompanyRows([]); return }
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('dkyc_list_client_directors', { p_client_id: cid })
    setBusy(false)
    if (error) { setErr(readErr(error)); setCompanyRows([]); return }
    const c = clients.find(x => x.id === cid)
    setCompanyRows((Array.isArray(data) ? data : []).map(r => normalizeRow(r, c ? c.name : '', cid)))
  }
  function onSelectClient(cid) {
    setClientId(cid)
    const c = clients.find(x => x.id === cid)
    setClientName(c ? c.name : '')
    loadCompanyDirectors(cid)
  }

  function refreshActive() {
    if (mode === 'search' && searched) runSearch()
    else if (mode === 'company' && clientId) loadCompanyDirectors(clientId)
  }

  const rows = mode === 'search' ? searchRows : companyRows

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Director KYC</h1>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>DIR-3 KYC tracker · search by director or company</p>
        </div>
        <button onClick={() => setShowStandalone(true)} style={btnSecondary}
          title="Exceptional: add a DIN holder for a person not linked to an existing client">
          + Standalone DIN holder
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <button onClick={() => setMode('search')} style={pill(mode === 'search')}>Global search</button>
        <button onClick={() => setMode('company')} style={pill(mode === 'company')}>By company</button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        {mode === 'search' ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
              placeholder="🔍 Search a director or company (e.g. Aarti Joshi, Yes Advisors)…"
              style={{ flex: 1, minWidth: 260, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
            <button onClick={runSearch} disabled={busy} style={{ ...btnSecondary, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Searching…' : 'Search'}
            </button>
          </div>
        ) : (
          <select value={clientId} onChange={e => onSelectClient(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }} disabled={loadingClients}>
            <option value="">{loadingClients ? 'Loading companies…' : 'Select a company…'}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.client_id})</option>)}
          </select>
        )}
      </div>

      {err && <div className="card" style={{ padding: 14, marginBottom: 16, borderColor: 'var(--red)', color: 'var(--red)', fontSize: 14 }}>{err}</div>}

      {rows.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>
          {mode === 'search'
            ? (searched ? 'No matching directors or companies.' : 'Search by a director name or a company name to begin.')
            : (clientId ? 'No active directors recorded for this company in Client Onboarding.' : 'Select a company to load its directors.')}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--ltgray)', textAlign: 'left', color: 'var(--gray)' }}>
                  <th style={th}>Company Name</th>
                  <th style={th}>Director Name</th>
                  <th style={th}>DIN Number</th>
                  <th style={th}>DIN Allotment Date</th>
                  <th style={th}>Last KYC</th>
                  <th style={th}>Change Done</th>
                  <th style={th}>Next KYC</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const missingDin = !r.din_present
                  const holderInactive = r.din_holder_exists === true && r.din_holder_active !== true
                  const linkInactive = r.company_link_exists === true && r.company_link_active !== true
                  let blockMsg = null
                  if (missingDin) blockMsg = 'DIN is missing in Client Onboarding. Please update the director record first.'
                  else if (holderInactive) blockMsg = 'This DIN holder is inactive. Please review/reactivate it before tracking KYC.'
                  else if (linkInactive) blockMsg = 'This company link is inactive. Please review/reactivate it before tracking KYC.'
                  return (
                    <tr key={`${r.client_id}:${r.director_id}`} style={{ borderTop: '1px solid var(--border2)' }}>
                      <td style={td}>{r.company_name}</td>
                      <td style={td}>{r.name}</td>
                      <td style={td}>
                        {missingDin ? <span style={{ color: 'var(--red)' }}>—</span>
                          : <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.din}</span>}
                      </td>
                      <td style={td}>{fmtDateOnly(r.din_allotment_date)}</td>
                      <td style={td}>{monYYYY(r.last_kyc_month) || '—'}</td>
                      <td style={td}>{changeDoneLabel(r.kyc_change_done)}</td>
                      <td style={td}>{monYYYY(r.next_kyc_month) || '—'}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {blockMsg ? <span style={{ color: 'var(--red)', fontSize: 12 }}>{blockMsg}</span>
                          : <button onClick={() => setTrackDir(r)} style={btnLink}>Open KYC</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {trackDir && (
        <DirectorTrackerModal
          clientId={trackDir.client_id}
          clientName={trackDir.company_name}
          director={trackDir}
          onClose={() => setTrackDir(null)}
          onSaved={() => { refreshActive() }}
        />
      )}
      {showStandalone && <DINHolderModal onClose={() => setShowStandalone(false)} onSaved={() => setShowStandalone(false)} />}
    </div>
  )
}

const btnSecondary = { background: '#fff', color: 'var(--dkgreen)', border: '1px solid var(--dkgreen)', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const btnLink = { background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 8px' }
const pill = (on) => ({ background: on ? 'var(--dkgreen)' : '#fff', color: on ? '#fff' : 'var(--gray)', border: `1px solid ${on ? 'var(--dkgreen)' : 'var(--border)'}`, padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer' })
const th = { padding: '12px 14px', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }
const td = { padding: '12px 14px', verticalAlign: 'middle' }
