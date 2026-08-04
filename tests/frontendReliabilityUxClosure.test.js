/**
 * YAV2 Frontend Reliability & UX Closure — regression tests (FR-1..FR-9).
 * node:test — `npm test`. Convention OD-5: static source guards + light pure
 * checks (no jsdom/RTL; no invented DB shape). Non-overlapping with prior closures.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

// ── FR-7 shared helper ─────────────────────────────────────────────────────────
test('FR-7a: useTimeoutMessage clears its timer on unmount and returns [message, show]', () => {
  const code = stripComments(read('../src/hooks/useTimeoutMessage.js'))
  assert.match(code, /useEffect\(\(\) => \(\) => clearTimeout\(timer\.current\), \[\]\)/) // unmount cleanup
  assert.match(code, /clearTimeout\(timer\.current\)[\s\S]{0,80}setMessage/)              // clears before re-scheduling
  assert.match(code, /return \[message, show\]/)
})

// ── FR-1 Client 360 Refresh feedback ───────────────────────────────────────────
test('FR-1a: Client360 workspace consumes the hook refreshing state', () => {
  const code = stripComments(read('../src/components/client360/Client360Workspace.jsx'))
  assert.match(code, /const \{ panels, loading, refreshing, refresh \} = data/)
})
test('FR-1b: Client360 Refresh button shows "Refreshing…" and disables while active', () => {
  const code = stripComments(read('../src/components/client360/Client360Workspace.jsx'))
  assert.match(code, /disabled=\{refreshing\}/)
  assert.match(code, /refreshing \? '⏳ Refreshing…' : '↻ Refresh'/)
})

// ── FR-2 / FR-3 preview raw-error → safeErrorMessage ───────────────────────────
test('FR-2: ClientMasterPreview routes read errors through safeErrorMessage (no raw text)', () => {
  const code = stripComments(read('../src/components/preview/ClientMasterPreview.jsx'))
  assert.match(code, /import \{ safeErrorMessage \} from '\.\.\/\.\.\/lib\/errors'/)
  assert.match(code, /safeErrorMessage\(error\)/)
  assert.doesNotMatch(code, /error\.message \|\| String\(error\)/)
  assert.doesNotMatch(code, /e\?\.message \|\| String\(e\)/)
})
test('FR-3: RegistrationsGstSection routes read errors through safeErrorMessage (no raw text)', () => {
  const code = stripComments(read('../src/components/preview/sections/RegistrationsGstSection.jsx'))
  assert.match(code, /safeErrorMessage/)
  assert.doesNotMatch(code, /\.message \|\| String\(/)
})

// ── FR-4 Onboarding raw error in alert ─────────────────────────────────────────
test('FR-4: Onboarding client-ID alert uses safeErrorDetail, not raw idErr.message', () => {
  const code = stripComments(read('../src/components/OnboardingWizard.jsx'))
  assert.match(code, /safeErrorDetail\(idErr\)/)
  assert.doesNotMatch(code, /\+ idErr\.message \+/)
})

// ── FR-5 / FR-6 blocking validation alerts → inline ────────────────────────────
test('FR-5: AddTaskModal validation is inline (no blocking alert in saveTask)', () => {
  const code = stripComments(read('../src/components/AddTaskModal.jsx'))
  assert.doesNotMatch(code, /alert\('Please select a client first'\)/)
  assert.doesNotMatch(code, /alert\('Task name required'\)/)
  assert.match(code, /setSaveError\('Please select a client first\.'\)/)
  assert.match(code, /setSaveError\('Task name is required\.'\)/)
})
test('FR-6: FollowUpModal note validation is inline (no blocking alert)', () => {
  const code = stripComments(read('../src/components/FollowUpModal.jsx'))
  assert.doesNotMatch(code, /alert\('Please enter a follow-up note'\)/)
  assert.match(code, /setSaveError\('Please enter a follow-up note\.'\)/)
})

// ── FR-7 adoption ──────────────────────────────────────────────────────────────
test('FR-7b: Clients pinResetMsg uses useTimeoutMessage (no bare uncleared setTimeout)', () => {
  const code = stripComments(read('../src/components/Clients.jsx'))
  assert.match(code, /import \{ useTimeoutMessage \} from '\.\.\/hooks\/useTimeoutMessage'/)
  assert.match(code, /const \[pinResetMsg, showPinResetMsg\] = useTimeoutMessage\(5000\)/)
  assert.doesNotMatch(code, /setTimeout\(\(\) => setPinResetMsg\(null\)/)
})
test('FR-7c: Onboarding draftFeedback uses useTimeoutMessage (no bare uncleared setTimeout)', () => {
  const code = stripComments(read('../src/components/OnboardingWizard.jsx'))
  assert.match(code, /useTimeoutMessage\(4000\)/)
  assert.match(code, /showDraftFeedback\(/)
  assert.doesNotMatch(code, /setTimeout\(\(\) => setDraftFeedback\(null\)/)
})

// ── FR-8 / FR-9 timer cleanup ──────────────────────────────────────────────────
test('FR-8: ChatAgent focus timer is held in a ref and cleared', () => {
  const code = stripComments(read('../src/components/ChatAgent.jsx'))
  assert.match(code, /focusTimer = useRef\(null\)/)
  assert.match(code, /focusTimer\.current = setTimeout\(\(\) => inputRef\.current\?\.focus\(\)/)
  assert.match(code, /clearTimeout\(focusTimer\.current\)/)
})
test('FR-9: WorkDocuments success-reset timer is held in a ref and cleared on unmount', () => {
  const code = stripComments(read('../src/components/WorkDocuments.jsx'))
  assert.match(code, /successTimer = useRef\(null\)/)
  assert.match(code, /useEffect\(\(\) => \(\) => clearTimeout\(successTimer\.current\), \[\]\)/)
  assert.match(code, /successTimer\.current = setTimeout/)
})
