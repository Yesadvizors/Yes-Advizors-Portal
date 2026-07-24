# G-12 — Per-tab runtime: schema-independent static verification  [DONE-STATIC]

**Gap:** G-12 (App/runtime). **Acceptance:** Package A §A (per-tab SPA).
**Scope of this file:** the **compile / import / mount** prerequisite of §A — proven **without** a live
deployment or credentials. The **live** per-tab render (valid data, no console/DB/42703 error, V2 target) is
a separate, credential-gated step recorded in `PER_TAB_RUNTIME_TEMPLATE.md` — **BLOCKED-CREDS**.

- **Commit:** `1286a290f5d4287e70c6853d2eb3bad16256e276` · **Date:** 2026-07-24
- **Toolchain:** Node `v24.18.0`, Vite `5.4.21`. **No live system touched.**

## V1 — Production build succeeds from the governing baseline
Command: `npm ci && npm run build`
```
✓ 125 modules transformed.
dist/index.html                       1.02 kB
dist/assets/pdf.worker-iVMkNdeB.mjs   2,187.56 kB
dist/assets/index-Cf66eiUE.css        0.55 kB
dist/assets/react-core-cxkclgJA.js    140.86 kB │ gzip:  45.26 kB
dist/assets/supabase-CqTy1rml.js      208.06 kB │ gzip:  54.16 kB
dist/assets/index-Ch35aOGu.js         280.10 kB │ gzip:  74.30 kB
dist/assets/pdf-SzFs2cZd.js           426.57 kB │ gzip: 126.90 kB
✓ built in 2.60s
```
**Result:** all 125 modules transform. A production build resolving 125 modules is proof that **no import is
broken and no mounted component is missing** — the static precondition for every tab to mount.

## V2 — All tests green (322 pre-existing + 7 new T2 guards)
Command: `npm test` (`node --test`)
```
ℹ tests 329
ℹ pass 329
ℹ fail 0
```

## V3 — Tab → component wiring is complete (source anchors)
Every SPA tab id in `src/App.jsx` has (a) an eager import and (b) a mount branch to its component.
Locked by `tests/appShellRuntime.test.js` R1–R2.

| Tab id | Component | Import | Mount branch |
|---|---|---|---|
| `home` (admin-only) | `AdminHome` | `App.jsx:4` | `App.jsx:155` |
| `dashboard` | `Dashboard` | `App.jsx:5` | `App.jsx:156` |
| `tasks` | `Tasks` | `App.jsx:6` | `App.jsx:157` |
| `clients` | `Clients` | `App.jsx:7` | `App.jsx:158` |
| `compliance` | `Compliance` | `App.jsx:8` | `App.jsx:159` |
| `documents` | `DocumentsHub` | `App.jsx:12` | `App.jsx:160` |
| `team` | `Team` | `App.jsx:9` | `App.jsx:161` |
| `usage` | `Usage` | `App.jsx:13` | `App.jsx:162` |
| `auditlog` (admin-only) | `AuditLog` | `App.jsx:14` | `App.jsx:164` |
| `ChatAgent` (always-mounted) | `ChatAgent` | `App.jsx:11` | `App.jsx:168` |

## V4 — Documented `due_soon` 42703 defect cannot regress in source
The removed `v_firm_dashboard.due_soon` column (BASELINE §2) is absent from every frontend select:
- `Dashboard.jsx:18` selects explicit `…,due_in_7_days` (correct).
- `Compliance.jsx:1260` selects `*` on `v_firm_dashboard` (no column list to drift).
- The `due_soon` reference at `Compliance.jsx:1174` reads `v_client_compliance_summary.due_soon`, a column
  that legitimately exists (`supabase/migrations/0009_views.sql:83`) — **not** the firm dashboard.

Locked by `tests/appShellRuntime.test.js` R6 (fails if any `v_firm_dashboard` select requests `due_soon`).

## What this file does NOT claim
- It does **not** assert any tab renders correctly against the **live V2 database** — that is BLOCKED-CREDS.
- It does **not** verify data shape/columns returned at runtime — that depends on G-03 (T3) / G-16 (T1).
- It does **not** satisfy any security gate (S2–S5).

## Remaining for G-12 (BLOCKED-CREDS)
Per-tab live render on the governing deployment
(`…git-4c8764-yes-advizors-projects.vercel.app`, `d95912f`), with screenshot + console + Network
(`Sb-Project-Ref: ogjrwemjefvccpyjwxuo`). Template: `PER_TAB_RUNTIME_TEMPLATE.md`. `dashboard` tab already
**[V]** via I-26. Requires PJ-authorised credentials — not performed in this block.
