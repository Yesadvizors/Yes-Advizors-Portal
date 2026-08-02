import { useState, useEffect, useCallback } from 'react'
import { useEscapeKey } from '../useEscapeKey'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'
import OnboardingWizard from './OnboardingWizard'
import ClientMasterPreview from './preview/ClientMasterPreview'
import { previewEntryVisible } from '../lib/clientMaster'
import { hydratedAadhaar, displayAadhaar } from '../lib/aadhaar'
import { complianceOutcome, resyncMessage } from '../lib/compliance'
import { fyCoverage } from '../lib/financialYear'
import { runComplianceSetup } from '../lib/complianceRunner'
import DocumentManager from './DocumentManager'
import { PageHeader, Button, StatusBadge, Card, LoadingState, ErrorState, EmptyState } from './ui'

const DIR_PALETTE = [
  { bg: '#DBEAFE', text: '#1D4ED8' }, { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#F3E8FF', text: '#7C3AED' }, { bg: '#FCE7F3', text: '#BE185D' },
  { bg: '#D1FAE5', text: '#065F46' },
]
function initials(name) {
  return (name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const css = `
.cd-overlay{position:fixed;inset:0;background:rgba(10,22,40,.5);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);z-index:2000;display:flex;align-items:flex-start;justify-content:center;padding:14px 16px;overflow-y:auto;animation:cdFade .22s ease}
.cd-modal{font-family:var(--ds-font);background:var(--ds-surface);border-radius:var(--ds-r-xl);width:100%;max-width:940px;margin-top:14px;overflow:hidden;box-shadow:var(--ds-shadow-lg);animation:cdRise .36s cubic-bezier(.22,1,.36,1)}
@keyframes cdFade{from{opacity:0}to{opacity:1}}
@keyframes cdRise{from{opacity:0;transform:translateY(22px) scale(.987)}to{opacity:1;transform:none}}
.cd-head{position:relative;background:var(--ds-surface);border-bottom:1px solid var(--ds-border);padding:24px 26px 20px;overflow:hidden}
.cd-mono{width:42px;height:42px;border-radius:var(--ds-r-lg);background:linear-gradient(135deg,var(--ds-brand) 0%,var(--ds-brand-700) 100%);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;letter-spacing:.5px;color:#fff;flex-shrink:0;box-shadow:var(--ds-shadow-sm)}
.cd-eyebrow{font-size:9.5px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ds-primary);font-weight:700;margin-bottom:2px}
.cd-name{font-family:var(--ds-font);font-size:var(--ds-fs-2xl);font-weight:700;color:var(--ds-text);letter-spacing:.2px;line-height:1.2}
.cd-close{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:var(--ds-r);border:1px solid var(--ds-border);background:var(--ds-surface);color:var(--ds-text-subtle);font-size:14px;cursor:pointer;transition:.2s;z-index:2;display:flex;align-items:center;justify-content:center}
.cd-close:hover{background:var(--ds-n-100);color:var(--ds-text);transform:rotate(90deg)}
.cd-pills{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;position:relative;z-index:1}
.cd-idpill{display:inline-flex;align-items:center;gap:6px;background:var(--ds-primary-light);border:1px solid var(--ds-primary-border);color:var(--ds-primary);padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:1.2px}
.cd-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 11px;border-radius:99px;font-size:10.5px;font-weight:700;letter-spacing:.4px}
.cd-body{padding:22px 26px;max-height:66vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--ds-n-300) transparent;background:var(--ds-surface)}
.cd-body::-webkit-scrollbar{width:5px}
.cd-body::-webkit-scrollbar-thumb{background:var(--ds-n-300);border-radius:99px}
.cd-sec{font-size:var(--ds-fs-2xs);font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--ds-text-subtle);display:flex;align-items:center;gap:12px;margin:14px 0 14px}
.cd-sec::after{content:'';flex:1;height:1px;background:var(--ds-border)}
.cd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px 18px;margin-bottom:6px}
.cd-fld .k{font-size:var(--ds-fs-2xs);font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--ds-text-subtle);margin-bottom:3px}
.cd-fld .v{font-size:var(--ds-fs-md);font-weight:600;color:var(--ds-text)}
.cd-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px}
.cd-chip{display:flex;align-items:center;gap:8px;padding:6px 13px 6px 7px;border-radius:99px;border:1px solid var(--ds-border-strong);background:var(--ds-surface);font-size:12.5px;font-weight:600;color:var(--ds-text)}
.cd-chip .av{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
.cd-svc{display:inline-flex;align-items:center;padding:4px 11px;background:var(--ds-brand-50);color:var(--ds-brand-700);border-radius:99px;font-size:11.5px;font-weight:600;border:1px solid var(--ds-brand-200)}
`


// ── Re-sync Compliance Button ─────────────────────────────────
// This button used to lie in TWO different ways.
//
// 1. (R2 Rev 1.0) The RPC result was never even destructured —
//
//        await supabase.rpc('generate_client_compliance', {...})
//        setDone(true)                                    // ← unconditional
//        ... done ? '✅ Synced!' : ...
//
//    so a permission error, a network failure or a Postgres exception all produced a
//    cheerful green "✅ Synced!".
//
// 2. (R2 Rev 1.1 — this fix) Even once the error was checked, the button ran ONLY
//    generate_client_compliance. It never activated accounting and never populated the
//    calendar. So when onboarding's failure screen told the user "use Re-sync Compliance
//    to retry", and the thing that had failed was accounting or the calendar, Re-sync
//    could not repair it — and because generate_client_compliance is idempotent it would
//    return success and the button would go green anyway. The advice was wrong and the
//    result was still misleading. The client stayed half-configured.
//
// The cause of (2) was structural: this component had its own private copy of the
// sequence, so it drifted from the wizard's. Both now call the SAME runner
// (src/lib/complianceRunner.js), which executes every stage — check, generate, accounting,
// calendar — and reports each one. Adding a stage there gives it to both paths.
//
// RETRY SAFETY: see the idempotency note in complianceRunner.js. Pressing this repeatedly
// creates only what is missing; nothing existing is deleted or overwritten.
function ResyncButton({ client }) {
  const [state, setState] = useState({ status: 'idle' })   // idle | loading | done | error

  async function resync() {
    if (state.status === 'loading') return
    if (!window.confirm(`Re-sync compliance for ${client.name}? This creates any missing records — compliance trackers, accounting and the calendar. Existing records are retained; nothing is duplicated or deleted.`)) return

    setState({ status: 'loading' })

    // The COMPLETE sequence, not just generation.
    const stages = await runComplianceSetup(supabase, { client, clientCode: client.client_id })
    const outcome = complianceOutcome(stages)
    const message = resyncMessage(stages)

    // The button may go green ONLY if every attempted stage reported ok === true.
    if (!outcome.ok) {
      setState({ status: 'error', message })
      const detail = outcome.errors
        .map(e => `• ${e.stage}: ${e.error || 'failed'}`)
        .join('\n')
      alert(
        `${message}\n\nClient: ${client.name}\n\n${detail}\n\n` +
        'Nothing existing was changed or deleted. Retrying is safe — it only creates what is still missing.'
      )
      return
    }

    // P6A: the old SQL ceiling this guard was built for is gone. Migration 0014 made the
    // RPCs generate through get_current_fy() and raise on an empty range, and the P6
    // SELECT-only diagnosis verified the live backend generates the current FY (2026-27) —
    // so fyCoverage() no longer raises the stale "database can only generate up to FY
    // 2025-26" alarm for the current year. The guard is KEPT, but only as a fail-closed
    // check: !coverage.ok now means the current FY itself could not be determined (a broken
    // clock, or financial_years not seeded for today). A genuine backend generation failure
    // instead surfaces as a failed stage above. The user message is driven entirely by
    // coverage.reason so it never asserts a ceiling that no longer exists.
    const coverage = fyCoverage()
    if (!coverage.ok) {
      setState({ status: 'error', message: coverage.reason })
      alert(
        `Compliance setup for ${client.name} could not be confirmed as covering the current financial year.\n\n` +
        `${coverage.reason}\n\n` +
        'Existing records were retained and nothing was deleted or changed.'
      )
      return
    }

    setState({ status: 'done', message })
    setTimeout(() => setState(s => (s.status === 'done' ? { status: 'idle' } : s)), 4000)
  }

  const failed = state.status === 'error'
  const busy   = state.status === 'loading'

  return (
    <button onClick={resync} disabled={busy} title={state.message || undefined}
      style={{ fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:8,
        border: failed ? '1px solid var(--ds-danger-bd)' : '1px solid var(--ds-brand-200)',
        background: failed ? 'var(--ds-danger-bg)' : 'var(--ds-brand-50)',
        color: failed ? 'var(--ds-danger)' : 'var(--ds-brand-700)', cursor: busy ? 'not-allowed' : 'pointer' }}>
      {busy ? '⏳ Syncing...'
        : state.status === 'done' ? '✅ Compliance setup completed'
        : failed ? '⚠️ Sync incomplete — retry'
        : '🔄 Re-sync Compliance'}
    </button>
  )
}

export default function Clients({ user }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [viewClient, setViewClient] = useState(null)
  const [editClient, setEditClient] = useState(null)
  const [directorsMap, setDirectorsMap] = useState({}) // client_id → directors array
  // P2.1: read-only Client Master Preview (feature-flagged, Admin/Manager only).
  const [previewClient, setPreviewClient] = useState(null)
  const previewEnabled = previewEntryVisible(import.meta.env.VITE_P2_PREVIEW, user)

  // Fetch directors from proper table when a client is viewed
  useEffect(() => {
    if (!viewClient) return
    supabase.from('client_directors')
      .select('*')
      .eq('client_id', viewClient.client_id)
      .eq('is_active', true)
      .order('is_primary_contact', { ascending: false })
      .order('created_at')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDirectorsMap(prev => ({ ...prev, [viewClient.client_id]: data }))
        }
      })
  }, [viewClient])
  // Global ESC to close client detail modal
  const closeViewClient = useCallback(() => setViewClient(null), [])
  useEscapeKey(closeViewClient)
  const [pinResetMsg, setPinResetMsg] = useState(null)

  async function resetClientPin(clientId, clientName) {
    if (!window.confirm(`Reset WhatsApp PIN for ${clientName}?\n\nThe client will be asked to set a new PIN on their next WhatsApp session.`)) return
    const { error } = await supabase.from('clients').update({ doc_pin: null }).eq('client_id', clientId)
    if (error) { setPinResetMsg({ ok: false, msg: 'Error: ' + error.message }); return }
    setPinResetMsg({ ok: true, msg: `PIN reset for ${clientName}. They will set a new PIN on next WhatsApp login.` })
    setTimeout(() => setPinResetMsg(null), 5000)
    load()
  }
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  useEffect(() => { load() }, [])
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setViewClient(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  async function load() {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    if (error) {
      // Surface the failure instead of rendering it as an empty register — an
      // error and "no clients yet" must never look the same to staff. Keep the
      // raw error in the console only; users see a business-safe message.
      console.error('[Clients] Failed to load client register:', error)
      setLoadError(true)
      setClients([])
    } else {
      setClients(data || [])
    }
    setLoading(false)
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.client_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile || '').includes(search) ||
    (c.pan || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const c = viewClient

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} onboarded client${clients.length === 1 ? '' : 's'}`}
        actions={<Button variant="primary" onClick={() => { setEditClient(null); setShowWizard(true) }}>🚀 Start onboarding</Button>}
      />

      <div className="ds-filter-bar">
        <div className="ds-search">
          <span className="ds-search-ico" aria-hidden="true">🔍</span>
          <input className="ds-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name, client ID, mobile, or PAN…" aria-label="Search clients" />
        </div>
      </div>

      {loading ? (
        <Card><LoadingState label="Loading client register…" /></Card>
      ) : loadError ? (
        <Card>
          <ErrorState
            title="Couldn't load the client register"
            message="We couldn't load the client register. Please retry. If the problem continues, contact the portal administrator."
          />
          <div style={{ textAlign: 'center', paddingBottom: 24, marginTop: -8 }}>
            <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={load}>Retry</button>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="👥"
            title={search ? 'No matching clients' : 'No clients yet'}
            message={search ? 'No clients match your search. Try a different name, client ID, mobile or PAN.' : 'No clients found. Use “Start onboarding” above to add your first client.'}
          />
        </Card>
      ) : (
        <>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>PAN</th>
                  <th>Status</th>
                  <th>Client ID</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {filtered.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE).map(cl => (
                  <tr key={cl.id} className="ds-table-row-click" onClick={() => setViewClient(cl)}>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        {cl.name}
                        {cl.quick_onboarded && <span className="ds-badge ds-badge-warning">Quick</span>}
                        {cl.status === 'Draft' && (
                          <button onClick={e => { e.stopPropagation(); setEditClient(cl); setShowWizard(true) }} className="ds-btn ds-btn-ghost ds-btn-sm" style={{ padding: '2px 9px' }}>✏️ Edit draft</button>
                        )}
                      </div>
                      <div className="ds-td-muted" style={{ fontSize: 12, marginTop: 2 }}>{cl.client_type || '—'}</div>
                    </td>
                    <td className="ds-td-muted">{[cl.mobile && '+91 ' + cl.mobile, cl.email].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="ds-td-muted ds-mono-num">{cl.pan || '—'}</td>
                    <td>{cl.status ? <StatusBadge status={cl.status} /> : <span className="ds-td-muted">—</span>}</td>
                    <td><span className="ds-badge ds-badge-success">{cl.client_id}</span></td>
                    <td style={{ textAlign: 'right', color: 'var(--ds-text-faint)', fontSize: 16 }} aria-hidden="true">›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="ds-pagination">
              <span className="ds-pagination-info">Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <div className="ds-pagination-controls">
                <button className="ds-btn ds-btn-secondary ds-btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}>‹ Prev</button>
                <span className="ds-pagination-info">Page {safePage} of {totalPages}</span>
                <button className="ds-btn ds-btn-secondary ds-btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Next ›</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PREMIUM CLIENT DETAIL MODAL ── */}
      {c && (
        <div className="cd-overlay" onClick={e => e.target === e.currentTarget && setViewClient(null)}>
          <style>{css}</style>
          <div className="cd-modal">

            {/* Header */}
            <div className="cd-head">
              <div style={{ position:'absolute', top:14, right:52, zIndex:2, display:'flex', gap:8 }}>
                {previewEnabled && (
                  <button onClick={() => { setPreviewClient(c); setViewClient(null) }}
                    title="Read-only normalized Client Master (Preview)"
                    style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--ds-border-strong)', background:'var(--ds-surface)', color:'var(--ds-primary)', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                    🧩 Client Master (Preview)
                  </button>
                )}
                <button onClick={() => { setEditClient(c); setShowWizard(true); setViewClient(null) }}
                  style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--ds-border-strong)', background:'var(--ds-surface)', color:'var(--ds-text-muted)', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                  ✏️ Edit
                </button>
                <button onClick={() => resetClientPin(c.client_id, c.name)}
                  style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--ds-danger-bd)', background:'var(--ds-danger-bg)', color:'var(--ds-danger)', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                  🔓 Reset PIN
                </button>
              </div>
            <button className="cd-close" onClick={() => setViewClient(null)}>✕</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, position: 'relative', zIndex: 1 }}>
                <div className="cd-mono">YA</div>
                <div>
                  <div className="cd-eyebrow">Yes Advizors · Client Record</div>
                  <div className="cd-name">{c.name}</div>
                </div>
              </div>
              <div className="cd-pills">
                <span className="cd-idpill">✦ {c.client_id}</span>
                {c.client_type && <span className="cd-idpill" style={{ letterSpacing: '.4px' }}>{c.client_type}</span>}
                <span className="cd-badge" style={
                  c.status === 'Active' ? { background: 'var(--ds-success-bg)', color: 'var(--ds-success)', border: '1px solid var(--ds-success-bd)' }
                  : c.status === 'Draft' ? { background: 'var(--ds-neutral-bg)', color: 'var(--ds-text-muted)', border: '1px solid var(--ds-border)' }
                  : { background: 'var(--ds-neutral-bg)', color: 'var(--ds-text-muted)', border: '1px solid var(--ds-border)' }
                }>● {c.status || 'Active'}</span>
              </div>
            </div>

            {/* Body */}
            <div className="cd-body">
              <div className="cd-sec">Contact Information</div>
              <div className="cd-grid">
                <CdFld k="Mobile"       v={c.mobile ? '+91 ' + c.mobile : '—'} />
                <CdFld k="Email"        v={c.email || '—'} />
                <CdFld k="Onboarded"    v={fmtDate(c.created_at)} />
                <CdFld k="Onboarded By" v={c.onboarded_by || '—'} />
              </div>

              <div className="cd-sec">Tax Registrations</div>
              <div className="cd-grid">
                <CdFld k="PAN"              v={c.pan   || '—'} />
                <CdFld k="GSTIN"            v={c.gstin || '—'} />
                {c.gst_registration_date && <CdFld k="GST Registration Date" v={fmtDate(c.gst_registration_date)} />}
                <CdFld k="TAN"              v={c.tan   || '—'} />
                {c.udyam_no  && <CdFld k="Udyam / MSME No."  v={c.udyam_no} />}
                {c.iec_no    && <CdFld k="IEC No."            v={c.iec_no} />}
                {c.pf_no     && <CdFld k="PF No."             v={c.pf_no} />}
                {c.esi_no    && <CdFld k="ESI No."            v={c.esi_no} />}
                {c.shop_estb_no && <CdFld k="Shop & Estb. No."  v={c.shop_estb_no} />}
                {c.shop_estb_state && <CdFld k="S&E State"    v={c.shop_estb_state} />}
              </div>

              {['Private Limited Company','Public Limited Company','Section 8 Company','LLP'].includes(c.client_type) && (
                <>
                  <div className="cd-sec">Company Registration</div>
                  <div className="cd-grid">
                    <CdFld k="CIN / LLPIN"          v={c.cin || '—'} />
                    <CdFld k="Client Type"           v={c.client_type} />
                    <CdFld k="Client Code"           v={c.client_id} />
                    {c.date_of_incorporation && <CdFld k="Date of Incorporation" v={fmtDate(c.date_of_incorporation)} />}
                  </div>
                </>
              )}

              <div className="cd-sec">Registered Address</div>
              <div style={{ marginBottom: 14 }}>
                {c.address
                  ? <div style={{ fontSize: 13, color: 'var(--ds-text)', lineHeight: 1.6, marginBottom: 6 }}>{c.address}</div>
                  : <div style={{ fontSize: 12.5, color: 'var(--ds-text-faint)', fontStyle: 'italic', marginBottom: 6 }}>No address recorded</div>
                }
                {(c.city || c.state || c.pincode) && (
                  <div className="cd-grid">
                    {c.city    && <CdFld k="City"    v={c.city} />}
                    {c.state   && <CdFld k="State"   v={c.state} />}
                    {c.pincode && <CdFld k="Pincode" v={c.pincode} />}
                  </div>
                )}
              </div>

              {c.services && c.services.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div className="cd-sec">Services</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {c.services.map(s => <span key={s} className="cd-svc">{s}</span>)}
                  </div>
                </div>
              )}

              {(() => {
                const dirs = directorsMap[c.client_id] || (c.directors && c.directors.length > 0 ? c.directors.map(d => ({
                  name: d.name, role: d.role, din: d.din, pan: d.pan,
                  mobile: d.mobile,
                  // Masked only. hydratedAadhaar() also covers a legacy row that still
                  // carries a raw `aadhaar`: it derives the mask and discards the raw.
                  aadhaar_masked: hydratedAadhaar(d).aadhaarMasked,
                  email: d.email, dsc_status: null, is_primary_contact: false
                })) : [])
                if (!dirs || dirs.length === 0) return null
                const sectionLabel =
                  c.client_type === 'LLP' ? 'Designated Partners' :
                  c.client_type === 'Partnership Firm' ? 'Partners' :
                  c.client_type === 'Proprietor' ? 'Proprietor' : 'Directors'
                return (
                  <div style={{ marginBottom: 18 }}>
                    <div className="cd-sec">{sectionLabel} ({dirs.length})</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
                      {dirs.map((d, i) => (
                        <div key={d.id || i} style={{ border: '1px solid var(--ds-border)', borderRadius: 12, padding: '14px 16px', background: 'var(--ds-surface-2)', position: 'relative' }}>
                          {d.is_primary_contact && (
                            <span style={{ position:'absolute', top:10, right:10, fontSize:9, fontWeight:700, color:'var(--ds-success)', background:'var(--ds-success-bg)', padding:'1px 6px', borderRadius:99 }}>PRIMARY</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: DIR_PALETTE[i % DIR_PALETTE.length].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: DIR_PALETTE[i % DIR_PALETTE.length].text }}>
                              {initials(d.name)}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-text)' }}>{d.name || '—'}</div>
                              <div style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontWeight: 500 }}>{d.role || 'Director'}</div>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
                            <DirFld label="DIN"     value={d.din || '—'} />
                            <DirFld label="PAN"     value={d.pan || '—'} />
                            <DirFld label="Mobile"  value={d.mobile ? '+91 ' + d.mobile : '—'} />
                            {/* EVERY Aadhaar render goes through displayAadhaar() ->
                                hydratedAadhaar() -> normaliseMask(). Never read
                                d.aadhaar_masked directly: `d.aadhaar_masked || display(d)`
                                short-circuits BEFORE validation, so a malformed or raw
                                value in that field would be rendered verbatim. */}
                            <DirFld label="Aadhaar" value={displayAadhaar(d)} />
                            <DirFld label="Email"   value={d.email || '—'} full />
                            {d.dsc_status && d.dsc_status !== 'Unknown' && (
                              <DirFld label="DSC Status" value={d.dsc_status} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              <div className="cd-sec" style={{ marginTop: 4 }}>Documents</div>
              <DocumentManager client={c} user={user} />
            </div>
          </div>
        </div>
      )}

      {pinResetMsg && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background: pinResetMsg.ok ? 'var(--ds-success)' : 'var(--ds-danger)', color:'#fff', padding:'12px 20px', borderRadius:10, fontSize:13, fontWeight:500, zIndex:9999, boxShadow:'0 4px 20px rgba(0,0,0,.3)', maxWidth:420, textAlign:'center' }}>
          {pinResetMsg.ok ? '✅' : '❌'} {pinResetMsg.msg}
        </div>
      )}
      {showWizard && <OnboardingWizard user={user} editClient={editClient} onClose={() => { setShowWizard(false); setEditClient(null) }} onSaved={() => { setShowWizard(false); setEditClient(null); load() }} />}
      {previewEnabled && previewClient && (
        <ClientMasterPreview
          clientId={previewClient.id}
          clientCode={previewClient.client_id}
          clientName={previewClient.name}
          user={user}
          onClose={() => setPreviewClient(null)}
        />
      )}
    </div>
  )
}

function DirFld({ label, value, full }) {
  return (
    <div style={{ gridColumn: full ? 'span 2' : 'span 1' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ds-text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text)', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

function CdFld({ k, v }) {
  return <div className="cd-fld"><div className="k">{k}</div><div className="v">{v}</div></div>
}