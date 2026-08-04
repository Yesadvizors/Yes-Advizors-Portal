/** Card + MetricCard — presentational surfaces. */
export function Card({ title, action, pad = true, interactive, children, className = '', ...rest }) {
  const cls = ['rd-card', interactive && 'rd-card-interactive', className].filter(Boolean).join(' ')
  return (
    <div className={cls} {...rest}>
      {title && (
        <div className="rd-card-head">
          <span className="rd-card-title">{title}</span>
          {action}
        </div>
      )}
      <div className={pad ? 'rd-card-body' : ''}>{children}</div>
    </div>
  )
}

/**
 * MetricCard — a compact KPI tile. `accent` sets the icon colour via a CSS var.
 * `trend` = { dir: 'up'|'down', label } renders a small delta line.
 */
export function MetricCard({ icon, label, value, foot, trend, accent, onClick }) {
  const style = accent ? { '--rd-metric-accent': accent } : undefined
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      className={`rd-metric${onClick ? ' rd-metric-interactive' : ''}`}
      style={style}
      onClick={onClick}
      {...(onClick ? { type: 'button' } : {})}
    >
      <div className="rd-metric-top">
        <span className="rd-metric-label">{label}</span>
        {icon && <span className="rd-metric-ico">{icon}</span>}
      </div>
      <div className="rd-metric-value">{value}</div>
      {(foot || trend) && (
        <div className="rd-metric-foot">
          {trend && <span className={`rd-metric-trend is-${trend.dir}`}>{trend.dir === 'up' ? '▲' : '▼'} {trend.label}</span>}
          {foot}
        </div>
      )}
    </Tag>
  )
}
