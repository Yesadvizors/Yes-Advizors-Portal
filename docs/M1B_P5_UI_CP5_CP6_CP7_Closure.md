# YAV2 Portal V2 — Module 1 — P5 UI — CP-5 / CP-6 / CP-7 Closure

**STATUS: IMPLEMENTED / CORRECTED · PJ LIVE RUNTIME VERIFICATION COMPLETE (PASS, 2026-07-21 IST) — PROPOSED CLOSED PASS, awaiting independent ChatGPT review and PJ final approval.**
The write UI (create/edit Draft, approve/deactivate, start-again) plus polish/regression sweep is
complete on top of the **closed** PG-1 backend (Migration 0022). It introduces **no** new migration, SQL,
compliance/tracker/calendar generation, CP-8, P6, or V1/Production action. All writes flow only through
the existing 0021/0022 RPCs via the CP-2 service wrappers.

**Live runtime verification (PJ, 2026-07-21 IST, immutable Preview linked to governing HEAD
`3a5f439c15cafa493cd2d2320d7733f286441b6b`, V2/yav2-dev):** the full P5 UI runtime checklist Steps 1–14
is **PASS** — including Step 12 (non-Admin role gating: logged in as `info@yesadvizors.com`, Role `Staff`;
on Clients Onboarding the separate **"Client Master (Preview)"** button was **hidden** for the Staff user, so
the Service Applicability section and all its write actions were **inaccessible** — the user did **not** open
Service Applicability; normal Client Record modal available; Firm Overview + Audit Log hidden), Step 13 (no
compliance/tracker/calendar side effects; baseline 312/120/26/0 unchanged),
and Step 14 (Admin & non-Admin `v_firm_dashboard` 200, clean Console/Network). The earlier Step-14
`due_soon` 42703 was an investigated and resolved **stale-deployment / incorrect-URL** issue — **no database
view change and no source change were required** (HEAD already selects `due_in_7_days`). Full evidence:
`docs/M1B_P5_UI_Runtime_Verification_Interim_Evidence.md` and `docs/M1B_P5_Runtime_Verification_Closure_Summary.md`.

**Rev 2 corrections applied (ChatGPT PASS WITH SPECIFIC CORRECTIONS):** (a) master-register scoped entry
added; (b) full WAI-ARIA modal focus management — initial focus, Tab/Shift+Tab trap, focus restoration,
`tabIndex={-1}` panel — with tests (W15/W16); (c) safe async write handling in both modals
(`try/catch/finally`, `busy` always resets, thrown errors converted via `mapRpcError` — no raw errors),
with tests (W17); (d) documentation wording clarified (this status).

**Verification status (explicit):**
- ✅ **Automated/static verification completed** — `node --test` 322/322 pass; `vite build` clean.
- ✅ **Non-mutating runtime smoke completed** — Add button + form modal + client-side validation render,
  no RPC/DB write, no console errors.
- ✅ **LIVE runtime verification COMPLETE (PJ, 2026-07-21 IST) — PASS** — Steps 1–14 on the immutable
  Preview (governing HEAD `3a5f439`) against V2/yav2-dev; create/edit/approve/deactivate/start-again/
  optimistic-lock conflict all exercised; **Step 12** non-Admin role-gating PASS; **Step 13** no side
  effects (312/120/26/0 unchanged); **Step 14** clean Console/Network (Admin & non-Admin `v_firm_dashboard`
  200). Evidence: `docs/M1B_P5_UI_Runtime_Verification_Interim_Evidence.md`.
- 🟨 **P5 and Module 1 are PROPOSED CLOSED PASS** — final closure awaits independent ChatGPT review and PJ
  final approval (this authoring step does not mark it finally approved).

- **Repository / branch:** `D:\Claude\Claude Code\Yes-Advizors-Portal` · `ui/redesign-v1`.
- **Backend authority:** Migration 0021 (schema + 3 RPCs, CLOSED) and Migration 0022 / PG-1 (OTHER-notes +
  optimistic-lock guards, EXECUTED / CLOSED PASS). The UI adds **no** new backend policy.
- **Feature flag:** the whole section stays gated by `VITE_P5_UI` (dark in Production until a separate
  release approval); the surrounding P2.1 sections remain read-only.

## 1. Scope delivered
| CP | Scope | Status |
|----|-------|--------|
| **CP-5** | `ServiceApplicabilityFormModal` — create Draft / edit Draft, client-side validation, RPC-only writes | **Implemented** |
| **CP-6** | `ServiceApplicabilityStatusModal` — approve / deactivate + optimistic-lock conflict UX (close + refresh + reopen); "Start again" (restart → new Draft) | **Implemented** |
| **CP-7** | Section orchestration, capability-gated row actions, toast, **WAI-ARIA modal focus management** (initial focus / Tab+Shift+Tab trap / focus restoration / `tabIndex={-1}` panel), **safe async write handling**, empty/error/loading/success states, responsive modal, regression sweep, build | **Implemented / Corrected** |

## 2. Files
**Added (frontend):**
- `src/components/serviceApplicability/ServiceApplicabilityModalShell.jsx` — shared overlay/dialog, `Field`, `Toast`, styles.
- `src/components/serviceApplicability/ServiceApplicabilityFormModal.jsx` — create/edit modal (CP-5).
- `src/components/serviceApplicability/ServiceApplicabilityStatusModal.jsx` — approve/deactivate modal (CP-6).

**Modified (frontend):**
- `src/components/serviceApplicability/ServiceApplicabilitySection.jsx` — orchestrator: Add button, row-action callbacks, modals, toast, refresh-on-write, capability gating (still flag- + role-gated).
- `src/components/serviceApplicability/ServiceApplicabilityLiveTable.jsx` — optional gated Actions column (Edit/Approve/Deactivate) via callbacks; pure read-only when no callbacks.
- `src/components/serviceApplicability/ServiceApplicabilityHistory.jsx` — optional gated "Start again" (restart) via callback + availability; never reopens Inactive.

**Tests:**
- `tests/serviceApplicabilityUI.test.js` — updated for CP-5..CP-7 (read-primitive invariants preserved; action affordances proven capability-gated).
- `tests/serviceApplicabilityWriteUI.test.js` — **new**: 14 static tests over the modals + shell + section (RPC-only, validators/builders wiring, OTHER-notes, optimistic-lock UX, effective_to only on deactivate, edit-immutable service, accessibility, no XSS sink, no legacy coupling).

**Documentation:**
- `docs/M1B_P5_UI_CP5_CP6_CP7_Closure.md` — **this** record (new).
- `docs/M1B_P5_UI_Discovery_Design_And_Implementation_Plan.md` — §14 CP-5/CP-6/CP-7 checkpoint rows marked implemented (no change to the PG-1 row or any PG-1 evidence).
- `docs/YAV2_Master_Completion_Register.md` — a **narrowly-scoped** P5 UI entry: CP-5/CP-6/CP-7 **IMPLEMENTED / CORRECTED · PJ LIVE RUNTIME VERIFICATION COMPLETE (PASS, 2026-07-21 IST) · P5 and Module 1 PROPOSED CLOSED PASS** (subject to independent ChatGPT review + PJ final approval; not finally approved). **PG-1 is not rewritten or reopened**; the committed PG-1 execution closure/evidence is untouched.

**No change** to: any migration/SQL/verification script, the committed PG-1 execution evidence (`docs/M1B_P5_PG1_Execution_Evidence.md`), `serviceApplicability.js` validators/builders, `serviceApplicabilityErrors.js`, the read/write service wrappers, hooks, `set_status` RPC, RLS, grants, catalogue, audit contracts, or any non-P5 source.

## 3. Design conformance (approved decisions)
- **RPC-only writes:** modals call only `createServiceApplicability` / `updateServiceApplicability` /
  `setServiceApplicabilityStatus` (CP-2 wrappers → 0021/0022 RPCs). No direct Supabase / `.rpc` / `.from`
  anywhere in the UI (statically asserted).
- **Validation reuse:** the CP-1 pure validators (`validateCreate/Edit/Approve/Deactivate`) and payload
  builders drive every write; the DB (incl. PG-1 OTHER-notes + row_version guards) remains the authority.
- **OTHER-notes:** the form marks Notes required and blocks submit when the service is `OTHER`;
  `OTHER_NOTES_REQUIRED` from the backend is surfaced on the Notes field (defence-in-depth of PG-1).
- **`effective_to`:** never exposed in create/edit; collected **only** in the Deactivate modal (stop date).
- **Optimistic lock:** on `STALE_ROW_VERSION` the modal calls `onConflict` → the section closes the modal,
  refreshes authoritative data, and shows a conflict toast requiring the user to reopen and reapply.
  Stale form values are discarded — `row_version` is never silently swapped/re-submitted.
- **No reopen / no delete:** Inactive rows expose no Edit/Approve/Deactivate; "Start again" opens the
  **create** modal for a NEW Draft (only when the service has no live row). No delete UI (no RPC exists).
- **Capability gating:** every affordance is gated by the CP-3 capabilities (`canCreate/canEdit/
  canApprove/canDeactivate/canRestart`) AND per-row lifecycle predicates; non-Admin/Manager or inactive
  users see nothing (fail closed), consistent with the RPC gates.
- **Legal transitions only:** Edit/Approve → Draft; Deactivate → Draft/Approved; approval requires
  `effective_from` set and `effective_to` empty (the modal validates before calling the RPC).
- **Accessibility (WAI-ARIA dialog):** the shared shell moves initial focus to the labelled
  `role="dialog"` `aria-modal` panel (`tabIndex={-1}`), traps Tab / Shift+Tab within the dialog (wrapping
  first↔last), and restores focus to the triggering control on close; ESC and backdrop close are guarded
  while a write is in flight. (Under OD-5 the mechanisms are proven by static wiring tests W15/W16.)
- **Safe async writes:** both modals wrap the write in `try/catch/finally`; `busy` **always** returns to
  false; any thrown/rejected error is converted through `mapRpcError` (never a raw technical error is
  shown); the `STALE_ROW_VERSION` → conflict path is preserved in both the result-error and catch branches
  (test W17).

## 4. Test & build results
- `node --test`: **322/322 pass** (was 305; +17 write-UI tests — incl. W15/W16 focus management, W17 safe-async).
- `npm run build`: **clean** (vite 5.4.21).

## 5. Runtime smoke verification (performed — NON-MUTATING)
Local Vite started with process-scoped `VITE_P2_PREVIEW=true` + `VITE_P5_UI=true`; logged in as active
Admin; Clients → client detail → Client Master Preview → Service Applicability:
- ✅ **"+ Add service"** button renders (gated by `canCreate` + availability; 0 live rows → all codes available).
- ✅ **"Add service (Draft)"** modal opens with all fields (Service*, Effective from + hint, Frequency,
  Linked registration, Owner, Notes) and Cancel / Create draft.
- ✅ **Client-side validation fires** — submitting empty shows "Select a service." and issues **no RPC / no
  DB write** (validation fails closed before any wrapper call).
- ✅ **No browser-console errors.** Modal cancelled; **no applicability record was created** (smoke test
  deliberately avoided any successful write).

## 6. Runtime verification INSTRUCTIONS for PJ (full E2E — writes to V2/yav2-dev)
Run on V2 (`VITE_P2_PREVIEW=true` + `VITE_P5_UI=true`) as an **active Admin/Manager**. These steps DO
create/modify service-applicability rows on V2 (the intended CP-5/6 function) — run against a
sample/test client. No compliance/tracker/calendar rows are produced by any step.

1. **Add (create):** Service Applicability → "+ Add service" → pick a non-OTHER service (e.g. GST) →
   Create draft → toast "Service applicability added"; a Draft row appears in the live table.
2. **OTHER-notes:** "+ Add service" → pick **Other** with blank Notes → Create draft → blocked with
   "Notes are required for the 'Other' service." Add notes → succeeds.
3. **Edit (Draft):** row **Edit** → change frequency/owner/notes/effective-from → Save changes → toast
   "…updated"; values reflected. (Service field is read-only.)
4. **Approve:** on a Draft with an **effective-from set** and no effective-to → row **Approve** → confirm →
   toast "…approved"; status badge → Approved. (Approve with no start date shows "Set a start date before
   approving.")
5. **Deactivate:** on a Draft/Approved row → **Deactivate** → enter a stop date (≥ start) → confirm →
   toast "…deactivated"; the row moves to **Inactive history**.
6. **Start again (restart):** expand Inactive history → **Start again** on a row whose service has no live
   row → the **create** modal opens (pre-filled) → Create draft → a NEW Draft appears (the Inactive row is
   unchanged — no reopen).
7. **Optimistic lock:** open the same Draft's Edit in two tabs; save in tab A; in tab B save → the conflict
   toast appears, the modal closes and the data refreshes; reopening in tab B shows tab A's values (tab B's
   stale edit was discarded, never silently applied).
8. **Role gating:** as a non-Admin/Manager (e.g. ZZTEST-Viewer) the section is hidden entirely (no Add, no
   row actions) — fail closed.
9. **No side effects:** confirm no compliance/tracker/calendar rows were generated (Compliance/trackers
   unchanged); only `client_service_applicability` rows changed, all via the audited RPCs.

## 7. Governance
No new migration/SQL, no compliance/tracker/calendar generation, no CP-8/P6, no V1/Production action. The
write UI is a frontend layer over the closed 0021/0022 backend; the RPCs remain the sole write authority.
Awaiting independent (ChatGPT) review before P5 UI closure is recorded PASS.
