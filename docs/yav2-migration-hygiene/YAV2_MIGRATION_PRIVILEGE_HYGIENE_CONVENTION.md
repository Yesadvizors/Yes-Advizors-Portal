# YAV2 Portal V2 — New Public Table Privilege-Hygiene Convention

**Status:** authoritative convention (documentation + enforced by CI). **No Supabase access, no SQL executed
by this document.** Governing base: `sync/integration` @ `cabbd9e2f70d8b0cb763953ecfdc661142eec0bd`.

> **This convention makes an existing, already-well-applied practice non-optional.** Migrations `0015` and
> `0021` already follow it; this document + the CI guard ensure every *future* migration does too, so no new
> public table can silently reintroduce the anon object-privilege finding that Stage A is remediating for
> existing tables. **It does not change any existing table or default privilege, and is independent of the
> on-hold Stage A execution.**

---

## 1. The rule

Any migration that runs `CREATE TABLE public.<t>` **must**, in the **same** migration file, **provably** do all
three for **every** created table:

1. **Revoke the anon object privileges** — `TRUNCATE, REFERENCES, TRIGGER, MAINTAIN` — from `anon`.
   Satisfied by either:
   - `REVOKE ALL ON public.<t> FROM PUBLIC, anon;` (covers object **and** data privileges), or
   - `REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.<t> FROM anon;` (object-level only), or
   - a **provable** dynamic loop (see §1a).
2. **Dispose of the anon data privileges** — `SELECT, INSERT, UPDATE, DELETE` — **per table**, by **either**:
   - **revoking all four from `anon`** (`REVOKE ALL … FROM … anon` or an explicit four-privilege REVOKE), **or**
   - carrying the **exact TABLE-SPECIFIC** marker (a comment) **together with RLS enabled on that table**:
     ```
     -- YAV2-ANON-DATA-ACCESS: public.<table_name> INTENTIONAL-RLS-GOVERNED
     ```
   The marker applies **only** to the exact `public.<table_name>` it names — it **never** waives another table,
   and a marker naming a table not created in the migration grants **no** waiver. If a created table has neither
   a data revoke nor its **own** valid marker (with RLS), the check **fails**. The marker only waives the *data*
   revoke, **never** the object revoke (rule 5) — RLS is not a substitute for the object-level revoke.
3. **Enable RLS** — `ALTER TABLE public.<t> ENABLE ROW LEVEL SECURITY;` (static or a **provable** dynamic loop).

**Recommended (warned, not failed, by CI):**
4. **Force RLS** — `ALTER TABLE public.<t> FORCE ROW LEVEL SECURITY;` so the table owner is not exempt.
5. **Anon post-check** — a `DO $$ … has_table_privilege('anon', …) … RAISE EXCEPTION … $$;` block that fails
   the migration if any anon privilege survives (see `0015` for the reference pattern).

### 1a. Dynamic loops must PROVE they cover every created table

A dynamic loop counts **only** when the checker can statically resolve the loop's table list and that list
includes the created table. Resolvable forms:
- inline `FOREACH t IN ARRAY ARRAY['a','b'] LOOP … format('REVOKE ALL ON public.%I FROM PUBLIC, anon', t) …`,
- a named array variable `all_new text[] := ARRAY['a','b', …]` iterated by `FOREACH t IN ARRAY all_new`.

A loop over an **unresolvable** source (e.g. `FOR t IN SELECT tablename FROM pg_tables …`) proves nothing on its
own. In that case coverage **requires** a **recognised in-migration residual post-check** — a RAISE-guarded
block that iterates a **resolvable** array including every created table and asserts
`has_table_privilege('anon', …)` is false (and, for RLS, checks `relrowsecurity`). If a loop covers only some
created tables and no post-check covers the rest, the check **fails** for the uncovered tables.

**Ownership / schema expectations:** create tables as the standard migration role (owner `postgres`) in schema
`public`. Do **not** rely on `ALTER DEFAULT PRIVILEGES` to protect new tables — the standing default ACLs for
`postgres` **and** `supabase_admin` re-grant `anon` on future tables (this is the exact Stage A finding), so
the per-table `REVOKE` above is the authoritative control until Stage A closes both default scopes.

---

## 2. Why (grounding)

- The live discrepancy-closure evidence showed `anon` holding `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` on all
  existing app tables, and object-level **default** grants for both `postgres` and `supabase_admin` owners —
  meaning **new** tables inherit the same anon object privileges unless the author revokes them.
- Stage A remediates the **existing** tables + default ACLs (Part A/B, currently on hold pending Supabase).
- This convention closes the **forward** gap: it stops each new migration from reopening the finding, and it is
  enforceable **without** any database authority (it is a static check on migration text).

## 3. Scope of enforcement

- The CI guard evaluates only migrations **added or modified in a PR** (`git diff --diff-filter=AM base...head`)
  under `supabase/migrations/` (excluding `*rollback*`). Adding a `CREATE TABLE public.*` to an edited migration
  is therefore also caught.
- It deliberately does **not** re-audit the pre-convention foundational migrations (`0002`–`0007`): those
  existing tables are the Stage A surface, tracked in the gap register, not a CI failure.
- **Object-level revoke is mandatory. Data-level disposition is mandatory** — either revoke the four data
  privileges from `anon`, or use the exact **table-specific** marker
  `-- YAV2-ANON-DATA-ACCESS: public.<table> INTENTIONAL-RLS-GOVERNED` **with** RLS on that table. A marker is
  scoped to the one table it names. Record any marker use in the migration and the PR REVIEW PACK.

## 4. How to comply (author checklist)

- [ ] Every `CREATE TABLE public.<t>` has a provable anon object-privilege `REVOKE` in-file.
- [ ] Data privileges revoked from `anon`, **or** the exact table-specific
      `-- YAV2-ANON-DATA-ACCESS: public.<table> INTENTIONAL-RLS-GOVERNED` marker is present for **that** table
      **with** RLS enabled.
- [ ] Any dynamic loop resolves to a table list covering every created table (or a residual post-check does).
- [ ] `ENABLE ROW LEVEL SECURITY` on each new table.
- [ ] `FORCE ROW LEVEL SECURITY` (recommended).
- [ ] Anon post-check block (recommended).
- [ ] Reuse the snippet: `docs/yav2-migration-hygiene/NEW_PUBLIC_TABLE_HYGIENE_SNIPPET.sql`.
- [ ] After deploy, run the SELECT-only verifier:
      `supabase/verification/YAV2_MIGRATION_HYGIENE_POST_MIGRATION_SELECT_ONLY.sql`.

## 5. Enforcement & verification

- **CI:** `.github/scripts/check_migration_hygiene.mjs`, wired via `.github/workflows/migration-hygiene.yml`
  (PRs to `main` and `sync/integration` touching `supabase/migrations/**`). A missing REVOKE or RLS on an added
  public table **fails the check**.
- **Local:** `node --test tests/migrationHygiene.test.js`.
- **Post-migration (SELECT-only, no execution here):** the verifier asserts new public tables hold **0** anon
  object-privilege rows and RLS is enabled.

## 6. Relationship to Stage A

This convention is **complementary and independent**. Stage A closes the existing-table and default-ACL
exposure via privileged execution (on hold). This guard prevents **new** exposure and needs no privileged
authority. Neither blocks the other. **Stage A remains OPEN and must not be represented as complete.**
