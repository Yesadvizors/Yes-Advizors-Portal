/**
 * Shared Bento MODULE primitives (Core Operations package).
 * ----------------------------------------------------------------------------
 * Reusable, PRESENTATIONAL building blocks for re-skinning existing modules in
 * the approved Bento language without touching their logic. NO data access, NO
 * writes, NO network — every value + handler is supplied by the hosting module's
 * container. SVG icons only (no emoji). All classes are `.b`-scoped.
 *
 * Used by the module *BentoView components (Tasks today; Documents/Compliance
 * next). Kept intentionally small — modules compose these, they don't subclass.
 */
import { useEffect } from 'react'
import { IconSearch, IconChevronRight, IconArrowRight } from '../icons'

/** Page header: title + subtitle on the left, optional actions on the right. */
export function ModuleHeader({ title, subtitle, children }) {
  return (
    <div className="b-mod-header">
      <div>
        <h1 className="b-mod-title">{title}</h1>
        {subtitle != null && <p className="b-mod-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="b-mod-actions">{children}</div>}
    </div>
  )
}

export function PrimaryButton({ onClick, icon, children, type = 'button' }) {
  return (
    <button type={type} className="b-mod-primary" onClick={onClick}>
      {icon}{icon ? ' ' : ''}{children}
    </button>
  )
}

/** Summary stat cards. `cards`: [{ key, tone, label, value, Icon }]. Reuses .b-kpi. */
export function SummaryCards({ cards }) {
  return (
    <div className="b-mod-summary">
      {cards.map(({ key, tone, label, value, Icon }) => (
        <div key={key} className={`b-kpi t-${tone} b-mod-stat`}>
          <div className="b-kpi-top">
            <span className="b-kpi-ico">{Icon ? <Icon size={19} /> : null}</span>
            <span className="b-kpi-label">{label}</span>
          </div>
          <div className="b-kpi-val">{value}</div>
        </div>
      ))}
    </div>
  )
}

export function Toolbar({ children }) {
  return <div className="b-mod-toolbar">{children}</div>
}

export function SearchBox({ value, onChange, onClear, placeholder = 'Search…', label = 'Search' }) {
  return (
    <div className="b-mod-search">
      <IconSearch size={17} />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      {onClear && value && (
        <button type="button" className="b-mod-search-clear" onClick={onClear} aria-label="Clear search" title="Clear search">×</button>
      )}
    </div>
  )
}

/** `options`: [{ value, label }]. */
export function FilterSelect({ value, onChange, label, options }) {
  return (
    <select className="b-mod-select" value={value} onChange={e => onChange(e.target.value)} aria-label={label}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

/** Status/priority chip. `tone`: green | amber | red | blue | purple | subtle. */
export function StatusChip({ label, tone = 'subtle', dot = true }) {
  return <span className={`b-mod-chip b-mod-chip-${tone}`}>{dot && <span className="b-mod-dot" />}{label}</span>
}

export function SkeletonList({ rows = 6 }) {
  return (
    <div className="b-mod-skel-wrap" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="b-mod-skel-row">
          <span className="b-skel b-mod-skel-av" />
          <span className="b-skel b-mod-skel-line" />
          <span className="b-skel b-mod-skel-pill" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, copy, children }) {
  return (
    <div className="b-mod-state">
      <div className="b-mod-state-title">{title}</div>
      {copy && <div className="b-mod-state-copy">{copy}</div>}
      {children}
    </div>
  )
}

/** Business-safe error state (never surfaces a raw error). */
export function ErrorState({ title = 'Something went wrong', copy = 'Please retry. If the problem continues, contact the portal administrator.', onRetry }) {
  return (
    <div className="b-mod-state b-mod-state-error" role="alert">
      <div className="b-mod-state-title">{title}</div>
      <div className="b-mod-state-copy">{copy}</div>
      {onRetry && <button type="button" className="b-mod-primary" onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function Pagination({ safePage, totalPages, total, pageSize, onPrev, onNext, unit = 'items' }) {
  const from = (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, total)
  return (
    <div className="b-mod-pager">
      <span className="b-mod-pager-info">Showing {from}–{to} of {total} {unit}</span>
      <div className="b-mod-pager-controls">
        <button type="button" className="b-mod-pgbtn" onClick={onPrev} disabled={safePage <= 1}>‹ Prev</button>
        <span className="b-mod-pager-page">Page {safePage} of {totalPages}</span>
        <button type="button" className="b-mod-pgbtn" onClick={onNext} disabled={safePage >= totalPages}>Next ›</button>
      </div>
    </div>
  )
}

/**
 * Right-side detail drawer. Presentational: visibility + content controlled by
 * the host. Closes on Escape and on scrim click. Renders nothing when closed.
 */
export function DetailDrawer({ open, title, subtitle, headerExtra, onClose, children, footer, labelId = 'b-drawer-title' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="b-drawer-root">
      <div className="b-drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="b-drawer" role="dialog" aria-modal="true" aria-labelledby={labelId}>
        <header className="b-drawer-head">
          <div className="b-drawer-titles">
            <h2 id={labelId} className="b-drawer-title">{title}</h2>
            {subtitle != null && <div className="b-drawer-subtitle">{subtitle}</div>}
            {headerExtra}
          </div>
          <button type="button" className="b-drawer-close" onClick={onClose} aria-label="Close details">×</button>
        </header>
        <div className="b-drawer-body">{children}</div>
        {footer && <footer className="b-drawer-foot">{footer}</footer>}
      </aside>
    </div>
  )
}

/** Small labelled field for drawer bodies. */
export function DrawerField({ label, value, full }) {
  return (
    <div className={`b-drawer-fld${full ? ' is-full' : ''}`}>
      <div className="b-drawer-fld-k">{label}</div>
      <div className="b-drawer-fld-v">{value == null || value === '' ? '—' : value}</div>
    </div>
  )
}

export { IconChevronRight, IconArrowRight }
