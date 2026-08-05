# PJ Visual-Review Checklist — Approved Bento Dashboard

**Design implementation only — not approved for merge or deploy.**

Preview: `npm run dev` → `http://localhost:<port>/approved-bento.html`.
Compare against `screenshots/comparison-side-by-side.png`.

## Fidelity to approved reference
- [ ] Overall composition matches `YAV2_Approved_Bento_Reference.png` (≥95%).
- [ ] Light left sidebar; logo + Team Portal; nav order Dashboard→Settings; Dashboard active pale
      green; Need Help panel at bottom.
- [ ] White header; green page pill; centred search; bell w/ green badge; avatar + name + role + chevron.
- [ ] Six KPI cards with the correct semantic colours (blue/amber/red/green/blue/purple).
- [ ] Row 2: Attention Needed (pale red) · Operational Summary (donut 72% + statuses + Top Areas)
      · Team Workload — in that order and proportion.
- [ ] Row 3: Due This Week · Recent Activity · Quick Actions (2×4) — in that order and proportion.
- [ ] Green/white/soft-neutral palette; no dark nav, no emoji, no gradients/glass, no oversized cards.

## Responsive
- [ ] 1366px desktop: 6 KPIs one row; row 2 & 3 three columns.
- [ ] Tablet: sidebar icon rail; KPIs 3+3; bento two columns.
- [ ] Mobile: hamburger drawer; cards stack KPI → Attention → Operational → Team → Due → Recent → Quick.

## Accessibility
- [ ] Visible keyboard focus on controls; nav exposes `aria-current`; icons `aria-hidden`.

## Safety
- [ ] Flag unset → current portal unchanged (dark by default).
- [ ] `npm test` green (530); `npm run build` clean; zero new dependencies.

## Known intentional differences (see VISUAL_DIFFERENCE_REGISTER.md)
- Page pill shows real page context ("Dashboard") instead of the mock "Concept 6 — Bento Workspace".
- Avatars use initials (no photo assets).
- Panel values are presentational (real-data wiring deferred — see DEFERRED_DATA_WIRING.md).

---
### Decisions requested
1. Approve this visual implementation as the production dashboard direction? Y / N
2. Proceed to Phase 2 (wire real data behind the flag) and the module rollout plan?

**Stops here awaiting PJ visual approval. No merge, no deploy, no Ready.**
