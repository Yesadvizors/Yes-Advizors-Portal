-- ============================================================================
--  0014_r4db_financial_year_repair_ROLLBACK.sql
--
--  TARGET : V2 / yav2-dev ONLY — ogjrwemjefvccpyjwxuo
--
--  ⚠  READ THIS BEFORE RUNNING IT.
--
--  This rollback restores CODE. It does NOT delete DATA, and that is deliberate,
--  not an oversight. See "WHAT THIS DOES NOT UNDO" at the bottom.
--
--  It is written in LEVELS. Run the least you need.
--
--    LEVEL 1  (default)  Restore the two original functions. Drop the two new
--                        ones. KEEP the unique constraints. KEEP all data.
--
--    LEVEL 2  (opt-in)   Also drop the three unique constraints added by 0014.
--
--    LEVEL 3  (NOT SHIPPED)  Delete the generated rows. There is no script for
--                        this. It is a destructive judgement call and is
--                        documented, not automated.
--
--  ---------------------------------------------------------------------------
--  WHY LEVEL 1 KEEPS THE CONSTRAINTS
--
--  The original functions end their ROC/LLP inserts with a BARE
--  `ON CONFLICT DO NOTHING` (no target). A bare clause dedupes against ANY unique
--  constraint on the table. With 0014's constraints still in place, the restored
--  original functions are therefore SAFER than they ever were in production — the
--  duplication bug is suppressed by the constraint even though the function is the
--  old one.
--
--  Dropping the constraints (Level 2) re-opens that bug. Only do it if a reviewer
--  has decided the constraints themselves are the problem.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Same project guard as the migration. Refuses to run unconfirmed.
DO $guard$
BEGIN
  IF current_setting('yav2.confirm_project', true) IS DISTINCT FROM 'ogjrwemjefvccpyjwxuo' THEN
    RAISE EXCEPTION
      E'STOP: project not confirmed.\n'
       'Run:  SET yav2.confirm_project = ''ogjrwemjefvccpyjwxuo'';\n'
       'Refusing to roll back against an unconfirmed database.';
  END IF;
END
$guard$;


-- ---------------------------------------------------------------------------
-- LEVEL 1a — restore activate_accounting_service EXACTLY as it was in 0008.
--            (Hard-coded '2025-26' ceiling and all. This is a rollback, not an
--             improvement.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_accounting_service(
  p_client_id uuid,
  p_start_fy  character varying DEFAULT '2020-21'::character varying
) RETURNS void
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

ALTER FUNCTION public.activate_accounting_service(uuid, character varying) OWNER TO postgres;


-- ---------------------------------------------------------------------------
-- LEVEL 1b — restore generate_client_compliance EXACTLY as it was in 0008.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_client_compliance(
  p_client_id           uuid,
  p_client_type         text,
  p_has_gstin           boolean DEFAULT false,
  p_gstin               text    DEFAULT NULL::text,
  p_gst_frequency       text    DEFAULT 'Monthly'::text,
  p_has_tan             boolean DEFAULT false,
  p_tan                 text    DEFAULT NULL::text,
  p_has_cin             boolean DEFAULT false,
  p_cin                 text    DEFAULT NULL::text,
  p_has_llpin           boolean DEFAULT false,
  p_llpin               text    DEFAULT NULL::text,
  p_incorporation_date  date    DEFAULT NULL::date
) RETURNS void
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
      END IF;
    END IF;

    IF p_has_tan AND p_tan IS NOT NULL THEN
      INSERT INTO tds_client_config (client_id, tan, form_26q) VALUES (p_client_id, p_tan, TRUE) ON CONFLICT (client_id) DO NOTHING;
    END IF;

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

ALTER FUNCTION public.generate_client_compliance(
  uuid, text, boolean, text, text, boolean, text, boolean, text, boolean, text, date
) OWNER TO postgres;


-- ---------------------------------------------------------------------------
-- LEVEL 1c — drop the functions 0014 introduced.
--            Order matters: the wrapper above no longer references the core.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.generate_client_compliance_core(
  uuid, text, character varying, boolean, text, text, boolean, text, boolean, text, boolean, text);

-- Rev 1.1 / 1.4 additions. Dropped in dependency order:
--   expected_backfill_start_fy -> resolve_client_start_fy -> get_unknown_incorporation_start_fy
-- The two restored functions above no longer reference any of them.
DROP FUNCTION IF EXISTS public.expected_backfill_start_fy(uuid, date);
DROP FUNCTION IF EXISTS public.resolve_client_start_fy(uuid, date);
DROP FUNCTION IF EXISTS public.get_unknown_incorporation_start_fy();

DROP FUNCTION IF EXISTS public.get_current_fy();

-- Rev 1.3 addition.
--
-- ⚠ DROPPING THIS RE-ARMS THE ROLLOVER CLIFF.
--   ensure_financial_year_horizon() is what keeps financial_years covering the
--   current FY and the next two. Without it, the table stops being self-maintaining
--   and somebody must remember to insert a new FY row by hand before 1 April — the
--   exact failure mode that produced this migration.
--
--   The SEEDED ROWS (2020-21 .. 2030-31) are NOT removed by this rollback, so the
--   system keeps working until 1 April 2031. But the mechanism that would have kept
--   it working after that is gone.
--
--   If a scheduled job has been created to call this function, DROP THE SCHEDULE
--   FIRST — otherwise it will start failing with "function does not exist".
DROP FUNCTION IF EXISTS public.ensure_financial_year_horizon(integer);


-- ---------------------------------------------------------------------------
-- PRIVILEGES ON ROLLBACK  (Rev 1.5) — read this, it is not symmetrical
--
-- 1. THE DROPPED FUNCTIONS TAKE THEIR ACLs WITH THEM.
--    An ACL in PostgreSQL is a property OF the object (pg_proc.proacl). DROP
--    FUNCTION removes the pg_proc row, and the ACL ceases to exist with it. There
--    is no orphaned grant left behind, and nothing to clean up. Verify with:
--
--      SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--      WHERE n.nspname = 'public'
--        AND proname IN ('ensure_financial_year_horizon','generate_client_compliance_core',
--                        'get_current_fy','get_unknown_incorporation_start_fy',
--                        'resolve_client_start_fy','expected_backfill_start_fy');
--      -- expect ZERO rows after this rollback
--
--    ⚠ But note what that means: if the function is ever RE-CREATED later, it is
--      created FRESH — and inherits the permissive Supabase default again
--      (anon/authenticated/service_role). The lockdown is not sticky. Any future
--      migration that re-creates these MUST re-issue the REVOKEs.
--
-- 2. THE TWO RESTORED FUNCTIONS KEEP THEIR TIGHTENED PRIVILEGES — DELIBERATELY.
--
--    generate_client_compliance() and activate_accounting_service() are RESTORED
--    above by CREATE OR REPLACE, which PRESERVES the existing ACL. So the Rev 1.5
--    hardening stays: EXECUTE for `authenticated` and `service_role`, and NOT for
--    `anon` or PUBLIC.
--
--    This is intentional and is NOT rolled back. Before 0014 those functions were
--    callable by an UNAUTHENTICATED holder of the anon key. Restoring that as part
--    of a rollback would mean deliberately re-opening a security hole in order to
--    undo a financial-year fix. The two have nothing to do with each other.
--
--    The app is unaffected: it calls both as a signed-in user.
--
--    If a reviewer decides the original permissive grants MUST be restored, it is
--    one line each — but it should be a decision, not a side effect:
--
--      -- GRANT EXECUTE ON FUNCTION public.generate_client_compliance(
--      --   uuid, text, boolean, text, text, boolean, text, boolean, text, boolean, text, date) TO anon;
--      -- GRANT EXECUTE ON FUNCTION public.activate_accounting_service(uuid, character varying) TO anon;
--
--    Left commented out on purpose.
-- ---------------------------------------------------------------------------

-- ⚠ ROLLING BACK RE-OPENS THE DATELESS-CLIENT HOLE.
--   The restored original generate_client_compliance calls get_client_start_fy()
--   directly, so a Re-sync on one of the 12 clients with no incorporation date will
--   once again derive 2020-21 and generate six earlier years of compliance. Rev 1.1
--   closed that; this rollback un-closes it. Nothing is corrupted (the inserts are
--   idempotent), but the rows are noise the controlled backfill deliberately avoided.
--   Capturing the missing incorporation dates is what makes the issue go away for good.


-- ---------------------------------------------------------------------------
-- LEVEL 2 — OPT-IN. Drop the unique constraints added by 0014.
--
-- ⚠ THIS RE-OPENS THE DUPLICATION BUG. With the original functions restored,
--   their bare `ON CONFLICT DO NOTHING` currently dedupes against these
--   constraints. Remove them and every Re-sync will duplicate ROC/LLP rows again.
--
-- Left commented out ON PURPOSE. Uncomment only if a reviewer has decided the
-- constraints themselves must go.
-- ---------------------------------------------------------------------------
-- ALTER TABLE public.roc_tracker         DROP CONSTRAINT IF EXISTS roc_tracker_client_fy_cin_form_key;
-- ALTER TABLE public.llp_tracker         DROP CONSTRAINT IF EXISTS llp_tracker_client_fy_llpin_form_key;
-- ALTER TABLE public.compliance_calendar DROP CONSTRAINT IF EXISTS compliance_calendar_client_tracker_key;

COMMIT;


-- ============================================================================
--  WHAT THIS ROLLBACK DOES **NOT** UNDO — and why
--
--  Intentionally irreversible without manual review:
--
--    1. financial_years rows (2020-21 .. 2026-27)
--       Reference/master data. Deleting them would break EVERY tracker row that
--       references fy_id, and would return the system to the state where both
--       RPCs silently generate nothing. Keeping them is strictly safer than
--       removing them. There is no scenario in which deleting these helps.
--
--    2. Generated tracker rows (income_tax, gst, tds, roc, accounting,
--       financials, compliance_calendar).
--       These are now REAL WORK ITEMS. From the moment the migration lands, a
--       Manager may open a tracker, change its status, attach a filing, or mark a
--       return filed. A blanket DELETE would destroy that work, and it cannot
--       distinguish "row nobody touched" from "row someone has been working on".
--
--       So there is NO automated delete here, by design.
--
--  If a reviewer decides the generated rows must be removed, scope them FIRST
--  with these READ-ONLY queries, and have the result signed off before anyone
--  writes a DELETE by hand:
--
--    -- How many rows would a blanket delete destroy, and has anyone touched them?
--    SELECT 'income_tax_tracker' AS t, count(*) AS rows,
--           count(*) FILTER (WHERE status <> 'Not Started') AS already_worked_on
--      FROM income_tax_tracker WHERE fy_label >= '2025-26'
--    UNION ALL SELECT 'accounting_tracker', count(*),
--           count(*) FILTER (WHERE status <> 'Not Started')
--      FROM accounting_tracker WHERE fy_label >= '2025-26'
--    UNION ALL SELECT 'gst_tracker', count(*),
--           count(*) FILTER (WHERE status <> 'Not Started')
--      FROM gst_tracker WHERE fy_label >= '2025-26'
--    UNION ALL SELECT 'tds_tracker', count(*),
--           count(*) FILTER (WHERE status <> 'Not Started')
--      FROM tds_tracker WHERE fy_label >= '2025-26'
--    UNION ALL SELECT 'roc_tracker', count(*),
--           count(*) FILTER (WHERE status <> 'Not Started')
--      FROM roc_tracker WHERE fy_label >= '2025-26';
--
--    -- Any row with a non-default status, a filing date, or an attached document
--    -- is WORK. It must not be deleted without an explicit decision.
--
--  Take a database backup before any manual deletion. Supabase point-in-time
--  restore is the real rollback for data; this file is the rollback for code.
-- ============================================================================
