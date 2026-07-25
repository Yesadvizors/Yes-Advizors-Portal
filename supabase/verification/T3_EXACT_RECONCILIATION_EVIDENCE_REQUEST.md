# T3 — Exact Source-to-Live Reconciliation: consolidated read-only evidence request (PJ, V2 only)

**One bundled request** to obtain the exact live detail needed to finish the source-to-live reconciliation
(`T3_EXACT_SOURCE_TO_LIVE_RECONCILIATION.md`). **Target: V2 / yav2-dev `ogjrwemjefvccpyjwxuo` ONLY.**
**Never** V1 `zcszesuvjrryxtigjglt`. **Every query is read-only** (SELECT / catalog inspection). **No CREATE,
ALTER, DROP, INSERT, UPDATE, DELETE, GRANT, REVOKE, TRUNCATE, temp-table, or migration command.**
**T3 does not and may not execute any of this** — it is prepared for PJ's manual V2 SQL Editor run.

## Pre-flight (safety gate — run first; abort on any V1 indication)
```sql
select current_database() as db,
       current_setting('search_path', true) as search_path,
       inet_server_addr() as server_ip;
-- Visually confirm the Supabase project selector shows ogjrwemjefvccpyjwxuo (yav2-dev, ap-south-1).
-- ABORT immediately if anything indicates zcszesuvjrryxtigjglt.
```
**PJ must visually confirm the project is V2 / yav2-dev `ogjrwemjefvccpyjwxuo` before running any query below.**
Every statement in this request is a read-only `SELECT`/catalog inspection; no session-level `SET` or any other
non-SELECT statement is used or required.

Capture every result set as text/CSV tagged `Sb-Project-Ref: ogjrwemjefvccpyjwxuo` + timestamp. **Never paste
secret values** (keys/JWTs). Return outputs to T3 for reconciliation (T3 runs no SQL).

---

## Section 1 — COLUMN inventory (14 tables) — closes G-03 field-by-field
Expected output per column: `table_name, ordinal_position, column_name, data_type, udt_name,
is_nullable, column_default, is_identity, identity_generation, is_generated, generation_expression`.
```sql
select c.table_name, c.ordinal_position, c.column_name, c.data_type, c.udt_name,
       c.is_nullable, c.column_default, c.is_identity, c.identity_generation,
       c.is_generated, c.generation_expression
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in (
    'clients','team','client_persons','client_identifiers','client_addresses','client_contacts',
    'client_registrations','gst_registration_details','client_relationships',
    'client_service_applicability','service_catalogue','audit_event_contract','audit_log',
    'audit_ingestion_failures')
order by c.table_name, c.ordinal_position;
```
**Reconciliation use:** compared field-by-field against the source contract (`T3_DB_CONTRACT_APPENDIX.md`
§A/§C/§D). Each column → exact match / confirmed variance / evidence-pending.

## Section 2 — CONSTRAINTS (14 tables) — PK / UNIQUE / FK / CHECK
Expected: `table_name, constraint_name, constraint_type, definition`.
```sql
select rel.relname as table_name, con.conname as constraint_name,
       case con.contype when 'p' then 'PRIMARY KEY' when 'u' then 'UNIQUE'
            when 'f' then 'FOREIGN KEY' when 'c' then 'CHECK' else con.contype::text end as constraint_type,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace n on n.oid = rel.relnamespace and n.nspname = 'public'
where rel.relname in (
    'clients','team','client_persons','client_identifiers','client_addresses','client_contacts',
    'client_registrations','gst_registration_details','client_relationships',
    'client_service_applicability','service_catalogue','audit_event_contract','audit_log',
    'audit_ingestion_failures')
order by rel.relname, con.contype, con.conname;
```

## Section 3 — INDEXES (14 tables) — contract-relevant
Expected: `tablename, indexname, indexdef`.
```sql
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'clients','team','client_persons','client_identifiers','client_addresses','client_contacts',
    'client_registrations','gst_registration_details','client_relationships',
    'client_service_applicability','service_catalogue','audit_event_contract','audit_log',
    'audit_ingestion_failures')
order by tablename, indexname;
```

## Section 4 — ENUM types + labels + ordering — closes enum reconciliation
Expected: `enum_type, label, sort_order`. Source expects **19** enum types with the ordered label sets in
`T3_DB_CONTRACT_PROPOSAL.md §1` / `contracts/G-16_SOURCE_CONTRACT_FREEZE.md A.1`.
```sql
select t.typname as enum_type, e.enumlabel as label, e.enumsortorder as sort_order
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace and n.nspname = 'public'
order by t.typname, e.enumsortorder;
-- Also count distinct enum types:
select count(distinct t.typname) as enum_type_count
from pg_type t join pg_namespace n on n.oid = t.typnamespace and n.nspname='public'
where t.typtype = 'e';
```
**Reconciliation use:** type count (expect 19), type names, per-type label set, and label ordinal order —
each classified separately (existence must not imply label/order equality).

## Section 5 — FUNCTION contract (all public functions) — closes G-05/G-06 exact
Expected: `function_name, arguments, return_type, language, volatility, security, search_path (proconfig),
execute_grants`. Source expects **51** functions (`T3_LIVE_V2_RECONCILIATION.md §B`).
```sql
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as return_type,
       l.lanname as language,
       case p.provolatile when 'i' then 'IMMUTABLE' when 's' then 'STABLE' when 'v' then 'VOLATILE' end as volatility,
       case when p.prosecdef then 'DEFINER' else 'INVOKER' end as security,
       p.proconfig as config_search_path,
       coalesce((
         select string_agg(distinct case when a.grantee = 0 then 'PUBLIC' else r.rolname end, ',')
         from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
         left join pg_roles r on r.oid = a.grantee
         where a.privilege_type = 'EXECUTE'
       ), '(default)') as execute_grantees
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
join pg_language l on l.oid = p.prolang
order by p.proname;
```
**Reconciliation use (risk-based):** privileged role/audit functions (`get_app_role*`, `is_admin*`,
`is_active_user`, `get_portal_role`, `get_sensitive_audit_logs`, `audit_*`, `_write_read_audit`,
`_record_audit_failure`) and CRUD/security RPCs (`client_*`, `gst_detail_*`, `audit_write_event`) →
signature + security + search_path + grants reconciled exactly; pure calc helpers (`calc_gst_due_date`,
`get_client_start_fy`, FY helpers) → proportionate. **Re-confirms the 17 PUBLIC/anon EXECUTE (G-05, V-5),
which are NOT to be revoked.** **Function-body evidence — all 16 privileged role/audit functions** (identity
arguments included so any overload is matched to the exact function):
```sql
select p.proname,
       pg_get_function_identity_arguments(p.oid) as identity_arguments,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
where p.proname in (
  'get_app_role','get_app_role_for_user','get_my_role','get_my_team_id','get_portal_role',
  'is_active_user','is_admin','is_admin_or_manager','get_sensitive_audit_logs','audit_write_event',
  'audit_validate_event','audit_contains_secret','audit_field_format_ok','audit_is_uuid',
  '_write_read_audit','_record_audit_failure')
order by p.proname, identity_arguments;
```
This body list is the **same 16 privileged role/audit functions** as the "Privileged role/audit" tier in
`T3_EXACT_SOURCE_TO_LIVE_RECONCILIATION.md §3`. (Bodies for CRUD/security RPCs may be added on the same
pattern where materially required.)

## Section 6 — VIEW definitions — closes live-view definition reconciliation (G-11)
Expected: `view_name, definition`. Source definitions in `0009_views.sql`.
```sql
select c.relname as view_name,
       pg_get_viewdef(c.oid, true) as definition,
       (select option_value from pg_options_to_table(c.reloptions)
          where option_name = 'security_invoker') as security_invoker
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
where c.relkind = 'v'
  and c.relname in ('v_firm_dashboard','v_client_compliance_summary','v_overdue_ageing')
order by c.relname;
-- Confirm v_team_workload remains absent (expected):
select count(*) as v_team_workload_present
from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
where c.relkind='v' and c.relname='v_team_workload';
```
**Reconciliation use:** compare selected columns, aliases, joins, filters, aggregations, calculations and
`security_invoker` against source. View existence must NOT be treated as definition equality.

---

## Expected-output summary (what each section closes)
| Section | Closes | Expected result vs source |
|---|---|---|
| 1 Columns | G-03 field-by-field (14 tables) | column set/ordinal/type/nullability/default match `APPENDIX §A/C/D` |
| 2 Constraints | G-03 PK/UNIQUE/FK/CHECK | match appendix constraint list |
| 3 Indexes | G-03 indexes | match appendix index list (partial/unique) |
| 4 Enums | enum count/names/labels/ordering | 19 types; ordered labels per `§1` |
| 5 Functions | G-05 grants, G-06 search_path, signatures | 51 fns; 48 DEFINER/3 INVOKER; all pinned; **17 PUBLIC/anon EXECUTE confirmed** |
| 6 Views | G-11 definitions | 3 defs match `0009`; `v_team_workload` absent |

## Constraints on this request
V2 only · read-only · no mutation/temp-table/DDL/DML/GRANT/REVOKE/migration · no secrets in outputs ·
T3 executes nothing (PJ manual run) · no remediation implied.

## Governance footer
```
Governing Issue: #23 · Integration HEAD: 65e20a44e386f91ee85912414ad86e593cda11a1
Role: T3 — DATA SECURITY · Branch: sync/supabase-security · Draft PR base: sync/integration
Target: V2 ogjrwemjefvccpyjwxuo ONLY · Prohibited: V1 zcszesuvjrryxtigjglt
Read-only evidence request (PJ-executed, NOT by T3) · SQL/DB mutation: NOT AUTHORISED · V1 access: NONE
```
