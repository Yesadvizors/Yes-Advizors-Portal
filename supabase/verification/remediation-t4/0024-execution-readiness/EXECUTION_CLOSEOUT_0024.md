# T4 — Migration 0024 Execution Closeout (V-4)

**Status:** ✅ **V-4 — CLOSED PASS** (repinned + runtime-verified on V2 `ogjrwemjefvccpyjwxuo`).
**Basis:** PJ-executed 0024 + PRE/POST + admin/non-admin runtime (`POST_EXECUTION_RESULTS_0024.md`, `../EVIDENCE_TEMPLATE.md`). Terminal 1 executed no SQL.
**Governing source commit:** `317d3e19bb723d0c98b7ec2702868e3e6e51804d`.

## 1. What was closed
- **V-4 (LOW, defence-in-depth):** the 3 SECURITY DEFINER helpers `get_portal_role()`, `is_active_user()`, `is_admin_or_manager()` now pin `search_path = pg_catalog, public, pg_temp` (was bare `public`). Combined with G-06 (all 51 functions pinned), the **`search_path` hardening surface is now complete** — no bare-`'public'` definer remains.
- **Runtime-verified:** admin onboarding works end-to-end (YA-012 + compliance generated); non-admin onboarding is server-denied (`42501`) with no records created → the RLS/CRUD gates driven by these helpers behave identically after the repin.

## 2. Security-gate status (S1–S5) after 0023 + 0024
- **S1 (V2-only):** guard present. **S2 (RLS+FORCE):** verified (T3). **S3 (definer `search_path`):** ✅ **fully hardened** (all 51 pinned; the 3 bare-`'public'` repinned by 0024). **S4 (server-side RBAC):** verified — grants hardened (0023) + admin/non-admin runtime deny/allow verified. **S5 (storage):** `secure-docs` verified (T3).
- **Confirmed variances now CLOSED:** G-05/V-5 (0023) and V-4 (0024). **Remaining OPEN:** G-11 (unrelated).

## 3. Proposed completion-percentage impact (governing weighted model)
Official baseline after 0023 = **≈ 42.9% (42.90% unrounded)**.
| # | Area | Weight | Prior | New | Δ | Weighted Δ | Basis |
|---|---|---:|---:|---:|---:|---:|---|
| 4 | Security (RLS/RBAC/Auth/grants/audit) | 15% | 0.37 | 0.39 | +0.02 | **+0.30 pp** | V-4 closed → `search_path` (S3) fully hardened; last documented function-hardening variance cleared |
| 7 | Runtime / role-based / E2E | 10% | 0.18 | 0.20 | +0.02 | **+0.20 pp** | client-onboarding RBAC path **runtime-verified** (admin allow → YA-012 created; non-admin deny `42501`, no records) |
| | **Total** | | | | | **+0.50 pp** | |
- **Verified overall completion after V-4/0024 closure:** 42.90% + 0.50 percentage points = 43.40%, displayed as 43.4%.
- **Official remains ≈ 42.9%** until this closeout is committed and independently reviewed (contributions become official on integration). **PROPOSED impact, not asserted as official.**

## 4. Proposed Master Completion Register entry (NOT applied here)
Recommend adding to `docs/YAV2_Master_Completion_Register.md` (a **governing doc with its own change control** — a **separate PJ-authorised edit**, not performed in this package):
> **T4 Security remediation — CLOSED PASS (V2 `ogjrwemjefvccpyjwxuo`).** G-05/V-5 (17 functions: PUBLIC/anon/service_role EXECUTE removed; Group-A owner-only, Group-B `authenticated`) via migration 0023, and V-4 (3 helpers repinned to `pg_catalog, public, pg_temp`) via migration 0024 — both post-verified and runtime-verified (admin allow + non-admin `42501` deny). Function-grant + `search_path` hardening complete. G-11 remains open (Option A approved, not implemented).

## 5. Next / still open
- **G-11:** implement the **approved Option A** (remove the broken `v_team_workload` query + always-empty panel) — T2 `src/**` change, separate authorisation. **Not implemented here.**
- **Separate observation (not a 0024 defect):** YA-012 compliance-setup warnings (missing GSTIN/TAN/CIN; **FY 2026-27 generation not currently supported**) — recommend PJ track as an independent application/compliance-generation item.
- **This closeout:** commit under separate PJ authorisation after independent review (not done here).

## Governance footer
```
V-4: CLOSED PASS (repinned + runtime-verified, V2 ogjrwemjefvccpyjwxuo) via 0024
G-05/V-5: CLOSED PASS (0023) · G-11: OPEN (Option A approved, not implemented)
Proposed completion impact: +0.50 pp (Area 4 +0.30, Area 7 +0.20) → provisional ~43.4%; official ~42.9% until integrated
Further SQL: NONE · G-11 implementation: NONE · V1 access: NONE · PR/merge/deploy: NONE · Terminal 1 SQL: NONE
```
