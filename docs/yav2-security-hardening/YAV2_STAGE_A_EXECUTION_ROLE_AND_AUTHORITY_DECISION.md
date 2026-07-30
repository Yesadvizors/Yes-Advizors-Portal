# YAV2 Portal V2 — Stage A — Execution Role & Authority Decision

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

## 4. Is the package executable now, or blocked?

**BLOCKED PENDING AUTHORITY CONFIRMATION — for the default-privilege corrections; the existing-table REVOKEs
are expected executable.**

- The **28 existing-table REVOKEs** are expected to be executable by the standard `yav2-dev` migration role.
- The **`postgres`** default correction is executable **iff** the migration role is `postgres` or a member —
  **to confirm at run** (`[DEF-PRE1]` + a dry authority check).
- The **`supabase_admin`** default correction is the **most likely blocker**: ordinary migration roles are
  usually not members of `supabase_admin`. If so, the atomic transaction design means the whole Stage A run
  **rolls back** rather than partially applying — so the operator must either (a) obtain a role with the
  required membership, or (b) split execution: apply the existing-table REVOKEs + `postgres` default in one
  authorised run, and apply the `supabase_admin` default via the Supabase mechanism separately.

**Decision required from PJ before execution:** confirm the executing role's memberships (`postgres`,
`supabase_admin`) in `yav2-dev`, and choose (a) single atomic run if authority is complete, or (b) the split
path with the `supabase_admin` default handled via the Supabase mechanism. **No execution occurs until this
decision is recorded.**
