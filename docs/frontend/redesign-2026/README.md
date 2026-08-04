# YAV2 — 2026 Premium Design Prototype

**Design prototype only — not approved for portal-wide migration or merge.**

A feature-flagged (`VITE_REDESIGN_2026`, dark by default), design-only prototype of a 2026
premium finance/SaaS shell + three flagship pages (Dashboard, Client Master, Client 360),
driven by mock data. No backend/DB/auth/logic changes, no data writes, no new dependencies.
Built fresh from `sync/integration` @ `9a5810e` — **PR #48 is not rebased or modified**.

## Documents
1. [`00_REDESIGN_AUDIT.md`](00_REDESIGN_AUDIT.md) — audit of PR #48 + current baseline
2. [`01_REUSE_DECISION.md`](01_REUSE_DECISION.md) — what to keep vs discard from #48
3. [`02_DESIGN_PRINCIPLES.md`](02_DESIGN_PRINCIPLES.md) — the 2026 direction + tokens
4. [`03_PROTOTYPE_SPEC.md`](03_PROTOTYPE_SPEC.md) — architecture, components, pages, guardrails
5. [`04_RUN_INSTRUCTIONS.md`](04_RUN_INSTRUCTIONS.md) — how to run it locally
6. [`05_PJ_VISUAL_REVIEW_CHECKLIST.md`](05_PJ_VISUAL_REVIEW_CHECKLIST.md) — PJ sign-off checklist
7. [`06_SCREENSHOTS.md`](06_SCREENSHOTS.md) — captured views + reproduce steps

## Quick start
```bash
npm install && npm run dev
# open http://localhost:<port>/prototype.html   (and /responsive.html)
npm test        # 533 pass   ·   npm run build   # clean
```

**Prototype stops here awaiting PJ visual approval. No merge, no deploy.**
