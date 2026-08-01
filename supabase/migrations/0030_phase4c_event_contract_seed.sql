-- ############################################################################
-- ##  0030 — PHASE 4C — EVENT-CONTRACT SEED + FINAL RLS/GRANT RECONCILIATION  ##
-- ############################################################################
-- Renumbered 0028->0030 (T4 collision on 0023/0024).
--
-- ROLLBACK-SAFE PROVENANCE (correction): this migration FAILS CLOSED if ANY of the
-- 23 Phase 4C event names already exists BEFORE insertion. Only when all 23 are
-- proven absent does it insert them (plain INSERT, NO "ON CONFLICT"). Therefore
-- 0030 unambiguously OWNS all 23 rows, and its rollback can delete exactly those
-- 23 without any risk of removing a pre-existing row. If the precondition trips,
-- it stops for manual reconciliation rather than silently skipping/merging.
--
-- These 23 security/auth events (auth.*, user.*, access.*, data.*, security.*,
-- audit.*, whatsapp.*) are complementary to the base business events. Values are
-- within the base CHECK constraints (risk_tier LOW/MEDIUM/HIGH/CRITICAL; sensitivity
-- S1..S4; *_requirement required/optional/prohibited). Access model PRESERVED:
-- audit_event_contract keeps default-deny + FORCE RLS; NO permissive policy added;
-- service_role gets NO direct access. Target: yav2-dev ONLY. PROHIBITED: V1/Prod.
-- ############################################################################

BEGIN;

-- ── Precondition 1: contract table present ──────────────────────────────────
DO $pre_tbl$
BEGIN
  IF to_regclass('public.audit_event_contract') IS NULL THEN
    RAISE EXCEPTION '0030 PRECONDITION FAILED: public.audit_event_contract (0005) not present.';
  END IF;
END
$pre_tbl$;

-- ── Precondition 2 (FAIL-CLOSED): none of the 23 events may pre-exist ────────
DO $pre_absent$
DECLARE
  v_pre int;
  v_names text;
BEGIN
  SELECT count(*), string_agg(event_name, ', ')
    INTO v_pre, v_names
  FROM public.audit_event_contract
  WHERE event_name = ANY (ARRAY[
    'auth.session.login_success','auth.session.login_failed','auth.session.logout','auth.session.revoked',
    'auth.password_reset.requested','auth.password_reset.completed','auth.mfa.changed',
    'user.account.created','user.account.deactivated','user.account.reactivated','user.role.changed','user.permission.changed',
    'access.client.denied','access.cross_client.attempted','data.bulk_export','data.mass_download',
    'security.setting.changed','security.rls_policy.changed','audit.log.read_requested','audit.log.read_completed',
    'audit.log.exported','audit.ingestion.failed','whatsapp.access.denied']);
  IF v_pre > 0 THEN
    RAISE EXCEPTION '0030 PRECONDITION FAILED (fail-closed): % Phase 4C event(s) already exist (%). Reconcile manually before seeding; 0030 must OWN all 23 rows.', v_pre, v_names;
  END IF;
END
$pre_absent$;

-- ── Seed: plain INSERT (no ON CONFLICT) — 0030 owns all 23 rows ─────────────
INSERT INTO public.audit_event_contract
(event_name,risk_tier,sensitivity,required_keys,optional_keys,allow_empty_metadata,client_requirement,target_user_requirement,permitted_actor_types,permitted_actions,permitted_resource_types) VALUES
('auth.session.login_success','LOW','S2',ARRAY['login_method_code'],ARRAY['user_agent_family','portal_version','session_reference_id'],false,'prohibited','prohibited',ARRAY['service'],ARRAY['LOGIN'],ARRAY['auth_session']),
('auth.session.login_failed','HIGH','S3',ARRAY['failure_reason_code','attempt_count'],ARRAY['user_agent_family','login_subject_hmac'],false,'prohibited','prohibited',ARRAY['service'],ARRAY['LOGIN'],ARRAY['auth_session']),
('auth.session.logout','LOW','S2',ARRAY['logout_type_code'],ARRAY['session_duration_seconds'],false,'prohibited','prohibited',ARRAY['service'],ARRAY['LOGOUT'],ARRAY['auth_session']),
('auth.session.revoked','HIGH','S3',ARRAY['revocation_reason_code'],ARRAY[]::text[],false,'prohibited','required',ARRAY['service'],ARRAY['UPDATE'],ARRAY['auth_session']),
('auth.password_reset.requested','MEDIUM','S3',ARRAY['request_channel_code'],ARRAY['user_agent_family','login_subject_hmac'],false,'prohibited','prohibited',ARRAY['service'],ARRAY['UPDATE'],ARRAY['auth_session']),
('auth.password_reset.completed','HIGH','S3',ARRAY['reset_channel_code'],ARRAY['time_since_request_seconds','login_subject_hmac'],false,'prohibited','prohibited',ARRAY['service'],ARRAY['UPDATE'],ARRAY['auth_session']),
('auth.mfa.changed','CRITICAL','S4',ARRAY['change_type_code'],ARRAY[]::text[],false,'prohibited','required',ARRAY['service'],ARRAY['UPDATE'],ARRAY['auth_session']),
('user.account.created','HIGH','S3',ARRAY['assigned_role_code'],ARRAY['invite_method_code'],false,'prohibited','required',ARRAY['service'],ARRAY['INSERT'],ARRAY['team_member']),
('user.account.deactivated','CRITICAL','S4',ARRAY['deactivation_reason_code'],ARRAY[]::text[],false,'prohibited','required',ARRAY['service'],ARRAY['UPDATE'],ARRAY['team_member']),
('user.account.reactivated','HIGH','S3',ARRAY['reactivation_reason_code'],ARRAY[]::text[],false,'prohibited','required',ARRAY['service'],ARRAY['UPDATE'],ARRAY['team_member']),
('user.role.changed','CRITICAL','S4',ARRAY['old_role_code','new_role_code','change_reason_code'],ARRAY[]::text[],false,'prohibited','required',ARRAY['service'],ARRAY['UPDATE'],ARRAY['team_member']),
('user.permission.changed','CRITICAL','S4',ARRAY['permission_type_code','old_value_code','new_value_code'],ARRAY[]::text[],false,'prohibited','required',ARRAY['service'],ARRAY['UPDATE'],ARRAY['team_member']),
('access.client.denied','HIGH','S3',ARRAY['denial_reason_code','requested_operation_code'],ARRAY[]::text[],false,'optional','prohibited',ARRAY['service'],ARRAY['DENY'],ARRAY['client']),
('access.cross_client.attempted','CRITICAL','S4',ARRAY['detection_method_code','requested_operation_code'],ARRAY[]::text[],false,'optional','prohibited',ARRAY['service'],ARRAY['DENY'],ARRAY['client']),
('data.bulk_export','HIGH','S4',ARRAY['export_type_code','record_count','scope_code'],ARRAY['date_range_start','date_range_end','export_format_code'],false,'optional','prohibited',ARRAY['service'],ARRAY['EXPORT'],ARRAY['audit_log','client','document']),
('data.mass_download','HIGH','S4',ARRAY['document_count','download_channel_code'],ARRAY['compliance_type_code_filter','filing_period_range'],false,'optional','prohibited',ARRAY['service'],ARRAY['DOWNLOAD'],ARRAY['document']),
('security.setting.changed','CRITICAL','S4',ARRAY['setting_name_code','change_type_code','change_reason_code'],ARRAY[]::text[],false,'prohibited','prohibited',ARRAY['service'],ARRAY['UPDATE'],ARRAY['system_config']),
('security.rls_policy.changed','CRITICAL','S4',ARRAY['table_name','policy_name','change_type_code','migration_reference'],ARRAY[]::text[],false,'prohibited','prohibited',ARRAY['service'],ARRAY['UPDATE'],ARRAY['system_config']),
('audit.log.read_requested','HIGH','S3',ARRAY['requested_page_number','requested_page_size','filter_applied','access_method_code'],ARRAY['filter_risk_tier','filter_date_start','filter_date_end'],false,'optional','prohibited',ARRAY['user'],ARRAY['VIEW'],ARRAY['audit_log']),
('audit.log.read_completed','HIGH','S3',ARRAY['read_request_audit_id','returned_row_count','total_match_count','page_empty','completion_status_code'],ARRAY['requested_page_number','requested_page_size','access_method_code','filter_risk_tier'],false,'optional','prohibited',ARRAY['user'],ARRAY['VIEW'],ARRAY['audit_log']),
('audit.log.exported','CRITICAL','S4',ARRAY['export_format_code','row_count_exported','filter_applied'],ARRAY['date_range_start','date_range_end'],false,'optional','prohibited',ARRAY['service'],ARRAY['EXPORT'],ARRAY['audit_log']),
('audit.ingestion.failed','CRITICAL','S4',ARRAY['triggering_event_name','failure_reason_code'],ARRAY[]::text[],false,'prohibited','prohibited',ARRAY['service'],ARRAY['INSERT'],ARRAY['audit_log']),
('whatsapp.access.denied','HIGH','S3',ARRAY['denial_reason_code','wa_actor_hmac'],ARRAY['bot_version','attempt_count'],false,'optional','prohibited',ARRAY['service'],ARRAY['DENY'],ARRAY['auth_session']);

-- ── Postcondition: 23 present; access posture preserved ─────────────────────
DO $post$
DECLARE
  n int;
  svc_grants int;
BEGIN
  SELECT count(*) INTO n FROM public.audit_event_contract
  WHERE event_name = ANY (ARRAY[
    'auth.session.login_success','auth.session.login_failed','auth.session.logout','auth.session.revoked',
    'auth.password_reset.requested','auth.password_reset.completed','auth.mfa.changed',
    'user.account.created','user.account.deactivated','user.account.reactivated','user.role.changed','user.permission.changed',
    'access.client.denied','access.cross_client.attempted','data.bulk_export','data.mass_download',
    'security.setting.changed','security.rls_policy.changed','audit.log.read_requested','audit.log.read_completed',
    'audit.log.exported','audit.ingestion.failed','whatsapp.access.denied']);
  IF n <> 23 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: expected 23 Phase 4C events present, found %.', n;
  END IF;

  IF NOT (SELECT bool_and(relrowsecurity AND relforcerowsecurity)
          FROM pg_class WHERE oid IN (
            'public.audit_log'::regclass,'public.audit_event_contract'::regclass,
            'public.audit_ingestion_failures'::regclass)) THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: audit_* tables must remain ENABLE+FORCE RLS.';
  END IF;

  SELECT count(*) INTO svc_grants
  FROM information_schema.role_table_grants
  WHERE grantee='service_role' AND table_schema='public'
    AND table_name IN ('audit_log','audit_event_contract','audit_ingestion_failures');
  IF svc_grants <> 0 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: service_role holds % direct privilege(s) on audit tables (must be 0).', svc_grants;
  END IF;
END
$post$;

COMMIT;
-- ############################################################################
-- ##  END 0030 — rollback: 0030_phase4c_event_contract_seed_rollback.sql      ##
-- ############################################################################
