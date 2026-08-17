/**
 * ClientsBentoView — approved "Bento Workspace" visual skin for the Clients list
 * page (Concept 6, Phase 3). PRESENTATIONAL ONLY.
 * ----------------------------------------------------------------------------
 * Renders the Clients register in the approved Bento language: page header +
 * contextual primary action, summary cards, search + status filter, a responsive
 * table/card layout with consistent status chips, loading skeletons, an empty
 * state and a business-safe error state.
 *
 * This component performs NO data access — it receives already-loaded data and
 * handlers from the Clients container (src/components/Clients.jsx), which keeps
 * ALL business logic, Supabase reads, role/flag gates, validation and the detail
 * modal / Onboarding / Preview / Client 360 flows unchanged. Summary counts are
 * derived by the container purely from the already-loaded client array — no new
 * query is issued here. SVG icons only (no emoji), scoped under `.bento`.
 */
import { IconUserPlus, IconSearch, IconChevronRight, IconClients, IconCircle, IconClipboard, IconAlertCircle } from '../icons'

// Status label → chip tone. Mirrors the container's clientStatusLabel output
// (Draft / Active / Inactive / Archived / Unknown). Presentation only — the
// authoritative status truth stays in helpers.clientStatusLabel.
const STATUS_TONE = {
  Active: 'green',
  Draft: 'amber',
  Inactive: 'subtle',
  Archived: 'subtle',
  Unknown: 'subtle',
}

function StatusChip({ label }) {
  const tone = STATUS_TONE[label] || 'subtle'
  return <span className={`b-cl-chip b-cl-chip-${tone}`}><span className="b-cl-dot" />{label}</span>
}

const SUMMARY_CARDS = [
  { key: 'total', tone: 'blue', label: 'Total Clients', Icon: IconClients },
  { key: 'active', tone: 'green', label: 'Active', Icon: IconClients },
  { key: 'draft', tone: 'amber', label: 'Drafts', Icon: IconClipboard },
  { key: 'other', tone: 'purple', label: 'Inactive / Other', Icon: IconAlertCircle },
]

function SkeletonRows() {
  return (
    <div className="b-cl-skel-wrap" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="b-cl-skel-row">
          <span className="b-skel b-cl-skel-av" />
          <span className="b-skel b-cl-skel-line" />
          <span className="b-skel b-cl-skel-pill" />
        </div>
      ))}
    </div>
  )
}

export default function ClientsBentoView({
  summary,
  filtered,
  pageRows,
  search,
  onSearch,
  onClearSearch,
  onClearFilters,
  fStatus,
  onStatus,
  statuses,
  loading,
  loadError,
  onRetry,
  safePage,
  totalPages,
  pageSize,
  statusLabelOf,
  onPrev,
  onNext,
  onRowClick,
  onEditDraft,
  onStartOnboarding,
}) {
  const showPagination = !loading && !loadError && filtered.length > pageSize
  const from = (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, filtered.length)
  const searchActive = search.trim() !== ''
  const filtersActive = searchActive || fStatus !== 'All'

  return (
    <div className="b-cl">
      {/* Page header + primary action */}
      <div className="b-cl-header">
        <div>
          <h1 className="b-cl-title">Clients</h1>
          <p className="b-cl-subtitle">{summary.total} onboarded {summary.total === 1 ? 'client' : 'clients'}</p>
        </div>
        <button type="button" className="b-cl-primary" onClick={onStartOnboarding}>
          <IconUserPlus size={17} /> Start Onboarding
        </button>
      </div>

      {/* Summary cards — derived from already-loaded clients (no new query) */}
      <div className="b-cl-summary">
        {SUMMARY_CARDS.map(({ key, tone, label, Icon }) => (
          <div key={key} className={`b-kpi t-${tone} b-cl-stat`}>
            <div className="b-kpi-top">
              <span className="b-kpi-ico"><Icon size={19} /></span>
              <span className="b-kpi-label">{label}</span>
            </div>
            <div className="b-kpi-val">{summary[key]}</div>
          </div>
        ))}
      </div>

      {/* Toolbar: search + status filter + clear controls */}
      <div className="b-cl-toolbar">
        <div className="b-cl-search">
          <IconSearch size={17} />
          <input
            type="search"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search by name, client ID, mobile, or PAN..."
            aria-label="Search clients"
          />
          {searchActive && (
            <button type="button" className="b-cl-search-clear" onClick={onClearSearch} aria-label="Clear search" title="Clear search">×</button>
          )}
        </div>
        <select className="b-cl-select" value={fStatus} onChange={e => onStatus(e.target.value)} aria-label="Filter by status">
          <option value="All">All statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          <option value="Unknown">Unknown</option>
        </select>
        {filtersActive && (
          <button type="button" className="b-cl-clear-filters" onClick={onClearFilters}>Clear filters</button>
        )}
      </div>

      {/* Active-filter summary */}
      {!loading && !loadError && filtersActive && (
        <div className="b-cl-resultbar" role="status">
          <span>{filtered.length} {filtered.length === 1 ? 'result' : 'results'}{searchActive ? ` for “${search.trim()}”` : ''}{fStatus !== 'All' ? ` · ${fStatus}` : ''}</span>
        </div>
      )}

      {/* Register */}
      <section className="b-card b-cl-table">
        {loading ? (
          <SkeletonRows />
        ) : loadError ? (
          <div className="b-cl-state b-cl-state-error" role="alert">
            <div className="b-cl-state-title">Couldn’t load the client register</div>
            <div className="b-cl-state-copy">We couldn’t load the client register. Please retry. If the problem continues, contact the portal administrator.</div>
            <button type="button" className="b-cl-primary" onClick={onRetry}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="b-cl-state">
            <div className="b-cl-state-title">No clients found</div>
            <div className="b-cl-state-copy">No clients match your search or filter. Start onboarding to add your first client.</div>
          </div>
        ) : (
          <>
            <div className="b-cl-head-row" aria-hidden="true">
              <span>Client</span><span>Type</span><span>Mobile</span><span>PAN</span><span>Status</span><span>Code</span><span />
            </div>
            {pageRows.map(cl => (
              <button key={cl.id} type="button" className="b-cl-row" onClick={() => onRowClick(cl)}>
                <span className="b-cl-c-name">
                  <span className="b-cl-name-line">
                    <span className="b-cl-name">{cl.name}</span>
                    {cl.quick_onboarded && <span className="b-cl-tag b-cl-tag-quick">Quick</span>}
                    {cl.status === 'Draft' && <span className="b-cl-tag b-cl-tag-draft">Draft</span>}
                    {cl.status === 'Draft' && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="b-cl-editdraft"
                        onClick={e => { e.stopPropagation(); onEditDraft(cl) }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onEditDraft(cl) } }}
                      >Edit Draft</span>
                    )}
                  </span>
                </span>
                <span className="b-cl-c-type" data-label="Type">{cl.client_type || '—'}</span>
                <span className="b-cl-c-mobile" data-label="Mobile">{cl.mobile ? '+91 ' + cl.mobile : '—'}</span>
                <span className="b-cl-c-pan" data-label="PAN">{cl.pan || '—'}</span>
                <span className="b-cl-c-status" data-label="Status"><StatusChip label={statusLabelOf(cl.status)} /></span>
                <span className="b-cl-c-code" data-label="Code"><span className="b-cl-code">{cl.client_id}</span></span>
                <span className="b-cl-c-chev"><IconChevronRight size={16} /></span>
              </button>
            ))}
          </>
        )}
      </section>

      {showPagination && (
        <div className="b-cl-pager">
          <span className="b-cl-pager-info">Showing {from}–{to} of {filtered.length}</span>
          <div className="b-cl-pager-controls">
            <button type="button" className="b-cl-pgbtn" onClick={onPrev} disabled={safePage <= 1}>‹ Prev</button>
            <span className="b-cl-pager-page">Page {safePage} of {totalPages}</span>
            <button type="button" className="b-cl-pgbtn" onClick={onNext} disabled={safePage >= totalPages}>Next ›</button>
          </div>
        </div>
      )}
    </div>
  )
}
