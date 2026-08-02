import { useState, useEffect, Suspense } from 'react'
import { supabase } from './supabase'
import Login from './components/Login'
import AdminHome from './components/AdminHome'
import Dashboard from './components/Dashboard'
import Tasks from './components/Tasks'
import Clients from './components/Clients'
import Compliance from './components/Compliance'
import Team from './components/Team'
import ErrorBoundary from './components/ErrorBoundary'
import ChatAgent from './components/ChatAgent'
import DocumentsHub from './components/DocumentsHub'
import Usage from './components/Usage'
import AuditLog from './components/AuditLog'
import { ToastProvider } from './components/ui'

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [resetMode, setResetMode] = useState(false)
  const [newPass, setNewPass] = useState('')
  const [newPassErr, setNewPassErr] = useState('')
  const [newPassDone, setNewPassDone] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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
    // Fail closed: only an active, mapped team member may enter the portal.
    const { data: member, error } = await supabase
      .from('team')
      .select('*')
      .ilike('email', email)
      .eq('is_active', true)
      .maybeSingle()
    if (error || !member) {
      await supabase.auth.signOut()
      setUser(null)
      return
    }
    setUser(member)
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
      <div className="ds-app" style={{ minHeight: '100vh', background: 'var(--ds-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--ds-surface)', borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 380, textAlign: 'center', boxShadow: 'var(--ds-shadow-lg)' }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>🔐</div>
          {newPassDone
            ? <>
                <div className="ds-modal-title" style={{ marginBottom: 8 }}>Password updated</div>
                <div className="ds-state-desc" style={{ margin: '0 auto 22px' }}>Your new password has been saved.</div>
                <button className="ds-btn ds-btn-primary ds-btn-block" onClick={() => setResetMode(false)}>Continue to portal</button>
              </>
            : <>
                <div className="ds-modal-title">Set a new password</div>
                <div className="ds-state-desc" style={{ margin: '4px auto 22px' }}>Choose a strong password for your account.</div>
                <form onSubmit={handleSetNewPassword}>
                  <input value={newPass} onChange={e => setNewPass(e.target.value)} type="password" placeholder="New password (min 8 characters)" autoComplete="new-password" className="ds-input" />
                  <div className="ds-error-text" style={{ textAlign: 'left', margin: '4px 0 12px' }}>{newPassErr}</div>
                  <button type="submit" disabled={savingPass} className="ds-btn ds-btn-primary ds-btn-block">
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
    <div className="ds-app" style={{ minHeight: '100vh', background: 'var(--ds-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="ds-spinner" style={{ margin: '0 auto 14px', borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'var(--ds-brand-200)' }} aria-hidden="true" />
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Loading your portal…</div>
      </div>
    </div>
  )

  if (!user) return <ErrorBoundary><Login onLogin={setUser} /></ErrorBoundary>

  // Navigation grouped by domain. Admin-only entries are produced by spreads guarded
  // with is_admin === true (strict equality — no truthiness coercion). Every id maps
  // to an existing supported route; no placeholder/unsupported modules are exposed.
  const navGroups = [
    { label: 'Core', items: [
      ...(user?.is_admin === true ? [{ id: 'home', label: 'Firm Overview', icon: '🏠' }] : []),
      { id: 'dashboard',  label: 'Dashboard',          icon: '📊' },
      { id: 'clients',    label: 'Clients Onboarding', icon: '👥' },
      { id: 'tasks',      label: 'Tasks',              icon: '✅' },
      { id: 'compliance', label: 'Compliance',         icon: '📅' },
    ] },
    { label: 'Operations', items: [
      { id: 'documents',  label: 'Documents',  icon: '📁' },
      { id: 'usage',      label: 'API Usage',  icon: '📈' },
    ] },
    { label: 'Administration', items: [
      { id: 'team',       label: 'Team',       icon: '🧑‍💼' },
      // Audit Log tab: UX-layer admin gate only — server enforces via get_app_role()
      ...(user?.is_admin === true ? [{ id: 'auditlog', label: 'Audit Log', icon: '🔐' }] : []),
    ] },
  ]
  const allItems = navGroups.flatMap(g => g.items)
  const current = allItems.find(i => i.id === tab) || { label: '' }

  // Financial-year context (Indian FY: Apr–Mar).
  const now = new Date()
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fyLabel = `FY ${fyStart}–${String(fyStart + 1).slice(-2)}`

  function go(id) { setTab(id); setMobileOpen(false) }

  return (
    <ToastProvider>
    <div className={`ds-app ds-shell ${mobileOpen ? 'is-mobile-open' : ''}`.trim()}>
      <div className="ds-scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`ds-sidebar ${collapsed ? 'is-collapsed' : ''}`.trim()} aria-label="Primary navigation">
        <div className="ds-brand">
          <div className="ds-brand-mark">YA</div>
          <div className="ds-brand-text">
            <div className="ds-brand-name">Yes Advizors</div>
            <div className="ds-brand-sub">TEAM PORTAL</div>
          </div>
        </div>
        <nav className="ds-nav">
          {navGroups.map(group => (
            <div className="ds-nav-group" key={group.label}>
              <div className="ds-nav-group-label">{collapsed ? '·' : group.label}</div>
              {group.items.map(item => (
                <button
                  key={item.id}
                  className={`ds-nav-item ${tab === item.id ? 'is-active' : ''}`.trim()}
                  onClick={() => go(item.id)}
                  aria-current={tab === item.id ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="ds-nav-ico" aria-hidden="true">{item.icon}</span>
                  <span className="ds-nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="ds-sidebar-foot">
          <button className="ds-collapse-btn" onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? '»' : '« Collapse'}
          </button>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────── */}
      <div className="ds-main">
        <header className="ds-topbar">
          <div className="ds-topbar-left">
            <button className="ds-icon-btn" onClick={() => setMobileOpen(o => !o)} aria-label="Toggle navigation">☰</button>
            <div className="ds-topbar-title">{current.label}</div>
          </div>
          <div className="ds-topbar-right">
            <span className="ds-fy-chip" title="Current financial year">📅 {fyLabel}</span>
            <div style={{ position: 'relative' }}>
              <button className="ds-user" onClick={() => setMenuOpen(o => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
                <span className="ds-avatar" style={{ background: user.color || 'var(--ds-brand)' }}>{user.initials || user.name?.[0]?.toUpperCase() || 'U'}</span>
                <span className="ds-user-name">{user.name}</span>
              </button>
              {menuOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 55 }} onClick={() => setMenuOpen(false)} aria-hidden="true" />
                  <div className="ds-menu" role="menu">
                    <div className="ds-menu-head">
                      <div style={{ fontWeight: 650, fontSize: 13 }}>{user.name}</div>
                      <div className="ds-muted" style={{ fontSize: 12 }}>{user.email}</div>
                      {user.is_admin === true && <span className="ds-badge ds-badge-success" style={{ marginTop: 6 }}><span className="ds-badge-dot" />Administrator</span>}
                    </div>
                    <button className="ds-menu-item is-danger" role="menuitem" onClick={handleLogout}>
                      <span aria-hidden="true">⇥</span> Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <ErrorBoundary>
        <Suspense fallback={<div className="ds-content"><div className="ds-content-inner"><div className="ds-state"><div className="ds-spinner" /></div></div></div>}>
        <main className="ds-content">
          <div className="ds-content-inner">
            {tab === 'home'       && user?.is_admin === true && <AdminHome user={user} goTo={setTab} />}
            {tab === 'dashboard'  && <Dashboard   user={user} goTo={setTab} />}
            {tab === 'tasks'      && <Tasks        user={user} />}
            {tab === 'clients'    && <Clients      user={user} />}
            {tab === 'compliance' && <Compliance   user={user} />}
            {tab === 'documents'  && <DocumentsHub user={user} />}
            {tab === 'team'       && <Team         user={user} />}
            {tab === 'usage'      && <Usage />}
            {/* Audit Log: second guard ensures component never mounts for non-admins */}
            {tab === 'auditlog' && user?.is_admin === true && <AuditLog user={user} />}
          </div>
        </main>
        </Suspense>
        </ErrorBoundary>
      </div>

      <ChatAgent />
    </div>
    </ToastProvider>
  )
}
