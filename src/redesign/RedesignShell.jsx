/**
 * RedesignShell — DESIGN-ONLY application shell for the 2026 prototype.
 * Collapsible sidebar (→ icon rail), premium top header, and a mobile overlay
 * drawer with scrim + hamburger. Purely presentational chrome; it renders the
 * active page as children and reports nav clicks via onNavigate.
 */
import { useState } from 'react'
import { NAV_ICONS, IconMenu, IconChevronLeft, IconChevronRight, IconBell, IconSearch, IconLogout } from '../components/ui/redesign/icons'

export default function RedesignShell({ nav, active, onNavigate, title, subtitle, user, fyLabel, onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  function go(id) { onNavigate?.(id); setDrawerOpen(false) }

  return (
    <div className={`rd-app`}>
      <div className={`rd-shell${drawerOpen ? ' is-drawer-open' : ''}`}>
        <div className="rd-scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />

        <aside className={`rd-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Primary">
          <div className="rd-brand">
            <span className="rd-brand-mark">YA</span>
            <span className="rd-brand-text">
              <span className="rd-brand-name">Yes Advizors</span>
              <span className="rd-brand-sub">TEAM PORTAL</span>
            </span>
          </div>

          <nav className="rd-nav">
            {nav.map(group => (
              <div key={group.label}>
                <div className="rd-nav-group-label">{collapsed ? '·' : group.label}</div>
                {group.items.map(item => {
                  const Icon = NAV_ICONS[item.id] || NAV_ICONS.dashboard
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`rd-nav-item${active === item.id ? ' is-active' : ''}`}
                      aria-current={active === item.id ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      onClick={() => go(item.id)}
                    >
                      <span className="rd-nav-ico"><Icon size={18} /></span>
                      <span className="rd-nav-label">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="rd-sidebar-foot">
            <button type="button" className="rd-collapse-btn" onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <IconChevronRight size={16} /> : <><IconChevronLeft size={16} /> Collapse</>}
            </button>
          </div>
        </aside>

        <div className="rd-main">
          <header className="rd-topbar">
            <div className="rd-topbar-left">
              <button type="button" className="rd-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open navigation"><IconMenu size={18} /></button>
              <div>
                <div className="rd-topbar-title">{title}</div>
                {subtitle && <div className="rd-topbar-crumb">{subtitle}</div>}
              </div>
            </div>
            <div className="rd-topbar-right">
              <div className="rd-topsearch">
                <span className="rd-search-ico"><IconSearch size={16} /></span>
                <input className="rd-input" type="search" placeholder="Search clients, tasks…" aria-label="Global search" />
              </div>
              {fyLabel && <span className="rd-fy-chip">{fyLabel}</span>}
              <button type="button" className="rd-icon-btn" aria-label="Notifications"><IconBell size={17} /></button>
              <button type="button" className="rd-user" title={user?.email}>
                <span className="rd-avatar" style={user?.color ? { background: user.color } : undefined}>{user?.initials || user?.name?.[0] || 'U'}</span>
                <span className="rd-user-name">{user?.name || 'User'}</span>
              </button>
              <button type="button" className="rd-icon-btn" aria-label="Sign out" onClick={onLogout}><IconLogout size={17} /></button>
            </div>
          </header>

          <main className="rd-content">
            <div className="rd-content-inner">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
