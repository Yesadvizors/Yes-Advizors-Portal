# T4 — Migration 0024 (V-4) Post-Execution Results (recorded)

**Environment:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` (PJ-executed manually). **V1 never touched.**
**Governing source commit:** `317d3e19bb723d0c98b7ec2702868e3e6e51804d`. **Terminal 1 executed no SQL** — this file records the results PJ returned.

## 1. PRE evidence
- **PRE-4a — PASS:** all 3 helpers initially `{search_path=public}` — `get_portal_role()`, `is_active_user()`, `is_admin_or_manager()`.
- **PRE-4b — PASS:** effective `CREATE` on schema `public` → **PUBLIC: false · anon: false · authenticated: false** → shadowing precondition absent → V-4 was benign; 0024 is defence-in-depth.

## 2. Execution evidence
- **Migration 0024 — PASS:** `ALTER FUNCTION … SET search_path = pg_catalog, public, pg_temp` for the 3 helpers, **executed successfully in one transaction**.

## 3. POST evidence
- **POST-4 — PASS:** all 3 helpers now `{search_path=pg_catalog, public, pg_temp}`:
  - `public.get_portal_role()`
  - `public.is_active_user()`
  - `public.is_admin_or_manager()`

## 4. Non-admin runtime evidence — PASS
- Dashboard loaded · Compliance loaded · Documents loaded.
- **Restricted client onboarding was DENIED server-side with `42501`.**
- **No client or compliance records were created.** → server-side RBAC enforced; no side effects.

## 5. Admin runtime evidence — PASS
- Dashboard loaded · Compliance loaded · Documents loaded · **Audit Log loaded**.
- **Admin client onboarding succeeded — client `YA-012` created; compliance records generated.**
- **No `42501` / permission-denied error.**

## 6. Interpretation
The 3 helpers are repinned exactly as designed, and the RLS/CRUD write-gates they drive behave **identically after the change**: admin onboarding works end-to-end (YA-012 + compliance), non-admin onboarding is server-denied (`42501`) with no records created. **No regression attributable to 0024.**

## 7. Known observations — UNRELATED to 0024 (recorded, not actioned here)
- **G-11:** the Team Workload empty-panel 404 remains OPEN (Option A approved; not implemented). Independent of 0024.
- **Client YA-012 compliance-setup warnings:** GSTIN/TAN/CIN were absent and **FY 2026-27 generation is not currently supported** → warnings during compliance setup. **Unrelated to 0024** (a separate application/compliance-generation observation for PJ to track independently; not a 0024 defect).

## Provenance
```
Environment: V2 ogjrwemjefvccpyjwxuo ONLY · V1 never queried
Executed by: PJ. Terminal 1 executed NO SQL. One transaction; only search_path/proconfig changed.
Not done: G-11 implementation · No V1, PR, merge, deployment.
```
