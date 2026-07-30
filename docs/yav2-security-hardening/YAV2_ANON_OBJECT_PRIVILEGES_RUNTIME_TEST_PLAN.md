# YAV2 Portal V2 — Anon Object-Privileges — Runtime Test Plan

**Status:** **DESIGN ONLY.** These are *controlled future tests* for a PJ-authorised hardening run in
**`yav2-dev`** only. **No test is executed here.** Nothing in this document accesses Supabase or runs SQL.
**Governing:** `sync/integration` @ `231fa39b608f6def9e6ed4b45ce5feb417c6f74f`. **Prohibited:** V1/Prod.

> **Purpose.** The catalog/design evidence proves *what privileges exist*; it cannot prove *runtime
> behaviour*. This plan defines the controlled negatives/positives to run **before** (baseline) and
> **after** a future authorised migration, so the hardening's safety and effect are demonstrated rather
> than assumed. Run all tests against `yav2-dev` with disposable/test data only.

---

## 1. Test roles & harness

| Role | How exercised | Notes |
|---|---|---|
| `anon` | PostgREST anon key **and** (if reachable) a direct Postgres session as `anon` | anon is NOT `BYPASSRLS`; RLS already denies rows |
| `authenticated` | Signed-in JWT via PostgREST | the application's real data path |
| `service_role` | server-side key (Edge Function context) | `BYPASSRLS`; must remain fully functional |

All tests are **read-only assertions about behaviour** (expected success/denial); destructive verbs
(`TRUNCATE` etc.) are attempted **only against throwaway test tables/rows** in `yav2-dev`, never against
real data, and only to observe the permission outcome.

---

## 2. Pre-migration baseline (record expected current behaviour)

| # | Test | Expected (current) |
|---|---|---|
| B1 | anon `SELECT` on each of the 28 tables | **0 rows** (RLS denies; no anon policy) |
| B2 | anon `INSERT/UPDATE/DELETE` | **denied** by RLS |
| B3 | anon `TRUNCATE` on a throwaway in-scope-shaped table | **permitted at privilege level** (the finding) — observe, do not run against real tables |
| B4 | authenticated CRUD per role model | **works** as designed |
| B5 | service_role operations (Edge) | **work** |
| B6 | frontend public/pre-auth flows | **work** (no dependence on anon data) |

---

## 3. Post-migration tests (after the authorised REVOKE)

### 3.1 anon read attempts
- **T1.** anon `SELECT` on all 28 tables → **denied / 0 rows**. Must be *no worse* than baseline B1 (i.e.
  still zero, now by explicit privilege denial rather than RLS-only).

### 3.2 anon write attempts
- **T2.** anon `INSERT` / `UPDATE` / `DELETE` on all 28 → **denied** (privilege revoked; previously
  RLS-denied). No regression to any public flow.

### 3.3 anon TRUNCATE
- **T3.** anon `TRUNCATE` attempt on a throwaway table matching an in-scope table's grants → **denied**
  (permission error). Confirms the core object-level surface is closed. Special attention to the 3 audit
  tables (`audit_log`, `audit_event_contract`, `audit_ingestion_failures`).

### 3.4 anon REFERENCES
- **T4.** anon attempt to create an FK referencing an in-scope table → **denied**.

### 3.5 anon TRIGGER
- **T5.** anon attempt to `CREATE TRIGGER` on an in-scope table → **denied**.

### 3.6 anon MAINTAIN (PG-17)
- **T6.** anon attempt to `VACUUM` / `ANALYZE` an in-scope table → **denied**. (MAINTAIN was the privilege
  omitted from the original `[G9]` rollup; explicitly tested here.)

### 3.7 authenticated regressions
- **T7.** Re-run the full authenticated role-model matrix (Admin/Manager/Executive/Staff/Viewer) across the
  28 tables → **identical to baseline B4**. The migration must not have changed any authenticated grant
  (cross-check `[POST2]` privilege counts unchanged).

### 3.8 service_role regressions
- **T8.** Re-run Edge Function / server-side operations that use `service_role` (audit writes, generation
  RPCs, maintenance) → **identical to baseline B5**. `service_role` grants unchanged (`[POST2]`).

### 3.9 frontend / public-flow regressions
- **T9.** Exercise the SPA end-to-end: pre-auth landing, login, and each major authenticated screen
  (clients, trackers, documents, compliance) → **no new failures vs B6**. Confirms no UI path depended on
  anon holding privileges.

---

## 4. Default-privilege regression (future objects)

- **T10.** After the migration, `CREATE TABLE public.__hardening_probe(...)` as each default-owning role
  (`postgres`, `supabase_admin`) in `yav2-dev`, then inspect its ACL → **anon holds nothing**;
  authenticated/service_role retain their defaults. Drop the probe table afterwards. Confirms the
  `ALTER DEFAULT PRIVILEGES` correction covers **both** owners (the two-owner dependency from evidence
  `G11`).

---

## 5. Pass criteria

| Criterion | Requirement |
|---|---|
| anon object-level (T3–T6) | **all denied** |
| anon data-level (T1–T2) | **all denied**; no public flow broken (behaviour ≤ baseline) |
| authenticated (T7) | **no regression** vs baseline; `[POST2]` counts unchanged |
| service_role (T8) | **no regression**; `[POST2]` counts unchanged |
| frontend (T9) | **no new failures** |
| default correction (T10) | new tables grant anon **nothing**, for both owners |
| catalog post-checks | `[POST1]`=0 rows, `[POST3]`=0 rows, `[POST4]` RLS=39 / anon-policy=0 / auth_all=0 |

**Any failure → roll back** (design §6 of the migration design) and investigate before re-attempting. All of
the above is future, controlled, and PJ-authorised; **this document runs nothing.**
