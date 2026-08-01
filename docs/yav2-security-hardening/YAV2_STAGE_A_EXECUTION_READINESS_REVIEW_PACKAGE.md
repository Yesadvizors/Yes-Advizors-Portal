# YAV2 Portal V2 — Stage A — Execution-Readiness Review Package

> ## PATH 2 — SPLIT EXECUTION SELECTED (2026-07-30)
> F2: `cu_is_superuser=false`, `eligible_for_postgres_default_alter=true`,
> `eligible_for_supabase_admin_default_alter=false`. **PATH 1 rejected; PATH 3 not selected; execution
> UNAUTHORISED.** **Part A** = 28 existing-table object REVOKEs + `postgres` default (eligible). **Part B** =
> `supabase_admin` default only (current identity **INELIGIBLE** → Supabase-supported mechanism + separate PJ
> approval/evidence). **No combined atomic path permitted.** Part A is **not** full closure; future-table
> protection stays **INCOMPLETE** until Part B PASSES; **full Stage A closure requires BOTH Part A and Part B
> PASS** + verification. **A1–F1 evidence still required. Stage B EXCLUDED.** Old combined candidates
> **SUPERSEDED** (see §1).

**Reviewer:** Claude (authoring self-review). **Status:** **READINESS REVIEW — design/documentation only; no
Supabase access, no SQL executed, no privilege changed, no migration run, no deployment.**
**Scope:** Stage A only — revoke anon object-level `TRUNCATE / REFERENCES / TRIGGER / MAINTAIN` + object-level
default correction. **Stage B (SELECT/INSERT/UPDATE/DELETE) is out of scope and NOT present.**
**Governing:** `sync/integration` @ `370dd95d470bf1baa096f61a64409dd1259e2a04`.
**Authorised future-execution env:** `yav2-dev` / `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1/Prod `zcszesuvjrryxtigjglt`.

---

## 1. Package inventory (7 files)

| # | Path | Role |
|---|---|---|
| 1 | `supabase/readiness/YAV2_STAGE_A_ANON_OBJECT_PRIVILEGES_MIGRATION_CANDIDATE.sql` | Stage A migration candidate (guarded, not run) |
| 2 | `supabase/readiness/YAV2_STAGE_A_ANON_OBJECT_PRIVILEGES_ROLLBACK_CANDIDATE.sql` | Exact-inverse rollback (guarded, not run) |
| 3 | `docs/yav2-security-hardening/YAV2_STAGE_A_EXECUTION_ROLE_AND_AUTHORITY_DECISION.md` | Owner-scope authority decision & gate |
| 4 | `docs/yav2-security-hardening/YAV2_STAGE_A_PRE_RUN_CHECKLIST.md` | Pre-run checklist + hard STOPs |
| 5 | `docs/yav2-security-hardening/YAV2_STAGE_A_CONTROLLED_RUNBOOK_YAV2_DEV.md` | Operator runbook (PJ-only exec step) |
| 6 | `docs/yav2-security-hardening/YAV2_STAGE_A_RUNTIME_TEST_EVIDENCE_TEMPLATE.md` | Runtime evidence template |
| 7 | `docs/yav2-security-hardening/YAV2_STAGE_A_EXECUTION_READINESS_REVIEW_PACKAGE.md` | This review |

Candidates live under **`supabase/readiness/`** — deliberately **not** in `supabase/migrations/`.

---

## 2. Exact scope (from merged EXACT live evidence)

Source: `docs/yav2-discrepancy-closure/evidence/YAV2_DISCREPANCY_CLOSURE_LIVE_RESULT_EXACT_2026-07-30_1115_IST.json`
(SHA `8fe16665…`). Stage-A facts:

- **28 tables**, each with anon holding all four object-level privileges → **112 object-level anon rows**
  (28 × 4, MAINTAIN included).
- Object-level anon **default** grant present for **both** `postgres` and `supabase_admin`.
- `authenticated` and `service_role` each hold all four object privileges on all 28 (→ **preserve**; 112 each).
- Data privileges: anon holds all four on all 28 (**112**) — **preserved** by Stage A.
- RLS = 39 · G5 = 0 · G6 = 0 · anon not `BYPASSRLS` · anon cannot CREATE in `public`.

The 28 tables: `accounting_tracker, audit_event_contract, audit_ingestion_failures, audit_log,
audit_tracker, claude_usage_log, client_directors, client_financials, clients, completed_documents,
compliance_calendar, ct_team_members, documents, extracted_document_data, financial_years,
financials_tracker, follow_ups, gst_tracker, income_tax_tracker, llp_tracker, notice_tracker,
payroll_tracker, roc_tracker, tasks, tds_client_config, tds_tracker, team, trust_ngo_tracker`.

---

## 3. Assumptions

1. SPA authenticates before data access; no product flow uses anon object privileges (→ Stage A transparent).
2. PostgREST does not expose `TRUNCATE`/DDL over HTTP; anon object-privilege reach is a direct Postgres path
   (reachability undetermined — runtime).
3. `authenticated`/`service_role` are the legitimate data/server paths → preserved.
4. `yav2-dev` PITR/backup available as a reversibility backstop beyond SQL rollback.

---

## 4. Unresolved execution gates

- **G-AUTH-postgres.** Can the executing role `ALTER DEFAULT PRIVILEGES FOR ROLE postgres`? **Resolved by the
  read-only authority-discovery evidence** (`[F2] eligible_for_postgres_default_alter`), not assumed.
- **G-AUTH-supabase_admin.** Most likely blocker — ordinary migration roles are usually not members of
  `supabase_admin`. **Resolved by the discovery evidence** (`[F2] eligible_for_supabase_admin_default_alter`).
  If false → split path / Supabase-supported mechanism.
- **G-RUNTIME.** anon object-privilege reachability + regression behaviour require the runtime tests.
- **Decision required:** PATH 1 (single atomic) vs PATH 2 (split) vs PATH 3 (blocked), determined by the
  live authority discovery — see below.

> **AUTHORITY DISCOVERY ADDED (read-only).** A SELECT-only discovery kit and its runbook/decision template are
> now part of the hardening set:
> `supabase/verification/YAV2_STAGE_A_EXECUTION_AUTHORITY_DISCOVERY_SELECT_ONLY.sql`,
> `docs/yav2-security-hardening/YAV2_STAGE_A_EXECUTION_AUTHORITY_DISCOVERY_RUNBOOK.md`,
> `docs/yav2-security-hardening/YAV2_STAGE_A_EXECUTION_AUTHORITY_DECISION_TEMPLATE.md`. They report
> `current_user`, role attributes, memberships, default-ACL ownership, table ownership, and the authority
> inputs (`pg_has_role` / superuser) — **without testing permission or altering anything**.

---

## 5. Migration & rollback safety review

**Migration candidate** — atomic single transaction with: fail-fast guard; precondition checks (28 tables;
anon object=112; anon data=112 preserved; auth/svc object=112/112; default owners=2); 28 object-only
`REVOKE … FROM anon`; 2 object-level `ALTER DEFAULT PRIVILEGES` (postgres + supabase_admin); postcondition
checks (anon object=0; anon data still 112; auth/svc still 112/112; default object anon=0). Any deviation or
authority STOP → rollback. **No data-privilege revoke; no authenticated/service_role GRANT/REVOKE; no SET
ROLE; Stage B absent.**

**Rollback candidate** — exact inverse: 28 object-only `GRANT … TO anon` on the same tables + 2 object-level
`ALTER DEFAULT … GRANT`, with a post-check restoring 112 anon object rows. Touches **anon only**.

---

## 6. Static scans

| Check | Migration candidate | Rollback candidate |
|---|---|---|
| Table statements to anon | **28** `REVOKE … FROM anon` | **28** `GRANT … TO anon` |
| Privileges per statement | exactly `TRUNCATE, REFERENCES, TRIGGER, MAINTAIN` (0 deviations) | exactly `TRUNCATE, REFERENCES, TRIGGER, MAINTAIN` (0 deviations) |
| Data-privilege statements (S/I/U/D) | **0** | **0** |
| `authenticated`/`service_role` GRANT/REVOKE | **0** (only read-only baseline checks reference these roles) | **0** |
| `MAINTAIN` included | **yes** | **yes** |
| `SET ROLE` / `SET SESSION AUTHORIZATION` (statements) | **none** (only the `-- NO SET ROLE` comment) | **none** (comment only) |
| Explicit 28-table scope | **28 distinct tables** | **28 distinct tables** (identical set) |
| `ALTER DEFAULT PRIVILEGES` (forward) | **2** (postgres + supabase_admin, object-level) | **2** (GRANT restore) |
| Rollback is exact inverse of migration | — | **yes** (same 28 tables, same 4 privileges, inverse verb) |
| Transaction boundary | 1 × `BEGIN … COMMIT` (atomic) | 1 × `BEGIN … COMMIT` |
| Fail-fast guard | present | present |
| Executed? | **NO** — file only; guard would abort | **NO** — file only; guard would abort |
| SHA-256 | `aeea6131f0ca1ccb2593f8fae9df0401fd0a9d9882a18e71e287cd1ceb1dd31f` | `c16caaf04ff7fd665ae5b3cf712cd0d28ddf6e78cbf58999813903c314d5e203` |

The SELECT-only verification kit (`YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql`, from the merged
design package) supplies the pre/post assertions and remains SELECT/WITH-only (no SET ROLE, no app-function,
no sensitive values).

---

## 7. Boundary confirmation

| Control | Status |
|---|---|
| No Supabase / MCP DB access | ✔ |
| No SQL executed | ✔ (candidates and kit are files only) |
| No migration run / no privilege changed / no deployment | ✔ |
| Candidates NOT under `supabase/migrations/` | ✔ (`supabase/readiness/`) |
| Stage B not present / not started | ✔ |
| authenticated / service_role preserved | ✔ (0 GRANT/REVOKE against them) |
| Exact evidence unaltered | ✔ (`8fe16665…`) |
| PR #35 untouched | ✔ |
| V1/Prod referenced only as prohibited | ✔ |

---

## 8. Recommendation — execution readiness

> **AUTHORITY DISCOVERY A1–F2 COMPLETE (2026-07-31).** The full authority evidence is captured
> (`evidence/YAV2_STAGE_A_EXECUTION_AUTHORITY_A1_F2_RAW_CAPTURE_TEMPLATE_2026-07-31.md`) and **CONFIRMS
> PATH 2**: identity `postgres` (not superuser), owns all 28 tables, **eligible for the `postgres` default**
> but **ineligible for the `supabase_admin` default**. **No Stage A execution has occurred; no privilege
> changed; Part A and Part B remain unexecuted; Part B still requires an authorised Supabase-supported
> mechanism.** PR #38 remains **Draft**; this package is **execution-readiness documentation only**.
> **All authority-evidence blocks A1–F2 are captured. The [D1] block is 100 rows captured verbatim, but
> incomplete/truncated relative to the full default-ACL catalogue; decisive public-scope facts are supplied by
> the focused reconciliation evidence.** *(NB: §5/§6 SQL detail below describes the now-**superseded** combined
> candidate; the governing executable design is the four PATH 2 files under `supabase/readiness/` — Part A/B
> candidate + rollbacks.)*

> **PUBLIC-SCOPE CONFIRMED (focused reconciliation, authoritative):** the focused SELECT-only default-ACL
> reconciliation (`evidence/YAV2_STAGE_A_DEFAULT_ACL_FOCUSED_RECONCILIATION_RAW_2026-07-31.json`) confirms
> **`postgres`/`public`/`anon` = 4** and **`supabase_admin`/`public`/`anon` = 4** object-level defaults.
> **[D2] is confirmed; Part B's `IN SCHEMA public` scope is valid; Part A is confirmed.** The 100-row [D1]
> export was an incomplete/truncated catalogue capture (missing the `supabase_admin`/`public` and
> `graphql_public` rows); it is preserved verbatim and does not contradict the focused evidence. `graphql` /
> `graphql_public` defaults exist but are **outside Stage A** and remain untouched.

**PASS (execution-readiness documentation)** — the authority evidence A1–F2 is complete and recorded verbatim,
and the focused reconciliation confirms the public-scope facts. The four PATH 2 SQL files are consistent with
the evidence (Part A = existing-table object REVOKEs + `postgres`/`public` default; Part B = `supabase_admin`/
`public` default only; rollbacks restore only their part). **This is readiness, not authorisation.** Execution
requires separate explicit PJ authorisation; Part B additionally requires the Supabase-supported mechanism;
**Stage B excluded.**

- The Part A candidate and rollback are correct, minimal, object-level-only, MAINTAIN-inclusive, 28-table
  explicit, guarded, atomic, with pre/post checks; authenticated/service_role and anon data are preserved;
  Stage B is absent; the rollback is an exact inverse. The verification kit is SELECT-only.
- **Authority evidence A1–F2 is fully captured (no outstanding block)** and the public-scope facts are
  confirmed by the focused reconciliation. The owner-authority gate is settled: identity `postgres` is
  **eligible** for the `postgres`-owned default and **ineligible** for the `supabase_admin`-owned default →
  **PATH 2**. Authority is taken from membership/superuser facts, not from role names, CREATE, or
  schema/table ownership.
- No exploitability is asserted. Runtime tests (Evidence Template) must pass. `yav2-dev` only; no Stage B; no
  Production; no deployment. **Nothing is authorised to execute until PJ records the path decision from the
  live authority evidence.**
