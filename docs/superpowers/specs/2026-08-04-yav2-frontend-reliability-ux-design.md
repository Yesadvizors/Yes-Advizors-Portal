# YAV2 — Frontend Reliability & UX Closure — Design Spec

**Date:** 2026-08-04 · **Owner:** PJ · **Executor:** Claude Code
**Governing base:** `sync/integration` @ `4cdcbeb4a3e5d5de737c5690c8244392294abeb4`
**Branch:** `feature/yav2-frontend-reliability-ux-closure` · **Worktree:** `D:/Claude/Claude Code/YAV2-Frontend-Reliability-UX`
**Authorised env:** V2/yav2-dev `ogjrwemjefvccpyjwxuo` only. V1/Production prohibited.
**Posture:** repository-only (frontend); no backend (no SQL/migration/RLS/RPC/mutation/schema/policy); no new DB write path; no deploy; Draft PR; PR #48 untouched; existing visual design preserved; fail-closed access preserved.

## 1. Objective
Close a coherent set of evidenced frontend reliability + UX defects (refresh feedback, raw-error exposure, blocking-alert validation, uncleared timers) across the operational portal. Reliability/UX hardening only — not a redesign, not a new business feature.

## 2. Defect register (audit result)
| ID | Module | Sev | Evidence | Fix |
|---|---|---|---|---|
| FR-1 ⭐ | Client 360 | MED | `Client360Workspace.jsx:60,154` — Refresh ignores hook `refreshing` (no "Refreshing…", no disable, re-entrant) | consume `refreshing`; label + disable while active |
| FR-2 | Client Master Preview | MED | `preview/ClientMasterPreview.jsx:72,75` (rendered l.82) — raw `error.message` | `safeErrorMessage` |
| FR-3 | Client Master Preview | MED | `preview/sections/RegistrationsGstSection.jsx:46,56,59,63` (rendered l.73/79) — raw error | `safeErrorMessage` |
| FR-4 | Onboarding | MED | `OnboardingWizard.jsx:704` — `idErr.message` in blocking `alert()` | `safeErrorDetail(idErr)` |
| FR-5 | Work Management | MED | `AddTaskModal.jsx:206,207` — blocking `alert()` validation | inline `setSaveError` |
| FR-6 | Work Management | LOW | `FollowUpModal.jsx:33` — blocking `alert()` validation | inline `setSaveError` |
| FR-7 | Clients + Onboarding | LOW-MED | `Clients.jsx:208` (pinResetMsg), `OnboardingWizard.jsx:830` (draftFeedback) — auto-clear `setTimeout` never cleared | new unmount-safe `useTimeoutMessage`; adopt in both |
| FR-8 | ChatAgent | LOW | `ChatAgent.jsx:32` — focus `setTimeout` uncleared | clear in existing unmount cleanup |
| FR-9 | Documents | LOW | `WorkDocuments.jsx:282` — success-reset `setTimeout` uncleared | ref + clear on unmount |

**Ruled out:** Team raw-error (dead code, `CREATE_LOGIN_ENABLED=false`); index keys (benign; hardened files); keydown listeners (7 add / 7 remove — parity verified); Usage-tab visibility (PJ product decision); Dashboard/AdminHome (already hardened). No backend dependency; no overlap with PR #48 or #56–60.

## 3. Minimum-required Client 360 Refresh (FR-1) — diagnosis + fix
**Diagnosis: WORKING BUT NO FEEDBACK (and re-entrant).** The button (l.154) calls `refresh` → `load('refresh')`, which reloads all six panels; summary cards + attention derive from those panels, so *data does update*. The `useClient360Data` hook is sound: monotonic `seqRef` drops stale/superseded responses, `mountedRef` drops post-unmount, and on a refresh error it keeps the prior rows and re-surfaces per-panel errors (never false-empty). The defect is purely UI: the workspace destructures only `{ panels, loading, refresh }` — **ignoring `refreshing`** — so the button never says "Refreshing…", is never disabled, and permits re-entrant clicks.
**Fix:** also read `refreshing`; render the button as `refreshing ? '⏳ Refreshing…' : '↻ Refresh'`, `disabled={refreshing}` with a disabled style. This gives feedback, disables while active, and blocks duplicate requests (the hook already covers stale-response, prior-data retention, and per-panel error surfacing). No change to the hook.

## 4. Shared helper — `useTimeoutMessage` (FR-7)
```js
// src/hooks/useTimeoutMessage.js
import { useState, useRef, useEffect, useCallback } from 'react'
// Transient message with auto-clear, cleaned up on unmount so it can never
// setState on an unmounted component. Returns [message, show]; show(msg) sets it
// and schedules a clear after `ms`; show(null) clears immediately.
export function useTimeoutMessage(ms = 4000) {
  const [message, setMessage] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const show = useCallback((msg) => {
    clearTimeout(timer.current)
    setMessage(msg ?? null)
    if (msg != null) timer.current = setTimeout(() => setMessage(null), ms)
  }, [ms])
  return [message, show]
}
```
Adopt in `Clients.jsx` (pinResetMsg) and `OnboardingWizard.jsx` (draftFeedback), replacing the bare `useState` + uncleared `setTimeout`.

## 5. Principles
Preserve existing visual design; no broad refactor unrelated to a proven defect; reuse shared helpers only where they materially reduce repeated unsafe patterns (FR-7); business-safe errors via `safeErrorMessage`/`safeErrorDetail` (`src/lib/errors.js`); no raw backend/provider text; no new DB write path; no schema/policy/Supabase-config change; preserve role/RLS boundaries and fail-closed access.

## 6. Testing (OD-5: pure-logic + static source guards; no jsdom)
`tests/frontendReliabilityUxClosure.test.js`, ~15–20 tests, one+ guard per FR:
- FR-1: workspace destructures `refreshing`; Refresh button `disabled={refreshing}` + "Refreshing…" label.
- FR-2/FR-3: preview files import + use `safeErrorMessage`; no `error.message || String(error)` rendered.
- FR-4: Onboarding uses `safeErrorDetail(idErr)`; no bare `idErr.message` in the alert.
- FR-5/FR-6: no `alert(` for validation in the two modals; `setSaveError` used.
- FR-7: `useTimeoutMessage` exists, clears on unmount (`clearTimeout` in an effect cleanup); Clients + Onboarding import/use it.
- FR-8: ChatAgent clears the focus timer.
- FR-9: WorkDocuments holds its success timer in a ref and clears it.
Plus pure checks where a small helper is extractable (e.g., the refresh label).

## 7. Verification
Full suite green (baseline 494 + new); `vite build` exit 0; `git diff --check`; secret/prohibited/scope/raw-error-static scans; non-auth localhost boot against V2/yav2-dev. PJ authenticated UAT checklist grouped by module.

## 8. Rollback
Additive/guarded on a dedicated branch — per-file `git checkout sync/integration -- <file>` or discard branch. No backend state changed.
