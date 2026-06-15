-- =====================================================================
-- Phase 4C v7 — 20260613080004_event_contract_and_rls.sql
-- STATUS: DRAFT / NOT APPLIED. Do not run. For review only.
-- =====================================================================
-- audit_event_contract, secured at creation (finding #2). Reference data:
-- audit_writer/audit_owner need SELECT; app roles get nothing.
--
-- System mode removed (finding #8): permitted_actor_types now uses only
-- 'user' and/or 'service'. 'user' appears only on events the SELF-CONTAINED
-- reader writes about itself (audit.log.read_*). All other events are
-- 'service' (trusted backend). No generic user writer exists (finding #1).
--
-- target_user_id is canonical top-level (finding #5): never in metadata keys.
-- =====================================================================

CREATE TABLE public.audit_event_contract (
  event_name               text PRIMARY KEY,
  risk_tier                text NOT NULL CHECK (risk_tier IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  sensitivity              text NOT NULL CHECK (sensitivity IN ('S1','S2','S3','S4')),
  required_keys            text[] NOT NULL DEFAULT '{}',
  optional_keys            text[] NOT NULL DEFAULT '{}',
  allow_empty_metadata     boolean NOT NULL DEFAULT false,
  client_requirement       text NOT NULL CHECK (client_requirement IN ('required','optional','prohibited')),
  target_user_requirement  text NOT NULL CHECK (target_user_requirement IN ('required','optional','prohibited')),
  permitted_actor_types    text[] NOT NULL,
  permitted_actions        text[] NOT NULL DEFAULT '{}',
  permitted_resource_types text[] NOT NULL DEFAULT '{}'
);
ALTER TABLE public.audit_event_contract OWNER TO audit_owner;

REVOKE ALL ON TABLE public.audit_event_contract FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE public.audit_event_contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_event_contract FORCE ROW LEVEL SECURITY;
CREATE POLICY "contract_owner_select"  ON public.audit_event_contract FOR SELECT TO audit_owner USING (true);
CREATE POLICY "contract_writer_select" ON public.audit_event_contract FOR SELECT TO audit_writer USING (true);
CREATE POLICY "contract_no_anon" ON public.audit_event_contract AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "contract_no_authenticated" ON public.audit_event_contract AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
GRANT SELECT ON TABLE public.audit_event_contract TO audit_owner, audit_writer;

COMMENT ON TABLE public.audit_event_contract IS 'Phase 4C v7: per-event contract incl. target_user_requirement. Secured at creation. Drives writer validation.';

INSERT INTO public.audit_event_contract
(event_name,risk_tier,sensitivity,required_keys,optional_keys,allow_empty_metadata,client_requirement,target_user_requirement,permitted_actor_types,permitted_actions,permitted_resource_types) VALUES

-- AUTH (service-attributed; backend records these)
('auth.session.login_success','LOW','S2',ARRAY['login_method_code'],ARRAY['user_agent_family','portal_version','session_reference_id'],false,'prohibited','prohibited',ARRAY['service'],ARRAY['LOGIN'],ARRAY['auth_session']),
('auth.session.login_failed','HIGH','S3',ARRAY['failure_reason_code','attempt_count'],ARRAY['user_agent_family','login_subject_hmac'],false,'prohibited','prohibited',ARRAY['service'],ARRAY['LOGIN'],ARRAY['auth_session']),
('auth.session.logout','LOW','S2',ARRAY['logout_type_code'],ARRAY['session_duration_seconds'],false,'prohibited','prohibited',ARRAY['service'],ARRAY['LOGOUT'],ARRAY['auth_session']),
('auth.session.revoked','HIGH','S3',ARRAY['revocation_reason_code'],ARRAY[]::text[],false,'prohibited','required',ARRAY['service'],ARRAY['UPDATE'],ARRAY['auth_session']),
('auth.password_reset.requested','MEDIUM','S3',ARRAY['request_channel_code'],ARRAY['user_agent_family','login_subject_hmac'],false,'prohibited','prohibited',ARRAY['service'],ARRAY['UPDATE'],ARRAY['auth_session']),
('auth.password_reset.completed','HIGH','S3',ARRAY['reset_channel_code'],ARRAY['time_since_request_seconds','login_subject_hmac'],false,'prohibited','prohibited',ARRAY['service'],ARRAY['UPDATE'],ARRAY['auth_session']),
('auth.mfa.changed','CRITICAL','S4',ARRAY['change_type_code'],ARRAY[]::text[],false,'prohibited','required',ARRAY['service'],ARRAY['UPDATE'],ARRAY['auth_session']),

-- USER / ACCOUNT
('user.account.created','HIGH','S3',ARRAY['assigned_role_code'],ARRAY['invite_method_code'],false,'prohibited','required',ARRAY['service'],ARRAY['INSERT'],ARRAY['team_member']),
('user.account.deactivated','CRITICAL','S4',ARRAY['deactivation_reason_code'],ARRAY[]::text[],false,'prohibited','required',ARRAY['service'],ARRAY['UPDATE'],ARRAY['team_member']),
('user.account.reactivated','HIGH','S3',ARRAY['reactivation_reason_code'],ARRAY[]::text[],false,'prohibited','required',ARRAY['service'],ARRAY['UPDATE'],ARRAY['team_member']),
('user.role.changed','CRITICAL','S4',ARRAY['old_role_code','new_role_code','change_reason_code'],ARRAY[]::text[],false,'prohibited','required',ARRAY['service'],ARRAY['UPDATE'],ARRAY['team_member']),
('user.permission.changed','CRITICAL','S4',ARRAY['permission_type_code','old_value_code','new_value_code'],ARRAY[]::text[],false,'prohibited','required',ARRAY['service'],ARRAY['UPDATE'],ARRAY['team_member']),

-- ACCESS CONTROL
('access.client.denied','HIGH','S3',ARRAY['denial_reason_code','requested_operation_code'],ARRAY[]::text[],false,'optional','prohibited',ARRAY['service'],ARRAY['DENY'],ARRAY['client']),
('access.cross_client.attempted','CRITICAL','S4',ARRAY['detection_method_code','requested_operation_code'],ARRAY[]::text[],false,'optional','prohibited',ARRAY['service'],ARRAY['DENY'],ARRAY['client']),

-- DATA EXPORT
('data.bulk_export','HIGH','S4',ARRAY['export_type_code','record_count','scope_code'],ARRAY['date_range_start','date_range_end','export_format_code'],false,'optional','prohibited',ARRAY['service'],ARRAY['EXPORT'],ARRAY['audit_log','client','document']),
('data.mass_download','HIGH','S4',ARRAY['document_count','download_channel_code'],ARRAY['compliance_type_code_filter','filing_period_range'],false,'optional','prohibited',ARRAY['service'],ARRAY['DOWNLOAD'],ARRAY['document']),

-- SECURITY ADMIN
('security.setting.changed','CRITICAL','S4',ARRAY['setting_name_code','change_type_code','change_reason_code'],ARRAY[]::text[],false,'prohibited','prohibited',ARRAY['service'],ARRAY['UPDATE'],ARRAY['system_config']),
('security.rls_policy.changed','CRITICAL','S4',ARRAY['table_name','policy_name','change_type_code','migration_reference'],ARRAY[]::text[],false,'prohibited','prohibited',ARRAY['service'],ARRAY['UPDATE'],ARRAY['system_config']),

-- AUDIT-READ (written by the self-contained reader about ITSELF; user-attributed)
('audit.log.read_requested','HIGH','S3',ARRAY['requested_page_number','requested_page_size','filter_applied','access_method_code'],ARRAY['filter_risk_tier','filter_date_start','filter_date_end'],false,'optional','prohibited',ARRAY['user'],ARRAY['VIEW'],ARRAY['audit_log']),
('audit.log.read_completed','HIGH','S3',ARRAY['read_request_audit_id','returned_row_count','total_match_count','page_empty','completion_status_code'],ARRAY['requested_page_number','requested_page_size','access_method_code','filter_risk_tier'],false,'optional','prohibited',ARRAY['user'],ARRAY['VIEW'],ARRAY['audit_log']),

-- AUDIT export + ingestion failure (service)
('audit.log.exported','CRITICAL','S4',ARRAY['export_format_code','row_count_exported','filter_applied'],ARRAY['date_range_start','date_range_end'],false,'optional','prohibited',ARRAY['service'],ARRAY['EXPORT'],ARRAY['audit_log']),
('audit.ingestion.failed','CRITICAL','S4',ARRAY['triggering_event_name','failure_reason_code'],ARRAY[]::text[],false,'prohibited','prohibited',ARRAY['service'],ARRAY['INSERT'],ARRAY['audit_log']),

-- WHATSAPP
('whatsapp.access.denied','HIGH','S3',ARRAY['denial_reason_code','wa_actor_hmac'],ARRAY['bot_version','attempt_count'],false,'optional','prohibited',ARRAY['service'],ARRAY['DENY'],ARRAY['auth_session']);
