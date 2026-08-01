# YAV2 Phase 4C — Live Execution Evidence & Completion Record

**Status:** COMPLETED — live migration execution in **yav2-dev** succeeded and was verified. This document is the
formal execution evidence for the reconciled Phase 4C package (`0025`–`0031`).

| Field | Value |
|---|---|
| Execution date / time | **2026-08-01, ~22:36–23:22 IST** (17:06–17:52 UTC) |
| Organisation | Yes Advizors (Pro) |
| Target project / ref | **yav2-dev** / **`ogjrwemjefvccpyjwxuo`** |
| Prohibited (not accessed) | V1 / Production · `zcszesuvjrryxtigjglt` |
| Governing branch / SHA | `sync/integration` @ **`4b84c0269857b14bb52a141e805e6b137a75e842`** |
| Executing identity | `postgres` (non-superuser; `rolcreaterole=true`) |
| Method | one migration at a time via SELECT/DDL; LF Git-blob hash verified per file; PC check after each; final verifier |
| Rollback | **none run** (`0031` rollback — which would restore the 72 grants — NOT executed) |

## Pre-flight (PASS)
- HEAD == origin/sync/integration == `4b84c02…`.
- **All 15 SQL file hashes verified** against runbook §1 on the authoritative **LF Git-blob** basis (`git show HEAD:<path> | sha256sum`).
- Critical live re-checks unchanged: 21 non-read events absent (0); 2 read events exact **HIGH/S4** match (2); audit roles absent (0); **prohibited grants = 72**; base helpers present (2); competing writer (0); all audit tables FORCE RLS (true).

## Migrations executed (0025–0031) + PC results
| # | Migration | LF-blob SHA-256 (16) | Result | PC check | PC result |
|---|---|---|---|---|---|
| 1 | `0025_phase4c_audit_roles.sql` | `89c238897ff8fa40` | applied | PC-1 | `audit_owner`,`audit_writer`: rolsuper=f, rolinherit=f, rolcreaterole=f, rolcreatedb=f, rolcanlogin=f — **PASS** |
| 2 | `0026_phase4c_audit_indexes.sql` | `9f29e183dc4661d9` | applied | PC-2 | 8 indexes present — **PASS** |
| 3 | `0027_phase4c_audit_validation_reconcile.sql` | `391cedc0842af59d` | applied (assertion) | PC-3 | chain non-null; audit_is_uuid secdef=true, volatile=i — **PASS** |
| 4 | `0028_phase4c_audit_access_reconcile.sql` | `e3e8ccc03651a29d` | applied (assertion) | PC-4 | get_app_role/…for_user/get_sensitive present — **PASS** |
| 5 | `0029_phase4c_canonical_writer_reconcile.sql` | `9e886908a5e14ed5` | applied (assertion) | PC-5 | writer_secdef=true, competing_writer=0, base_helpers=2, prohibited_exec=0 — **PASS** |
| 6 | `0030_phase4c_event_contract_seed.sql` | `3476158e8c4701dd` | applied (INSERT 0 21) | PC-6 | events_exact=23, nonread_now=21, read_s4=2, **34 audit_log rows preserved**, FORCE RLS — **PASS** |
| 7 | `0031_phase4c_audit_privilege_remediation.sql` | `7630508a9af03030` | applied (REVOKE ×3) | PC-7 | **prohibited_grants 72→0**, 3 tables present, FORCE RLS, no replacement grants — **PASS** |

## Final verifier V1–V7 (`…RECONCILED_POST_MIGRATION_SELECT_ONLY.sql` `743eea93…`)
`v1_roles_ok=2 · v2_indexes=8 · v3_chain_ok=true · v4_competing_writer=0 & base_helpers=2 · v5_events_exact=23, read_s4=2, duplicates=0 · v6_force_rls_tables=3 · v7_prohibited_grants=0` — **ALL PASS**.

## Net effect (verified live)
- Roles `audit_owner`, `audit_writer` created (NOLOGIN, non-super).
- 8 `audit_log`/`audit_ingestion_failures` performance indexes added.
- Validation / access / canonical-writer chain verified intact (base helpers `_write_read_audit`, `_record_audit_failure` retained — the corrected `0029`).
- **21** security/auth event-contract rows inserted; **2** pre-existing read events (`audit.log.read_requested`, `audit.log.read_completed`) **preserved at HIGH/S4**; their **34** `audit_log` records untouched. Total 23 named Phase 4C events, 0 duplicates.
- **72 prohibited direct grants removed → 0** (anon/authenticated/service_role no longer hold direct privileges on the three audit tables); FORCE RLS intact; no replacement grants.

## Boundary confirmation
yav2-dev only; **no V1/Production access**; no deployment; no rollback executed; the `0031` rollback (insecure 72-grant restoration) remains PJ-approval-only. Migrations are source-of-truth in `sync/integration`; no code/contract/role/grant was altered outside the seven authorised migrations.

> **Outstanding:** runtime verification (function/behaviour tests) — see
> `PHASE4C_RUNTIME_TEST_PLAN.md`. Runtime tests are NOT yet executed.
