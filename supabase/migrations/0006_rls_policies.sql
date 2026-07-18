-- G-2b authored migration — AUTHORED NOT APPLIED; reviewed under G-2b before G-3.
-- Purpose: enable RLS on every application table (Phase 4B: all Data API traffic is anon/authenticated).
-- DESIGN NOTE (must be reviewed): Portal V2 is an INTERNAL team tool — all authenticated staff
--   are trusted users. This migration establishes the BASELINE Phase 4B posture:
--     (a) RLS ENABLED on every app table;
--     (b) authenticated role granted row access on operational tables;
--     (c) anon has NO access (login required — matches IR-1C/IR-1D: unauthenticated app makes no data calls);
--     (d) audit_log / audit_event_contract / audit_ingestion_failures keep FORCE RLS and are NOT
--         directly writable by app roles — writes go only through the hardened writer function (0007).
-- OPEN ITEM OI-2: V1's 86 concrete CREATE POLICY bodies were NOT transcribed in this tranche
--   (they live in the reference, RLS/policy section). Per-role refinement using portal_role
--   (Admin/Manager/Executive/Staff/Viewer) is a REQUIRED follow-up before G-3 sign-off.
--   This baseline is intentionally permissive-for-authenticated and MUST be reviewed, not shipped as-is
--   for any client-facing role. Recorded in rls_coverage.md.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'team','clients','client_directors','financial_years',
    'tasks','follow_ups','documents','completed_documents','extracted_document_data',
    'client_financials','financials_tracker','claude_usage_log',
    'compliance_calendar','gst_tracker','income_tax_tracker','tds_tracker','roc_tracker',
    'notice_tracker','audit_tracker','accounting_tracker'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    -- Baseline: authenticated staff may read/write operational rows; anon gets nothing.
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t||'_authenticated_all', t);
  END LOOP;
END $$;

-- Audit tables: FORCE RLS already set (0005). No app-role DML policy is created here —
-- inserts occur ONLY via the SECURITY DEFINER writer function (0007). Reads of sensitive audit
-- data occur ONLY via the get_sensitive_audit_logs RPC (0007), never by direct table select.
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_event_contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_ingestion_failures ENABLE ROW LEVEL SECURITY;
-- (No permissive policies on audit_* — default-deny under RLS; writer/reader functions bypass via SECURITY DEFINER.)
