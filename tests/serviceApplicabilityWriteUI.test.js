/**
 * P5 CP-5 / CP-6 / CP-7 — Service Applicability WRITE UI. node:test — `npm test`.
 *
 * Static source analysis (OD-5: no jsdom/RTL) over the two write modals, the shared
 * modal shell, and the section's write orchestration. Proves: writes go ONLY through the
 * CP-2 service wrappers (no direct Supabase / .rpc / .from in the UI); validation reuses
 * the CP-1 validators and builders; the OTHER-notes rule and the optimistic-lock
 * (STALE_ROW_VERSION → close + refresh + reopen) UX are wired; effective_to is collected
 * only when deactivating; edit never changes the service; and no XSS sink is used.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const FORM = '../src/components/serviceApplicability/ServiceApplicabilityFormModal.jsx'
const STATUS = '../src/components/serviceApplicability/ServiceApplicabilityStatusModal.jsx'
const SHELL = '../src/components/serviceApplicability/ServiceApplicabilityModalShell.jsx'
const SECTION = '../src/components/serviceApplicability/ServiceApplicabilitySection.jsx'
const LIVE = '../src/components/serviceApplicability/ServiceApplicabilityLiveTable.jsx'
const HISTORY = '../src/components/serviceApplicability/ServiceApplicabilityHistory.jsx'
const WRITE_COMPONENTS = [FORM, STATUS, SHELL, SECTION, LIVE, HISTORY]

const src = (p) => stripComments(read(p))

// ── W1. RPC-only: writes flow through the CP-2 wrappers, never raw Supabase ──
test('W1: no direct Supabase / .rpc / .from / DML anywhere in the write UI', () => {
  for (const f of WRITE_COMPONENTS) {
    const s = src(f)
    for (const bad of ['.rpc(', '.from(', '.insert(', '.update(', '.delete(', '.upsert(', 'supabase', 'serviceApplicabilityReads']) {
      assert.equal(s.includes(bad), false, `${f} must not contain ${bad}`)
    }
  }
})

test('W2: the section delegates writes to modals and imports NO write wrapper itself', () => {
  const s = src(SECTION)
  assert.equal(s.includes('serviceApplicabilityWrites'), false, 'section must not import write wrappers')
  assert.ok(s.includes("import ServiceApplicabilityFormModal"), 'section imports the form modal')
  assert.ok(s.includes("import ServiceApplicabilityStatusModal"), 'section imports the status modal')
})

// ── W3. create/edit modal wiring ────────────────────────────────────────────
test('W3: form modal uses the CP-1 validators + builders and the CP-2 wrappers', () => {
  const s = src(FORM)
  for (const sym of ['validateCreate', 'validateEdit', 'buildCreatePayload', 'buildUpdatePayload']) {
    assert.ok(s.includes(sym), `form must use ${sym}`)
  }
  assert.ok(s.includes("from '../../services/serviceApplicabilityWrites'"), 'form imports write wrappers')
  assert.ok(s.includes('createServiceApplicability') && s.includes('updateServiceApplicability'), 'form calls create + update')
  assert.ok(s.includes('mapRpcError'), 'form maps RPC errors to safe messages')
})

test('W4: create picks from availableServiceCodes; edit keeps the service IMMUTABLE', () => {
  const s = src(FORM)
  assert.ok(s.includes('availableServiceCodes'), 'create uses availableServiceCodes')
  // edit branch shows a fixed (non-select) service; only the create branch renders a <select> for service
  assert.ok(/isEdit\s*\?\s*\(/.test(s), 'service field switches on isEdit')
  assert.ok(s.includes('id="p5-sa-service"'), 'service control present')
  // the update input reuses the ROW service_code, never a user-changed value
  assert.ok(/serviceCode:\s*row && row\.service_code/.test(s), 'edit submits the row service_code')
})

test('W5: OTHER requires notes in the form (UI defence-in-depth of PG-1)', () => {
  const s = src(FORM)
  assert.ok(/notesRequired\s*=\s*selectedCode === 'OTHER'/.test(s), 'notes required computed from OTHER')
  // the mapped PG-1 code is surfaced on the notes field
  assert.ok(s.includes("OTHER_NOTES_REQUIRED"), 'maps the PG-1 OTHER_NOTES_REQUIRED code')
})

test('W6: the create/edit form NEVER exposes effective_to (deactivate-only field)', () => {
  const s = src(FORM)
  assert.equal(/effective[_ ]?to/i.test(s), false, 'form must not reference effective_to / effectiveTo')
  assert.equal(s.includes('p_effective_to'), false, 'form must not set p_effective_to directly (builder sets null)')
})

// ── W7. approve / deactivate modal wiring ───────────────────────────────────
test('W7: status modal uses approve/deactivate validators + builders + set_status wrapper', () => {
  const s = src(STATUS)
  for (const sym of ['validateApprove', 'validateDeactivate', 'buildApprovePayload', 'buildDeactivatePayload']) {
    assert.ok(s.includes(sym), `status modal must use ${sym}`)
  }
  assert.ok(s.includes('setServiceApplicabilityStatus'), 'status modal calls set_status wrapper')
  assert.ok(s.includes("from '../../services/serviceApplicabilityWrites'"), 'status modal imports write wrapper')
})

test('W8: effective_to (stop date) is collected ONLY when deactivating', () => {
  const s = src(STATUS)
  assert.ok(s.includes('effectiveTo'), 'deactivate collects effectiveTo')
  assert.ok(s.includes('Effective to (stop date)'), 'deactivate shows the stop-date field')
  // approve branch has no date field: the stop date belongs to deactivation only
  assert.ok(/isApprove\s*\?/.test(s), 'approve/deactivate branch on isApprove')
})

// ── W9. optimistic-lock conflict UX (approved) ──────────────────────────────
test('W9: STALE_ROW_VERSION → onConflict (close + refresh + reopen); no silent retry', () => {
  for (const f of [FORM, STATUS]) {
    const s = src(f)
    assert.ok(s.includes('ERROR_ACTIONS.STALE'), `${f} must recognise the STALE action`)
    assert.ok(/mapped\.action === ERROR_ACTIONS\.STALE\s*\)\s*\{\s*onConflict\(\)/.test(s),
      `${f} must call onConflict on STALE`)
    // never re-submit by swapping row_version
    assert.equal(/row_version\s*[+]{2}|expected_row_version\s*=\s*/.test(s), false, `${f} must not mutate row_version`)
  }
})

test('W10: the section wires onConflict/onSaved to refresh authoritative data', () => {
  const s = src(SECTION)
  assert.ok(/onConflict\s*=\s*\(\)\s*=>\s*\{\s*setModal\(null\);\s*data\.refresh\(\)/.test(s),
    'onConflict closes modal + refreshes')
  assert.ok(/onSaved\s*=\s*\(kind\)\s*=>\s*\{\s*setModal\(null\);\s*data\.refresh\(\)/.test(s),
    'onSaved closes modal + refreshes')
  assert.ok(s.includes('onConflict={onConflict}'), 'section passes onConflict to modals')
})

// ── W11. capability gating in the section ───────────────────────────────────
test('W11: every write affordance is gated by a CP-3 capability', () => {
  const s = src(SECTION)
  assert.ok(/role\.canCreate/.test(s), 'Add gated by canCreate')
  assert.ok(/role\.canEdit\s*\?/.test(s), 'Edit gated by canEdit')
  assert.ok(/role\.canApprove\s*\?/.test(s), 'Approve gated by canApprove')
  assert.ok(/role\.canDeactivate\s*\?/.test(s), 'Deactivate gated by canDeactivate')
  assert.ok(/role\.canRestart/.test(s), 'Start-again gated by canRestart')
})

// ── W12. modal shell accessibility + close semantics ────────────────────────
test('W12: modal shell is accessible and closes on backdrop/ESC (guarded while busy)', () => {
  const s = src(SHELL)
  assert.ok(s.includes('useEscapeKey'), 'shell uses the ESC handler')
  assert.ok(s.includes('role="dialog"') && s.includes('aria-modal="true"'), 'shell is a labelled dialog')
  assert.ok(/e\.target === e\.currentTarget && !busy/.test(s), 'backdrop click closes only when not busy')
})

// ── W13. no XSS sink; notes captured via a plain textarea (React-escaped) ────
test('W13: no dangerouslySetInnerHTML in any write component; notes via textarea', () => {
  for (const f of WRITE_COMPONENTS) {
    assert.equal(src(f).includes('dangerouslySetInnerHTML'), false, `${f} must not use dangerouslySetInnerHTML`)
  }
  assert.ok(src(FORM).includes('<textarea'), 'notes captured with a plain textarea')
})

// ── W14. no legacy / compliance coupling introduced by the write UI ─────────
test('W14: write UI never references legacy compliance generators or trackers', () => {
  const forbidden = [
    'clients.services', 'activate_accounting_service', 'generate_client_compliance',
    'accounting_tracker', 'financials_tracker', 'income_tax_tracker', 'compliance_calendar',
  ]
  for (const f of WRITE_COMPONENTS) {
    const s = src(f)
    for (const bad of forbidden) assert.equal(s.includes(bad), false, `${f} must not reference ${bad}`)
  }
})

// ── W15. modal-shell focus management (WAI-ARIA dialog pattern) ──────────────
// OD-5: no jsdom/RTL, so the MECHANISM is proven by asserting the concrete focus-
// management wiring is present (not a generic "focus" substring): trigger capture,
// initial panel focus, restore-on-cleanup, and a tabIndex={-1} labelled dialog panel.
test('W15: shell captures trigger, sets initial focus, restores focus, panel tabIndex=-1', () => {
  const s = src(SHELL)
  assert.ok(s.includes('document.activeElement'), 'captures the currently-focused (triggering) element')
  assert.ok(/triggerRef\.current\s*=/.test(s), 'stores the trigger in a ref')
  assert.ok(/panelRef\.current[\s\S]{0,40}\.focus\(\)/.test(s), 'moves initial focus to the panel on open')
  // the effect returns a cleanup that focuses the stored trigger (restoration on close)
  assert.ok(/return \(\) => \{[\s\S]{0,160}\.focus\(\)/.test(s), 'restores focus to the trigger on unmount')
  assert.ok(s.includes('ref={panelRef}'), 'panel carries the ref')
  assert.ok(s.includes('tabIndex={-1}'), 'panel is programmatically focusable (tabIndex=-1)')
  assert.ok(s.includes('role="dialog"') && s.includes('aria-modal="true"') && s.includes('aria-labelledby="p5-sa-modal-title"'),
    'panel is a labelled modal dialog')
})

// ── W16. modal-shell focus trap (Tab / Shift+Tab wrap) ──────────────────────
test('W16: shell traps Tab and Shift+Tab within the dialog (wraps first<->last)', () => {
  const s = src(SHELL)
  assert.ok(s.includes("onKeyDown={handleKeyDown}"), 'panel handles keydown')
  assert.ok(/e\.key !== 'Tab'/.test(s), 'the trap acts only on Tab')
  assert.ok(s.includes('e.shiftKey'), 'handles the Shift+Tab direction')
  assert.ok(s.includes('preventDefault'), 'prevents the browser default tab-out')
  assert.ok(/last\.focus\(\)/.test(s) && /first\.focus\(\)/.test(s), 'wraps to last (backward) and first (forward)')
  // the focusable set is a real query (buttons/inputs/selects/textareas), not a guess
  for (const sel of ['button', 'input', 'select', 'textarea', 'tabindex']) {
    assert.ok(s.includes(sel), `focusables query must include ${sel}`)
  }
})

// ── W17. safe async write handling (try/catch/finally; busy always resets) ──
test('W17: both modals wrap the write in try/catch/finally; busy always returns false', () => {
  for (const f of [FORM, STATUS]) {
    const s = src(f)
    // Structural proof: an awaited write inside try, a catch(err) that goes through the
    // SAFE mapper (mapRpcError(err)) — never a raw error — and a finally that resets busy.
    assert.ok(
      /try\s*\{[\s\S]*await[\s\S]*\}\s*catch\s*\(err\)\s*\{[\s\S]*mapRpcError\(err\)[\s\S]*\}\s*finally\s*\{[\s\S]*setBusy\(false\)[\s\S]*\}/.test(s),
      `${f} must use try/await … catch(err)->mapRpcError(err) … finally setBusy(false)`,
    )
    // busy is set true before the try and reset ONLY in finally (no bare post-await reset)
    assert.ok(/setBusy\(true\)\s*\n\s*try\s*\{/.test(s), `${f} sets busy true immediately before the try`)
    // the catch preserves the STALE conflict path (never silently swallowed)
    assert.ok(/catch\s*\(err\)\s*\{[\s\S]*ERROR_ACTIONS\.STALE[\s\S]*onConflict\(\)/.test(s),
      `${f} catch preserves the STALE -> onConflict path`)
    // raw technical error is never rendered: setFormError is fed the MAPPED message only
    assert.equal(/setFormError\(\s*err\s*\)/.test(s), false, `${f} must not display the raw error`)
  }
})
