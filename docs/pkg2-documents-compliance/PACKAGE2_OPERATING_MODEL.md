# Package 2 — Documents × Compliance × Client 360 operating model

**Date:** 2026-08-10 · **Branch:** `design/yav2-core-operations-bento-package` (PR #70, Draft) ·
**Authorised project:** yav2-dev `ogjrwemjefvccpyjwxuo` only. No V1/production, no deploy, no merge.

Builds the flow: one client → one central document repository (`secure-docs` + `documents`) →
upload/classify once → `document_requirements` links → readiness (Available/Missing) → tasks →
Client 360. **No module creates a competing repository.**

## Backend (Part 1)
`v_requirement_document_readiness` (applied via MCP; repo `supabase/migrations/0032_*`). One row
per compliance requirement across the linkable trackers (financials, gst, income_tax, tds, roc,
audit, notice, accounting — `llp`/`payroll` excluded, not in the reftype CHECK), joined to the
**current** `document_requirements` link + **current** `documents` row. Archived/superseded
documents never satisfy readiness. `security_invoker=on` (caller RLS applies). Read-only.
Live at capture: 632 requirements, 0 available / 632 missing (no links yet).

## Frontend
- **Bulk upload** (`BulkUploadModal`): drag/drop many files, per-file queue+status+retry-failed-only,
  batch client/FY/category/scope, per-file doc_type/period, SHA-256 dedup (Use Existing / Upload as
  New), filename classification **suggestions only**.
- **Manage Documents drawer** (`ManageDocumentsDrawer`): current doc, version history, Use Existing
  (link/replace), Upload New/Replace, Archive — all via governed RPCs; read-only roles see history
  without mutation.
- **Compliance readiness**: financials tab shows a Document Readiness column (separate dimension from
  compliance status) + a prominent Manage Documents action; raw per-row upload demoted to a secondary
  UDIN/Replace path (retained for financial metadata + governed replace).
- **Missing view** (`MissingDocumentsPanel`): requirement-specific (not "zero docs"), filterable,
  Create Task + Manage.
- **Client 360**: "Document readiness" + requirement-based "Missing documents" StatCards (replaces the
  old zero-docs definition), via a new read-only `readClientReadiness` service read.
- **Archived/history**: DocumentsHub "Show archived" toggle + Archived badge.
- **MarkFiled**: filed form linked to its exact tracker requirement where proven (gst/income_tax/tds/
  roc/audit only).

## Part 18 — WorkDocuments / `completed_documents` recommendation
**DEPRECATE-HIDE.** `WorkDocuments.jsx` is imported nowhere (unreachable in classic + Bento UIs),
targets the `completed-work` bucket which **does not exist** on dev, and `completed_documents` is
empty → non-functional end-to-end. Its statutory taxonomy (GST/ITR/ROC/TDS/Audit/Payroll doc types)
and internal↔client visibility model are worth preserving as **reference** for a future governed merge
into the canonical `documents` model. **Do not** stand up a competing `completed-work` repository; **no**
destructive migration. Marked deprecated in-file; left unmounted. (Recommendation only — no code deleted.)

## Part 19 — Audit readiness (gaps identified; no audit migration in this package)
The governed RPCs (`document_link/replace/archive`) and the canonical inserts are the safe path; this
package introduces **no** audit bypass. Not yet emitted to `audit_log` (the canonical writer
`audit_write_event` is admin/manager-only + `audit_event_contract`-gated):
`document.upload`, `document.link`, `document.replace`, `document.archive`, `document.view/download`,
`document.physical_delete`, `task.created_from_missing_document`. **Recommendation:** a future package
adds these event names to `audit_event_contract` and emits them from the governed RPCs / callers. No DB
change made here.

## Part 20 — AI/OCR honesty
`ai-agent`, `extract-financial`, `scan-document` are **NOT deployed** on dev and source is unrecoverable.
The assistant entry point is now **hidden unless `VITE_AI_ENABLED='true'`** (App + BentoApp), and the
"● Online · Live data access" / "Powered by Claude AI · Live Yes Advizors data" claims were removed from
`ChatAgent`. The honest dev-preview scaffold (`AiAssistantScaffold`) and the real `ai-agent` invoke
architecture are **retained**. Nothing deployed.

## Part 21 — Reports / Firm view
Quick review only. `AdminHome` (Firm Overview) is admin-gated (`user.is_admin === true`, guarded at
route + mount). No obvious broken actions surfaced during this package and **no fake revenue/EBITDA/KPI
values were introduced**. Left unchanged.

## Future enhancements (reported, intentionally deferred)
- **Tasks doc/requirement reference column** — `tasks` has no compliance/document ref field; missing-doc
  tasks carry context in `task_name`/`notes` only. A `requirement_ref_type`/`requirement_ref_id` (+
  `document_id`) column would enable a hard bridge (needs a DB migration → separate package).
- **Non-financial compliance UX** — readiness + Manage Documents are wired into the financials tab and
  the Missing view; extending the inline readiness column to gst/it/tds/roc/audit tabs is a follow-up.
- **Onboarding `content_hash`** — onboarding uploads are already central (`documents`/`secure-docs`, appear
  in Client 360 + Documents Hub); adding `content_hash` at onboarding upload time for dedup parity is a
  small future tweak (onboarding business logic intentionally left untouched here).
- **Audit events** (Part 19) and a **governed `completed_documents` merge** (Part 18).
