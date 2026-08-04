# Tests & Build Evidence

**Design implementation only — not approved for merge or deploy.**

## Tests (`npm test` → `node --test`)
```
ℹ tests 530
ℹ pass  530
ℹ fail  0
```
521 baseline (unchanged) + **9 new** guards in `tests/approvedBentoUI.test.js`:
1. Flag dark by default (only `'true'` enables).
2. Legacy `App.jsx` preserved; guard is lazy + gated + short-circuits before the legacy tabs.
3. Presentational only — no Supabase, no writes, no `fetch`, no `dangerouslySetInnerHTML`.
4. Zero new dependencies (no tailwind/radix/lucide/chart libs/geist-pkg).
5. Bento CSS fully `.bento`/`b-` scoped — no global element selectors.
6. No emoji; SVG icons `currentColor` + `aria-hidden`; a11y hooks (aria-label, aria-current,
   `:focus-visible`, `prefers-reduced-motion`).
7. Approved structure — 6 KPIs w/ correct semantic tones, exact 10-item nav order, 4 attention
   rows, 5 team members, 3 due items, 4 activity rows, 8 quick actions, donut 72%, 5 top areas.
8. Dashboard composes all 7 panels in order.

## Build (`npm run build`)
```
dist/assets/Geist-*.woff2      56.80 kB
dist/assets/BentoApp-*.css     15.84 kB │ gzip 3.55 kB   ← separate lazy chunk
dist/assets/BentoApp-*.js      20.93 kB │ gzip 5.58 kB   ← separate lazy chunk
dist/assets/index-*.js        333.89 kB │ gzip 90.25 kB  ← main bundle (≈ baseline)
✓ built in ~3s
```
- `BentoApp` is a **separate lazy chunk** — absent from the default bundle while the flag is dark.
- `approved-bento.html` is **excluded** from `dist/` (only `index.html` is a build input).

## Other gates
- `git diff --check` → clean (no whitespace errors).
- Prohibited-path scan (migrations/`.sql`/`.env`/rls/supabase/functions) → **none**.
- Secret scan on added lines (JWT/service_role/api-key/private-key/AWS) → **none**.
- Runtime (flag ON): the dashboard renders fully in headless captures at 1664/1366/tablet/mobile
  with no Vite error overlay and no missing content → no console-breaking errors in the bento path.
- Flag-OFF regression: `App.jsx` diff is purely additive + guarded (import + one guarded
  early-return); with the flag unset the identical legacy path runs. (A flag-off runtime login
  shot needs a Supabase `.env`, absent in this fresh worktree — an environment artifact, not a
  regression.)
