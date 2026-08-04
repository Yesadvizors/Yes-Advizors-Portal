# Deferred Data Wiring (per panel)

**Design implementation only — not approved for merge or deploy.**

Phase 1 renders the approved dashboard from a **clearly-marked presentational adapter**
(`src/bento/mock/bentoMock.js`) — no live reads, no writes, no fabricated persistence. The
approved LAYOUT is authoritative; the sample numbers are not. This register maps each panel to
its real YAV2 data dependency so a later phase can wire live reads **behind the same flag**
without changing the layout.

| Panel | Real data dependency (existing, safe reads) | Phase-1 state |
|---|---|---|
| KPI: Total/Pending/Overdue/Due Today | firm dashboard aggregate (`v_firm_dashboard` / tasks reads) | presentational |
| KPI: Active Clients | clients read path (`clientMasterReads`) | presentational |
| KPI: Compliance Due | compliance reads (`lib/compliance`, `complianceRunner`) | presentational |
| Attention Needed | derived from overdue tasks + compliance + onboarding gaps | presentational |
| Operational Summary (donut/statuses) | task status aggregation | presentational |
| Operational Summary (Top Areas) | task grouping by service area | presentational |
| Team Workload | team reads + per-member task load | presentational |
| Due This Week | compliance/task due-date window | presentational |
| Recent Activity | audit log / activity feed (admin-gated) | presentational |
| Quick Actions | navigation intents only (no data) | static |

## Rules for the wiring phase
- Reuse **existing** safe frontend read paths; preserve authentication, capability controls,
  fail-closed behaviour, RBAC, and business rules.
- Where a panel has no reliable source, render an explicit **safe empty state** (not fabricated
  values). The approved layout must remain identical regardless of actual values.
- **No backend writes, no migrations, no schema changes.**
- Keep everything behind `VITE_APPROVED_BENTO_UI` until PJ approves a production release.
