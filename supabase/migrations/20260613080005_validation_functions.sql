-- =====================================================================
-- Phase 4C v7 — 20260613070006_validation_functions.sql
-- STATUS: DRAFT / NOT APPLIED. Do not run. For review only.
-- =====================================================================
-- Validation helpers owned by audit_writer. EXECUTE revoked from all four
-- Supabase roles; granted only to audit_writer + audit_owner.
--
--  audit_contains_secret(text)            -- PAN/Aadhaar/GSTIN/TAN/mobile/
--                                            email/bank/JWT/key/secret kw
--  audit_is_uuid(text)                    -- REAL uuid cast in exception block
--  audit_field_format_ok(field, jsonb)    -- explicit per-field enum/type/
--                                            format/range; NO suffix matching;
--                                            real uuid/int/date casts
--  audit_validate_event(...)              -- contract enforcement incl.
--                                            non-null required, target rule
-- =====================================================================

CREATE FUNCTION public.audit_contains_secret(p_text text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE
SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF p_text IS NULL THEN RETURN false; END IF;
  RETURN (
       p_text ~ '[A-Z]{5}[0-9]{4}[A-Z]'
    OR p_text ~ '\m[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}\M'
    OR p_text ~ '[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]'
    OR p_text ~ '[A-Z]{4}[0-9]{5}[A-Z]'
    OR p_text ~ '\m(\+?91[-\s]?)?[6-9][0-9]{9}\M'
    OR p_text ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    OR p_text ~ '\m[0-9]{9,18}\M'
    OR p_text ~ 'eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.'
    OR p_text ~ '-----BEGIN [A-Z ]*PRIVATE KEY-----'
    OR p_text ~ '(?i)(authorization|bearer\s|password|passwd|secret|api[_-]?key|service_role|set-cookie|cookie|\botp\b|credential|access[_-]?token|refresh[_-]?token)'
  );
END;
$$;
ALTER FUNCTION public.audit_contains_secret(text) OWNER TO audit_writer;
REVOKE EXECUTE ON FUNCTION public.audit_contains_secret(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.audit_contains_secret(text) TO audit_writer, audit_owner;

CREATE FUNCTION public.audit_is_uuid(p_text text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE
SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v uuid;
BEGIN
  IF p_text IS NULL THEN RETURN false; END IF;
  BEGIN v := p_text::uuid; RETURN true;
  EXCEPTION WHEN others THEN RETURN false; END;
END;
$$;
ALTER FUNCTION public.audit_is_uuid(text) OWNER TO audit_writer;
REVOKE EXECUTE ON FUNCTION public.audit_is_uuid(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.audit_is_uuid(text) TO audit_writer, audit_owner;

CREATE FUNCTION public.audit_field_format_ok(p_field text, p_value jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE
SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  t text := jsonb_typeof(p_value);
  s text := CASE WHEN jsonb_typeof(p_value)='string' THEN (p_value #>> '{}') ELSE p_value::text END;
  d date;
  ts timestamptz;
BEGIN
  IF t = 'null' THEN RETURN true; END IF;

  CASE p_field
    WHEN 'assigned_role_code'  THEN RETURN t='string' AND s = ANY (ARRAY['ADMIN','MANAGER','EXECUTIVE','STAFF','VIEWER','INTERN','DEVELOPER_TEST','CLIENT']);
    WHEN 'old_role_code'       THEN RETURN t='string' AND s = ANY (ARRAY['ADMIN','MANAGER','EXECUTIVE','STAFF','VIEWER','INTERN','DEVELOPER_TEST','CLIENT']);
    WHEN 'new_role_code'       THEN RETURN t='string' AND s = ANY (ARRAY['ADMIN','MANAGER','EXECUTIVE','STAFF','VIEWER','INTERN','DEVELOPER_TEST','CLIENT']);
    WHEN 'login_method_code'   THEN RETURN t='string' AND s = ANY (ARRAY['PASSWORD','OTP','MAGIC_LINK','PIN','SSO']);
    WHEN 'change_type_code'    THEN RETURN t='string' AND s = ANY (ARRAY['CREATED','UPDATED','DELETED','ENABLED','DISABLED','GRANTED','REVOKED']);
    WHEN 'logout_type_code'    THEN RETURN t='string' AND s = ANY (ARRAY['USER_INITIATED','TIMEOUT','FORCED','SYSTEM']);
    WHEN 'request_channel_code'THEN RETURN t='string' AND s = ANY (ARRAY['EMAIL','SMS','WHATSAPP','PORTAL']);
    WHEN 'reset_channel_code'  THEN RETURN t='string' AND s = ANY (ARRAY['EMAIL','SMS','WHATSAPP','PORTAL']);
    WHEN 'invite_method_code'  THEN RETURN t='string' AND s = ANY (ARRAY['EMAIL','MANUAL','SSO']);
    WHEN 'export_type_code'    THEN RETURN t='string' AND s = ANY (ARRAY['AUDIT_LOG','CLIENT_LIST','DOCUMENT_SET','COMPLIANCE_REPORT']);
    WHEN 'export_format_code'  THEN RETURN t='string' AND s = ANY (ARRAY['CSV','XLSX','PDF','JSON']);
    WHEN 'scope_code'          THEN RETURN t='string' AND s = ANY (ARRAY['SINGLE_CLIENT','ALL_CLIENTS','DATE_RANGE','FILTERED']);
    WHEN 'download_channel_code' THEN RETURN t='string' AND s = ANY (ARRAY['PORTAL','WHATSAPP','API']);
    WHEN 'requested_operation_code' THEN RETURN t='string' AND s = ANY (ARRAY['VIEW','EDIT','DOWNLOAD','EXPORT','DELETE']);
    WHEN 'detection_method_code' THEN RETURN t='string' AND s = ANY (ARRAY['RLS','APP_CHECK','RPC_GUARD','MANUAL_REVIEW']);
    WHEN 'permission_type_code'THEN RETURN t='string' AND s = ANY (ARRAY['CLIENT_ACCESS','SENSITIVE_VIEW','FINANCIAL_VIEW','DOC_DOWNLOAD']);
    WHEN 'access_method_code'  THEN RETURN t='string' AND s = ANY (ARRAY['RPC','BACKEND']);
    WHEN 'filter_risk_tier'    THEN RETURN t='string' AND s = ANY (ARRAY['LOW','MEDIUM','HIGH','CRITICAL']);
    WHEN 'change_reason_code'  THEN RETURN t='string' AND s ~ '^[A-Z][A-Z0-9_]{1,39}$';
    WHEN 'denial_reason_code'  THEN RETURN t='string' AND s ~ '^[A-Z][A-Z0-9_]{1,39}$';
    WHEN 'deactivation_reason_code' THEN RETURN t='string' AND s ~ '^[A-Z][A-Z0-9_]{1,39}$';
    WHEN 'reactivation_reason_code' THEN RETURN t='string' AND s ~ '^[A-Z][A-Z0-9_]{1,39}$';
    WHEN 'revocation_reason_code'   THEN RETURN t='string' AND s ~ '^[A-Z][A-Z0-9_]{1,39}$';
    WHEN 'failure_reason_code' THEN RETURN t='string' AND s ~ '^[A-Z][A-Z0-9_]{1,39}$';
    WHEN 'old_value_code'      THEN RETURN t='string' AND s ~ '^[A-Z][A-Z0-9_]{1,39}$';
    WHEN 'new_value_code'      THEN RETURN t='string' AND s ~ '^[A-Z][A-Z0-9_]{1,39}$';
    WHEN 'setting_name_code'   THEN RETURN t='string' AND s ~ '^[A-Z][A-Z0-9_]{1,39}$';
    WHEN 'triggering_event_name' THEN RETURN t='string' AND s ~ '^[a-z][a-z._]{1,60}$';
    WHEN 'compliance_type_code_filter' THEN RETURN t='string' AND s ~ '^[A-Z][A-Z0-9_]{1,39}$';
    WHEN 'attempt_count'             THEN RETURN t='number' AND s ~ '^[0-9]+$' AND s::numeric <= 1000;
    WHEN 'record_count'              THEN RETURN t='number' AND s ~ '^[0-9]+$' AND s::numeric <= 10000000;
    WHEN 'document_count'            THEN RETURN t='number' AND s ~ '^[0-9]+$' AND s::numeric <= 1000000;
    WHEN 'returned_row_count'        THEN RETURN t='number' AND s ~ '^[0-9]+$' AND s::numeric <= 10000000;
    WHEN 'total_match_count'         THEN RETURN t='number' AND s ~ '^[0-9]+$' AND s::numeric <= 100000000;
    WHEN 'row_count_exported'        THEN RETURN t='number' AND s ~ '^[0-9]+$' AND s::numeric <= 100000000;
    WHEN 'session_duration_seconds'  THEN RETURN t='number' AND s ~ '^[0-9]+$' AND s::numeric <= 31536000;
    WHEN 'time_since_request_seconds'THEN RETURN t='number' AND s ~ '^[0-9]+$' AND s::numeric <= 31536000;
    WHEN 'date_range_days'           THEN RETURN t='number' AND s ~ '^[0-9]+$' AND s::numeric <= 366;
    WHEN 'requested_page_number'     THEN RETURN t='number' AND s ~ '^[0-9]+$' AND s::numeric BETWEEN 1 AND 100000;
    WHEN 'requested_page_size'       THEN RETURN t='number' AND s ~ '^[0-9]+$' AND s::numeric BETWEEN 1 AND 200;
    WHEN 'filter_applied' THEN RETURN t='boolean';
    WHEN 'page_empty'     THEN RETURN t='boolean';
    WHEN 'read_request_audit_id' THEN RETURN t='string' AND public.audit_is_uuid(s);
    WHEN 'completion_status_code' THEN RETURN t='string' AND s = ANY (ARRAY['SUCCESS','PARTIAL','EMPTY']);
    WHEN 'login_subject_hmac' THEN RETURN t='string' AND s ~ '^[0-9a-f]{64}$';
    WHEN 'wa_actor_hmac'      THEN RETURN t='string' AND s ~ '^[0-9a-f]{64}$';
    WHEN 'table_name'  THEN RETURN t='string' AND s ~ '^[a-z_][a-z0-9_]{0,62}$';
    WHEN 'policy_name' THEN RETURN t='string' AND s ~ '^[A-Za-z0-9_ ]{1,80}$';
    WHEN 'migration_reference' THEN RETURN t='string' AND s ~ '^[0-9]{14}_[a-z0-9_]{1,80}$';
    WHEN 'date_range_start' THEN BEGIN d := s::date; RETURN true; EXCEPTION WHEN others THEN RETURN false; END;
    WHEN 'date_range_end'   THEN BEGIN d := s::date; RETURN true; EXCEPTION WHEN others THEN RETURN false; END;
    WHEN 'filter_date_start' THEN BEGIN ts := s::timestamptz; RETURN true; EXCEPTION WHEN others THEN RETURN false; END;
    WHEN 'filter_date_end'   THEN BEGIN ts := s::timestamptz; RETURN true; EXCEPTION WHEN others THEN RETURN false; END;
    WHEN 'filing_period_range' THEN RETURN t='string' AND s ~ '^([A-Z][a-z]{2}-[0-9]{2}|[0-9]{4}-[0-9]{2}|Q[1-4]-[0-9]{4})(\s*to\s*([A-Z][a-z]{2}-[0-9]{2}|[0-9]{4}-[0-9]{2}|Q[1-4]-[0-9]{4}))?$';
    WHEN 'user_agent_family' THEN RETURN t='string' AND char_length(s) BETWEEN 1 AND 60;
    WHEN 'portal_version'    THEN RETURN t='string' AND s ~ '^[0-9A-Za-z._-]{1,30}$';
    WHEN 'bot_version'       THEN RETURN t='string' AND s ~ '^[0-9A-Za-z._-]{1,30}$';
    WHEN 'session_reference_id' THEN RETURN t='string' AND s ~ '^[0-9A-Za-z._-]{1,64}$';
    ELSE
      RETURN false;
  END CASE;
END;
$$;
ALTER FUNCTION public.audit_field_format_ok(text,jsonb) OWNER TO audit_writer;
REVOKE EXECUTE ON FUNCTION public.audit_field_format_ok(text,jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.audit_field_format_ok(text,jsonb) TO audit_writer, audit_owner;

CREATE FUNCTION public.audit_validate_event(
  p_event_name text, p_initiated_by_type text, p_action text,
  p_resource_type text, p_client_uuid uuid, p_target_user_id uuid, p_metadata jsonb
)
RETURNS text LANGUAGE plpgsql STABLE
SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  c   public.audit_event_contract%ROWTYPE;
  k   text; v jsonb; rk text; sval text;
  c_max_bytes int := 4000;
BEGIN
  SELECT * INTO c FROM public.audit_event_contract WHERE event_name = p_event_name;
  IF NOT FOUND THEN RETURN 'UNKNOWN_EVENT'; END IF;

  IF NOT (p_initiated_by_type = ANY (c.permitted_actor_types)) THEN RETURN 'ACTOR_TYPE_NOT_PERMITTED'; END IF;

  IF array_length(c.permitted_actions,1) IS NULL THEN
    IF p_action IS NOT NULL THEN RETURN 'ACTION_NOT_PERMITTED'; END IF;
  ELSE
    IF p_action IS NULL OR NOT (p_action = ANY (c.permitted_actions)) THEN RETURN 'ACTION_NOT_PERMITTED'; END IF;
  END IF;

  IF array_length(c.permitted_resource_types,1) IS NULL THEN
    IF p_resource_type IS NOT NULL THEN RETURN 'RESOURCE_TYPE_NOT_PERMITTED'; END IF;
  ELSE
    IF p_resource_type IS NULL OR NOT (p_resource_type = ANY (c.permitted_resource_types)) THEN RETURN 'RESOURCE_TYPE_NOT_PERMITTED'; END IF;
  END IF;

  IF c.client_requirement='required'   AND p_client_uuid IS NULL     THEN RETURN 'CLIENT_REQUIRED'; END IF;
  IF c.client_requirement='prohibited' AND p_client_uuid IS NOT NULL THEN RETURN 'CLIENT_PROHIBITED'; END IF;
  IF c.target_user_requirement='required'   AND p_target_user_id IS NULL     THEN RETURN 'TARGET_USER_REQUIRED'; END IF;
  IF c.target_user_requirement='prohibited' AND p_target_user_id IS NOT NULL THEN RETURN 'TARGET_USER_PROHIBITED'; END IF;

  IF p_metadata IS NULL OR jsonb_typeof(p_metadata) <> 'object' THEN RETURN 'METADATA_NOT_OBJECT'; END IF;
  IF octet_length(p_metadata::text) > c_max_bytes THEN RETURN 'METADATA_OVERSIZE'; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p_metadata))=0 AND NOT c.allow_empty_metadata THEN RETURN 'EMPTY_METADATA_NOT_ALLOWED'; END IF;

  FOREACH rk IN ARRAY c.required_keys LOOP
    IF NOT (p_metadata ? rk) THEN RETURN 'MISSING_REQUIRED_KEY:'||rk; END IF;
    v := p_metadata -> rk;
    IF jsonb_typeof(v) = 'null' THEN RETURN 'REQUIRED_NULL:'||rk; END IF;
    IF jsonb_typeof(v) = 'string' THEN
      sval := v #>> '{}';
      IF btrim(sval) = '' THEN RETURN 'REQUIRED_BLANK:'||rk; END IF;
    END IF;
    IF NOT public.audit_field_format_ok(rk, v) THEN RETURN 'BAD_FORMAT:'||rk; END IF;
  END LOOP;

  FOR k, v IN SELECT key, value FROM jsonb_each(p_metadata) LOOP
    IF NOT (k = ANY (c.required_keys) OR k = ANY (c.optional_keys)) THEN RETURN 'DISALLOWED_KEY:'||k; END IF;
    IF jsonb_typeof(v) IN ('object','array') THEN RETURN 'NESTED_NOT_ALLOWED:'||k; END IF;
    IF jsonb_typeof(v) = 'null' THEN RETURN 'OPTIONAL_NULL_NOT_ALLOWED:'||k; END IF;
    IF NOT public.audit_field_format_ok(k, v) THEN RETURN 'BAD_FORMAT:'||k; END IF;
    IF jsonb_typeof(v) = 'string' THEN
      sval := v #>> '{}';
      IF char_length(sval) > 500 THEN RETURN 'VALUE_OVERSIZE:'||k; END IF;
      IF public.audit_contains_secret(sval) THEN RETURN 'PROHIBITED_VALUE:'||k; END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;
ALTER FUNCTION public.audit_validate_event(text,text,text,text,uuid,uuid,jsonb) OWNER TO audit_writer;
REVOKE EXECUTE ON FUNCTION public.audit_validate_event(text,text,text,text,uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.audit_validate_event(text,text,text,text,uuid,uuid,jsonb) TO audit_writer, audit_owner;
