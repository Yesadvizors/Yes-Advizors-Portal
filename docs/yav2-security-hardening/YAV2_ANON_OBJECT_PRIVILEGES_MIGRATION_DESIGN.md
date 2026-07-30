# YAV2 Portal V2 — Anon Object-Privileges — Migration Design

**Status:** **DESIGN ONLY — NOT AUTHORISED, NOT EXECUTED.** No SQL run; no privilege changed; no migration
applied. Execution requires **separate, explicit PJ approval** and must target **`yav2-dev` only**.
**Governing:** `sync/integration` @ `231fa39b608f6def9e6ed4b45ce5feb417c6f74f`.
**Scope:** the 28 tables in `YAV2_ANON_OBJECT_PRIVILEGES_SCOPE_AND_IMPACT_REPORT.md` §2.
**Draft statements:** `supabase/migrations/DRAFT_ONLY_YAV2_ANON_OBJECT_PRIVILEGES_HARDENING.sql` (not run).

---

## 1. Objective

Bring `anon` to an **explicit least-privilege** posture on the 28 tables and stop future objects from
re-inheriting broad anon grants — **without** touching `authenticated` or `service_role`.

Two independent changes:
- **(A) Existing tables:** revoke anon privileges on the 28 tables.
- **(B) Future tables:** correct the standing default privileges so new tables do not re-grant anon.

---

## 2. Treatment — data privileges vs object privileges (kept separate)

Per the requirement, the two privilege classes are treated as distinct statements so each is independently
auditable and independently reversible, even though the end state is "anon holds nothing on these tables".

### 2.1 Object/administrative privileges (the core of R-ANON-OBJECT-PRIVILEGES)
`REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON <table> FROM anon;`
- These are **not** mediated by RLS/FORCE; this is the primary remediation.
- `MAINTAIN` is PostgreSQL-17; include it explicitly.

### 2.2 Data privileges (defence-in-depth; runtime-neutral)
`REVOKE SELECT, INSERT, UPDATE, DELETE ON <table> FROM anon;`
- RLS already denies anon at row level (no anon policy; anon not `BYPASSRLS`), so this is **runtime-neutral**
  but converts an implicit block (policy-absence) into an explicit least-privilege posture.

> **Equivalent shorthand:** `REVOKE ALL ON <table> FROM anon;` achieves both 2.1 and 2.2 in one statement.
> The draft keeps them as **two explicit statements per table** so the object-privilege remediation is
> visibly separated from the (optional, defence-in-depth) data-privilege revoke and can be applied or rolled
> back independently.

### 2.3 PUBLIC
Table-level `PUBLIC` grants: **none exist** in the evidence (`G1` grantees are only anon/authenticated/
service_role). A defensive `REVOKE ALL ON <table> FROM PUBLIC;` is a **no-op** today; include it only if a
belt-and-suspenders posture is desired (documented as no-op).

---

## 3. `authenticated` and `service_role` — PRESERVED

- **`authenticated`** — the application's real, RLS-governed data path. **Not modified.** (Its own
  object-level privileges are a separate, lower-priority item — Scope §7 Q3 — deliberately out of scope.)
- **`service_role`** — server/Edge role (`BYPASSRLS`), used by Edge Functions and maintenance. **Not
  modified.** Its control remains secret-handling (R-SVC).
- The migration issues **zero** `GRANT`/`REVOKE` against `authenticated` or `service_role`.

---

## 4. Default-privilege correction (future objects)

The default ACL that re-grants anon is owned by **two roles** (`G11`): `postgres` and `supabase_admin`.
Both must be corrected, or a future `CREATE TABLE` by the missed owner re-introduces the finding:

```
ALTER DEFAULT PRIVILEGES FOR ROLE postgres       IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin  IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
```

- **Only `anon`** is removed from the defaults; `authenticated`/`service_role` defaults are preserved (the
  app relies on new tables being reachable by authenticated flows / server role).
- **Privilege note:** `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` must be executed with sufficient
  privilege (as a superuser/owner or member of that role). This is an **execution-time dependency** to
  confirm in `yav2-dev`; if `supabase_admin`'s defaults cannot be altered from the migration role, that
  correction is applied via the Supabase-supported mechanism instead — **flagged as an open execution
  question**, not resolved here.

---

## 5. Ordering, transaction boundaries

1. **Single transaction** (`BEGIN; … COMMIT;`) wrapping all statements → the change is atomic (all-or-nothing).
   GRANT/REVOKE and `ALTER DEFAULT PRIVILEGES` are transactional in PostgreSQL.
2. Order inside the transaction:
   1. **Pre-checks** (SELECT-only assertions; abort on mismatch) — see §7.
   2. **Object-privilege REVOKEs** (28 × §2.1).
   3. **Data-privilege REVOKEs** (28 × §2.2).
   4. **Default-privilege correction** (§4, both owner roles).
   5. **Post-checks** (SELECT-only assertions; abort/raise on any residual anon privilege).
3. No dependency ordering between tables (each table independent); listing is alphabetical for auditability.

---

## 6. Rollback design

- **Exact inverse.** Every `REVOKE` has a paired `GRANT`; the rollback re-grants anon the prior privileges on
  the 28 tables and restores the default privilege:
  ```
  GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON <table> TO anon;   -- ×28
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres      IN SCHEMA public GRANT ALL ON TABLES TO anon;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
  ```
- Rollback is authored as a **paired script** (not embedded execution) and is included as **comments** in
  the draft migration.
- Because the forward change is runtime-neutral for data privileges (RLS already denies), rollback is
  primarily a safety net for the object-privilege revoke and the default correction.

---

## 7. Pre-checks and post-checks (SELECT-only; see the verification kit)

**Pre-checks (must pass before REVOKE):**
- All 28 named tables exist in `public` and are base tables.
- `anon` currently holds the expected privileges (matches the scope register) — guards against acting on a
  drifted catalog.
- `authenticated`/`service_role` hold their current grants (baseline captured for post-check comparison).

**Post-checks (must pass after REVOKE, else roll back):**
- `anon` holds **zero** privileges on all 28 tables (incl. `MAINTAIN`).
- `authenticated` and `service_role` privileges are **unchanged** from the pre-check baseline.
- Default privileges no longer grant `anon` on tables for `postgres` **and** `supabase_admin`.
- RLS state unchanged (still enabled on all 39); `G5`/`G6` still 0.

The executable pre/post assertions are provided **SELECT-only** in
`supabase/verification/YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql` (no `SET ROLE`, no app-function
calls, no sensitive values). Runtime behavioural checks are in the Runtime Test Plan.

---

## 8. What this design does NOT do

- Does **not** execute anything, create a live migration, or change any privilege.
- Does **not** touch `authenticated` or `service_role`.
- Does **not** alter RLS/policies (the row-level posture is already correct — G5=0/G6=0/RLS on 39).
- Does **not** address R-SVC, R-OWN, R-SP, R-G05 (separate residuals).
- Requires **separate PJ approval** and `yav2-dev`-only execution with the paired rollback ready.
