# YAV2 — Client 360° Operational Workspace — Package Report

- **Owner / Authority:** PJ
- **Executor:** Claude Code
- **Repository:** `Yesadvizors/Yes-Advizors-Portal`
- **Branch:** `feature/yav2-client-360-operational-workspace`
- **Worktree:** `D:/Claude/Claude Code/YAV2-Client-360-Operational-Workspace`
- **Verified package base SHA:** `768e06108c148969524edebe3b6a7858a7bb9e31` (post-PR-#51 `sync/integration`, local == `origin/sync/integration`, clean)
- **Base is NOT** the older `53d14b73c90bdc7d412b92f44b5d9781179a5235`.
- **Tests:** 424 → 456 (`node --test`, all pass). **Build:** `vite build` success.
- **Nature:** repository-only frontend feature package. No Supabase / SQL / migration / RLS / deploy / V1 / production activity. PR #48 untouched.

---

## 1. Scope

A repository-level **Client 360° Operational Workspace** giving an authorised (Admin/Manager)
user a complete operational view of one client across: client master data, compliance, tasks,
follow-ups, documents, financials, notices, team/assignment, and recent activity — with an
operational-summary card row and an attention-required panel. Read-first; the only mutations
reuse existing, already-permission-checked flows.

The workspace ships **dark by default** behind a feature flag (`VITE_CLIENT360_UI`), matching
the repo convention for new UI (P2 preview, P5 UI), and is gated to Admin/Manager.

---

## 2. Read-only discovery findings

### 2.1 App shell / data / roles
- **Routing** is state-based tabs in `src/App.jsx` (no react-router, no global selected-client).
  Client selection is local to `Clients.jsx` (list → in-page detail modal). The established
  pattern for a client-scoped view is a modal launched from that detail modal (as
  `ClientMasterPreview` already does) — the workspace follows it exactly.
- **Supabase** client: `src/supabase.js` (`{ data, error }` pattern). Safe errors:
  `safeErrorMessage` / `safeErrorDetail` in `src/lib/errors.js`.
- **Roles**: `isAdminOrManagerRole(user)` (`src/lib/clientMaster.js`); the `user` prop is the
  active `team` row. Admin and Manager are equivalent (decision OD-1). `useClientMasterRole.canWrite`
  is permanently `false` — not usable for write gating.

### 2.2 Dual client-key model (critical)
Different sources key the client differently (verified against migrations 0002/0003/0004/0015):

| Source | Table / view | Client key |
|---|---|---|
| Compliance obligations | `compliance_calendar` | `clients.id` (uuid) |
| Notices | `notice_tracker` | `clients.id` (uuid) |
| Tasks | `tasks` | `clients.client_id` (text YA-code) |
| Follow-ups | `follow_ups` | `clients.client_id` (text) |
| Documents | `documents` | `clients.client_id` (text) |
| Financials | `financials_tracker` | `clients.client_id` (text) |

The workspace is therefore launched with the **full `clients` row** (both keys), and the read
layer takes the correct key per source.

### 2.3 Shared truth to reuse (no second definition)
- **Compliance ageing/terminal** (corrected in **PR #51**): `complianceDateMeta`,
  `isComplianceClosed`, `isComplianceCompleted`, `effectiveDueDate`, terminal-status constants
  in `src/lib/compliance.js`. Key correction reused: **`Reviewed` is NOT terminal** on standard
  trackers (a Reviewed-but-unfiled row can still be overdue); `Uploaded`/`Reviewed` are terminal
  only for `moduleKey==='financials'`.
- **Clock**: `todayLocal()` (IST-safe local `YYYY-MM-DD`, never `toISOString()`).
- **Tasks**: `isTaskClosed` / `isTaskCompleted` / `getDueMeta` (`src/helpers.js`).
- **Financial year**: `currentFy` / `startFyFromDate` (`src/lib/financialYear.js`).
- **Per-client compliance source**: `compliance_calendar` is the unified per-obligation table
  (uuid-keyed, one `due_date` + `status` per row), the same source `AdminHome.jsx` uses. The
  workspace classifies each calendar row through the PR#51 helpers rather than trusting the
  possibly-stale stored `is_overdue`/`is_due_soon` flags.

### 2.4 Section-by-section support
| Section | Repo support | Source |
|---|---|---|
| Client header | Legacy `clients` row | `Clients.jsx` load |
| Compliance | Yes | `compliance_calendar` (uuid) + shared PR#51 helpers |
| Tasks | Yes | `tasks` (text) + shared task helpers |
| Follow-ups | Yes (derived) | open `tasks` with `next_followup_date` |
| Documents | Yes | `documents` (text) via reused `DocumentManager` |
| Financials | Yes | `financials_tracker` (text) — extraction/review status |
| Notices | Yes | `notice_tracker` (uuid) |
| Team & access | Partial (derived) | task assignees; **no client↔team field exists** |
| Recent activity | Yes (constrained) | `follow_ups` + document/task events |

### 2.5 Honest gaps (surfaced, not fabricated)
- **No client↔team / relationship-manager assignment** field/table. The workspace derives
  "who is working this client" from task assignees and flags "No team member assigned" when
  none. Relationship-manager / assigned-team are reported as backend dependencies.
- **No required-document checklist.** "Missing documents" is defined only as *zero documents*
  (the same definition `AdminHome.jsx` uses) — no expected-vs-uploaded checklist is invented.
- **No unified per-client activity feed.** The firm audit RPC (`get_sensitive_audit_logs`) is
  admin-only and its general write path is deferred, so the feed is assembled from the reliable
  per-client sources (follow-ups, document uploads, task creation) and the limitation is stated
  in the UI. A unified audit aggregation is recorded as a backend dependency.

---

## 3. Architecture & data-flow decisions

```
Clients.jsx (detail modal)
  └─ 🧭 Client 360°  (flag + Admin/Manager gated)
       └─ Client360Workspace  (full-screen overlay, useEscapeKey, role fail-closed)
            ├─ useClient360Role(user)      → deriveClient360Capabilities (pure)
            ├─ useClient360Data(client)    → 6 concurrent reads, PER-PANEL errors
            │     └─ services/client360Reads.js  (lazy supabase, *With(client) factories)
            ├─ src/lib/client360.js (PURE): header + summarizers + attention + activity
            │     └─ reuses compliance.js (PR#51), helpers.js, financialYear.js
            ├─ Client360Primitives.jsx (StatCard/Panel/SectionState/DataTable, a11y)
            └─ Client360Sections.jsx (9 sections)
                  └─ Documents section embeds existing DocumentManager
       Quick actions reuse existing modals: AddTaskModal (presetClient), OnboardingWizard
```

Key decisions:
- **Per-panel independence (spec G/H):** unlike the Service Applicability section (which fails
  the whole section closed on any read error), the workspace tracks each panel's `{rows,error}`
  independently — one panel failing never blanks the others, and failed loads surface as
  **critical** attention items (never presented as a clean/empty result).
- **Compliance counts from `compliance_calendar` via the PR#51 helpers** — one efficient
  uuid-keyed query, distinct overdue / due-today / due-soon, no parallel definition.
- **Access-denied UX:** the launcher is flag+role gated; the workspace additionally renders a
  safe "Restricted" notice (not a raw error) as defence-in-depth. This intentionally differs
  from the SA section's silent-null: a full page the user explicitly opened should explain
  itself rather than look broken.
- **Reads never select `*`** — explicit column projections verified against the schemas.

---

## 4. Exact files changed

**New (7):**
- `src/lib/client360.js` — pure logic (capabilities, header, summarizers, attention, activity, follow-up helpers).
- `src/services/client360Reads.js` — read-only service layer (lazy supabase + `*With(client)` factories).
- `src/hooks/useClient360Role.js` — role/capabilities hook.
- `src/hooks/useClient360Data.js` — concurrent per-panel data hook (request sequencer, refresh, no polling).
- `src/components/client360/Client360Primitives.jsx` — presentational atoms + state components (a11y).
- `src/components/client360/Client360Sections.jsx` — the nine tab sections.
- `src/components/client360/Client360Workspace.jsx` — orchestrator (header, summary cards, attention, tabs, quick actions).
- `tests/client360.test.js` — 32 tests (executable logic + service factories + static guards).

**Modified (3):**
- `src/components/Clients.jsx` — flag+role-gated 🧭 Client 360° launcher + render (surgical; existing flows untouched).
- `src/components/AddTaskModal.jsx` — optional, backward-compatible `presetClient` prop (default behaviour unchanged).
- `.env.example` — documented `VITE_CLIENT360_UI` flag (default disabled).

---

## 5. Reused vs new

**Reused (no duplication):** `compliance.js` (PR#51 verdict), `helpers.js` task helpers +
`todayLocal`, `financialYear.js`, `clientMaster.isAdminOrManagerRole`, `useEscapeKey`,
`DocumentManager`, `AddTaskModal`, `OnboardingWizard`, the lazy-supabase `*With(client)` service
pattern, and the OD-5 test conventions.

**New:** the pure `client360.js` classifiers (only genuinely new semantic = the first shared
**follow-up** helper, which lifts the inline `Tasks.jsx` `next_followup_date` predicate into a
tested helper with an added open-task guard — no conflict with any existing definition).

---

## 6. Roles & permissions applied
- Launcher + workspace view: **active Admin/Manager only** (flag `VITE_CLIENT360_UI==='true'`).
- Quick actions gated by capability: Create Task, Edit Client (Admin/Manager). Document upload
  uses the embedded `DocumentManager`'s existing flow.
- UI gating is UX-only; server RLS/RPCs remain the authority. No permission/RLS/policy change was made.

---

## 7. Tests added (32) — evidence
- **Capabilities (C360-1..2):** active Admin/Manager get all caps; null/inactive/other roles fail closed.
- **Header (C360-3..5):** null-safe; blanks→null; draft + corporate detection; FY computed.
- **Compliance (C360-6..9):** overdue/due-today/due-soon/completed/terminal via the PR#51 verdict;
  **Reviewed past-due counts as overdue**; every terminal status is never overdue; category grouping.
- **Tasks (C360-10):** open via `isTaskClosed`, overdue/due-today via the shared clock.
- **Follow-ups (C360-11..12):** pending/overdue/today/upcoming; closed tasks excluded.
- **Documents/Notices/Financials/Team (C360-13..16):** scope counts + hasNone; open/overdue-response/
  reply-filed-excluded/demand; module-aware financial terminal + focus FY; derived assignees + gap flag.
- **Activity (C360-17..18):** merges reliable sources, newest-first, limit, empty stays empty.
- **Attention (C360-19..22):** **a failed load becomes a critical item and suppresses false "clean"
  signals**; exceptions surface; all-clean → single info; severity sort; dateKey.
- **Service factories (C360-23..26):** correct table + uuid-vs-text client key; fail-closed on blank id
  (no query issued); no `*` projection.
- **Static guards (C360-27..32):** UI has no `supabase`/`.rpc(`/`.from(`/DML/`dangerouslySetInnerHTML`;
  fails closed with a safe restricted notice; accessible dialog + ESC; hook keeps prior data on refresh
  and never polls; read layer has no writes + lazy import; launcher flag+role gated; a11y states.

### Verification evidence
```
node --test   → tests 456 · pass 456 · fail 0   (baseline 424 + 32 new)
vite build    → ✓ built (132 modules), success
git diff --check → clean (no conflict markers / whitespace errors)
secret scan   → none
prohibited-file scan → none (.env.local / node_modules / dist / keys not staged)
```

---

## 8. Known limitations
- Ships dark behind `VITE_CLIENT360_UI`; requires enabling in an approved environment to be visible.
- Compliance counts read `compliance_calendar`; if the calendar is not populated for a client the
  compliance panels correctly show an empty (not failed) state.
- Team/access and Recent Activity are constrained by the backend gaps in §2.5.
- Runtime UI verification against live data is a manual step (see §10) — not executed here.

## 9. Backend dependencies discovered (not executed)
1. A client↔team / relationship-manager assignment field or table (to replace the derived view).
2. Resolution of `compliance_calendar.assigned_to` / `notice_tracker.assigned_to` UUIDs to names.
3. A unified per-client activity aggregation (general `audit_log` write path is deferred).
4. An optional required-document checklist model (to give true "missing document" semantics).

None of these were created, and none block the delivered read-first workspace.

## 10. Manual verification dependency
Enable `VITE_CLIENT360_UI=true` in an approved dev environment, open a client's detail modal,
launch 🧭 Client 360°, and confirm: summary counts match the Compliance module for that client,
per-panel loading/empty/error/refresh behave correctly, quick actions open and complete, and the
attention panel reflects real exceptions. Not performed in this repository-only package.

## 11. Governance confirmations
- Base = verified post-PR-#51 `sync/integration` `768e061` (not `53d14b7…`).
- **PR #48 was not modified, merged, rebased or continued.**
- No Supabase Dashboard/SQL/migration/RPC/RLS/permission/storage/user changes.
- No V1, no production, no deployment.
- No secrets/credentials/`node_modules`/`dist` committed.
- New PR is **Draft**, against `sync/integration`, and is **not** self-merged.

## 12. Recommended next package
Backend enablement of a **client↔team / relationship-manager assignment** (schema + RLS + a
read RPC), which would upgrade the workspace's Team & Access and Attention panels from derived
signals to authoritative data, and unlock a unified per-client activity feed.
