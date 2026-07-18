-- G-2b migration (Tranche 2, Rev1.1 corrected) — AUTHORED NOT APPLIED; reviewed before G-3.
-- RLS/role helper functions + the 3 frontend RPCs. Byte-exact from V1 reference (REFERENCE ONLY),
-- re-extracted with correct UTF-8 (fixes Rev1.0 mojibake, C-G2B-4).
-- Adds is_admin() and is_admin_or_manager() required by 0010 RLS (C-G2B-1).
-- KEEP per scope_map. Helpers first (dependency order), then RPCs.

-- get_app_role (ref L3620-3641)
CREATE FUNCTION public.get_app_role() RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
DECLARE v_count int; v_admin boolean; v_portal text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'anon'; END IF;
  SELECT count(*) INTO v_count FROM public.team t WHERE t.auth_user_id=auth.uid() AND t.is_active=true;
  IF v_count <> 1 THEN RETURN 'anon'; END IF;
  SELECT t.is_admin, t.portal_role::text INTO v_admin, v_portal
    FROM public.team t WHERE t.auth_user_id=auth.uid() AND t.is_active=true;
  IF v_admin THEN RETURN 'admin'; END IF;
  RETURN CASE v_portal
    WHEN 'Admin'     THEN 'admin'
    WHEN 'Manager'   THEN 'manager'
    WHEN 'Executive' THEN 'staff'
    WHEN 'Staff'     THEN 'staff'
    WHEN 'Viewer'    THEN 'viewer'
    ELSE 'denied'
  END;
END;
$$;

-- get_app_role_for_user (ref L3648-3669)
CREATE FUNCTION public.get_app_role_for_user(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
DECLARE v_count int; v_admin boolean; v_portal text;
BEGIN
  IF p_user_id IS NULL THEN RETURN 'denied'; END IF;
  SELECT count(*) INTO v_count FROM public.team t WHERE t.auth_user_id=p_user_id AND t.is_active=true;
  IF v_count <> 1 THEN RETURN 'denied'; END IF;
  SELECT t.is_admin, t.portal_role::text INTO v_admin, v_portal
    FROM public.team t WHERE t.auth_user_id=p_user_id AND t.is_active=true;
  IF v_admin THEN RETURN 'admin'; END IF;
  RETURN CASE v_portal
    WHEN 'Admin'     THEN 'admin'
    WHEN 'Manager'   THEN 'manager'
    WHEN 'Executive' THEN 'staff'
    WHEN 'Staff'     THEN 'staff'
    WHEN 'Viewer'    THEN 'viewer'
    ELSE 'denied'
  END;
END;
$$;

-- get_my_role (ref L3702-3709)
CREATE FUNCTION public.get_my_role() RETURNS public.user_role_enum
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT role FROM ct_team_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- get_my_team_id (ref L3716-3723)
CREATE FUNCTION public.get_my_team_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT id FROM ct_team_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- get_portal_role (ref L3748-3756)
CREATE FUNCTION public.get_portal_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT portal_role FROM team
  WHERE auth_user_id = auth.uid()
  AND is_active = true
  LIMIT 1;
$$;

-- is_active_user (ref L3879-3888)
CREATE FUNCTION public.is_active_user() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM team
    WHERE auth_user_id = auth.uid()
    AND is_active = true
  );
$$;

-- is_admin (ref L3895-3905) — required by 0010 RLS (C-G2B-1)
CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM team
    WHERE auth_user_id = auth.uid()
    AND portal_role = 'Admin'
    AND is_active = true
  );
$$;

-- is_admin_or_manager (ref L3912-3922) — required by 0010 RLS (C-G2B-1)
CREATE FUNCTION public.is_admin_or_manager() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM team
    WHERE auth_user_id = auth.uid()
    AND portal_role IN ('Admin', 'Manager')
    AND is_active = true
  );
$$;

-- ============ FRONTEND RPCs ============

-- activate_accounting_service (ref L1046-1074)
CREATE FUNCTION public.activate_accounting_service(p_client_id uuid, p_start_fy character varying DEFAULT '2020-21'::character varying) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_fy      RECORD;
  v_month   month_enum;
  v_months  month_enum[] := ARRAY['April','May','June','July','August','September','October','November','December','January','February','March']::month_enum[];
  v_fy_year TEXT;
BEGIN
  FOR v_fy IN
    SELECT * FROM financial_years
    WHERE fy_label >= p_start_fy AND fy_label <= '2025-26'
    ORDER BY fy_label
  LOOP
    v_fy_year := split_part(v_fy.fy_label, '-', 1);
    FOREACH v_month IN ARRAY v_months LOOP
      INSERT INTO accounting_tracker (client_id, fy_id, fy_label, month, period_label, status)
      VALUES (
        p_client_id, v_fy.id, v_fy.fy_label, v_month,
        v_month::TEXT || ' ' || CASE WHEN v_month IN ('January','February','March')
          THEN (v_fy_year::INTEGER+1)::TEXT ELSE v_fy_year END,
        'Not Started'
      )
      ON CONFLICT (client_id, fy_label, month) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- generate_client_compliance (p_client_type TEXT overload, the frontend-called one; ref L3327-3424)
CREATE FUNCTION public.generate_client_compliance(p_client_id uuid, p_client_type text, p_has_gstin boolean DEFAULT false, p_gstin text DEFAULT NULL::text, p_gst_frequency text DEFAULT 'Monthly'::text, p_has_tan boolean DEFAULT false, p_tan text DEFAULT NULL::text, p_has_cin boolean DEFAULT false, p_cin text DEFAULT NULL::text, p_has_llpin boolean DEFAULT false, p_llpin text DEFAULT NULL::text, p_incorporation_date date DEFAULT NULL::date) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_start_fy VARCHAR(10); v_current_fy VARCHAR(10) := '2025-26';
  v_fy RECORD; v_month month_enum;
  v_months month_enum[] := ARRAY['April','May','June','July','August','September','October','November','December','January','February','March']::month_enum[];
  v_quarter quarter_enum; v_quarters quarter_enum[] := ARRAY['Q1','Q2','Q3','Q4']::quarter_enum[];
  v_fy_year TEXT; v_client_text TEXT; v_fin_type TEXT; v_fin_types TEXT[];
BEGIN
  v_start_fy := get_client_start_fy(p_incorporation_date);
  SELECT client_id INTO v_client_text FROM clients WHERE id = p_client_id;

  FOR v_fy IN SELECT * FROM financial_years WHERE fy_label >= v_start_fy AND fy_label <= v_current_fy ORDER BY fy_label LOOP
    v_fy_year := split_part(v_fy.fy_label, '-', 1);

    INSERT INTO income_tax_tracker (client_id, fy_id, fy_label, assessment_year, standard_due_date, status)
    VALUES (p_client_id, v_fy.id, v_fy.fy_label, v_fy.assessment_year,
      CASE WHEN p_client_type IN ('Private Limited Company','Limited Company','LLP') THEN (v_fy.fy_end_date + INTERVAL '7 months')::DATE ELSE (v_fy.fy_end_date + INTERVAL '4 months')::DATE END, 'Not Started')
    ON CONFLICT (client_id, fy_label) DO NOTHING;

    IF p_has_gstin AND p_gstin IS NOT NULL THEN
      IF p_gst_frequency = 'Monthly' THEN
        FOREACH v_month IN ARRAY v_months LOOP
          INSERT INTO gst_tracker (client_id, fy_id, fy_label, gstin, return_type, filing_frequency, period, period_month, standard_due_date, status)
          VALUES
            (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-1', 'Monthly', v_month::TEXT || ' ' || CASE WHEN v_month IN ('January','February','March') THEN (v_fy_year::INTEGER+1)::TEXT ELSE v_fy_year END, v_month, calc_gst_due_date('GSTR-1', v_month, v_fy_year::INT), 'Not Started'),
            (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-3B', 'Monthly', v_month::TEXT || ' ' || CASE WHEN v_month IN ('January','February','March') THEN (v_fy_year::INTEGER+1)::TEXT ELSE v_fy_year END, v_month, calc_gst_due_date('GSTR-3B', v_month, v_fy_year::INT), 'Not Started')
          ON CONFLICT (client_id, gstin, return_type, fy_label, period) DO NOTHING;
        END LOOP;
        INSERT INTO gst_tracker (client_id, fy_id, fy_label, gstin, return_type, filing_frequency, period, status, standard_due_date)
        VALUES (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-9', 'Monthly', 'Annual ' || v_fy.fy_label, 'Not Started', make_date((v_fy_year::INTEGER+1), 12, 31))
        ON CONFLICT (client_id, gstin, return_type, fy_label, period) DO NOTHING;
      ELSIF p_gst_frequency = 'Quarterly_QRMP' THEN
        FOREACH v_quarter IN ARRAY v_quarters LOOP
          INSERT INTO gst_tracker (client_id, fy_id, fy_label, gstin, return_type, filing_frequency, period, period_quarter, status, standard_due_date)
          VALUES
            (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-1', 'Quarterly_QRMP', v_quarter::TEXT || ' ' || v_fy.fy_label, v_quarter, 'Not Started', CASE v_quarter WHEN 'Q1' THEN make_date(v_fy_year::INT,7,13) WHEN 'Q2' THEN make_date(v_fy_year::INT,10,13) WHEN 'Q3' THEN make_date(v_fy_year::INT+1,1,13) WHEN 'Q4' THEN make_date(v_fy_year::INT+1,4,13) END),
            (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-3B', 'Quarterly_QRMP', v_quarter::TEXT || ' ' || v_fy.fy_label, v_quarter, 'Not Started', CASE v_quarter WHEN 'Q1' THEN make_date(v_fy_year::INT,7,22) WHEN 'Q2' THEN make_date(v_fy_year::INT,10,22) WHEN 'Q3' THEN make_date(v_fy_year::INT+1,1,22) WHEN 'Q4' THEN make_date(v_fy_year::INT+1,4,22) END)
          ON CONFLICT (client_id, gstin, return_type, fy_label, period) DO NOTHING;
        END LOOP;
        INSERT INTO gst_tracker (client_id, fy_id, fy_label, gstin, return_type, filing_frequency, period, status, standard_due_date)
        VALUES (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-9', 'Quarterly_QRMP', 'Annual ' || v_fy.fy_label, 'Not Started', make_date((v_fy_year::INTEGER+1), 12, 31))
        ON CONFLICT (client_id, gstin, return_type, fy_label, period) DO NOTHING;
      ELSIF p_gst_frequency = 'Composition' THEN
        FOREACH v_quarter IN ARRAY v_quarters LOOP
          INSERT INTO gst_tracker (client_id, fy_id, fy_label, gstin, return_type, filing_frequency, period, period_quarter, status, standard_due_date)
          VALUES (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'CMP-08', 'Composition', v_quarter::TEXT || ' ' || v_fy.fy_label, v_quarter, 'Not Started', CASE v_quarter WHEN 'Q1' THEN make_date(v_fy_year::INT,7,18) WHEN 'Q2' THEN make_date(v_fy_year::INT,10,18) WHEN 'Q3' THEN make_date(v_fy_year::INT+1,1,18) WHEN 'Q4' THEN make_date(v_fy_year::INT+1,4,18) END)
          ON CONFLICT (client_id, gstin, return_type, fy_label, period) DO NOTHING;
        END LOOP;
        INSERT INTO gst_tracker (client_id, fy_id, fy_label, gstin, return_type, filing_frequency, period, status)
        VALUES (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-4', 'Composition', 'Annual ' || v_fy.fy_label, 'Not Started')
        ON CONFLICT (client_id, gstin, return_type, fy_label, period) DO NOTHING;
      END IF;
    END IF;

    IF p_has_tan AND p_tan IS NOT NULL THEN
      INSERT INTO tds_client_config (client_id, tan, form_26q) VALUES (p_client_id, p_tan, TRUE) ON CONFLICT (client_id) DO NOTHING;
    END IF;

    -- ROC — now includes Director Report
    IF p_has_cin AND p_cin IS NOT NULL AND p_client_type IN ('Private Limited Company','Limited Company','Section 8 Company') THEN
      INSERT INTO roc_tracker (client_id, fy_id, fy_label, cin, form_name, filing_type, status, standard_due_date)
      VALUES
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'AOC-4', 'Annual', 'Not Started', (v_fy.fy_end_date + INTERVAL '6 months 29 days')::DATE),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, CASE WHEN p_client_type = 'Private Limited Company' THEN 'MGT-7A' ELSE 'MGT-7' END, 'Annual', 'Not Started', (v_fy.fy_end_date + INTERVAL '9 months')::DATE),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'ADT-1', 'Annual', 'Not Started', make_date(v_fy_year::INT+1, 10, 15)),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'DPT-3', 'Annual', 'Not Started', make_date(v_fy_year::INT+1, 6, 30)),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'MSME-1 (Apr-Sep)', 'Annual', 'Not Started', make_date(v_fy_year::INT, 10, 31)),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'MSME-1 (Oct-Mar)', 'Annual', 'Not Started', make_date(v_fy_year::INT+1, 4, 30)),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'DIR-3 KYC', 'Annual', 'Not Started', make_date(v_fy_year::INT+1, 9, 30)),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'Director Report', 'Annual', 'Not Started', (v_fy.fy_end_date + INTERVAL '6 months 29 days')::DATE)
      ON CONFLICT DO NOTHING;
    END IF;

    IF p_has_llpin AND p_llpin IS NOT NULL AND p_client_type = 'LLP' THEN
      INSERT INTO llp_tracker (client_id, fy_id, fy_label, llpin, form_name, filing_type, status, standard_due_date)
      VALUES
        (p_client_id, v_fy.id, v_fy.fy_label, p_llpin, 'Form 8',  'Annual', 'Not Started', (v_fy.fy_end_date + INTERVAL '6 months 29 days')::DATE),
        (p_client_id, v_fy.id, v_fy.fy_label, p_llpin, 'Form 11', 'Annual', 'Not Started', (v_fy.fy_end_date + INTERVAL '2 months 29 days')::DATE)
      ON CONFLICT DO NOTHING;
    END IF;

    -- FINANCIALS — new 5-document structure
    IF v_client_text IS NOT NULL AND p_client_type IN ('Private Limited Company','Public Limited Company','Section 8 Company','LLP','Partnership Firm','Proprietor') THEN
      v_fin_types := ARRAY['Audited Balance Sheet','Computation of Income','Tax Audit Report (TAR)','ITR Form','ITR Acknowledgement'];
      FOREACH v_fin_type IN ARRAY v_fin_types LOOP
        INSERT INTO financials_tracker (client_id, fy_label, doc_type, status, due_date)
        VALUES (v_client_text, v_fy.fy_label, v_fin_type, 'Not Uploaded',
          CASE v_fin_type WHEN 'Tax Audit Report (TAR)' THEN make_date(v_fy_year::INT + 1, 9, 30) ELSE make_date(v_fy_year::INT + 1, 10, 31) END)
        ON CONFLICT (client_id, fy_label, doc_type) DO NOTHING;
      END LOOP;
    END IF;

  END LOOP;
END;
$$;

-- get_sensitive_audit_logs (ref L3763-3851) — SECURITY DEFINER; calls get_app_role() + _write_read_audit() (0007)
CREATE FUNCTION public.get_sensitive_audit_logs(p_from timestamp with time zone, p_to timestamp with time zone, p_page_number integer, p_page_size integer, p_risk_tier text DEFAULT NULL::text, p_client_uuid uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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

