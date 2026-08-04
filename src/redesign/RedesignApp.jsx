/**
 * RedesignApp — DESIGN-ONLY entry for the 2026 premium prototype.
 * ----------------------------------------------------------------------------
 * Mounted only when VITE_REDESIGN_2026 === 'true' (see flag.js), or from the
 * standalone prototype.html preview entry. It wires the presentational shell to
 * three mock-driven prototype pages (Dashboard, Client Master, Client 360).
 *
 * It performs NO live reads and NO writes. Modules that are intentionally out of
 * prototype scope render a clearly-labelled placeholder rather than the real,
 * operational component — so live business logic is never touched here.
 */
import { useState } from 'react'
import '../styles/redesign-2026.css'
import RedesignShell from './RedesignShell'
import DashboardPrototype from './pages/DashboardPrototype'
import ClientMasterPrototype from './pages/ClientMasterPrototype'
import Client360Prototype from './pages/Client360Prototype'
import { CURRENT_FY } from './mock/mockData'
import { NAV_ICONS } from '../components/ui/redesign/icons'

const NAV = [
  { label: 'Workspace', items: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tasks', label: 'Tasks' },
  ] },
  { label: 'Clients', items: [
    { id: 'clientmaster', label: 'Client Master' },
    { id: 'client360', label: 'Client 360' },
    { id: 'clients', label: 'Onboarding' },
  ] },
  { label: 'Compliance', items: [
    { id: 'compliance', label: 'Compliance' },
    { id: 'documents', label: 'Documents' },
  ] },
  { label: 'Firm', items: [
    { id: 'team', label: 'Team' },
    { id: 'usage', label: 'API Usage' },
    { id: 'auditlog', label: 'Audit Log' },
  ] },
]

const META = {
  dashboard:    { title: 'Dashboard',     subtitle: 'Firm operations overview' },
  clientmaster: { title: 'Client Master', subtitle: 'Entities & engagements' },
  client360:    { title: 'Client 360',    subtitle: 'Client command centre' },
}

function Placeholder({ id }) {
  const label = NAV.flatMap(g => g.items).find(i => i.id === id)?.label || id
  const Icon = NAV_ICONS[id] || NAV_ICONS.dashboard
  return (
    <div className="rd-card">
      <div className="rd-state">
        <span className="rd-state-ico"><Icon size={40} /></span>
        <div className="rd-state-title">{label} — not in prototype scope</div>
        <div className="rd-state-desc">
          This module keeps its existing operational screen. The 2026 prototype re-skins only
          Dashboard, Client Master and Client 360; other modules are shown here as placeholders
          so the shell is fully navigable for review.
        </div>
      </div>
    </div>
  )
}

export default function RedesignApp({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const meta = META[tab] || { title: NAV.flatMap(g => g.items).find(i => i.id === tab)?.label || 'Portal', subtitle: 'Design prototype' }

  return (
    <RedesignShell
      nav={NAV}
      active={tab}
      onNavigate={setTab}
      title={meta.title}
      subtitle={meta.subtitle}
      user={user}
      fyLabel={CURRENT_FY}
      onLogout={onLogout}
    >
      {tab === 'dashboard' && <DashboardPrototype />}
      {tab === 'clientmaster' && <ClientMasterPrototype />}
      {tab === 'client360' && <Client360Prototype />}
      {!['dashboard', 'clientmaster', 'client360'].includes(tab) && <Placeholder id={tab} />}
    </RedesignShell>
  )
}
