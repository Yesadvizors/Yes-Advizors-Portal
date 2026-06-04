import { useState, useEffect } from 'react'
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

export default function Clients({ user }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [viewClient, setViewClient] = useState(null)
  const [editClient, setEditClient] = useState(null)

  useEffect(() => { load() }, [])
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
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by name, client ID, mobile, or PAN..." style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading
          ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading...</div>
          : filtered.length === 0
            ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>No clients found. Click "🚀 Start Onboarding".</div>
            : filtered.map(cl => (
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

              <div className="cd-sec">Entity Information</div>
              <div className="cd-grid">
                <CdFld k="Mobile"    v={c.mobile ? '+91 ' + c.mobile : '—'} />
                <CdFld k="Email"     v={c.email || '—'} />
                <CdFld k="PAN"       v={c.pan || '—'} />
                <CdFld k="GSTIN"     v={c.gstin || '—'} />
                <CdFld k="TAN"       v={c.tan || '—'} />
                {c.cin  && <CdFld k="CIN"  v={c.cin} />}
                {c.pf_no  && <CdFld k="PF No."  v={c.pf_no} />}
                {c.esi_no && <CdFld k="ESI No." v={c.esi_no} />}
                {c.udyam_no && <CdFld k="Udyam No." v={c.udyam_no} />}
                {c.iec_no && <CdFld k="IEC No." v={c.iec_no} />}
                {(c.city || c.state) && <CdFld k="Location" v={[c.city, c.state].filter(Boolean).join(', ')} />}
                <CdFld k="Onboarded" v={fmtDate(c.created_at)} />
                {c.onboarded_by && <CdFld k="Onboarded by" v={c.onboarded_by} />}
              </div>

              {c.address && (
                <div style={{ marginBottom: 14 }}>
                  <div className="cd-fld"><div className="k">Address</div><div className="v" style={{ fontWeight: 400, fontSize: 13 }}>{c.address}</div></div>
                </div>
              )}

              {c.services && c.services.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div className="cd-sec">Services</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {c.services.map(s => <span key={s} className="cd-svc">{s}</span>)}
                  </div>
                </div>
              )}

              {c.directors && c.directors.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div className="cd-sec">{
                    c.client_type === 'Private Limited Company' || c.client_type === 'Public Limited Company' || c.client_type === 'Section 8 Company' ? 'Directors' :
                    c.client_type === 'LLP' ? 'Designated Partners' :
                    c.client_type === 'Partnership Firm' ? 'Partners' : 'Directors / Partners'
                  } ({c.directors.length})</div>
                  <div className="cd-chips">
                    {c.directors.map((d, i) => (
                      <div key={i} className="cd-chip">
                        <div className="av" style={{ background: DIR_PALETTE[i % DIR_PALETTE.length].bg, color: DIR_PALETTE[i % DIR_PALETTE.length].text }}>
                          {initials(d.name)}
                        </div>
                        <span>{d.name}{d.pan ? <span style={{ fontWeight: 400, color: '#6B7280', fontSize: 11, marginLeft: 4 }}>· {d.pan}</span> : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="cd-sec" style={{ marginTop: 4 }}>Documents</div>
              <DocumentManager client={c} user={user} />

            </div>
          </div>
        </div>
      )}

      {showWizard && <OnboardingWizard user={user} editClient={editClient} onClose={() => { setShowWizard(false); setEditClient(null) }} onSaved={() => { setShowWizard(false); setEditClient(null); load() }} />}
    </div>
  )
}

function CdFld({ k, v }) {
  return <div className="cd-fld"><div className="k">{k}</div><div className="v">{v}</div></div>
}
