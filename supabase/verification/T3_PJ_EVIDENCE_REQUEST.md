# T3 — Consolidated read-only evidence request (PJ, V2 only)

**One bundled request** so PJ runs read-only discovery **once** to close the live-dependent T3 gaps.
**Target: V2 / yav2-dev `ogjrwemjefvccpyjwxuo` ONLY.** **Never** V1 `zcszesuvjrryxtigjglt`.
**Everything below is read-only** (SELECT / catalog inspection). **No mutation, no deploy, no alias change.**
**T3 does not and may not execute any of this** — it is prepared for PJ.

## Pre-flight (safety)
1. Confirm the SQL session is connected to **V2** — run first, must return the V2 ref:
   ```sql
   select current_database(),
          current_setting('request.jwt.claim.iss', true)  as iss_hint,
          inet_server_addr()                               as server_ip;
   -- Then visually confirm the Supabase project selector shows ogjrwemjefvccpyjwxuo.
   ```
   The A4 script's §0 also prints a project-ref hint. **Abort if anything shows `zcszesuvjrryxtigjglt`.**
2. Recommended guards (already in the script): `SET default_transaction_read_only = on;` and Part 1 runs
   inside `BEGIN; SET TRANSACTION READ ONLY; … COMMIT;`.

## Step 1 — Run Part 1 (active, read-only) as-is
File: `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql`.
Part 1 (§0–§15b) is catalog-only and runs unmodified. Capture **all** result sets (text/CSV export or
screenshots). This closes the schema/security *object* side of **G-03, G-04, G-05, G-06, G-11**:

| A4 §| Returns | Closes / feeds |
|---|---|---|
| §0 | env identity, extensions | S1 sanity |
| §1–§5 | schemas, tables, columns, constraints, indexes, enums | **G-03** (reconcile to `T3_DB_CONTRACT_*`) |
| §6/§6b | view defs, matviews (incl. `v_firm_dashboard`, `v_team_workload` presence) | **G-11** |
| §7 | functions: DEFINER/INVOKER, owner, **search_path** | **G-06 / S3** |
| §8 | triggers | schema completeness |
| §9b | PRESENT/MISSING for expected object set | **G-02 / G-03** |
| §10 / §10b | RLS enabled + FORCE per table; policy bodies | **G-04 / S2** (⚠ confirm NO `*_authenticated_all` remains — see V-2) |
| §10c / §10d | table grants (anon/authenticated/service_role); EXECUTE grants for 3 named RPCs | **G-05 / S4** |
| §13c | `storage` schema RLS policies | **G-08 / S5** (policy side) |
| §15 / §15b | audit objects + audit functions | audit completeness |

## Step 2 — Uncomment and run these Part 2 probes (individually)
Part 2 is intentionally commented out (data-dependent). To close the remaining T3 gaps, **uncomment and
run each of the following** and capture output. All are read-only counts/inspections:

| Probe | Uncomment for | Closes / feeds | Notes |
|---|---|---|---|
| **§9** | `supabase_migrations.schema_migrations` ledger | **G-02** (live ledger vs authored `0001–0022`) | CLI table may be absent; if so, record "absent" as the finding |
| **§11** | `auth.users` count/status | **G-07 / S4** | counts only — never export PII/emails beyond what's needed |
| **§11b** | `team` rows: `portal_role`, `is_admin`, `is_active`, `auth_user_id` populated | **G-07** | the Auth↔app-role mapping |
| **§11c** | auth↔team mapping integrity (unmapped / inactive / duplicate) | **G-07 / S4** | flags orphaned or inactive-but-mapped users |
| **§13** | `storage.buckets` + object counts | **G-08 / S5** | confirm `secure-docs` exists and **`public=false`**; also `completed-work`, `client-docs` |
| **§14** | Edge function inventory (dashboard/CLI — not SQL) | **G-10** | list deployed functions + `verify_jwt` for `ai-agent`, `extract-financial`, `scan-document` |

## Step 3 — Targeted confirmations to add (small, read-only)
These are not in the script; add them to fully close the security variances in `T3_SECURITY_VARIANCE_REPORT.md`:

1. **V-2 (critical) — no leftover open policy:**
   ```sql
   select schemaname, tablename, policyname
   from pg_policies
   where schemaname='public' and policyname like '%\_authenticated\_all' escape '\';
   -- EXPECT: zero rows. Any row = 0006 baseline still live without 0010 → S2 failure.
   ```
2. **V-5 (high) — no anon/PUBLIC EXECUTE on functions:**
   ```sql
   select p.proname, p.prosecdef, r.rolname as grantee
   from pg_proc p
   join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
   cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
   join pg_roles r on r.oid=a.grantee
   where a.privilege_type='EXECUTE' and r.rolname in ('anon','public');
   -- EXPECT: only intentional entries (ideally none for client-master/sensitive RPCs).
   ```
3. **FORCE RLS coverage (V-1):**
   ```sql
   select relname, relrowsecurity as rls_enabled, relforcerowsecurity as rls_forced
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind='r' order by relname;
   -- Compare against T3_SECURITY_VARIANCE_REPORT.md S2 table.
   ```
4. **Definer search_path on every live function (V-4 / S3):**
   ```sql
   select p.proname, p.prosecdef, p.proconfig
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
   where p.prosecdef order by p.proname;
   -- EXPECT: every row's proconfig contains a search_path=... entry.
   ```

## What each deliverable needs back
- **`T3_DB_CONTRACT_PROPOSAL.md`** (G-03/G-11): §1–§6, §9b outputs → mark each object PRESENT/variance.
- **`T3_SECURITY_VARIANCE_REPORT.md`** (G-04/05/06/08): §7, §10*, §13c + Step-3 queries → resolve V-1…V-5, S5.
- **G-02 ledger:** §9b + Part-2 §9 → confirm authored `0001–0022` reconcile to live ledger.
- **G-07:** Part-2 §11/§11b/§11c. **G-10:** Part-2 §14.

## Handling results
Return outputs as text/CSV or screenshots tagged with `Sb-Project-Ref: ogjrwemjefvccpyjwxuo` and a timestamp
(per `PACKAGE_A_ACCEPTANCE_CHECKLIST.md` §Evidence format). T3 will reconcile each against source and update
the contract/variance docs (read-only reconciliation; still no SQL execution by T3). **Never paste secret
values** (service-role keys, anon key, JWTs) into evidence — counts and structural facts only.

## Governance footer
```
Governing Issue: #23 · Merged PR: #29 · HEAD: 1286a290f5d4287e70c6853d2eb3bad16256e276
Role: T3 — DATA SECURITY · Branch: sync/supabase-security · Target: sync/integration
Target project: V2 ogjrwemjefvccpyjwxuo ONLY · Prohibited: V1 zcszesuvjrryxtigjglt
SQL/Database action: read-only, PJ-executed (NOT by T3) · Deploy/Alias: NOT AUTHORISED
```
