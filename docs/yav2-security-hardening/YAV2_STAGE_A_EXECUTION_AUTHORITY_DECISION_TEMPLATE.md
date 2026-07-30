# YAV2 Portal V2 — Stage A — Execution-Authority Decision Template

> ## RECORDED RESULT — PATH 2 SELECTED (2026-07-30, from live F2)
> The F2 authority block has been captured live and is recorded here (raw:
> `evidence/YAV2_STAGE_A_EXECUTION_AUTHORITY_F2_RAW_2026-07-30.json`):
> - `cu_is_superuser` = **false**
> - `eligible_for_postgres_default_alter` = **true**
> - `eligible_for_supabase_admin_default_alter` = **false**
>
> **Selected route = PATH 2 — SPLIT EXECUTION REQUIRED.** PATH 1 **rejected**; PATH 3 **not selected** from
> this evidence.
> - The current identity **may** support the **`postgres`-owned** default correction (Part A).
> - The current identity **may NOT** perform the **`supabase_admin`-owned** default correction (Part B →
>   Supabase-supported mechanism).
> - **No single combined transaction containing both owner-default corrections is permitted.**
> - Remaining **A1–F1** discovery outputs are **still required** before final live authorisation.
> - **No execution path is approved yet.** The per-field template below remains for the operator to complete
>   from the full A1–F1 capture at execution time.

**Status:** **TEMPLATE — empty; filled by PJ/operator from the live read-only discovery output.** No Supabase
access / no SQL executed in producing this template.
**Governing:** `sync/integration` @ `370dd95d470bf1baa096f61a64409dd1259e2a04`.
**Authorised env:** `yav2-dev` / `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1/Prod `zcszesuvjrryxtigjglt`.
**Discovery SQL:** `supabase/verification/YAV2_STAGE_A_EXECUTION_AUTHORITY_DISCOVERY_SELECT_ONLY.sql`
(SHA-256 `6aeb5e220f6233c4892777c20549831836d4c48c4f4b29361734b0ee28dca0e6`).

> Fill every field from the raw discovery output. Attach the raw capture referenced by the run header.

---

## 0. Run header

| Field | Value |
|---|---|
| Operator | _______________________ |
| PJ authorisation (who / when) | _______________________ |
| Target project / ref | `yav2-dev` / `ogjrwemjefvccpyjwxuo` |
| Confirmed NOT V1/Prod | ☐ yes |
| Discovery SQL SHA-256 executed | _______________________ |
| Raw evidence file (per naming convention) | _______________________ |
| Timestamp (IST) | _______________________ |

---

## 1. Session identity ([A1])

| Field | Value |
|---|---|
| `current_user` | _______________________ |
| `session_user` | _______________________ |
| `current_role` | _______________________ |
| `current_database` | _______________________ |
| `server_version` | _______________________ |
| `is_superuser` (from `[F1]` cu_is_superuser) | ☐ true ☐ false |

---

## 2. Role memberships ([C1]/[C2]/[F1])

| Fact | Value |
|---|---|
| current_user MEMBER of `postgres` (`[F1]` cu_member_of_postgres) | ☐ true ☐ false |
| current_user USAGE of `postgres` | ☐ true ☐ false |
| current_user MEMBER of `supabase_admin` (`[F1]` cu_member_of_supabase_admin) | ☐ true ☐ false |
| current_user USAGE of `supabase_admin` | ☐ true ☐ false |
| relevant membership edges ([C1]) | _______________________ |

---

## 3. `postgres` default-ACL authority evidence

| Field | Value |
|---|---|
| `[D2]` anon object default rows for `postgres` (expect 4: TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) | _______________________ |
| `[F2]` `eligible_for_postgres_default_alter` (superuser OR member of postgres) | ☐ true ☐ false |
| Decisive? (MEMBER/superuser — NOT CREATE/ownership) | _______________________ |

---

## 4. `supabase_admin` default-ACL authority evidence

| Field | Value |
|---|---|
| `[D2]` anon object default rows for `supabase_admin` (expect 4) | _______________________ |
| `[F2]` `eligible_for_supabase_admin_default_alter` (superuser OR member of supabase_admin) | ☐ true ☐ false |
| Decisive? (MEMBER/superuser only) | _______________________ |

---

## 5. Existing-table REVOKE authority ([E1])

| Field | Value |
|---|---|
| Owner(s) of the 28 in-scope tables | _______________________ |
| `owned_by_current_user` count | _______________________ |
| Can current_user REVOKE anon object privileges on the 28 (owner/grantor rights or superuser)? | ☐ yes ☐ no ☐ unclear |

---

## 6. Selected path

Choose exactly one, justified by the facts above:

- ☐ **PATH 1 — SINGLE ATOMIC PATH ELIGIBLE** — `[F2]` eligible for **both** postgres AND supabase_admin, and
  existing-table REVOKE authority holds. The Stage A candidate can run atomically.
- ☐ **PATH 2 — SPLIT PATH REQUIRED** — existing-table REVOKEs executable, but one/both owner-default
  corrections NOT eligible → apply that owner's default correction via the Supabase-supported mechanism as a
  separate PJ-authorised step. Specify which owner(s): _______________________
- ☐ **PATH 3 — BLOCKED** — authority not provable safely from read-only evidence → do not proceed.

**Justification (cite [F2]/[F1]/[D2]/[E1] values):** _______________________

---

## 7. Reviewer decision

| Field | Value |
|---|---|
| Reviewer | _______________________ |
| Decision (PATH 1 / 2 / 3) | _______________________ |
| Conditions / notes | _______________________ |
| Unresolved blockers | _______________________ |
| PJ sign-off (who / when) | _______________________ |

> **No Stage A execution is authorised by this template.** It records the authority evidence and the chosen
> path only. Execution remains a separate, explicit PJ decision; Stage B stays separately gated.
