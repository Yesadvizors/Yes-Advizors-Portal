# Screenshots — captured evidence & how to reproduce

**Design prototype only — not approved for portal-wide migration or merge.**

Screenshots were captured live via browser automation during the build session and shown
inline to PJ in that session (the reviewer sees the rendered pixels there). This file records
**what** was captured and the **exact steps to regenerate** each, so any reviewer can reproduce
them on demand. (The automation stores images in the extension, not at a repo path; to persist
copies, use your OS screenshot tool while following the steps below, or re-run the session.)

## New 2026 prototype

Start: `npm run dev` → browser at the printed port.

| # | View | URL / steps | Width | What to look for |
|---|---|---|---|---|
| 1 | **Dashboard** | `/prototype.html` | 1366 | Action KPIs, deadlines table, workload bars, attention panel |
| 2 | **Client Master** | `/prototype.html` → sidebar “Client Master” | 1366 | Full-page workspace, filter chips, compact client table |
| 3 | **Client 360** | `/prototype.html` → sidebar “Client 360” | 1366 | Hero band, health score, summary KPIs, tabs, calendar + right rail |
| 4 | **Responsive** | `/responsive.html` | — | Tablet 960px **icon rail** + mobile 390px **drawer / stacked cards** |

Observed at capture (2026-08-04): all four rendered as intended — restrained navy/emerald,
Geist type, SVG icons, no emoji; mobile table correctly collapses to stacked cards; tablet
sidebar auto-collapses to the icon rail.

## PR #48 (paused) — runtime evidence

Start: from the `YAV2-Professional-Redesign-Launch` worktree, `npm run dev` (port 5175 in session).

| # | View | URL / steps | Notes |
|---|---|---|---|
| 5 | #48 **login** | `/` | Dark theme, **indigo/violet** brand mark — confirms off-brand palette |
| 6 | #48 **design showcase** | `/docs/frontend/redesign-evidence/showcase.html` | Indigo primary, **emoji** nav icons, **6-KPI decorative** dashboard row |

**Not captured:** #48 authenticated screens (Dashboard/Client Master/360 with live data) — they
require Supabase credentials, which are prohibited for this design-only package. The static
showcase is #48's own design-evidence surface and stands in for its shell/components.

## Comparison takeaway

| Aspect | PR #48 | 2026 prototype |
|---|---|---|
| Palette | Indigo / Teal (off-brand) | **YA navy + emerald** |
| Icons | Emoji | **Inline SVG** |
| Font | System stack | **Self-hosted Geist** |
| Dashboard | 6 decorative KPIs | **Action-first** (risk/deadlines/workload) |
| Live components | Refactored ~28 (merge risk) | **Untouched** (mock pages) |
| Tablet | none (expanded→drawer) | **Auto icon rail** |
