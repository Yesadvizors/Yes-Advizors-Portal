# Prototype Specification

**Design prototype only — not approved for portal-wide migration or merge.**

## Scope

A feature-flagged, design-only prototype demonstrating a 2026 shell + three flagship pages,
driven entirely by mock data. It changes **no** backend, database, auth, business logic, or live
operational component, and adds **no** dependencies.

## Feature flag

- `VITE_REDESIGN_2026` — **dark by default** (`src/redesign/flag.js`, `redesignEnabled()`), only
  the exact string `'true'` enables it. Mirrors the repo's `VITE_P5_UI` / `VITE_CLIENT360_UI`
  convention.
- Wiring: `App.jsx` returns `<RedesignApp>` **after** auth when the flag is on; otherwise the
  legacy shell renders unchanged. `RedesignApp` is `React.lazy` so its code/CSS form a **separate
  chunk** absent from the default bundle when dark.

## Architecture

```
src/redesign/
  flag.js                    redesignEnabled(flagValue)  — dark by default
  RedesignApp.jsx            nav config + routing + out-of-scope placeholder
  RedesignShell.jsx          sidebar (collapsible/rail/drawer) + premium topbar
  previewEntry.jsx           DEV-ONLY standalone mount (mock user) for /prototype.html
  mock/mockData.js           representative fixtures (no network, no writes)
  pages/
    DashboardPrototype.jsx   action-first: risk, deadlines, workload, attention
    ClientMasterPrototype.jsx full-page workspace: search + filter chips + table
    Client360Prototype.jsx   flagship command-centre: hero, KPIs, tabs, calendar, rail
src/components/ui/redesign/  Button, Field, Card+MetricCard, Badge, Table, Toolbar, icons
src/styles/redesign-2026.css design tokens + component classes (.rd-app scoped, rd- prefixed)
src/styles/fonts/Geist.woff2 self-hosted variable font
prototype.html               DEV-ONLY preview entry (not a production build input)
responsive.html              DEV-ONLY tablet+mobile iframe gallery
```

## Components (presentational)

| Component | Purpose |
|---|---|
| `Button` | primary / secondary / ghost / danger; sm/lg; icon-only |
| `Field` + `Input`/`Select`/`Textarea` | labelled control with hint/error + `aria-invalid` |
| `Card` / `MetricCard` | surfaces + KPI tile (accent, trend) |
| `Badge` | status pill (success/warning/danger/info/neutral) with optional dot |
| `Table` | compact, responsive → stacked cards under 560px (`data-label`) |
| `Toolbar` / `SearchInput` / `FilterChip` | filter bar |
| `icons.jsx` | ~30 inline SVG icons, `currentColor`, `aria-hidden` |

## Pages

- **Dashboard** — greeting + 4 action KPIs (overdue/due-7/open/active) → *upcoming deadlines*
  table + *team workload* (capacity bars) on the left, *needs-attention* panel on the right.
- **Client Master** — full-page workspace: header + import/add actions, toolbar (search + All /
  Active / Onboarding / High-risk chips), compact client table (entity, PAN/GSTIN, services,
  status, risk, open, drill chevron). **Not** a modal.
- **Client 360** *(flagship)* — breadcrumb → hero identity band (mark, name, risk, PAN/GSTIN/CIN,
  health score, actions) → 4 summary KPIs → in-page tabs → **compliance calendar** + **open
  tasks** (left) and **primary contact / recent documents / activity timeline** (right rail).

## Responsive behaviour

| Width | Sidebar | Layout |
|---|---|---|
| ≥ 1121px | Expanded (collapsible by button) | Two-column 360 grid |
| 861–1120px | **Auto icon rail** | 360 grid collapses at ≤1024 |
| ≤ 860px | **Overlay drawer + hamburger + scrim** | Single column |
| ≤ 560px | Drawer | KPIs 2×2; **tables → stacked cards** |

## Guardrails (enforced by tests — `tests/redesign2026Prototype.test.js`)

1. Flag dark by default. 2. Legacy `App.jsx` preserved; guard is lazy + gated + short-circuits.
3. No Supabase import, no writes, no `fetch`, no `dangerouslySetInnerHTML` anywhere in redesign.
4. Zero new dependencies (no tailwind/radix/lucide/geist-pkg/…). 5. CSS fully `.rd-`-scoped —
no global element selectors. 6. No emoji; SVG icons are `aria-hidden` + `currentColor`; a11y hooks
present. 7. The three flagship pages are wired.
