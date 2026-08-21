# YAV2 — D17 Notice Workflow Closure — closure

**Governing base:** `8a9ebad0d9398176d5006938e477cdcef94ae8bc` (origin/sync/integration, after PR #80).
**Branch:** `feature/d17-notice-workflow-closure`.
**DB / schema / migration / RLS / Edge / external-AI changes: NONE.** Repository-only (frontend + pure lib + tests + docs). Dev only. No new DB schema, no RPC, no service role, no external AI.

---

## D17 acceptance targeted
Workbook D17: Objective **"Notice workflow closure"** · Deliverable **"Complete deadlines, assignments, evidence and closure"** · Acceptance **"Accepted notice workflow"** · weight 2. This package makes the notice workflow **write-capable** on the existing `notice_tracker` schema.

## Existing architecture reused (no parallel model)
- **`notice_tracker`** (41 cols) — authority/notice_type/section, notice_date/date_of_receipt, response/extended/individual due dates, assigned_to (+assigned_date), workflow_stage, status (**shared `compliance_status_enum`**), reply_prepared/reviewed/filed (+date), acknowledgement_number, demand_raised, documents_required, remarks. Governed **RLS** (0010): admin/manager ALL, executive SELECT + UPDATE.
- **Shared status truth** `src/lib/compliance.js` — `complianceDateMeta`, `isComplianceClosed`, `CLOSED_COMPLIANCE_ENUM_STATUSES` {Closed, Filed, Completed, Not Applicable}. Reused as-is; no notice-specific overdue/closed rule.
- **Governed documents** — `ManageDocumentsDrawer` + `document_link`/`document_replace` with `requirement_ref_type='notice'` (already a valid reftype). No second file store.
- Read surfaces (Compliance NoticeTab, Client 360 NoticesSection) and the SQL views (`v_firm_dashboard`, `v_client_compliance_summary`, `v_overdue_ageing`, `v_requirement_document_readiness`) — all already agree on the same terminal set + due-date coalescing.

## Discovery result
The notice workflow was **100% READ-ONLY**: rich schema + governed RLS + read-only list surfaces, but **no create / edit / assign / status-change / closure / evidence** write path anywhere; `assigned_to` was fetched but never shown; 0 notice rows on dev. **Gap = the entire write workflow** (D17's deliverable). Schema + RLS already support it (no new schema).

## Changes made
- **New pure lib `src/lib/noticeWorkflow.js`**: authority/workflow-stage/status option sets (exact existing DB enum labels — nothing invented), `noticeDueDate` (individual→extended→response, matching the views), `isNoticeOverdue`/`isNoticeClosed` (**reuse** the shared compliance helpers), `validateNotice`, `buildNoticeInsertPayload` / `buildNoticeUpdatePayload` / `buildNoticeClosurePayload` (existing columns only; blanks→null, never fabricated), `summariseNotices` (open/overdue/**dueSoon**/closed), `noticeEvidenceRequirement` (governed document flow).
- **New `src/components/NoticeManageModal.jsx`**: add / edit a notice — authority, type, section, FY, all deadline dates, linked period, **assignment** (assigned_to from `ct_team_members` + assigned_date), workflow_stage, status, reply prepared/reviewed/filed (+date), acknowledgement, demand, documents_required, remarks. **Close Notice** button → canonical terminal status (`Closed`) + reply-filed capture. **Manage Evidence Documents** → the governed `ManageDocumentsDrawer` (`requirement_ref_type='notice'`). Writes go through the standard client; **RLS is the authority**.
- **Compliance NoticeTab** (write-enabled): passes `client`/`user`/`fy`; **＋ Add Notice** + per-row **Manage** (both gated by `canManage` = active Admin/Manager — fail-closed, matching the RLS ALL grant); shows the **Assigned To** column (resolved client-side).
- **Bug fix (list load):** the notice list previously embedded `ct_team_members` via the FK, which **failed under RLS and errored the whole list** ("Could not load Notices"). Replaced with a plain `select('*')`; assignee names resolved from a best-effort team map. The list now loads (empty state) instead of erroring.

## Deadline / overdue truth
Reuses the shared `complianceDateMeta`: overdue only when the effective response due (individual→extended→response) is past **AND** status not terminal; closed never overdue; due-today not overdue; missing date safe; timezone-safe. Identical truth across NoticeTab, Client 360, and the SQL views.

## Assignment
`assigned_to` displayed + editable (assign/reassign) from `ct_team_members`; `assigned_date` stamped on change. Gated by role (fail-closed). **`ct_team_members` is empty on dev (0 rows)** — a data gap in that legacy V1 table (the `assigned_to` FK targets it, not the app's `team` table); the dropdown shows an honest "No active team members available to assign." — the feature is complete; the empty assignee source is a separate data/onboarding matter.

## Evidence / document
Notice evidence links through the **existing** governed document flow (`ManageDocumentsDrawer` + `document_link`/`document_replace`, `requirement_ref_type='notice'`) — no new storage. Available from a saved notice's Manage screen.

## Closure
"Close Notice" sets `status='Closed'` (canonical terminal) + `reply_filed=true` + `reply_filed_date` + optional remarks (existing fields only). A closed notice drops from open/overdue counts via the shared truth. Compliance filing status and document readiness are untouched (the modal writes only `notice_tracker`).

## Client 360 / dashboard consistency
Client 360 NoticesSection and the firm dashboard already read the same `notice_tracker` truth (same terminal set + due-date coalescing); no parallel copy introduced. `summariseNotices` now also exposes `dueSoon`.

## Status separation
Notice review/closure status (`notice_tracker.status`) is independent of compliance filing status and document readiness — the write path touches only `notice_tracker` (+ governed document links for evidence).

## Verification
- **Tests:** `node --test` → **833 passed / 0 failed** (819 governing + 14 new). No existing test weakened.
- **Build:** clean. **`git diff --check`:** clean.
- **Scans:** **no** SQL/migration/RLS/policy/grant/RPC/service-role/Edge/external-AI, no V1/prod, no debugger/alert/console.log/dangerouslySetInnerHTML introduced.

## UAT (authenticated, dev, Bento, read-only — NO notice data mutated)
Compliance → Client-wise → ABC Pvt Ltd → **Notices**: the list-load bug is **fixed** — the tab renders the honest empty state ("No Notices records"), not an error; the **＋ Add Notice** button appears (role-gated). The **Add Notice** modal opened (client-side only — **not saved**) and rendered the full form: Authority (exact enum), Notice Type, all deadline dates, Assigned To (honest "No active team members" — ct_team_members empty), Workflow Stage + Status (exact enum values), reply flags, demand, documents-required, remarks. **"Add Notice" was not clicked → zero mutation.** End-to-end write UAT (create → assign → close → evidence) requires notice/team data + a separately-authorised dev mutation (dev has 0 notices + 0 ct_team_members); the write/close/evidence paths are covered by the 14 unit tests + static guards.

## DB / backend statement
**NO** schema/migration/RLS/policy/grant/RPC/storage/Edge/data change. Read-only DB inspection only; no notice data created or mutated.

## Files changed (3 + doc)
`src/lib/noticeWorkflow.js` (new), `src/components/NoticeManageModal.jsx` (new), `src/components/Compliance.jsx` (NoticeTab write workflow + list-load fix), `tests/noticeWorkflowD17.test.js` (new), `docs/YAV2_D17_NOTICE_WORKFLOW_CLOSURE.md` (new).

## Known limitations / deferred
- `ct_team_members` (the `assigned_to` FK target) is empty on dev → assignee dropdown empty (data/onboarding gap, not a code defect). A future item could reconcile the notice-assignee source with the app's `team` table.
- Executive-UPDATE RLS is finer than the UI gate (Admin/Manager) — executive-scoped notice editing deferred (conservative fail-closed choice).
- The JS/SQL `status='Overdue'` literal divergence + a firm-level notice tile are minor items noted for a later consistency pass (not required for D17).
- Live create/assign/close/evidence UAT deferred pending notice/team data + separate dev-mutation authorisation.

---

## Follow-on — CENTRAL All-Client Notice Register (extends this PR; no parallel workflow)

**Operational gap:** the client-level workflow required opening every client to find notices. Added **one cross-client register** so notices are operational from a single workspace.

**Location (preferred existing nav, no new left-nav module):** Compliance → **Activity-wise** → **Notices**. `Notices` is a new Activity-wise type; selecting it routes to `CentralNoticeRegister` instead of a standard tracker table (the FY selector — which does not apply to notices — is hidden; the shared search is reused).

**Same source of truth, no second architecture:** the register reads the **same `notice_tracker`** with **no `client_id` filter** (cross-client; RLS still scopes rows) and reuses the **same `NoticeManageModal`** (add/edit/assign/status/**close**/evidence) and the **same governed `ManageDocumentsDrawer`** as the client tab. Status/overdue/closed verdicts and the chip counts come from the shared `noticeWorkflow.js` → `compliance.js` helpers (`summariseNotices`, `noticeDueDate`, `isNoticeOverdue`, `isNoticeClosed`) — list, chips and totals cannot disagree.

**Columns (exactly as specified):** Client · Authority · Notice Type · Notice Date · Response Due · Assigned To · Reply Filed · Demand · Status · **Action** (Manage). Status filter chips: All / Open / Overdue / Due Soon / Closed (counts from the shared summary). Add-Notice stays a per-client action; the register's Action is Manage-only (edit/assign/close/evidence on an existing notice, with the client resolved from the loaded name map).

**Access:** read for everyone; **Manage gated to Admin/Manager (RLS ALL), fail-closed** — same `canManage` rule as the client tab. Failed reads surface a retryable error (never a false "no notices").

**Incidental hardening (found while wiring):** the client-tab team-member loader (`ct_team_members`) previously dropped its query error and used a `setTeam` setter that a `stripComments` scanner quirk was accidentally hiding from the reliability guards (CR-13) and the Team-Workload-removal guard (G7). Both notice team-loaders now capture the error and use a distinctly-named `setNoticeTeam` setter, so the guards see and pass the code honestly (the removed Team Workload panel's `setTeam` stays genuinely gone). No behaviour change to users.

**Verification (follow-on):** `node --test` → **839 passed / 0 failed** (833 + **6** new register guards: nav routing, same-source cross-client read with no `client_id` filter + no service-role/RPC/AI, modal + evidence-drawer reuse, RBAC gate + required columns, shared-truth counts, load-error capture). Build clean. `git diff --check` clean.

**UAT (authenticated, dev, Bento — read-only, ZERO mutation):** Compliance → Activity-wise → **Notices** rendered the cross-client register with the exact columns and PJ's synthetic test row **without opening the client** — *Aarti & Co (YA-010) · Income Tax · TEST – Sec 143(2) Scrutiny · 21 Jan 2026 · Response Due 31 Aug 2026 · Unassigned · Reply Filed No · ₹1,000 · Assigned · Manage*; chips **All 1 / Open 1 / Overdue 0 / Due Soon 0 / Closed 0**. **Manage** opened the **same** `NoticeManageModal` pre-filled (header "Manage Notice · Aarti & Co · FY 2026-27", with Close Notice / Save Changes / Manage Evidence). **Cancelled without saving — the test notice is unchanged and preserved** (chips still All 1; row intact).

**Files changed (follow-on):** `src/components/Compliance.jsx` (add `CentralNoticeRegister`; route Notices under Activity-wise; team-loader hardening), `tests/noticeWorkflowD17.test.js` (+6 guards), this doc.

**Follow-on limitations:** assignee dropdown still honestly empty (`ct_team_members` = 0 rows on dev); the register is not FY-scoped by design (notices span periods).

## Governance
PR #48 untouched · PR #71 untouched · no merge, no deploy, no DB action, no external AI. **MERGE-READY — awaiting PJ approval.**
