/**
 * Entity / Service / FY document checklist + Missing-documents workflow. node:test.
 *
 * Pure-logic tests for the shared classifier/grouping helper (documentChecklist.js) plus
 * OD-5 static source guards proving every surface (Documents checklist, Missing workflow,
 * Client 360, Compliance) names the SAME requirement the SAME readiness state via the ONE
 * shared helper — no parallel readiness rule, no fabricated review/accept status, no DB change,
 * and readiness kept separate from compliance filing status.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import {
  REQUIREMENT_STATES, REQUIREMENT_STATE_META, classifyRequirementState, requirementStateMeta,
  requirementKey, serviceCategoryLabel, SERVICE_CATEGORY_LABELS, requirementScope, isFyScoped,
  summariseChecklist, filterChecklist, groupChecklist, requirementToManagePayload,
} from '../src/lib/documentChecklist.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const CHECKLIST = strip(read('src/components/DocumentChecklistPanel.jsx'))
const MISSING = strip(read('src/components/MissingDocumentsPanel.jsx'))
const SECTIONS = strip(read('src/components/client360/Client360Sections.jsx'))
const WORKSPACE = strip(read('src/components/client360/Client360Workspace.jsx'))
const HUB = strip(read('src/components/DocumentsHub.jsx'))
const COMP = read('src/components/Compliance.jsx') // raw (image/* comment breaks strip)

// row fixtures
const missing = { requirement_ref_type: 'financials', requirement_ref_id: 'f1', client_id: 'YA-002', client_name: 'ABC Pvt Ltd', fy_label: '2026-27', doc_type: 'ITR Form', requirement_label: 'ITR Form', is_available: false, version_count: 0 }
const provided = { ...missing, requirement_ref_id: 'f2', is_available: true, version_count: 1, current_document_name: 'ITR.pdf' }
const replaced = { ...missing, requirement_ref_id: 'f3', is_available: true, version_count: 3, current_document_name: 'ITR_v3.pdf' }
const archivedOnly = { ...missing, requirement_ref_id: 'f4', is_available: false, version_count: 2 } // history exists, no CURRENT link

// ── Readiness state model (honest: missing / provided / replaced; NO review/accept) ──────
test('DCL-state: classify missing / provided / replaced from the canonical fields', () => {
  assert.equal(classifyRequirementState(missing), 'missing')       // 7: requirement + no current link
  assert.equal(classifyRequirementState(provided), 'provided')     // 8: linked current doc removes Missing
  assert.equal(classifyRequirementState(replaced), 'replaced')     // 10: replacement, current controls
  assert.equal(classifyRequirementState(null), 'missing')          // fail safe
})
test('DCL-archived: an archived-only requirement (no current link) is Missing, never satisfied', () => {
  assert.equal(classifyRequirementState(archivedOnly), 'missing')  // 9
  assert.equal(requirementStateMeta(archivedOnly).satisfied, false)
})
test('DCL-no-review: states are exactly missing/provided/replaced — no fabricated review/accept', () => {
  assert.deepEqual([...REQUIREMENT_STATES].sort(), ['missing', 'provided', 'replaced'])
  const labels = Object.values(REQUIREMENT_STATE_META).map((m) => m.label.toLowerCase())
  for (const bad of ['reviewed', 'accepted', 'under review', 'filed', 'completed', 'closed']) {
    assert.ok(!labels.includes(bad), `no fabricated "${bad}" state`)
  }
})

// ── Requirement identity (one truth; no double-count) ────────────────────────────────────
test('DCL-identity: requirementKey is stable per (ref_type, ref_id); differs across requirements', () => {
  assert.equal(requirementKey(missing), 'financials:f1')
  assert.equal(requirementKey({ ...missing }), requirementKey(missing)) // 1/17: same requirement = one key
  assert.notEqual(requirementKey(missing), requirementKey(provided))
})

// ── Service dimension ────────────────────────────────────────────────────────────────────
test('DCL-service: ref_type maps to a service label; unknown titleises, never fabricates', () => {
  assert.equal(serviceCategoryLabel('financials'), 'Financial & ITR')
  assert.equal(serviceCategoryLabel('income_tax'), 'Income Tax')
  assert.equal(serviceCategoryLabel('gst'), SERVICE_CATEGORY_LABELS.gst)
  assert.equal(serviceCategoryLabel('some_new_area'), 'Some new area') // safe fallback
  assert.equal(serviceCategoryLabel(''), 'Other')
})

// ── FY / permanent scope ─────────────────────────────────────────────────────────────────
test('DCL-scope: FY-specific vs permanent separated; permanent only when genuinely no FY/period', () => {
  assert.equal(requirementScope(missing), 'fy')            // 3: FY-specific
  assert.equal(requirementScope({ ...missing, period: 'Q1' }), 'periodic')
  assert.equal(requirementScope({ requirement_ref_type: 'other', requirement_ref_id: 'p1' }), 'permanent') // 2
  assert.equal(isFyScoped(missing), true)
  assert.equal(isFyScoped({ requirement_ref_type: 'other', requirement_ref_id: 'p1' }), false)
})

// ── Counts ───────────────────────────────────────────────────────────────────────────────
test('DCL-counts: summariseChecklist tallies required/missing/provided/replaced/available', () => {
  const s = summariseChecklist([missing, provided, replaced, archivedOnly])
  assert.deepEqual(s, { required: 4, missing: 2, provided: 1, replaced: 1, available: 2 })
  assert.deepEqual(summariseChecklist([]), { required: 0, missing: 0, provided: 0, replaced: 0, available: 0 })
})

// ── Filtering (service / FY / entity / state / search; exclude unrelated) ────────────────
test('DCL-filter: by service, FY, readiness state, and search — unrelated rows excluded', () => {
  const rows = [missing, provided, { ...missing, requirement_ref_id: 'g1', requirement_ref_type: 'gst', fy_label: '2025-26' }]
  assert.equal(filterChecklist(rows, { refType: 'gst' }).length, 1)               // 4/6
  assert.equal(filterChecklist(rows, { fyLabel: '2026-27' }).length, 2)           // 3
  assert.equal(filterChecklist(rows, { state: 'missing' }).length, 2)
  assert.equal(filterChecklist(rows, { state: 'provided' }).length, 1)
  assert.equal(filterChecklist(rows, { search: 'ABC' }).length, 3)
  assert.equal(filterChecklist(rows, { search: 'no-such-client' }).length, 0)
})
test('DCL-filter-entity: entity type filter uses caller-supplied entityTypeOf (no re-derivation)', () => {
  const rows = [missing, { ...provided, client_id: 'YA-001' }]
  const entityTypeOf = (id) => (id === 'YA-002' ? 'Private Limited Company' : 'Individual')
  assert.equal(filterChecklist(rows, { entityType: 'Individual', entityTypeOf }).length, 1)   // 5
  assert.equal(filterChecklist(rows, { entityType: 'Private Limited Company', entityTypeOf })[0].client_id, 'YA-002')
})

// ── Grouping (service → FY; permanent not duplicated across years) ───────────────────────
test('DCL-group: groups by service then FY; permanent lands under a single no-FY group', () => {
  const perm = { requirement_ref_type: 'other', requirement_ref_id: 'p1', client_id: 'YA-002', is_available: false }
  const g = groupChecklist([missing, replaced, perm, { ...missing, requirement_ref_id: 'f9', fy_label: '2025-26' }])
  const fin = g.find((x) => x.service === 'financials')
  assert.ok(fin, 'financials group present')
  assert.deepEqual(fin.groups.map((x) => x.fyLabel), ['2026-27', '2025-26']) // 2/3: FY newest-first, one group each
  const other = g.find((x) => x.service === 'other')
  assert.equal(other.groups.length, 1)
  assert.equal(other.groups[0].fyLabel, '—') // permanent grouped once, not per-year
})

// ── Upload/Manage context correctness (right client / requirement / FY) ──────────────────
test('DCL-context: requirementToManagePayload carries correct client, requirement and FY', () => {
  const p = requirementToManagePayload(provided)
  assert.equal(p.clientId, 'YA-002')          // 12
  assert.equal(p.refType, 'financials')       // 13
  assert.equal(p.refId, 'f2')                 // 13
  assert.equal(p.fyLabel, '2026-27')          // 14
  assert.equal(p.docType, 'ITR Form')
  assert.equal(requirementToManagePayload({ requirement_ref_type: 'roc', requirement_ref_id: 'r1', client_id: 'X' }).period, null)
})

// ── Consistency: ONE shared classifier across ALL surfaces (no parallel status truth) ────
test('DCL-consistency: Documents, Missing, Client 360 and Compliance all use the shared helper', () => {
  // 1/11/20: same requirement state on every surface, via documentChecklist — not re-invented
  assert.match(CHECKLIST, /from '\.\.\/lib\/documentChecklist'/)
  assert.match(CHECKLIST, /classifyRequirementState|requirementStateMeta/)
  assert.match(MISSING, /from '\.\.\/lib\/documentChecklist'/)
  assert.match(SECTIONS, /from '\.\.\/\.\.\/lib\/documentChecklist'/)
  assert.match(COMP, /requirementStateMeta\(readyMap\[r\.id\]\)\.label/)
  // no surface hand-rolls its own "available -> label" truth beyond the shared classifier
  assert.match(CHECKLIST, /requirementToManagePayload/)
  assert.match(SECTIONS, /requirementToManagePayload/)
})

// ── Readiness stays separate from compliance FILING status ───────────────────────────────
test('DCL-separation: readiness never sets a compliance filing status (Filed/Completed/Closed)', () => {
  // 15: the checklist/missing surfaces open the governed drawer; they do not write tracker status
  assert.doesNotMatch(CHECKLIST, /status:\s*'Filed'|status:\s*'Completed'|status:\s*'Closed'/)
  assert.doesNotMatch(MISSING, /status:\s*'Filed'|status:\s*'Completed'|status:\s*'Closed'/)
  // Compliance still keeps the readiness column and the status column as distinct dimensions
  assert.match(COMP, /Document readiness is a SEPARATE dimension/)
})

// ── Error state ≠ zero missing ───────────────────────────────────────────────────────────
test('DCL-error: a load failure shows an explicit error, never a false "0 missing"', () => {
  // 16: panels set an error flag and gate the counts on !error (counts hidden on failure)
  assert.match(CHECKLIST, /setError\(true\)/)
  assert.match(CHECKLIST, /!loading && !error &&/)          // counts only render when not errored
  assert.match(MISSING, /setError\(true\)/)
  // no raw backend error text shown to the user
  assert.doesNotMatch(CHECKLIST, /error\.message/)
  assert.doesNotMatch(MISSING, /error\.message/)
})

// ── Test/draft client handling + role restrictions preserved ─────────────────────────────
test('DCL-testclients: firm-wide checklist + missing exclude test clients', () => {
  assert.match(CHECKLIST, /is_test_client === true/)         // 19
  assert.match(MISSING, /is_test_client === true/)
})
test('DCL-rbac: mutation affordances stay gated by existing role helpers', () => {
  assert.match(MISSING, /canUploadDocument\(documentRole\(user\)\)/)  // 18
  // Client 360 only wires Manage when the viewer can upload; drawer enforces via canManageDocument
  assert.match(WORKSPACE, /role\.canUploadDocument \? setManageReq : undefined/)
  assert.match(WORKSPACE, /manageReq && role\.canUploadDocument/)
})

// ── Documents hub wiring + no competing repository ───────────────────────────────────────
test('DCL-hub: Documents hub exposes the Checklist tab alongside All/Missing', () => {
  assert.match(HUB, /Document Checklist/)
  assert.match(HUB, /<DocumentChecklistPanel/)
  assert.match(HUB, /mode === 'checklist'/)
  assert.doesNotMatch(CHECKLIST, /completed-work|completed_documents/) // no competing repository
})
