-- ############################################################################
-- ##  0030 — PHASE 4C — EVENT-CONTRACT SEED (RECONCILED: 21 insert + 2 assert)##
-- ############################################################################
-- CORRECTION (live gate 2026-08-01): 2 of the 23 events already exist in
-- public.audit_event_contract and are LOAD-BEARING (written by the base read path
-- get_sensitive_audit_logs -> _write_read_audit, 0007/0008; 17 audit_log rows each):
--   * audit.log.read_requested   (live canonical: HIGH / S4)
--   * audit.log.read_completed   (live canonical: HIGH / S4)
-- The live rows are S4 (stricter) with a richer required-keys structure. Repository
-- evidence does NOT approve S3 (the prior 0030 draft was the only S3 source), so per
-- the governing rule the STRICTER live S4 classification is PRESERVED — NO downgrade.
--
-- This migration therefore:
--   (1) PRECONDITION (fail-closed): the 21 NON-read events must be ABSENT, AND the 2
--       read events must be PRESENT and EXACTLY match the canonical S4 definition.
--       Any absent read event, any extra/mismatched attribute, or any pre-existing
--       non-read event -> RAISE and STOP for manual reconciliation.
--   (2) INSERT only the 21 absent events (plain INSERT; 0030 OWNS exactly these 21).
--   (3) POST-CHECK: 23 present; the 2 read events still S4; FORCE RLS intact.
-- Table-grant remediation is a SEPARATE migration (0031); 0030 does NOT assert grant
-- posture. Target: yav2-dev ONLY. PROHIBITED: V1/Prod. NO delete/downgrade of history.
-- ############################################################################

BEGIN;

-- ── Precondition 0: contract table present ──────────────────────────────────
DO $pre_tbl$
BEGIN
  IF to_regclass('public.audit_event_contract') IS NULL THEN
    RAISE EXCEPTION '0030 PRECONDITION FAILED: public.audit_event_contract (0005) not present.';
  END IF;
END
$pre_tbl$;

-- ── Precondition 1 (fail-closed): the 21 NON-read events must be ABSENT ──────
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
    'security.setting.changed','security.rls_policy.changed','audit.log.exported','audit.ingestion.failed','whatsapp.access.denied']);
  IF v_pre > 0 THEN
    RAISE EXCEPTION '0030 PRECONDITION FAILED (fail-closed): % of the 21 non-read events already exist (%). Reconcile manually; 0030 must OWN all 21 inserted rows.', v_pre, v_names;
  END IF;
END
$pre_absent$;

-- ── Precondition 2 (fail-closed): the 2 read events PRESENT and EXACTLY canonical (S4) ──
DO $pre_read$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('audit.log.read_requested','HIGH','S4',
        ARRAY['requested_page_number','requested_page_size','filter_applied','access_method_code','filter_date_start','filter_date_end'],
        ARRAY['filter_risk_tier'],
        false,'optional','prohibited',ARRAY['user'],ARRAY['VIEW'],ARRAY['audit_log']),
      ('audit.log.read_completed','HIGH','S4',
        ARRAY['read_request_audit_id','returned_row_count','total_match_count','page_empty','completion_status_code','requested_page_number','requested_page_size','access_method_code'],
        ARRAY[]::text[],
        false,'optional','prohibited',ARRAY['user'],ARRAY['VIEW'],ARRAY['audit_log'])
    ) AS c(event_name,risk_tier,sensitivity,required_keys,optional_keys,allow_empty_metadata,client_requirement,target_user_requirement,permitted_actor_types,permitted_actions,permitted_resource_types)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.audit_event_contract e
      WHERE e.event_name = r.event_name
        AND e.risk_tier = r.risk_tier
        AND e.sensitivity = r.sensitivity
        AND e.required_keys = r.required_keys
        AND e.optional_keys = r.optional_keys
        AND e.allow_empty_metadata = r.allow_empty_metadata
        AND e.client_requirement = r.client_requirement
        AND e.target_user_requirement = r.target_user_requirement
        AND e.permitted_actor_types = r.permitted_actor_types
        AND e.permitted_actions = r.permitted_actions
        AND e.permitted_resource_types = r.permitted_resource_types
    ) THEN
      RAISE EXCEPTION '0030 PRECONDITION FAILED (fail-closed): read event % is absent or does not EXACTLY match the approved canonical (HIGH/S4). No downgrade/overwrite is performed; reconcile manually.', r.event_name;
    END IF;
  END LOOP;
END
$pre_read$;

-- ── Seed: plain INSERT of ONLY the 21 absent events (0030 owns exactly these 21) ──
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
('audit.log.exported','CRITICAL','S4',ARRAY['export_format_code','row_count_exported','filter_applied'],ARRAY['date_range_start','date_range_end'],false,'optional','prohibited',ARRAY['service'],ARRAY['EXPORT'],ARRAY['audit_log']),
('audit.ingestion.failed','CRITICAL','S4',ARRAY['triggering_event_name','failure_reason_code'],ARRAY[]::text[],false,'prohibited','prohibited',ARRAY['service'],ARRAY['INSERT'],ARRAY['audit_log']),
('whatsapp.access.denied','HIGH','S3',ARRAY['denial_reason_code','wa_actor_hmac'],ARRAY['bot_version','attempt_count'],false,'optional','prohibited',ARRAY['service'],ARRAY['DENY'],ARRAY['auth_session']);

-- ── Postcondition: all 23 present; the 2 read events remain S4; FORCE RLS intact ──
DO $post$
DECLARE
  n int;
  n_read_s4 int;
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

  SELECT count(*) INTO n_read_s4 FROM public.audit_event_contract
  WHERE event_name IN ('audit.log.read_requested','audit.log.read_completed')
    AND risk_tier='HIGH' AND sensitivity='S4';
  IF n_read_s4 <> 2 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: the 2 read events must remain HIGH/S4 (found % matching).', n_read_s4;
  END IF;

  IF NOT (SELECT bool_and(relrowsecurity AND relforcerowsecurity) FROM pg_class
          WHERE oid IN ('public.audit_log'::regclass,'public.audit_event_contract'::regclass,'public.audit_ingestion_failures'::regclass)) THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: audit_* tables must remain ENABLE+FORCE RLS.';
  END IF;
END
$post$;

COMMIT;
-- ############################################################################
-- ##  END 0030 — rollback: 0030_phase4c_event_contract_seed_rollback.sql      ##
-- ############################################################################
