# YAV2 Portal V2 — Stage A — Authority Discovery A1–F2 Raw-Capture Template

**Status:** **TEMPLATE — empty except the already-confirmed F2 block.** No Supabase access by Claude, no SQL
executed. PJ runs the SELECT-only discovery once in `yav2-dev` and pastes the raw output below.
**Discovery SQL:** `supabase/verification/YAV2_STAGE_A_EXECUTION_AUTHORITY_DISCOVERY_SELECT_ONLY.sql`
(SHA-256 `6aeb5e220f6233c4892777c20549831836d4c48c4f4b29361734b0ee28dca0e6`).
**Authorised target:** `yav2-dev` / `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1/Prod `zcszesuvjrryxtigjglt`.
**Decision:** PATH 2 — SPLIT EXECUTION (from F2). Execution remains **UNAUTHORISED**.

> **Capture rules (all blocks):** paste the **exact raw output** — preserve **all column headings** and
> **all rows** (including `false` / `null` values). **No summarising, no manual recalculation, no value
> rewriting.** CSV export or copied JSON/table output is accepted; **a screenshot alone is not acceptable
> evidence** (attach raw text/CSV/JSON). Label each result block exactly as `[A1] … [F2]`.

---

## Run header (fill at capture)

| Field | Value |
|---|---|
| Operator | _______________________ |
| Timestamp (IST) | _______________________ |
| Target project | `yav2-dev` |
| Target ref | `ogjrwemjefvccpyjwxuo` (confirmed ☐) |
| Confirmed NOT V1/Prod | ☐ yes |
| Executing identity (`current_user`) | _______________________ |
| Discovery SQL SHA-256 executed | _______________________ |
| Capture format | ☐ CSV ☐ copied JSON/table |

---

## [A1] Session identity
Columns: `current_user, session_user, current_role, current_database, server_version, server_version_num, is_superuser_setting`

```
<PASTE RAW [A1] OUTPUT HERE — headings + row(s), verbatim>
```

---

## [A2] Server information
Columns: `server_ip_nullable, server_port_nullable`

```
<PASTE RAW [A2] OUTPUT HERE — verbatim>
```

---

## [A3] Project/ref manual confirmation
Columns: `action, required_ref_yav2_dev, prohibited_ref_v1_prod`
Also record the **manually confirmed** Editor-header project/ref.

```
<PASTE RAW [A3] OUTPUT HERE — verbatim>
Manually confirmed Editor header reads: __________________________________
```

---

## [B1] Role attributes
Columns: `rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolbypassrls`
(rows for `current_user` + postgres / supabase_admin / authenticator / service_role / anon / authenticated)

```
<PASTE RAW [B1] OUTPUT HERE — ALL rows, verbatim>
```

---

## [C1] Role membership edges
Columns: `member_role, is_member_of, with_admin_option, target_rolinherit`

```
<PASTE RAW [C1] OUTPUT HERE — ALL rows, verbatim>
```

---

## [C2] Role membership summary
Columns: `current_user, cu_is_member_of_postgres, cu_is_member_of_supabase_admin, postgres_is_member_of_n_roles, supabase_admin_is_member_of_n_roles`

```
<PASTE RAW [C2] OUTPUT HERE — verbatim>
```

---

## [D1] Complete default ACL rows (tables)
Columns: `default_owner, schema, grantee, privilege_type, is_object_level`

```
<PASTE RAW [D1] OUTPUT HERE — ALL rows, verbatim>
```

---

## [D2] Anon object-level default ACL rows by owner
Columns: `default_owner, anon_truncate, anon_references, anon_trigger, anon_maintain, anon_object_default_rows`
(expected rows for `postgres` and `supabase_admin`)

```
<PASTE RAW [D2] OUTPUT HERE — verbatim>
```

---

## [E1] Ownership of the exact 28 tables
Columns: `table_owner, tables_owned_in_scope, owned_by_current_user`

```
<PASTE RAW [E1] OUTPUT HERE — ALL rows, verbatim>
```

---

## [F1] Authority input facts
Columns: `current_user, cu_member_of_postgres, cu_usage_of_postgres, cu_member_of_supabase_admin, cu_usage_of_supabase_admin, cu_is_superuser, cu_has_create_on_public_NON_DECISIVE, cu_owns_public_schema_NON_DECISIVE, public_schema_owner`

```
<PASTE RAW [F1] OUTPUT HERE — verbatim>
```

---

## [F2] Eligibility result — CONFIRMED (2026-07-30)
Columns: `cu_is_superuser, eligible_for_postgres_default_alter, eligible_for_supabase_admin_default_alter`

```json
[
  {
    "cu_is_superuser": false,
    "eligible_for_postgres_default_alter": true,
    "eligible_for_supabase_admin_default_alter": false
  }
]
```

> This F2 block is the already-confirmed live result (raw:
> `YAV2_STAGE_A_EXECUTION_AUTHORITY_F2_RAW_2026-07-30.json`). It selects **PATH 2**, rejects PATH 1, and does
> not select PATH 3. **A1–F1 above are still required** for complete authority-evidence closure before final
> execution authorisation. **A1–F1 are NOT pre-filled and MUST NOT be fabricated.**

---

## Post-capture

- Save this completed file (raw output pasted for A1–F1) and record its SHA-256 in the completeness
  checklist (`YAV2_STAGE_A_AUTHORITY_EVIDENCE_COMPLETENESS_CHECKLIST.md`).
- **No readiness/migration candidate is run. Part A and Part B remain unauthorised. Stage B excluded.**
