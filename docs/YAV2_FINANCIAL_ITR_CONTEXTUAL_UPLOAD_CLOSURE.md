# YAV2 Financial & ITR Contextual Upload & Document-Linkage — closure

**Governing base:** `13515e4492659df79c01e482150d78793648bd02` (origin/sync/integration; PR #70/#72/#73).
**Branch:** `feature/yav2-financial-itr-contextual-upload` · **head:** `0c371e1fec3362d1959fe1200c123b30ec6a45e3`.
**No DB/backend/deployment changes.** Reuses the existing canonical document flow only. Dev only (`ogjrwemjefvccpyjwxuo`).

## B. Existing architecture discovered
The full document source-of-truth already exists (Packages 1/2, applied to dev):
- Canonical store: `documents` table + `secure-docs` bucket.
- Link table: `document_requirements` (requirement_ref_type / requirement_ref_id ↔ document_id, is_current).
- Governed RPCs: `document_link`, `document_replace`, `document_archive` (revoked from public/anon; role-gated).
- Legacy pointer kept in sync: `financials_tracker.document_id` (via `document_replace(..., p_sync_financials=true)`).
- Readiness view: `v_requirement_document_readiness`.
- Components: `FinancialUploadModal` (contextual upload → documents → link/replace), `ManageDocumentsDrawer` (View/Download/Replace/History/Use-Existing/Archive), `DocumentsHub`, Client 360 Documents/Financials.

## C. Backend support: **EXISTS** (no backend change required)
An existing upload already carries enough context to link an exact Financial & ITR requirement (`requirement_ref_type='financials'`, `requirement_ref_id = financials_tracker.id`); requirement status derives from real `financials_tracker` state; Client 360 already reads the same `documents` truth. **No SQL/RPC/RLS/schema/enum change needed.**

## The gap closed (repository-only)
The **Client-wise** Financials tab already had the rich treatment; the **Activity-wise** Financial & ITR row only had a bare "✓ View" opening the upload modal. Now it mirrors Client-wise:
- **No linked document →** contextual **Upload** (`FinancialUploadModal`), pre-filled with client / FY / doc-type from the row; gated by `canUploadDocument`.
- **Linked document →** **Manage** opens the existing `ManageDocumentsDrawer` (View / Download / Replace / History / Use Existing / Archive) for the exact requirement.

## D–F. Contextual upload — PASS · fields pre-filled · canonical mapping
Runtime (ABC Pvt Ltd · ITR Acknowledgement): the Upload modal opened **pre-filled and locked** — "📊 ITR Acknowledgement · ABC Pvt Ltd · FY 2026-27"; the user re-selects nothing (only picks the file + optional UDIN/remarks). **F (mapping):** the 5 requirement types (Audited Balance Sheet, Computation of Income, ITR Acknowledgement, ITR Form, Tax Audit Report (TAR)) are an **identity mapping** to the canonical `BulkUploadModal.DOC_TYPES` — no duplicate labels, no mapping helper; regression-tested.

## G. Requirement linkage
`document_link` / `document_replace` with `requirement_ref_type='financials'`, `requirement_ref_id = financials_tracker.id`, `p_sync_financials=true`. **Client key discipline (Section 16):** financials uses the **TEXT** `client_id` (both `financials_tracker` and `documents` are text) — passed as `r.client_id`, never the UUID.

## H. Status workflow
Row status derives from the real `financials_tracker.status` (Not Started / Uploaded → shown "Filed" for financials which has no Filed step / Reviewed). A file merely existing is **not** mislabelled Filed — the mapping mirrors the module's own vocabulary.

## I/J. Documents source-of-truth + Client 360 consistency
The uploaded file is the canonical `documents` record; the same document surfaces in Documents Hub and Client 360 (same id/client/FY/type/status). **No duplicate storage** (no `completed-work`/`completed_documents`; regression-tested). Verified in Package 2 UAT for the shared components; no new view of different data is introduced.

## K. Missing / readiness
`document_replace`/`document_link` update `document_requirements` (current link) + `financials_tracker.document_id`, so a correctly linked upload clears readiness for **that exact requirement** (module-aware). Test-covered (FI-7).

## L. Permissions
Reuses the existing `canUploadDocument(documentRole(user))` gate — **not widened**. Upload trigger + replace input are `canUpload`-gated; Manage (view) is available whenever a document exists, and the drawer gates its own mutations via `canManageDocument`.

## M. Runtime UAT (authenticated, dev, Bento) — no console/network errors
Compliance → Activity-wise → **Financial & ITR**: 90 requirement rows across 17 clients, the **5 canonical types**, FY 2026-27, due dates, status "Not Started", contextual **⬆ Upload** per exact row. Upload modal pre-fills client/FY/type. **Live-fixture note:** dev has **0 linked** Financial & ITR documents, so every row correctly shows Upload; the **Manage** path and readiness-clear are covered by tests + prior Package 2 UAT of `ManageDocumentsDrawer`. No test data was created (conservative governance — no dev mutation).

## N–P. Verification
- **Tests:** `node --test` → **728 passed / 0 failed** (719 governing + 9 new).
- **Build:** clean. **`git diff --check`:** clean.
- **Scans:** no `.env`/secrets, no SQL/migration/RLS/RPC/grants/service-role/Edge/storage/auth, no V1/production reference, no new deps, no debugger/alert/console.log/dangerouslySetInnerHTML introduced.

## Q. Files changed (3)
`src/components/Compliance.jsx`, `tests/financialItrContextualUpload.test.js` (new), `tests/documentAccessPkg01.test.js` (PKG01-7 gating update).

## S. Backend/DB dependency
**None.** All capability pre-exists. (Separate, unrelated: `extract-financial` OCR remains not-deployed on dev — the upload/link path works without it; not in this package's scope.)

## Governance
PR #48 untouched · PR #71 untouched · no merge, no deploy, no DB action.
