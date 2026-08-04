# PJ Visual-Review Checklist

**Design prototype only — not approved for portal-wide migration or merge.**

Run `npm run dev` → open `http://localhost:<port>/prototype.html` (see `04_RUN_INSTRUCTIONS.md`).

## Overall direction
- [ ] Reads as a **2026 premium finance/SaaS** tool, not the current accounting-style portal.
- [ ] Branding is **restrained** — navy chrome + a single emerald accent; no colour clutter.
- [ ] **No emoji**, no thick borders, no heavy gradients, no oversized cards.
- [ ] Strong hierarchy; compact-but-clear spacing; Geist typography renders.

## Shell
- [ ] Sidebar groups (Workspace / Clients / Compliance / Firm) and SVG icons look right.
- [ ] **Collapse** button toggles the icon rail; active item is clearly indicated.
- [ ] Top header (title, search, FY chip, notifications, user, sign-out) feels premium.

## Dashboard
- [ ] Leads with **actionable** info: overdue, due-7, open, active + deadlines + workload + attention.
- [ ] No vanity/decorative metric row.

## Client Master
- [ ] A **full-page workspace** (not an oversized popup).
- [ ] Search + filter chips (All / Active / Onboarding / High-risk) filter the table live.
- [ ] Table is **modern, compact, scannable**; status/risk badges read clearly.

## Client 360 (flagship)
- [ ] Feels like a **command centre**: hero identity band + health score + summary KPIs.
- [ ] Compliance calendar + open tasks + contact/documents/activity rail are well-balanced.

## Responsive (open `responsive.html`)
- [ ] **Tablet 960px** → auto **icon rail**.
- [ ] **Mobile 390px** → **hamburger drawer**, KPIs 2×2, tables become **stacked cards**.
- [ ] Looks excellent at **1366px** desktop.

## Accessibility
- [ ] Tab through the shell — **focus ring** is clearly visible on every control.
- [ ] Active nav announces via `aria-current`; controls are labelled.

## Safety (confirm nothing operational changed)
- [ ] With the flag **unset**, the real portal renders exactly as today.
- [ ] `npm test` green (533); `npm run build` clean; no new dependencies.

---

### Decisions requested from PJ
1. Approve the **visual direction** (palette, type, density, shell) for wider rollout? Y / N
2. Any changes to **Dashboard / Client Master / Client 360** before productionising?
3. If approved, should the next package **productionise page-by-page behind the flag** (re-wiring
   real data one screen at a time), rather than a big-bang migration?

**Prototype stops here awaiting your visual approval. No merge, no deploy.**
