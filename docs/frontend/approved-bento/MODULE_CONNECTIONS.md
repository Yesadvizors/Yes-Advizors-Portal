# Module Connections — approved shell → existing YAV2 modules

**Design/navigation connection only — not approved for merge or deploy.** No module business
logic was rewritten; existing components are **reused** (lazy-loaded), receiving their existing
`user`/`goTo` props, and keeping their own ErrorBoundary, Suspense, feature flags, role gates and
fail-closed states. Full internal redesign of each module remains **deferred**.

## Sidebar navigation

| Sidebar item | Existing component | Status | Notes |
|---|---|---|---|
| Dashboard | `bento/Dashboard` (approved) | Functional (presentational) | mock data; real-data wiring deferred |
| Clients | `components/Clients` | **Functional** | search, filters, onboarding, permissions preserved |
| Tasks | `components/Tasks` | **Functional** | creation, status, filters, assignment, capability gates preserved |
| Documents | `components/DocumentsHub` | **Functional** | document functions + access controls preserved |
| Compliance | `components/Compliance` | **Functional** | all compliance behaviour preserved |
| Team | `components/Team` | **Functional** | role/permission controls preserved |
| Reports | `components/AdminHome` (Firm Overview) | **Functional (admin-gated)** | mapped to the existing Firm Overview; non-admins see a restricted state |
| Templates | — | Coming later | no existing template module |
| Knowledge Hub | — | Coming later | no existing knowledge/help module |
| Settings | — | Coming later | no dedicated settings module exists (Audit Log / API Usage exist but are not a settings screen) |

Not surfaced in the approved nav (no matching approved entry): legacy **API Usage** (`Usage`) and
**Audit Log** (`AuditLog`). These remain available in the legacy shell (flag off).

## Quick Actions

| Action | Behaviour | Status |
|---|---|---|
| Add New Client | opens existing `OnboardingWizard` modal | **Connected** |
| Create Task | opens existing `AddTaskModal` modal | **Connected** |
| Upload Document | navigates to Documents (`DocumentsHub`, where upload lives) | **Connected** |
| Compliance Calendar | navigates to Compliance | **Connected** |
| Generate Report | navigates to Reports (Firm Overview) | **Connected (navigation)** |
| Record Time | explicit "coming later" notice | Unavailable — no existing function |
| Internal Note | explicit "coming later" notice | Unavailable — no existing function |
| Request Document | explicit "coming later" notice | Unavailable — no existing function |

Unavailable actions surface a clear, non-success toast ("… isn’t available yet — coming in a
later phase"). No action fabricates a successful result or invents business logic.

## Behaviour
- Clicking a sidebar item changes the active module; the active item keeps the approved pale-green
  treatment (`aria-current="page"`). Nav items are real `<button>`s → keyboard-activatable.
- The header **page pill updates** to the active module's name.
- Selection is **persisted across refresh** via `sessionStorage` (`yav2_bento_tab`) — deliberately
  not the URL hash, which Supabase auth uses.
- The mobile drawer **closes after selection**.
- No dead buttons for real modules; unavailable items are explicitly labelled.

## Safety
- All module components are **lazy-loaded** — Supabase is not imported until a module is opened, so
  the dark-flag bundle and the credential-free preview stay clean.
- Each module is wrapped in the existing `ErrorBoundary` + `Suspense`.
- Flag `VITE_APPROVED_BENTO_UI` remains **dark by default**; flag off → legacy portal unchanged.
- No backend/DB/SQL/migration/RLS/RPC/auth/deploy changes. No data writes added by this layer.

## Preview note
Screenshots were captured from the dev preview with **placeholder** Supabase env
(`https://placeholder.invalid`, fake anon key — process-scoped, never committed) so the real module
components mount inside the approved shell. With no live backend they show their genuine
loading/empty/fail-closed states, which confirms the shell correctly wraps each existing module.
In the authenticated app (real env + login) the modules render live.
