// Entity / Service / FY document checklist — pure classification & grouping helpers.
//
// SINGLE SOURCE OF TRUTH for document-REQUIREMENT readiness state, shared by the Documents
// checklist, the Missing-documents workflow, Client 360 and Compliance so the SAME
// requirement is named the SAME state on every surface. No React, no Supabase, no network,
// no side effects — importable directly by node:test.
//
// It reads ONLY fields the already-live canonical view v_requirement_document_readiness
// exposes (requirement_ref_type/id, client_id, client_name, fy_label, period,
// requirement_label, doc_type, is_available, version_count, current_document_*). It invents
// NO status, NO enum and NO DB column.
//
// Honest lifecycle: the `documents` table has NO review/acceptance column, so there is
// deliberately NO "Under review" / "Reviewed / Accepted" state here — that would be a
// fabricated status. The states the backend can actually prove are:
//   • Missing   — the requirement exists but has no CURRENT linked document
//   • Provided  — a current document is linked (first/only version)
//   • Replaced  — a current document is linked and a prior version was superseded
// Archived / superseded documents never satisfy a requirement — the view already joins only
// is_current=true links and is_current=true documents, so they surface as Missing here.
// (A future package may add a document review/acceptance field — see the closure doc.)

export const REQUIREMENT_STATES = Object.freeze(['provided', 'replaced', 'missing'])

export const REQUIREMENT_STATE_META = Object.freeze({
  missing: { key: 'missing', label: 'Missing', tone: 'critical', satisfied: false },
  provided: { key: 'provided', label: 'Provided', tone: 'good', satisfied: true },
  replaced: { key: 'replaced', label: 'Replaced', tone: 'good', satisfied: true },
})

// Classify one readiness row. Missing whenever there is no current linked document
// (is_available !== true) — regardless of history, so an archived-only requirement is
// Missing, never a false "Provided". version_count (distinct documents ever linked, from the
// view's LATERAL count) > 1 ⇒ a replacement occurred; the CURRENT document controls readiness.
export function classifyRequirementState(row) {
  if (!row || row.is_available !== true) return 'missing'
  const versions = Number(row.version_count)
  return Number.isFinite(versions) && versions > 1 ? 'replaced' : 'provided'
}

export function requirementStateMeta(row) {
  return REQUIREMENT_STATE_META[classifyRequirementState(row)]
}

// Stable requirement identity: the SAME (ref_type, ref_id) is ONE requirement truth on every
// surface, so Documents / Compliance / Client 360 never diverge or double-count.
export function requirementKey(row) {
  return `${row && row.requirement_ref_type ? row.requirement_ref_type : ''}:${row && row.requirement_ref_id ? row.requirement_ref_id : ''}`
}

// requirement_ref_type IS the service dimension — it mirrors the canonical view's UNION
// source trackers. Unknown types titleise safely; never fabricate a service name.
export const SERVICE_CATEGORY_LABELS = Object.freeze({
  financials: 'Financial & ITR',
  income_tax: 'Income Tax',
  gst: 'GST',
  tds: 'TDS',
  roc: 'ROC / MCA',
  audit: 'Audit',
  notice: 'Notices',
  accounting: 'Accounting',
  other: 'Other',
})

// Deterministic display order for service groups (operational priority); unknown types last.
const SERVICE_ORDER = ['financials', 'income_tax', 'gst', 'tds', 'roc', 'audit', 'accounting', 'notice', 'other']

export function serviceCategoryLabel(refType) {
  if (SERVICE_CATEGORY_LABELS[refType]) return SERVICE_CATEGORY_LABELS[refType]
  const t = String(refType == null ? '' : refType).trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ') : 'Other'
}

// FY / period scope. The current canonical requirement model is entirely period-scoped:
// every requirement row carries an fy_label (some also a period). "permanent" (entity/master
// documents not tied to a year, e.g. PAN, incorporation) is NOT modelled as a requirement in
// the backend today, so this returns 'permanent' ONLY for a row genuinely lacking both —
// future-safe, never fabricated. Used to visually separate FY-specific from permanent.
export function requirementScope(row) {
  if (row && row.fy_label) return row.period ? 'periodic' : 'fy'
  if (row && row.period) return 'periodic'
  return 'permanent'
}

export function isFyScoped(row) {
  return requirementScope(row) !== 'permanent'
}

// Counts for card headers. required = total distinct requirements; available = provided +
// replaced (matches documentReadiness.summariseReadiness.available). Pure; [] → all zeros,
// so a genuine "no requirements" reads as zero — callers must distinguish that from a load
// FAILURE themselves (a query error must never be rendered as "0 missing").
export function summariseChecklist(rows) {
  const list = Array.isArray(rows) ? rows : []
  let provided = 0, replaced = 0, missing = 0
  for (const r of list) {
    const s = classifyRequirementState(r)
    if (s === 'provided') provided++
    else if (s === 'replaced') replaced++
    else missing++
  }
  return { required: list.length, provided, replaced, missing, available: provided + replaced }
}

// Pure filter. entityTypeOf: (clientId) => entityType|undefined is supplied by the caller so
// this module stays free of data access. Empty/undefined filters match everything.
export function filterChecklist(rows, opts = {}) {
  const { clientId, refType, fyLabel, state, entityType, entityTypeOf, search } = opts
  const q = search ? String(search).toLowerCase() : ''
  return (Array.isArray(rows) ? rows : []).filter((r) => {
    if (!r) return false
    if (clientId && r.client_id !== clientId) return false
    if (refType && r.requirement_ref_type !== refType) return false
    if (fyLabel && r.fy_label !== fyLabel) return false
    if (state && classifyRequirementState(r) !== state) return false
    if (entityType && typeof entityTypeOf === 'function' && (entityTypeOf(r.client_id) || '') !== entityType) return false
    if (q) {
      const hay = `${r.client_name || ''} ${r.client_id || ''} ${r.requirement_label || ''} ${r.doc_type || ''} ${serviceCategoryLabel(r.requirement_ref_type)} ${r.fy_label || ''} ${r.period || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

// Group rows by service category → FY, each with counts. Deterministic order: service by
// SERVICE_ORDER then label; FY newest-first; permanent (no FY) last. Does not mutate input.
export function groupChecklist(rows) {
  const list = Array.isArray(rows) ? rows : []
  const byService = new Map()
  for (const r of list) {
    if (!r) continue
    const svc = r.requirement_ref_type || 'other'
    if (!byService.has(svc)) byService.set(svc, [])
    byService.get(svc).push(r)
  }
  const svcKeys = [...byService.keys()].sort((a, b) => {
    const ia = SERVICE_ORDER.indexOf(a), ib = SERVICE_ORDER.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || serviceCategoryLabel(a).localeCompare(serviceCategoryLabel(b))
  })
  return svcKeys.map((svc) => {
    const svcRows = byService.get(svc)
    const byFy = new Map()
    for (const r of svcRows) {
      const fy = r.fy_label || '—'
      if (!byFy.has(fy)) byFy.set(fy, [])
      byFy.get(fy).push(r)
    }
    const fyKeys = [...byFy.keys()].sort((a, b) => (a === '—' ? 1 : b === '—' ? -1 : String(b).localeCompare(String(a))))
    return {
      service: svc,
      serviceLabel: serviceCategoryLabel(svc),
      summary: summariseChecklist(svcRows),
      groups: fyKeys.map((fy) => ({ fyLabel: fy, rows: byFy.get(fy), summary: summariseChecklist(byFy.get(fy)) })),
    }
  })
}

// Canonical Manage/Upload context for a requirement row — IDENTICAL prefill everywhere so an
// upload can NEVER be pointed at the wrong client/requirement/FY. Consumed by
// ManageDocumentsDrawer (which routes to the governed document_link / document_replace RPCs).
export function requirementToManagePayload(row) {
  return {
    refType: row && row.requirement_ref_type,
    refId: row && row.requirement_ref_id,
    clientId: row && row.client_id,
    clientName: row && row.client_name,
    fyLabel: row && row.fy_label,
    docType: row && row.doc_type,
    requirementLabel: row && row.requirement_label,
    period: row && row.period != null ? row.period : null,
  }
}
