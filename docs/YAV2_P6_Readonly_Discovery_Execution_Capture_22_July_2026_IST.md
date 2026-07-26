# YAV2 Portal V2 — M1-B P6 Read-Only Discovery Execution Capture

**Execution date:** 22 July 2026 IST  
**Executor:** PJ (manual execution in Supabase SQL Editor)  
**Authorised target:** Supabase V2 / `yav2-dev`  
**Required project ref:** `ogjrwemjefvccpyjwxuo`  
**Prohibited target:** V1 / Production `zcszesuvjrryxtigjglt`  
**Execution mode:** Read-only discovery only; no DDL, DML, migration, RPC invocation, commit or push.

## Important completeness note

- **B1 output was limited by the Supabase UI to 100 rows.** The captured output is therefore not a complete inventory of every requested table/column.
- **B6 output was also limited by the Supabase UI to 100 rows.** The captured grant list is therefore incomplete.
- All other blocks were captured as returned.
- Claude must treat B1 and B6 as **partial evidence** and either:
  1. redesign those queries into grouped/count-based or per-table batches; or
  2. ask PJ to rerun them with a sufficiently high row limit.
- No implementation or Migration `0023` authoring is authorised from this capture alone.

---

## B0 — Environment attestation

Manual dashboard confirmation was performed for V2 / `yav2-dev`. SQL returned:

```json
[
  {
    "database_name_not_a_project_ref": "postgres",
    "run_as": "postgres",
    "mandatory_manual_check": "SQL CANNOT PROVE THE PROJECT REF — PJ MUST manually confirm dashboard ref = ogjrwemjefvccpyjwxuo (V2) before B1..B20"
  }
]
```

**Result:** PASS as an environment reminder only. SQL does not prove project ref.

---

## B1 — Table inventory

**Status:** PARTIAL — Supabase result limit was 100 rows.

```json
[
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 1,
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 2,
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 3,
    "column_name": "fy_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 4,
    "column_name": "fy_label",
    "data_type": "character varying",
    "character_maximum_length": 10,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 5,
    "column_name": "month",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 6,
    "column_name": "period_label",
    "data_type": "character varying",
    "character_maximum_length": 30,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 7,
    "column_name": "sales_booked",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 8,
    "column_name": "purchase_booked",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 9,
    "column_name": "bank_entries_completed",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 10,
    "column_name": "expense_entries_completed",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 11,
    "column_name": "journal_entries_completed",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 12,
    "column_name": "payroll_entries_completed",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 13,
    "column_name": "gst_reconciliation_done",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 14,
    "column_name": "tds_reconciliation_done",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 15,
    "column_name": "debtors_reconciliation_done",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 16,
    "column_name": "creditors_reconciliation_done",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 17,
    "column_name": "bank_reconciliation_done",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 18,
    "column_name": "month_closing_done",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 19,
    "column_name": "mis_prepared",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 20,
    "column_name": "mis_sent_to_client",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 21,
    "column_name": "mis_sent_date",
    "data_type": "date",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 22,
    "column_name": "workflow_stage",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "'Assigned'::workflow_stage_enum"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 23,
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "'Not Started'::compliance_status_enum"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 24,
    "column_name": "assigned_to",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 25,
    "column_name": "assigned_date",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 26,
    "column_name": "prepared_by",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 27,
    "column_name": "prepared_date",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 28,
    "column_name": "reviewed_by",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 29,
    "column_name": "reviewed_date",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 30,
    "column_name": "partner_approved_by",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 31,
    "column_name": "partner_approved_date",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 32,
    "column_name": "remarks",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 33,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "accounting_tracker",
    "ordinal_position": 34,
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "audit_event_contract",
    "ordinal_position": 1,
    "column_name": "event_name",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "audit_event_contract",
    "ordinal_position": 2,
    "column_name": "risk_tier",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "audit_event_contract",
    "ordinal_position": 3,
    "column_name": "sensitivity",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "audit_event_contract",
    "ordinal_position": 4,
    "column_name": "required_keys",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": "'{}'::text[]"
  },
  {
    "table_name": "audit_event_contract",
    "ordinal_position": 5,
    "column_name": "optional_keys",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": "'{}'::text[]"
  },
  {
    "table_name": "audit_event_contract",
    "ordinal_position": 6,
    "column_name": "allow_empty_metadata",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": "false"
  },
  {
    "table_name": "audit_event_contract",
    "ordinal_position": 7,
    "column_name": "client_requirement",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "audit_event_contract",
    "ordinal_position": 8,
    "column_name": "target_user_requirement",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "audit_event_contract",
    "ordinal_position": 9,
    "column_name": "permitted_actor_types",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "audit_event_contract",
    "ordinal_position": 10,
    "column_name": "permitted_actions",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": "'{}'::text[]"
  },
  {
    "table_name": "audit_event_contract",
    "ordinal_position": 11,
    "column_name": "permitted_resource_types",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": "'{}'::text[]"
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 1,
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 2,
    "column_name": "occurred_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 3,
    "column_name": "initiated_by_type",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 4,
    "column_name": "actor_user_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 5,
    "column_name": "actor_service",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 6,
    "column_name": "actor_app_role",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 7,
    "column_name": "target_user_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 8,
    "column_name": "client_uuid",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 9,
    "column_name": "client_code_snapshot",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 10,
    "column_name": "resource_type",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 11,
    "column_name": "resource_id",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 12,
    "column_name": "event_name",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 13,
    "column_name": "event_category",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 14,
    "column_name": "action",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 15,
    "column_name": "description",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 16,
    "column_name": "risk_tier",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 17,
    "column_name": "sensitivity_tier",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_log",
    "ordinal_position": 18,
    "column_name": "metadata",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": "'{}'::jsonb"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 1,
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 2,
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 3,
    "column_name": "fy_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 4,
    "column_name": "fy_label",
    "data_type": "character varying",
    "character_maximum_length": 10,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 5,
    "column_name": "audit_type",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 6,
    "column_name": "applicability_reason",
    "data_type": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 7,
    "column_name": "standard_due_date",
    "data_type": "date",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 8,
    "column_name": "extended_due_date",
    "data_type": "date",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 9,
    "column_name": "individual_due_date",
    "data_type": "date",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 10,
    "column_name": "books_received",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 11,
    "column_name": "trial_balance_received",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 12,
    "column_name": "ledger_received",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 13,
    "column_name": "bank_statement_received",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 14,
    "column_name": "gst_data_received",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 15,
    "column_name": "tds_data_received",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 16,
    "column_name": "prev_year_financials",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 17,
    "column_name": "fixed_asset_register",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 18,
    "column_name": "loan_confirmations",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 19,
    "column_name": "debtors_confirmation",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 20,
    "column_name": "creditors_confirmation",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 21,
    "column_name": "inventory_details",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 22,
    "column_name": "audit_query_raised",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 23,
    "column_name": "audit_query_date",
    "data_type": "date",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 24,
    "column_name": "query_replied",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 25,
    "column_name": "query_reply_date",
    "data_type": "date",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 26,
    "column_name": "audit_working_prepared",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 27,
    "column_name": "review_completed",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 28,
    "column_name": "partner_review_done",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 29,
    "column_name": "financial_statements_final",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 30,
    "column_name": "udin_generated",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 31,
    "column_name": "udin_number",
    "data_type": "character varying",
    "character_maximum_length": 50,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 32,
    "column_name": "audit_report_signed",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 33,
    "column_name": "signing_date",
    "data_type": "date",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 34,
    "column_name": "filing_completed",
    "data_type": "boolean",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 35,
    "column_name": "filing_date",
    "data_type": "date",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 36,
    "column_name": "workflow_stage",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "'Assigned'::workflow_stage_enum"
  },
  {
    "table_name": "audit_tracker",
    "ordinal_position": 37,
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "is_nullable": "YES",
    "column_default": "'Not Started'::compliance_status_enum"
  }
]
```

---

## B2 — Constraints

**Status:** Captured.

Key confirmed controls include:

- Business-unique keys on accounting, financials, income tax, GST, TDS, ROC, LLP, audit and payroll trackers.
- `compliance_calendar` unique on `(client_id, compliance_tracker_id)`.
- `client_service_applicability` approval, date, service, owner and same-client registration constraints.
- `service_catalogue` and applicability frequency checks.
- Primary keys across listed surfaces.

```json
[
  {
    "table_name": "accounting_tracker",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "accounting_tracker_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "accounting_tracker",
    "constraint_type": "UNIQUE",
    "constraint_name": "accounting_tracker_client_id_fy_label_month_key",
    "definition": "UNIQUE (client_id, fy_label, month)"
  },
  {
    "table_name": "audit_event_contract",
    "constraint_type": "CHECK",
    "constraint_name": "audit_event_contract_client_requirement_check",
    "definition": "CHECK ((client_requirement = ANY (ARRAY['required'::text, 'optional'::text, 'prohibited'::text])))"
  },
  {
    "table_name": "audit_event_contract",
    "constraint_type": "CHECK",
    "constraint_name": "audit_event_contract_risk_tier_check",
    "definition": "CHECK ((risk_tier = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])))"
  },
  {
    "table_name": "audit_event_contract",
    "constraint_type": "CHECK",
    "constraint_name": "audit_event_contract_sensitivity_check",
    "definition": "CHECK ((sensitivity = ANY (ARRAY['S1'::text, 'S2'::text, 'S3'::text, 'S4'::text])))"
  },
  {
    "table_name": "audit_event_contract",
    "constraint_type": "CHECK",
    "constraint_name": "audit_event_contract_target_user_requirement_check",
    "definition": "CHECK ((target_user_requirement = ANY (ARRAY['required'::text, 'optional'::text, 'prohibited'::text])))"
  },
  {
    "table_name": "audit_event_contract",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "audit_event_contract_pkey",
    "definition": "PRIMARY KEY (event_name)"
  },
  {
    "table_name": "audit_log",
    "constraint_type": "CHECK",
    "constraint_name": "audit_log_initiated_by_type_check",
    "definition": "CHECK ((initiated_by_type = ANY (ARRAY['user'::text, 'service'::text])))"
  },
  {
    "table_name": "audit_log",
    "constraint_type": "CHECK",
    "constraint_name": "audit_log_risk_tier_check",
    "definition": "CHECK ((risk_tier = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])))"
  },
  {
    "table_name": "audit_log",
    "constraint_type": "CHECK",
    "constraint_name": "audit_log_sensitivity_tier_check",
    "definition": "CHECK ((sensitivity_tier = ANY (ARRAY['S1'::text, 'S2'::text, 'S3'::text, 'S4'::text])))"
  },
  {
    "table_name": "audit_log",
    "constraint_type": "CHECK",
    "constraint_name": "chk_actor_service",
    "definition": "CHECK (((initiated_by_type <> 'service'::text) OR ((actor_service IS NOT NULL) AND (actor_user_id IS NULL))))"
  },
  {
    "table_name": "audit_log",
    "constraint_type": "CHECK",
    "constraint_name": "chk_actor_user",
    "definition": "CHECK (((initiated_by_type <> 'user'::text) OR ((actor_user_id IS NOT NULL) AND (actor_service IS NULL))))"
  },
  {
    "table_name": "audit_log",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "audit_log_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "audit_tracker",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "audit_tracker_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "audit_tracker",
    "constraint_type": "UNIQUE",
    "constraint_name": "audit_tracker_client_id_audit_type_fy_label_key",
    "definition": "UNIQUE (client_id, audit_type, fy_label)"
  },
  {
    "table_name": "client_registrations",
    "constraint_type": "CHECK",
    "constraint_name": "client_registrations_dates_chk",
    "definition": "CHECK (((effective_to IS NULL) OR (effective_from IS NULL) OR (effective_to >= effective_from)))"
  },
  {
    "table_name": "client_registrations",
    "constraint_type": "CHECK",
    "constraint_name": "client_registrations_status_check",
    "definition": "CHECK ((status = ANY (ARRAY['Applied'::text, 'Active'::text, 'Suspended'::text, 'Cancelled'::text])))"
  },
  {
    "table_name": "client_registrations",
    "constraint_type": "FOREIGN KEY",
    "constraint_name": "client_registrations_client_id_fkey",
    "definition": "FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT"
  },
  {
    "table_name": "client_registrations",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "client_registrations_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "client_registrations",
    "constraint_type": "UNIQUE",
    "constraint_name": "client_registrations_id_client_uq",
    "definition": "UNIQUE (id, client_id)"
  },
  {
    "table_name": "client_service_applicability",
    "constraint_type": "CHECK",
    "constraint_name": "client_service_applicability_frequency_check",
    "definition": "CHECK (((frequency IS NULL) OR (frequency = ANY (ARRAY['MONTHLY'::text, 'QUARTERLY'::text, 'HALF_YEARLY'::text, 'ANNUAL'::text, 'EVENT_BASED'::text, 'ONE_TIME'::text, 'AS_REQUIRED'::text]))))"
  },
  {
    "table_name": "client_service_applicability",
    "constraint_type": "CHECK",
    "constraint_name": "client_service_applicability_status_check",
    "definition": "CHECK ((status = ANY (ARRAY['Draft'::text, 'Approved'::text, 'Inactive'::text])))"
  },
  {
    "table_name": "client_service_applicability",
    "constraint_type": "CHECK",
    "constraint_name": "csa_approval_actor_chk",
    "definition": "CHECK (((status <> 'Approved'::text) OR ((approved_by IS NOT NULL) AND (approved_at IS NOT NULL))))"
  },
  {
    "table_name": "client_service_applicability",
    "constraint_type": "CHECK",
    "constraint_name": "csa_dates_chk",
    "definition": "CHECK (((effective_to IS NULL) OR (effective_from IS NULL) OR (effective_to >= effective_from)))"
  },
  {
    "table_name": "client_service_applicability",
    "constraint_type": "CHECK",
    "constraint_name": "csa_effective_from_gate_chk",
    "definition": "CHECK (((status <> 'Approved'::text) OR (effective_from IS NOT NULL)))"
  },
  {
    "table_name": "client_service_applicability",
    "constraint_type": "CHECK",
    "constraint_name": "csa_effective_to_null_when_approved_chk",
    "definition": "CHECK (((status <> 'Approved'::text) OR (effective_to IS NULL)))"
  },
  {
    "table_name": "client_service_applicability",
    "constraint_type": "CHECK",
    "constraint_name": "csa_other_notes_required_chk",
    "definition": "CHECK (((service_code <> 'OTHER'::text) OR ((notes IS NOT NULL) AND (btrim(notes) <> ''::text))))"
  },
  {
    "table_name": "client_service_applicability",
    "constraint_type": "FOREIGN KEY",
    "constraint_name": "client_service_applicability_client_id_fkey",
    "definition": "FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT"
  },
  {
    "table_name": "client_service_applicability",
    "constraint_type": "FOREIGN KEY",
    "constraint_name": "client_service_applicability_owner_team_id_fkey",
    "definition": "FOREIGN KEY (owner_team_id) REFERENCES team(id)"
  },
  {
    "table_name": "client_service_applicability",
    "constraint_type": "FOREIGN KEY",
    "constraint_name": "client_service_applicability_service_code_fkey",
    "definition": "FOREIGN KEY (service_code) REFERENCES service_catalogue(code) ON DELETE RESTRICT"
  },
  {
    "table_name": "client_service_applicability",
    "constraint_type": "FOREIGN KEY",
    "constraint_name": "csa_registration_same_client_fk",
    "definition": "FOREIGN KEY (linked_registration_id, client_id) REFERENCES client_registrations(id, client_id) ON DELETE RESTRICT"
  },
  {
    "table_name": "client_service_applicability",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "client_service_applicability_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "clients",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "clients_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "clients",
    "constraint_type": "UNIQUE",
    "constraint_name": "clients_client_id_key",
    "definition": "UNIQUE (client_id)"
  },
  {
    "table_name": "compliance_calendar",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "compliance_calendar_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "compliance_calendar",
    "constraint_type": "UNIQUE",
    "constraint_name": "compliance_calendar_client_tracker_key",
    "definition": "UNIQUE (client_id, compliance_tracker_id)"
  },
  {
    "table_name": "financial_years",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "financial_years_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "financial_years",
    "constraint_type": "UNIQUE",
    "constraint_name": "financial_years_fy_label_key",
    "definition": "UNIQUE (fy_label)"
  },
  {
    "table_name": "financials_tracker",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "financials_tracker_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "financials_tracker",
    "constraint_type": "UNIQUE",
    "constraint_name": "financials_tracker_client_id_fy_label_doc_type_key",
    "definition": "UNIQUE (client_id, fy_label, doc_type)"
  },
  {
    "table_name": "gst_tracker",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "gst_tracker_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "gst_tracker",
    "constraint_type": "UNIQUE",
    "constraint_name": "gst_tracker_client_id_gstin_return_type_fy_label_period_key",
    "definition": "UNIQUE (client_id, gstin, return_type, fy_label, period)"
  },
  {
    "table_name": "income_tax_tracker",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "income_tax_tracker_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "income_tax_tracker",
    "constraint_type": "UNIQUE",
    "constraint_name": "income_tax_tracker_client_id_fy_label_key",
    "definition": "UNIQUE (client_id, fy_label)"
  },
  {
    "table_name": "llp_tracker",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "llp_tracker_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "llp_tracker",
    "constraint_type": "UNIQUE",
    "constraint_name": "llp_tracker_client_fy_llpin_form_key",
    "definition": "UNIQUE (client_id, fy_label, llpin, form_name)"
  },
  {
    "table_name": "notice_tracker",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "notice_tracker_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "payroll_tracker",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "payroll_tracker_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "payroll_tracker",
    "constraint_type": "UNIQUE",
    "constraint_name": "payroll_tracker_client_id_fy_label_month_key",
    "definition": "UNIQUE (client_id, fy_label, month)"
  },
  {
    "table_name": "roc_tracker",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "roc_tracker_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "roc_tracker",
    "constraint_type": "UNIQUE",
    "constraint_name": "roc_tracker_client_fy_cin_form_key",
    "definition": "UNIQUE (client_id, fy_label, cin, form_name)"
  },
  {
    "table_name": "service_catalogue",
    "constraint_type": "CHECK",
    "constraint_name": "service_catalogue_default_frequency_check",
    "definition": "CHECK (((default_frequency IS NULL) OR (default_frequency = ANY (ARRAY['MONTHLY'::text, 'QUARTERLY'::text, 'HALF_YEARLY'::text, 'ANNUAL'::text, 'EVENT_BASED'::text, 'ONE_TIME'::text, 'AS_REQUIRED'::text]))))"
  },
  {
    "table_name": "service_catalogue",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "service_catalogue_pkey",
    "definition": "PRIMARY KEY (code)"
  },
  {
    "table_name": "tasks",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "tasks_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "tds_tracker",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "tds_tracker_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "table_name": "tds_tracker",
    "constraint_type": "UNIQUE",
    "constraint_name": "tds_tracker_client_id_form_type_quarter_fy_label_key",
    "definition": "UNIQUE (client_id, form_type, quarter, fy_label)"
  },
  {
    "table_name": "trust_ngo_tracker",
    "constraint_type": "PRIMARY KEY",
    "constraint_name": "trust_ngo_tracker_pkey",
    "definition": "PRIMARY KEY (id)"
  }
]
```

---

## B3 — Indexes

**Status:** Captured.

Key indexes confirmed:

- `accounting_tracker_client_id_fy_label_month_key`
- `audit_tracker_client_id_audit_type_fy_label_key`
- `client_registrations_uq`
- `client_service_applicability_live_uq`
- `compliance_calendar_client_tracker_key`
- `financials_tracker_client_id_fy_label_doc_type_key`
- `gst_tracker_client_id_gstin_return_type_fy_label_period_key`
- `income_tax_tracker_client_id_fy_label_key`
- `llp_tracker_client_fy_llpin_form_key`
- `payroll_tracker_client_id_fy_label_month_key`
- `roc_tracker_client_fy_cin_form_key`
- `tds_tracker_client_id_form_type_quarter_fy_label_key`

---

## B4 — RLS status

All listed P6 tables returned `rls_enabled = true`.

`rls_forced = true` on:

- `audit_event_contract`
- `audit_log`
- `client_registrations`
- `client_service_applicability`
- `service_catalogue`

Other listed surfaces had RLS enabled but not forced.

---

## B5 — RLS policies

**Status:** Captured.

Key observations:

- Admin/Manager generally have broad access.
- Executive/Staff/Viewer access is narrower.
- `client_service_applicability` currently exposes SELECT to authenticated Admin/Manager through RLS.
- Service catalogue SELECT is available to active authenticated users.

```json
[
  {
    "schemaname": "public",
    "tablename": "accounting_tracker",
    "policyname": "acc_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "is_admin_or_manager()",
    "with_check_expr": "is_admin_or_manager()"
  },
  {
    "schemaname": "public",
    "tablename": "accounting_tracker",
    "policyname": "acc_executive_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "accounting_tracker",
    "policyname": "acc_executive_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))"
  },
  {
    "schemaname": "public",
    "tablename": "audit_tracker",
    "policyname": "audit_tracker_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "is_admin_or_manager()",
    "with_check_expr": "is_admin_or_manager()"
  },
  {
    "schemaname": "public",
    "tablename": "audit_tracker",
    "policyname": "audit_tracker_executive_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "audit_tracker",
    "policyname": "audit_tracker_executive_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))"
  },
  {
    "schemaname": "public",
    "tablename": "client_registrations",
    "policyname": "client_registrations_insert",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "using_expr": null,
    "with_check_expr": "(is_active_user() AND is_admin_or_manager())"
  },
  {
    "schemaname": "public",
    "tablename": "client_registrations",
    "policyname": "client_registrations_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND is_admin_or_manager())",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "client_registrations",
    "policyname": "client_registrations_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND is_admin_or_manager())",
    "with_check_expr": "(is_active_user() AND is_admin_or_manager())"
  },
  {
    "schemaname": "public",
    "tablename": "client_service_applicability",
    "policyname": "client_service_applicability_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND is_admin_or_manager())",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "clients",
    "policyname": "clients_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "is_admin_or_manager()",
    "with_check_expr": "is_admin_or_manager()"
  },
  {
    "schemaname": "public",
    "tablename": "clients",
    "policyname": "clients_executive_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "compliance_calendar",
    "policyname": "cal_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "is_admin_or_manager()",
    "with_check_expr": "is_admin_or_manager()"
  },
  {
    "schemaname": "public",
    "tablename": "compliance_calendar",
    "policyname": "cal_executive_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "compliance_calendar",
    "policyname": "cal_executive_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))"
  },
  {
    "schemaname": "public",
    "tablename": "financials_tracker",
    "policyname": "financials_tracker_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "is_admin_or_manager()",
    "with_check_expr": "is_admin_or_manager()"
  },
  {
    "schemaname": "public",
    "tablename": "financials_tracker",
    "policyname": "financials_tracker_executive_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "financials_tracker",
    "policyname": "financials_tracker_executive_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))"
  },
  {
    "schemaname": "public",
    "tablename": "gst_tracker",
    "policyname": "gst_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "is_admin_or_manager()",
    "with_check_expr": "is_admin_or_manager()"
  },
  {
    "schemaname": "public",
    "tablename": "gst_tracker",
    "policyname": "gst_executive_select_update",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "gst_tracker",
    "policyname": "gst_executive_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))"
  },
  {
    "schemaname": "public",
    "tablename": "income_tax_tracker",
    "policyname": "itr_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "is_admin_or_manager()",
    "with_check_expr": "is_admin_or_manager()"
  },
  {
    "schemaname": "public",
    "tablename": "income_tax_tracker",
    "policyname": "itr_executive_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "income_tax_tracker",
    "policyname": "itr_executive_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))"
  },
  {
    "schemaname": "public",
    "tablename": "llp_tracker",
    "policyname": "llp_tracker_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Admin'::text, 'Manager'::text])))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Admin'::text, 'Manager'::text])))"
  },
  {
    "schemaname": "public",
    "tablename": "llp_tracker",
    "policyname": "llp_tracker_executive_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "llp_tracker",
    "policyname": "llp_tracker_executive_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text])))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text])))"
  },
  {
    "schemaname": "public",
    "tablename": "notice_tracker",
    "policyname": "notice_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "is_admin_or_manager()",
    "with_check_expr": "is_admin_or_manager()"
  },
  {
    "schemaname": "public",
    "tablename": "notice_tracker",
    "policyname": "notice_executive_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "notice_tracker",
    "policyname": "notice_executive_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))"
  },
  {
    "schemaname": "public",
    "tablename": "payroll_tracker",
    "policyname": "payroll_tracker_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Admin'::text, 'Manager'::text])))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Admin'::text, 'Manager'::text])))"
  },
  {
    "schemaname": "public",
    "tablename": "payroll_tracker",
    "policyname": "payroll_tracker_executive_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "payroll_tracker",
    "policyname": "payroll_tracker_executive_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text])))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text])))"
  },
  {
    "schemaname": "public",
    "tablename": "roc_tracker",
    "policyname": "roc_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "is_admin_or_manager()",
    "with_check_expr": "is_admin_or_manager()"
  },
  {
    "schemaname": "public",
    "tablename": "roc_tracker",
    "policyname": "roc_executive_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "roc_tracker",
    "policyname": "roc_executive_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))"
  },
  {
    "schemaname": "public",
    "tablename": "service_catalogue",
    "policyname": "service_catalogue_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "is_active_user()",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "tasks",
    "policyname": "tasks_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "is_admin_or_manager()",
    "with_check_expr": "is_admin_or_manager()"
  },
  {
    "schemaname": "public",
    "tablename": "tasks",
    "policyname": "tasks_executive_staff_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text])))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text])))"
  },
  {
    "schemaname": "public",
    "tablename": "tasks",
    "policyname": "tasks_viewer_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = 'Viewer'::text))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "tds_tracker",
    "policyname": "tds_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "is_admin_or_manager()",
    "with_check_expr": "is_admin_or_manager()"
  },
  {
    "schemaname": "public",
    "tablename": "tds_tracker",
    "policyname": "tds_executive_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "tds_tracker",
    "policyname": "tds_executive_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = 'Executive'::text))"
  },
  {
    "schemaname": "public",
    "tablename": "trust_ngo_tracker",
    "policyname": "trust_ngo_tracker_admin_manager_all",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Admin'::text, 'Manager'::text])))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Admin'::text, 'Manager'::text])))"
  },
  {
    "schemaname": "public",
    "tablename": "trust_ngo_tracker",
    "policyname": "trust_ngo_tracker_executive_select",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text, 'Viewer'::text])))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "trust_ngo_tracker",
    "policyname": "trust_ngo_tracker_executive_update",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "using_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text])))",
    "with_check_expr": "(is_active_user() AND (get_portal_role() = ANY (ARRAY['Executive'::text, 'Staff'::text])))"
  }
]
```

---

## B6 — Table grants

**Status:** PARTIAL — Supabase result limit was 100 rows.

The captured rows show broad table-level grants to `anon`, `authenticated` and `service_role` on several surfaces. Actual row access remains subject to RLS/Force RLS, but the complete grant inventory was not captured due to the UI limit.

```json
[
  {
    "table_name": "accounting_tracker",
    "grantee": "anon",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "anon",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "anon",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "anon",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "anon",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "anon",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "anon",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "authenticated",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "authenticated",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "authenticated",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "authenticated",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "authenticated",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "authenticated",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "authenticated",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "service_role",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "service_role",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "service_role",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "service_role",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "service_role",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "service_role",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "accounting_tracker",
    "grantee": "service_role",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "anon",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "anon",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "anon",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "anon",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "anon",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "anon",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "anon",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "authenticated",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "authenticated",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "authenticated",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "authenticated",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "authenticated",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "authenticated",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "authenticated",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "service_role",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "service_role",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "service_role",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "service_role",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "service_role",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "service_role",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "audit_event_contract",
    "grantee": "service_role",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "audit_log",
    "grantee": "anon",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "audit_log",
    "grantee": "anon",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "audit_log",
    "grantee": "anon",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "audit_log",
    "grantee": "anon",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "audit_log",
    "grantee": "anon",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "audit_log",
    "grantee": "anon",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "audit_log",
    "grantee": "anon",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "audit_log",
    "grantee": "authenticated",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "audit_log",
    "grantee": "authenticated",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "audit_log",
    "grantee": "authenticated",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "audit_log",
    "grantee": "authenticated",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "audit_log",
    "grantee": "authenticated",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "audit_log",
    "grantee": "authenticated",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "audit_log",
    "grantee": "authenticated",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "audit_log",
    "grantee": "service_role",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "audit_log",
    "grantee": "service_role",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "audit_log",
    "grantee": "service_role",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "audit_log",
    "grantee": "service_role",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "audit_log",
    "grantee": "service_role",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "audit_log",
    "grantee": "service_role",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "audit_log",
    "grantee": "service_role",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "anon",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "anon",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "anon",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "anon",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "anon",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "anon",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "anon",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "authenticated",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "authenticated",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "authenticated",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "authenticated",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "authenticated",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "authenticated",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "authenticated",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "service_role",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "service_role",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "service_role",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "service_role",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "service_role",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "service_role",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "audit_tracker",
    "grantee": "service_role",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "client_service_applicability",
    "grantee": "authenticated",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "client_service_applicability",
    "grantee": "authenticated",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "client_service_applicability",
    "grantee": "authenticated",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "client_service_applicability",
    "grantee": "authenticated",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "client_service_applicability",
    "grantee": "service_role",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "client_service_applicability",
    "grantee": "service_role",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "client_service_applicability",
    "grantee": "service_role",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "client_service_applicability",
    "grantee": "service_role",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "client_service_applicability",
    "grantee": "service_role",
    "privilege_type": "TRIGGER"
  },
  {
    "table_name": "client_service_applicability",
    "grantee": "service_role",
    "privilege_type": "TRUNCATE"
  },
  {
    "table_name": "client_service_applicability",
    "grantee": "service_role",
    "privilege_type": "UPDATE"
  },
  {
    "table_name": "compliance_calendar",
    "grantee": "anon",
    "privilege_type": "DELETE"
  },
  {
    "table_name": "compliance_calendar",
    "grantee": "anon",
    "privilege_type": "INSERT"
  },
  {
    "table_name": "compliance_calendar",
    "grantee": "anon",
    "privilege_type": "REFERENCES"
  },
  {
    "table_name": "compliance_calendar",
    "grantee": "anon",
    "privilege_type": "SELECT"
  },
  {
    "table_name": "compliance_calendar",
    "grantee": "anon",
    "privilege_type": "TRIGGER"
  }
]
```

---

## B7 — Functions and RPCs

Captured functions include:

- `activate_accounting_service` — SECURITY DEFINER, VOLATILE
- `generate_client_compliance` — SECURITY DEFINER, VOLATILE
- `generate_client_compliance_core` — SECURITY DEFINER, VOLATILE
- `audit_write_event` — SECURITY DEFINER, VOLATILE
- `audit_validate_event` — SECURITY DEFINER, STABLE
- `service_applicability_create` — SECURITY DEFINER, VOLATILE
- `service_applicability_update` — SECURITY DEFINER, VOLATILE
- `service_applicability_set_status` — SECURITY DEFINER, VOLATILE
- role/auth helpers and due-date/start-FY helpers

**Result:** Existing write-capable generators/RPCs are present. None were invoked.

---

## B8 — EXECUTE privileges

Captured ACLs:

```json
[
  {
    "proname": "activate_accounting_service",
    "acl": "postgres=X/postgres | authenticated=X/postgres | service_role=X/postgres"
  },
  {
    "proname": "audit_write_event",
    "acl": "postgres=X/postgres"
  },
  {
    "proname": "generate_client_compliance",
    "acl": "postgres=X/postgres | authenticated=X/postgres | service_role=X/postgres"
  },
  {
    "proname": "generate_client_compliance_core",
    "acl": "postgres=X/postgres"
  },
  {
    "proname": "service_applicability_create",
    "acl": "postgres=X/postgres | authenticated=X/postgres"
  },
  {
    "proname": "service_applicability_set_status",
    "acl": "postgres=X/postgres | authenticated=X/postgres"
  },
  {
    "proname": "service_applicability_update",
    "acl": "postgres=X/postgres | authenticated=X/postgres"
  }
]
```

**Finding:** `authenticated` can execute several write-capable functions. This must be addressed in P6 security design; no function was executed during discovery.

---

## B9 — Triggers

**Result:** `0 rows`.

No triggers were found on the listed P6 surfaces.

---

## B10 — Applicability population and Approved-row quality

### Population

```json
[
  {"status":"Approved","service_code":"INCOME_TAX","frequency":"ANNUAL","n":1},
  {"status":"Approved","service_code":"OTHER","frequency":"ANNUAL","n":1},
  {"status":"Inactive","service_code":"OTHER","frequency":"ANNUAL","n":1},
  {"status":"Inactive","service_code":"TDS","frequency":"MONTHLY","n":1}
]
```

### Approved rows

```json
[
  {"service_code":"INCOME_TAX","frequency":"ANNUAL","approved_n":1},
  {"service_code":"OTHER","frequency":"ANNUAL","approved_n":1}
]
```

### Approved-row completeness

```json
[
  {
    "approved_total": 2,
    "incomplete_approval_n": 0,
    "missing_owner_n": 0,
    "required_registration_missing_n": 0,
    "missing_effective_from_n": 0,
    "has_effective_to_n": 0
  }
]
```

### Effective dates and row versions

```json
[
  {
    "earliest_effective_from": "2026-07-21",
    "latest_effective_from": "2026-07-22",
    "earliest_effective_to": null,
    "latest_effective_to": null,
    "min_row_version": 2,
    "max_row_version": 2,
    "avg_row_version": "2.00"
  }
]
```

---

## B11 — Service catalogue

All 11 services are active:

`ACCOUNTING`, `GST`, `TDS`, `PAYROLL`, `INCOME_TAX`, `ROC`, `LLP`, `STATUTORY_AUDIT`, `TAX_AUDIT`, `SECRETARIAL`, `OTHER`.

For every service:

- `requires_registration = false`
- `default_frequency = null`

**Finding:** registration requirements and default frequencies remain business/configuration decisions.

---

## B12 — Registration coverage

```json
[
  {
    "registrations_total": 0,
    "applicability_with_link": 0,
    "cross_client_link_violations_expect_0": 0
  }
]
```

**Result:** No registration data exists; no cross-client violations.

---

## B13 — Financial years

Financial years exist from FY `2020-21` through FY `2030-31`.

```json
[
  {
    "fy_total": 11,
    "fy_active": 11,
    "fy_current_flag_count_expect_1": 1
  }
]
```

Current FY: `2026-27`.

---

## B14 — Protected baseline counts

```json
[
  {"t":"accounting_tracker","count":312},
  {"t":"audit_tracker","count":0},
  {"t":"compliance_calendar","count":0},
  {"t":"financials_tracker","count":120},
  {"t":"gst_tracker","count":0},
  {"t":"income_tax_tracker","count":26},
  {"t":"llp_tracker","count":0},
  {"t":"notice_tracker","count":0},
  {"t":"payroll_tracker","count":0},
  {"t":"roc_tracker","count":0},
  {"t":"tds_tracker","count":0},
  {"t":"trust_ngo_tracker","count":0}
]
```

Status distribution:

```json
[
  {"t":"accounting_tracker","status":"Not Started","count":312},
  {"t":"income_tax_tracker","status":"Not Started","count":26}
]
```

**Result:** Protected baseline matches the expected counts.

---

## B15 — Duplicate-risk probes

```json
[
  {"accounting_dup_groups":0},
  {"income_tax_dup_groups":0},
  {"calendar_dup_groups":0}
]
```

**Result:** PASS — no duplicate groups found for the tested grains.

---

## B16 — Existing lineage fields

```json
[
  {
    "table_name":"client_service_applicability",
    "column_name":"row_version",
    "data_type":"integer"
  }
]
```

**Finding:** No output-table generation lineage fields such as generation run, generated by/at, source reference, batch or run ID were found.

---

## B17 — Enum vocabularies

Captured vocabularies include:

- `compliance_status_enum` — 18 values
- `workflow_stage_enum` — 6 values
- `month_enum` — April through March
- `quarter_enum` — Q1 through Q4
- `gst_frequency_enum` — Monthly, Quarterly_QRMP, Composition
- `gst_return_type_enum` — 11 values

---

## B18 — Team availability

```json
[
  {
    "team_total": 8,
    "team_active": 7,
    "active_admin_or_manager": 4,
    "with_auth_link": 8
  }
]
```

---

## B19 — Audit-event contracts and log baseline

Audit contracts exist for client, identifier, registration, service applicability, person/KYC, document and audit-log events.

No compliance-generation event contract appeared in the captured result.

```json
[
  {"audit_log_rows":33}
]
```

---

## B20 — Legacy services, test clients and naming collisions

```json
[
  {
    "clients_with_services": 2,
    "clients_total": 13,
    "is_test_client_flagged": 2
  }
]
```

Proposed P6 object-name collision query returned:

```text
0 rows
```

Therefore, the following proposed database names were not found:

- `compliance_generation_preview`
- `compliance_generation_execute`
- `compliance_generation_verify`
- `service_applicability_generate`
- `compliance_generation_run`
- `compliance_generation_line`
- `generation_run`
- compliance-generation audit-event names

This database query does **not** prove that repository migration number `0023` is unused. Claude must verify the repository separately.

---

# Consolidated findings for Claude

1. B0–B20 read-only execution was completed on the manually confirmed V2 project.
2. B1 and B6 are partial because the UI limited results to 100 rows.
3. Existing tracker baselines remain intact: accounting 312, financials 120, income tax 26, calendar 0.
4. Tested duplicate groups are all zero.
5. Two Approved applicability rows exist: Income Tax annual and Other annual.
6. Both Approved rows are complete, owned, effective and at row version 2.
7. All catalogue services are active, but registration requirements are false and default frequencies are null.
8. No client registrations exist.
9. Existing legacy compliance generators and write-capable applicability RPCs exist; some are executable by `authenticated`.
10. No triggers were found on the tested P6 surfaces.
11. No generation lineage columns exist on output trackers.
12. No compliance-generation audit contracts currently exist.
13. Two clients have legacy services, and two clients are flagged as test clients; the aggregate query does not prove they are the same two clients.
14. Proposed P6 object names are collision-free in the database.
15. Migration `0023` filename availability still requires repository verification.

# Required next action for Claude

Update the P6 discovery report, capture template, decision register, architecture, security/test matrix, readiness plan, review checklist, master register and continuation handshake using this actual evidence.

Do not:

- execute SQL;
- access V1/Production;
- create or execute Migration `0023`;
- implement generation functions;
- alter source code/configuration;
- commit or push.

Return one consolidated updated review package for ChatGPT review.
