import { useState, useEffect } from 'react'
import { useEscapeKey } from '../../useEscapeKey'
import { useClientMasterRole } from '../../hooks/useClientMasterRole'
import PersonsSection from './sections/PersonsSection'
import IdentifiersSection from './sections/IdentifiersSection'
import ContactsSection from './sections/ContactsSection'
import AddressesSection from './sections/AddressesSection'
import RegistrationsGstSection from './sections/RegistrationsGstSection'
import RelationshipsSection from './sections/RelationshipsSection'
import ServiceApplicabilitySection from '../serviceApplicability/ServiceApplicabilitySection'

/*
 * P2.1 — READ-ONLY Client Master Preview (Admin/Manager only, existing client only).
 *
 * Relational key: clients.id (uuid), received as `clientId`. `clientCode` (YA-code)
 * and `clientName` are display-only. No writes, no clients-row creation, no legacy
 * dual-write. Sections load independently (one failure does not block the others).
 */

// --- shared read-only presentational primitives (exported for the sections) ---
const dash = (v) => (v === null || v === undefined || v === '') ? '—' : v
export const yesno = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—')
export const Muted = ({ children }) => <div style={{ ...S.stateWrap, ...S.muted }}>{children}</div>
export const Err = ({ children }) => <div style={S.err}>Could not load this section: {children}</div>

export function Card({ title, count, children }) {
  return (
    <div className="ds-card" style={S.card}>
      <div className="ds-card-head">
        <span className="ds-card-title">{title}</span>
        {typeof count === 'number' && <span className="ds-badge ds-badge-neutral">{count}</span>}
      </div>
      <div style={S.cardBody}>{children}</div>
    </div>
  )
}

export function TableView({ columns, rows }) {
  return (
    <div style={S.tableWrap}>
      <table className="ds-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || r.registration_id || i}>
              {columns.map((c) => (
                <td key={c.key} style={S.td}>{dash(c.render ? c.render(r) : r[c.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Generic single-table read section with its OWN loading / empty / error state.
 * `load` is a stable module-level read function; the effect keys on `clientId`.
 */
export function ReadSection({ title, clientId, load, columns, emptyLabel = 'No records.' }) {
  const [s, setS] = useState({ loading: true, error: null, rows: [] })
  useEffect(() => {
    let alive = true
    setS({ loading: true, error: null, rows: [] })
    Promise.resolve(load(clientId))
      .then(({ data, error }) => {
        if (!alive) return
        setS(error
          ? { loading: false, error: error.message || String(error), rows: [] }
          : { loading: false, error: null, rows: data || [] })
      })
      .catch((e) => { if (alive) setS({ loading: false, error: e?.message || String(e), rows: [] }) })
    return () => { alive = false }
  }, [clientId, load])

  return (
    <Card title={title} count={s.loading || s.error ? undefined : s.rows.length}>
      {s.loading ? <div style={{ ...S.stateWrap, ...S.muted }}>Loading…</div>
        : s.error ? <div style={S.err}>Could not load this section: {s.error}</div>
          : s.rows.length === 0 ? <div style={{ ...S.stateWrap, ...S.muted }}>{emptyLabel}</div>
            : <TableView columns={columns} rows={s.rows} />}
    </Card>
  )
}

export default function ClientMasterPreview({ clientId, clientCode, clientName, user, onClose }) {
  const { isAdminOrManager } = useClientMasterRole(user)
  useEscapeKey(onClose)

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.panel}>
        <div style={S.head}>
          <div>
            <div style={S.badge}>CLIENT MASTER · PREVIEW (READ-ONLY)</div>
            <div style={S.title}>{dash(clientName)} <span style={S.code}>{dash(clientCode)}</span></div>
          </div>
          <button style={S.close} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {!isAdminOrManager ? (
          <div style={S.deny}>This preview is available to Admin and Manager roles only.</div>
        ) : (
          <div style={S.body}>
            <div style={S.note}>
              Read-only view of the normalized client-master tables for this client (keyed on
              its UUID). No changes can be made here. Lifecycle actions (Deactivate / Reactivate)
              arrive in a later phase.
            </div>
            <PersonsSection clientId={clientId} />
            <IdentifiersSection clientId={clientId} />
            <ContactsSection clientId={clientId} />
            <AddressesSection clientId={clientId} />
            <RegistrationsGstSection clientId={clientId} />
            <RelationshipsSection clientId={clientId} />
            {/* P5 CP-4: read-only Service Applicability (hidden unless VITE_P5_UI==='true'). */}
            <ServiceApplicabilitySection clientId={clientId} user={user} />
          </div>
        )}
      </div>
    </div>
  )
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(10,22,40,.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', zIndex: 9998, overflowY: 'auto' },
  panel: { background: 'var(--ds-surface)', borderRadius: 'var(--ds-r-xl)', width: 'min(940px,100%)', boxShadow: 'var(--ds-shadow-lg)', overflow: 'hidden' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-navy)' },
  badge: { fontSize: 'var(--ds-fs-2xs)', letterSpacing: '.09em', fontWeight: 700, color: 'var(--ds-brand-200)', textTransform: 'uppercase' },
  title: { fontSize: 'var(--ds-fs-lg)', fontWeight: 700, color: '#fff', marginTop: 3 },
  code: { fontSize: 'var(--ds-fs-sm)', fontWeight: 600, color: 'rgba(255,255,255,.62)', marginLeft: 6 },
  close: { background: 'rgba(255,255,255,.12)', color: '#fff', border: 'none', width: 32, height: 32, borderRadius: 'var(--ds-r-sm)', cursor: 'pointer', fontSize: 14 },
  body: { padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--ds-bg)' },
  note: { fontSize: 'var(--ds-fs-sm)', color: 'var(--ds-text-muted)', background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-r)', padding: '11px 14px', lineHeight: 'var(--ds-lh)' },
  deny: { padding: 24, fontSize: 'var(--ds-fs-md)', color: 'var(--ds-danger)' },
  card: {},
  cardBody: { padding: '6px 0' },
  tableWrap: { overflowX: 'auto', padding: '2px 2px 6px' },
  td: { whiteSpace: 'nowrap' },
  stateWrap: { padding: '12px 18px' },
  muted: { fontSize: 'var(--ds-fs-sm)', color: 'var(--ds-text-subtle)' },
  err: { margin: '10px 18px 12px', fontSize: 'var(--ds-fs-sm)', color: 'var(--ds-danger)', background: 'var(--ds-danger-bg)', border: '1px solid var(--ds-danger-bd)', borderRadius: 'var(--ds-r-sm)', padding: '9px 12px' },
}
