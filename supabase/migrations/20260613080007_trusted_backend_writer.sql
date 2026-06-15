-- =====================================================================
-- Phase 4C v7 — 20260613080007_trusted_backend_writer.sql
-- STATUS: DRAFT / NOT APPLIED. Do not run. For review only.
-- =====================================================================
-- ONE honest writer (findings #1, #6, #7, #8).
--
--  log_audit_event_trusted_backend(...)
--   * initiated_by_type is ALWAYS 'service' (no parameter; finding #7).
--   * actor_service is ALWAYS hard-coded 'trusted-backend' (finding #6):
--     service_role proves trusted backend access, NOT which component
--     called. No multiple wrappers implying stronger provenance.
--   * NO p_actor_user_id parameter — backend cannot claim an initiating
--     user (finding #1). actor_user_id is always NULL; actor_app_role NULL.
--   * No 'system' mode (finding #8) — removed from executable contract.
--   * Granted to service_role (this is the only backend write path).
--   * Contract-validated; canonical client + target-user existence checks;
--     description/resource_id length + secret scan; pre-generated id
--     (no RETURNING).
--
-- The sensitive reader writes its OWN audit.log.read_* events through a
-- SEPARATE internal path (next migration) that derives actor_user_id from
-- auth.uid(); that path is NOT a generic logger and is not granted to
-- authenticated (finding #1). There is no generic authenticated writer.
-- =====================================================================

CREATE FUNCTION public._record_audit_failure(
  p_event_name text, p_failure_reason text, p_field_names_only text[], p_sqlstate text
)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.audit_ingestion_failures (id, triggering_event, failure_reason_code, field_names_only, sqlstate_code)
  VALUES (v_id, p_event_name, p_failure_reason, p_field_names_only, p_sqlstate);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '_record_audit_failure: fallback insert failed for % (%):', p_event_name, SQLSTATE;
END;
$$;
ALTER FUNCTION public._record_audit_failure(text,text,text[],text) OWNER TO audit_writer;
REVOKE EXECUTE ON FUNCTION public._record_audit_failure(text,text,text[],text) FROM PUBLIC, anon, authenticated, service_role;
-- Internal failure logger. Explicit EXECUTE to audit_writer (finding #3):
-- both audit_writer-owned callers — log_audit_event_trusted_backend and
-- _write_read_audit — invoke it. Never granted to app roles.
GRANT EXECUTE ON FUNCTION public._record_audit_failure(text,text,text[],text) TO audit_writer;
-- internal only.

CREATE FUNCTION public.log_audit_event_trusted_backend(
  p_event_name     text,
  p_target_user_id uuid    DEFAULT NULL,
  p_client_uuid    uuid    DEFAULT NULL,
  p_resource_type  text    DEFAULT NULL,
  p_resource_id    text    DEFAULT NULL,
  p_action         text    DEFAULT NULL,
  p_description    text    DEFAULT NULL,
  p_metadata       jsonb   DEFAULT '{}'::jsonb
)
RETURNS uuid LANGUAGE plpgsql
SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_id uuid := gen_random_uuid(); c public.audit_event_contract%ROWTYPE;
  v_reason text; v_code text; v_category text; v_n int;
  c_service text := 'trusted-backend';   -- hard-coded; honest single identity
  c_max_desc int := 500; c_max_resid int := 200;
BEGIN
  SELECT * INTO c FROM public.audit_event_contract WHERE event_name=p_event_name;
  IF NOT FOUND THEN PERFORM public._record_audit_failure(p_event_name,'UNKNOWN_EVENT',NULL,'P0001'); RETURN NULL; END IF;

  -- this writer only ever produces 'service' events
  v_reason := public.audit_validate_event(p_event_name,'service',p_action,p_resource_type,p_client_uuid,p_target_user_id,p_metadata);
  IF v_reason IS NOT NULL THEN
    PERFORM public._record_audit_failure(p_event_name,v_reason,ARRAY(SELECT jsonb_object_keys(coalesce(p_metadata,'{}'::jsonb))),'P0002'); RETURN NULL;
  END IF;

  IF p_description IS NOT NULL THEN
    IF char_length(p_description)>c_max_desc THEN PERFORM public._record_audit_failure(p_event_name,'DESC_OVERSIZE',NULL,'P0005'); RETURN NULL; END IF;
    IF public.audit_contains_secret(p_description) THEN PERFORM public._record_audit_failure(p_event_name,'PROHIBITED_VALUE:description',NULL,'P0003'); RETURN NULL; END IF;
  END IF;
  IF p_resource_id IS NOT NULL THEN
    IF char_length(p_resource_id)>c_max_resid THEN PERFORM public._record_audit_failure(p_event_name,'RESID_OVERSIZE',NULL,'P0005'); RETURN NULL; END IF;
    IF public.audit_contains_secret(p_resource_id) THEN PERFORM public._record_audit_failure(p_event_name,'PROHIBITED_VALUE:resource_id',NULL,'P0003'); RETURN NULL; END IF;
  END IF;

  IF p_client_uuid IS NOT NULL THEN
    SELECT count(*) INTO v_n FROM public.clients WHERE id=p_client_uuid;
    IF v_n<>1 THEN PERFORM public._record_audit_failure(p_event_name,'CLIENT_NOT_FOUND',NULL,'P0014'); RETURN NULL; END IF;
    SELECT client_id INTO v_code FROM public.clients WHERE id=p_client_uuid;
  END IF;
  IF p_target_user_id IS NOT NULL THEN
    SELECT count(*) INTO v_n FROM public.team WHERE auth_user_id=p_target_user_id AND is_active=true;
    IF v_n<>1 THEN PERFORM public._record_audit_failure(p_event_name,'TARGET_USER_NOT_FOUND',NULL,'P0015'); RETURN NULL; END IF;
  END IF;

  v_category := split_part(p_event_name,'.',1);

  INSERT INTO public.audit_log (
    id,initiated_by_type,actor_user_id,actor_service,actor_app_role,target_user_id,
    client_uuid,client_code_snapshot,resource_type,resource_id,
    event_name,event_category,action,description,risk_tier,sensitivity_tier,metadata
  ) VALUES (
    v_id,'service',NULL,c_service,NULL,p_target_user_id,
    p_client_uuid,v_code,p_resource_type,p_resource_id,
    p_event_name,v_category,p_action,p_description,c.risk_tier,c.sensitivity,p_metadata
  );
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  PERFORM public._record_audit_failure(p_event_name,'DB_ERROR',ARRAY(SELECT jsonb_object_keys(coalesce(p_metadata,'{}'::jsonb))),SQLSTATE);
  RAISE WARNING 'trusted-backend writer: insert failed for % (%):', p_event_name, SQLSTATE; RETURN NULL;
END;
$$;
ALTER FUNCTION public.log_audit_event_trusted_backend(text,uuid,uuid,text,text,text,text,jsonb) OWNER TO audit_writer;
REVOKE EXECUTE ON FUNCTION public.log_audit_event_trusted_backend(text,uuid,uuid,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.log_audit_event_trusted_backend(text,uuid,uuid,text,text,text,text,jsonb) TO service_role, audit_owner;

-- NOINHERIT-safe cross-function EXECUTE for audit_writer (writer owner):
GRANT EXECUTE ON FUNCTION public.audit_validate_event(text,text,text,text,uuid,uuid,jsonb) TO audit_writer;
GRANT EXECUTE ON FUNCTION public.audit_contains_secret(text)                               TO audit_writer;
GRANT EXECUTE ON FUNCTION public.audit_field_format_ok(text,jsonb)                          TO audit_writer;
GRANT EXECUTE ON FUNCTION public.audit_is_uuid(text)                                        TO audit_writer;

COMMENT ON FUNCTION public.log_audit_event_trusted_backend(text,uuid,uuid,text,text,text,text,jsonb)
  IS 'Phase 4C v7: single honest service writer; actor_service=trusted-backend (asserted, not DB-verified per component); no user/system mode.';
