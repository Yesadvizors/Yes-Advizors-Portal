import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Tasks from './components/Tasks'
import Clients from './components/Clients'
import Compliance from './components/Compliance'
import Team from './components/Team'
import HowToUse from './components/HowToUse'

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')

  // Real Supabase Auth session — persists across page refresh automatically
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) await loadUser(session.user.email)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) { setUser(null); return }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadUser(email) {
    const { data: member } = await supabase
      .from('team').select('*').ilike('email', email).maybeSingle()
    setUser(member || { name: email.split('@')[0], email, initials: email[0].toUpperCase(), color: '#0D7A53' })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#4caf50', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  if (!user) return <Login onLogin={setUser} />

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'tasks',     label: 'Tasks',     icon: '✅' },
    { id: 'clients',   label: 'Clients Onboarding', icon: '👥' },
    { id: 'compliance',label: 'Compliance',icon: '📅' },
    { id: 'team',      label: 'Team',      icon: '🧑‍💼' },
    { id: 'howto',     label: 'How to Use',icon: '📖' },
  ]

  return (
    <div>
      {/* Header */}
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

      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: tab === t.id ? 'var(--ltgreen)' : 'transparent', border: 'none', borderBottom: tab === t.id ? '2px solid var(--dkgreen)' : '2px solid transparent', padding: '14px 16px', fontSize: 13, fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? 'var(--dkgreen)' : 'var(--gray)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {tab === 'dashboard'  && <Dashboard   user={user} goTo={setTab} />}
        {tab === 'tasks'      && <Tasks        user={user} />}
        {tab === 'clients'    && <Clients      user={user} />}
        {tab === 'compliance' && <Compliance   user={user} />}
        {tab === 'team'       && <Team         user={user} />}
        {tab === 'howto'      && <HowToUse />}
      </div>
    </div>
  )
}
