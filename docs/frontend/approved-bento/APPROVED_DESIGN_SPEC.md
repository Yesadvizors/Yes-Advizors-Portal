# Approved Design Specification — Bento Workspace (Concept 6)

**Design implementation only — not approved for merge or deploy.** Governing visual
reference: `YAV2_Approved_Bento_Reference.png` (1672×941). The approved screenshot controls
every visual decision.

## Shell
- **Light left sidebar** (~250px): green check logo + "Yes Advizors" / "Team Portal"; nav order
  **Dashboard · Clients · Tasks · Documents · Compliance · Team · Reports · Templates ·
  Knowledge Hub · Settings**; active Dashboard = pale-green bg + green icon/text; professional
  line icons; **Need Help?** panel (question icon, copy, "Go to Help Center") anchored low. No
  dark background, no boxed nav groups, no emoji.
- **White top header** (~76px, subtle bottom border): green page pill (real page context),
  centred search ("Search clients, tasks, documents..."), bell with green count badge, avatar,
  user name + role, dropdown chevron.
- **Canvas**: very light neutral (`#F5F6F9`), ~24px padding, ~16px gaps.

## Dashboard
- **Row 1 — six KPI cards** (equal width): Total Tasks (blue), Pending (amber), Overdue (red),
  Due Today (green), Active Clients (blue), Compliance Due (purple). Coloured icon well, label,
  large tabular value, trend line.
- **Row 2** — Attention Needed (narrow, pale-red, 4 rows, red dots, chevrons) · **Operational
  Summary** (widest: "This Month" selector, 3-dot; donut 72% Completed; Completed/In Progress/
  Not Started bars; Top Areas: GST Compliance, Income Tax, ROC Filings, Audit & Assurance,
  Others) · Team Workload (5 members, avatar, name, role, %, utilisation bar).
- **Row 3** — Due This Week (date tiles, 3 items, red due chips, "See all due items") · Recent
  Activity (4 rows, coloured circular icons, timestamps) · Quick Actions (2×4: Add New Client,
  Create Task, Upload Document, Record Time, Compliance Calendar, Generate Report, Internal
  Note, Request Document).

## Surface treatment
Radius 10–12px · 1px cool-grey border · soft shadow (no floating/glass/gradients) · rounded
icon wells · aligned card headers.

## Feature flag
`VITE_APPROVED_BENTO_UI`, **dark by default** (`approvedBentoEnabled()`). Off → current portal
unchanged. On → approved Bento shell + dashboard render for the authenticated user.

## Scope (Phase 1)
Shell + header + Dashboard + reusable tokens/components + responsive + flag + tests + docs +
screenshots + Draft PR. Other modules are **not** redesigned (render a labelled placeholder in
the shell). See `DEFERRED_MODULE_ROLLOUT_PLAN.md`.
