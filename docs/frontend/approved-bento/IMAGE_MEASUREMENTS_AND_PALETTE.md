# Image-Derived Measurements & Palette

**Design implementation only — not approved for merge or deploy.**

Source of truth: `YAV2_Approved_Bento_Reference.png`, opened and inspected.
**Dimensions: 1672 × 941 px** (PNG, colorType 2 / RGB). Values below were sampled
programmatically from the image (a small `node:zlib` PNG decoder) plus visual inspection.

## Region measurements

| Region | Measured | Implemented (`bento.css`) |
|---|---|---|
| Left sidebar width | right edge ~x259 (incl. divider) → ~250px | `--b-sidebar-w: 250px` |
| Header height | bottom edge ~y76 | `--b-header-h: 76px` |
| Outer content padding | ~20–24px | `--b-pad: 24px` (20px ≤1366) |
| Grid gaps | ~14–16px | `--b-gap: 16px` (14px ≤1366) |
| Card radius | ~10–12px | `--b-r: 12px`, `--b-r-sm: 10px` |
| KPI row | 6 equal cards | `grid-template-columns: repeat(6,1fr)` |
| Row 2 ratio | Attention : Operational : Team ≈ 294 : 652 : 394 | `0.78fr 1.72fr 1.04fr` |
| Row 3 ratio | Due : Recent : Quick (Quick widest) | `0.82fr 1.28fr 1.58fr` |
| Donut | ~160px, ~72% green arc | 160px SVG, `--b-green-donut` arc |

## Sampled palette (hex from image)

| Role | Sampled | Token |
|---|---|---|
| Canvas | `#F5F5F8` | `--b-canvas: #F5F6F9` |
| Card surface | `#FFFFFF` | `--b-surface: #FFFFFF` |
| Primary green (donut) | `#238431` | `--b-green-donut: #238431`, `--b-green: #1A8F43` |
| Active nav pale-green | `#F1F7F2` | `--b-green-active: #EEF6F0` |
| Attention tint | `#FEF7F7` | `--b-attention-tint: #FEF7F7` |
| Heading text | `#33394B`→deeper | `--b-text: #16213A` |
| Border | ~`#E5EAF0` | `--b-border: #E6EAF0` |

## Semantic KPI colours (from reference + brief)

| KPI | Colour | Token |
|---|---|---|
| Total Tasks | Blue | `#2563EB` |
| Pending | Amber/Orange | `#E58A0B` |
| Overdue | Red | `#EF4444` |
| Due Today | Green | `#1A8F43` |
| Active Clients | Blue | `#2563EB` |
| Compliance Due | Violet/Purple | `#7C3AED` |

Status bars: Completed green · In Progress amber · Not Started blue.
Team utilisation bars: strong-green (≥80) · green · amber (attention) · blue (lower).

## Typography

- **Geist** (self-hosted woff2) with `'Inter', -apple-system, 'Segoe UI'` fallback.
- Nav 14px medium · card title 15px semibold · KPI label 13px · KPI value 29px bold tabular
  · body 13.5px · secondary 11.5–12px · links 12.5px.
