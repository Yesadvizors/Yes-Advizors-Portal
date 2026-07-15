/**
 * Compliance Tracker modal — truthful FY list and tab visibility.  (pure, testable)
 *
 * The modal used to decide what to show from client ATTRIBUTES:
 *
 *     GST  tab shown when client.gstin is set
 *     TDS  tab shown when client.tan   is set
 *     ROC  tab shown when client.client_type is a company type
 *     FY   selector = a fixed synthetic range (2020-21 … current)
 *
 * So a client flagged with a GSTIN but holding zero gst_tracker rows was shown a GST
 * obligation that does not exist, and the FY dropdown offered years the client had no
 * records in. This module replaces that with rules driven by ACTUAL tracker rows and the
 * live financial_years table.
 *
 * `coverage` is gathered by the component from the database and passed in:
 *
 *     {
 *       liveFys: Set<fy_label>,   // active rows in financial_years
 *       dataFys: Set<fy_label>,   // FYs this client has ANY compliance in
 *       gst:     Set<fy_label>,   // FYs with real gst_tracker rows
 *       tds:     Set<fy_label>,   // ... tds_tracker
 *       roc:     Set<fy_label>,   // ... roc_tracker
 *       llp:     Set<fy_label>,   // ... llp_tracker
 *     }
 *
 * A null `coverage` means "still loading": the universal tabs render immediately, but no
 * conditional (GST / TDS / ROC) tab is ever shown until its data is confirmed.
 */

/**
 * The financial years the FY selector should offer for this client: the years the client
 * actually has data in, plus the current FY so it is always selectable and can be the
 * default — bounded to real (active) financial years, newest first.
 */
export function fyChoicesFromCoverage(coverage, currentFyLabel) {
  if (!coverage) return []
  const wanted = new Set(coverage.dataFys)
  if (coverage.liveFys.has(currentFyLabel)) wanted.add(currentFyLabel)
  return [...wanted]
    .filter(f => coverage.liveFys.has(f))
    .sort()
    .reverse()
}

/** The FY to select: the current FY when it is offered, otherwise the newest with data. */
export function defaultFy(fyChoices, currentFyLabel) {
  if (!fyChoices || fyChoices.length === 0) return currentFyLabel
  return fyChoices.includes(currentFyLabel) ? currentFyLabel : fyChoices[0]
}

/**
 * Every tab the modal can show. A tab with `conditional` only appears when the client has
 * real rows in that category for the selected FY; the rest are universal and carry their
 * own truthful "No … records" empty state.
 */
export const COMPLIANCE_TABS = [
  { key: 'gst',        label: 'GST',             icon: '🏪', conditional: 'gst' },
  { key: 'it',         label: 'Income Tax',      icon: '🧾' },
  { key: 'tds',        label: 'TDS',             icon: '💰', conditional: 'tds' },
  { key: 'roc',        label: 'ROC/MCA',         icon: '🏢', conditional: 'roc' },
  { key: 'financials', label: 'Financial & ITR', icon: '📊' },
  { key: 'audit',      label: 'Audit',           icon: '🔍' },
  { key: 'acc',        label: 'Accounting',      icon: '📒' },
  { key: 'notices',    label: 'Notices',         icon: '📨' },
]

/** Does the client have real rows for a conditional category in the selected FY? */
export function hasCategoryData(coverage, category, fy) {
  if (!coverage) return false
  if (category === 'gst') return coverage.gst.has(fy)
  if (category === 'tds') return coverage.tds.has(fy)
  if (category === 'roc') return coverage.roc.has(fy) || coverage.llp.has(fy)
  return true
}

/** The tabs to show for the selected FY. Conditional tabs appear only with real data. */
export function visibleComplianceTabs(coverage, fy) {
  return COMPLIANCE_TABS.filter(t => !t.conditional || hasCategoryData(coverage, t.conditional, fy))
}
