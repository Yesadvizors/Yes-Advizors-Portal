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
export const Muted = ({ children }) => <div style={S.muted}>{children}</div>
export const Err = ({ children }) => <div style={S.err}>Could not load this section: {children}</div>

export function Card({ title, count, children }) {
  return (
    <div style={S.card}>
      <div style={S.cardHead}>
        <span>{title}</span>
        {typeof count === 'number' && <span style={S.count}>{count}</span>}
      </div>
      <div style={{ padding: '4px 0' }}>{children}</div>
    </div>
  )
}

export function TableView({ columns, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={S.table}>
        <thead>
          <tr>{columns.map((c) => <th key={c.key} style={S.th}>{c.label}</th>)}</tr>
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
      {s.loading ? <div style={S.muted}>Loading…</div>
        : s.error ? <div style={S.err}>Could not load this section: {s.error}</div>
          : s.rows.length === 0 ? <div style={S.muted}>{emptyLabel}</div>
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
  overlay: { position: 'fixed', inset: 0, background: 'rgba(10,20,16,.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', zIndex: 9998, overflowY: 'auto' },
  panel: { background: '#fff', borderRadius: 14, width: 'min(940px,100%)', boxShadow: '0 20px 60px rgba(0,0,0,.35)' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E5E1', background: '#0A3D2C', borderRadius: '14px 14px 0 0' },
  badge: { fontSize: 10, letterSpacing: '.08em', fontWeight: 700, color: '#E8D5A3' },
  title: { fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 3 },
  code: { fontSize: 12, fontWeight: 600, color: '#B7D8C6', marginLeft: 6 },
  close: { background: 'rgba(255,255,255,.1)', color: '#fff', border: 'none', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  body: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  note: { fontSize: 12, color: '#5A6B62', background: '#F3F7F5', border: '1px solid #E2E5E1', borderRadius: 8, padding: '9px 12px' },
  deny: { padding: 24, fontSize: 13, color: '#7F1D1D' },
  card: { border: '1px solid #E2E5E1', borderRadius: 10, padding: '12px 14px', background: '#FAFCFB' },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#0A3D2C', marginBottom: 6 },
  count: { fontSize: 11, fontWeight: 700, color: '#0A3D2C', background: '#E4EFEA', borderRadius: 99, padding: '1px 9px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '6px 10px', color: '#5A6B62', fontWeight: 600, borderBottom: '1px solid #E2E5E1', whiteSpace: 'nowrap' },
  td: { padding: '6px 10px', color: '#233', borderBottom: '1px solid #EFF2F0', whiteSpace: 'nowrap' },
  muted: { fontSize: 12, color: '#8A968F', padding: '4px 2px' },
  err: { fontSize: 12, color: '#B45309', background: '#FEF3E2', border: '1px solid #F5D9AE', borderRadius: 6, padding: '7px 10px' },
}
