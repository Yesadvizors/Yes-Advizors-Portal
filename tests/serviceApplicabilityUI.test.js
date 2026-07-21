/**
 * P5 CP-4..CP-7 — Service Applicability UI (read views + section orchestration).
 * node:test — `npm test`.
 *
 * The components are JSX (React), and no jsdom/RTL is approved (OD-5), so behaviour is
 * proven by static source analysis over the read views (SECTION/LIVE/HISTORY/STATES) and
 * the integration mount. The write modals + write-path wiring are covered separately in
 * serviceApplicabilityWriteUI.test.js. No component is imported (Node cannot parse JSX);
 * every check reads the source with readFileSync.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const SECTION = '../src/components/serviceApplicability/ServiceApplicabilitySection.jsx'
const LIVE = '../src/components/serviceApplicability/ServiceApplicabilityLiveTable.jsx'
const HISTORY = '../src/components/serviceApplicability/ServiceApplicabilityHistory.jsx'
const STATES = '../src/components/serviceApplicability/ServiceApplicabilityStates.jsx'
const INTEGRATION = '../src/components/preview/ClientMasterPreview.jsx'
const COMPONENTS = [SECTION, LIVE, HISTORY, STATES]

const src = (p) => stripComments(read(p))

// ── 1/2. flag gating ────────────────────────────────────────────────────────
test('1/2: section gated by VITE_P5_UI with a fail-closed === "true" rule', () => {
  const s = src(SECTION)
  assert.ok(s.includes('VITE_P5_UI'), 'must reference VITE_P5_UI')
  assert.ok(/toLowerCase\(\)\s*===\s*'true'/.test(s), 'must use case-insensitive === true')
  assert.ok(/if\s*\(\s*!flagEnabled\s*\)\s*return null/.test(s), 'must hide when flag not enabled')
})

// ── 3/4. hook usage ─────────────────────────────────────────────────────────
test('3: section uses useServiceApplicabilityRole', () => {
  assert.ok(src(SECTION).includes('useServiceApplicabilityRole(user)'))
})
test('4: section uses useServiceApplicabilityData', () => {
  assert.ok(/useServiceApplicabilityData\(/.test(src(SECTION)))
})

// ── 5/6. role fail-closed + no flash ────────────────────────────────────────
test('5/6: unresolved/unauthorized role fails closed; loading never exposes content', () => {
  const s = src(SECTION)
  assert.ok(/if\s*\(\s*role\.loading\s*\)\s*return null/.test(s), 'role loading → return null')
  assert.ok(/role\.error\s*\|\|\s*role\.canView\s*!==\s*true/.test(s), 'error/non-canView → return null')
  assert.equal(s.includes('permission') || s.includes('denied'), false, 'no permission-denied panel')
})

// ── 7/8. authoritative client UUID from the integration point ───────────────
test('7/8: integration passes authoritative clientId (uuid), NOT clients.client_id code', () => {
  const s = src(INTEGRATION)
  assert.ok(/<ServiceApplicabilitySection\s+clientId=\{clientId\}\s+user=\{user\}\s*\/>/.test(s),
    'must mount with clientId={clientId} user={user}')
  // ClientMasterPreview receives clientId (the uuid) and clientCode (the YA code); the
  // section must be given clientId, never clientCode.
  assert.equal(/ServiceApplicabilitySection[^>]*clientCode/.test(s), false, 'must not pass clientCode')
  // no component uses the display code as a DB key
  for (const f of COMPONENTS) assert.equal(src(f).includes('client_id'), false, `${f} must not use client_id`)
})

// ── 9/10. tables bound to hook rows ─────────────────────────────────────────
test('9: live table is fed only the hook liveRows', () => {
  assert.ok(/<ServiceApplicabilityLiveTable\s+rows=\{data\.liveRows\}/.test(src(SECTION)))
  assert.ok(src(LIVE).includes('props.rows') === false) // it destructures { rows, actions? }
  // rows is always first; the optional actions callbacks may follow (CP-5/CP-6).
  assert.ok(/function ServiceApplicabilityLiveTable\(\{\s*rows\s*(,\s*actions\s*)?\}\)/.test(src(LIVE)))
})
test('10: history is fed only the hook historyRows', () => {
  assert.ok(/<ServiceApplicabilityHistory\s+rows=\{data\.historyRows\}/.test(src(SECTION)))
})

// ── 11/12. no writes anywhere in CP-4 components ────────────────────────────
test('11: no write-wrapper imports in any CP-4 component', () => {
  for (const f of COMPONENTS) {
    const s = src(f)
    assert.equal(s.includes('serviceApplicabilityWrites'), false, `${f} imports write wrappers`)
    for (const w of ['createServiceApplicability', 'updateServiceApplicability', 'setServiceApplicabilityStatus']) {
      assert.equal(s.includes(w), false, `${f} references ${w}`)
    }
  }
})
test('12: no RPC / direct query / write methods in CP-4 components', () => {
  for (const f of COMPONENTS) {
    const s = src(f)
    for (const bad of ['.rpc(', '.from(', '.insert(', '.update(', '.delete(', '.upsert(', 'serviceApplicabilityReads', 'supabase']) {
      assert.equal(s.includes(bad), false, `${f} must not contain ${bad}`)
    }
  }
})

// ── 13. read PRIMITIVES stay action-free; write affordances are gated by callbacks ──
test('13: STATES primitive is action-free; LIVE/HISTORY expose actions ONLY via callbacks', () => {
  // The pure presentational primitive (states/formatters) never offers a write control.
  const verbs = [/\bCreate\b/, /\bEdit\b/, /\bApprove\b/, /\bDeactivate\b/, /\bRestart\b/, /\bSave\b/, /\bSubmit\b/, /onSubmit/]
  const states = src(STATES)
  for (const re of verbs) assert.equal(re.test(states), false, `STATES must not contain ${re}`)

  // The live/history tables render row actions ONLY when the section supplies a callback
  // (so a read-only mount without callbacks shows no Actions column / no buttons).
  const live = src(LIVE)
  assert.ok(/typeof a\.onEdit === 'function'/.test(live), 'live Edit gated by onEdit callback')
  assert.ok(/typeof a\.onApprove === 'function'/.test(live), 'live Approve gated by onApprove callback')
  assert.ok(/typeof a\.onDeactivate === 'function'/.test(live), 'live Deactivate gated by onDeactivate callback')
  assert.ok(/canEdit\(row\)/.test(live) && /canApprove\(row\)/.test(live) && /canDeactivate\(row\)/.test(live),
    'live actions also gated by per-row lifecycle predicates')
  const hist = src(HISTORY)
  assert.ok(/typeof onRestart === 'function'/.test(hist), 'history Start-again gated by onRestart callback')
  assert.ok(/canRestart\(row\)/.test(hist), 'history restart gated by canRestart(row)')
})

// ── 14. refresh uses only the hook; no DB polling timers ────────────────────
test('14: refresh wired only to hook.refresh; no polling timers', () => {
  const s = src(SECTION)
  assert.ok(/RefreshButton\s+onClick=\{data\.refresh\}/.test(s), 'refresh must call data.refresh')
  // No setInterval anywhere (never poll the DB). setTimeout is allowed ONLY in the section
  // for toast auto-dismiss (UI feedback), and forbidden in the read primitives.
  for (const f of COMPONENTS) assert.equal(src(f).includes('setInterval'), false, `${f} must not use setInterval`)
  for (const f of [LIVE, HISTORY, STATES]) assert.equal(src(f).includes('setTimeout'), false, `${f} must not use setTimeout`)
})

// ── 15/16/17. states ────────────────────────────────────────────────────────
test('15/16/17: loading, safe error message, empty-live state', () => {
  const s = src(SECTION)
  assert.ok(s.includes('data.loading') && s.includes('<LoadingState'), 'loading state present')
  assert.ok(/<ErrorState\s+message=\{data\.error\.message\}/.test(s), 'error uses safe hook message')
  assert.ok(s.includes('<EmptyLiveState'), 'empty-live present')
  const states = src(STATES)
  assert.ok(states.includes('No active service applicability records are configured for this client.'))
  // the read primitives never offer an Add control; the "Add service" affordance lives
  // only in the section and is gated by canCreate + availability.
  for (const f of [LIVE, HISTORY, STATES]) assert.equal(/\bAdd\b/.test(src(f)), false, `${f} must not offer Add`)
  assert.ok(/canAdd\s*=\s*role\.canCreate/.test(s), 'section Add gated by role.canCreate')
  assert.ok(/data\.availableServiceCodes\.length\s*>\s*0/.test(s), 'section Add gated by availability')
})

// ── 18. refreshing retains content (render keyed on data.loading, not refreshing) ─
test('18: content shown while refreshing (gate is data.loading, not refreshing)', () => {
  const s = src(SECTION)
  assert.ok(/data\.loading\s*\?\s*\(/.test(s), 'render branch must key on data.loading')
  assert.ok(s.includes('data.refreshing'), 'refreshing passed to the refresh control only')
})

// ── 19. history read-only + count + accessible toggle ───────────────────────
test('19: history exposes count + aria-expanded; never reopens; restart is gated', () => {
  const h = src(HISTORY)
  assert.ok(/aria-expanded=/.test(h), 'history toggle must expose aria-expanded')
  assert.ok(/Inactive history \(\{list\.length\}\)/.test(h), 'history must display a count')
  // no in-place Edit/Approve/Deactivate on history rows (Inactive is never reopened)
  for (const re of [/\bEdit\b/, /\bApprove\b/, /\bDeactivate\b/]) assert.equal(re.test(h), false, 'history has no reopen controls')
  // the only affordance is "Start again", gated by the onRestart callback, canRestart(row)
  // and the service having no live row (availableCodes) — it opens a NEW create draft.
  assert.ok(h.includes('Start again'), 'history offers Start again')
  assert.ok(/typeof onRestart === 'function'/.test(h) && /availSet\.has\(row\.service_code\)/.test(h),
    'Start again gated by callback + availability')
})

// ── 20. no internal ids / row_version / actor uuids displayed ───────────────
test('20: internal ids / row_version / actor columns are not rendered', () => {
  for (const f of [LIVE, HISTORY]) {
    const s = src(f)
    for (const bad of ['row_version', 'created_by', 'updated_by', 'approved_by', 'linked_registration_id']) {
      assert.equal(s.includes(bad), false, `${f} must not render ${bad}`)
    }
    // row.id may be used ONLY as a React key, never as a rendered cell.
    const idUses = [...s.matchAll(/row\.id/g)]
    const keyUses = [...s.matchAll(/key=\{\(row && row\.id\)/g)]
    assert.equal(idUses.length, keyUses.length, `${f} must use row.id only as a key`)
  }
})

// ── 21/22. safe frequency + date formatting ─────────────────────────────────
test('21: frequency formatting maps 7 codes and falls back safely', () => {
  const s = src(STATES)
  for (const code of ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'EVENT_BASED', 'ONE_TIME', 'AS_REQUIRED']) {
    assert.ok(s.includes(`${code}:`), `FREQUENCY_LABELS must map ${code}`)
  }
  assert.ok(/FREQUENCY_LABELS\[code\]\)\s*\|\|\s*'—'/.test(s), 'unknown frequency → safe fallback')
})
test('22: date formatting guards invalid dates (never throws)', () => {
  const s = src(STATES)
  assert.ok(s.includes('Number.isNaN(t.getTime())'), 'safeDate must guard invalid dates')
  assert.ok(s.includes("return '—'"), 'invalid/missing dates → —')
})

// ── 23/24. notes as text only; no dangerouslySetInnerHTML ───────────────────
test('23/24: notes rendered as escaped text; no dangerouslySetInnerHTML anywhere', () => {
  const states = src(STATES)
  assert.ok(states.includes('function NotesCell'), 'notes go through a text-only cell')
  assert.equal(states.includes('dangerouslySetInnerHTML'), false)
  for (const f of COMPONENTS) assert.equal(src(f).includes('dangerouslySetInnerHTML'), false, `${f}`)
})

// ── 25. no legacy references ─────────────────────────────────────────────────
test('25: no legacy compliance references in CP-4 components', () => {
  const forbidden = [
    'clients.services', 'activate_accounting_service', 'generate_client_compliance',
    'accounting_tracker', 'financials_tracker', 'income_tax_tracker', 'compliance_calendar',
  ]
  for (const f of COMPONENTS) {
    const s = src(f)
    for (const bad of forbidden) assert.equal(s.includes(bad), false, `${f} must not reference ${bad}`)
  }
})

// ── 30. integration change is minimal (import + gate/mount only) ────────────
test('30: integration change limited to the import and the section mount', () => {
  const s = src(INTEGRATION)
  assert.ok(s.includes("import ServiceApplicabilitySection from '../serviceApplicability/ServiceApplicabilitySection'"))
  assert.ok(/<ServiceApplicabilitySection\s+clientId=\{clientId\}\s+user=\{user\}\s*\/>/.test(s))
  // the original read-only sections remain mounted (nothing removed)
  for (const sec of ['PersonsSection', 'IdentifiersSection', 'ContactsSection', 'AddressesSection', 'RegistrationsGstSection', 'RelationshipsSection']) {
    assert.ok(s.includes(`<${sec} clientId={clientId} />`), `${sec} must remain mounted`)
  }
  // no write wrapper / rpc introduced into the integration file
  for (const bad of ['serviceApplicabilityWrites', '.rpc(', '.insert(', '.update(', '.delete(', '.upsert(']) {
    assert.equal(s.includes(bad), false, `integration must not add ${bad}`)
  }
})
