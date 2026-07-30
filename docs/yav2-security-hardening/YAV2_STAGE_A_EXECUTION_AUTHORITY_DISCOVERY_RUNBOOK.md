# YAV2 Portal V2 — Stage A — Execution-Authority Discovery Runbook

**Status:** **READ-ONLY DISCOVERY — no Supabase access, no SQL executed by Claude.** PJ runs the SELECT-only
SQL in `yav2-dev`; Claude does not access the database.
**Purpose:** determine the real execution authority for the Stage A default-privilege corrections
(`ALTER DEFAULT PRIVILEGES FOR ROLE postgres` / `FOR ROLE supabase_admin`) from live read-only evidence,
**before** any migration is authorised.
**Governing:** `sync/integration` @ `370dd95d470bf1baa096f61a64409dd1259e2a04`.
**Authorised env:** `yav2-dev` / `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1/Prod `zcszesuvjrryxtigjglt`.
**SQL:** `supabase/verification/YAV2_STAGE_A_EXECUTION_AUTHORITY_DISCOVERY_SELECT_ONLY.sql`
(SHA-256 `6aeb5e220f6233c4892777c20549831836d4c48c4f4b29361734b0ee28dca0e6`).

---

## 1. Authorised target (confirm before running)

- Supabase project **`yav2-dev`**, ref **`ogjrwemjefvccpyjwxuo`**.
- If the Editor header shows **`zcszesuvjrryxtigjglt`** (V1/Production) or any other project → **STOP**, run nothing.

---

## 2. How PJ runs the SELECT-only SQL

1. Open the Supabase SQL Editor for **`yav2-dev`**; confirm the project/ref in the header (block `[A3]`).
2. **Read-only run.** Ideally in a read-only transaction: `BEGIN TRANSACTION READ ONLY;` … run blocks …
   `ROLLBACK;` (nothing is written regardless — every statement is `SELECT`/`WITH`).
3. Execute the blocks **in order** `[A1] [A2] [A3] [B1] [C1] [C2] [D1] [D2] [E1] [F1] [F2]`.
4. Capture the **full raw result** of each block (do not summarise). Note the executing identity is whatever
   role PJ is connected as — the discovery reports *that* identity's authority (`current_user`).
5. Run **as the identity that would perform the migration** (the intended executing role), so the authority
   facts reflect the real execution context. If more than one candidate executing role exists, run once per
   candidate and label each capture.

> This runbook and the SQL make **no** change and **do not** test permission by attempting
> `ALTER DEFAULT PRIVILEGES`. Authority is inferred from role membership / superuser facts only.

---

## 3. Exact output that must be preserved

Preserve the raw output of every block, especially the decisive ones:

- **[A1]** `current_user`, `session_user`, `current_role`, `current_database`, server version, is_superuser.
- **[B1]** attributes (`rolsuper/rolinherit/rolcreaterole/rolcreatedb/rolcanlogin/rolbypassrls`) for
  current_user + the 6 platform roles.
- **[C1]/[C2]** membership edges + `cu_is_member_of_postgres`, `cu_is_member_of_supabase_admin`.
- **[D1]/[D2]** default-ACL rows; anon object-level default rows per owner (`postgres`, `supabase_admin`).
- **[E1]** owner of the 28 tables + `owned_by_current_user`.
- **[F1]** `cu_member_of_postgres/supabase_admin` (MEMBER + USAGE), `cu_is_superuser`,
  `public_schema_owner` (CREATE/owns-public marked **NON_DECISIVE**).
- **[F2]** `eligible_for_postgres_default_alter`, `eligible_for_supabase_admin_default_alter`.

Record each into the Decision Template (`YAV2_STAGE_A_EXECUTION_AUTHORITY_DECISION_TEMPLATE.md`) and attach
raw output.

---

## 4. No mutation

- Every statement is `SELECT`/`WITH`. No `ALTER`, `GRANT`, `REVOKE`, `DO`, DDL or DML. No `SET ROLE`.
- Do **not** "test" authority by running an `ALTER DEFAULT PRIVILEGES` — that would be a privilege change.
- Do **not** run the Stage A migration candidate here.

---

## 5. Stop conditions

- Wrong project/ref (not `yav2-dev`) → STOP.
- The SQL file's SHA-256 does not match the reviewed value → STOP (use the reviewed file only).
- Any block cannot run read-only / errors unexpectedly → capture the error, STOP, escalate.
- Evidence is ambiguous or incomplete → do **not** infer authority; classify **PATH 3 — BLOCKED**.

---

## 6. Evidence file naming convention

Save captures under the discrepancy/hardening evidence area, e.g.:

```
docs/yav2-security-hardening/evidence/
  YAV2_STAGE_A_AUTHORITY_DISCOVERY_RESULT_<YYYY-MM-DD>_<HHMM>_IST_<executing-role>.json   (or .txt)
```

- Include the executing role in the filename (authority is per-identity).
- Preserve raw output verbatim (no summarising, no editing values).
- Record the SQL file SHA-256 that produced it.

---

## 7. Result classification (facts → path; see Decision Template)

- **PATH 1 — SINGLE ATOMIC PATH ELIGIBLE** — only if `[F2]` shows
  `eligible_for_postgres_default_alter = true` **AND** `eligible_for_supabase_admin_default_alter = true`
  (i.e. superuser, or member of **both** owner roles), and existing-table REVOKE authority holds.
- **PATH 2 — SPLIT PATH REQUIRED** — existing-table REVOKEs executable, but one/both owner-default
  corrections are **not** eligible (`[F2]` false for that owner) → apply that owner's default correction via
  the Supabase-supported mechanism separately.
- **PATH 3 — BLOCKED** — authority cannot be proven safely from the read-only evidence (ambiguous/missing) →
  do not proceed; escalate to PJ.

**No execution is authorised by running this discovery.** It only informs the path decision.
