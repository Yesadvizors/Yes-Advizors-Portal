# YAV2 End-to-End Client Workflow & Data Consistency — Discovery Report

**Date:** 2026-08-04 · **Base:** `sync/integration` @ `9a5810e2172c5bcbd5c55e96aece102ad2d1a686` · **Branch:** `feature/yav2-end-to-end-client-workflow-closure`

## Method & context
An end-to-end audit of the client workflow (Onboarding → Client Master → Directors/Registrations → Services → Compliance → Tasks/Follow-ups → Documents → Client 360 → Dashboard/Firm Overview), focused on **cross-module data consistency** — does the same source row yield the same count/classification/label everywhere? Six prior closures (PR #49/#51/#53/#57/#59/#61/#63) established shared-truth helpers (`helpers.js` task truth, `lib/compliance.js`, `lib/client360.js`, `clientStatusLabel`). This audit finds the places that still compute counts/labels **independently** of those shared helpers and so **disagree** with the rest of the app.

## Findings

| ID | Stage | Module | File:line | Current behaviour | Evidence | Expected | Sev | User impact | Frontend fix | Backend dep | Decision | Verify |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **E2E-1** | Dashboard/Firm Overview | Admin Home | `AdminHome.jsx:21,70,72` | Open-tasks + Overdue-tasks counts use `DONE_TASK='("Done","Cancelled")'` — **omits `Filed / Completed`** | shared `CLOSED_TASK_STATUSES=['Done','Cancelled','Filed / Completed']` (helpers.js) — a `Filed / Completed` task is counted **open/overdue** here but **closed** by Dashboard/Tasks/Client 360 | counts agree across modules | **HIGH** | Firm Overview shows inflated open/overdue task counts | derive the filter from the shared set: `DONE_TASK = pgStatusList(CLOSED_TASK_STATUSES)` (new pure util; no drift) | no | IMPLEMENT | pure + static + consistency anchor |
| **E2E-2** | Tasks/Team | Team | `Team.jsx:50` | `taskCount` uses inline `status !== 'Done' && status !== 'Cancelled'` — **omits `Filed / Completed`** | same shared truth; a `Filed / Completed` task is counted **open** per member here but **closed** everywhere else | agree with `isTaskClosed` | **HIGH** | Team member "Open tasks" inflated | use shared `!isTaskClosed(t.status)` | no | IMPLEMENT | static + pure anchor |
| **E2E-3** | Client 360 | Client 360 | `lib/client360.js:90`, `Client360Workspace.jsx:113` | Header lifecycle status defaults a blank status to **'Active'** | Clients register uses `clientStatusLabel` (blank → **'Unknown'**, PR #57) — same client shows "Active" in Client 360 but "Unknown" in Clients | consistent `clientStatusLabel` | **MED** | a mis-saved/blank status is silently shown "Active" in Client 360 | `buildClientHeader` uses `clientStatusLabel(c.status)`; render shows it directly | no | IMPLEMENT | static + pure anchor |

## Classification of findings
- **Confirmed frontend defect (implement):** E2E-1, E2E-2, E2E-3.
- **Data-quality issue requiring PJ review (document, NOT auto-changed):**
  - **E2E-D1 — AdminHome `DONE_COMPLIANCE` divergence** (`AdminHome.jsx:22`): `'("Filed","Completed","Partner Approved","Not Applicable","Closed")'` **includes "Partner Approved"** (not in the shared `CLOSED_COMPLIANCE_STATUSES = ['Filed','Completed','Closed','Not Applicable','Filed / Completed','Cancelled','Done']`) and **omits** the defensive entries. Whether **"Partner Approved" is a genuine terminal compliance status** is a **business/data decision**: if it is, the shared set is missing it; if not, AdminHome should not treat it as done. Changing either side alters real compliance counts, so this is **deferred to PJ** — recommended future governed package: reconcile the compliance terminal-status vocabulary between `lib/compliance.js` and AdminHome (and confirm against the backend `compliance_status_enum`). No frontend change made here. Affected: `AdminHome.jsx` (frontend), `compliance_calendar.status` / `compliance_status_enum` (backend — read-only observation).
- **Backend dependency (implemented items):** none — E2E-1/2/3 are all frontend-only, reusing existing shared helpers; no new DB read/write path.
- **Verified consistent (no change):** Client 360 lib reuses `isTaskClosed`/`isComplianceClosed`/`complianceDateMeta` (PR #53); Dashboard uses `isTaskClosed` + `todayLocal`; active-client definition matches between Dashboard and AdminHome; Client 360 count derivations already share truth with Tasks/Compliance.
- **False positives excluded:** Tasks display-only `status === 'Cancelled'` branch; a Registrations "Cancelled" column label.

## Target
3 genuine frontend consistency corrections (task-count truth in AdminHome + Team; lifecycle-label truth in Client 360) + 1 documented data-quality finding for PJ (compliance "Partner Approved"). Honest scope after six prior closures; no artificial inflation.
