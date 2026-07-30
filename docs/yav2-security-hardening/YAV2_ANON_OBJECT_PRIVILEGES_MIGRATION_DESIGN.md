# YAV2 Portal V2 — Anon Object-Privileges — Migration Design

**Status:** **DESIGN ONLY — NOT AUTHORISED, NOT EXECUTED.** No SQL run; no privilege changed; no migration
applied. Execution requires **separate, explicit PJ approval** and must target **`yav2-dev` only**.
**Governing:** `sync/integration` @ `231fa39b608f6def9e6ed4b45ce5feb417c6f74f`.
**Scope:** the 28 tables in `YAV2_ANON_OBJECT_PRIVILEGES_SCOPE_AND_IMPACT_REPORT.md` §2.
**Proposed statements (design proposal, moved OUT of `supabase/migrations/`; NOT run):**
`supabase/design/YAV2_ANON_OBJECT_PRIVILEGES_HARDENING_PROPOSED.sql`.

---

## 1. Objective — TWO STAGES (Stage A must not silently include Stage B)

Bring `anon` to an **explicit least-privilege** posture and stop future objects from re-inheriting broad
anon grants — **without** touching `authenticated` or `service_role`. The work is split into two separately
authorised stages:

- **STAGE A — REQUIRED, HIGH.** Revoke anon **object-level** `TRUNCATE / REFERENCES / TRIGGER / MAINTAIN`
  on the 28 tables **and** correct **future default object-level** privileges. These are **not** mediated by
  RLS/FORCE; this is the core remediation of R-ANON-OBJECT-PRIVILEGES.
- **STAGE B — OPTIONAL, defence-in-depth.** Revoke anon **data-level** `SELECT / INSERT / UPDATE / DELETE`
  and correct future default data privileges. RLS already denies anon (no anon policy; anon not
  `BYPASSRLS`), so Stage B is **runtime-neutral** — but it **must not run** until the Runtime Test Plan
  proves no legitimate public flow depends on anon data privileges **and** PJ separately approves.

Each stage is its **own transaction with its own fail-fast guard** in the proposal SQL, so Stage A can be
applied without Stage B and **Stage A never silently includes Stage B**.

---

## 2. Treatment — object-level (Stage A) vs data-level (Stage B)

### 2.1 STAGE A — object/administrative privileges (the core remediation)
`REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON <table> FROM anon;`  (× 28)
- **Not** mediated by RLS/FORCE; primary remediation. `MAINTAIN` is PostgreSQL-17 — included explicitly.
- Plus the Stage-A default correction (§4.1).

### 2.2 STAGE B — data privileges (defence-in-depth; runtime-neutral, gated)
`REVOKE SELECT, INSERT, UPDATE, DELETE ON <table> FROM anon;`  (× 28)
- RLS already denies anon at row level, so this is **runtime-neutral**, converting an implicit block
  (policy-absence) into an explicit least-privilege posture. Plus the Stage-B default correction (§4.2).
- **Gate:** run only after Runtime Test Plan passes + separate PJ approval.

> **No shorthand.** The proposal deliberately does **not** use `REVOKE ALL FROM anon` (which would collapse
> the two stages). Object- and data-level revokes are separate statements in separate stages/transactions so
> Stage A cannot silently perform Stage B.

### 2.3 PUBLIC
Table-level `PUBLIC` grants: **none exist** in the evidence (`G1` grantees are only anon/authenticated/
service_role). No `PUBLIC` revoke is required; a defensive one would be a documented no-op.

---

## 3. `authenticated` and `service_role` — PRESERVED

- **`authenticated`** — the application's real, RLS-governed data path. **Not modified.** (Its own
  object-level privileges are a separate, lower-priority item — Scope §7 Q3 — deliberately out of scope.)
- **`service_role`** — server/Edge role (`BYPASSRLS`), used by Edge Functions and maintenance. **Not
  modified.** Its control remains secret-handling (R-SVC).
- The migration issues **zero** `GRANT`/`REVOKE` against `authenticated` or `service_role`.

---

## 4. Default-privilege correction (future objects) — staged + owner-execution gate

The default ACL that re-grants anon is owned by **two roles** (evidence `G11` /
`YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql` `[DEF-PRE1]`): **`postgres`** and **`supabase_admin`**,
each granting anon on future `public` tables. Both scopes must be corrected or a future `CREATE TABLE` by the
missed owner re-introduces the finding. The correction is **split to match the stages**:

### 4.1 Stage-A default correction (object-level)
```
ALTER DEFAULT PRIVILEGES FOR ROLE postgres       IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon;
```
### 4.2 Stage-B default correction (data-level)
```
ALTER DEFAULT PRIVILEGES FOR ROLE postgres       IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon;
```
Only `anon` is removed; `authenticated`/`service_role` defaults are preserved.

### 4.3 Owner-execution gate (deterministic; execution-time — permission NOT assumed)

For **each** owner scope, the decision flow is fixed and documented (no `SET ROLE`, no dynamic escalation):

| Scope | Evidence | Executing role | Required authority | Success condition | STOP condition | Fallback |
|---|---|---|---|---|---|---|
| **`postgres`** | `[DEF-PRE1]` row `default_for_role=postgres`, anon object/data default rows > 0 | the migration role **iff** it is a member of / owns `postgres` | may `ALTER DEFAULT PRIVILEGES FOR ROLE postgres` | `ALTER` returns no error; `[DEF-POST-A]`/`[DEF-POST-B]` = 0 for postgres | permission error → **abort the stage** (transaction rolls back); no `SET ROLE`, no escalation | if the migration role lacks authority, treat as the `supabase_admin` fallback |
| **`supabase_admin`** | `[DEF-PRE1]` row `default_for_role=supabase_admin`, anon default rows > 0 | requires membership of / running as `supabase_admin` | may `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` | `ALTER` returns no error; `[DEF-POST-*]` = 0 for supabase_admin | if migration role lacks authority the `ALTER` fails → **abort/rollback the stage**; do **not** force | apply this scope's correction via the **Supabase-supported mechanism** (dashboard/support/platform role) as a **separate PJ-authorised step**, then re-run the SELECT-only `[DEF-POST-*]`. Until then this scope is a **KNOWN OPEN GATE**; existing-table REVOKEs (§2) are unaffected. |

**Rule:** permission is never assumed. If either `ALTER DEFAULT PRIVILEGES` cannot run under the migration
role's real authority, the operator **STOPS** and escalates to PJ. This gate is carried into the proposal SQL
as the `§ OWNER-EXECUTION DESIGN` comment block.

---

## 5. Ordering, transaction boundaries — two stages, two transactions

- **Stage A transaction** (`BEGIN; … COMMIT;`, atomic): pre-checks → object REVOKEs (28 × §2.1) →
  Stage-A default correction (§4.1) → Stage-A post-check (object-level residual = 0).
- **Stage B transaction** (separate `BEGIN; … COMMIT;`, atomic; **separate guard**): pre-checks → data
  REVOKEs (28 × §2.2) → Stage-B default correction (§4.2) → Stage-B post-check (total anon residual = 0).
- Stage B runs **only** after Stage A + Runtime Test Plan pass + separate PJ approval.
- No dependency ordering between tables (each independent); listing is alphabetical for auditability.
- GRANT/REVOKE and `ALTER DEFAULT PRIVILEGES` are transactional in PostgreSQL, so a failed post-check or a
  permission STOP rolls the whole stage back.

---

## 6. Rollback design — per stage

- **Stage A rollback:** `GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON <table> TO anon;` (×28) +
  restore the Stage-A default (`ALTER DEFAULT PRIVILEGES … GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN …`)
  for both owner scopes.
- **Stage B rollback:** `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO anon;` (×28) + restore the
  Stage-B default for both owner scopes.
- Each `REVOKE` has an exact paired `GRANT`. Rollbacks are authored as **paired scripts** and included as
  **comments** in the proposal SQL. Stage B is runtime-neutral, so its rollback is chiefly a safety net.

---

## 7. Pre-checks and post-checks (SELECT-only; see the verification kit) — per stage

**Pre-checks:** all 28 tables exist as base tables; anon holds the expected object-level (Stage A) /
data-level (Stage B) privileges (guards against catalog drift); `authenticated`/`service_role` baseline
captured; `[DEF-PRE1]` shows anon defaults present for **both** owner scopes.

**Post-checks:**
- **After Stage A:** `[A-POST1]` anon object-level residual = **0**; `[DEF-POST-A]` anon object default rows
  = **0** for both owners; `[BASE1]` authenticated/service_role **unchanged**; `[HYG1]` RLS=39 / anon-policy
  =0 / auth_all=0 unchanged.
- **After Stage B:** `[B-POST1]` total anon residual = **0**; `[DEF-POST-B]` anon default rows = **0** for
  both owners; `[BASE1]` unchanged; `[HYG1]` unchanged.

The executable pre/post assertions are provided **SELECT-only** in
`supabase/verification/YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql` (no `SET ROLE`, no app-function
calls, no sensitive values, MAINTAIN explicit). Runtime behavioural checks are in the Runtime Test Plan.

---

## 8. What this design does NOT do

- Does **not** execute anything, create a live migration, or change any privilege.
- Does **not** touch `authenticated` or `service_role`.
- Does **not** alter RLS/policies (the row-level posture is already correct — G5=0/G6=0/RLS on 39).
- Does **not** address R-SVC, R-OWN, R-SP, R-G05 (separate residuals).
- Requires **separate PJ approval** and `yav2-dev`-only execution with the paired rollback ready.
