# 2026 Design Principles — Yes Advizors Portal

**Design prototype only — not approved for portal-wide migration or merge.**

Direction: **premium, minimal, cool, information-dense but clear** — a modern finance/SaaS tool,
not accounting software.

1. **Restrained branding.** Yes Advizors shows up as a deep-navy sidebar and a *single* emerald
   accent (`#0E7C5A`). No rainbow of brand colours; colour is reserved for meaning (status/risk).
2. **Hierarchy over decoration.** Strong type scale (Geist, tabular numerals for figures),
   generous-but-compact spacing, thin `1px` borders, soft diffused shadows. No heavy gradients,
   no oversized cards, no emoji.
3. **Action-first.** Screens lead with what needs doing — overdue filings, deadlines, workload,
   risk — not vanity totals.
4. **Density with clarity.** Tables are compact and scannable (11–14px rows, uppercase micro
   headers, tabular numbers) yet never cramped.
5. **One system.** Every surface is built from the same tokens and a small component set
   (Button, Field, Card, Badge, Table, Toolbar, Icons). Consistency is the premium signal.
6. **Accessible by default.** Visible keyboard focus everywhere, `aria-current` on active nav,
   labelled controls, `prefers-reduced-motion` respected, status conveyed by text + colour (not
   colour alone).
7. **Responsive, real-world.** Tuned to look excellent at **1366px** desktop, degrade gracefully
   to a **tablet icon rail**, and reflow to a **mobile drawer + stacked cards**.
8. **Isolation & safety.** Purely presentational; dark by default; zero new dependencies; no
   backend/logic/data-write changes.

## Token summary

- **Colour:** navy `#0C1A2B` chrome · emerald `#0E7C5A` accent · cool slate neutral ramp ·
  semantic success/warning/danger/info with tinted surfaces.
- **Type:** Geist (self-hosted woff2) → system fallback; sizes 10.5–27px; tabular numerals.
- **Space:** 4px base (4/8/12/16/20/24/32/40). **Radius:** 6/9/13/16/full.
- **Shadow:** five soft elevations. **Motion:** 110ms / 160ms ease; disabled under reduced-motion.
- **Layout:** sidebar 234px (rail 66px) · topbar 58px · content max 1360px.
