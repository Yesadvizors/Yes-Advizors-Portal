# YAV2 Portal V2 — Migration Privilege-Hygiene Gap Register

**Status:** read-only analysis record. **No Supabase access, no SQL executed.** Governing base:
`sync/integration` @ `cabbd9e2f70d8b0cb763953ecfdc661142eec0bd`. Produced by a static scan of
`supabase/migrations/*.sql` (excluding `*rollback*`), method =
`.github/scripts/check_migration_hygiene.mjs` / `tests/migrationHygiene.test.js`.

> **Enforcement model (tightened):** object-privilege revoke **and** data-privilege disposition (revoke, or the
> exact **table-specific** `-- YAV2-ANON-DATA-ACCESS: public.<table> INTENTIONAL-RLS-GOVERNED` marker with RLS,
> scoped to the one table it names) **and** RLS are all required, per created table. Dynamic loops count only when their table list is statically resolvable and covers every
> created table; otherwise a resolvable residual post-check is required. The CI guard evaluates only migrations
> **added or modified** in a PR (`git diff --diff-filter=AM base...head`). **0015 and 0021 remain COMPLIANT
> under this stricter proof** (both use `REVOKE ALL … FROM PUBLIC, anon`, resolvable arrays, and post-checks).

> **CORRECTED FACTUAL BASELINE (authoritative):**
> - **Migration `0015` is COMPLIANT.**
> - **Migration `0021` is COMPLIANT.**
> - **The current deficiency is the absence of automated enforcement — NOT a known live migration violation.**
> Recent authors apply the convention correctly by hand; nothing guarantees the next migration will, and no CI
> check would catch an omission. This register + the CI guard close that enforcement gap.

---

## 1. Per-migration findings (all migrations that create `public` tables)

| Migration | Tables | anon object REVOKE | anon data REVOKE | ENABLE RLS | FORCE RLS | anon post-check | Classification |
|---|---:|:---:|:---:|:---:|:---:|:---:|---|
| `0002_tables_people_and_clients.sql` | 4 | ✗ in-file | ✗ in-file | ✗ (via `0006`) | ✗ | ✗ | **Pre-convention foundational → Stage A surface** |
| `0003_tables_work_and_documents.sql` | 8 | ✗ in-file | ✗ in-file | ✗ (via `0006`) | ✗ | ✗ | **Pre-convention foundational → Stage A surface** |
| `0004_tables_compliance_trackers.sql` | 8 | ✗ in-file | ✗ in-file | ✗ (via `0006`) | ✗ | ✗ | **Pre-convention foundational → Stage A surface** |
| `0005_audit_phase4b.sql` | 3 | ✗ in-file | ✗ in-file | ✓ | ✗ | ✗ | **Pre-convention (audit) → Stage A surface** |
| `0007_dependency_closure.sql` | 5 | ✗ in-file | ✗ in-file | ✓ | ✗ | ✗ | **Pre-convention foundational → Stage A surface** |
| `0015_m1a_client_master_foundation.sql` | 9 | ✓ (loop `REVOKE ALL … FROM PUBLIC, anon`) | ✓ | ✓ (loop) | ✓ | ✓ | **COMPLIANT** |
| `0021_service_applicability.sql` | 2 | ✓ (static `REVOKE ALL … FROM PUBLIC, anon`) | ✓ | ✓ | ✓ | ✓ | **COMPLIANT** |

Notes:
- **"✗ in-file / via `0006`":** the foundational tables (`0002`–`0004`) receive RLS in `0006_rls_policies.sql`
  (a dynamic `ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY` loop), not in their own create migration; their
  anon object privileges are **not** revoked in any migration — that is precisely the R-ANON-OBJECT-PRIVILEGES
  finding **Stage A Part A** addresses on the 28 existing tables. They are **not** hygiene-guard failures and
  **not** new violations; they predate the convention.
- `0015` uses a **dynamic loop** over a table array; `0021` uses **static per-table** statements. The CI guard
  recognises both forms (verified by `tests/migrationHygiene.test.js` regression cases against the real files).

## 2. Interpretation

- **No convention-era migration is in violation.** Both migrations authored after the convention emerged
  (`0015`, `0021`) fully comply (anon object + data revoke, RLS enable + force, anon post-check).
- **The only gap is enforcement.** Compliance is currently manual and author-dependent. A future migration that
  forgets the REVOKE or RLS would merge unnoticed — reopening the exact finding Stage A is closing for existing
  tables. The CI guard removes that risk going forward.
- **No overlap with Stage A.** The guard targets only newly-added migrations; the foundational/existing tables
  remain Stage A's scope and are untouched here.

## 3. Baseline for the CI guard

- **Expected to PASS** if re-run over history as "added" files: `0015`, `0021` (and any future compliant
  migration).
- **Intentionally out of scope:** `0002`–`0007` (pre-convention; Stage A surface). The guard does not evaluate
  them because it only inspects migrations added in a PR.

## 4. Evidence method (reproducible, read-only)

```
node --test tests/migrationHygiene.test.js      # unit + real-migration regression (0015, 0021 COMPLIANT)
node .github/scripts/check_migration_hygiene.mjs supabase/migrations/0015_*.sql supabase/migrations/0021_*.sql
```

No database connection is used; the analysis is purely static over migration text.
