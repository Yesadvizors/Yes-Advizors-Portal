/**
 * Client 360° — shared presentational primitives.
 *
 * Pure presentation: no Supabase, no .rpc, no data access. Styling follows the repo
 * convention (inline style-token objects + a few CSS variables). Every state primitive
 * distinguishes loading / empty / error / access-denied explicitly and carries the
 * appropriate ARIA role, and no primitive renders a raw backend error string — callers
 * pass already-safe copy.
 */

import { fmtDate } from '../../helpers'

export const C = {
  ink: '#0A3D2C', ink2: '#0D7A53', body: '#233', muted: '#5A6B62', faint: '#8A968F',
  border: '#E2E5E1', border2: '#EFF2F0', surface: '#FFFFFF', soft: '#FAFCFB', panelSoft: '#F3F7F5',
  red: '#B91C1C', redSoft: '#FEE2E2', amber: '#B45309', amberSoft: '#FEF3E2',
  green: '#166534', greenSoft: '#DCFCE7', blue: '#1D4ED8', blueSoft: '#EFF6FF',
}

export const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(10,20,16,.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 14px', zIndex: 9998, overflowY: 'auto' },
  panel: { background: '#fff', borderRadius: 14, width: 'min(1120px,100%)', boxShadow: '0 20px 60px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column' },
  head: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: '1px solid #E2E5E1', background: '#0A3D2C', borderRadius: '14px 14px 0 0', flexWrap: 'wrap' },
  eyebrow: { fontSize: 10, letterSpacing: '.08em', fontWeight: 700, color: '#E8D5A3' },
  title: { fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 3 },
  code: { fontSize: 12, fontWeight: 600, color: '#B7D8C6', marginLeft: 8 },
  close: { background: 'rgba(255,255,255,.12)', color: '#fff', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 15, flexShrink: 0 },
  body: { padding: '16px 20px 22px', display: 'flex', flexDirection: 'column', gap: 16 },
  pills: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  pill: { fontSize: 11, fontWeight: 600, borderRadius: 99, padding: '3px 10px', background: 'rgba(255,255,255,.08)', color: '#B7D8C6', border: '1px solid rgba(183,216,198,.35)' },

  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 },
  stat: { border: '1px solid #E2E5E1', borderRadius: 12, padding: '12px 14px', background: '#FAFCFB', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, width: '100%' },
  statValue: { fontSize: 24, fontWeight: 700, lineHeight: 1, letterSpacing: '-.02em' },
  statLabel: { fontSize: 12, color: '#5A6B62', fontWeight: 500 },

  cardWrap: { border: '1px solid #E2E5E1', borderRadius: 12, background: '#fff' },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 16px', borderBottom: '1px solid #EFF2F0' },
  cardTitle: { fontSize: 13.5, fontWeight: 700, color: '#0A3D2C' },
  cardBody: { padding: '12px 16px' },

  tabs: { display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid #E2E5E1', paddingBottom: 0 },
  tab: (active) => ({ appearance: 'none', border: 'none', background: 'none', padding: '9px 13px', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#0A3D2C' : '#5A6B62', borderBottom: active ? '2px solid #0D7A53' : '2px solid transparent', cursor: 'pointer', marginBottom: -1 }),

  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: { textAlign: 'left', padding: '7px 10px', color: '#5A6B62', fontWeight: 600, borderBottom: '1px solid #E2E5E1', whiteSpace: 'nowrap' },
  td: { padding: '7px 10px', color: '#233', borderBottom: '1px solid #EFF2F0', verticalAlign: 'top' },

  kv: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px 22px' },
  kvLabel: { fontSize: 11, color: '#8A968F', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' },
  kvValue: { fontSize: 13.5, color: '#233', marginTop: 2, fontWeight: 500, wordBreak: 'break-word' },

  muted: { fontSize: 12.5, color: '#8A968F', padding: '10px 2px' },
  errBox: { fontSize: 12.5, color: '#B45309', background: '#FEF3E2', border: '1px solid #F5D9AE', borderRadius: 8, padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  retry: { appearance: 'none', border: '1px solid #E0BE8C', background: '#fff', color: '#92400E', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  action: { appearance: 'none', border: '1px solid #0D7A53', background: '#0D7A53', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
  ghost: { appearance: 'none', border: '1px solid #CFE0D7', background: '#fff', color: '#0A3D2C', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
}

export const dash = (v) => (v === null || v === undefined || String(v).trim() === '' ? '—' : v)
export const yesno = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—')
export const dateText = (v) => (v ? fmtDate(v) : '—')

/** Tone → colour pair, used by badges and attention rows. */
export function tone(name) {
  switch (name) {
    case 'critical': case 'red': case 'overdue': return { bg: C.redSoft, c: C.red }
    case 'warning': case 'amber': case 'today': case 'duesoon': return { bg: C.amberSoft, c: C.amber }
    case 'good': case 'green': case 'closed': return { bg: C.greenSoft, c: C.green }
    default: return { bg: '#F1F5F4', c: C.muted }
  }
}

export function Badge({ children, toneName = 'neutral' }) {
  const t = tone(toneName)
  return <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '2px 9px', background: t.bg, color: t.c, whiteSpace: 'nowrap' }}>{children}</span>
}

/**
 * A summary card. When `error` is true the card shows a failed-load indicator ("—" +
 * "· failed") in a warning tone instead of the value — so a failed query is NEVER shown
 * as a false zero. `value` may be a number or a short string (e.g. a Yes/No signal).
 */
export function StatCard({ label, value, toneName = 'neutral', onClick, error = false }) {
  const t = tone(toneName)
  const numeric = typeof value === 'number'
  const urgent = !error && (toneName === 'critical' || toneName === 'red') && numeric && value > 0
  const active = !error && ((numeric && value > 0) || (!numeric && value != null))
  return (
    <button type="button" onClick={onClick} style={S.stat}
      aria-label={error ? `${label}: unavailable, failed to load` : `${label}: ${value}`}>
      <span style={{ ...S.statValue, color: error ? C.amber : urgent ? C.red : C.ink }}>{error ? '—' : value}</span>
      <span style={S.statLabel}>{label}{error ? ' · failed' : ''}</span>
      <span aria-hidden="true" style={{ height: 3, borderRadius: 3, background: error ? C.amber : active ? t.c : C.border, opacity: error || active ? 0.9 : 0.5 }} />
    </button>
  )
}

export function Panel({ title, right, children }) {
  return (
    <section style={S.cardWrap}>
      <div style={S.cardHead}>
        <span style={S.cardTitle}>{title}</span>
        {right != null && <span>{right}</span>}
      </div>
      <div style={S.cardBody}>{children}</div>
    </section>
  )
}

export function LoadingState({ label = 'Loading…' }) {
  return <div role="status" style={S.muted}>{label}</div>
}

/** Error state — `message` must already be safe copy (never a raw backend string). */
export function ErrorState({ message = 'This section could not be loaded.', onRetry }) {
  return (
    <div role="alert" style={S.errBox}>
      <span>{message}</span>
      {onRetry && <button type="button" style={S.retry} onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function EmptyState({ label = 'Nothing to show.' }) {
  return <div style={S.muted}>{label}</div>
}

/**
 * One place that resolves a panel's state to the right UI: loading → error → empty →
 * content. A failed load NEVER renders as an empty success. `error` is a boolean from the
 * hook; the human copy lives here so no raw backend text can leak.
 */
export function SectionState({ loading, error, empty, onRetry, errorMessage, emptyLabel, children }) {
  if (loading) return <LoadingState />
  if (error) return <ErrorState message={errorMessage} onRetry={onRetry} />
  if (empty) return <EmptyState label={emptyLabel} />
  return children
}

export function DataTable({ columns, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={S.table}>
        <thead>
          <tr>{columns.map((c) => <th key={c.key} scope="col" style={S.th}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {columns.map((c) => <td key={c.key} style={S.td}>{c.render ? c.render(r) : dash(r[c.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function KeyVal({ items }) {
  return (
    <div style={S.kv}>
      {items.map((it) => (
        <div key={it.label}>
          <div style={S.kvLabel}>{it.label}</div>
          <div style={S.kvValue}>{it.value == null || it.value === '' ? '—' : it.value}</div>
        </div>
      ))}
    </div>
  )
}
