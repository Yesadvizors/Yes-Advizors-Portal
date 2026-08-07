/**
 * DocumentsBentoView — approved Bento skin for the Documents module. PRESENTATIONAL.
 * ----------------------------------------------------------------------------
 * Renders the already-loaded document register in the approved Bento language.
 * NO data access, NO storage calls — every value + handler (view / download /
 * delete / upload / filters) is supplied by the DocumentsHub container, which keeps
 * all storage-bucket / object-path / signed-URL / upload / permission logic intact.
 * SVG icons only; scoped under `.bento`.
 */
import { fmtDate } from '../../helpers'
import {
  ModuleHeader, PrimaryButton, SummaryCards, Toolbar, SearchBox, FilterSelect,
  StatusChip, SkeletonList, EmptyState, ErrorState, Pagination, IconButton, IconChevronRight,
} from './primitives'
import { IconDocuments, IconFile, IconBuilding, IconUsers, IconShield, IconEye, IconDownload, IconTrash } from '../icons'

const SCOPE = { client: { label: 'Company', tone: 'blue' }, director: { label: 'Director', tone: 'purple' }, compliance: { label: 'Compliance', tone: 'green' } }
const sizeKB = (b) => (b ? (b < 1024 * 1024 ? (b / 1024).toFixed(0) + ' KB' : (b / 1024 / 1024).toFixed(1) + ' MB') : '—')
const ROW_COLS = 'minmax(200px, 2.2fr) 1fr 1.1fr 1fr 0.9fr auto'

export default function DocumentsBentoView({
  summary, filtered, pageRows,
  search, onSearch, onClearSearch, onClearFilters,
  fClient, onClient, clients,
  fType, onType, typeOptions,
  fFY, onFY, fyOptions,
  fScope, onScope,
  loading, error, onRetry,
  safePage, totalPages, pageSize, onPrev, onNext,
  onUpload, onView, onDownload, onDelete,
}) {
  const searchActive = search.trim() !== ''
  const filtersActive = searchActive || !!fClient || !!fType || !!fFY || !!fScope
  const showPagination = !loading && !error && filtered.length > pageSize
  const cards = [
    { key: 'total', tone: 'blue', label: 'Total Documents', value: summary.total, Icon: IconDocuments },
    { key: 'company', tone: 'blue', label: 'Company', value: summary.company, Icon: IconBuilding },
    { key: 'director', tone: 'purple', label: 'Director', value: summary.director, Icon: IconUsers },
    { key: 'compliance', tone: 'green', label: 'Compliance', value: summary.compliance, Icon: IconShield },
  ]

  return (
    <div className="b-mod">
      <ModuleHeader title="Documents" subtitle={`${summary.total} ${summary.total === 1 ? 'document' : 'documents'} across ${summary.clients} ${summary.clients === 1 ? 'client' : 'clients'}`}>
        <PrimaryButton onClick={onUpload} icon={<IconDownload size={16} />}>Upload Document</PrimaryButton>
      </ModuleHeader>

      <SummaryCards cards={cards} />

      <Toolbar>
        <SearchBox value={search} onChange={onSearch} onClear={onClearSearch} placeholder="Search by client, type, name…" label="Search documents" />
        <FilterSelect value={fClient} onChange={onClient} label="Filter by client"
          options={[{ value: '', label: 'All clients' }, ...clients.map(c => ({ value: c.client_id, label: `${c.client_id} — ${c.name}` }))]} />
        <FilterSelect value={fType} onChange={onType} label="Filter by type"
          options={[{ value: '', label: 'All types' }, ...typeOptions.map(t => ({ value: t, label: t }))]} />
        <FilterSelect value={fFY} onChange={onFY} label="Filter by financial year"
          options={[{ value: '', label: 'All FY' }, ...fyOptions.map(f => ({ value: f, label: f }))]} />
        <FilterSelect value={fScope} onChange={onScope} label="Filter by scope"
          options={[{ value: '', label: 'All scopes' }, { value: 'client', label: 'Company' }, { value: 'director', label: 'Director' }, { value: 'compliance', label: 'Compliance' }]} />
        {filtersActive && <button type="button" className="b-cl-clear-filters" onClick={onClearFilters}>Clear filters</button>}
      </Toolbar>

      {!loading && !error && filtersActive && (
        <div className="b-cl-resultbar" role="status"><span>{filtered.length} {filtered.length === 1 ? 'document' : 'documents'}{searchActive ? ` for “${search.trim()}”` : ''}</span></div>
      )}

      <section className="b-mod-table">
        {loading ? (
          <SkeletonList rows={6} />
        ) : error ? (
          <ErrorState title="Couldn’t load documents" onRetry={onRetry} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No documents found"
            copy={filtersActive ? 'No documents match your current filters.' : 'No documents yet — upload your first document.'}>
            {filtersActive && <button type="button" className="b-mod-primary" onClick={onClearFilters}>Clear filters</button>}
          </EmptyState>
        ) : (
          <>
            <div className="b-mod-head-row b-dc-row" style={{ gridTemplateColumns: ROW_COLS }} aria-hidden="true">
              <span>Document</span><span>Scope</span><span>Period / FY</span><span>Uploaded</span><span>Size</span><span />
            </div>
            {pageRows.map(d => {
              const sc = SCOPE[d.scope || 'client'] || SCOPE.client
              const act = (fn) => (e) => { e.stopPropagation(); fn() }
              return (
                <div key={d.id} className="b-mod-row b-dc-row" style={{ gridTemplateColumns: ROW_COLS }} onClick={() => onView(d)}>
                  <span className="b-dc-main">
                    <span className="b-dc-ico"><IconFile size={16} /></span>
                    <span className="b-dc-titles">
                      <button type="button" className="b-tk-title" onClick={act(() => onView(d))}>{d.doc_type || d.doc_name || 'Document'}</button>
                      <span className="b-tk-sub">{(d.client_name || d.client_id || '—')}{d.director_name ? ` · ${d.director_name}` : ''}</span>
                    </span>
                  </span>
                  <span data-label="Scope"><StatusChip label={sc.label} tone={sc.tone} dot={false} /></span>
                  <span data-label="Period / FY" className="b-tk-sub">{d.compliance_period || d.fy_label || '—'}</span>
                  <span data-label="Uploaded" className="b-tk-sub">{fmtDate(d.created_at)}{d.uploaded_by ? ` · ${d.uploaded_by}` : ''}</span>
                  <span data-label="Size" className="b-tk-sub">{sizeKB(d.file_size)}</span>
                  <span className="b-dc-actions">
                    <IconButton label="View" onClick={act(() => onView(d))}><IconEye size={16} /></IconButton>
                    <IconButton label="Download" onClick={act(() => onDownload(d))}><IconDownload size={16} /></IconButton>
                    <IconButton label="Delete" danger onClick={act(() => onDelete(d))}><IconTrash size={15} /></IconButton>
                  </span>
                </div>
              )
            })}
          </>
        )}
      </section>

      {showPagination && (
        <Pagination safePage={safePage} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPrev={onPrev} onNext={onNext} unit="documents" />
      )}
    </div>
  )
}
