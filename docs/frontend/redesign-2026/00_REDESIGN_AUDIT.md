# YAV2 2026 Redesign — Audit (PR #48 + current baseline)

**Status:** Design prototype only — not approved for portal-wide migration or merge.
**Prepared:** 2026-08-04 · **Baseline:** `sync/integration` @ `9a5810e` · **Audited PR:** #48 @ `fc0dd32`

---

## 1. What was inspected

| Artefact | Location | Notes |
|---|---|---|
| Current portal | `sync/integration` @ `9a5810e` | React 18 + Vite 5, 4 runtime deps, inline-styled shell |
| PR #48 (paused) | `feature/yav2-professional-redesign-launch` @ `fc0dd32` | +2706 / −1449 across 34 files |
| #48 design system | `src/styles/design-system.css` (557 lines) | token + component-class system |
| #48 UI primitives | `src/components/ui/` (Modal, Toast, primitives, states) | shared React components |
| #48 report | `docs/frontend/PROFESSIONAL_REDESIGN_REPORT.md` | author's own writeup |
| #48 showcase | `docs/frontend/redesign-evidence/showcase.html` | static design evidence page |

PR #48 was **run locally** (Vite dev, port 5175). Its **login** and **static showcase** were
captured. Authenticated screens (Dashboard/Client Master/360 with live data) could **not** be
captured: they require Supabase credentials, which are out of scope for this design-only package
(credentials are prohibited). See `06_SCREENSHOTS.md`.

## 2. Current baseline — design assessment

- **Shell:** 100% inline-styled in `App.jsx` — dark navy top bar + a horizontal white tab strip.
  No sidebar. **Emoji** nav icons (📊 ✅ 👥 …). Reads as legacy accounting software.
- **Design language:** ~15 CSS custom properties in `:root` + a single `.card` class. Everything
  else is per-element inline styles → inconsistent spacing, type scale, and states.
- **Tables/cards:** functional but dense and un-tokenised; no responsive table strategy.
- **Strengths to preserve:** the app is lean (no UI deps), auth/runtime is hardened, and the
  information architecture (9 tabs) is sound.

## 3. PR #48 — findings by category

### Reusable design work (strong)
- A genuinely good **token architecture**: colour ramp, spacing (4px base), radius, diffused
  shadows, motion, z-index, layout metrics. Directly worth re-deriving.
- A complete **component-class taxonomy**: buttons, fields, badges, tables, filter bar, modal,
  states, toasts — coherent and well-named.
- A sensible **shell layout**: sticky sidebar + topbar + max-width content, with collapse + a
  mobile overlay drawer and breakpoints at 900/560px.
- Accessibility instincts: a global `:focus-visible` ring.

### Stale / off-brief components (discard or rebrand)
- **Palette is off-brand:** #48 adopted an **Indigo (#4F46E5) / Teal** system, *not* Yes Advizors
  navy/green. Confirmed live on the #48 login (violet mark) and showcase.
- **Emoji icons** throughout the nav and metric tiles — conflicts with the premium direction.
- **System font stack**, not a premium typeface.
- **Decorative 6-KPI row** on the showcase dashboard — vanity metrics over action-first content.

### Functional incompatibilities / merge-conflict risk (the reason it is paused)
- #48 **refactored ~28 live components** (Compliance, Tasks, AuditLog, OnboardingWizard,
  MarkFiledModal, WorkDocuments, …) from inline styles onto the new shared primitives.
- Since #48 was cut, `sync/integration` has absorbed **heavy operational-hardening** work across
  those same files (compliance reliability, client-360 workspace, lifecycle, readiness closures).
- Result: **high three-way merge-conflict risk** and **regression risk** in operational logic if
  #48 were rebased/merged. A visual refresh should **not** be entangled with behavioural files.

### Visual / accessibility / responsive weaknesses
- Visual: heavier borders and larger cards than a 2026 premium finance tool; emoji.
- Accessibility: focus ring present, but colour-on-colour contrast of the indigo-on-navy active
  state is borderline; emoji as sole status carriers is not ideal.
- Responsive: one breakpoint jump (expanded → drawer); **no intermediate tablet icon-rail**.

## 4. Conclusion → approach for the prototype

Re-derive #48's **good bones** (token + component architecture, shell structure, breakpoints)
into a **fresh, isolated, flag-gated** system that is **re-branded to restrained YA navy/green**,
uses **self-hosted Geist**, an **inline-SVG icon set**, and **touches zero live components**.
Build **new mock-driven prototype pages** rather than re-wiring operational screens — eliminating
the merge/regression risk that paused #48.

See `01_REUSE_DECISION.md` for the line-by-line reuse/discard call.
