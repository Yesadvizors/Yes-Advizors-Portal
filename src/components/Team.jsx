import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../supabase'

const DOMAIN = '@yesadvizors.com'
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zcszesuvjrryxtigjglt.supabase.co'
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_rZmEiJTT6-Z2wjXp561qSQ_b_GjkSsN'

// Separate client — creates users without disturbing the admin's own session
function tempClient() {
  return createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

export default function Team({ user }) {
  const [team, setTeam] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { type: 'create'|'reset', member }
  const [formPwd, setFormPwd] = useState('')
  const [working, setWorking] = useState(false)
  const [feedback, setFeedback] = useState({}) // { [memberId]: 'success'|'error: msg' }

  const isAdmin = user?.is_admin === true

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data: t } = await supabase.from('team').select('*').order('id')
    const { data: tk } = await supabase.from('tasks').select('*')
    setTeam(t || [])
    setTasks(tk || [])
    setLoading(false)
  }

  function taskCount(name) {
    const first = name.split(' ')[0]
    return tasks.filter(t => {
      const a = t.assigned_to || ''
      return (a === name || a === first || a.startsWith(first)) && t.status !== 'Done' && t.status !== 'Cancelled'
    }).length
  }

  async function handleCreate() {
    if (!modal) return
    setWorking(true)
    const email = modal.member.email?.trim().toLowerCase()

    // Domain guard
    if (!email?.endsWith(DOMAIN)) {
      setFeedback(f => ({ ...f, [modal.member.id]: `error: Only ${DOMAIN} accounts allowed` }))
      setWorking(false); setModal(null); return
    }
    if (formPwd.length < 8) {
      setFeedback(f => ({ ...f, [modal.member.id]: 'error: Password must be at least 8 characters' }))
      setWorking(false); return
    }

    const { error } = await tempClient().auth.signUp({ email, password: formPwd })
    setWorking(false)
    if (error && !error.message.includes('already registered')) {
      setFeedback(f => ({ ...f, [modal.member.id]: 'error: ' + error.message }))
    } else {
      setFeedback(f => ({ ...f, [modal.member.id]: 'success' }))
    }
    setModal(null); setFormPwd('')
  }

  async function handleReset(member) {
    const email = member.email?.trim().toLowerCase()
    if (!email?.endsWith(DOMAIN)) return
    setWorking(true)
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setWorking(false)
    setFeedback(f => ({ ...f, [member.id]: 'reset' }))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Team</h1>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>Your firm members and workload</p>
        </div>
        {isAdmin && (
          <div style={{ fontSize: 12, color: 'var(--gray2)', background: 'var(--ltgreen)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--green2)' }}>
            🔑 Admin — you can manage logins
          </div>
        )}
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {team.map(m => {
            const fb = feedback[m.id]
            return (
              <div key={m.id} className="card" style={{ padding: 20, opacity: m.is_active ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: m.color || 'var(--dkgreen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{m.initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray)' }}>{m.role}</div>
                    {!m.is_active && <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>INACTIVE</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border2)', marginBottom: isAdmin ? 10 : 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--gray)' }}>Open tasks</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--dkgreen)' }}>{taskCount(m.name)}</span>
                </div>

                {/* Admin-only login actions */}
                {isAdmin && m.is_active && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => { setModal({ type: 'create', member: m }); setFormPwd(''); setFeedback(f => ({ ...f, [m.id]: null })) }}
                      style={{ flex: 1, padding: '6px 10px', fontSize: 11.5, fontWeight: 600, background: 'var(--ltgreen)', color: 'var(--dkgreen)', border: '1px solid var(--green2)', borderRadius: 7, cursor: 'pointer' }}>
                      + Create Login
                    </button>
                    <button onClick={() => handleReset(m)}
                      style={{ flex: 1, padding: '6px 10px', fontSize: 11.5, fontWeight: 600, background: '#fff', color: 'var(--gray)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer' }}>
                      ↺ Reset Password
                    </button>
                  </div>
                )}

                {/* Feedback */}
                {fb === 'success' && <div style={{ fontSize: 11.5, color: '#059669', marginTop: 8, fontWeight: 600 }}>✓ Login created — share the password with {m.name}</div>}
                {fb === 'reset' && <div style={{ fontSize: 11.5, color: 'var(--blue)', marginTop: 8, fontWeight: 600 }}>📬 Password reset email sent to {m.email}</div>}
                {fb && fb.startsWith('error:') && <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 8 }}>{fb.replace('error: ', '')}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Login Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Create Login — {modal.member.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--gray)', marginBottom: 18 }}>
              Email: <strong>{modal.member.email}</strong>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Set initial password</div>
              <input type="password" value={formPwd} onChange={e => setFormPwd(e.target.value)}
                placeholder="Min 8 characters" autoComplete="new-password"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 5 }}>Share this password with {modal.member.name} after creating. They can reset it themselves anytime.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => { setModal(null); setFormPwd('') }} style={{ padding: '9px 18px', fontSize: 13, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--gray)' }}>Cancel</button>
              <button onClick={handleCreate} disabled={working || formPwd.length < 8}
                style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: (working || formPwd.length < 8) ? 0.6 : 1 }}>
                {working ? 'Creating…' : 'Create Login'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
