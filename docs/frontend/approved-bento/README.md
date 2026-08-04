# YAV2 — Approved "Bento Workspace" Dashboard (Concept 6)

**Design implementation only — not approved for portal-wide migration, merge, or deploy.**

Pixel-faithful (≥95%) implementation of the PJ-approved reference
`YAV2_Approved_Bento_Reference.png` (1672×941), built fresh from `sync/integration` @ `9a5810e`
and gated behind `VITE_APPROVED_BENTO_UI` (dark by default). Presentational (mock) data; no
backend/DB/auth/deploy changes; zero new dependencies.

## Documents
- [`APPROVED_DESIGN_SPEC.md`](APPROVED_DESIGN_SPEC.md)
- [`IMAGE_MEASUREMENTS_AND_PALETTE.md`](IMAGE_MEASUREMENTS_AND_PALETTE.md)
- [`PHASE1_IMPLEMENTATION_REPORT.md`](PHASE1_IMPLEMENTATION_REPORT.md)
- [`VISUAL_DIFFERENCE_REGISTER.md`](VISUAL_DIFFERENCE_REGISTER.md)
- [`TESTS_AND_BUILD_EVIDENCE.md`](TESTS_AND_BUILD_EVIDENCE.md)
- [`RUN_INSTRUCTIONS.md`](RUN_INSTRUCTIONS.md)
- [`PJ_VISUAL_REVIEW_CHECKLIST.md`](PJ_VISUAL_REVIEW_CHECKLIST.md)
- [`DEFERRED_DATA_WIRING.md`](DEFERRED_DATA_WIRING.md)
- [`DEFERRED_MODULE_ROLLOUT_PLAN.md`](DEFERRED_MODULE_ROLLOUT_PLAN.md)

## Screenshots (`screenshots/`)
`reference.png` · `impl-1664.png` · `impl-1366.png` · `impl-tablet.png` · `impl-mobile.png` ·
`comparison-side-by-side.png`

## Quick start
```bash
npm install && npm run dev
# open http://localhost:<port>/approved-bento.html
npm test   # 530 pass   ·   npm run build   # clean
```

**Stops for PJ visual approval. No merge, no deploy, no Ready.**
