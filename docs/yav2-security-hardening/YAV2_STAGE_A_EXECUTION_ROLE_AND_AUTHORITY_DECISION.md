# YAV2 Portal V2 — Stage A — Execution Role & Authority Decision

> ## PATH 2 — SPLIT EXECUTION SELECTED (2026-07-30)
> Live authority evidence **F2**: `cu_is_superuser=false`, `eligible_for_postgres_default_alter=**true**`,
> `eligible_for_supabase_admin_default_alter=**false**`. **PATH 1 rejected; PATH 3 not selected. Execution
> remains UNAUTHORISED.** (Raw: `evidence/YAV2_STAGE_A_EXECUTION_AUTHORITY_F2_RAW_2026-07-30.json`.)
> - **Part A** — `supabase/readiness/YAV2_STAGE_A_PATH2_PART_A_EXISTING_TABLES_AND_POSTGRES_DEFAULT_CANDIDATE.sql`:
>   28 existing-table object-level REVOKEs **+ `postgres`-owned** default correction (current identity eligible).
> - **Part B** — `supabase/readiness/YAV2_STAGE_A_PATH2_PART_B_SUPABASE_ADMIN_DEFAULT_PROPOSAL.sql`:
>   **`supabase_admin`-owned** default only; current identity **INELIGIBLE** → separately authorised
>   Supabase-supported mechanism + separate PJ approval + separate evidence.
> - **No single combined atomic path is permitted.** Part A is **NOT** full Stage A closure; while Part B is
>   open, **future-table protection is INCOMPLETE**. **Full Stage A closure requires BOTH Part A PASS and
>   Part B PASS** (+ verification). Remaining discovery blocks **A1–F1** are still required before final live
>   authorisation. **Stage B remains EXCLUDED.** The old combined candidates are **SUPERSEDED**.

**Status:** **READINESS / DECISION DOCUMENT — no Supabase access, no SQL executed, no privilege changed.**
**Scope:** Stage A only (revoke anon `TRUNCATE / REFERENCES / TRIGGER / MAINTAIN` + object-level default
correction). Stage B out of scope.
**Governing:** `sync/integration` @ `370dd95d470bf1baa096f61a64409dd1259e2a04`.
**Authorised future-execution env:** `yav2-dev` / `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1/Prod.
**Candidate:** `supabase/readiness/YAV2_STAGE_A_ANON_OBJECT_PRIVILEGES_MIGRATION_CANDIDATE.sql`.

> **Rule:** permission is NOT assumed; **no `SET ROLE`; no privilege escalation.** If a required authority is
> absent, the operator STOPS and escalates to PJ. Existing-table `REVOKE`s and the default-privilege
> corrections have **different** authority requirements — assessed separately below.

---

## 1. Exact current `pg_default_acl` evidence (from merged EXACT live result)

Source: `docs/yav2-discrepancy-closure/evidence/YAV2_DISCREPANCY_CLOSURE_LIVE_RESULT_EXACT_2026-07-30_1115_IST.json`
(SHA `8fe16665…`), block `G11_default_acl`. Object-level (`TRUNCATE/REFERENCES/TRIGGER/MAINTAIN`) anon default
grants exist for **both** owner scopes:

| `defaclrole` (owner) | Schema | Object type | Grantee | Object privileges granted (default) |
|---|---|---|---|---|
| **`postgres`** | `public` | table | `anon` | TRUNCATE, REFERENCES, TRIGGER, MAINTAIN |
| **`supabase_admin`** | `public` | table | `anon` | TRUNCATE, REFERENCES, TRIGGER, MAINTAIN |

Confirm live at execution with `[DEF-PRE1]` of
`supabase/verification/YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql`.

Role attributes (block `G7`): `postgres` and `supabase_admin` are `BYPASSRLS`; `supabase_admin` is superuser.
`anon` is not `BYPASSRLS` and cannot CREATE in `public` (`G8`).

---

## 2. Required executing role, per statement class

| Statement class | Statement(s) | Executing role required | Authority needed | Notes |
|---|---|---|---|---|
| **Existing-table REVOKE** | 28 × `REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.<t> FROM anon` | table **owner** (or a role with grantor rights on those tables) or superuser | ability to `REVOKE` privileges the owner granted | In Supabase the standard migration role typically has this; confirm at run |
| **Default correction — postgres scope** | `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE … FROM anon` | must **be** `postgres` or a **member of** `postgres` | may alter `postgres`'s own default privileges | `ALTER DEFAULT PRIVILEGES FOR ROLE X` requires being X or a member of X |
| **Default correction — supabase_admin scope** | `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE … FROM anon` | must **be** `supabase_admin` or a **member of** `supabase_admin` (superuser) | may alter `supabase_admin`'s default privileges | Frequently **NOT** available to the ordinary migration role → see gate |

---

## 3. Deterministic decision flow (execution-time gate)

For **each** owner scope, exactly one path is taken; no `SET ROLE`, no escalation:

### 3.1 `postgres` default scope
- **Evidence:** `[DEF-PRE1]` row `default_for_role = postgres`, anon object rows > 0.
- **Success condition:** the `ALTER DEFAULT PRIVILEGES FOR ROLE postgres …` runs without error **and**
  `[DEF-POST-A]` shows 0 anon object rows for `postgres`.
- **STOP condition:** permission error (executing role is not `postgres` / not a member) → the statement
  fails, the **whole Stage A transaction rolls back** (atomic). Do **not** `SET ROLE`, do **not** escalate.
- **Fallback:** re-run under a role that is `postgres` / member of `postgres`, as a separate PJ-authorised
  attempt. If none is available, treat as a KNOWN OPEN GATE (as for supabase_admin, §3.2).

### 3.2 `supabase_admin` default scope
- **Evidence:** `[DEF-PRE1]` row `default_for_role = supabase_admin`, anon object rows > 0.
- **Success condition:** the `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin …` runs without error **and**
  `[DEF-POST-A]` shows 0 anon object rows for `supabase_admin`.
- **STOP condition:** if the executing (migration) role lacks membership of `supabase_admin`, the `ALTER`
  errors and the Stage A transaction **rolls back**. Do **not** force, `SET ROLE`, or escalate.
- **Permitted fallback (deterministic):** apply the `supabase_admin`-scope default correction via the
  **Supabase-supported mechanism** (platform role / dashboard / support) as a **separate PJ-authorised
  step**, then re-run `[DEF-POST-A]`. Until then, the `supabase_admin` **future-default** remains a KNOWN
  OPEN GATE.

### 3.3 Existing-table REVOKEs
Independent of §3.1–§3.2. They close the finding on the **28 existing tables** and succeed on their own
under the ordinary migration role's owner/grantor rights. Their failure (if the role cannot REVOKE) is also a
STOP → rollback.

---

## 4. PATH 2 — SPLIT EXECUTION CONFIRMED (full A1–F2 authority evidence)

**Authority discovery A1–F2 is captured** (2026-07-31 for A1–F1; F2 confirmed 2026-07-30) in
`evidence/YAV2_STAGE_A_EXECUTION_AUTHORITY_A1_F2_RAW_CAPTURE_TEMPLATE_2026-07-31.md`. The full evidence set
**confirms** PATH 2.

**Evidence-supported conclusions:**
- Current SQL-Editor identity is **`postgres`** (A1: `current_user=session_user=current_role=postgres`).
- Current role is **not superuser** (A1 `is_superuser=off`; B1 `postgres.rolsuper=false`; F1
  `cu_is_superuser=false`) — though `postgres` has `rolbypassrls=true`, `rolcreaterole/db=true`.
- **All 28 in-scope public tables are owned by `postgres`** (E1: `owned_by_current_user=28`,
  `tables_owned_in_scope=28`).
- `postgres` **is eligible** to address `postgres`-owned defaults (C2 `cu_is_member_of_postgres=true`; F1/F2
  `cu_member_of_postgres=true` → `eligible_for_postgres_default_alter=true`).
- `postgres` **is not a member of `supabase_admin`** (C1 list excludes supabase_admin; C2
  `cu_is_member_of_supabase_admin=false`; F1 `cu_member_of_supabase_admin=false`).
- Current session **is not eligible** to address `supabase_admin`-owned defaults (F2
  `eligible_for_supabase_admin_default_alter=false`).
- **Both** `postgres`-owned and `supabase_admin`-owned public default ACLs grant `anon`
  **TRUNCATE, REFERENCES, TRIGGER, MAINTAIN** (D2: 4 rows each). (D1: the postgres-owned default additionally
  grants anon SELECT/INSERT/UPDATE/DELETE — **out of Stage A object-level scope; not revoked here**.)
- `public`-schema ownership by **`pg_database_owner`** and `CREATE`-on-public are **non-decisive** for
  owner-specific `ALTER DEFAULT PRIVILEGES` authority (F1 `cu_owns_public_schema_non_decisive=false`,
  `cu_has_create_on_public_non_decisive=true`).
- **Part A and Part B must remain separate.**
- **Part A alone cannot claim full Stage A closure.**
- **Part B remains dependent** on a supported, authorised execution mechanism with the required authority
  (current session ineligible).

**RESULT (F2, 2026-07-30):** `cu_is_superuser = false`; `eligible_for_postgres_default_alter = true`;
`eligible_for_supabase_admin_default_alter = false`.
(Raw: `evidence/YAV2_STAGE_A_EXECUTION_AUTHORITY_F2_RAW_2026-07-30.json`; note:
`evidence/YAV2_STAGE_A_EXECUTION_AUTHORITY_F2_EVIDENCE_NOTE.md`.)

**Recorded decision:**
- **cu_is_superuser = false.**
- **eligible_for_postgres_default_alter = true** → the current identity **may** support the `postgres`-owned
  default correction (**Part A**).
- **eligible_for_supabase_admin_default_alter = false** → the current identity **may NOT** perform the
  `supabase_admin`-owned default correction (**Part B**).
- **Selected route = PATH 2 — SPLIT EXECUTION REQUIRED.** **PATH 1 rejected.** **PATH 3 not selected** from
  this F2 evidence.
- **No single combined transaction containing both owner-default corrections is permitted.**
- Existing-table REVOKEs + `postgres` default → **Part A** (`…PATH2_PART_A…CANDIDATE.sql`).
- `supabase_admin` default → **Part B** (`…PATH2_PART_B…PROPOSAL.sql`), via a **separately authorised
  Supabase-supported mechanism** (current identity ineligible; no `SET ROLE`, no escalation).
- **Remaining A1–F1 discovery outputs are still required** before final live authorisation.
- **No execution path is approved yet.** Part A completion does **not** close Part B; **full Stage A closure
  requires both Part A PASS and Part B PASS** plus verification. **Stage B remains excluded.**
