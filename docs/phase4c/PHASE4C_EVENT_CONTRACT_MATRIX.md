# Phase 4C v6 — Event Contract Matrix

23 events. All `service`-attributed (trusted backend) except the two audit-read events the reader writes about itself (`user`). Empty metadata disallowed for all. `target_user_id` canonical top-level; never in metadata.

| Event | Required metadata | Optional metadata | Actor type | Target-user rule | Action | Resource | Client rule |
|---|---|---|---|---|---|---|---|
| auth.session.login_success | login_method_code | user_agent_family, portal_version, session_reference_id | service | prohibited | LOGIN | auth_session | prohibited |
| auth.session.login_failed | failure_reason_code, attempt_count | user_agent_family, login_subject_hmac | service | prohibited | LOGIN | auth_session | prohibited |
| auth.session.logout | logout_type_code | session_duration_seconds | service | prohibited | LOGOUT | auth_session | prohibited |
| auth.session.revoked | revocation_reason_code | — | service | required | UPDATE | auth_session | prohibited |
| auth.password_reset.requested | request_channel_code | user_agent_family, login_subject_hmac | service | prohibited | UPDATE | auth_session | prohibited |
| auth.password_reset.completed | reset_channel_code | time_since_request_seconds, login_subject_hmac | service | prohibited | UPDATE | auth_session | prohibited |
| auth.mfa.changed | change_type_code | — | service | required | UPDATE | auth_session | prohibited |
| user.account.created | assigned_role_code | invite_method_code | service | required | INSERT | team_member | prohibited |
| user.account.deactivated | deactivation_reason_code | — | service | required | UPDATE | team_member | prohibited |
| user.account.reactivated | reactivation_reason_code | — | service | required | UPDATE | team_member | prohibited |
| user.role.changed | old_role_code, new_role_code, change_reason_code | — | service | required | UPDATE | team_member | prohibited |
| user.permission.changed | permission_type_code, old_value_code, new_value_code | — | service | required | UPDATE | team_member | prohibited |
| access.client.denied | denial_reason_code, requested_operation_code | — | service | prohibited | DENY | client | optional |
| access.cross_client.attempted | detection_method_code, requested_operation_code | — | service | prohibited | DENY | client | optional |
| data.bulk_export | export_type_code, record_count, scope_code | date_range_start, date_range_end, export_format_code | service | prohibited | EXPORT | audit_log,client,document | optional |
| data.mass_download | document_count, download_channel_code | compliance_type_code_filter, filing_period_range | service | prohibited | DOWNLOAD | document | optional |
| security.setting.changed | setting_name_code, change_type_code, change_reason_code | — | service | prohibited | UPDATE | system_config | prohibited |
| security.rls_policy.changed | table_name, policy_name, change_type_code, migration_reference | — | service | prohibited | UPDATE | system_config | prohibited |
| audit.log.read_requested | requested_page_number, requested_page_size, filter_applied, access_method_code | filter_risk_tier, filter_date_start, filter_date_end | user | prohibited | VIEW | audit_log | optional |
| audit.log.read_completed | read_request_audit_id, returned_row_count, total_match_count, page_empty, completion_status_code | requested_page_number, requested_page_size, access_method_code, filter_risk_tier | user | prohibited | VIEW | audit_log | optional |
| audit.log.exported | export_format_code, row_count_exported, filter_applied | date_range_start, date_range_end | service | prohibited | EXPORT | audit_log | optional |
| audit.ingestion.failed | triggering_event_name, failure_reason_code | — | service | prohibited | INSERT | audit_log | prohibited |
| whatsapp.access.denied | denial_reason_code, wa_actor_hmac | bot_version, attempt_count | service | prohibited | DENY | auth_session | optional |

Operational events (compliance/task/document/profile/ai-query) are intentionally absent — they belong to `activity_logs`.

## Read request/completion correlation (v8)
`audit.log.read_requested` is the authoritative record of read scope (date range, client, risk tier, page). `audit.log.read_completed` records outcome facts (returned_row_count, total_match_count, page_empty, completion_status_code) plus the required `read_request_audit_id`, which equals the exact server-generated id of the request event (`v_req_id`). `read_request_audit_id` is validated as a real UUID and is never a caller input. `completion_status_code` ∈ {SUCCESS, PARTIAL, EMPTY}.
