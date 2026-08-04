# YAV2 Frontend Reliability & UX — PJ UAT Checklist (grouped by module)

## RESULT: **PASS** — PJ authenticated live UAT completed 2026-08-04 (Authorised V2 Admin/Manager). No findings. Manual-UAT blocker cleared.

PJ-verified: Client 360 loads · Refresh shows "Refreshing…" · Refresh disables while active · duplicate refresh blocked · Refresh returns to normal after completion · Client Record + Client Master Preview work · Add Task inline validation (no alert) · Follow-up inline validation (no alert) · PIN-reset toast auto-dismisses ~5s · WorkDocuments success + form reset ~3s · ChatAgent no stale focus/timer · no raw null/undefined/backend text · no console errors · layout/responsiveness — **all PASS**.

**Environment:** V2/yav2-dev via localhost (git-ignored V2-public `.env.local` present in this worktree). Authorised V2 Admin/Manager. Client 360 needs `VITE_CLIENT360_UI=true`; Client Master Preview needs `VITE_P2_PREVIEW=true`. Read-only where possible; transient failures simulated via **DevTools → Network → Offline**.

Record each: **PASS / FAIL / NOT TESTABLE (reason)**.

## Client 360 (FR-1) ⭐
1. Open a client's Client 360 workspace → summary cards + tabs load. ( )
2. Click **↻ Refresh** → button shows **"⏳ Refreshing…"** and is **disabled** while running; clicking again during refresh does nothing (no duplicate). ( )
3. After refresh completes, the button returns to "↻ Refresh" and the summary/active-tab data reflect current data. ( )
4. Set network **Offline**, click Refresh → prior data stays visible (not blanked); failed panels surface in **Attention required**; button re-enables. Restore network + Refresh → recovers. ( )

## Client Master Preview (FR-2, FR-3)
5. Open the read-only Client Master Preview; induce a section read failure (Offline) → the section shows a **business-safe** message ("Could not load this section: …" with safe text), **no raw provider/stack text**. ( )
6. Registrations / GST detail section on failure → same business-safe message, no raw error. ( )

## Onboarding (FR-4)
7. Trigger a client-ID lookup failure during onboarding save (Offline at the right moment) → the dialog shows a **business-safe** detail (no raw provider text), and nothing is saved. ( )

## Work Management (FR-5, FR-6)
8. Add Task with no client selected → an **inline** "Please select a client first." error appears (no blocking browser dialog). ( )
9. Add Task with empty name → inline "Task name is required." (no dialog). ( )
10. Follow-up with an empty note → inline "Please enter a follow-up note." (no dialog). ( )
11. Normal Add Task / Follow-up save still works and is not regressed. ( )

## Clients (FR-7)
12. Reset a client's WhatsApp PIN → the confirmation toast appears and **auto-dismisses after ~5s**; navigating away before it dismisses causes no console warning. ( )

## Documents (FR-9)
13. Upload a completed work document → success state shows, then the form resets after ~3s; closing/navigating away mid-timer causes no console warning. ( )

## ChatAgent (FR-8)
14. Open the assistant, then close it immediately → no console warning about setting state / focusing an unmounted input. ( )

## General
15. No raw backend/provider error, `null`, `undefined` or NaN shown anywhere exercised above. ( )
16. Layouts (Client 360 cards/tabs, modals, filters) remain usable on a narrow viewport. ( )

**Overall:** **PASS** (PJ, 2026-08-04). Findings: **None.**
