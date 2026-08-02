# YAV2 — Compliance Reliability and Consistency Closure Report

**Package type:** Repository-only (frontend) functional reliability and consistency hardening of the
Compliance module and the document components. **Not** a presentation/redesign package.

**Branch:** `feature/yav2-compliance-reliability-closure` (worktree `YAV2-Compliance-Reliability-Closure`),
cut from `sync/integration` @ `53d14b73c90bdc7d412b92f44b5d9781179a5235`.

**Governance:** No backend touched — no SQL, migration, RLS, RPC, permission, storage-bucket or data
mutation; yav2-dev (`ogjrwemjefvccpyjwxuo`) only; V1/Production untouched. The paused presentation/redesign
package (`feature/yav2-professional-redesign-launch`, PR #48) was not modified, merged, rebased or continued.
Delivered as a **Draft PR** against `sync/integration` — **not merged, not deployed.**

---

## 1. The core defect: one compliance "overdue/closed" truth

Before this package, each compliance tracker computed *overdue* its own way and kept its own idea of which
statuses were *done*. The same row could be red in one tab, counted in a stat, and excluded from a filtered
list simultaneously. Concretely (pre-fix):

- **IT / TDS / ROC / Audit** date cells used `new Date(eff(r)) < new Date()` — a date parsed at **UTC**
  midnight compared against the **local** clock, so a row due **today** showed **overdue** (red) for most of
  the day; and only status `Filed` was excluded, so `Completed` / `Closed` / `Not Applicable` rows still
  rendered red.
- **NoticeTab** computed overdue with **no status exclusion at all**.
- **GST** and **ActivityView** used string comparison (correct for "due today") — so they disagreed with the
  five trackers above.
- **ActivityView** computed "overdue" on **three different date fields**: the server filter on
  `standard_due_date`, the stat on `standard_due_date || due_date`, and the row badge on the full
  `individual → extended → standard → due` precedence — and with **divergent closed-status sets** (the filter
  excluded `Uploaded`/`Reviewed`; the stat and badge did not). The overdue count therefore never had to match
  the badges on screen.

**Fix — a single source of truth** in `src/lib/compliance.js` (pure, no React/Supabase, clock injected as a
local `today`):

| Export | Contract |
|---|---|
| `CLOSED_COMPLIANCE_STATUSES` | The **union** of every scattered "done" set: `Filed`, `Completed`, `Filed / Completed`, `Closed`, `Not Applicable`, `Uploaded`, `Reviewed`, `Cancelled`, `Done`. |
| `isComplianceClosed(status)` | Case-/whitespace-insensitive membership; null-safe. |
| `effectiveDueDate(row)` | The one precedence: `individual → extended → standard → response → due_date`. |
| `complianceDateMeta(dueDate, status, today, soonDays=7)` | Full ageing verdict: `{ closed, hasDate, overdue, dueToday, dueSoon, group }`. Local-date string compare (so **due-today is not overdue**), ISO timestamps compared on the date portion, invalid/impossible dates (`2026-13-40`) rejected — never crash, never read as overdue. |
| `isComplianceOverdue(row, today)` / `complianceRowGroup(row, today)` | Row-level convenience over the two above. |

Every cell, stat, filter and badge now routes through these:
- IT / TDS / ROC / Audit / Notice date cells → a shared `DueCell` (via `isRowOverdue`).
- GSTCell overdue/soon → `complianceDateMeta`.
- ActivityView overdue **stat**, row **badge**, and the **Overdue chip** all use `isComplianceOverdue`
  (the chip refines the server pre-filter client-side so the list, badges and count cannot disagree).
- `FileBtn` no longer offers "Mark Filed" on any terminal-status row (shows a locked label instead).

## 2. Loader error/empty/loading state closure (~15 loaders)

Previously **15 of 16** compliance loaders destructured only `{ data }` and dropped the query `error`, so a
failed read rendered as **"No records"** — an outage was indistinguishable from a client who genuinely had
nothing. A reusable `<Err label onRetry>` panel was added, and every loader now captures the error and shows a
**retryable** error state distinct from empty:

GSTTab, ITTab, TDSTab, ROCTab, AuditTab, AccTab, NoticeTab, FinancialsTab, FinancialReviewModal (load),
ClientPanel coverage (was silently **hiding real tabs** on error), ClientPanel summary (shows `–`, not a false
`0`), FirmDashboard (an all-zero firm reads as "nothing overdue" — the most dangerous false negative here),
ClientComplianceList, ActivityView `loadRows`, and the ActivityView client-name map (logs rather than
discards).

## 3. Mark-Filed / Review action reliability

- **FinancialReviewModal** (the highest-severity truthfulness gap): all three writes
  (`extracted_document_data`, `client_financials`, `financials_tracker`) previously **discarded their error**
  and `onDone()` fired **unconditionally** — a failed DB write still reported "Reviewed". Now: re-entrancy
  guard (`if (saving) return`); each write is checked (`throw` on error); the tracker only flips to `Reviewed`
  after every prior write succeeds (so a partial failure leaves the row visibly un-reviewed and a retry is
  idempotent); an **accurate partial-write** message ("Some changes may not have been saved — please retry")
  that neither claims success nor falsely claims "nothing changed"; Cancel/✕/Escape disabled while saving.
- **FinancialUploadModal**: re-entrancy guard added; Cancel/✕/Escape disabled while uploading; the three
  raw-`error.message` banners replaced with business-safe text (detail to `console.error`).
- Extraction handlers: raw `e.message` sites routed through `safeErrorMessage`.

## 4. WorkDocuments / DocumentsHub / DocumentManager

- **WorkDocuments:** load errors surfaced with retry (was false-empty); `viewDoc` signed-URL failure now shows
  a dismissible notice (was a silent **dead click**); a JS `isAllowedFile` allow-list validates upload type
  (the `accept=` hint is bypassable by drag/rename); duplicate-check uses `.order().limit(1).maybeSingle()`
  (a plain `maybeSingle()` errors once ≥2 versions exist, silently disabling the "upload as new version?"
  warning); `handleSubmit` re-entrancy guard; `uploaded_by` null-safe; **delete** now checks the record-delete
  error before reporting success (was false success / possible orphan) in both ClientLibrary and CategoryView.
- **DocumentsHub / DocumentManager:** `deleteDoc` checks the record-delete error first; raw `error.message`
  upload/insert banners replaced with business-safe text; DocumentManager load error surfaced.

Ordering note: delete removes the **DB row first** (that is what the UI lists), then the storage object; a
storage-remove failure after a successful row delete is logged, not surfaced as a user error.

## 5. Files changed (exact)

| Kind | Count | Files |
|---|---|---|
| Source | 5 | `src/lib/compliance.js`, `src/components/Compliance.jsx`, `src/components/WorkDocuments.jsx`, `src/components/DocumentsHub.jsx`, `src/components/DocumentManager.jsx` |
| New tests | 1 | `tests/complianceReliabilityClosure.test.js` (**17** tests) |
| Existing tests amended | 0 | — (all 399 prior tests pass unchanged) |
| Docs | 3 | this report, `docs/YAV2_COMPLIANCE_RELIABILITY_TEST_EVIDENCE.md`, `docs/YAV2_Master_Completion_Register.md` (updated) |
| **Total** | **9** | |

## 6. Verification

- **Tests:** `node --test` → **399 → 416 pass / 0 fail** (+17).
- **Build:** `vite build` exit **0** (125 modules transformed).
- **Whitespace:** `git diff --cached --check` clean.
- **Secret scan (staged diff):** no prohibited prod ref (`zcszesuvjrryxtigjglt`), no JWT/service-role/API key,
  no dev URL/anon-key literal. The yav2-dev anon key lives only in a git-ignored `.env.local` (absent from this
  worktree).

## 7. Backend dependencies (recorded, NOT executed)

- **`compliance_calendar` idempotency:** no unique constraint on `(client_id, compliance_tracker_id)`; the
  frontend read-then-write guard (`calendarRowsToInsert`) is not race-proof. Needs a unique constraint + upsert
  (migration). Unchanged by this package.
- **Backend views** (`v_client_compliance_summary`, `v_firm_dashboard`, `v_overdue_ageing`): their internal
  overdue/closed-set and date-field rules cannot be confirmed to match the frontend badge rules without
  inspecting the views. A likely count-vs-badge truthfulness gap remains **at the view layer** and must be
  reconciled in a governed backend task (P6/P10). The frontend now uses one consistent rule; aligning the views
  to it is the backend half.
- **Role enforcement** for compliance Mark-Filed / Review remains an RLS concern; frontend gating is
  defence-in-depth only.

## 8. Manual verification dependency

Interactive authenticated boot smoke (render Login → sign in → open Compliance) needs the yav2-dev test-account
credentials and a per-worktree `.env.local` (git-ignored, absent here); governed provisioning is out of scope.
The build (all modules transformed) plus the 416 pure/static tests are the runtime verification performed.

## 9. Completion views (this package)

**The overall weighted figure is owned by the separate governing model and remains PROVISIONAL ≈ 45.0%** — it
is **not** re-derived, inflated or finalised here (no task-splitting to manufacture progress). This package
closed the compliance/document reliability items that the Core Operational Closure explicitly **deferred**:

- **Work-item view:** the compliance overdue-consistency defects (5 tab date-cells, the 3-way ActivityView
  mismatch, divergent closed sets), the ~15 error-discarding loaders, the two Financial write modals, and the
  WorkDocuments/Docs deferred items — **all repository-fixable items closed** (0 deferred to a further
  repository pass; remaining work is the recorded **backend** view-alignment + constraint).
- **HIGH/critical view:** the false-success on financial review (silent "Reviewed" on write failure) and the
  false-empty-on-outage class (overdue counts, firm dashboard) — **≈ 100% closed**.
- **Overall weighted:** **PROVISIONAL ESTIMATE ONLY ≈ 45.0%**, pending authoritative recalculation in the
  governing weighted model (not final, not approved).
