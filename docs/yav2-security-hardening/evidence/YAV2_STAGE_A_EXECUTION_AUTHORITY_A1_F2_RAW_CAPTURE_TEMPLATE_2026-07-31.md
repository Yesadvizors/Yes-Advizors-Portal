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
| Operator | PJ (live SELECT-only run) |
| Timestamp (IST) | 2026-07-31 *(recorded from PJ capture; exact clock per raw output)* |
| Target project | `yav2-dev` |
| Target ref | `ogjrwemjefvccpyjwxuo` (confirmed ✅ by PJ) |
| Confirmed NOT V1/Prod | ✅ yes (`zcszesuvjrryxtigjglt` NOT used) |
| Executing identity (`current_user`) | **`postgres`** (A1/C2/F1) — **not** superuser (rolsuper=false, is_superuser=off) |
| Discovery SQL SHA-256 executed | `6aeb5e220f6233c4892777c20549831836d4c48c4f4b29361734b0ee28dca0e6` |
| Capture format | copied JSON (per-block) |

> **STATUS: A1–F2 captured (A1, A2, A3, B1, C1, C2, D1[100-row capture — truncated relative to the full
> catalogue], D2, E1, F1, F2).** No database execution occurred. The D1 100 rows are recorded verbatim below;
> the decisive public-scope facts are supplied by the **focused reconciliation evidence**
> (`evidence/YAV2_STAGE_A_DEFAULT_ACL_FOCUSED_RECONCILIATION_RAW_2026-07-31.json`). See §Completeness checklist.

---

## [A1] Session identity
Columns: `current_user, session_user, current_role, current_database, server_version, server_version_num, is_superuser_setting`

```
[
  {
    "current_user": "postgres",
    "session_user": "postgres",
    "current_role": "postgres",
    "current_database": "postgres",
    "server_version": "17.6",
    "server_version_num": "170006",
    "is_superuser_setting": "off"
  }
]
```

---

## [A2] Server information
Columns: `server_ip_nullable, server_port_nullable`

```
[
  {
    "server_ip_nullable": "2406:da1a:b00:1300:8e20:e7f6:f87a:bd9f",
    "server_port_nullable": 5432
  }
]
```

---

## [A3] Project/ref manual confirmation
Columns: `action, required_ref_yav2_dev, prohibited_ref_v1_prod`

```json
[
  {
    "action": "MANUAL CONFIRMATION REQUIRED",
    "required_ref_yav2_dev": "ogjrwemjefvccpyjwxuo",
    "prohibited_ref_v1_prod": "zcszesuvjrryxtigjglt"
  }
]
```

**PJ manual confirmation (outside raw evidence):**
- executed only in `yav2-dev`
- ref `ogjrwemjefvccpyjwxuo`
- V1/Production ref `zcszesuvjrryxtigjglt` **not used**

---

## [B1] Role attributes
Columns: `rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolbypassrls`
(rows for `current_user` + postgres / supabase_admin / authenticator / service_role / anon / authenticated)

```json
[
  {
    "rolname": "anon",
    "rolsuper": false,
    "rolinherit": true,
    "rolcreaterole": false,
    "rolcreatedb": false,
    "rolcanlogin": false,
    "rolbypassrls": false
  },
  {
    "rolname": "authenticated",
    "rolsuper": false,
    "rolinherit": true,
    "rolcreaterole": false,
    "rolcreatedb": false,
    "rolcanlogin": false,
    "rolbypassrls": false
  },
  {
    "rolname": "authenticator",
    "rolsuper": false,
    "rolinherit": false,
    "rolcreaterole": false,
    "rolcreatedb": false,
    "rolcanlogin": true,
    "rolbypassrls": false
  },
  {
    "rolname": "postgres",
    "rolsuper": false,
    "rolinherit": true,
    "rolcreaterole": true,
    "rolcreatedb": true,
    "rolcanlogin": true,
    "rolbypassrls": true
  },
  {
    "rolname": "service_role",
    "rolsuper": false,
    "rolinherit": true,
    "rolcreaterole": false,
    "rolcreatedb": false,
    "rolcanlogin": false,
    "rolbypassrls": true
  },
  {
    "rolname": "supabase_admin",
    "rolsuper": true,
    "rolinherit": true,
    "rolcreaterole": true,
    "rolcreatedb": true,
    "rolcanlogin": true,
    "rolbypassrls": true
  }
]
```

---

## [C1] Role membership edges
Columns: `member_role, is_member_of, with_admin_option, target_rolinherit`

```json
[
  {
    "member_role": "postgres",
    "is_member_of": "anon",
    "with_admin_option": true,
    "target_rolinherit": true
  },
  {
    "member_role": "postgres",
    "is_member_of": "authenticated",
    "with_admin_option": true,
    "target_rolinherit": true
  },
  {
    "member_role": "postgres",
    "is_member_of": "authenticator",
    "with_admin_option": true,
    "target_rolinherit": false
  },
  {
    "member_role": "postgres",
    "is_member_of": "pg_create_subscription",
    "with_admin_option": true,
    "target_rolinherit": true
  },
  {
    "member_role": "postgres",
    "is_member_of": "pg_monitor",
    "with_admin_option": true,
    "target_rolinherit": true
  },
  {
    "member_role": "postgres",
    "is_member_of": "pg_read_all_data",
    "with_admin_option": true,
    "target_rolinherit": true
  },
  {
    "member_role": "postgres",
    "is_member_of": "pg_signal_backend",
    "with_admin_option": true,
    "target_rolinherit": true
  },
  {
    "member_role": "postgres",
    "is_member_of": "service_role",
    "with_admin_option": true,
    "target_rolinherit": true
  },
  {
    "member_role": "postgres",
    "is_member_of": "supabase_privileged_role",
    "with_admin_option": false,
    "target_rolinherit": true
  }
]
```

### Reviewer interpretation — not part of raw evidence ([C1])
`postgres` is a member of 9 roles; **`supabase_admin` is NOT among them** — decisive for supabase_admin-owned
default-privilege authority (see [C2]/[F1]/[F2]).

---

## [C2] Role membership summary
Columns: `current_user, cu_is_member_of_postgres, cu_is_member_of_supabase_admin, postgres_is_member_of_n_roles, supabase_admin_is_member_of_n_roles`

```
[
  {
    "current_user": "postgres",
    "cu_is_member_of_postgres": true,
    "cu_is_member_of_supabase_admin": false,
    "postgres_is_member_of_n_roles": 9,
    "supabase_admin_is_member_of_n_roles": 0
  }
]
```

---

## [D1] Default ACL rows (tables) — 100-row capture (incomplete/truncated relative to the full catalogue)
Columns: `default_owner, schema, grantee, privilege_type, is_object_level`

```json
[
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "anon",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "anon",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "anon",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "anon",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "anon",
    "privilege_type": "SELECT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "anon",
    "privilege_type": "TRIGGER",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "anon",
    "privilege_type": "TRUNCATE",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "anon",
    "privilege_type": "UPDATE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "authenticated",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "authenticated",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "authenticated",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "authenticated",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "authenticated",
    "privilege_type": "SELECT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "authenticated",
    "privilege_type": "TRIGGER",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "authenticated",
    "privilege_type": "TRUNCATE",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "authenticated",
    "privilege_type": "UPDATE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "postgres",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "postgres",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "postgres",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "postgres",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "postgres",
    "privilege_type": "SELECT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "postgres",
    "privilege_type": "TRIGGER",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "postgres",
    "privilege_type": "TRUNCATE",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "postgres",
    "privilege_type": "UPDATE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "service_role",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "service_role",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "service_role",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "service_role",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "service_role",
    "privilege_type": "SELECT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "service_role",
    "privilege_type": "TRIGGER",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "service_role",
    "privilege_type": "TRUNCATE",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "public",
    "grantee": "service_role",
    "privilege_type": "UPDATE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "anon",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "anon",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "anon",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "anon",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "anon",
    "privilege_type": "SELECT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "anon",
    "privilege_type": "TRIGGER",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "anon",
    "privilege_type": "TRUNCATE",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "anon",
    "privilege_type": "UPDATE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "authenticated",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "authenticated",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "authenticated",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "authenticated",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "authenticated",
    "privilege_type": "SELECT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "authenticated",
    "privilege_type": "TRIGGER",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "authenticated",
    "privilege_type": "TRUNCATE",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "authenticated",
    "privilege_type": "UPDATE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "postgres",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "postgres",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "postgres",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "postgres",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "postgres",
    "privilege_type": "SELECT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "postgres",
    "privilege_type": "TRIGGER",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "postgres",
    "privilege_type": "TRUNCATE",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "postgres",
    "privilege_type": "UPDATE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "service_role",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "service_role",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "service_role",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "service_role",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "service_role",
    "privilege_type": "SELECT",
    "is_object_level": false
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "service_role",
    "privilege_type": "TRIGGER",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "service_role",
    "privilege_type": "TRUNCATE",
    "is_object_level": true
  },
  {
    "default_owner": "postgres",
    "schema": "storage",
    "grantee": "service_role",
    "privilege_type": "UPDATE",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "extensions",
    "grantee": "postgres",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "extensions",
    "grantee": "postgres",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "extensions",
    "grantee": "postgres",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "extensions",
    "grantee": "postgres",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "extensions",
    "grantee": "postgres",
    "privilege_type": "SELECT",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "extensions",
    "grantee": "postgres",
    "privilege_type": "TRIGGER",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "extensions",
    "grantee": "postgres",
    "privilege_type": "TRUNCATE",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "extensions",
    "grantee": "postgres",
    "privilege_type": "UPDATE",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "anon",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "anon",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "anon",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "anon",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "anon",
    "privilege_type": "SELECT",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "anon",
    "privilege_type": "TRIGGER",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "anon",
    "privilege_type": "TRUNCATE",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "anon",
    "privilege_type": "UPDATE",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "authenticated",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "authenticated",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "authenticated",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "authenticated",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "authenticated",
    "privilege_type": "SELECT",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "authenticated",
    "privilege_type": "TRIGGER",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "authenticated",
    "privilege_type": "TRUNCATE",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "authenticated",
    "privilege_type": "UPDATE",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "postgres",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "postgres",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "postgres",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "postgres",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "postgres",
    "privilege_type": "SELECT",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "postgres",
    "privilege_type": "TRIGGER",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "postgres",
    "privilege_type": "TRUNCATE",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "postgres",
    "privilege_type": "UPDATE",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "service_role",
    "privilege_type": "DELETE",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "service_role",
    "privilege_type": "INSERT",
    "is_object_level": false
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "service_role",
    "privilege_type": "MAINTAIN",
    "is_object_level": true
  },
  {
    "default_owner": "supabase_admin",
    "schema": "graphql",
    "grantee": "service_role",
    "privilege_type": "REFERENCES",
    "is_object_level": true
  }
]
```

### Reviewer interpretation — not part of raw evidence ([D1])

> **CAPTURE STATUS:** the block above is the **D1 raw capture — 100 rows received; incomplete/truncated
> relative to the full default-ACL catalogue result.** The 100 rows are preserved verbatim and unaltered. This
> truncation was in the captured/exported result, **not** in PJ's process. **The 100-row export does NOT
> prove the absence of later rows.** The decisive public-scope facts are supplied by the focused reconciliation
> evidence: `evidence/YAV2_STAGE_A_DEFAULT_ACL_FOCUSED_RECONCILIATION_RAW_2026-07-31.json` (+ note).

- **postgres-owned `public` table defaults grant `anon`:** DELETE, INSERT, MAINTAIN, REFERENCES, SELECT,
  TRIGGER, TRUNCATE, UPDATE.
- **The current Stage A object-level privileges are:** TRUNCATE, REFERENCES, TRIGGER, MAINTAIN.
- **`storage`, `graphql`, `graphql_public` and `extensions` are outside the present Stage A scope** and must
  remain untouched.
- **SELECT, INSERT, UPDATE and DELETE are outside this Stage A object-level package.**
- **Public-scope confirmation (from the focused reconciliation, authoritative):** `postgres`/`public`/`anon`
  object defaults = **4**; **`supabase_admin`/`public`/`anon` object defaults = 4**; `supabase_admin` global/
  all-schemas = 0. `supabase_admin` also has `graphql` (4) and `graphql_public` (4) anon object defaults, which
  are **outside** Stage A.
- **Conclusion:** **[D2] is confirmed**, **Part B's `IN SCHEMA public` scope is valid**, and **Part A remains
  valid**. (The 100-row D1 export simply did not include the `supabase_admin`/`public` and `graphql_public`
  rows; it does not contradict them.)

---

## [D2] Anon object-level default ACL rows by owner
Columns: `default_owner, anon_truncate, anon_references, anon_trigger, anon_maintain, anon_object_default_rows`
(rows for `postgres` and `supabase_admin`, as supplied by PJ)

```json
[
  {
    "default_owner": "postgres",
    "anon_truncate": true,
    "anon_references": true,
    "anon_trigger": true,
    "anon_maintain": true,
    "anon_object_default_rows": 4
  },
  {
    "default_owner": "supabase_admin",
    "anon_truncate": true,
    "anon_references": true,
    "anon_trigger": true,
    "anon_maintain": true,
    "anon_object_default_rows": 4
  }
]
```

### Reviewer interpretation — not part of raw evidence ([D2])
Recorded verbatim as supplied. **[D2] is CONFIRMED by the focused reconciliation evidence**
(`evidence/YAV2_STAGE_A_DEFAULT_ACL_FOCUSED_RECONCILIATION_RAW_2026-07-31.json`): `supabase_admin`/`public`/
`anon` object-level defaults = **4** (public-scoped). Part B's `IN SCHEMA public` premise is therefore valid.
The `supabase_admin` `graphql`/`graphql_public` defaults exist but are **outside** Stage A.

---

## [E1] Ownership of the exact 28 tables
Columns: `table_owner, tables_owned_in_scope, owned_by_current_user`

```
[
  {
    "table_owner": "postgres",
    "owned_by_current_user": 28,
    "tables_owned_in_scope": 28
  }
]
```

---

## [F1] Authority input facts
Columns: `current_user, cu_member_of_postgres, cu_usage_of_postgres, cu_member_of_supabase_admin, cu_usage_of_supabase_admin, cu_is_superuser, cu_has_create_on_public_NON_DECISIVE, cu_owns_public_schema_NON_DECISIVE, public_schema_owner`

```
[
  {
    "current_user": "postgres",
    "cu_is_superuser": false,
    "public_schema_owner": "pg_database_owner",
    "cu_usage_of_postgres": true,
    "cu_member_of_postgres": true,
    "cu_usage_of_supabase_admin": false,
    "cu_member_of_supabase_admin": false,
    "cu_owns_public_schema_non_decisive": false,
    "cu_has_create_on_public_non_decisive": true
  }
]
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
