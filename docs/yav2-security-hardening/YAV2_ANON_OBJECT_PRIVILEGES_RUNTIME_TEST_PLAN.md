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

## 3. STAGE A tests — run FIRST (after the Stage-A object-level REVOKE)

Stage A is the required HIGH correction. Its tests run before anything in Stage B.

### 3.1 anon object-level denials (the core surface)
- **T3 — TRUNCATE.** anon `TRUNCATE` attempt on a throwaway table matching an in-scope table's grants →
  **denied** (permission error). Special attention to the 3 audit tables (`audit_log`,
  `audit_event_contract`, `audit_ingestion_failures`).
- **T4 — REFERENCES.** anon attempt to create an FK referencing an in-scope table → **denied**.
- **T5 — TRIGGER.** anon attempt to `CREATE TRIGGER` on an in-scope table → **denied**.
- **T6 — MAINTAIN (PG-17).** anon attempt to `VACUUM` / `ANALYZE` an in-scope table → **denied**. (MAINTAIN
  was the privilege omitted from the executed `[G9]` rollup; explicitly tested here.)
- **Catalog cross-check:** SELECT-only `[A-POST1]` = 0 rows and `[DEF-POST-A]` = 0 rows (both owners).

### 3.2 authenticated / service_role regression — run AFTER Stage A
- **T7 — authenticated.** Re-run the full authenticated role-model matrix (Admin/Manager/Executive/Staff/
  Viewer) across the 28 tables → **identical to baseline B4**. Cross-check `[BASE1]` authenticated count
  unchanged.
- **T8 — service_role.** Re-run Edge Function / server-side operations using `service_role` (audit writes,
  generation RPCs, maintenance) → **identical to baseline B5**. Cross-check `[BASE1]` service_role count
  unchanged.

### 3.3 default-privilege regression (Stage-A object defaults) — after Stage A
- **T10a.** `CREATE TABLE public.__hardening_probe(...)` as each default-owning role (`postgres`,
  `supabase_admin`) in `yav2-dev`; inspect its ACL → anon holds **no object-level** default privilege;
  authenticated/service_role defaults retained. Drop the probe. Confirms §4.3 owner-execution gate covered
  **both** owners for object-level.

**Stage A gate:** all of T3–T8 + T10a + `[A-POST1]`/`[DEF-POST-A]`/`[BASE1]`/`[HYG1]` must pass. **Any
failure → roll back Stage A** (Migration Design §6) before proceeding.

---

## 4. Public / frontend-flow tests — run BEFORE Stage B (Stage-B authorisation gate)

Stage B (revoking anon data privileges) is **runtime-neutral by design**, but that must be **demonstrated**
before it is authorised:

- **T9 — frontend / public flow.** Exercise the SPA end-to-end: pre-auth landing, login, and each major
  authenticated screen (clients, trackers, documents, compliance) → **no new failures vs baseline B6**, with
  anon data privileges still present (i.e. pre-Stage-B). Purpose: prove **no public/unauthenticated flow
  depends on anon `SELECT/INSERT/UPDATE/DELETE`**.
- **T9-read.** Confirm anon `SELECT` already returns **0 rows** on all 28 (baseline B1) — i.e. removing it
  cannot change observable behaviour.

**STAGE B REMAINS UNAUTHORISED** unless **T9 + T9-read pass** (no dependency on anon data) **and PJ
separately approves.** Absent both, Stage B is not run.

---

## 5. STAGE B tests — only after the Stage-B gate passes and PJ approves

### 5.1 anon data-level denials
- **T1 — read.** anon `SELECT` on all 28 → **denied / 0 rows** (now explicit privilege denial). No worse
  than baseline B1.
- **T2 — write.** anon `INSERT/UPDATE/DELETE` on all 28 → **denied**.

### 5.2 regressions & defaults (repeat after Stage B)
- **T7/T8 (repeat).** authenticated + service_role unchanged (`[BASE1]`).
- **T9 (repeat).** frontend flows: no new failures.
- **T10b.** probe-table check: new tables grant anon **nothing at all**; `[DEF-POST-B]` = 0 for both owners.

---

## 6. Pass criteria

| Criterion | Requirement | Stage |
|---|---|---|
| anon object-level (T3–T6) | **all denied**; `[A-POST1]`=0 | A |
| authenticated (T7) | **no regression**; `[BASE1]` unchanged | A (repeat B) |
| service_role (T8) | **no regression**; `[BASE1]` unchanged | A (repeat B) |
| object defaults (T10a) | anon **no object** default, both owners; `[DEF-POST-A]`=0 | A |
| public/frontend (T9, T9-read) | no dependence on anon data → **Stage-B gate** | before B |
| anon data-level (T1–T2) | **all denied**; `[B-POST1]`=0 | B |
| all defaults (T10b) | anon **nothing** on new tables; `[DEF-POST-B]`=0 | B |
| RLS hygiene (`[HYG1]`) | RLS=39 / anon-policy=0 / auth_all=0 unchanged | A & B |

**Any failure → roll back the affected stage** (Migration Design §6) and investigate. **Stage B is not
authorised** unless §4 passes and PJ separately approves. All tests are future, controlled, `yav2-dev`-only;
**this document runs nothing.**
