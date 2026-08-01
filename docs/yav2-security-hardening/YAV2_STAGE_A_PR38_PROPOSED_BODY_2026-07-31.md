# PR #38 — PROPOSED description update (NOT YET APPLIED)

> This is the **proposed** PR #38 body text for PJ review. **It has NOT been applied to PR #38** (no PR change
> is authorised in this pass). PR #38 remains OPEN / Draft with its current description until PJ authorises
> the update. The current live description already states PATH 2; this proposed text additionally records
> that authority discovery A1–F2 is complete.

---

## Stage A — PATH 2 split-execution readiness package only

**Readiness/documentation only. No Supabase access, no SQL executed, no privilege changed, no migration run, no deployment, no merge.** Base `sync/integration`. Authorised future-execution env: `yav2-dev` / `ogjrwemjefvccpyjwxuo`. Prohibited: V1/Prod `zcszesuvjrryxtigjglt`.

### Authority discovery — COMPLETE (A1–F2)
- Blocks **A1, A2, A3, B1, C1, C2, D1, D2, E1, F1, F2** captured (F2 confirmed 2026-07-30; A1–F1 captured 2026-07-31).
- Executing identity = **`postgres`** (not superuser); owns all **28** in-scope public tables.
- Full raw capture: `docs/yav2-security-hardening/evidence/YAV2_STAGE_A_EXECUTION_AUTHORITY_A1_F2_RAW_CAPTURE_TEMPLATE_2026-07-31.md` — **all blocks A1–F2 captured verbatim. The [D1] block is 100 rows captured verbatim, but incomplete/truncated relative to the full default-ACL catalogue; decisive public-scope facts are supplied by the focused reconciliation evidence.**
- **Public-scope confirmed:** a focused SELECT-only default-ACL reconciliation confirms `postgres`/`public`/`anon` = 4 and `supabase_admin`/`public`/`anon` = 4 object-level defaults → **[D2] confirmed; Part B `IN SCHEMA public` scope valid; Part A confirmed.** The 100-row [D1] export was a truncated catalogue capture (preserved verbatim). `graphql`/`graphql_public` defaults exist but are outside Stage A.

### PATH 2 — CONFIRMED
- `eligible_for_postgres_default_alter = true`; `eligible_for_supabase_admin_default_alter = false`; `cu_is_superuser = false`.
- **PATH 1 rejected; PATH 3 not selected.**
- **No Stage A execution has occurred. No privilege changes have occurred. Part A and Part B remain unexecuted.**

### Part A (not executed)
- 28 existing-table object-level REVOKEs from `anon` (`TRUNCATE, REFERENCES, TRIGGER, MAINTAIN`) + **`postgres`-owned** default correction only.
- Current identity (`postgres`) eligible per F2.

### Part B (not executed)
- **`supabase_admin`-owned** default correction only.
- Current identity **ineligible** → **authorised Supabase-supported mechanism** + separate PJ approval + separate evidence required.

### Closure
- Part A alone is **not** full Stage A closure; **full closure requires Part A PASS and Part B PASS** (+ verification).
- **Stage B excluded.**

### Superseded files
- Old **combined** migration + rollback candidates **superseded** (no active SQL remains); the four PATH 2 files govern.

### Governance
- **Draft PR only.** No Supabase access · no SQL executed · no privilege changed · no migration run · no deployment · no merge. **PR #35 untouched.** Execution-readiness documentation only.
