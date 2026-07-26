# G-11 — Execution / Source Closeout (Option A)

**Status:** ✅ **G-11 / R-10 — CLOSED PASS.**
**Remediation:** Option A (PJ-approved) — remove the broken `v_team_workload` query and the always-empty "Team Workload" panel from the admin Firm Dashboard; **no** new view / migration / RPC / Supabase object.
**Governing source commit:** `1a0f4bca78cbd2d6d8a659009a370e2784f17589` (branch `sync/integration`).
**Design of record:** `supabase/verification/remediation-g11/G11_REMEDIATION_DESIGN.md`.
**Live evidence:** `supabase/verification/remediation-g11/G11_POST_DEPLOYMENT_RUNTIME_EVIDENCE.md`.

## 1. Source change (committed at `1a0f4bc`)
- `src/components/Compliance.jsx` — in `FirmDashboard()`:
  - removed `const [team, setTeam] = useState([])`;
  - removed the `supabase.from('v_team_workload').select('*')` fetch and its `{data:t}` destructure and `setTeam(t||[])`;
  - removed the "Team Workload" panel `<div>` (which rendered `full_name` / `active_tasks` / `overdue_tasks`);
  - changed the grid from `gridTemplateColumns:'1fr 1fr'` to `'1fr'` so Category Breakdown fills the row.
- `tests/g19FieldContract.test.js` — **G7** rewritten to assert *removal*: `Compliance.jsx` contains no `v_team_workload`, no `setTeam`, no `Team Workload`.

**Static confirmation at `1a0f4bc`:** `grep -c` in `src/components/Compliance.jsx` = **0** for each of `v_team_workload`, `Team Workload`, `setTeam`; `src/components/Dashboard.jsx` = **1** for `Team Workload` (its own separate feature retained).

## 2. Verification chain
- **Unit/contract:** `npm test` → **336/336 PASS** (G7 now locks the removal so any re-introduction fails the build).
- **Build:** `vite build` → PASS (clean).
- **Runtime (live V2 Preview):** PASS — see `G11_POST_DEPLOYMENT_RUNTIME_EVIDENCE.md` (0/25 `v_team_workload` requests; no 404; Firm Dashboard renders; Home Dashboard workload unaffected).

## 3. What was NOT done (invariants)
- **No `v_team_workload` view created**, no other DB object — Option A is deliberately frontend-only.
- **No SQL, no migration, no Supabase mutation.**
- **No Production deployment / promotion, no V1 access, no alias reassignment.**
- **`src/components/Dashboard.jsx` NOT modified** — its independent client-side "Team Workload (open tasks)" feature (from `teamMembers`/`tasks`, not `v_team_workload`) is untouched.

## 4. Completion-percentage impact (governing weighted model — BASELINE.md §5)

**Methodology (unchanged):** BASELINE.md §5 — weighted contribution `= area_weight × (area_fraction_after − area_fraction_before)`. **No area weight or scoring rule is invented or changed here.** Prior overall verified completion is taken from `remediation-t4/0024-execution-readiness/EXECUTION_CLOSEOUT_0024.md` (**43.40%** after V-4/0024).

| Area (BASELINE §5) | Weight | Δ area fraction | Weighted Δ | Basis |
|---|---:|---:|---:|---|
| 2 — Application/source recovery & consolidation | 20% | +0.01 | **+0.20 pp** | Broken source data-dependency removed (frontend no longer requests the non-existent `v_team_workload` view); field-contract correctness raised and locked by G7 static guard |
| 7 — Runtime, role-based & end-to-end testing | 10% | +0.01 | **+0.10 pp** | Live V2 Preview verification: 0/25 `v_team_workload` requests, no 404, Firm Dashboard renders, Home Dashboard workload unaffected |
| **Total** | | | **+0.30 pp** | |

- **Prior overall verified completion:** **43.40%**
- **Weighted increment attributable to G-11 closure:** **+0.30 pp** (Area 2 +0.20, Area 7 +0.10)
- **New unrounded completion:** 43.40% + 0.30 = **43.70%**
- **Displayed (rounded) completion:** **43.7%**

**Verified overall completion after G-11 closure:** 43.40% + 0.30 percentage points = 43.70%, displayed as 43.7%. No area weight and no scoring rule changed.

## Governance footer
```
G-11 / R-10: CLOSED PASS (Option A) — source 1a0f4bca78cbd2d6d8a659009a370e2784f17589
Live: V2 Preview only (ogjrwemjefvccpyjwxuo) · 0/25 v_team_workload requests · no 404 · Home Dashboard workload unaffected
Verified overall completion after G-11 closure: 43.40% + 0.30 pp = 43.70%, displayed as 43.7% (Area 2 +0.20, Area 7 +0.10)
No new view/migration/RPC · No SQL · No Supabase mutation · No Production promotion · No alias change · No V1 · No PR/merge
```
