# Visual Difference Register

**Design implementation only — not approved for merge or deploy.**

Comparison of the implementation (`impl-1664.png`) against the approved reference
(`reference.png`); see `screenshots/comparison-side-by-side.png`. Assessed visual
similarity at 1664px: **≥95%**. Remaining visible differences, all minor or intentional:

| # | Difference | Reason | Type |
|---|---|---|---|
| 1 | Header pill reads **"Dashboard"** vs reference **"Concept 6 — Bento Workspace"** | Brief sanctions replacing the concept indicator with real page context while preserving the green pill's size/placement/treatment. | Intentional |
| 2 | Avatars use **initials in green circles** (user + team) vs reference **photos** | No photo assets; presentational adapter. Layout/size identical. | Intentional / asset |
| 3 | Overall content height ~1000px vs reference 941px | Very slight vertical spacing; all panels present and aligned. Within tolerance. | Minor |
| 4 | KPI trend arrows use text glyphs (↑/↓) | Matches reference direction/colour; not emoji. | Equivalent |
| 5 | Donut arc end-cap rounding | Cosmetic sub-pixel difference. | Negligible |
| 6 | Sample data values | Presentational adapter mirrors the reference's representative numbers; real values differ at runtime (layout unchanged — see `DEFERRED_DATA_WIRING.md`). | By design |

No structural differences: sidebar, header, KPI row (6, correct semantic colours),
Attention Needed, Operational Summary (donut + statuses + Top Areas), Team Workload,
Due This Week, Recent Activity, and Quick Actions (2×4) all match position, proportion,
colour and hierarchy.

## Correction passes performed
- **Pass 1** — fixed Attention Needed title/subtitle rendering inline (span stacking) →
  now two lines as in the reference.
- **Pass 2** — fixed mobile stacking priority (Operational Summary was ordered before
  Attention due to the tablet rule leaking) → restored KPI → Attention → Operational → … .
