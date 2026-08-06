import { useState, useEffect, useCallback, useRef } from 'react'
import { useEscapeKey } from '../useEscapeKey'
import { supabase } from '../supabase'
import { fmtDate, clientStatusLabel, CLIENT_LIFECYCLE_STATUSES, nextDirectorsMap } from '../helpers'
import OnboardingWizard from './OnboardingWizard'
import ClientMasterPreview from './preview/ClientMasterPreview'
import Client360Workspace from './client360/Client360Workspace'
import { previewEntryVisible, isAdminOrManagerRole } from '../lib/clientMaster'
import { hydratedAadhaar, displayAadhaar } from '../lib/aadhaar'
import { safeErrorMessage } from '../lib/errors'
import { useTimeoutMessage } from '../hooks/useTimeoutMessage'
import { complianceOutcome, resyncMessage } from '../lib/compliance'
import { fyCoverage } from '../lib/financialYear'
import { runComplianceSetup } from '../lib/complianceRunner'
import DocumentManager from './DocumentManager'
import { approvedBentoEnabled } from '../bento/flag'
import ClientsBentoView from '../bento/modules/ClientsBentoView'

const DIR_PALETTE = [
  { bg: '#DBEAFE', text: '#1D4ED8' }, { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#F3E8FF', text: '#7C3AED' }, { bg: '#FCE7F3', text: '#BE185D' },
  { bg: '#D1FAE5', text: '#065F46' },
]
function initials(name) {
  return (name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
const pgBtnStyle = (disabled) => ({
  background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px',
  fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? 'var(--gray2)' : 'var(--navy2)', opacity: disabled ? 0.55 : 1,
})

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
.cd-overlay{position:fixed;inset:0;background:rgba(7,24,18,.52);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);z-index:2000;display:flex;align-items:flex-start;justify-content:center;padding:14px 16px;overflow-y:auto;animation:cdFade .22s ease}
.cd-modal{font-family:'Plus Jakarta Sans',-apple-system,sans-serif;background:#FDFDFB;border-radius:22px;width:100%;max-width:940px;margin-top:14px;overflow:hidden;box-shadow:0 28px 80px rgba(4,28,20,.42);animation:cdRise .36s cubic-bezier(.22,1,.36,1)}
@keyframes cdFade{from{opacity:0}to{opacity:1}}
@keyframes cdRise{from{opacity:0;transform:translateY(22px) scale(.987)}to{opacity:1;transform:none}}
.cd-head{position:relative;background:linear-gradient(132deg,#06281D 0%,#0A3D2C 52%,#0D7A53 130%);padding:24px 26px 20px;overflow:hidden}
.cd-head::after{content:'';position:absolute;inset:0;background:radial-gradient(rgba(212,185,120,.13) 1px,transparent 1px);background-size:26px 26px;pointer-events:none}
.cd-head::before{content:'';position:absolute;right:-60px;top:-80px;width:240px;height:240px;border-radius:50%;background:radial-gradient(closest-side,rgba(212,185,120,.18),transparent);pointer-events:none}
.cd-mono{width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(212,185,120,.5);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;letter-spacing:.5px;color:#E8D5A3;flex-shrink:0}
.cd-eyebrow{font-size:9.5px;letter-spacing:3px;text-transform:uppercase;color:#CBB877;font-weight:700;margin-bottom:2px}
.cd-name{font-family:'Fraunces',Georgia,serif;font-size:22px;font-weight:600;color:#fff;letter-spacing:.2px;line-height:1.2}
.cd-close{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:rgba(255,255,255,.85);font-size:14px;cursor:pointer;transition:.2s;z-index:2;display:flex;align-items:center;justify-content:center}
.cd-close:hover{background:rgba(255,255,255,.16);transform:rotate(90deg)}
.cd-pills{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;position:relative;z-index:1}
.cd-idpill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid rgba(212,185,120,.45);color:#E8D5A3;padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:1.2px}
.cd-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 11px;border-radius:99px;font-size:10.5px;font-weight:700;letter-spacing:.4px}
.cd-body{padding:22px 26px;max-height:66vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#CBD5D1 transparent}
.cd-body::-webkit-scrollbar{width:5px}
.cd-body::-webkit-scrollbar-thumb{background:#CBD5D1;border-radius:99px}
.cd-sec{font-size:10px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;color:#0A3D2C;display:flex;align-items:center;gap:12px;margin:4px 0 14px}
.cd-sec::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,#D4B978,transparent 70%)}
.cd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px 18px;margin-bottom:6px}
.cd-fld .k{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8A9189;margin-bottom:3px}
.cd-fld .v{font-size:13.5px;font-weight:600;color:#13241D}
.cd-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px}
.cd-chip{display:flex;align-items:center;gap:8px;padding:6px 13px 6px 7px;border-radius:99px;border:1px solid #E2E5E1;background:#fff;font-size:12.5px;font-weight:600;color:#13241D}
.cd-chip .av{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
.cd-svc{display:inline-flex;align-items:center;padding:4px 11px;background:var(--ltgreen);color:var(--dkgreen);border-radius:99px;font-size:11.5px;font-weight:600;border:1px solid var(--green2)}
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
  // done→idle timer held in a ref and cleared on unmount so it can't setState after
  // the client detail modal (which hosts this button) is closed.
  const idleTimer = useRef(null)
  useEffect(() => () => clearTimeout(idleTimer.current), [])

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
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setState(s => (s.status === 'done' ? { status: 'idle' } : s)), 4000)
  }

  const failed = state.status === 'error'
  const busy   = state.status === 'loading'

  return (
    <button onClick={resync} disabled={busy} title={state.message || undefined}
      style={{ fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:8,
        border: failed ? '1px solid rgba(220,38,38,.55)' : '1px solid rgba(203,184,119,.5)',
        background: failed ? 'rgba(220,38,38,.12)' : 'rgba(203,184,119,.15)',
        color: failed ? '#DC2626' : '#CBB877', cursor: busy ? 'not-allowed' : 'pointer' }}>
      {busy ? '⏳ Syncing...'
        : state.status === 'done' ? '✅ Compliance setup completed'
        : failed ? '⚠️ Sync incomplete — retry'
        : '🔄 Re-sync Compliance'}
    </button>
  )
}

export default function Clients({ user, bento, searchTerm = '', searchNonce = 0, onSearchConsumed }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('All')
  const [showWizard, setShowWizard] = useState(false)
  const [viewClient, setViewClient] = useState(null)
  const [editClient, setEditClient] = useState(null)
  const [directorsMap, setDirectorsMap] = useState({}) // client_id → directors array
  // P2.1: read-only Client Master Preview (feature-flagged, Admin/Manager only).
  const [previewClient, setPreviewClient] = useState(null)
  const previewEnabled = previewEntryVisible(import.meta.env.VITE_P2_PREVIEW, user)
  // Client 360° Operational Workspace (feature-flagged, Admin/Manager only — ships dark
  // by default like the other new UI modules).
  const [client360, setClient360] = useState(null)
  const client360Enabled = String(import.meta.env.VITE_CLIENT360_UI).toLowerCase() === 'true' && isAdminOrManagerRole(user)

  // Fetch directors from proper table when a client is viewed
  useEffect(() => {
    if (!viewClient) return
    let ignore = false
    const code = viewClient.client_id
    supabase.from('client_directors')
      .select('*')
      .eq('client_id', code)
      .eq('is_active', true)
      .order('is_primary_contact', { ascending: false })
      .order('created_at')
      .then(({ data, error }) => {
        // Ignore a response that arrived after the viewed client changed (race guard),
        // and surface a load failure to the console instead of silently discarding it.
        if (ignore) return
        if (error) { console.error('[Clients] Failed to load directors:', error); return }
        // Replace on non-empty; CLEAR the entry on an empty result so a stale cached
        // list cannot survive. An empty result deletes the key, so the render falls
        // back to legacy c.directors (never a stale array). No data fabricated.
        setDirectorsMap(prev => nextDirectorsMap(prev, code, data))
      })
    return () => { ignore = true }
  }, [viewClient])
  // Global ESC to close client detail modal
  const closeViewClient = useCallback(() => setViewClient(null), [])
  useEscapeKey(closeViewClient)
  // Transient PIN-reset toast: auto-clears after 5s and is cleaned up on unmount
  // (the previous bare setTimeout could setState on an unmounted component).
  const [pinResetMsg, showPinResetMsg] = useTimeoutMessage(5000)

  async function resetClientPin(clientId, clientName) {
    if (!window.confirm(`Reset WhatsApp PIN for ${clientName}?\n\nThe client will be asked to set a new PIN on their next WhatsApp session.`)) return
    const { error } = await supabase.from('clients').update({ doc_pin: null }).eq('client_id', clientId)
    if (error) { console.error('[Clients] PIN reset failed:', error); showPinResetMsg({ ok: false, msg: safeErrorMessage(error) }); return }
    showPinResetMsg({ ok: true, msg: `PIN reset for ${clientName}. They will set a new PIN on next WhatsApp login.` })
    load()
  }
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  useEffect(() => { load() }, [])
  // Apply a search term handed over from the global Bento header search — ONCE per
  // submit — then acknowledge it so the payload is cleared and can never be
  // re-applied on a later rerender / status change / pagination / remount. After
  // consumption the local Clients `search` state is the sole source of truth, so
  // clearing or changing the Clients-page search behaves exactly as a direct search.
  useEffect(() => {
    if (searchNonce > 0) { setSearch(searchTerm); setPage(1); onSearchConsumed?.() }
  }, [searchNonce]) // eslint-disable-line react-hooks/exhaustive-deps
  // Escape-to-close is handled once by useEscapeKey(closeViewClient) above; the
  // duplicate window keydown listener that also lived here has been removed.
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
    (fStatus === 'All' || clientStatusLabel(c.status) === fStatus) &&
    ((c.name || '').toLowerCase().includes(search.trim().toLowerCase()) ||
     (c.client_id || '').toLowerCase().includes(search.trim().toLowerCase()) ||
     (c.mobile || '').includes(search.trim()) ||
     (c.pan || '').toLowerCase().includes(search.trim().toLowerCase()))
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  // Approved Bento visual skin (Phase 3). Active when rendered inside the Bento
  // shell (BentoApp passes `bento`) or when VITE_APPROVED_BENTO_UI is on; the
  // legacy skin renders otherwise. PRESENTATION ONLY — every piece of state,
  // Supabase read, role/flag gate, validation and flow below is unchanged, and
  // the summary counts are derived purely from the already-loaded `clients`.
  const bentoSkin = bento ?? approvedBentoEnabled(import.meta.env.VITE_APPROVED_BENTO_UI)
  const pageRows = filtered.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE)
  const summary = clients.reduce((a, cl) => {
    const l = clientStatusLabel(cl.status)
    a.total++
    if (l === 'Active') a.active++
    else if (l === 'Draft') a.draft++
    else a.other++
    return a
  }, { total: 0, active: 0, draft: 0, other: 0 })

  const c = viewClient

  return (
    <div>
      {bentoSkin ? (
        <ClientsBentoView
          summary={summary}
          filtered={filtered}
          pageRows={pageRows}
          search={search}
          onSearch={v => { setSearch(v); setPage(1) }}
          fStatus={fStatus}
          onStatus={v => { setFStatus(v); setPage(1) }}
          statuses={CLIENT_LIFECYCLE_STATUSES}
          loading={loading}
          loadError={!!loadError}
          onRetry={load}
          safePage={safePage}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          statusLabelOf={clientStatusLabel}
          onPrev={() => setPage(p => Math.max(1, p - 1))}
          onNext={() => setPage(p => Math.min(totalPages, p + 1))}
          onRowClick={setViewClient}
          onEditDraft={cl => { setEditClient(cl); setShowWizard(true) }}
          onStartOnboarding={() => { setEditClient(null); setShowWizard(true) }}
        />
      ) : (
      <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Clients</h1>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>{clients.length} onboarded clients</p>
        </div>
        <button onClick={() => { setEditClient(null); setShowWizard(true) }} style={{ background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>🚀 Start Onboarding</button>
      </div>

      <div className="card" style={{ padding: 16, margin: '20px 0' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="🔍 Search by name, client ID, mobile, or PAN..." style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
          <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1) }} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
            <option value="All">All statuses</option>
            {CLIENT_LIFECYCLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="Unknown">Unknown</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading
          ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading...</div>
          : loadError
          ? <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>Couldn't load the client register</div>
              <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14 }}>We couldn’t load the client register. Please retry. If the problem continues, contact the portal administrator.</div>
              <button onClick={load} style={{ background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
            </div>
          : filtered.length === 0
            ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>No clients found. Click "🚀 Start Onboarding".</div>
            : filtered.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE).map(cl => (
                <div key={cl.id} onClick={() => setViewClient(cl)}
                  style={{ padding: '14px 18px', borderBottom: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: '.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAF8'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
                      {cl.name}
                      {cl.quick_onboarded && <span style={{ fontSize: 10, color: '#D97706', background: '#FFFBEB', padding: '1px 7px', borderRadius: 99 }}>Quick</span>}
                      {cl.status === 'Draft' && <span style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', padding: '1px 7px', borderRadius: 99 }}>Draft</span>}
                      {cl.status === 'Draft' && (
                        <button onClick={e => { e.stopPropagation(); setEditClient(cl); setShowWizard(true) }}
                          style={{ fontSize: 10, fontWeight: 700, color: 'var(--dkgreen)', background: 'var(--ltgreen)', border: '1px solid var(--green2)', padding: '1px 8px', borderRadius: 99, cursor: 'pointer' }}>
                          ✏️ Edit Draft
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray)' }}>{[cl.client_type, cl.mobile && '+91 ' + cl.mobile, cl.pan].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span style={{ fontSize: 11, background: 'var(--ltgreen)', color: 'var(--dkgreen)', padding: '3px 10px', borderRadius: 99, fontWeight: 600, flexShrink: 0 }}>{cl.client_id}</span>
                </div>
              ))}
      </div>

      {!loading && !loadError && filtered.length > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 13, color: 'var(--gray)', flexWrap: 'wrap', gap: 8 }}>
          <span>Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} style={pgBtnStyle(safePage <= 1)}>‹ Prev</button>
            <span>Page {safePage} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} style={pgBtnStyle(safePage >= totalPages)}>Next ›</button>
          </div>
        </div>
      )}
      </>
      )}

      {/* ── PREMIUM CLIENT DETAIL MODAL ── */}
      {c && (
        <div className="cd-overlay" onClick={e => e.target === e.currentTarget && setViewClient(null)}>
          <style>{css}</style>
          <div className="cd-modal" role="dialog" aria-modal="true" aria-label={`Client record for ${c.name || 'client'}`}>

            {/* Header */}
            <div className="cd-head">
              <div style={{ position:'absolute', top:14, right:52, zIndex:2, display:'flex', gap:8 }}>
                {client360Enabled && (
                  <button onClick={() => { setClient360(c); setViewClient(null) }}
                    title="Open the Client 360° operational workspace"
                    style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(232,213,163,.5)', background:'rgba(255,255,255,.08)', color:'#E8D5A3', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                    🧭 Client 360°
                  </button>
                )}
                {previewEnabled && (
                  <button onClick={() => { setPreviewClient(c); setViewClient(null) }}
                    title="Read-only normalized Client Master (Preview)"
                    style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(183,216,198,.5)', background:'rgba(255,255,255,.08)', color:'#B7D8C6', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                    🧩 Client Master (Preview)
                  </button>
                )}
                <button onClick={() => { setEditClient(c); setShowWizard(true); setViewClient(null) }}
                  style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(212,185,120,.5)', background:'rgba(255,255,255,.08)', color:'#E8D5A3', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                  ✏️ Edit
                </button>
                {/* Re-sync Compliance: the onboarding partial-failure screen tells users to use this
                    control on the Clients page — it must actually be rendered here to close that gap. */}
                <ResyncButton client={c} />
                <button onClick={() => resetClientPin(c.client_id, c.name)}
                  style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(239,68,68,.4)', background:'rgba(239,68,68,.12)', color:'#FCA5A5', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                  🔓 Reset PIN
                </button>
              </div>
            <button className="cd-close" onClick={() => setViewClient(null)} aria-label="Close client record">✕</button>
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
                {(() => {
                  const sl = clientStatusLabel(c.status)
                  const tone = sl === 'Active' ? { background: 'rgba(16,185,129,.18)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,.3)' }
                    : sl === 'Draft' ? { background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.15)' }
                    : { background: 'rgba(212,185,120,.15)', color: '#E8D5A3', border: '1px solid rgba(212,185,120,.3)' }
                  return <span className="cd-badge" style={tone}>● {sl}</span>
                })()}
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
                  ? <div style={{ fontSize: 13, color: '#13241D', lineHeight: 1.6, marginBottom: 6 }}>{c.address}</div>
                  : <div style={{ fontSize: 12.5, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 6 }}>No address recorded</div>
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
                        <div key={d.id || i} style={{ border: '1px solid #E2E5E1', borderRadius: 12, padding: '14px 16px', background: '#FAFCFB', position: 'relative' }}>
                          {d.is_primary_contact && (
                            <span style={{ position:'absolute', top:10, right:10, fontSize:9, fontWeight:700, color:'#0A3D2C', background:'#D1FAE5', padding:'1px 6px', borderRadius:99 }}>PRIMARY</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: DIR_PALETTE[i % DIR_PALETTE.length].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: DIR_PALETTE[i % DIR_PALETTE.length].text }}>
                              {initials(d.name)}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#13241D' }}>{d.name || '—'}</div>
                              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{d.role || 'Director'}</div>
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
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background: pinResetMsg.ok ? '#065F46' : '#7F1D1D', color:'#fff', padding:'12px 20px', borderRadius:10, fontSize:13, fontWeight:500, zIndex:9999, boxShadow:'0 4px 20px rgba(0,0,0,.3)', maxWidth:420, textAlign:'center' }}>
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
      {client360Enabled && client360 && (
        <Client360Workspace client={client360} user={user} onClose={() => setClient360(null)} />
      )}
    </div>
  )
}

function DirFld({ label, value, full }) {
  return (
    <div style={{ gridColumn: full ? 'span 2' : 'span 1' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#13241D', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

function CdFld({ k, v }) {
  return <div className="cd-fld"><div className="k">{k}</div><div className="v">{v}</div></div>
}