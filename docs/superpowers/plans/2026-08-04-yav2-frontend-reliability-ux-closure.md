# Frontend Reliability & UX Closure — Implementation Plan

> REQUIRED SUB-SKILL: executing-plans. Checkbox steps.

**Goal:** Close FR-1..FR-9 (see spec) — repository-only frontend reliability/UX fixes + one shared unmount-safe helper.

## Global Constraints
Repository-only; no backend/SQL/RLS/RPC/schema/policy/Supabase-config; no new DB write path; V2/yav2-dev only; V1/Prod prohibited; no deploy; Draft PR; PR #48 untouched; preserve visual design + role/RLS/fail-closed; no raw provider text; guard active (avoid trigger tokens / V1 ref in commit msgs & PR bodies; use `--body-file`). Base `sync/integration` @ `4cdcbeb`; baseline 494 tests, build exit 0.

## File Structure
- **Create** `src/hooks/useTimeoutMessage.js` (FR-7).
- **Modify** `src/components/client360/Client360Workspace.jsx` (FR-1).
- **Modify** `src/components/preview/ClientMasterPreview.jsx` (FR-2), `src/components/preview/sections/RegistrationsGstSection.jsx` (FR-3).
- **Modify** `src/components/OnboardingWizard.jsx` (FR-4, FR-7-draftFeedback).
- **Modify** `src/components/AddTaskModal.jsx` (FR-5), `src/components/FollowUpModal.jsx` (FR-6).
- **Modify** `src/components/Clients.jsx` (FR-7-pinResetMsg).
- **Modify** `src/components/ChatAgent.jsx` (FR-8), `src/components/WorkDocuments.jsx` (FR-9).
- **Create** `tests/frontendReliabilityUxClosure.test.js`.
- **Docs:** closure report, test evidence, UAT checklist, register entry.

## Task 0: Baseline (done: 494 pass, build exit 0).

## Task 1: `useTimeoutMessage` hook + pure/static tests (FR-7 base)
- [ ] Create the hook (spec §4). Write tests: static guard (hook has `clearTimeout(timer.current)` in a `useEffect(() => () => …, [])` cleanup; returns `[message, show]`). Commit.

## Task 2: FR-1 Client 360 Refresh
- [ ] In `Client360Workspace.jsx`: change `const { panels, loading, refresh } = data` → add `refreshing`. Replace the Refresh button:
```jsx
right={<button type="button" style={{ ...S.ghost, ...(refreshing ? { opacity: 0.6, cursor: 'default' } : null) }} onClick={refresh} disabled={refreshing} aria-label="Refresh workspace" aria-busy={refreshing}>{refreshing ? '⏳ Refreshing…' : '↻ Refresh'}</button>}
```
- [ ] Static guards (CLW: workspace reads `refreshing`; button `disabled={refreshing}` + "Refreshing…"). Test + build. Commit.

## Task 3: FR-2/FR-3 preview raw-error → safeErrorMessage
- [ ] `ClientMasterPreview.jsx`: import `safeErrorMessage`; replace `error.message || String(error)` (l.72) and `e?.message || String(e)` (l.75) with `safeErrorMessage(error)` / `safeErrorMessage(e)`.
- [ ] `RegistrationsGstSection.jsx`: import `safeErrorMessage`; replace the four raw-error sites (l.46,56,59,63) with `safeErrorMessage(...)`.
- [ ] Static guards (no `error.message || String(error)`; uses `safeErrorMessage`). Test + build. Commit.

## Task 4: FR-4/FR-5/FR-6 blocking alerts + raw error
- [ ] `OnboardingWizard.jsx:704`: `idErr.message` → `safeErrorDetail(idErr)` (already imported).
- [ ] `AddTaskModal.jsx:206,207`: `alert('Please select a client first')` → `{ setSaveError('Please select a client first.'); return }`; `alert('Task name required')` → `{ setSaveError('Task name is required.'); return }`.
- [ ] `FollowUpModal.jsx:33`: `alert('Please enter a follow-up note')` → `{ setSaveError('Please enter a follow-up note.'); return }`.
- [ ] Static guards. Test + build. Commit.

## Task 5: FR-7 adopt hook + FR-8/FR-9 timer cleanup
- [ ] `Clients.jsx`: replace `const [pinResetMsg, setPinResetMsg] = useState(null)` → `const [pinResetMsg, showPinResetMsg] = useTimeoutMessage(5000)`; replace the two `setPinResetMsg({...})` + the `setTimeout(... setPinResetMsg(null) ...)` with `showPinResetMsg({...})` (drop the manual setTimeout). Import the hook.
- [ ] `OnboardingWizard.jsx`: replace `draftFeedback` `useState` + `setTimeout(() => setDraftFeedback(null), 4000)` with `useTimeoutMessage(4000)` (`showDraftFeedback`). Import the hook.
- [ ] `ChatAgent.jsx`: hold the focus timer in a ref (`focusTimer`), set it at l.32, and clear it in the existing unmount cleanup effect (extend the `analysingTimer` cleanup).
- [ ] `WorkDocuments.jsx`: hold the success timer in a ref; clear on unmount via an effect.
- [ ] Static guards (Clients/Onboarding use `useTimeoutMessage`; no bare `setTimeout(... setPinResetMsg(null)`; ChatAgent/WorkDocuments clear their timers). Test + build. Commit.

## Task 6: Verify, docs, Draft PR
- [ ] Full suite + build + `git diff --check` + secret/prohibited/scope/raw-error scans.
- [ ] Non-auth boot check against V2/yav2-dev.
- [ ] Closure report + test evidence + PJ UAT checklist (grouped by module) + register entry (Status Draft).
- [ ] Commit; push; Draft PR (`--body-file`). Do NOT mark Ready / merge.
- [ ] Consolidated report.

## Self-Review
Every FR maps to a task + test. Helper name `useTimeoutMessage` consistent. No placeholders.
