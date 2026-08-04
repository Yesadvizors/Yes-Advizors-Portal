# YAV2 — 2026 Dashboard Visual Concepts (design sampling)

**Design samples only — for PJ concept selection. No approval, no build, no merge, no deploy.**

Commissioned after PR #66's emerald/navy direction was **not approved** (see that PR's
`07_DECISION_RECORD.md`). Four genuinely different premium directions for the **same Dashboard
screen**, with **identical data** (one shared markup source: `samples-dashboard.js`). Only the
theme tokens — colour, typography, treatment — differ.

## Preview

```bash
cd "D:\Claude\Claude Code\YAV2-2026-Design-Samples\docs\frontend\redesign-2026-samples"
node serve.mjs            # serves this folder at http://localhost:8080
# open http://localhost:8080/            → launcher (all four)
#      http://localhost:8080/01-luxury-light.html
#      http://localhost:8080/02-executive-blue.html
#      http://localhost:8080/03-modern-minimal.html
#      http://localhost:8080/04-contemporary-colour.html
```

Each concept renders in a fixed **1366px** shell. Pure static HTML/CSS + one vanilla JS file —
no framework, no build, no dependencies, no network.

## The four concepts

### 1 · Luxury Light
- **Palette:** ivory `#FBF9F4` bg · white surfaces · **muted gold `#A67C2E`** accent · charcoal
  `#23201B` text · warm sand borders `#EAE2D3`. Light sidebar.
- **Type:** serif headings (**Georgia**; production: *Fraunces* / *Playfair Display*) + humanist
  sans body (*Inter*). Weight 600, tight tracking.
- **Feel:** elegant, airy, understated wealth — boutique advisory firm.

### 2 · Executive Blue
- **Palette:** soft blue-gray `#F3F6FB` bg · white surfaces · **royal blue `#1D4ED8`** accent ·
  **deep-blue `#0F2A5E` sidebar** · ink `#10233F` text.
- **Type:** clean sans throughout (**Segoe UI**; production: *Inter*). Weight 700.
- **Feel:** institutional, trustworthy, banking-grade.

### 3 · Modern Minimal
- **Palette:** white bg · soft gray `#F5F5F5` · **graphite `#141414` as the only accent** (colour
  reserved strictly for status). Thin borders, **flat — no shadows**. Light sidebar.
- **Type:** heavy sans display headings (weight 800, tight −0.9px), generous whitespace,
  near-square radius `4px`.
- **Feel:** editorial, confident, modern consulting / SaaS.

### 4 · Contemporary Colour
- **Palette:** light lavender-neutral `#FAF7FB` bg · white surfaces · **plum `#7A2E52`** accent ·
  **aubergine `#2A1826` sidebar** · soft shadows, **rounded `12–16px`**.
- **Type:** modern sans (**Segoe UI**; production: *Inter* / *Manrope*), weight 700.
- **Feel:** distinctive and warm yet professional — memorable brand colour.

## Exact differences

| Dimension | 1 Luxury Light | 2 Executive Blue | 3 Modern Minimal | 4 Contemporary Colour |
|---|---|---|---|---|
| Background | Warm ivory | Soft blue-gray | Pure white | Light lavender-neutral |
| Sidebar | Light (ivory) | **Dark deep-blue** | Light (white) | **Dark aubergine** |
| Accent | Muted gold | Royal blue | Graphite (near-mono) | Plum / burgundy |
| Headings | **Serif** | Sans 700 | Sans **800** display | Sans 700 |
| Corners | 8 / 12px | 8 / 12px | **4 / 6px (square)** | **12 / 16px (round)** |
| Elevation | Very subtle | Subtle | **Flat (borders only)** | **Soft shadows** |
| Character | Elegant / boutique | Institutional | Editorial / restrained | Distinctive / warm |

## Selection

PJ picks one concept. The chosen direction's tokens then become the basis for the *next*
package (re-theming the prototype and productionising page-by-page behind a flag). **No final
redesign begins until PJ selects.**
