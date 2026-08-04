# Reuse Decision — what to keep vs discard from PR #48

**Design prototype only — not approved for portal-wide migration or merge.**

The prototype does **not** import any code from PR #48. #48 lives on a different branch and
carries merge risk. Instead, its *good ideas* were **re-derived** cleanly into the new, isolated
`rd-`-prefixed system. This table records the explicit call.

## Reuse (re-derived, re-branded)

| From #48 | Decision | How it appears in the prototype |
|---|---|---|
| Token architecture (colour/space/radius/shadow/motion/z) | **Reuse pattern** | `src/styles/redesign-2026.css`, scoped under `.rd-app`, re-branded to YA navy/green |
| Spacing scale (4px base), radius, diffused shadows | **Reuse** | Same scales, `--rd-*` names |
| Component-class taxonomy (btn/card/badge/table/field/filter/state) | **Reuse pattern** | `rd-btn`, `rd-card`, `rd-badge`, `rd-table`, `rd-field`, `rd-toolbar`, `rd-state` |
| Shell layout (sidebar + topbar + max-width content) | **Reuse pattern** | `RedesignShell.jsx` |
| Collapsible sidebar + mobile drawer + scrim | **Reuse pattern** | Plus a **new** tablet icon-rail tier |
| Global `:focus-visible` ring | **Reuse + strengthen** | Ring + `prefers-reduced-motion` support |
| Responsive breakpoints | **Reuse + extend** | 1120 (rail) · 860 (drawer) · 560 (stacked cards) |

## Discard / replace

| From #48 | Decision | Replacement |
|---|---|---|
| **Indigo #4F46E5 / Teal palette** | **Discard** | Restrained YA **navy `#0C1A2B` + emerald `#0E7C5A`** |
| **Emoji icons** (nav + tiles) | **Discard** | **Inline SVG** Lucide-style set (`icons.jsx`, zero deps) |
| **System font stack** | **Discard** | **Self-hosted Geist** (woff2) + system fallback |
| **6-KPI decorative dashboard row** | **Discard** | **Action-first** dashboard: risk, deadlines, workload |
| **Refactor of ~28 live components** | **Discard entirely** | New **mock-driven** prototype pages; live pages untouched |
| `ds-`-prefixed global classes | **Discard** | `rd-`-prefixed, `.rd-app`-scoped (no global leakage) |

## Why not just rebase #48?

Because #48's value is ~700 lines of CSS/tokens, but its cost is a refactor of behavioural files
that have since diverged heavily on `sync/integration`. Re-deriving the CSS is cheap and safe;
rebasing the refactor is expensive and risky. This package takes the cheap, safe half only.
