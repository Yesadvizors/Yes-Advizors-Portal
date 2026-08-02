/*
 * Yes Advizors — shared LOADING / EMPTY / ERROR state components.
 * Consistent, business-safe presentation for the three async states every list
 * and panel needs. ErrorState NEVER renders a raw error.message — callers pass a
 * business-safe `message` and log technical detail to the console themselves.
 */

/* Loading — spinner + optional label. */
export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="ds-state" role="status" aria-live="polite">
      <div className="ds-spinner" aria-hidden="true" />
      <div className="ds-state-desc" style={{ marginBottom: 0 }}>{label}</div>
    </div>
  )
}

/* Empty — neutral "nothing here yet" with an optional primary action. */
export function EmptyState({ icon = '📭', title = 'Nothing here yet', message, action }) {
  return (
    <div className="ds-state">
      <div className="ds-state-ico" aria-hidden="true">{icon}</div>
      <div className="ds-state-title">{title}</div>
      {message && <div className="ds-state-desc">{message}</div>}
      {action}
    </div>
  )
}

/*
 * Error — business-safe failure state with a Retry affordance.
 * `message` must already be business-safe (no raw SQL / RLS / error.message).
 */
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this information. Please retry. If the problem continues, contact the portal administrator.",
  onRetry,
  retryLabel = 'Retry',
}) {
  return (
    <div className="ds-state is-error" role="alert">
      <div className="ds-state-ico" aria-hidden="true">⚠️</div>
      <div className="ds-state-title">{title}</div>
      <div className="ds-state-desc">{message}</div>
      {onRetry && <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={onRetry}>{retryLabel}</button>}
    </div>
  )
}

/* Inline skeleton row block for table/list placeholders. */
export function Skeleton({ width = '100%', height = 14, style }) {
  return <div className="ds-skel" style={{ width, height, ...style }} aria-hidden="true" />
}
