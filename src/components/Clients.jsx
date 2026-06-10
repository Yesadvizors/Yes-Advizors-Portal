import { useState, useEffect, useCallback } from 'react'
import { useEscapeKey } from '../useEscapeKey'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'
import OnboardingWizard from './OnboardingWizard'
import DocumentManager from './DocumentManager'

const DIR_PALETTE = [
  { bg: '#DBEAFE', text: '#1D4ED8' }, { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#F3E8FF', text: '#7C3AED' }, { bg: '#FCE7F3', text: '#BE185D' },
  { bg: '#D1FAE5', text: '#065F46' },
]
function initials(name) {
  return (name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

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
function ResyncButton({ client }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function resync() {
    if (!window.confirm(`Re-sync compliance for ${client.name}? This will create any missing records.`)) return
    setLoading(true)
    const ctMap = {
      'Private Limited Company':'Private Limited Company','Public Limited Company':'Limited Company',
      'LLP':'LLP','Partnership Firm':'Partnership Firm','Proprietor':'Proprietor',
      'Proprietorship':'Proprietor','Individual':'Individual','HUF':'HUF',
      'Section 8 Company':'Section 8 Company','Trust':'Trust','Society':'Society',
    }
    await supabase.rpc('generate_client_compliance', {
      p_client_id:          client.id,
      p_client_type:        ctMap[client.client_type] || 'Private Limited Company',
      p_incorporation_date: client.date_of_incorporation || new Date().toISOString().split('T')[0],
      p_has_gstin:          !!client.gstin,
      p_gst_frequency:      'Monthly',
      p_has_tan:            !!client.tan,
      p_has_cin:            !!client.cin,
      p_has_llpin:          false,
      p_gstin:              client.gstin || null,
      p_tan:                client.tan || null,
      p_cin:                client.cin || null,
      p_llpin:              null,
    })
    setLoading(false)
    setDone(true)
    setTimeout(() => setDone(false), 3000)
  }

  return (
    <button onClick={resync} disabled={loading}
      style={{ fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:8,
        border:'1px solid rgba(203,184,119,.5)', background:'rgba(203,184,119,.15)',
        color:'#CBB877', cursor:loading?'not-allowed':'pointer' }}>
      {loading ? '⏳ Syncing...' : done ? '✅ Synced!' : '🔄 Re-sync Compliance'}
    </button>
  )
}

export default function Clients({ user }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [viewClient, setViewClient] = useState(null)
  const [editClient, setEditClient] = useState(null)
  const [directorsMap, setDirectorsMap] = useState({}) // client_id → directors array

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
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.client_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile || '').includes(search) ||
    (c.pan || '').toLowerCase().includes(search.toLowerCase())
  )

  const c = viewClient

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Clients</h1>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>{clients.length} onboarded clients</p>
        </div>
        <button onClick={() => { setEditClient(null); setShowWizard(true) }} style={{ background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>🚀 Start Onboarding</button>
      </div>

      <div className="card" style={{ padding: 16, margin: '20px 0' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="🔍 Search by name, client ID, mobile, or PAN..." style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading
          ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading...</div>
          : filtered.length === 0
            ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>No clients found. Click "🚀 Start Onboarding".</div>
            : filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(cl => (
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

      {/* ── PREMIUM CLIENT DETAIL MODAL ── */}
      {c && (
        <div className="cd-overlay" onClick={e => e.target === e.currentTarget && setViewClient(null)}>
          <style>{css}</style>
          <div className="cd-modal">

            {/* Header */}
            <div className="cd-head">
              <div style={{ position:'absolute', top:14, right:52, zIndex:2, display:'flex', gap:8 }}>
                <button onClick={() => { setEditClient(c); setShowWizard(true); setViewClient(null) }}
                  style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(212,185,120,.5)', background:'rgba(255,255,255,.08)', color:'#E8D5A3', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                  ✏️ Edit
                </button>
                <button onClick={() => resetClientPin(c.client_id, c.name)}
                  style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(239,68,68,.4)', background:'rgba(239,68,68,.12)', color:'#FCA5A5', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
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
                  c.status === 'Active' ? { background: 'rgba(16,185,129,.18)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,.3)' }
                  : c.status === 'Draft' ? { background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.15)' }
                  : { background: 'rgba(212,185,120,.15)', color: '#E8D5A3', border: '1px solid rgba(212,185,120,.3)' }
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
                  mobile: d.mobile, aadhaar_masked: d.aadhaar ? 'XXXX-XXXX-'+String(d.aadhaar).slice(-4) : null,
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
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: DIR_PALETTE[i % DIR_PALETTE.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
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
                            <DirFld label="Aadhaar" value={d.aadhaar_masked || (d.aadhaar ? 'XXXX-XXXX-'+String(d.aadhaar).slice(-4) : '—')} />
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