# G-11 — `v_team_workload` Remediation Design (read-only planning)

**Status:** DESIGN ONLY — read-only. No SQL executed, no Supabase access, no application modification. Independent of the 0024 package.
**Owner/editor:** Terminal 1 (Control Tower, sole editor). **Basis:** repo source at governing HEAD `4e4d5abd3d376623bd5577718c4ea8a0bb4c5542` + committed T3 evidence.
**Target (for any eventual live work):** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` ONLY. **Prohibited:** V1.

## 0. APPROVED DECISION (PJ) — OPTION A
> ✅ **PJ-APPROVED: OPTION A** — **remove** the broken `v_team_workload` query and the always-empty Compliance "Team Workload" panel. Frontend-only (`src/**`, T2 ownership); no DB change. **Implementation is NOT performed in this package** and requires separate authorisation. Options B and C are recorded below for completeness only (not chosen).

## 1. Problem
`v_team_workload` is **absent** live and **unauthored** in any migration (only ADD/DEFER notes in `0009`/`0011`). The frontend queries it, producing a **404** on the admin dashboard load. **This is a MEDIUM visible functional defect with graceful degradation** — the request 404s and the Team Workload panel renders empty, but the page does not crash. T3 classified it as a MEDIUM cross-package source-completeness variance (D-4).

## 2. Complete source-reference analysis
| Location | Kind | Detail |
|---|---|---|
| `src/components/Compliance.jsx:1262` | **frontend query** (only live ref) | `supabase.from('v_team_workload').select('*')` inside `FirmDashboard()`'s `Promise.all([...])` |
| `supabase/migrations/0009_views.sql:211` | DEFER note | "v_team_workload: ADD/DEFER — absent in V1 reference; frontend references it" |
| `supabase/migrations/0011_storage_and_edge_DEFER.sql:29` | DEFER note | same DEFER note |
- **No `CREATE VIEW v_team_workload` exists in any migration.** Live: `v_team_workload_present = 0` (T3 `06_views_and_relation_absence.md`).

## 3. Exact frontend files & line references
- Query: `src/components/Compliance.jsx:1262` (`.from('v_team_workload').select('*')`).
- Destructure: `Compliance.jsx:1263` → `{data:t}`; `1268` → `setTeam(t||[])`.
- Render: `Compliance.jsx:1319–1332` — the **"Team Workload"** panel maps `team` (`team.length===0 ? <Empty label="team data"/> : team.map(...)`).

## 4. Exact fields expected from `v_team_workload`
The Team Workload panel consumes exactly these columns per member (from `Compliance.jsx:1320–1332`):
| Column | Use |
|---|---|
| `full_name` | member name + initials avatar |
| `active_tasks` | "Active: N" badge (Number) |
| `overdue_tasks` | "🔴 N" badge, shown only when `> 0` (Number) |
Query uses `select('*')`, but only these 3 fields are read.

## 5. Is the returned data actually consumed?
**Yes, but it degrades gracefully.** `t` → `setTeam(t||[])` → the Team Workload panel renders it. When the view is absent, the REST call returns 404 → `t` is null → `setTeam([])` → the panel shows the **`<Empty label="team data"/>`** state. **No crash, no broken layout** — the only symptoms are (a) the **404 network/console error** and (b) an empty Team Workload panel.

## 6. All known 404 locations
- **One:** `GET /rest/v1/v_team_workload?select=*` fired from `FirmDashboard()` in `Compliance.jsx` on **admin dashboard/Firm-Overview load** (the component that also fetches `v_firm_dashboard` + `v_overdue_ageing`). No other code path references the relation.

## 7. Option comparison
| Option | What | Effort / owner | DB risk | Feature outcome | Removes 404 |
|---|---|---|---|---|---|
| **A. Remove the reference** | delete the `v_team_workload` query + `t`/`setTeam`/`team` state + the Team Workload panel (or keep panel with a static "n/a") | LOW · **T2 `src/**`** | none | **drops** the Team Workload feature | ✅ |
| **B. Replace with existing source** | compute workload client-side from `team` + `tasks` (aggregate active/overdue per assignee) or a different existing query | MEDIUM · **T2 `src/**`** (+ maybe a helper) | none/low | keeps feature via app-side aggregation | ✅ |
| **C. Author `v_team_workload` view** | new migration creating the view returning `full_name, active_tasks, overdue_tasks` per team member (join `team` ↔ `tasks`; `security_invoker='on'` like the other 3 views) | MEDIUM · **T3 migration** | low-medium (new query surface; RLS/security_invoker; must define "active"/"overdue") | **restores** the designed feature | ✅ |

## 8. Recommended minimum-risk solution — **PJ-APPROVED: OPTION A**
- ✅ **APPROVED (PJ): Option A** — remove the broken `v_team_workload` query and the always-empty "Team Workload" panel. Frontend-only (`src/**`, T2), **zero DB surface**, eliminates the 404, and is also the strict minimum-risk technical fix.
- (Not chosen) **Option C** (author the `security_invoker` view — feasible now the column contract is known) and **Option B** (app-side compute) — recorded for completeness; **superseded by the approved Option A**.
- Implementation of Option A is a **T2 `src/**` change requiring separate authorisation** (not performed in this package).

## 9. Proposed implementation plan (per option; NOT executed)
- **Option A (T2):** in `Compliance.jsx` remove the `v_team_workload` fetch line, the `t` destructure, `setTeam`, the `team` state, and the Team Workload panel block (1319–1332) — or replace the panel with a static "not available" note. No DB change.
- **Option C (T3):** author `0023-series?`… **next forward number `0025`** (0023/0024 reserved) — `CREATE VIEW public.v_team_workload WITH (security_invoker='on') AS SELECT t.full_name, <active_tasks count>, <overdue_tasks count> FROM public.team t LEFT JOIN public.tasks … GROUP BY …;` with grants matching the other views. Requires: confirm `tasks` assignee column + status/overdue definitions; RLS/security_invoker parity; PRE/POST existence checks; runtime smoke (admin dashboard shows populated panel, 404 gone).

## 10. Test plan
- **A:** build passes; admin dashboard loads with **no `v_team_workload` request** (404 gone); Team Workload panel removed/neutralized; other panels (firm dashboard, overdue ageing) unaffected.
- **C:** PRE (view absent) → apply → POST (view present; `select full_name, active_tasks, overdue_tasks` returns rows); admin dashboard shows a populated Team Workload panel; **no 404**; non-admin unaffected (view is `security_invoker`, so RLS on base tables governs).

## 11. Rollback plan
- **A:** revert the `Compliance.jsx` edit (git revert of the frontend commit).
- **C:** `DROP VIEW public.v_team_workload;` (rollback migration) — restores the pre-view state (back to the 404). EMERGENCY-only, separate PJ approval.

## 12. PJ business decisions
1. **RESOLVED — PJ-APPROVED: OPTION A** — drop the Team Workload feature by removing the broken query + always-empty panel. (Options B/C not chosen.)
   - Consequently **moot:** the Option-C `active_tasks`/`overdue_tasks` definitions and `tasks`↔team linkage (only needed if a view were authored).
2. **If C:** define **`active_tasks`** and **`overdue_tasks`** precisely (which `tasks` rows count as active; overdue = due_date < today AND not completed?), and confirm the `tasks`→team-member linkage (assignee column).
3. **Ownership/sequencing:** A = T2 `src/**` change; C = T3 migration — different review paths; must be separately authorised.

## 13. Evidence template
- [ ] PJ decision recorded (A / B / C).
- [ ] (If A) `Compliance.jsx` diff; build pass; admin dashboard load — no `v_team_workload` 404.
- [ ] (If C) migration applied on V2; view exists; dashboard panel populated; no 404; non-admin unaffected.
- [ ] Result: G-11 CLOSED (chosen option) with evidence, or blockers.

```
G-11 status: DIRECTION APPROVED — OPTION A (remove); implementation pending separate authorisation · The 404 is a MEDIUM visible functional defect with graceful degradation (empty Team Workload panel; no crash)
No SQL executed · No Supabase access · No app modification · V1: NONE · This is design only.
```
