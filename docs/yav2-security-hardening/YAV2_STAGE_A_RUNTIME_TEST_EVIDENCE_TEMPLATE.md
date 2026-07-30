# YAV2 Portal V2 — Stage A — Runtime Test Evidence Template

> ## PATH 2 — SPLIT EVIDENCE (Part A / Part B / Final)
> PATH 2 selected (F2 2026-07-30). **PART A** = existing-table denials + `postgres` default + regressions.
> **PART B** = `supabase_admin` default only (via Supabase-supported mechanism; current identity INELIGIBLE).
> **FINAL** = Part A + Part B results → full Stage A closure. Detailed sections §1–§6 below are the **PART A**
> evidence. Stage B EXCLUDED.

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
| Executing role (PART A) | _______________________ |
| Authority path | **PATH 2 — SPLIT** (fixed; single-atomic not permitted) |
| PART A candidate SHA-256 executed | _______________________ |
| PART B mechanism / authorised identity | _______________________ |
| Start timestamp (IST) | _______________________ |
| End timestamp (IST) | _______________________ |
| Overall result | ☐ PART A PASS ☐ PART B PASS ☐ FULL CLOSURE ☐ FAIL ☐ BLOCKED |

---

## PART A EVIDENCE — existing tables + postgres default (sections 1–6)

Fill sections §1–§6 as the **PART A** evidence. PART A required fields:
- anon TRUNCATE / REFERENCES / TRIGGER / MAINTAIN denials (§1);
- authenticated regression (§2); service_role regression (§3);
- anon SELECT/INSERT/UPDATE/DELETE **unchanged** (§2 row + `[B-PRE2]`/`[B-POST1]`);
- **postgres** default ACL corrected (§5, `[DEF-POST-A]` postgres = 0);
- **supabase_admin** default **still open** (§5, `[DEF-POST-A]` supabase_admin > 0 — expected until Part B).
- PART A classification: ☐ PASS ☐ FAIL ☐ BLOCKED.

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

## 5. default-privilege regression — PART A scope (postgres corrected; supabase_admin still open)

| Test | Method | Expected (post-Part-A) | Timestamp | Raw output ref | Result |
|---|---|---|---|---|---|
| probe new table (postgres) | `CREATE TABLE public.__probe…` as postgres; inspect ACL; drop | anon holds **no object** default | __________ | __________ | ☐P ☐F ☐B |
| catalog `[DEF-POST-A]` postgres | SELECT-only default anon object rows for postgres | **0** | __________ | __________ | ☐P ☐F ☐B |
| catalog `[DEF-POST-A]` supabase_admin | SELECT-only default anon object rows for supabase_admin | **> 0 — OPEN (closed by Part B)** | __________ | __________ | ☐ noted |

---

## 6. RLS hygiene (unchanged)

| Test | Expected | Timestamp | Raw output ref | Result |
|---|---|---|---|---|
| `[HYG1]` | RLS = 39 / anon-policy = 0 / auth_all = 0 | __________ | __________ | ☐P ☐F ☐B |

---

## PART B EVIDENCE — supabase_admin default (Supabase-supported mechanism)

| Test | Method | Expected | Timestamp | Raw output ref | Result |
|---|---|---|---|---|---|
| supabase_admin default object privilege removed | apply Part B via authorised Supabase mechanism (NOT current identity) | anon `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` default removed | __________ | __________ | ☐P ☐F ☐B |
| no existing-table privilege changed | SELECT-only `[A-POST1]` unchanged (still 0) | unchanged | __________ | __________ | ☐P ☐F ☐B |
| no postgres default changed | `[DEF-POST-A]` postgres still 0 | unchanged | __________ | __________ | ☐P ☐F ☐B |
| final owner-scoped default ACL verification | `[DEF-POST-B]` anon default rows for **both** owners | **0 / 0** | __________ | __________ | ☐P ☐F ☐B |
| PART B mechanism / authorised identity | recorded | — | __________ | __________ | — |
| PART B classification | — | ☐ PASS ☐ FAIL ☐ BLOCKED | __________ | __________ | ☐ |

---

## FINAL — full Stage A closure

| Field | Value |
|---|---|
| PART A result | ☐ PASS ☐ FAIL ☐ BLOCKED |
| PART B result | ☐ PASS ☐ FAIL ☐ BLOCKED |
| **FULL STAGE A CLOSURE** (only if Part A PASS AND Part B PASS) | ☐ CLOSED ☐ NOT CLOSED |
| Operator | _______________________ |
| Timestamp (IST) | _______________________ |
| Target project / ref | `yav2-dev` / `ogjrwemjefvccpyjwxuo` |
| Raw evidence attachment names (A1–F2 + Part A + Part B) | _______________________ |

---

## 7. Attachments

- ☐ A1–F2 authority discovery raw output (F2 preserved: `evidence/YAV2_STAGE_A_EXECUTION_AUTHORITY_F2_RAW_2026-07-30.json`)
- ☐ pre-check raw output
- ☐ Part A run log (NOTICE / COMMIT or abort+rollback error)
- ☐ Part A post-check raw output
- ☐ Part B mechanism run log + post-check
- ☐ runtime test raw outputs (Part A §1–§6, Part B)
- ☐ rollback log (if triggered)

## 8. Disposition

- PART A: **PASS / FAIL / BLOCKED**. PART B: **PASS / FAIL / BLOCKED**. FULL CLOSURE: **CLOSED / NOT CLOSED**.
- Open gates carried (e.g. `supabase_admin` default via Supabase mechanism until Part B PASS): ____________
- Remaining A1–F1 evidence preserved before final authorisation? ☐ yes ☐ no
- Rollback triggered? ☐ no ☐ yes → reference: _______________________
- PJ sign-off: _______________________ · **Stage B remains separately gated and unauthorised.**
