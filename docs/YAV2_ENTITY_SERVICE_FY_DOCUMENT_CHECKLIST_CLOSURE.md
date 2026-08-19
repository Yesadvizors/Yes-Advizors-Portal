# YAV2 — Entity / Service / FY Document Checklist + Missing Documents Workflow — closure

**Governing base:** `3282fc2d585134efb08ef2e6e8732b4d9dc95249` (origin/sync/integration, after PR #76).
**Branch:** `feature/yav2-entity-service-fy-document-checklist`.
**DB / backend / deployment changes: NONE.** Repository-only (frontend + shared helper + tests + docs). Dev only (`ogjrwemjefvccpyjwxuo`). No OCR/AI extraction (out of scope — see §Future).

---

## A. Objective delivered
A reliable document-requirement workflow that answers, per client: *what documents are required, for which service, for which FY/period, and is each Missing / Provided / Replaced?* — with the **same requirement & readiness truth** on the Documents page, Client 360 and Compliance.

## B. Architecture discovered (and reused — no parallel model built)
The canonical requirement/readiness model already exists and is live:
- **View `v_requirement_document_readiness`** (migration 0032) is the requirement source of truth. It `UNION`s the obligation trackers — `financials_tracker`, `gst_tracker`, `income_tax_tracker`, `tds_tracker`, `roc_tracker`, `audit_tracker`, `notice_tracker`, `accounting_tracker` — one obligation row = **one requirement**, keyed by `(requirement_ref_type, requirement_ref_id)`, carrying `client_id`, `fy_label`, `period`, `requirement_label`, `doc_type`, `compliance_status`, `due_date`, and (via `document_requirements` + `documents`, current links only) `is_available`, `current_document_*`, `version_count`.
- **Link table `document_requirements`** + governed RPCs **`document_link` / `document_replace` / `document_archive`** are the only mutation path (RLS/storage authoritative).
- Data layer **`src/lib/documentReadiness.js`** (`fetchReadiness`, `summariseReadiness`, `fetchRequirementVersions`, RPC wrappers), and the existing **`ManageDocumentsDrawer`** + contextual **FinancialUploadModal** already implement the governed upload/link/replace flow.

This package adds a **read/UX + consistency layer** over that model. It builds nothing new in the DB.

## C. Canonical document source
`documents` + `secure-docs` bucket; current document = `documents.is_current = true`; supersession chain via `supersedes_document_id` / `superseded_at`.

## D. Canonical requirement source
`v_requirement_document_readiness` (the tracker obligations). No new requirement table introduced or needed.

## E. Client service source
`requirement_ref_type` **is** the service dimension (mirrors the view's UNION trackers). The service *catalogue*/assignment model (`service_catalogue`, `client_service_applicability`, P5) governs which services a client holds; the trackers are generated from that + entity type server-side.

## F. Entity-type source
`clients.client_type` (free text; e.g. "Private Limited Company", "Individual", "Proprietorship"). **Entity type is NOT re-derived in this package.** Which requirements exist is decided server-side (the `generate_client_compliance` RPC consumes `client_type` + `has_gstin/has_tan/has_cin` at onboarding and writes the tracker rows). This package **surfaces and filters by** entity type; it never invents an entity→document rule table (there is no such table in the repo, and fabricating one would contradict the server truth).

## G. Financial-year source
`src/lib/financialYear.js` — `currentFy()`, `fyForDate()`, label format `"YYYY-YY"` (e.g. `2026-27`). Requirements carry `fy_label` (and, for accounting, a monthly `period`).

## H. Requirement identity
`(requirement_ref_type, requirement_ref_id)` — exposed as `requirementKey(row)` in the new shared helper. The SAME requirement is one row/one key on every surface, so nothing double-counts across Documents / Compliance / Client 360.

## I. Entity rules implemented
None fabricated. Entity type is displayed (column + pill) and is a **filter**. Live evidence that entity type genuinely differentiates the checklist (server-driven): a Private Limited Company (ABC Pvt Ltd) has **36** requirements including Financial & ITR; an Individual (PJ) has **26** and **no** Financial & ITR.

## J. Service rules implemented
`serviceCategoryLabel(ref_type)` maps the canonical ref types to operational labels (`financials → "Financial & ITR"`, `income_tax → "Income Tax"`, `gst → "GST"`, `tds → "TDS"`, `roc → "ROC / MCA"`, `audit → "Audit"`, `notice → "Notices"`, `accounting → "Accounting"`, `other → "Other"`); unknown types titleise safely. Requirements are grouped and filtered by service. No Compliance/Financial requirement is duplicated — they are the same tracker rows.

## K. FY / permanent-document rules
`requirementScope(row)` → `fy` (has `fy_label`), `periodic` (has `period`, e.g. monthly accounting), or `permanent` (neither). The current backend requirement model is **entirely FY/period-scoped**; permanent/master documents (PAN, incorporation, MOA/AOA) are **not** modelled as requirements today — they exist only as uploaded `documents` (scope client/director). The UI is future-safe: a permanent requirement (no FY) would render once under a "Permanent / master (no FY)" group with a "Permanent" badge, never duplicated per year. This is documented as a limitation, not fabricated.

## L. Readiness state model (honest to the schema — no invented status)
`documents` has **no review/acceptance column**, so there is deliberately **no "Under review" / "Reviewed / Accepted"** state (that would be a fabricated enum). The states the backend can actually prove, via `classifyRequirementState(row)`:
- **Missing** — `is_available !== true` (no current linked document; an archived-only requirement is Missing).
- **Provided** — current document linked, `version_count ≤ 1`.
- **Replaced** — current document linked, `version_count > 1` (a prior version was superseded; the current controls readiness).
Archived/superseded documents never satisfy a requirement (the view joins only `is_current=true` links and documents). Readiness is kept **separate from compliance filing status** (Filed/Completed/Closed) everywhere.

## M. Documents page result
`DocumentsHub` gains a third tab **"Document Checklist"** (`DocumentChecklistPanel`) beside "All Documents" and "Missing Documents":
- Filters: client, **entity type**, **service**, **FY**, **readiness**, plus text search.
- Counts: **Required / Missing / Provided / Replaced** (hidden while loading or on error — a failed load never shows a false "0 missing").
- Grouped by service → FY; each row shows document, client, entity, FY/period, readiness badge, current document, and an **Upload/Manage** action → the existing `ManageDocumentsDrawer` (governed RPCs). No second upload path.
- Test clients excluded from the firm-wide checklist (with an explicit "N requirements from test client(s) excluded" note); large lists capped at 600 with a visible note.

## N. Missing Documents result
`MissingDocumentsPanel` enhanced (additive): added **entity-type** and **service** filters (friendly service labels), test-client exclusion, and shared `requirementToManagePayload` for Manage. Existing Create-Task and Manage actions preserved.

## O. Client 360 result
`DocumentsSection` gains a **"Document checklist — required vs provided"** panel above the existing DocumentManager, reading the already-loaded `readiness` panel (no new query), grouped by service → FY with the same states/counts and an Upload/Manage action → a governed `ManageDocumentsDrawer` owned by the workspace (a reused, permission-checked modal, consistent with AddTaskModal/OnboardingWizard). The header stat cards ("Document readiness X/Y", "Missing documents") reconcile exactly with the panel counts.

## P. Compliance result
The Compliance FinancialsTab "Document Readiness" column now labels the available state via the **shared** `requirementStateMeta` (Provided / Replaced) instead of a bespoke "Available" string — so the same requirement reads identically here, in the checklist and in Client 360. Filing status and readiness remain distinct dimensions; readiness never gates the tab and an upload never sets a compliance status.

## Q. Document reuse behavior
`ManageDocumentsDrawer` "Use an existing central document" reuses `fetchCompatibleDocuments` (same-client, same FY/type) via `document_link`/`document_replace`. One canonical document can satisfy a requirement without re-uploading. (Multi-requirement fan-out of a single document is a backend concern of `document_requirements`; unchanged here.)

## R. Replace / archive behavior
Unchanged and reused: replace supersedes the prior version (kept in history, current controls readiness → "Replaced"); archive retires the current link (requirement returns to "Missing"). No new RPC.

## S. RBAC result
Preserved. Upload/Manage affordances gated by the existing `documentAccess` helpers (`canUploadDocument`, `canManageDocument`); Client 360 wires Manage only when the viewer can upload; the governed RPCs + RLS remain the real enforcement boundary. No permission broadened; read-only users gain no mutation ability.

## T. Error / empty-state result
Every new surface distinguishes **loading / error / empty**. A readiness read failure sets an explicit error state and **suppresses the counts** — never rendered as "0 missing". No raw `error.message` shown to users.

## U. UAT examples (authenticated, dev, Bento shell, read-only — no storage/DB mutation)
Signed in as Pankaj Joshi (admin-capable). No console errors on any surface. **No file was uploaded** (drawers opened and cancelled only).

| Client | Entity | Services (requirements) | FYs | Required | Missing | Provided |
|---|---|---|---|---|---|---|
| **ABC Pvt Ltd** (YA-002) | Private Limited Company | Financial & ITR (10), Income Tax (2), Accounting (24) | 2025-26, 2026-27 | **36** | 36 | 0 |
| **PJ** (YA-001) | Individual | Income Tax (2), Accounting (24) — *no Financial & ITR* | 2025-26, 2026-27 | **26** | 26 | 0 |

- **Documents → Checklist:** 596 requirements firm-wide (668 − 72 test-client, correctly excluded); grouped by service→FY; entity/service/FY/readiness filters all functional; Upload drawer for "ABC Pvt Ltd · Audited Balance Sheet · 2026-27" opened prefilled ("Missing — no current document linked", financials replace hint) and cancelled.
- **Client 360 (ABC Pvt Ltd) → Documents:** checklist shows 36 required · 36 missing, identical grouping; stat cards (0/36 readiness, 36 missing) reconcile.
- **Documents → Missing:** 596 missing, service labels ("Financial & ITR"), entity filter present, Manage/+Task actions.
- **Consistency:** ABC Pvt Ltd shows the same 36 requirements and Missing states on the firm-wide checklist, the Client 360 checklist, and the Client 360 stat cards.

Readiness state is Missing everywhere because **zero documents are currently linked on dev** (0/668 available). Provided/Replaced are proven by unit tests; they cannot be shown live without linking a document (a storage mutation, not authorised for UAT).

## V. Tests — exact pass/fail
`node --test` → **752 passed / 0 failed** (735 governing + **17 new** in `tests/documentChecklist.test.js`). No existing test weakened. New tests cover: state classification incl. archived-only=Missing and the no-review invariant; requirement identity; service labels; FY/permanent scope; counts; filtering (service/FY/entity/state/search); grouping (permanent not duplicated per year); Upload-context correctness (client/requirement/FY); one-shared-classifier consistency across all four surfaces; readiness-vs-filing separation; error≠zero-missing; test-client exclusion; RBAC preserved; hub wiring.

## W. Build result
`npm run build` → **clean** (Vite, 169 modules, built in ~2.3s). The pre-existing app-wide `supabase.js` dynamic-import advisory is unrelated to this change.

## X. Diff-check / scans
`git diff --check` → clean. Scans of the delta: no `.env`/secrets, **no SQL/migration/RLS/RPC/grant/service-role/auth/storage-policy/Edge**, no V1/production reference, no new dependency, no `debugger`/`alert(`/`console.log`/`dangerouslySetInnerHTML` introduced. Only the governed `document_link/replace/archive` RPCs are referenced, via the pre-existing drawer.

## Y. DB / backend changes
**NO.** No schema, migration, RLS, RPC, grant, storage policy, Edge, or data mutation. Read-only DB inspection only.

## Z. Files changed (8)
- `src/lib/documentChecklist.js` (new — shared pure helper)
- `src/components/DocumentChecklistPanel.jsx` (new — firm-wide checklist)
- `src/components/DocumentsHub.jsx` (Checklist tab + client entity fields in the read)
- `src/components/MissingDocumentsPanel.jsx` (entity/service filters, shared helpers)
- `src/components/client360/Client360Sections.jsx` (per-client checklist in DocumentsSection)
- `src/components/client360/Client360Workspace.jsx` (readiness panel + governed Manage drawer)
- `src/components/Compliance.jsx` (shared readiness label)
- `tests/documentChecklist.test.js` (new — 17 tests)

## AB. Known limitations
1. **No "Under review / Reviewed-Accepted" state** — `documents` has no review-status column. Adding it needs a small DB field (proposed below); intentionally NOT built here (no-DB package).
2. **Permanent/master documents are not requirements** — PAN/incorporation/MOA etc. exist only as uploaded documents, not as tracked requirements. Modelling them as requirements needs a seeded rule (DB) — out of scope; the UI is already future-safe for it.
3. **Provided/Replaced not demonstrable live** — dev has 0 linked documents; those states are unit-tested only.
4. Firm-wide checklist caps at 600 displayed rows (with a visible note) for performance.

## Future (separate, PJ-gated) — NOT in this package
- **Document review/acceptance:** minimal proposal — add `documents.review_status` (`Pending`/`Accepted`/`Rejected`) + reviewer/at columns, expose it in the readiness view, then extend `classifyRequirementState` with an "Accepted" state. DB change → requires separate authorisation.
- **Permanent-document requirements:** a seeded entity/service → permanent-doc rule model.
- **OCR / AI extraction** ("read the document and extract structured data") — explicitly a later package; this one is "know which document is required and whether it is present."

## Governance
PR #48 untouched · PR #71 untouched · no merge, no deploy, no DB action. **MERGE-READY — awaiting PJ approval.**
