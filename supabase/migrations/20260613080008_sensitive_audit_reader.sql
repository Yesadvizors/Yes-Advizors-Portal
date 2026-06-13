-- =====================================================================
-- Phase 4C v7 — 20260613080008_sensitive_audit_reader.sql
-- STATUS: DRAFT / NOT APPLIED. Do not run. For review only.
-- =====================================================================
-- The ONLY authenticated-callable RPC (finding #1, #10). It is NOT a
-- generic logger: it authenticates, enforces Admin, performs the read, and
-- writes its OWN fixed read_requested/read_completed events whose facts it
-- derives from its own inputs and results. It exposes no event-name/
-- metadata logging contract to the caller.
--
-- A private internal helper _write_read_audit() (NOT granted to any app
-- role) performs the user-attributed insert (actor_user_id=auth.uid(),
-- actor_app_role from the same identity). It is callable only by the
-- reader (audit_owner) — there is no generic authenticated writer.
--
-- ONE-SNAPSHOT SQL (finding #3): items, total_count, returned_count and
-- total_pages all come from a SINGLE statement over MATERIALIZED CTEs.
-- No empty-page fallback count query.
--
-- EXACT SCOPE (finding #4): records canonical client_uuid (top-level on
-- the audit event, not duplicated in metadata), exact validated
-- filter_date_start / filter_date_end, validated filter_risk_tier,
-- requested page number/size. Timestamps are NORMALISED TO UTC and emitted
-- as YYYY-MM-DDTHH:MI:SS.MSZ (millisecond precision, trailing Z). Original
-- client timezone is NOT preserved; values are canonical UTC. Field names
-- are filter_date_start / filter_date_end consistently (finding #2).
--
-- TRUTHFUL FACTS (finding #5): read_requested carries only pre-execution
-- facts and is the AUTHORITATIVE record of read scope. read_completed
-- carries DB-derived returned/total counts, page_empty and
-- completion_status, plus read_request_audit_id = the exact server-derived
-- v_req_id of the request event (findings v8 #1/#2). read_request_audit_id
-- is never a caller input. No placeholders.
--
-- FAIL-CLOSED + ROLLBACK (finding #13): read_requested is written first;
-- if it fails the function RAISEs and returns nothing. All work shares one
-- transaction: if any later statement raises, the whole transaction
-- (including the audit rows) rolls back. We DO NOT claim those rows
-- persist after a failed transaction; durable alerting is out-of-band.
-- =====================================================================

-- Private helper: user-attributed insert for the reader's own events only.
CREATE FUNCTION public._write_read_audit(
  p_event_name text, p_client_uuid uuid, p_metadata jsonb
)
RETURNS uuid LANGUAGE plpgsql
SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_id uuid := gen_random_uuid(); c public.audit_event_contract%ROWTYPE;
  v_actor uuid; v_role text; v_reason text; v_code text; v_n int;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN PERFORM public._record_audit_failure(p_event_name,'NO_VERIFIED_USER',NULL,'P0011'); RETURN NULL; END IF;
  v_role := public.get_app_role_for_user(v_actor);
  IF v_role <> 'admin' THEN PERFORM public._record_audit_failure(p_event_name,'READ_AUDIT_NOT_ADMIN',NULL,'P0016'); RETURN NULL; END IF;

  SELECT * INTO c FROM public.audit_event_contract WHERE event_name=p_event_name;
  IF NOT FOUND THEN PERFORM public._record_audit_failure(p_event_name,'UNKNOWN_EVENT',NULL,'P0001'); RETURN NULL; END IF;

  v_reason := public.audit_validate_event(p_event_name,'user','VIEW','audit_log',p_client_uuid,NULL,p_metadata);
  IF v_reason IS NOT NULL THEN
    PERFORM public._record_audit_failure(p_event_name,v_reason,ARRAY(SELECT jsonb_object_keys(coalesce(p_metadata,'{}'::jsonb))),'P0002'); RETURN NULL;
  END IF;

  IF p_client_uuid IS NOT NULL THEN
    SELECT count(*) INTO v_n FROM public.clients WHERE id=p_client_uuid;
    IF v_n<>1 THEN PERFORM public._record_audit_failure(p_event_name,'CLIENT_NOT_FOUND',NULL,'P0014'); RETURN NULL; END IF;
    SELECT client_id INTO v_code FROM public.clients WHERE id=p_client_uuid;
  END IF;

  INSERT INTO public.audit_log (
    id,initiated_by_type,actor_user_id,actor_service,actor_app_role,target_user_id,
    client_uuid,client_code_snapshot,resource_type,resource_id,
    event_name,event_category,action,description,risk_tier,sensitivity_tier,metadata
  ) VALUES (
    v_id,'user',v_actor,NULL,v_role,NULL,
    p_client_uuid,v_code,'audit_log',NULL,
    p_event_name,'audit','VIEW',NULL,c.risk_tier,c.sensitivity,p_metadata
  );
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  PERFORM public._record_audit_failure(p_event_name,'DB_ERROR',NULL,SQLSTATE);
  RAISE WARNING 'read-audit insert failed for % (%):', p_event_name, SQLSTATE; RETURN NULL;
END;
$$;
-- OWNER = audit_writer so the INSERT into audit_log runs as the role named in
-- the only INSERT RLS policy (audit_writer_insert). Under FORCE RLS, a SECURITY
-- DEFINER function owned by audit_owner would NOT satisfy that policy and the
-- insert would fail. Ownership by audit_writer aligns the executing role with
-- the INSERT policy and the table INSERT grant. (finding #1)
ALTER FUNCTION public._write_read_audit(text,uuid,jsonb) OWNER TO audit_writer;
REVOKE EXECUTE ON FUNCTION public._write_read_audit(text,uuid,jsonb) FROM PUBLIC, anon, authenticated, service_role;
-- internal: executed only by the audit_owner-owned reader. No app grant.
GRANT EXECUTE ON FUNCTION public._write_read_audit(text,uuid,jsonb) TO audit_owner;

-- _write_read_audit (owned by audit_writer) calls get_app_role_for_user,
-- audit_validate_event, audit_contains_secret and _record_audit_failure.
-- audit_writer already holds EXECUTE on the first three (granted in the writer
-- migration) and on _record_audit_failure (finding #3). audit_owner is granted
-- EXECUTE on _write_read_audit above so the reader can call it.

CREATE FUNCTION public.get_sensitive_audit_logs(
  p_from        timestamptz,
  p_to          timestamptz,
  p_page_number int,
  p_page_size   int,
  p_risk_tier   text DEFAULT NULL,
  p_client_uuid uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql
SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_req_id uuid; v_offset bigint; v_result jsonb;
  v_total bigint; v_returned int;
  c_max_page int := 200; c_max_pageno int := 100000; c_max_range interval := interval '92 days';
  v_req_meta jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE='42501'; END IF;
  IF public.get_app_role() <> 'admin' THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN RAISE EXCEPTION 'invalid date range' USING ERRCODE='22023'; END IF;
  IF (p_to - p_from) > c_max_range THEN RAISE EXCEPTION 'date range exceeds 92 days' USING ERRCODE='22023'; END IF;
  IF p_page_number IS NULL OR p_page_number < 1 OR p_page_number > c_max_pageno THEN RAISE EXCEPTION 'page_number out of range (1..100000)' USING ERRCODE='22023'; END IF;
  IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > c_max_page THEN RAISE EXCEPTION 'page_size must be 1..200' USING ERRCODE='22023'; END IF;
  IF p_risk_tier IS NOT NULL AND p_risk_tier <> ALL (ARRAY['LOW','MEDIUM','HIGH','CRITICAL']) THEN RAISE EXCEPTION 'invalid risk_tier filter' USING ERRCODE='22023'; END IF;

  v_offset := (p_page_number::bigint - 1) * p_page_size::bigint;

  -- 1) read_requested (exact scope, truthful pre-execution facts; fail-closed)
  v_req_meta := jsonb_build_object(
    'requested_page_number', p_page_number,
    'requested_page_size',   p_page_size,
    'filter_applied',        (p_risk_tier IS NOT NULL OR p_client_uuid IS NOT NULL),
    'access_method_code',    'RPC',
    'filter_date_start',     to_char(p_from AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'filter_date_end',       to_char(p_to   AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) || (CASE WHEN p_risk_tier IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('filter_risk_tier',p_risk_tier) END);

  v_req_id := public._write_read_audit('audit.log.read_requested', p_client_uuid, v_req_meta);
  IF v_req_id IS NULL THEN
    RAISE EXCEPTION 'audit logging failed; sensitive read refused (fail-closed)' USING ERRCODE='42501';
  END IF;

  -- 2) ONE statement: items + total + returned + total_pages from one snapshot
  WITH filtered AS MATERIALIZED (
    SELECT a.*
      FROM public.audit_log a
     WHERE a.id <> v_req_id
       AND a.occurred_at BETWEEN p_from AND p_to
       AND (p_risk_tier  IS NULL OR a.risk_tier  = p_risk_tier)
       AND (p_client_uuid IS NULL OR a.client_uuid = p_client_uuid)
  ),
  page_rows AS MATERIALIZED (
    SELECT * FROM filtered
     ORDER BY occurred_at DESC, id DESC
     LIMIT p_page_size OFFSET v_offset
  )
  SELECT
    jsonb_build_object(
      'items',          COALESCE((SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.occurred_at DESC, pr.id DESC) FROM page_rows pr), '[]'::jsonb),
      'total_count',    (SELECT count(*) FROM filtered),
      'returned_count', (SELECT count(*) FROM page_rows),
      'page_number',    p_page_number,
      'page_size',      p_page_size,
      'total_pages',    CASE WHEN (SELECT count(*) FROM filtered)=0 THEN 0
                             ELSE CEIL((SELECT count(*) FROM filtered)::numeric / p_page_size)::bigint END,
      'out_of_range',   (p_page_number > CASE WHEN (SELECT count(*) FROM filtered)=0 THEN 0
                             ELSE CEIL((SELECT count(*) FROM filtered)::numeric / p_page_size)::bigint END
                         AND (SELECT count(*) FROM filtered) > 0)
    ),
    (SELECT count(*) FROM filtered),
    (SELECT count(*) FROM page_rows)::int
  INTO v_result, v_total, v_returned;

  -- 3) read_completed: linked to the exact request event via the server-derived
  --    v_req_id (finding v8 #1). The request event is authoritative for read
  --    scope (date range, client, risk tier); the completion event records only
  --    outcome facts plus the immutable correlation id (finding v8 #2).
  --    read_request_audit_id is NEVER a caller input — it is v_req_id::text.
  IF public._write_read_audit('audit.log.read_completed', p_client_uuid,
       jsonb_build_object(
         'read_request_audit_id', v_req_id::text,
         'returned_row_count',    v_returned,
         'total_match_count',     v_total,
         'page_empty',            (v_returned = 0),
         'completion_status_code',CASE WHEN v_returned = 0 THEN 'EMPTY' ELSE 'SUCCESS' END,
         'requested_page_number', p_page_number,
         'requested_page_size',   p_page_size,
         'access_method_code',    'RPC'
       )
     ) IS NULL THEN
    RAISE EXCEPTION 'audit completion logging failed; sensitive read refused (fail-closed)' USING ERRCODE='42501';
  END IF;

  RETURN v_result;
END;
$$;
ALTER FUNCTION public.get_sensitive_audit_logs(timestamptz,timestamptz,int,int,text,uuid) OWNER TO audit_owner;
REVOKE EXECUTE ON FUNCTION public.get_sensitive_audit_logs(timestamptz,timestamptz,int,int,text,uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.get_sensitive_audit_logs(timestamptz,timestamptz,int,int,text,uuid) TO authenticated;
COMMENT ON FUNCTION public.get_sensitive_audit_logs(timestamptz,timestamptz,int,int,text,uuid)
  IS 'Phase 4C v8: Admin-only audit read; self-contained (writes its own read events); one-snapshot envelope; truthful counts; fail-closed.';
