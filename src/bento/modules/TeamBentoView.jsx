/**
 * TeamBentoView — approved Bento skin for the Team module. PRESENTATIONAL.
 * ----------------------------------------------------------------------------
 * Renders the already-loaded team + workload in the approved Bento language. NO
 * data access and NO auth calls — the admin "Reset password" action and all
 * loading/permission logic stay in the Team container (auth/invite mechanics
 * unchanged). SVG icons only; scoped under `.bento`.
 */
import {
  ModuleHeader, SummaryCards, Toolbar, SearchBox, FilterSelect, StatusChip,
  SkeletonList, EmptyState, ErrorState, ReadOnlyNotice,
} from './primitives'
import { IconUsers, IconTeam, IconClipboard } from '../icons'

export default function TeamBentoView({
  summary, filtered,
  search, onSearch, onClearSearch, onClearFilters,
  fRole, onRole, roles, fStatus, onStatus,
  loading, loadError, onRetry,
  isAdmin, loginDisabled, taskCountOf, onReset, resettingId, feedbackOf,
}) {
  const searchActive = search.trim() !== ''
  const filtersActive = searchActive || fRole !== 'All' || fStatus !== 'All'
  const cards = [
    { key: 'total', tone: 'blue', label: 'Team Members', value: summary.total, Icon: IconTeam },
    { key: 'active', tone: 'green', label: 'Active', value: summary.active, Icon: IconUsers },
    { key: 'inactive', tone: 'subtle', label: 'Inactive', value: summary.inactive, Icon: IconUsers },
    { key: 'openTasks', tone: 'amber', label: 'Open Tasks', value: summary.openTasks, Icon: IconClipboard },
  ]

  return (
    <div className="b-mod">
      <ModuleHeader title="Team" subtitle={`${summary.active} active ${summary.active === 1 ? 'member' : 'members'} · your firm and workload`} />

      {isAdmin && loginDisabled && (
        <ReadOnlyNotice>Login creation is temporarily disabled — accounts are created through the approved administrator process. You can still send password-reset emails below.</ReadOnlyNotice>
      )}

      <SummaryCards cards={cards} />

      <Toolbar>
        <SearchBox value={search} onChange={onSearch} onClear={onClearSearch} placeholder="Search by name or email…" label="Search team" />
        <FilterSelect value={fRole} onChange={onRole} label="Filter by role"
          options={[{ value: 'All', label: 'All roles' }, ...roles.map(r => ({ value: r, label: r }))]} />
        <FilterSelect value={fStatus} onChange={onStatus} label="Filter by status"
          options={[{ value: 'All', label: 'All statuses' }, { value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} />
        {filtersActive && <button type="button" className="b-cl-clear-filters" onClick={onClearFilters}>Clear filters</button>}
      </Toolbar>

      {!loading && !loadError && filtersActive && (
        <div className="b-cl-resultbar" role="status"><span>{filtered.length} {filtered.length === 1 ? 'member' : 'members'}{searchActive ? ` for “${search.trim()}”` : ''}</span></div>
      )}

      {loading ? (
        <section className="b-mod-table"><SkeletonList rows={4} /></section>
      ) : loadError ? (
        <section className="b-mod-table"><ErrorState title="Couldn’t load team data" onRetry={onRetry} /></section>
      ) : filtered.length === 0 ? (
        <section className="b-mod-table"><EmptyState title="No team members found" copy={filtersActive ? 'No members match your filters.' : 'No team members yet.'}>
          {filtersActive && <button type="button" className="b-mod-primary" onClick={onClearFilters}>Clear filters</button>}
        </EmptyState></section>
      ) : (
        <div className="b-tm-grid">
          {filtered.map(m => {
            const fb = feedbackOf(m.id)
            return (
              <div key={m.id} className={`b-tm-card${m.is_active ? '' : ' is-inactive'}`}>
                <div className="b-tm-head">
                  <span className="b-tm-av" style={{ background: m.color || 'var(--b-green)' }}>{m.initials}</span>
                  <div className="b-tm-meta">
                    <div className="b-tm-name">{m.name}</div>
                    <div className="b-tm-role">{m.role}</div>
                    {m.email && <div className="b-tm-email">{m.email}</div>}
                  </div>
                  <StatusChip label={m.is_active ? 'Active' : 'Inactive'} tone={m.is_active ? 'green' : 'subtle'} />
                </div>
                <div className="b-tm-foot">
                  <span className="b-tm-tasks"><span className="b-tm-tasks-n">{taskCountOf(m.name)}</span> open tasks</span>
                  {isAdmin && m.is_active && (
                    <button type="button" className="b-mod-secondary b-tm-reset" disabled={resettingId !== null} onClick={() => onReset(m)}>
                      {resettingId === m.id ? 'Sending…' : 'Reset password'}
                    </button>
                  )}
                </div>
                {fb === 'reset' && <div className="b-tm-fb b-tm-fb-ok">Password reset email sent to {m.email}</div>}
                {fb === 'reset-failed' && <div className="b-tm-fb b-tm-fb-err">Couldn’t send the reset email. Please try again.</div>}
                {fb === 'success' && <div className="b-tm-fb b-tm-fb-ok">Login created — share the password with {m.name}</div>}
                {fb && fb.startsWith('error:') && <div className="b-tm-fb b-tm-fb-err">{fb.replace('error: ', '')}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
