/**
 * BentoShell — approved light application shell (Concept 6). Presentational.
 * Light sidebar (logo + nav + Help panel) · white top header (page pill, search,
 * bell, user) · content slot. Responsive: tablet icon rail, mobile drawer.
 */
import { useState } from 'react'
import {
  IconBrand, IconDashboard, IconClients, IconTasks, IconDocuments, IconCompliance,
  IconTeam, IconReports, IconTemplates, IconKnowledge, IconSettings, IconHelp,
  IconSearch, IconBell, IconChevronDown, IconMenu, IconArrowRight, IconShield,
} from './icons'
import { NAV, BENTO_USER, PAGE_CONTEXT } from './mock/bentoMock'

const NAV_ICON = {
  dashboard: IconDashboard, clients: IconClients, tasks: IconTasks, documents: IconDocuments,
  compliance: IconCompliance, team: IconTeam, reports: IconReports, templates: IconTemplates,
  knowledge: IconKnowledge, settings: IconSettings, auditlog: IconShield,
}
// Audit Log is admin-only: hidden from the sidebar for non-admins (server RLS is the
// authoritative gate; BentoApp also renders a Restricted state for the tab).
const visibleNav = (isAdmin) => NAV.filter(item => item.id !== 'auditlog' || isAdmin)

export default function BentoShell({ active = 'dashboard', onNavigate, user = BENTO_USER, pageTitle = PAGE_CONTEXT, notifications = null, headerSearch = '', onHeaderSearchChange, onHeaderSearchSubmit, initialDrawerOpen = false, children }) {
  const [drawer, setDrawer] = useState(initialDrawerOpen)
  const go = (id) => { onNavigate?.(id); setDrawer(false) }

  return (
    <div className="bento">
      <div className={`b-shell${drawer ? ' is-drawer-open' : ''}`}>
        <div className="b-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />

        <aside className="b-sidebar" aria-label="Primary">
          <div className="b-brand">
            <span className="b-brand-mark"><IconBrand size={26} /></span>
            <span className="b-brand-text">
              <span className="b-brand-name">Yes Advizors</span>
              <span className="b-brand-sub">Team Portal</span>
            </span>
          </div>
          <nav className="b-nav">
            {visibleNav(user?.is_admin).map(item => {
              const Icon = NAV_ICON[item.id] || IconDashboard
              const on = active === item.id
              return (
                <button key={item.id} type="button" className={`b-navitem${on ? ' is-active' : ''}`}
                  aria-current={on ? 'page' : undefined} title={item.label} onClick={() => go(item.id)}>
                  <span className="b-navico"><Icon size={19} /></span>
                  <span className="b-navlabel">{item.label}</span>
                </button>
              )
            })}
          </nav>
          <div className="b-help">
            <span className="b-help-ico"><IconHelp size={17} /></span>
            <div className="b-help-title">Need Help?</div>
            <div className="b-help-copy">Visit our Help Center or contact support.</div>
            <button className="b-help-link" type="button">Go to Help Center <IconArrowRight size={13} /></button>
          </div>
        </aside>

        <div className="b-main">
          <header className="b-header">
            <button className="b-hamburger" type="button" aria-label="Open navigation" onClick={() => setDrawer(true)}><IconMenu size={18} /></button>
            <span className="b-page-pill">{pageTitle}</span>
            <form className="b-search" role="search" onSubmit={e => { e.preventDefault(); onHeaderSearchSubmit?.() }}>
              <IconSearch size={17} />
              <input type="search" value={headerSearch}
                onChange={e => onHeaderSearchChange?.(e.target.value)}
                placeholder="Search clients…" aria-label="Search clients" />
            </form>
            <div className="b-header-right">
              <button className="b-bell" type="button" aria-label="Notifications">
                <IconBell size={20} />
                {notifications > 0 && <span className="b-bell-badge">{notifications}</span>}
              </button>
              <button className="b-user" type="button">
                <span className="b-user-av">{user.initials}</span>
                <span className="b-user-meta">
                  <span className="b-user-name">{user.name}</span>
                  <span className="b-user-role">{user.role}</span>
                </span>
                <span className="b-user-chev"><IconChevronDown size={16} /></span>
              </button>
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  )
}
