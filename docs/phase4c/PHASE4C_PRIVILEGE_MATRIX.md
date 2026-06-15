# Phase 4C v6 — Privilege Matrix

## Roles
`audit_owner`, `audit_writer`: NOLOGIN NOINHERIT NOCREATEROLE NOCREATEDB; no CREATE on any schema; never granted to any application role.

## Schema usage
| Role | USAGE public | USAGE auth | EXECUTE auth.uid() | CREATE any schema |
|---|---|---|---|---|
| audit_owner | yes (explicit) | yes (explicit) | yes (explicit) | no (revoked) |
| audit_writer | yes (explicit) | yes (explicit) | yes (explicit) | no (revoked) |

## Tables (RLS enabled+forced at creation)
| Object | Owner | SELECT | INSERT | UPDATE | DELETE | App-role direct |
|---|---|---|---|---|---|---|
| audit_log | audit_owner | audit_owner | audit_writer | deny (RESTRICTIVE) | deny | revoked (PUBLIC/anon/auth/service_role) |
| audit_ingestion_failures | audit_owner | audit_owner | audit_writer | deny | deny | revoked |
| audit_event_contract | audit_owner | audit_owner, audit_writer | — | — | — | revoked |
| clients (existing) | unchanged | +audit_owner, +audit_writer | unchanged | unchanged | unchanged | unchanged |
| team (existing) | unchanged | +audit_owner, +audit_writer | unchanged | unchanged | unchanged | unchanged |
| team_client_access (existing) | unchanged | +audit_owner | unchanged | unchanged | unchanged | unchanged |

## Function exposure
| Function | Owner | SECURITY DEFINER | EXECUTE granted to | Internal only |
|---|---|---|---|---|
| get_app_role() | audit_owner | yes | authenticated | no |
| get_app_role_for_user(uuid) | audit_owner | yes | audit_owner, audit_writer (NOT authenticated) | no |
| staff_can_access_client(uuid) | audit_owner | yes | authenticated | no |
| audit_contains_secret(text) | audit_writer | yes | audit_writer, audit_owner | yes |
| audit_is_uuid(text) | audit_writer | yes | audit_writer, audit_owner | yes |
| audit_field_format_ok(text,jsonb) | audit_writer | yes | audit_writer, audit_owner | yes |
| audit_validate_event(...) | audit_writer | yes | audit_writer, audit_owner | yes |
| _record_audit_failure(...) | audit_writer | yes | (none) | yes |
| log_audit_event_trusted_backend(...) | audit_writer | yes | service_role, audit_owner | no (backend) |
| _write_read_audit(text,uuid,jsonb) | audit_writer | yes | audit_owner | yes (internal) |
| get_sensitive_audit_logs(...) | audit_owner | yes | authenticated (Admin enforced) | no |

All functions REVOKE EXECUTE from PUBLIC/anon/authenticated/service_role before narrow re-grants. All SECURITY DEFINER bodies pin `search_path = pg_catalog, public, pg_temp`. No application role can assume audit_owner/audit_writer. Writer is INSERT-only (pre-generated id; no RETURNING).

## Internal privilege chain (v7)

| Function | Owner | Calls | Required EXECUTE | Table privilege | RLS policy |
|---|---|---|---|---|---|
| get_sensitive_audit_logs | audit_owner | get_app_role, _write_read_audit | authenticated holds EXECUTE on this RPC; audit_owner holds EXECUTE on _write_read_audit + get_app_role | SELECT audit_log (audit_owner) | audit_owner_select (SELECT) |
| _write_read_audit | audit_writer | get_app_role_for_user, audit_validate_event, audit_contains_secret, _record_audit_failure; INSERT audit_log | audit_owner holds EXECUTE on _write_read_audit; audit_writer holds EXECUTE on all four callees | INSERT audit_log + SELECT audit_event_contract/clients/team (audit_writer) | audit_writer_insert (INSERT) |
| _record_audit_failure | audit_writer | INSERT audit_ingestion_failures | audit_writer (explicit, finding #3); never app roles | INSERT audit_ingestion_failures (audit_writer) | fail_writer_insert (INSERT) |
| get_app_role | audit_owner | reads team | authenticated | SELECT team (audit_owner) | n/a (reads via definer owner) |
| get_app_role_for_user | audit_owner | reads team | audit_owner, audit_writer (NOT authenticated, finding #4) | SELECT team (audit_owner) | n/a (reads via definer owner) |

All functions are SECURITY DEFINER and run as their owner. `_write_read_audit` running as `audit_writer` satisfies the `audit_writer_insert` policy under FORCE RLS (finding #1). EXECUTE is revoked from PUBLIC/anon/authenticated/service_role on every function before any narrow re-grant.
