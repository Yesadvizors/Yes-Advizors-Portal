# YAV2 Portal V2 — Anon Object-Privileges Hardening — Design Review Package

**Reviewer:** Claude (authoring self-review). **Scope:** design/documentation review only.
**Status:** **DESIGN ONLY — no Supabase access, no SQL executed, no migration run, no privilege changed, no
deployment.**
**Governing:** `sync/integration` @ `231fa39b608f6def9e6ed4b45ce5feb417c6f74f`.
**Authorised future-execution env:** `yav2-dev` / `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1/Prod `zcszesuvjrryxtigjglt`.

---

## 1. Package inventory (6 files)

| # | Path | Role |
|---|---|---|
| 1 | `docs/yav2-security-hardening/YAV2_ANON_OBJECT_PRIVILEGES_SCOPE_AND_IMPACT_REPORT.md` | Exact 28-table scope + impact |
| 2 | `docs/yav2-security-hardening/YAV2_ANON_OBJECT_PRIVILEGES_MIGRATION_DESIGN.md` | Migration design (no execution) |
| 3 | `supabase/verification/YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql` | SELECT-only pre/post verification |
| 4 | `supabase/migrations/DRAFT_ONLY_YAV2_ANON_OBJECT_PRIVILEGES_HARDENING.sql` | **DRAFT** proposed migration (not run) |
| 5 | `docs/yav2-security-hardening/YAV2_ANON_OBJECT_PRIVILEGES_RUNTIME_TEST_PLAN.md` | Controlled future runtime tests |
| 6 | `docs/yav2-security-hardening/YAV2_ANON_OBJECT_PRIVILEGES_REVIEW_PACKAGE.md` | This review |

---

## 2. Exact source evidence

All scope facts derive **only** from the verbatim raw live output merged into `sync/integration`:
`docs/yav2-discrepancy-closure/evidence/YAV2_DISCREPANCY_CLOSURE_LIVE_RESULT_EXACT_2026-07-30_1115_IST.json`
— **JSON parse PASS**, SHA-256 `8fe16665ff87b3414b8dc30c2a965fbfdf65645880b2703c557bc1143737ae0d`.

Derived from its blocks: `G1_raw_grants` (818 rows → anon privilege matrix), `G3_rls_force` (39 rows →
RLS/FORCE/policy), `G11_default_acl` / `G11b` (default owners = `postgres` + `supabase_admin`),
`G7_bypassrls_roles` (anon not `BYPASSRLS`), `G8_public_create_named` (anon cannot CREATE in public),
`G5`=0, `G6`=0.

**Exact scope = 28 tables**, each with anon holding the full `GRANT ALL` (SELECT/INSERT/UPDATE/DELETE/
TRUNCATE/REFERENCES/TRIGGER/MAINTAIN). `28 + 11` explicitly-revoked `= 39`.

---

## 3. Assumptions (carried, not resolved by this design)

1. SPA authenticates before data access; no product flow uses anon object privileges (→ revoke transparent).
2. No public flow needs anon `SELECT` (RLS already denies anon; `G5`=0).
3. PostgREST does not expose TRUNCATE/DDL over HTTP; anon object-privilege reach is via a direct Postgres
   session — reachability undetermined without deployment inspection.
4. `authenticated`/`service_role` are the legitimate data/server paths → preserved.

All are labelled in the Scope report §4 and tested in the Runtime Test Plan.

---

## 4. Unresolved questions

- **Q1** Is anon data access truly invisible to remove at runtime? (Runtime T1/T2.)
- **Q2** Is a direct-Postgres anon path reachable in `yav2-dev`? (Deployment inspection.)
- **Q3** Should `authenticated` object-level privileges also be revoked (separate, lower-priority)? Out of
  scope here.
- **Q4** Can the migration role alter `supabase_admin`'s default privileges, or must that one correction use
  the Supabase-supported mechanism? (Execution-time; Migration Design §4.)
- **Q5** Any external tool relying on anon privileges? (Expected none; confirm pre-execution.)

---

## 5. SQL safety scans (static)

**SELECT-only verification file** (`YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql`):

| Check | Result |
|---|---|
| Executable statements | 9 (6 `WITH`, 3 `SELECT`) |
| Statements not beginning `SELECT`/`WITH` | **0** |
| Prohibited keywords (INSERT/UPDATE/DELETE/…/GRANT/REVOKE/ALTER/TRUNCATE/CALL, word-boundary, literal-masked) | **0** |
| `SET ROLE` / `SET SESSION AUTHORIZATION` | **none** |
| Application `public.<fn>(` calls | **0** |
| Sensitive values (PII/PAN/GSTIN/…) | **0** (catalog metadata, booleans, counts only) |
| Quote / parenthesis balance | balanced |
| SHA-256 | `37207cb9971642a426c6fb07d114ca613a6b73bfdeb0095b4e85dbb1f3a490ec` |

**DRAFT migration** (`DRAFT_ONLY_YAV2_ANON_OBJECT_PRIVILEGES_HARDENING.sql`) — **intentionally contains
writes**; classified, not required to be SELECT-only:

| Property | Result |
|---|---|
| `REVOKE` statements | **56** (28 object-level + 28 data-level, anon only) |
| `ALTER DEFAULT PRIVILEGES` | **2** forward (`FOR ROLE postgres`, `FOR ROLE supabase_admin`) + 2 in rollback comments |
| `GRANT` against authenticated/service_role | **0** (both preserved) |
| Fail-fast guard (aborts if run) | **present** (`RAISE EXCEPTION … NOT AUTHORISED`) |
| Transaction boundary | single `BEGIN … COMMIT` |
| Post-check assertion | present (raises if any anon privilege / anon default remains) |
| Rollback | provided as comments (paired GRANTs + default restore) |
| Dynamic SQL | only 2 justified `DO` blocks (guard + post-check); no dynamic REVOKE construction |
| Executed? | **NO** — authored on disk only; never run; guard would abort regardless |

---

## 6. Boundary confirmation

| Control | Status |
|---|---|
| No Supabase / MCP DB access | ✔ zero connections |
| No SQL executed | ✔ nothing run (verification kit and draft migration are files only) |
| No migration created/run live | ✔ draft is `DRAFT_ONLY_`-prefixed, guarded, unexecuted |
| No privilege revoked/granted; no `ALTER DEFAULT PRIVILEGES` applied | ✔ design/text only |
| No deployment / no merge | ✔ Draft PR only |
| Exact evidence unaltered | ✔ EXACT JSON untouched (SHA `8fe16665…`) |
| PR #35 untouched | ✔ not referenced/modified |
| V1/Prod never referenced as authorised | ✔ only in prohibited context |

---

## 7. Recommendation — design readiness

**PASS (design-ready).**

The design is repository-grounded (28-table scope derived byte-exactly from the merged raw evidence),
internally consistent, and correctly bounded: it targets **anon only**, preserves `authenticated`/
`service_role`, separates object- from data-privileges, corrects the default ACL for **both** owner roles,
provides transactional ordering, pre/post SELECT-only checks, a fail-fast-guarded draft migration, rollback,
and a controlled runtime test plan. The SELECT-only verification file passes the static safety scan; the
draft migration is unexecuted and guarded.

Residual items are **execution-time**, not design defects: Q2 (direct-Postgres reachability) and Q4
(`supabase_admin` default-ACL alteration privilege) must be confirmed in `yav2-dev` at execution, and the
runtime test plan must pass, **all under separate PJ authorisation**. No exploitability is asserted.
