import { fmtDate } from '../../helpers'

/*
 * P5 CP-4 — Service Applicability shared read-only presentational primitives:
 * status badge, refresh button, loading / error / empty states, and SAFE date /
 * frequency / fallback formatters. No data access, no write controls.
 */

// ── H. safe formatters ─────────────────────────────────────────────────────

/** Frequency code → readable label. Unknown/blank → safe fallback '—'. */
export const FREQUENCY_LABELS = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half-yearly',
  ANNUAL: 'Annual',
  EVENT_BASED: 'Event-based',
  ONE_TIME: 'One-time',
  AS_REQUIRED: 'As required',
}
export function formatFrequency(code) {
  return (code && FREQUENCY_LABELS[code]) || '—'
}

/** Reuse fmtDate, but guard invalid/malformed dates → '—' (never throws). */
export function safeDate(value) {
  if (!value) return '—'
  const t = new Date(value)
  if (Number.isNaN(t.getTime())) return '—'
  return fmtDate(value)
}

export function orDash(value) {
  return value === null || value === undefined || value === '' ? '—' : value
}
export function orNotAssigned(value) {
  return value === null || value === undefined || value === '' ? 'Not assigned' : value
}

// ── status badge (existing palette) ────────────────────────────────────────
const BADGE = {
  Draft: { bg: 'var(--ds-warning-bg)', c: 'var(--ds-warning)' },
  Approved: { bg: 'var(--ds-success-bg)', c: 'var(--ds-success)' },
  Inactive: { bg: 'var(--ds-neutral-bg)', c: 'var(--ds-text-muted)' },
}
export function StatusBadge({ status }) {
  const s = BADGE[status] || { bg: 'var(--ds-neutral-bg)', c: 'var(--ds-text-muted)' }
  return (
    <span style={{ ...S.badge, background: s.bg, color: s.c }}>{orDash(status)}</span>
  )
}

/** Notes shown as plain, truncated, escaped text (title carries the full value). */
export function NotesCell({ text }) {
  if (text === null || text === undefined || text === '') return <span>—</span>
  const full = String(text)
  const short = full.length > 60 ? `${full.slice(0, 60)}…` : full
  return <span title={full}>{short}</span>
}

// ── refresh control (accessible; marked while refreshing) ──────────────────
export function RefreshButton({ onClick, refreshing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      aria-label={refreshing ? 'Refreshing service applicability' : 'Refresh service applicability'}
      aria-busy={refreshing ? 'true' : 'false'}
      style={{ ...S.refreshBtn, opacity: refreshing ? 0.6 : 1, cursor: refreshing ? 'default' : 'pointer' }}
    >
      {refreshing ? 'Refreshing…' : 'Refresh'}
    </button>
  )
}

// ── states ─────────────────────────────────────────────────────────────────
export function LoadingState() {
  return <div style={S.muted} role="status">Loading service applicability…</div>
}

export function ErrorState({ message, onRetry }) {
  return (
    <div style={S.error} role="alert">
      <span>{orDash(message)}</span>
      {typeof onRetry === 'function' && (
        <button type="button" onClick={onRetry} aria-label="Retry loading service applicability" style={S.retryBtn}>
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyLiveState() {
  return (
    <div style={S.muted}>
      No active service applicability records are configured for this client.
    </div>
  )
}

export const S = {
  badge: { fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '2px 9px', whiteSpace: 'nowrap' },
  muted: { fontSize: 12, color: 'var(--ds-text-muted)', padding: '6px 2px' },
  error: { fontSize: 12, color: 'var(--ds-warning)', background: 'var(--ds-warning-bg)', border: '1px solid var(--ds-warning-bd)', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  retryBtn: { background: 'var(--ds-warning)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
  refreshBtn: { background: 'var(--ds-primary-light)', color: 'var(--ds-primary)', border: '1px solid var(--ds-primary-border)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '6px 10px', color: 'var(--ds-text-muted)', fontWeight: 600, borderBottom: '1px solid var(--ds-border)', whiteSpace: 'nowrap' },
  td: { padding: '6px 10px', color: 'var(--ds-text)', borderBottom: '1px solid var(--ds-border-2)', whiteSpace: 'nowrap' },
}
