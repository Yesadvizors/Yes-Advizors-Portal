import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import DirectorTrackerModal from './DirectorTrackerModal'
import DINHolderModal from './DINHolderModal'

// Director KYC — Phase 2B client-led tracker (Pankaj-only).
// Primary flow: select Company -> load that company's onboarding directors
// via dkyc_list_client_directors -> per-director tracker (DirectorTrackerModal).
// DIN is fetched from onboarding and shown read-only; it is never typed here.
// No DSC fields. Standalone DIN-holder creation is a secondary exceptional path.

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}
function changeDoneLabel(v) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return 'Not recorded'
}

export default function DirectorKYC({ user }) {
  const [clients, setClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [search, setSearch] = useState('')

  const [rows, setRows] = useState([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [err, setErr] = useState('')

  const [trackDir, setTrackDir] = useState(null)   // director row for the tracker modal
  const [showStandalone, setShowStandalone] = useState(false)

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoadingClients(true)
    const { data, error } = await supabase
      .from('clients')
      .select('id, client_id, name')
      .eq('is_draft', false)
      .order('name')
    if (error) { setErr('Could not load companies: ' + error.message); setClients([]); setLoadingClients(false); return }
    setClients(data || [])
    setLoadingClients(false)
  }

  async function loadDirectors(cid) {
    if (!cid) { setRows([]); return }
    setLoadingRows(true); setErr('')
    const { data, error } = await supabase.rpc('dkyc_list_client_directors', { p_client_id: cid })
    if (error) { setErr(readErr(error)); setRows([]); setLoadingRows(false); return }
    setRows(Array.isArray(data) ? data : [])
    setLoadingRows(false)
  }

  function readErr(error) {
    const msg = (error && (error.message || String(error))) || ''
    const map = {
      CLIENT_NOT_FOUND: 'That company could not be found.',
      CLIENT_IS_DRAFT: 'This company is still a draft. Complete onboarding before Director KYC.',
      CLIENT_DRAFT_STATE_UNKNOWN: 'This company’s draft status is unknown. Please review it in Client Onboarding.',
      CLIENT_CODE_MISSING: 'This company has no client code. Please review it in Client Onboarding.',
      KYC_FREQUENCY_NOT_CONFIGURED: 'KYC frequency is not configured. Contact the administrator.',
    }
    for (const k of Object.keys(map)) if (msg.includes(k)) return map[k]
    return msg || 'Something went wrong. Please try again.'
  }

  function onSelectClient(cid) {
    setClientId(cid)
    const c = clients.find(x => x.id === cid)
    setClientName(c ? `${c.name} (${c.client_id})` : '')
    loadDirectors(cid)
  }

  const visibleClients = clients.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return (c.name || '').toLowerCase().includes(s) || (c.client_id || '').toLowerCase().includes(s)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Director KYC</h1>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>DIR-3 KYC tracker · select a company to load its directors</p>
        </div>
        <button onClick={() => setShowStandalone(true)} style={btnSecondary}
          title="Exceptional: add a DIN holder for a person not linked to an existing client">
          + Standalone DIN holder
        </button>
      </div>

      {/* Company selector */}
      <div className="card" style={{ padding: 16, margin: '20px 0' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search company by name or code…"
            style={{ flex: 1, minWidth: 220, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
          <select value={clientId} onChange={e => onSelectClient(e.target.value)} style={selectStyle} disabled={loadingClients}>
            <option value="">{loadingClients ? 'Loading companies…' : 'Select a company…'}</option>
            {visibleClients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.client_id})</option>)}
          </select>
        </div>
      </div>

      {err && (
        <div className="card" style={{ padding: 16, marginBottom: 16, borderColor: 'var(--red)', color: 'var(--red)', fontSize: 14 }}>{err}</div>
      )}

      {!clientId ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>
          Select a company above to load the directors recorded during Client Onboarding.
        </div>
      ) : loadingRows ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading directors…</div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>
          No active directors recorded for this company in Client Onboarding.
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
                  // Per approved rules — derive blocking state from server flags only.
                  // Never infer link status from din_holder_id.
                  const holderInactive = r.din_holder_exists === true && r.din_holder_active !== true
                  const linkInactive = r.company_link_exists === true && r.company_link_active !== true
                  const trackingRequired = r.company_link_exists !== true // no active/any link yet
                  let blockMsg = null
                  if (missingDin) blockMsg = 'DIN is missing in Client Onboarding. Please update the director record first.'
                  else if (holderInactive) blockMsg = 'This DIN holder is inactive. Please review/reactivate it before tracking KYC.'
                  else if (linkInactive) blockMsg = 'This company link is inactive. Please review/reactivate it before tracking KYC.'
                  return (
                    <tr key={r.director_id} style={{ borderTop: '1px solid var(--border2)' }}>
                      <td style={td}>{clientName.replace(/\s*\(.*\)$/, '')}</td>
                      <td style={td}>{r.name}</td>
                      <td style={td}>
                        {missingDin
                          ? <span style={{ color: 'var(--red)' }}>—</span>
                          : <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.din}</span>}
                      </td>
                      <td style={td}>{fmtDate(r.din_allotment_date)}</td>
                      <td style={td}>{r.last_kyc_display || '—'}</td>
                      <td style={td}>{changeDoneLabel(r.kyc_change_done)}</td>
                      <td style={td}>{r.next_kyc_display || '—'}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {blockMsg ? (
                          <span style={{ color: 'var(--red)', fontSize: 12 }}>{blockMsg}</span>
                        ) : (
                          <button onClick={() => setTrackDir(r)} style={btnLink}>
                            {trackingRequired ? 'Start Tracking' : 'Track KYC'}
                          </button>
                        )}
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
          clientId={clientId}
          clientName={clientName}
          director={trackDir}
          onClose={() => setTrackDir(null)}
          onSaved={() => { setTrackDir(null); loadDirectors(clientId) }}
        />
      )}

      {showStandalone && (
        <DINHolderModal onClose={() => setShowStandalone(false)} onSaved={() => setShowStandalone(false)} />
      )}
    </div>
  )
}

const btnSecondary = { background: '#fff', color: 'var(--dkgreen)', border: '1px solid var(--dkgreen)', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const btnLink = { background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 8px' }
const selectStyle = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: '#fff', minWidth: 240 }
const th = { padding: '12px 14px', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }
const td = { padding: '12px 14px', verticalAlign: 'middle' }
