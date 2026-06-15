# Phase 4C v6 — Object Inventory

Every object created by the package, with collision-preflight and rollback coverage. Generated from the final SQL.

## Roles (2)
| Object | In preflight | In rollback |
|---|---|---|
| audit_owner | yes | yes (guarded drop) |
| audit_writer | yes | yes (guarded drop) |

## Tables (3)
| Object | In preflight | In rollback |
|---|---|---|
| public.audit_log | yes | yes |
| public.audit_ingestion_failures | yes | yes |
| public.audit_event_contract | yes | yes |

## Indexes (8) — drop implicitly with their tables
| Object | In preflight | In rollback |
|---|---|---|
| idx_audit_log_actor | yes | via table drop |
| idx_audit_log_target | yes | via table drop |
| idx_audit_log_service | yes | via table drop |
| idx_audit_log_client_uuid | yes | via table drop |
| idx_audit_log_event_name | yes | via table drop |
| idx_audit_log_occurred | yes | via table drop |
| idx_audit_log_risk_time | yes | via table drop |
| idx_audit_fail_time | yes | via table drop |

## Functions (11) with signatures
| Object | In preflight | In rollback |
|---|---|---|
| get_app_role() | yes | yes |
| get_app_role_for_user(uuid) | yes | yes |
| staff_can_access_client(uuid) | yes | yes |
| audit_contains_secret(text) | yes | yes |
| audit_is_uuid(text) | yes | yes |
| audit_field_format_ok(text,jsonb) | yes | yes |
| audit_validate_event(text,text,text,text,uuid,uuid,jsonb) | yes | yes |
| _record_audit_failure(text,text,text[],text) | yes | yes |
| log_audit_event_trusted_backend(text,uuid,uuid,text,text,text,text,jsonb) | yes | yes |
| _write_read_audit(text,uuid,jsonb) | yes | yes |
| get_sensitive_audit_logs(timestamptz,timestamptz,int,int,text,uuid) | yes | yes |

## Policies (16) — drop with their tables; also explicit in rollback
audit_log: audit_writer_insert, audit_owner_select, no_update_all, no_delete_all, no_anon_all, no_authenticated_direct.
audit_ingestion_failures: fail_writer_insert, fail_owner_select, fail_no_update_all, fail_no_delete_all, fail_no_anon_all, fail_no_authenticated_direct.
audit_event_contract: contract_owner_select, contract_writer_select, contract_no_anon, contract_no_authenticated.
Preflight checks that no policy pre-exists on the audit tables.

## Views / Triggers / Types / Sequences / Enums
None created by this package. (Enum-like constraints use CHECK + text, not Postgres enum types; no sequences — ids are gen_random_uuid().)
