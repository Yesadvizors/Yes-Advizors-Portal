import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'
import OnboardingWizard from './OnboardingWizard'

export default function Clients({ user }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [viewClient, setViewClient] = useState(null)

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 700 }}>Clients</h1><p style={{ fontSize: 14, color: 'var(--gray)' }}>{clients.length} onboarded clients</p></div>
        <button onClick={() => setShowWizard(true)} style={{ background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>🚀 Start Onboarding</button>
      </div>

      <div className="card" style={{ padding: 16, margin: '20px 0' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by name, client ID, mobile, or PAN..." style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading...</div>
          : filtered.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>No clients found. Click "🚀 Start Onboarding".</div>
          : filtered.map(c => (
            <div key={c.id} onClick={() => setViewClient(c)} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name} {c.quick_onboarded && <span style={{ fontSize: 10, color: '#D97706', background: '#FFFBEB', padding: '1px 7px', borderRadius: 99, marginLeft: 6 }}>Quick</span>}</div>
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>{[c.client_type, c.mobile && '+91 ' + c.mobile, c.pan].filter(Boolean).join(' · ')}</div>
              </div>
              <span style={{ fontSize: 11, background: 'var(--ltgreen)', color: 'var(--dkgreen)', padding: '3px 10px', borderRadius: 99 }}>{c.client_id}</span>
            </div>
          ))}
      </div>

      {/* View client detail */}
      {viewClient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, padding: 24, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div><div style={{ fontSize: 17, fontWeight: 700 }}>{viewClient.name}</div><div style={{ fontSize: 12, color: 'var(--gray)' }}>{viewClient.client_id} · {viewClient.client_type}</div></div>
              <button onClick={() => setViewClient(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray)' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
              <Field label="Mobile" value={viewClient.mobile ? '+91 ' + viewClient.mobile : '—'} />
              <Field label="Email" value={viewClient.email || '—'} />
              <Field label="PAN" value={viewClient.pan || '—'} />
              <Field label="GSTIN" value={viewClient.gstin || '—'} />
              <Field label="TAN" value={viewClient.tan || '—'} />
              {viewClient.cin && <Field label="CIN" value={viewClient.cin} />}
              {viewClient.city && <Field label="Location" value={[viewClient.city, viewClient.state].filter(Boolean).join(', ')} />}
              <Field label="Onboarded" value={fmtDate(viewClient.created_at)} />
            </div>
            {viewClient.services && viewClient.services.length > 0 && (
              <div style={{ marginTop: 12 }}><div style={{ fontSize: 11, color: 'var(--gray2)', marginBottom: 4 }}>Services</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{viewClient.services.map(s => <span key={s} style={{ fontSize: 11, background: 'var(--ltgreen)', color: 'var(--dkgreen)', padding: '3px 9px', borderRadius: 99 }}>{s}</span>)}</div>
              </div>
            )}
            {viewClient.directors && viewClient.directors.length > 0 && (
              <div style={{ marginTop: 12 }}><div style={{ fontSize: 11, color: 'var(--gray2)', marginBottom: 4 }}>Directors / Partners</div>
                {viewClient.directors.map((d, i) => <div key={i} style={{ fontSize: 13 }}>• {d.name} {d.pan && `(${d.pan})`}</div>)}
              </div>
            )}
            {viewClient.address && <div style={{ marginTop: 12, fontSize: 13 }}><span style={{ color: 'var(--gray)' }}>Address: </span>{viewClient.address}</div>}
          </div>
        </div>
      )}

      {showWizard && <OnboardingWizard user={user} onClose={() => setShowWizard(false)} onSaved={() => { setShowWizard(false); load() }} />}
    </div>
  )
}

function Field({ label, value }) { return <div><div style={{ fontSize: 11, color: 'var(--gray2)' }}>{label}</div><div style={{ fontWeight: 500 }}>{value}</div></div> }
