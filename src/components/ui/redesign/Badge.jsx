/** Badge — presentational status pill. tone: success|warning|danger|info|neutral. */
export function Badge({ tone = 'neutral', dot, children, className = '' }) {
  return (
    <span className={`rd-badge rd-badge-${tone} ${className}`.trim()}>
      {dot && <span className="rd-badge-dot" aria-hidden="true" />}
      {children}
    </span>
  )
}
