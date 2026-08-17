# Compliance module — Phase 1 discovery + re-skin decision

**Package:** Functional Completion (Phase 1). **File:** `src/components/Compliance.jsx` (1,777 lines).
**Decision (PJ):** **Defer** the deep Bento re-skin; apply **light, safe chrome** only.
Reason: Compliance is business-critical and **already works and is usable** in the Bento
shell today; a full re-skin is the single highest-risk change in the package and PJ's
strategy is function-first, redesign module-by-module later on real usage.

---

## 1. Structure (26 components in one file)

Top-level `Compliance({ user, bento })` → three main tabs:
- **Firm Dashboard** (`FirmDashboard`) — firm-wide rollup from DB views.
- **Client-wise** (`ClientComplianceList` → `ClientPanel`) — per-client workspace with
  sub-tabs **GST · Income Tax · TDS · ROC · Audit · Accounting · Notices · Financials**.
- **Activity-wise** (`ActivityView`) — cross-client by activity.

`ClientPanel` composes the per-area tabs (`GSTTab`, `ITTab`, `TDSTab`, `ROCTab`, …) and
the **Financials** tab with document extraction + `FinancialReviewModal`.

## 2. Reads (SELECT-only tables + views)

Trackers: `gst_tracker`, `income_tax_tracker`, `tds_tracker`, `roc_tracker`,
`audit_tracker`, `accounting_tracker`, `llp_tracker`, `notice_tracker`,
`financials_tracker`, `client_financials`. Support: `clients`, `documents`,
`financial_years`, `extracted_document_data`.
**Derived views (authoritative for status/ageing):** `v_client_compliance_summary`,
`v_firm_dashboard`, `v_overdue_ageing`.

## 3. Status / due-date / overdue logic

- Per-area **status** and **due dates** come from the tracker rows (`status`, `fy_label`,
  due columns) filtered `.eq('client_id', …).eq('fy_label', fy)`.
- **Overdue / ageing** is computed by the DB view `v_overdue_ageing` and the firm rollup
  by `v_firm_dashboard` / `v_client_compliance_summary` — **not** re-derived in the UI.
- This is the **compliance truth**. It must not be reimplemented or second-guessed in a re-skin.

## 4. Writes (narrow, all in the Financials review flow)

`1 × insert`, `4 × update` — all in the Financials extraction/review path
(`extracted_document_data` field edits, `financials_tracker` status →
`Reviewed` / `extraction_status` → `reviewed`). No writes elsewhere in the module.

## 5. Document intelligence inside Compliance

Financials tab calls the **`extract-financial`** edge function (2 refs, via
`SUPABASE_FUNCTIONS_URL`, 3 refs) — modes `unpdf` / `mistral-ocr` / `claude` →
`{ fields, engine, confidence, ocrText }` → `extracted_document_data` → human review.
(See `docs/ai/AI_ASSISTANT_AND_DOC_INTELLIGENCE.md`.) **No RPC** is called directly.

## 6. Permissions

Component takes `user`; area write actions are gated on ownership/role in the sub-tabs.
Server RLS on the trackers/views is the authoritative gate (unchanged here).

## 7. Existing guards (must stay green)

`tests/compliance.test.js`, `tests/complianceReliabilityClosure.test.js`,
`tests/complianceRunner.test.js`, `tests/complianceTabs.test.js`.

## 8. What was changed this package (light chrome only)

`Compliance` now accepts an optional `bento` prop (defaults off → **identical** legacy
behaviour). When set (BentoApp passes `bento: true`), it re-colours **only** the module
header (title/subtitle) and the active main-tab using the shell tokens `--b-text`,
`--b-text-subtle`, `--b-green`. **No** compliance-truth, runner, RPC, status/due-date/
overdue, extraction/review, reads or writes are touched. Purely presentational.

## 9. Deferred — the deep re-skin (future phase)

Recommended future shape (post-usage): a presentation-only `ComplianceBentoView` over the
existing data/logic container, one area-tab at a time, each behind its existing guard,
preserving every item in §3–§6. Not done now, by decision.
