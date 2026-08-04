/**
 * BentoApp — DESIGN-ONLY entry for the approved "Bento Workspace" (Concept 6).
 * Mounted only when VITE_APPROVED_BENTO_UI === 'true' (see flag.js) or from the
 * standalone approved-bento.html preview. Renders the approved shell + dashboard.
 *
 * Phase 1 redesigns ONLY the dashboard. Other nav destinations render a clearly
 * labelled placeholder inside the approved shell — their real operational screens
 * are intentionally NOT reimplemented here, so live business logic is untouched.
 */
import { useState } from 'react'
import '../styles/bento.css'
import BentoShell from './BentoShell'
import Dashboard from './Dashboard'
import { NAV, BENTO_USER } from './mock/bentoMock'

function Placeholder({ id }) {
  const label = NAV.find(n => n.id === id)?.label || id
  return (
    <div className="b-content">
      <section className="b-card">
        <div className="b-card-body" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--b-text)', marginBottom: 6 }}>{label} — not in Phase 1 scope</div>
          <div style={{ fontSize: 13.5, color: 'var(--b-text-subtle)', maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
            Phase 1 of the approved Bento redesign covers the application shell and the Dashboard.
            This module keeps its existing operational screen; it is shown here as a placeholder so
            the shell is fully navigable for review.
          </div>
        </div>
      </section>
    </div>
  )
}

export default function BentoApp({ user }) {
  const [tab, setTab] = useState('dashboard')
  const shellUser = user
    ? { name: user.name || 'User', role: user.role || (user.is_admin ? 'Admin' : 'Team'), initials: user.initials || (user.name?.[0]?.toUpperCase() ?? 'U') }
    : BENTO_USER
  return (
    <BentoShell active={tab} onNavigate={setTab} user={shellUser}>
      {tab === 'dashboard' ? <Dashboard /> : <Placeholder id={tab} />}
    </BentoShell>
  )
}
