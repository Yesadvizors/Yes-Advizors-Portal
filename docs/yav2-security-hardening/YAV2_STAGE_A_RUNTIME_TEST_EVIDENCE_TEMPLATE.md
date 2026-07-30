# YAV2 Portal V2 — Stage A — Runtime Test Evidence Template

**Status:** **TEMPLATE — empty; to be filled by the operator at execution time (yav2-dev only) under separate
PJ authorisation.** No Supabase access / no SQL executed in producing this template.
**Scope:** Stage A object-level denials + regressions. Stage B out of scope.
**Governing:** `sync/integration` @ `370dd95d470bf1baa096f61a64409dd1259e2a04`.

> Fill every field. Attach raw output for each test. Result per row: **PASS / FAIL / BLOCKED**.

---

## 0. Run header

| Field | Value |
|---|---|
| Operator | _______________________ |
| PJ authorisation (who / when) | _______________________ |
| Target project | `yav2-dev` |
| Target ref | `ogjrwemjefvccpyjwxuo` |
| Confirmed NOT V1/Prod (`zcszesuvjrryxtigjglt`) | ☐ yes |
| Executing role | _______________________ |
| Authority path taken (single atomic / split) | _______________________ |
| Migration candidate SHA-256 executed | _______________________ |
| Start timestamp (IST) | _______________________ |
| End timestamp (IST) | _______________________ |
| Overall result | ☐ PASS ☐ FAIL ☐ BLOCKED |

---

## 1. anon object-level denial tests (core Stage A outcome)

| Test | Method | Expected | Timestamp | Raw output ref | Result |
|---|---|---|---|---|---|
| **anon TRUNCATE denial** | attempt `TRUNCATE` as anon on a throwaway in-scope-shaped table (never real data; audit tables noted) | permission **denied** | __________ | __________ | ☐P ☐F ☐B |
| **anon REFERENCES denial** | attempt to create an FK referencing an in-scope table as anon | **denied** | __________ | __________ | ☐P ☐F ☐B |
| **anon TRIGGER denial** | attempt `CREATE TRIGGER` on an in-scope table as anon | **denied** | __________ | __________ | ☐P ☐F ☐B |
| **anon MAINTAIN denial** | attempt `VACUUM` / `ANALYZE` an in-scope table as anon (PG-17) | **denied** | __________ | __________ | ☐P ☐F ☐B |
| catalog `[A-POST1]` | SELECT-only: anon object residual | **0 rows** | __________ | __________ | ☐P ☐F ☐B |

---

## 2. authenticated regression checks (must be UNCHANGED)

| Test | Method | Expected | Timestamp | Raw output ref | Result |
|---|---|---|---|---|---|
| authenticated CRUD role-model | Admin/Manager/Executive/Staff/Viewer across the 28 tables | identical to baseline B4 | __________ | __________ | ☐P ☐F ☐B |
| catalog `[BASE1]` authenticated | SELECT-only privilege_rows | **unchanged** vs pre-run | __________ | __________ | ☐P ☐F ☐B |
| anon data preserved `[B-PRE2]`/`[B-POST1]` | anon SELECT/INSERT/UPDATE/DELETE rows | **still 112** (Stage A preserves) | __________ | __________ | ☐P ☐F ☐B |

---

## 3. service_role regression checks (must be UNCHANGED)

| Test | Method | Expected | Timestamp | Raw output ref | Result |
|---|---|---|---|---|---|
| Edge Function / server ops | audit writes, generation RPCs, maintenance under service_role | work as before (baseline B5) | __________ | __________ | ☐P ☐F ☐B |
| catalog `[BASE1]` service_role | SELECT-only privilege_rows | **unchanged** vs pre-run | __________ | __________ | ☐P ☐F ☐B |

---

## 4. frontend / public-flow checks

| Test | Method | Expected | Timestamp | Raw output ref | Result |
|---|---|---|---|---|---|
| pre-auth landing | load app unauthenticated | no new failures vs baseline B6 | __________ | __________ | ☐P ☐F ☐B |
| login + core screens | clients / trackers / documents / compliance | no new failures | __________ | __________ | ☐P ☐F ☐B |

---

## 5. default-privilege regression (object-level, both owners)

| Test | Method | Expected | Timestamp | Raw output ref | Result |
|---|---|---|---|---|---|
| probe new table (postgres) | `CREATE TABLE public.__probe…` as postgres; inspect ACL; drop | anon holds **no object** default | __________ | __________ | ☐P ☐F ☐B |
| probe new table (supabase_admin) | as supabase_admin (or note OPEN GATE) | anon holds **no object** default, or **OPEN GATE** recorded | __________ | __________ | ☐P ☐F ☐B |
| catalog `[DEF-POST-A]` | SELECT-only default anon object rows | **0** both owners (or OPEN GATE) | __________ | __________ | ☐P ☐F ☐B |

---

## 6. RLS hygiene (unchanged)

| Test | Expected | Timestamp | Raw output ref | Result |
|---|---|---|---|---|
| `[HYG1]` | RLS = 39 / anon-policy = 0 / auth_all = 0 | __________ | __________ | ☐P ☐F ☐B |

---

## 7. Attachments

- ☐ pre-check raw output
- ☐ migration run log (NOTICE / COMMIT or abort+rollback error)
- ☐ post-check raw output
- ☐ runtime test raw outputs (§1–§6)
- ☐ rollback log (if triggered)

## 8. Disposition

- Result: **PASS / FAIL / BLOCKED** (circle one).
- Open gates carried (e.g. `supabase_admin` default via Supabase mechanism): _______________________
- Rollback triggered? ☐ no ☐ yes → reference: _______________________
- PJ sign-off: _______________________ · **Stage B remains separately gated and unauthorised.**
