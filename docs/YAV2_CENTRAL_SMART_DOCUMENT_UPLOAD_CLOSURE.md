# YAV2 — Central Smart Document Upload + Requirement Auto-Matching — closure

**Governing base:** `5e90de563b2badac28e0a598e7a1834aba663adb` (origin/sync/integration, after PR #77).
**Branch:** `feature/yav2-central-smart-document-upload`.
**DB / backend / deployment changes: NONE.** Repository-only (frontend + pure matching lib + tests + docs). Dev only (`ogjrwemjefvccpyjwxuo`). No OCR/AI — filename-based deterministic matching only.

---

## Objective delivered
Select a client once, drop many documents, have YAV2 suggest (document type / service / FY / period / exact existing requirement), let the user confirm/correct, then upload+link each file to the canonical existing requirement — the fastest document-entry point. The row-wise Upload / Manage / bulk flows are **unchanged** (Smart Upload is an additional layer).

## Architecture reused (no new document store, no new requirement truth)
- **Requirement candidates:** the live view **`v_requirement_document_readiness`** (via `fetchReadiness({clientId})`) — one obligation row = one requirement, keyed `(requirement_ref_type, requirement_ref_id)`, with `fy_label`/`period`/`doc_type`/`requirement_label`/`is_available`/`current_document_*`. A file is matched **only** against the SELECTED client's requirements — never fabricated.
- **Storage/records:** `secure-docs` bucket + `documents` table (same insert shape as `BulkUploadModal` / `FinancialUploadModal`).
- **Linking (the ONLY mutation path):** governed RPCs **`document_link`** / **`document_replace`**. Financials also repoints `financials_tracker.document_id` (via `p_sync_financials`) and carries UDIN — identical to the existing `FinancialUploadModal`.
- **Readiness after link:** the same view — a linked requirement flips Missing→Provided/Replaced automatically on every surface (Documents, Checklist, Missing, Client 360, Compliance). No new status system.

## Smart Upload entry point
`Documents → ⚡ Smart Upload` button in the DocumentsHub tab bar (gated by `canUploadDocument`). Opens `SmartUploadModal`. "All Documents / Document Checklist / Missing Documents" tabs, row-wise Manage, and the bulk `Upload Document` flow all remain.

## Client-selection behaviour
Select client once (Step 1). The panel shows the client's entity type (`clients.client_type`), current FY (`currentFy()`), and the service categories it actually has requirements for (derived from the fetched rows). The requirement set is fetched **once** and matched in memory — no per-file query. A **stale-response guard** (request sequence) ensures a late fetch for a previously-selected client can never overwrite the current client's requirements.

## Batch upload behaviour
Drop/select many files (Step 2). Each file is parsed and matched independently (Step 3). On **Confirm & Upload**, files are processed one by one; a later failure never discards an earlier success, and each file reports its own result (✓ Uploaded / ⚠ Needs action / ✕ Failed). No atomicity is claimed (the backend is not transactional across files).

## Requirement candidate source
`v_requirement_document_readiness` for the selected client only.

## Matching algorithm (deterministic, filename-based — NOT AI/OCR)
`src/lib/smartUploadMatch.js` (pure): parse filename → `{ docType, refTypes, fy, period }` via ordered hint patterns (GSTR-9C before GSTR-9, TAR before generic financials, etc.), FY patterns (`2025-26`, `2025-2026`, `FY25-26`), and month/quarter + year. Then score each of the client's requirements: a normalised doc-type/label match (strong) or a service match (weak); a parsed FY that disagrees disqualifies; a parsed month/quarter that disagrees disqualifies; **a filename year disambiguates same-month requirements across years** (April 2026 never matches the April 2025 requirement). Candidates are ranked; nothing is invented.

## Confidence model (transparent)
- **High** — a single requirement matches on doc-type and FY/period unambiguously.
- **Needs confirmation (medium)** — doc-type matches but FY/period is unstated/ambiguous (multiple candidates).
- **Low** — only a service-level signal (no doc-type).
- **No match (unmatched)** — the client has no corresponding requirement (e.g. a GSTR-1 file for a client with no GST obligations). Not AI confidence — purely how unambiguously the filename resolves to one existing requirement.

## GST mapping result
A `GSTR-1` / `GSTR-3B` filename maps to the client's exact GST requirement (service + FY + period), never a generic "GST Document". Where the client has **no** GST requirement (as with the dev companies), it correctly returns **No match** rather than fabricating one.

## Financial / Audit mapping result
`Audited FS`, `TAR`, `ITR Ack`, `Computation`, `ITR Form` map to the client's Financial & ITR requirements at High confidence when the FY is in the name.

## UDIN handling (existing flow preserved)
For **Audited Balance Sheet** and **Tax Audit Report (TAR)** the confirmation row exposes **UDIN Number + UDIN Date**; **TAR** additionally exposes **Tax Audit Applicable?** UDIN is required before upload for those types. On upload, financials rows repoint `financials_tracker` and persist UDIN / Tax-Audit-Applicable / remarks — the same fields and rules as `FinancialUploadModal`. GST/other types show no UDIN fields.

## Duplicate / replacement behaviour
If the chosen requirement already has a current document (`is_available`), the row shows the existing document name and uploads via **`document_replace`** (never a silent second current document). Otherwise **`document_link`**. A content-hash check (`findByContentHash`) surfaces exact-duplicate files.

## Canonical link behaviour
Every uploaded file links to the existing `(requirement_ref_type, requirement_ref_id)` — the same identity used by Documents / Checklist / Missing / Client 360 / Compliance.

## Documents / Client 360 / Missing / Compliance integration
After a successful link, the requirement's readiness (from the shared view) flips from Missing to Provided/Replaced everywhere; the linked document appears in the central register. No compliance **filing** status is written by an upload (readiness and filing remain separate dimensions).

## RBAC result
Gated by the existing `documentAccess` helpers (`canUploadDocument`); read-only roles see a permission notice and cannot upload. No permission broadened.

## Error handling
Explicit, per case: no client selected (no fetch), requirement-read failure (distinct `loadError` with Retry — **never** shown as "no matches"), unsupported type, oversize, no matching requirement (skipped), existing current document (replace), and upload/insert/link/replace failures (per-file). A batch failure never falsifies the others.

## UAT examples (authenticated, dev, Bento, read-only — NO upload performed, no console errors)
Signed in as Pankaj Joshi (admin-capable). Files were injected into the client-side grid only; **Confirm & Upload was never clicked → zero storage/DB mutation.**

Client **ABC Pvt Ltd (YA-002, Private Limited Company, FY 2026-27)** — services shown: Financial & ITR, Income Tax, Accounting.

| Filename | Parsed | Result |
|---|---|---|
| `GSTR1_Apr_2026.pdf` | GSTR-1 · April 2026 | **No match** (client has no GST requirement — not fabricated) |
| `GSTR-3B_Apr_2026.pdf` | GSTR-3B · April 2026 | **No match** |
| `Audited_FS_2025-26.pdf` | Audited Balance Sheet · FY 2025-26 | **High** → auto-selected; UDIN + UDIN-Date fields shown |
| `TAR_2025-26.pdf` | Tax Audit Report (TAR) · FY 2025-26 | **High**; UDIN + UDIN-Date + **Tax Audit Applicable?** shown |
| `ITR_Ack_2025-26.pdf` | ITR Acknowledgement · FY 2025-26 | **High** |
| `Accounting_April_2026.pdf` | Accounting · April 2026 | **High** → Accounting April 2026 (year disambiguated from April 2025) |
| `Accounting_July_2025.pdf` | Accounting · July 2025 | **High** → Accounting July 2025 |

Each requirement dropdown listed **only ABC's requirements** (never GST). Mapped count and per-file badges rendered correctly.

**Three defects were caught by UAT and fixed:** (1) a stale-response race (a previously-selected client's late fetch overwrote the current client's requirements) → fixed with a request-sequence guard; (2) High matches not auto-selecting their best requirement (`chosenId` initialised `''` instead of `null`) → fixed; (3) same-month requirements not disambiguated by the filename year → fixed with year matching.

## Tests / build / scans
- **Tests:** `node --test` → **772 passed / 0 failed** (735 governing + 20 new smart-upload; the 17 checklist tests from PR #77 are in-tree). No existing test weakened. New tests cover: filename parsing; GST/financials/accounting matching; wrong-client never suggested; FY ambiguity → confirmation; year disambiguation; no-requirement → unmatched; duplicate→replace vs link; UDIN exposure rules; batch independence + identity; the stale-response guard; RBAC; error≠no-match; canonical linking; entry-point wiring.
- **Build:** clean. **`git diff --check`:** clean.
- **Scans (code):** no `.env`/secrets, **no SQL/migration/RLS/RPC-creation/grant/service-role/auth/storage-policy/Edge**, no V1/production reference, no new dependency, no `debugger`/`alert(`/`console.log`/`dangerouslySetInnerHTML` introduced. Only the pre-existing governed `document_link`/`document_replace` RPCs are called; `console.error` is used for failures (consistent with existing upload modals).

## DB / backend changes
**NO.** No schema/migration/RLS/RPC/grant/storage-policy/Edge/data mutation. Read-only DB inspection only.

## Files changed (4)
`src/lib/smartUploadMatch.js` (new), `src/components/SmartUploadModal.jsx` (new), `src/components/DocumentsHub.jsx` (Smart Upload entry point), `tests/smartUploadMatch.test.js` (new). Plus this closure doc.

## Known limitations
- **Filename-based, not OCR** — a document whose filename lacks type/FY/period cues surfaces as Needs-confirmation or No-match, requiring the user to pick (by design). Content is not read.
- **Provided/Replaced not demonstrable live** — dev has no linked documents, and UAT performed no upload; the link/replace/UDIN write paths are code-reviewed and reuse the proven `FinancialUploadModal`/`ManageDocumentsDrawer` flow, but were not executed in dev (per instruction, actual upload needs separate PJ approval).
- GST/TDS/ROC/Audit/Notice matching is generic and correct, but dev currently has requirement rows only for financials/income_tax/accounting, so those services were verified live as **No match** (honest) rather than as positive matches.

## Future OCR/extraction (separate, PJ-gated) — NOT in this package
Reading the document to extract structured financial/compliance data is the later OCR package. This package deliberately stops at "know which requirement the file belongs to and link it."

## Governance
PR #48 untouched · PR #71 untouched · no merge, no deploy, no DB action. **MERGE-READY — awaiting PJ approval.**
