import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Tasks from './components/Tasks'
import Clients from './components/Clients'
import Compliance from './components/Compliance'
import Team from './components/Team'
import WorkDocuments from './components/WorkDocuments'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [resetMode, setResetMode] = useState(false)
  const [newPass, setNewPass] = useState('')
  const [newPassErr, setNewPassErr] = useState('')
  const [newPassDone, setNewPassDone] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [tab, setTab] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) await loadUser(session.user.email)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') { setResetMode(true); return }
      if (event === 'SIGNED_OUT' || !session) { setUser(null); setResetMode(false); return }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadUser(email) {
    const { data: member } = await supabase.from('team').select('*').ilike('email', email).maybeSingle()
    setUser(member || { name: email.split('@')[0], email, initials: email[0].toUpperCase(), color: '#0D7A53' })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  async function handleSetNewPassword(e) {
    e.preventDefault()
    setNewPassErr('')
    if (newPass.length < 8) { setNewPassErr('Password must be at least 8 characters'); return }
    setSavingPass(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setSavingPass(false)
    if (error) { setNewPassErr(error.message); return }
    setNewPassDone(true)
    setResetMode(false)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await loadUser(session.user.email)
  }

  // ── Password reset screen (triggered by clicking email link) ──
  if (resetMode) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#161b22', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 16, padding: '40px 32px', width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
          {newPassDone
            ? <>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Password updated!</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 24 }}>Your new password has been saved.</div>
                <button onClick={() => setResetMode(false)} style={{ width: '100%', padding: 13, background: '#4caf50', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#111', cursor: 'pointer' }}>Continue to portal</button>
              </>
            : <>
                <div style={{ fontSize: 19, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Set new password</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 26 }}>Choose a strong password for your account</div>
                <form onSubmit={handleSetNewPassword}>
                  <input value={newPass} onChange={e => setNewPass(e.target.value)} type="password" placeholder="New password (min 8 chars)" autoComplete="new-password"
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box', marginBottom: 4 }} />
                  <div style={{ fontSize: 12, color: '#f87171', minHeight: 18, marginBottom: 12, textAlign: 'left' }}>{newPassErr}</div>
                  <button type="submit" disabled={savingPass} style={{ width: '100%', padding: 13, background: '#4caf50', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#111', cursor: 'pointer', opacity: savingPass ? 0.7 : 1 }}>
                    {savingPass ? 'Saving…' : 'Save new password'}
                  </button>
                </form>
              </>
          }
        </div>
      </div>
    )
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#4caf50', fontSize: 14 }}>Loading…</div>
    </div>
  )

  if (!user) return <ErrorBoundary><Login onLogin={setUser} /></ErrorBoundary>

  const tabs = [
    { id: 'dashboard',  label: 'Dashboard',          icon: '📊' },
    { id: 'tasks',      label: 'Tasks',               icon: '✅' },
    { id: 'clients',    label: 'Clients Onboarding',  icon: '👥' },
    { id: 'compliance', label: 'Compliance',           icon: '📅' },
    { id: 'workdocs',   label: 'Work Documents',       icon: '📁' },
    { id: 'team',       label: 'Team',                 icon: '🧑‍💼' },
  ]

  return (
    <div>
      <div style={{ background: 'var(--navy)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'var(--dkgreen)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 16 }}>YA</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Yes Advizors</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>TEAM PORTAL</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: 99 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: user.color || 'var(--dkgreen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>{user.initials || user.name?.[0]?.toUpperCase() || 'U'}</div>
            <span style={{ color: '#fff', fontSize: 13 }}>{user.name}</span>
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Logout</button>
        </div>
      </div>
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: tab === t.id ? 'var(--ltgreen)' : 'transparent', border: 'none', borderBottom: tab === t.id ? '2px solid var(--dkgreen)' : '2px solid transparent', padding: '14px 16px', fontSize: 13, fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? 'var(--dkgreen)' : 'var(--gray)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <ErrorBoundary>
      <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {tab === 'dashboard'  && <Dashboard   user={user} goTo={setTab} />}
        {tab === 'tasks'      && <Tasks        user={user} />}
        {tab === 'clients'    && <Clients      user={user} />}
        {tab === 'compliance' && <Compliance   user={user} />}
        {tab === 'workdocs'   && <WorkDocuments user={user} />}
        {tab === 'team'       && <Team         user={user} />}
      </div>
      </ErrorBoundary>
    </div>
  )
}
