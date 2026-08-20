# YAV2 — D16-A Financial Workflow Closure (Manual + Local-Assisted Review) — closure

**Governing base:** `c5de5eac1ef3bdea242abbe7a7c4c1d1a42b8b97` (origin/sync/integration, after PR #79).
**Branch:** `feature/d16-financial-workflow-closure`.
**DB / backend / deployment / external-AI changes: NONE.** Repository-only (frontend + pure lib + tests + docs). Dev only. **No new DB schema, no Edge deployment, no external AI (no Claude / Mistral / OpenAI / Google / AWS), no service role.**

---

## D16 acceptance targeted
Workbook D16 (r19): Objective **"Financial workflow closure"** · Deliverable **"Complete upload/review/status and client summary"** · Acceptance **"Accepted financial flow"** · weight 2. This package makes that flow **operational without the (undeployed, source-lost, external-AI) `extract-financial` Edge function**.

## Existing architecture reused (no parallel model)
- `financials_tracker` (per-document status), `client_financials` (structured summary, UNIQUE `client_id,fy_label`), `extracted_document_data` (field-level review), `FinancialUploadModal` (UDIN), `FinancialReviewModal`, the Financial & ITR tab, Client 360 `FinancialStatements`, and the governed `document_link`/`document_replace` linkage — all reused as-is. No new table/column.

## Manual review path (the change)
`FinancialReviewModal` now opens and works **without any prior extraction**:
1. **Entry** — the **"📋 Review / Enter"** action is available for any *linked* financial document (`document_id` present) of the five financial doc types, **gated by the existing `canUpload` permission** (it writes reviewed figures). It no longer requires `extraction_status !== 'pending'`.
2. **Fields** — when no `extracted_document_data` rows exist, a **manual field set** is built per document type (`src/lib/financialReview.js` → `buildManualFields`), seeded from any previously-saved `client_financials` values. Only **existing** `client_financials` columns are exposed — P&L (turnover…pat, ebitda), Balance Sheet (equity_capital…total_liabilities), ITR (gross_total_income…refund), Audit (udin, auditor_name, audit_firm_frn, tax_audit_applicable). No new columns.
3. **Review/correct** — the existing editable Field / Value / Confidence table is reused; manual fields show Confidence **"Manual"**. Blank = *not available* (saved as null, **never guessed**).
4. **Save (`handleConfirm`)** — writes final reviewed values with **`reviewed_by` + `reviewed_at`** (closes the discovery gap) to `extracted_document_data` (UPDATE existing rows; **INSERT** manual rows with `extraction_engine='manual'`), then **UPSERTs** `client_financials` on the unique `(client_id, fy_label)` key so the summary row is **created when none exists** (the previous `.update()` silently saved nothing when the row was absent — the core manual-path fix), stamping `data_source='manual'`, `extraction_engine='manual'`, `reviewed/reviewed_by/reviewed_at`, `source_document_id`. Finally flips `financials_tracker.status='Reviewed'`, `extraction_status='reviewed'`. Sequential, non-transactional, retry-idempotent.

## External-extractor dependency
Removed from the **core** flow: review no longer needs `extract-financial`. The historical external-extraction code (`handleExtract`/`callExtract`/Claude-approval in `FinancialsTab`) is **retained untouched** (not deleted) — it simply is not required to complete D16-A.

## Extraction-engine value = 'manual'
Manual entries use `extraction_engine='manual'`, `data_source='manual'`, `confidence_score='Manual'`, consistent with the existing schema (no new enum).

## Local-assisted suggestions
**Not built in D16-A** (per spec §9 — "if reliable figure parsing would materially complicate D16-A, do not build it; manual-entry takes priority"). Reliable figure/table extraction from audited P&L/BS via local OCR is not dependable; manual entry is the first-class path. Local-OCR *suggestions* are a candidate for a later increment. **Local OCR used: NO.**

## reviewed_by / audit trail
`reviewed_by` = the authenticated user (`user?.name || user?.email`) — no service role. `reviewed_at`, `source_document_id` and final values persisted. A dedicated `audit_log` "financial_review_completed" event was **deferred** — writing it cleanly would need backend/policy work outside D16-A's no-DB scope (recorded as deferred, see below).

## Status separation preserved
Document Readiness (link-based) ≠ Compliance filing status ≠ **Financial review status** (`financials_tracker.status='Reviewed'` / `extraction_status='reviewed'`). The review save touches **only** `financials_tracker` (+ the two financial tables) — never `compliance_calendar`, never `document_link/replace`.

## Validation (non-blocking)
`financialReviewWarnings` shows informational cross-checks (Total Assets vs Total Liabilities; PAT vs PBT−Tax; Net Worth vs Equity+Reserves) as **warnings only** — figures are never auto-changed or blocked (spec §15).

## Client summary
After save, `client_financials` is populated → the Financial & ITR card strip (Turnover / PAT / Net Worth / Total Assets / Taxable Income / Tax Paid) and Client 360 `FinancialStatements` (Balance Sheet / P&L) render the **same reviewed truth** (no parallel store).

## Files changed (3)
`src/lib/financialReview.js` (new — pure helpers), `src/components/Compliance.jsx` (manual-aware review modal + entry button), `tests/financialReviewD16.test.js` (new — 12 tests). Plus this doc.

## Verification
- **Tests:** `node --test` → **819 passed / 0 failed** (807 governing + 12 new). No existing test weakened.
- **Build:** clean. **`git diff --check`:** clean.
- **Scans:** no new SQL/migration/RLS/RPC/grant/service-role/auth/storage/Edge, no external AI (`financialReview.js` and the review modal contain no supabase/fetch/functions.invoke/claude/mistral/openai/extract-financial), no V1/prod, no debugger/alert/console.log/dangerouslySetInnerHTML introduced.

## UAT (authenticated, dev, Bento, read-only — NO save/mutation)
Compliance → Client-wise → **ABC Pvt Ltd** → **Financial & ITR** (FY 2026-27): the five financial rows render with Status + Document Readiness (separate) + Manage/Upload actions; no console errors. The **Review / Enter Financial Data** modal was opened via the component's own state setter (a read-only client-side simulation — the modal only *reads* `extracted_document_data`/`client_financials`, both empty): it rendered the **27-field manual grid** (Audited Balance Sheet) with editable inputs, Confidence "Manual", correct "Audited Balance Sheet · ABC Pvt Ltd · FY 2026-27" context, and the "blanks are saved as not available, never guessed" banner. Typing `12500000` into Turnover was accepted locally and showed the **₹1,25,00,000** hint. **"Confirm & Mark Reviewed" was NOT clicked → zero storage/DB mutation.** Full modal exercise against real data would need an uploaded financial document (absent on dev) — a mutation not separately authorised; the save path is covered by the 12 unit tests + static guards.

## DB / backend statement
**NO** schema/migration/RLS/RPC/grant/storage/Edge/data change. Read-only DB inspection only. No actual financial save performed (no PJ dev-mutation authorisation).

## Known limitations
- Local-OCR figure *suggestions* not built (manual-first by design); a later increment could seed low-confidence candidates from the existing local pdfjs/tesseract text.
- Full end-to-end save UAT bounded by dev having zero uploaded financial documents (creating one is an unauthorised mutation).

## Deferred (future, PJ-gated)
- **D16-B** — partner-approval status distinct from "Reviewed" (needs a status field / policy decision).
- **D16-C** — MIS / ratios / dashboard aggregation from reviewed `client_financials`.
- **Audit-log event** for financial review (needs backend/policy work).
- **External auto-extraction** (Claude/Mistral) — optional, out of scope, requires explicit PJ authorisation (external, paid, sends documents out).

## Governance
PR #48 untouched · PR #71 untouched · no merge, no deploy, no DB action, no external AI. **MERGE-READY — awaiting PJ approval.**
