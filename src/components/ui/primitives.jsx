/*
 * Yes Advizors — shared UI primitives (presentational).
 * Thin, accessible React wrappers over the design-system CSS classes
 * (src/styles/design-system.css). No data access, no Supabase, no business logic.
 * These coexist with the legacy inline-styled screens and are adopted incrementally.
 */

/* ── Button ───────────────────────────────────────────────────────────────── */
export function Button({ variant = 'secondary', size, block, className = '', children, ...rest }) {
  const cls = [
    'ds-btn', `ds-btn-${variant}`,
    size === 'sm' ? 'ds-btn-sm' : size === 'lg' ? 'ds-btn-lg' : '',
    block ? 'ds-btn-block' : '',
    className,
  ].filter(Boolean).join(' ')
  return <button className={cls} {...rest}>{children}</button>
}

/* ── Badge ────────────────────────────────────────────────────────────────── */
export function Badge({ tone = 'neutral', dot = false, className = '', children }) {
  return (
    <span className={`ds-badge ds-badge-${tone} ${className}`.trim()}>
      {dot && <span className="ds-badge-dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

/*
 * StatusBadge — maps a free-text business status to a professional tone. Central so
 * every table/list badges the same status the same way. Falls back to neutral for
 * anything unmapped (never throws, never invents a status).
 */
const STATUS_TONE = {
  // positive / done
  Active: 'success', Done: 'success', Filed: 'success', Completed: 'success',
  'Filed / Completed': 'success', 'Partner Approved': 'success', Approved: 'success',
  // in-progress / info
  'In Progress': 'info', 'Under Review': 'info', Reviewed: 'info', Uploaded: 'info',
  'Document Received': 'info', Submitted: 'info',
  // waiting / warning
  Pending: 'warning', 'Waiting for Client': 'warning', 'On Hold': 'warning',
  Draft: 'neutral', 'Not Applicable': 'neutral',
  // negative
  Overdue: 'danger', Cancelled: 'neutral', Inactive: 'neutral', Closed: 'neutral',
  Urgent: 'danger', High: 'warning', Low: 'neutral',
}
export function StatusBadge({ status, dot = true, className = '' }) {
  if (!status) return null
  const tone = STATUS_TONE[status] || 'neutral'
  return <Badge tone={tone} dot={dot} className={className}>{status}</Badge>
}

/* ── Card ─────────────────────────────────────────────────────────────────── */
export function Card({ pad = false, interactive = false, className = '', children, ...rest }) {
  const cls = [
    'ds-card', pad ? 'ds-card-pad' : '', interactive ? 'ds-card-interactive' : '', className,
  ].filter(Boolean).join(' ')
  return <div className={cls} {...rest}>{children}</div>
}
export function CardHeader({ title, action }) {
  return (
    <div className="ds-card-head">
      <div className="ds-card-title">{title}</div>
      {action}
    </div>
  )
}

/*
 * MetricCard — a single key indicator. `accent` colours the left rail + value.
 * `onClick` makes it a keyboard-operable button (drill-down), else a plain tile.
 */
export function MetricCard({ label, value, accent, foot, onClick }) {
  const style = accent ? { '--ds-metric-accent': accent } : undefined
  const interactive = typeof onClick === 'function'
  return (
    <div
      className={`ds-metric ${interactive ? 'ds-metric-interactive' : ''}`.trim()}
      style={style}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      <div className="ds-metric-label">{label}</div>
      <div className="ds-metric-value">{value}</div>
      {foot != null && <div className="ds-metric-foot">{foot}</div>}
    </div>
  )
}

/* ── Page / section headers ──────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="ds-page-header">
      <div>
        <h1 className="ds-page-title">{title}</h1>
        {subtitle && <div className="ds-page-subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="ds-page-actions">{actions}</div>}
    </div>
  )
}
export function SectionHeader({ title, desc, action }) {
  return (
    <div className="ds-section-header">
      <div>
        <div className="ds-section-title">{title}</div>
        {desc && <div className="ds-section-desc">{desc}</div>}
      </div>
      {action}
    </div>
  )
}

/* ── Form controls ───────────────────────────────────────────────────────── */
export function Field({ label, htmlFor, required = false, error, hint, children }) {
  return (
    <div className={`ds-field ${error ? 'has-error' : ''}`.trim()}>
      {label && (
        <label className="ds-label" htmlFor={htmlFor}>
          {label}{required && <span className="ds-req" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="ds-hint">{hint}</span>}
      {error && <span className="ds-error-text" role="alert">{error}</span>}
    </div>
  )
}
export function Input({ className = '', ...rest }) {
  return <input className={`ds-input ${className}`.trim()} {...rest} />
}
export function Select({ className = '', children, ...rest }) {
  return <select className={`ds-select ${className}`.trim()} {...rest}>{children}</select>
}
export function Textarea({ className = '', ...rest }) {
  return <textarea className={`ds-textarea ${className}`.trim()} {...rest} />
}
