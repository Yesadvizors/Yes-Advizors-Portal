import { useState, useEffect } from 'react'
import { useServiceApplicabilityRole } from '../../hooks/useServiceApplicabilityRole'
import { useServiceApplicabilityData } from '../../hooks/useServiceApplicabilityData'
import ServiceApplicabilityLiveTable from './ServiceApplicabilityLiveTable'
import ServiceApplicabilityHistory from './ServiceApplicabilityHistory'
import { LoadingState, ErrorState, EmptyLiveState, RefreshButton } from './ServiceApplicabilityStates'
import ServiceApplicabilityFormModal from './ServiceApplicabilityFormModal'
import ServiceApplicabilityStatusModal from './ServiceApplicabilityStatusModal'
import { Toast, W } from './ServiceApplicabilityModalShell'
import { buildRestartDraft } from '../../lib/serviceApplicability'

/*
 * P5 CP-5/CP-6/CP-7 — Service Applicability section: the read-only views PLUS the
 * capability-gated write orchestration (add / edit / approve / deactivate / start-again).
 *
 * Gating (fail closed), unchanged from CP-4:
 *  - hidden unless VITE_P5_UI === 'true' (case-insensitive; absent/blank/false → hidden);
 *  - hidden while the role is loading (never flash restricted content);
 *  - hidden for role errors / non-Admin-Manager / inactive users (no denied panel).
 *
 * The section OWNS the two write modals and toast; it performs no writes itself — every
 * mutation happens inside a modal, which calls the CP-2 service wrappers only (no direct
 * Supabase / .rpc / .from anywhere in the UI). Per-row action buttons are handed to the
 * read tables ONLY as callbacks, gated by the CP-3 capabilities; the DB RPCs (incl. the
 * PG-1 OTHER-notes guard and the optimistic-lock row_version guard) remain the authority.
 *
 * Optimistic-lock UX (approved): on STALE_ROW_VERSION a modal calls onConflict — the
 * section closes the modal, refreshes authoritative data, and shows a conflict toast so
 * the user must reopen and reapply. Stale form values are discarded, never re-submitted.
 *
 * @param {{clientId: string, user: any}} props  clientId = authoritative clients.id (uuid)
 */
export default function ServiceApplicabilitySection({ clientId, user }) {
  const env = import.meta.env || {}
  const flagEnabled = String(env.VITE_P5_UI).toLowerCase() === 'true'

  const role = useServiceApplicabilityRole(user)
  const visible = flagEnabled && !role.loading && !role.error && role.canView === true

  // Hidden → null clientId → the data hook is idle (no reads for a hidden section).
  const data = useServiceApplicabilityData(visible ? clientId : null)

  const [modal, setModal] = useState(null) // { type: 'create'|'edit'|'approve'|'deactivate', row?, seed? }
  const [toast, setToast] = useState(null) // { ok, msg }

  // Auto-dismiss the toast; this is UI feedback only (NOT data polling/retry).
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  if (!flagEnabled) return null
  if (role.loading) return null // do not flash restricted content
  if (role.error || role.canView !== true) return null // fail closed; no permission-denied panel

  const closeModal = () => setModal(null)
  const onSaved = (kind) => { setModal(null); data.refresh(); setToast({ ok: true, msg: SUCCESS[kind] || 'Saved.' }) }
  const onConflict = () => { setModal(null); data.refresh(); setToast({ ok: false, msg: CONFLICT_MSG }) }

  // Capability-gated action callbacks (undefined when not permitted → the tables hide them).
  const liveActions = {
    onEdit: role.canEdit ? (row) => setModal({ type: 'edit', row }) : undefined,
    onApprove: role.canApprove ? (row) => setModal({ type: 'approve', row }) : undefined,
    onDeactivate: role.canDeactivate ? (row) => setModal({ type: 'deactivate', row }) : undefined,
  }
  const onRestart = role.canRestart
    ? (row) => setModal({ type: 'create', seed: buildRestartDraft(row) })
    : undefined

  const canAdd = role.canCreate && !data.loading && !data.error && data.availableServiceCodes.length > 0

  return (
    <section aria-labelledby="p5-sa-heading" style={ST.card}>
      <div style={ST.head}>
        <h3 id="p5-sa-heading" style={ST.title}>Service Applicability</h3>
        <div style={ST.headActions}>
          {canAdd && (
            <button type="button" style={W.primary} onClick={() => setModal({ type: 'create' })}>
              + Add service
            </button>
          )}
          <RefreshButton onClick={data.refresh} refreshing={data.refreshing} />
        </div>
      </div>

      {data.loading ? (
        <LoadingState />
      ) : data.error ? (
        <ErrorState message={data.error.message} onRetry={data.refresh} />
      ) : (
        <>
          {data.liveRows.length === 0 ? (
            <EmptyLiveState />
          ) : (
            <ServiceApplicabilityLiveTable rows={data.liveRows} actions={liveActions} />
          )}
          <ServiceApplicabilityHistory
            rows={data.historyRows}
            onRestart={onRestart}
            availableCodes={data.availableServiceCodes}
          />
        </>
      )}

      {(modal && (modal.type === 'create' || modal.type === 'edit')) && (
        <ServiceApplicabilityFormModal
          mode={modal.type}
          clientId={clientId}
          row={modal.row}
          seed={modal.seed}
          catalogue={data.catalogue}
          availableServiceCodes={data.availableServiceCodes}
          teamMembers={data.teamMembers}
          registrations={data.registrations}
          onClose={closeModal}
          onSaved={onSaved}
          onConflict={onConflict}
        />
      )}
      {(modal && (modal.type === 'approve' || modal.type === 'deactivate')) && (
        <ServiceApplicabilityStatusModal
          action={modal.type}
          row={modal.row}
          onClose={closeModal}
          onDone={onSaved}
          onConflict={onConflict}
        />
      )}

      <Toast toast={toast} />
    </section>
  )
}

const SUCCESS = {
  create: 'Service applicability added.',
  edit: 'Service applicability updated.',
  approve: 'Service applicability approved.',
  deactivate: 'Service applicability deactivated.',
}
const CONFLICT_MSG =
  'This record changed since you opened it. It has been refreshed — please reopen and reapply your change.'

const ST = {
  card: { border: '1px solid #E2E5E1', borderRadius: 10, padding: '12px 14px', background: '#FAFCFB' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 },
  title: { fontSize: 13, fontWeight: 700, color: 'var(--ds-text)', margin: 0 },
  headActions: { display: 'flex', alignItems: 'center', gap: 8 },
}
