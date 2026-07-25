# T4 — Migration 0023 Execution Closeout (G-05 / V-5)

**Status:** ✅ **G-05 / V-5 — REMEDIATED & RUNTIME-VERIFIED on V2 `ogjrwemjefvccpyjwxuo`.**
**Basis:** PJ-executed 0023 + POST checks + admin/non-admin smokes (`POST_EXECUTION_RESULTS_0023.md`, `EVIDENCE_TEMPLATE.md`). Terminal 1 executed no SQL.
**Design commit:** `6d6f18176a0e970436881e1817636ac57c088144`.

## 1. What was closed
- **G-05 / V-5 (HIGH):** the 17 functions no longer grant EXECUTE to `PUBLIC`, `anon`, or `service_role`. Group A = owner-only (definer-chain); Group B = `authenticated,postgres`. **The anonymous/public/service-role attack surface on these functions is eliminated.**
- **Runtime verification:** admin path works (`get_sensitive_audit_logs` returns data as `authenticated`); non-admin path is **server-denied** (`ERROR 42501: not authorised` for the real Staff test UID), proving the protection is DB-enforced, not UI-only.

## 2. What remains OPEN (unchanged by 0023)
- **V-4 (LOW):** the 3 bare-`'public'` helpers still `{search_path=public}` — **`0024` not executed.** OPEN.
- **G-11 (MED):** `v_team_workload` still 404 (absent live & unauthored) — pre-existing, **not caused by 0023.** OPEN (pending the author-vs-remove business decision).

## 3. Proposed completion-percentage impact (governing weighted model)
**Rule:** credit only newly-verified live outcomes; documentation = 0. Official baseline after T3 = **41.9% (41.85% unrounded)**.
| # | Area | Weight | Prior fraction | New fraction | Δ | Weighted Δ | Basis |
|---|---|---:|---:|---:|---:|---:|---|
| 4 | Security (RLS/RBAC/Auth/grants/audit) | 15% | 0.32 | 0.37 | +0.05 | **+0.75 pp** | the single HIGH grant variance (G-05/V-5) **remediated live + verified**; broad RLS/RBAC/Auth still pending |
| 7 | Runtime / role-based / E2E | 10% | 0.15 | 0.18 | +0.03 | **+0.30 pp** | audit-log RBAC path **runtime-verified** (admin allow + non-admin server-deny) |
| | **Total** | | | | | **+1.05 pp** | |
- **Proposed provisional completion:** 41.85 + 1.05 = **≈ 42.9%**.
- **Official remains 41.9%** until this closeout is committed and independently reviewed (contributions become official on integration, per the governing model). **This is a PROPOSED impact, not asserted as official.**

## 4. Master Completion Register — recommendation
**Recommend** a register entry recording "G-05/V-5 (function EXECUTE least-privilege) REMEDIATED + runtime-verified on V2 via migration 0023" — **but** `docs/YAV2_Master_Completion_Register.md` is a **governing document with its own change control**; that edit is **out of the `remediation-t4/` scope** and should be a **separate PJ-authorised update**. **Not performed here.**

## 5. Next
- **V-4:** execute `0024` under separate PJ authorisation (LOW; independent).
- **G-11:** await the author-vs-remove business decision (T4 design §I / business decisions #1).
- **This closeout:** commit the evidence/closeout docs under separate PJ commit authorisation (not done here).

## Governance footer
```
G-05/V-5: REMEDIATED + RUNTIME-VERIFIED (V2 ogjrwemjefvccpyjwxuo) via 0023 · V-4: OPEN · G-11: OPEN
Proposed completion impact: +1.05 pp (Area 4 +0.75, Area 7 +0.30) → provisional ~42.9%; official 41.9% until integrated
0024: NOT executed · G-11: no change · V1 access: NONE · PR/merge/deploy: NONE · Terminal 1 SQL: NONE
```
