# Dashboard Data Sources & Definitions

**Real read-only V2-dev wiring — not approved for merge or deploy.** The approved layout is
unchanged; only the data behind it is now real. All reads are SELECT-only via the authenticated
shared Supabase client (RLS-enforced). No writes, no rpc, no schema/auth/deploy changes.

Read service: `src/bento/data/dashboardReads.js` · Pure builders: `src/bento/data/dashboardModel.js`
· Hook: `src/bento/useBentoDashboard.js`. The authenticated app uses these; the design-only
standalone preview (`approved-bento.html`) uses demo data and never runs the reads (add `?live=1`
to exercise the real path).

## Data-source map

| Panel | Source(s) | Builder |
|---|---|---|
| KPI cards | `tasks`, `clients`, `v_firm_dashboard` | `buildKpis` |
| Attention Needed | `tasks` (overdue / due-today / follow-ups), `v_firm_dashboard` (overdue / due-in-7) | `buildAttention` |
| Operational Summary (donut + statuses) | `tasks` (status) | `buildOperational` |
| Operational Summary (Top Areas) | `v_firm_dashboard` (category, total) | `buildOperational` |
| Team Workload | `team` (active) + `tasks` (assignee match) | `buildTeamWorkload` |
| Due This Week | `tasks` (open, due in 0–7 days) | `buildDueThisWeek` |
| Recent Activity | **none available** → explicit empty state | `buildRecentActivity` |

Exact reads (identical pattern to the legacy firm dashboard):
`tasks(id,task_name,status,due_date,assigned_to,client_name,next_followup_date)` ·
`clients(client_id,status,is_draft,is_test_client)` ·
`v_firm_dashboard(category,total,completed,overdue,pending,due_in_7_days)` ·
`team(id,name,role) where is_active`.

## KPI definitions
Shared task-status truth from `src/helpers.js` (same as PR #65): closed = `Done | Cancelled |
Filed / Completed`; completed = `Done | Filed / Completed`; `open = not closed`.

| KPI | Definition |
|---|---|
| Total Tasks | count of all `tasks` |
| Pending | count of **open** tasks (not closed) |
| Overdue | open tasks with `due_date` < today (local) |
| Due Today | open tasks with `due_date` === today (local) |
| Active Clients | clients with `is_test_client !== true` AND `status = Active` AND `is_draft !== true` |
| Compliance Due | Σ `v_firm_dashboard(overdue + pending)` |

KPI **trend %** ("vs last week") is intentionally **omitted** in authenticated mode — there is no
historical snapshot source, and values must not be fabricated. Each card shows a factual sublabel
instead (e.g. "overdue + pending").

## Operational Summary classification
- **Completed** = completed statuses · **Not Started** = `Pending` · **In Progress** = open AND not
  `Pending` · **Cancelled** = closed AND not completed → **excluded** from the progress denominator.
- Denominator = Completed + In Progress + Not Started. `Overall Progress % = round(Completed /
  denominator × 100)` (0 when denominator is 0). Each status bar % is against the same denominator.
- **Top Areas** = `v_firm_dashboard` categories sorted by `total` desc; if > 5, top 4 + "Others"
  (summed).

## Team Workload calculation
- **Assigned open** = open tasks whose `assigned_to` matches the member (exact name or first-name
  match, mirroring `helpers.isMyTask`).
- **Utilisation %** = `min(100, round(assignedOpen / CAPACITY × 100))`, `CAPACITY = 15` open tasks
  ≈ 100% (documented heuristic — no per-member capacity field exists).
- **Bar tone**: ≥80 strong-green · ≥65 green · ≥50 amber · else blue. Top 6 by utilisation.

## Loading / empty / partial / error behaviour
- **Loading**: KPI values show a shimmer; panels show "Loading…". Card structure preserved.
- **Empty (real zero)**: KPIs show 0; Attention "All clear"; Due This Week "Nothing due in the next
  7 days"; Team "No active team members"; Top Areas "No compliance areas".
- **Error / any read failure**: **fails closed** — the hook sets `error`, a top banner offers Retry,
  and panels show "Couldn’t load — please retry." No zeros-that-look-real; **no raw Supabase error**
  is shown (raw error stays in the console only). This mirrors the legacy dashboard's rule that "a
  data outage must not look like a firm with nothing due."
- **Partial data**: the pure builders tolerate missing/null slices without throwing (e.g. a missing
  `v_firm_dashboard` yields Compliance Due = 0 and empty Top Areas). Because a failed *read* fails
  the whole load closed (above), the app never mixes real and stale data.

## Role / capability
Reads run through the same authenticated client as the rest of the portal; **RLS enforces
row/column access server-side**. No service-role or privileged key is used. Module-level gates
(e.g. Reports → Firm Overview admin gate) are unchanged.

## Deferred items
- **Recent Activity** — no safe non-admin activity/audit read source exists in V2 dev (Audit Log is
  admin-only, server-gated). Shows an explicit empty state until a safe source is added.
- **KPI week-over-week trends** — needs a historical snapshot source (not present).
- **Document-based attention signals** (missing/pending client documents) — deferred pending a safe
  aggregate read.
- **Compliance items in Due This Week** — `v_firm_dashboard` exposes 7-day counts, not dated rows,
  so the dated list uses tasks; compliance is reflected in KPIs + Attention.

## Authenticated data UAT checklist (PJ, logged-in session)
- [ ] KPI values match reality (Total/Pending/Overdue/Due Today/Active Clients/Compliance Due).
- [ ] Attention Needed lists real overdue/compliance/follow-up signals (or "All clear").
- [ ] Operational Summary donut + Completed/In Progress/Not Started reflect real task statuses.
- [ ] Top Areas match `v_firm_dashboard` categories.
- [ ] Team Workload shows real active members with plausible utilisation.
- [ ] Due This Week lists real tasks due within 7 days.
- [ ] Recent Activity shows the explicit empty state.
- [ ] No mock/sample values anywhere; no raw error text; a forced read failure shows the Retry banner.
- [ ] Flag off → legacy portal unchanged.
