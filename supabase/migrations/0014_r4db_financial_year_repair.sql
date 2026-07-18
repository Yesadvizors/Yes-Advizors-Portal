-- ============================================================================
--  0014_r4db_financial_year_repair.sql
--
--  YAV2 — R4-DB — Financial-year and compliance-generation repair.
--
--  TARGET   : V2 / yav2-dev ONLY   — Supabase project ref ogjrwemjefvccpyjwxuo
--  FRONTEND : ui/redesign-v1 @ 67ad8b6aa3ecc9b0f8cf7b26718abaf984f68a02
--  NUMBER   : 0014.  0012 = secure-docs (already executed live).
--                    0013 = RESERVED for R3 (client-ID sequence). NOT USED HERE.
--
--  ⚠  DO NOT RUN THIS AGAINST ANY OTHER PROJECT.
--     In particular NOT zcszesuvjrryxtigjglt (V1 / Production).
--     The migration REFUSES to start unless you explicitly confirm the project:
--
--         SET yav2.confirm_project = 'ogjrwemjefvccpyjwxuo';
--
--     Without that, section 0 raises and nothing runs. That is deliberate.
--
--  ---------------------------------------------------------------------------
--  WHAT IS BROKEN (from the Step-1 read-only evidence)
--
--    * financial_years is EMPTY. Both RPCs loop over it, so they iterate zero
--      times, insert nothing, raise nothing, and RETURN SUCCESS. Every tracker
--      table is empty. Nothing has ever been generated for anybody.
--    * Both RPCs additionally cap at a hard-coded '2025-26'. The current FY is
--      2026-27, so even with rows present they would skip the current year.
--    * roc_tracker / llp_tracker / compliance_calendar have NO business unique
--      key, and the ROC/LLP inserts use a BARE `ON CONFLICT DO NOTHING` with no
--      target — which dedupes nothing. Every re-run would duplicate.
--    * tds_tracker is never populated at all; only tds_client_config is.
--
--  WHAT THIS MIGRATION DOES
--    1  Seeds financial_years 2020-21 .. 2026-27.
--    2  Adds get_current_fy(), governed by financial_years, FAIL-CLOSED.
--    3  Adds the three missing unique keys (after proving no duplicates exist).
--    4  Rewrites both RPCs: no hard-coded ceiling, targeted ON CONFLICT, and an
--       explicit failure if they would otherwise touch zero financial years.
--    5  Generates real tds_tracker rows, driven by tds_client_config.
--    6  Backfills the 13 active clients from FY 2025-26 to the current FY.
--
--  TRANSACTION: the whole thing is ONE transaction. PostgreSQL DDL is
--  transactional, so this either lands completely or not at all. There is no
--  half-migrated state to clean up.
--
--  IDEMPOTENT: safe to run twice. Seeds upsert, constraints are guarded by
--  IF NOT EXISTS, functions are CREATE OR REPLACE, every backfill INSERT carries
--  a TARGETED ON CONFLICT. A second run should report zero new rows.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------------
-- SECTION 0 — PRECONDITIONS. Fail closed. Nothing below runs unless all pass.
-- ---------------------------------------------------------------------------
DO $precheck$
DECLARE
  v_confirm   text := current_setting('yav2.confirm_project', true);
  v_expect    text := current_setting('yav2.expected_active_clients', true);
  v_actual    int;
  v_dups      int;
  v_missing   text;
BEGIN
  ----------------------------------------------------------------- 0.1 project
  IF v_confirm IS DISTINCT FROM 'ogjrwemjefvccpyjwxuo' THEN
    RAISE EXCEPTION
      E'STOP: project not confirmed.\n'
       'This migration is for V2 / yav2-dev (ogjrwemjefvccpyjwxuo) ONLY.\n'
       'Before running it, execute:\n'
       '    SET yav2.confirm_project = ''ogjrwemjefvccpyjwxuo'';\n'
       'Refusing to run against an unconfirmed database.';
  END IF;

  ----------------------------------------------------------------- 0.2 version
  IF current_setting('server_version_num')::int < 130000 THEN
    RAISE EXCEPTION 'STOP: PostgreSQL 13+ required, found %', version();
  END IF;

  ------------------------------------------------------- 0.3 relations present
  SELECT string_agg(t, ', ') INTO v_missing
  FROM unnest(ARRAY['financial_years','clients','gst_tracker','income_tax_tracker',
                    'tds_tracker','tds_client_config','roc_tracker','llp_tracker',
                    'accounting_tracker','financials_tracker','compliance_calendar']) AS t
  WHERE to_regclass('public.' || t) IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: expected table(s) missing: %', v_missing;
  END IF;

  ------------------------------------------------------- 0.4 functions present
  SELECT string_agg(f, ', ') INTO v_missing
  FROM unnest(ARRAY['get_client_start_fy','calc_gst_due_date',
                    'generate_client_compliance','activate_accounting_service']) AS f
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = f);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: expected function(s) missing: %', v_missing;
  END IF;

  ---------------------------------- 0.5 the unique keys we RELY on must exist.
  -- The rewritten functions use targeted ON CONFLICT against these. A targeted
  -- ON CONFLICT with no matching constraint is a hard ERROR, not a silent
  -- duplicate — so if one of these is absent, generation would start throwing
  -- the moment financial_years has rows in it. Check before, not after.
  SELECT string_agg(c, ', ') INTO v_missing
  FROM unnest(ARRAY['income_tax_tracker_client_id_fy_label_key',
                    'gst_tracker_client_id_gstin_return_type_fy_label_period_key',
                    'accounting_tracker_client_id_fy_label_month_key',
                    'tds_tracker_client_id_form_type_quarter_fy_label_key',
                    'tds_client_config_client_id_key',
                    'financials_tracker_client_id_fy_label_doc_type_key']) AS c
  WHERE NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c
                      AND connamespace = 'public'::regnamespace);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: required unique constraint(s) missing: %', v_missing;
  END IF;

  -------------------------------------------- 0.6 NO DUPLICATES may exist yet.
  -- We are about to add unique keys to roc_tracker, llp_tracker and
  -- compliance_calendar. If duplicates are already present the ALTER would fail
  -- anyway — but it would fail halfway, with a message about an index. Better to
  -- say plainly what is wrong and stop. We DO NOT delete or merge duplicates:
  -- that is a data-destructive judgement call for a human, not for a migration.
  SELECT count(*) INTO v_dups FROM (
    SELECT 1 FROM public.roc_tracker
     GROUP BY client_id, fy_label, cin, form_name HAVING count(*) > 1) d;
  IF v_dups > 0 THEN
    RAISE EXCEPTION
      E'STOP: roc_tracker already contains % duplicate group(s) on (client_id, fy_label, cin, form_name).\n'
       'The unique key cannot be added until they are resolved.\n'
       'This migration will NOT delete or merge them. Escalate for manual review.', v_dups;
  END IF;

  SELECT count(*) INTO v_dups FROM (
    SELECT 1 FROM public.llp_tracker
     GROUP BY client_id, fy_label, llpin, form_name HAVING count(*) > 1) d;
  IF v_dups > 0 THEN
    RAISE EXCEPTION
      E'STOP: llp_tracker already contains % duplicate group(s). Escalate for manual review.\n'
       'This migration will NOT delete or merge them.', v_dups;
  END IF;

  SELECT count(*) INTO v_dups FROM (
    SELECT 1 FROM public.compliance_calendar
     WHERE compliance_tracker_id IS NOT NULL
     GROUP BY client_id, compliance_tracker_id HAVING count(*) > 1) d;
  IF v_dups > 0 THEN
    RAISE EXCEPTION
      E'STOP: compliance_calendar already contains % duplicate group(s) on (client_id, compliance_tracker_id).\n'
       'This migration will NOT delete or merge them. Escalate for manual review.', v_dups;
  END IF;

  -------------------------------------------- 0.7 roles required by SECTION 6b.
  -- Section 6b revokes EXECUTE from anon / authenticated / service_role with EXPLICIT
  -- statements (deliberately, so the privilege change is readable in the diff rather
  -- than hidden inside dynamic SQL). An explicit REVOKE against a role that does not
  -- exist is an error — so assert here, and fail with a sentence that explains itself,
  -- rather than aborting two hundred lines later with "role does not exist".
  SELECT string_agg(r, ', ') INTO v_missing
  FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION
      E'STOP: expected Supabase role(s) missing: %.\n'
       'Section 6b must revoke EXECUTE from them. Either this is not a Supabase database,\n'
       'or the roles have been renamed. Do not proceed until the privilege model is understood.',
      v_missing;
  END IF;

  ------------------------------------ 0.8 optional fingerprint of the database.
  -- Step-1 evidence recorded 13 active clients. If this is a different database,
  -- the count will almost certainly differ. Set the GUC to enforce it; leave it
  -- unset to skip. It is advisory precisely because a legitimate onboarding
  -- between verification and execution would change the number.
  SELECT count(*) INTO v_actual FROM public.clients
   WHERE status = 'Active' AND coalesce(is_draft, false) = false;

  IF v_expect IS NOT NULL AND v_actual <> v_expect::int THEN
    RAISE EXCEPTION
      E'STOP: expected % active clients, found %.\n'
       'Either this is not the database that was verified, or the data changed since.\n'
       'Re-run the Step-1 read-only verification before proceeding.', v_expect, v_actual;
  END IF;

  RAISE NOTICE 'Preconditions passed. Active clients: %', v_actual;
END
$precheck$;


-- ---------------------------------------------------------------------------
-- SECTION 1 — SEED financial_years  (2020-21 .. 2030-31)      [Rev 1.3]
--
-- This is the root cause. The table is EMPTY, so both RPCs loop zero times and
-- return success having done nothing. Everything else in this migration is
-- worthless without these rows.
--
-- Rev 1.3 extends the seed to 2030-31. Rev 1.2 stopped at 2026-27, which merely
-- moved the cliff: on 1 April 2027 get_current_fy() would have derived 2027-28
-- from the date, found no such row, and raised — breaking every RPC on the day
-- the financial year turned. A five-year buffer plus the horizon function below
-- means the cliff does not exist.
--
-- Idempotent: upsert on the existing UNIQUE (fy_label). The DO UPDATE is a
-- one-time NORMALISATION — if a row already exists with wrong dates, this fixes
-- it. (The recurring horizon function deliberately does NOT do this; see below.)
-- ---------------------------------------------------------------------------
INSERT INTO public.financial_years
  (fy_label, fy_start_date, fy_end_date, assessment_year, is_active, is_current)
SELECT
  y::text || '-' || lpad(((y + 1) % 100)::text, 2, '0')          AS fy_label,
  make_date(y,     4,  1)                                        AS fy_start_date,
  make_date(y + 1, 3, 31)                                        AS fy_end_date,
  (y + 1)::text || '-' || lpad(((y + 2) % 100)::text, 2, '0')    AS assessment_year,
  true                                                           AS is_active,
  false                                                          AS is_current   -- set by ensure_financial_year_horizon(), by DATE
FROM generate_series(2020, 2030) AS y
ON CONFLICT (fy_label) DO UPDATE SET
  fy_start_date   = EXCLUDED.fy_start_date,
  fy_end_date     = EXCLUDED.fy_end_date,
  assessment_year = EXCLUDED.assessment_year,
  is_active       = true;

-- NOTE: is_current is NOT set here. It is set — from the DATE — by
-- ensure_financial_year_horizon(), which is defined in Section 1b and invoked in
-- Section 1c. Hard-coding '2026-27' as current would reintroduce exactly the rot
-- this migration exists to remove: it would be wrong again on 1 April 2027.


-- ---------------------------------------------------------------------------
-- SECTION 1b — ensure_financial_year_horizon()                 [Rev 1.3]
--
-- THE POINT: nobody should have to remember to add a financial year.
--
-- Seeding a fixed range does not solve the rollover problem; it postpones it. On
-- 1 April 2027 the date says FY 2027-28, and if that row does not exist,
-- get_current_fy() raises and compliance generation stops dead — on the busiest
-- possible day. This function is what makes the table self-maintaining.
--
-- CONTRACT
--   * Derives the Indian FY from the IST date. It does NOT call get_current_fy(),
--     because get_current_fy() raises when no row covers today — which is exactly
--     the situation this function exists to repair. It must be able to bootstrap
--     an empty table.
--   * Inserts the current FY and the next p_horizon FYs if they are missing.
--   * Explicit ON CONFLICT (fy_label) DO NOTHING — it ADDS; it does not rewrite.
--   * Marks exactly ONE date-current row as is_current.
--   * Raises on overlapping / ambiguous rows.
--   * NEVER deletes a financial_years row. There is no DELETE in this function.
--   * Safe to run repeatedly — a second call inserts 0 rows and changes nothing.
--
-- WHY "DO NOTHING" AND NOT "DO UPDATE":
--   This function is intended to run on a schedule, unattended. A recurring job
--   that silently REWRITES financial-year dates is a job that can silently corrupt
--   every due date derived from them. So it only ever ADDS missing years; if an
--   EXISTING row inside its window is malformed, it RAISES and leaves the row
--   alone for a human. Loud beats clever.
--
-- RETURNS: the number of FY rows inserted (0 on a steady-state run) — useful as a
-- cron log line that says plainly whether anything happened.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_financial_year_horizon(p_horizon integer DEFAULT 2)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_today      date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_cur_year   int;
  v_inserted   int := 0;
  v_bad        int;
  v_overlaps   int;
  v_n_current  int;
  v_label      text;
BEGIN
  IF p_horizon IS NULL OR p_horizon < 1 THEN
    RAISE EXCEPTION 'ensure_financial_year_horizon: horizon must be >= 1, got %', p_horizon
      USING ERRCODE = 'check_violation';
  END IF;

  -- The Indian FY starts 1 April. Jan-Mar belong to the FY that began in the
  -- PREVIOUS calendar year. Derived here, from the date, with no literal anywhere.
  v_cur_year := CASE
                  WHEN EXTRACT(MONTH FROM v_today) >= 4 THEN EXTRACT(YEAR FROM v_today)::int
                  ELSE EXTRACT(YEAR FROM v_today)::int - 1
                END;

  -- 1. Add the current FY and the next p_horizon FYs, if absent.
  WITH wanted AS (
    SELECT y,
           y::text || '-' || lpad(((y + 1) % 100)::text, 2, '0')       AS fy_label,
           make_date(y,     4,  1)                                     AS fy_start_date,
           make_date(y + 1, 3, 31)                                     AS fy_end_date,
           (y + 1)::text || '-' || lpad(((y + 2) % 100)::text, 2, '0') AS assessment_year
    FROM generate_series(v_cur_year, v_cur_year + p_horizon) AS y
  ), ins AS (
    INSERT INTO public.financial_years
      (fy_label, fy_start_date, fy_end_date, assessment_year, is_active, is_current)
    SELECT w.fy_label, w.fy_start_date, w.fy_end_date, w.assessment_year, true, false
    FROM wanted w
    ON CONFLICT (fy_label) DO NOTHING       -- ADD only. Never rewrite. Never delete.
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  -- 2. Any EXISTING row inside the window must be correct. We do not repair it
  --    silently — a scheduled job that rewrites FY dates could corrupt every due
  --    date derived from them. Raise, and leave it for a human.
  SELECT count(*) INTO v_bad
  FROM public.financial_years f
  WHERE left(f.fy_label, 4) ~ '^\d{4}$'
    AND left(f.fy_label, 4)::int BETWEEN v_cur_year AND v_cur_year + p_horizon
    AND ( f.fy_start_date   <> make_date(left(f.fy_label, 4)::int,     4,  1)
       OR f.fy_end_date     <> make_date(left(f.fy_label, 4)::int + 1, 3, 31)
       OR f.assessment_year IS DISTINCT FROM
            ((left(f.fy_label, 4)::int + 1)::text || '-' ||
             lpad(((left(f.fy_label, 4)::int + 2) % 100)::text, 2, '0')) );

  IF v_bad > 0 THEN
    RAISE EXCEPTION
      E'ensure_financial_year_horizon: % existing financial_years row(s) in the horizon window have incorrect dates or assessment years.\n'
       'They have NOT been modified. A scheduled job must not silently rewrite financial-year data. Fix them under review.',
      v_bad
      USING ERRCODE = 'data_exception';
  END IF;

  -- 3. No two ACTIVE financial years may overlap in time. If they do, "the current
  --    FY" is ambiguous, and every downstream answer is a coin toss.
  SELECT count(*) INTO v_overlaps
  FROM public.financial_years a
  JOIN public.financial_years b
    ON a.id < b.id
   AND coalesce(a.is_active, true)
   AND coalesce(b.is_active, true)
   AND a.fy_start_date <= b.fy_end_date
   AND b.fy_start_date <= a.fy_end_date;

  IF v_overlaps > 0 THEN
    RAISE EXCEPTION
      'ensure_financial_year_horizon: % overlapping financial-year date range(s). The current FY would be ambiguous.',
      v_overlaps
      USING ERRCODE = 'cardinality_violation';
  END IF;

  -- 4. Exactly one row is current, decided by the DATE — never by a hand-set flag.
  UPDATE public.financial_years
  SET is_current = (coalesce(is_active, true)
                    AND v_today BETWEEN fy_start_date AND fy_end_date)
  WHERE is_current IS DISTINCT FROM (coalesce(is_active, true)
                    AND v_today BETWEEN fy_start_date AND fy_end_date);

  SELECT count(*) INTO v_n_current FROM public.financial_years WHERE is_current;

  IF v_n_current = 0 THEN
    RAISE EXCEPTION
      'ensure_financial_year_horizon: no active financial year covers % after seeding. This should be impossible.',
      v_today
      USING ERRCODE = 'no_data_found';
  ELSIF v_n_current > 1 THEN
    RAISE EXCEPTION
      'ensure_financial_year_horizon: % rows claim to be current for %. Ranges are ambiguous.',
      v_n_current, v_today
      USING ERRCODE = 'cardinality_violation';
  END IF;

  SELECT fy_label INTO v_label FROM public.financial_years WHERE is_current;
  RAISE NOTICE 'ensure_financial_year_horizon: current FY %, % row(s) inserted, horizon +% year(s).',
    v_label, v_inserted, p_horizon;

  RETURN v_inserted;
END;
$$;

ALTER FUNCTION public.ensure_financial_year_horizon(integer) OWNER TO postgres;

COMMENT ON FUNCTION public.ensure_financial_year_horizon(integer) IS
  'R4-DB: keeps financial_years covering the current FY and the next N (default 2). Derives the FY from the IST date; INSERTs missing rows ON CONFLICT (fy_label) DO NOTHING; sets exactly one is_current by date; raises on malformed or overlapping rows; NEVER deletes. Idempotent - safe to run on a schedule. Run before 1 April each year (or daily).';


-- ---------------------------------------------------------------------------
-- SECTION 1c — invoke it once, now.
--
-- Given Section 1 has already seeded to 2030-31, this inserts ZERO rows — which
-- is exactly the point: it proves the function is idempotent, and it is what sets
-- is_current from the date and validates the whole table.
-- ---------------------------------------------------------------------------
DO $fy_check$
DECLARE
  v_added int;
  v_cur   text;
  v_max   text;
BEGIN
  v_added := public.ensure_financial_year_horizon(2);

  SELECT fy_label   INTO v_cur FROM public.financial_years WHERE is_current;
  SELECT max(fy_label) INTO v_max FROM public.financial_years;

  RAISE NOTICE 'financial_years seeded. Current FY: %. Horizon extends to: %. Rows added by ensure(): %.',
    v_cur, v_max, v_added;
END
$fy_check$;


-- ---------------------------------------------------------------------------
-- SECTION 2 — get_current_fy()
--
-- The single governed source of "what year is it". Both RPCs now ask this
-- instead of carrying a literal.
--
-- Derived from the DATE, cross-checked against financial_years. It does not read
-- the is_current flag, and that is deliberate: a flag has to be remembered every
-- April, and forgetting it is exactly the class of failure that produced this
-- migration. The date cannot be forgotten. is_current is still maintained (it is
-- useful to query), and the post-verification script flags any drift between the
-- two.
--
-- FAIL-CLOSED: raises if zero rows match, and raises if more than one does.
-- It never guesses.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_fy()
RETURNS character varying
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_n     int;
  v_fy    character varying(10);
BEGIN
  SELECT count(*) INTO v_n
  FROM public.financial_years
  WHERE coalesce(is_active, true) AND v_today BETWEEN fy_start_date AND fy_end_date;

  IF v_n = 0 THEN
    RAISE EXCEPTION
      'No current financial year: financial_years has no active row covering %. Seed it before generating compliance.',
      v_today
      USING ERRCODE = 'no_data_found';
  ELSIF v_n > 1 THEN
    RAISE EXCEPTION
      'Ambiguous current financial year: % active rows cover %. Their date ranges overlap.',
      v_n, v_today
      USING ERRCODE = 'cardinality_violation';
  END IF;

  SELECT fy_label INTO v_fy
  FROM public.financial_years
  WHERE coalesce(is_active, true) AND v_today BETWEEN fy_start_date AND fy_end_date;

  RETURN v_fy;
END;
$$;

ALTER FUNCTION public.get_current_fy() OWNER TO postgres;
COMMENT ON FUNCTION public.get_current_fy() IS
  'R4-DB: the current Indian FY, governed by financial_years and derived from the IST date. Raises if zero or multiple rows match. Replaces the hard-coded 2025-26 ceiling.';


-- ---------------------------------------------------------------------------
-- SECTION 2b — THE START-FY POLICY  (Rev 1.1)
--
-- Rev 1.0 backfilled existing clients from 2025-26, but left a hole: a later
-- "Re-sync Compliance" on one of the 12 clients with NO incorporation date would
-- call get_client_start_fy(NULL) -> '2020-21' and quietly generate the six earlier
-- years the backfill had deliberately refused to invent. The controlled decision
-- would have been undone by a button.
--
-- The hole existed on BOTH paths, not one:
--
--   compliance : generate_client_compliance -> get_client_start_fy(NULL) -> 2020-21
--   accounting : the FRONTEND computes the start FY and passes it as an argument.
--                accountingStartFy() in src/lib/compliance.js returns MIN_FY
--                ('2020-21') for a dateless client, so activate_accounting_service
--                was being HANDED 2020-21 directly.
--
-- Fixing only the RPC would therefore have fixed only half of it, and accounting
-- would still have crept back to 2020-21. So the rule is enforced in the DATABASE,
-- which is the only place both paths pass through. The frontend may pass whatever
-- it likes; it cannot reach further back than policy allows.
--
-- THE RULE, in one place:
--
--   incorporation date KNOWN    -> FY of that date, floored at 2020-21   (unchanged)
--   incorporation date UNKNOWN  -> FY 2025-26, the earliest year for which
--                                  an engagement actually exists.
--
-- 2025-26 is a POLICY ANCHOR, not a "current year". It does not rot: it is a fixed
-- historical fact about when the firm began acting for these clients. It lives in
-- exactly one function so it cannot drift.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_unknown_incorporation_start_fy()
RETURNS character varying
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$ SELECT '2025-26'::character varying $$;

COMMENT ON FUNCTION public.get_unknown_incorporation_start_fy() IS
  'R4-DB policy anchor: the start FY used when a client has NO incorporation date. The earliest FY for which the firm holds an engagement. NOT a current-year value and must not be updated annually.';

ALTER FUNCTION public.get_unknown_incorporation_start_fy() OWNER TO postgres;


-- The single resolver. Every caller goes through this; nobody derives a start FY
-- on their own again.
CREATE OR REPLACE FUNCTION public.resolve_client_start_fy(
  p_client_id          uuid,
  p_incorporation_date date DEFAULT NULL
) RETURNS character varying
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_doi date := p_incorporation_date;
BEGIN
  -- Trust the stored row if the caller did not supply a date. The client row is the
  -- authority; an argument is only a hint.
  IF v_doi IS NULL THEN
    SELECT date_of_incorporation INTO v_doi FROM clients WHERE id = p_client_id;
  END IF;

  IF v_doi IS NULL THEN
    RETURN get_unknown_incorporation_start_fy();     -- 2025-26. Never 2020-21.
  END IF;

  RETURN get_client_start_fy(v_doi);                 -- unchanged: FY of date, floor 2020-21
END;
$$;

COMMENT ON FUNCTION public.resolve_client_start_fy(uuid, date) IS
  'R4-DB: the ONLY place a client start FY is decided. Known incorporation date -> its FY (floored 2020-21). Unknown -> get_unknown_incorporation_start_fy() (2025-26).';

ALTER FUNCTION public.resolve_client_start_fy(uuid, date) OWNER TO postgres;


-- ---------------------------------------------------------------------------
-- expected_backfill_start_fy()                                    [Rev 1.4]
--
-- The FY from which a given client SHOULD have records after the controlled
-- backfill. It is exactly what the backfill actually does:
--
--     core is called with p_start_fy = '2025-26'
--     core clamps:  v_start := GREATEST(p_start_fy, resolve_client_start_fy(...))
--
-- so the effective start is GREATEST(backfill floor, client policy start).
--
-- WHY THIS FUNCTION EXISTS (and is not four copies of an expression):
--
--   Rev 1.3's post-conditions asserted that EVERY active client must have 12
--   accounting months from a FIXED '2025-26'. But generation does not work that
--   way: a client incorporated inside FY 2026-27 is legitimately clamped to
--   2026-27 and has NO 2025-26 rows at all. The verification therefore disagreed
--   with the thing it was verifying, and would have aborted a perfectly correct
--   migration. (That was recorded as STOP S10; this function removes it.)
--
--   The rule is now stated ONCE and used by the migration post-conditions AND the
--   post-verification script, so the two cannot drift apart again.
--
-- No new literal: the floor IS get_unknown_incorporation_start_fy().
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expected_backfill_start_fy(
  p_client_id          uuid,
  p_incorporation_date date DEFAULT NULL
) RETURNS character varying
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT GREATEST(
           public.get_unknown_incorporation_start_fy(),                    -- the backfill floor: 2025-26
           public.resolve_client_start_fy(p_client_id, p_incorporation_date)
         )::character varying
$$;

COMMENT ON FUNCTION public.expected_backfill_start_fy(uuid, date) IS
  'R4-DB: the FY from which a client SHOULD have records after the controlled backfill = GREATEST(backfill floor, resolve_client_start_fy()). Mirrors the clamp inside generate_client_compliance_core. Used by the migration post-conditions and by post-verification so they cannot disagree.';

ALTER FUNCTION public.expected_backfill_start_fy(uuid, date) OWNER TO postgres;


-- ---------------------------------------------------------------------------
-- SECTION 3 — MISSING UNIQUE KEYS
--
-- Without these, a targeted ON CONFLICT is impossible and every re-run of
-- generation duplicates. Section 0.6 has already proven no duplicates exist.
--
-- NOTE on NULLs: these are NULLS-DISTINCT (the default), so a row with a NULL
-- cin/llpin/compliance_tracker_id is not deduped against another. That is
-- correct here — those rows are only ever created WITH the value present (the
-- functions guard on IS NOT NULL), and compliance_calendar legitimately holds
-- rows with no tracker link. Post-verification counts any NULL-key rows so the
-- assumption is checked rather than assumed.
-- ---------------------------------------------------------------------------
DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'roc_tracker_client_fy_cin_form_key'
                    AND connamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.roc_tracker
      ADD CONSTRAINT roc_tracker_client_fy_cin_form_key
      UNIQUE (client_id, fy_label, cin, form_name);
    RAISE NOTICE 'Added roc_tracker_client_fy_cin_form_key';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'llp_tracker_client_fy_llpin_form_key'
                    AND connamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.llp_tracker
      ADD CONSTRAINT llp_tracker_client_fy_llpin_form_key
      UNIQUE (client_id, fy_label, llpin, form_name);
    RAISE NOTICE 'Added llp_tracker_client_fy_llpin_form_key';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'compliance_calendar_client_tracker_key'
                    AND connamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.compliance_calendar
      ADD CONSTRAINT compliance_calendar_client_tracker_key
      UNIQUE (client_id, compliance_tracker_id);
    RAISE NOTICE 'Added compliance_calendar_client_tracker_key';
  END IF;
END
$constraints$;


-- ---------------------------------------------------------------------------
-- SECTION 4 — activate_accounting_service
--
-- BEFORE: WHERE fy_label >= p_start_fy AND fy_label <= '2025-26'
--         An inverted or empty range silently produced nothing, and returned
--         success.
--
-- AFTER : ceiling from get_current_fy(); an empty FY range is an EXPLICIT ERROR.
--
-- Signature, argument names and default are UNCHANGED — the frontend calls this
-- with named arguments, so any change to a name would break the call.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_accounting_service(
  p_client_id uuid,
  p_start_fy  character varying DEFAULT '2020-21'::character varying
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_fy       RECORD;
  v_month    month_enum;
  v_months   month_enum[] := ARRAY['April','May','June','July','August','September',
                                   'October','November','December','January','February','March']::month_enum[];
  v_fy_year  TEXT;
  v_current  character varying(10);
  v_policy   character varying(10);
  v_start    character varying(10);
  v_fy_count int := 0;
BEGIN
  v_current := get_current_fy();          -- raises if zero/ambiguous

  -- Rev 1.1 — CLAMP. The caller does not get to decide how far back we go.
  --
  -- The frontend computes the start FY itself (accountingStartFy in
  -- src/lib/compliance.js) and passes it in. For a client with no incorporation
  -- date it passes '2020-21', which would have generated six years of accounting
  -- for a client we did not act for — the exact thing the controlled backfill
  -- refused to do. GREATEST() means a caller may ask for a LATER start, never an
  -- earlier one than policy permits.
  v_policy := resolve_client_start_fy(p_client_id, NULL);
  v_start  := GREATEST(coalesce(p_start_fy, v_policy), v_policy);

  IF v_start > v_current THEN
    RAISE EXCEPTION
      'activate_accounting_service: start FY (%) is after the current FY (%). Nothing would be generated.',
      v_start, v_current
      USING ERRCODE = 'check_violation';
  END IF;

  FOR v_fy IN
    SELECT * FROM financial_years
    WHERE fy_label >= v_start
      AND fy_label <= v_current
      AND coalesce(is_active, true)
    ORDER BY fy_label
  LOOP
    v_fy_count := v_fy_count + 1;
    v_fy_year  := split_part(v_fy.fy_label, '-', 1);

    FOREACH v_month IN ARRAY v_months LOOP
      INSERT INTO accounting_tracker (client_id, fy_id, fy_label, month, period_label, status)
      VALUES (
        p_client_id, v_fy.id, v_fy.fy_label, v_month,
        v_month::TEXT || ' ' || CASE WHEN v_month IN ('January','February','March')
          THEN (v_fy_year::INTEGER + 1)::TEXT ELSE v_fy_year END,
        'Not Started'
      )
      ON CONFLICT (client_id, fy_label, month) DO NOTHING;
    END LOOP;
  END LOOP;

  -- The whole point of this migration: never again succeed having matched nothing.
  IF v_fy_count = 0 THEN
    RAISE EXCEPTION
      'activate_accounting_service: no active financial_years rows between % and %. Nothing was generated.',
      v_start, v_current
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

ALTER FUNCTION public.activate_accounting_service(uuid, character varying) OWNER TO postgres;


-- ---------------------------------------------------------------------------
-- SECTION 5 — generate_client_compliance_core
--
-- New. Holds the generation logic and takes the start FY EXPLICITLY.
--
-- Why it exists: the migration must backfill existing clients from 2025-26,
-- while normal onboarding must keep deriving the start FY from the incorporation
-- date. Rather than copy the logic into the backfill (where it would drift out of
-- step within a release), the logic lives here once, and both callers pass their
-- own start FY.
--
-- Changes from the original body:
--   * ceiling is get_current_fy(), not a literal
--   * ROC and LLP inserts now use a TARGETED ON CONFLICT — the bare
--     `ON CONFLICT DO NOTHING` deduped nothing and duplicated on every run
--   * tds_tracker rows are now actually generated (they never were)
--   * an empty FY range is an explicit error, not a silent success
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_client_compliance_core(
  p_client_id     uuid,
  p_client_type   text,
  p_start_fy      character varying,
  p_has_gstin     boolean DEFAULT false,
  p_gstin         text    DEFAULT NULL,
  p_gst_frequency text    DEFAULT 'Monthly',
  p_has_tan       boolean DEFAULT false,
  p_tan           text    DEFAULT NULL,
  p_has_cin       boolean DEFAULT false,
  p_cin           text    DEFAULT NULL,
  p_has_llpin     boolean DEFAULT false,
  p_llpin         text    DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_current    character varying(10);
  v_fy         RECORD;
  v_month      month_enum;
  v_months     month_enum[] := ARRAY['April','May','June','July','August','September',
                                     'October','November','December','January','February','March']::month_enum[];
  v_quarter    quarter_enum;
  v_quarters   quarter_enum[] := ARRAY['Q1','Q2','Q3','Q4']::quarter_enum[];
  v_fy_year    TEXT;
  v_client_text TEXT;
  v_fin_type   TEXT;
  v_fin_types  TEXT[];
  v_fy_count   int := 0;
  v_policy     character varying(10);
  v_start      character varying(10);
  v_form       tds_form_enum;
  v_forms      tds_form_enum[];
  v_due        date;
BEGIN
  v_current := get_current_fy();          -- raises if zero/ambiguous

  -- Rev 1.1 — CLAMP here too, so there is NO path to an earlier start FY than
  -- policy allows: not the wrapper, not the backfill, not a direct call from a
  -- future script. GREATEST() permits a later start, never an earlier one.
  v_policy := resolve_client_start_fy(p_client_id, NULL);
  v_start  := GREATEST(coalesce(p_start_fy, v_policy), v_policy);

  IF v_start > v_current THEN
    RAISE EXCEPTION
      'generate_client_compliance: start FY (%) is after the current FY (%). Nothing would be generated.',
      v_start, v_current
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT client_id INTO v_client_text FROM clients WHERE id = p_client_id;

  FOR v_fy IN
    SELECT * FROM financial_years
    WHERE fy_label >= v_start
      AND fy_label <= v_current
      AND coalesce(is_active, true)
    ORDER BY fy_label
  LOOP
    v_fy_count := v_fy_count + 1;
    v_fy_year  := split_part(v_fy.fy_label, '-', 1);

    ----------------------------------------------------------------- INCOME TAX
    INSERT INTO income_tax_tracker (client_id, fy_id, fy_label, assessment_year, standard_due_date, status)
    VALUES (p_client_id, v_fy.id, v_fy.fy_label, v_fy.assessment_year,
      CASE WHEN p_client_type IN ('Private Limited Company','Limited Company','LLP')
           THEN (v_fy.fy_end_date + INTERVAL '7 months')::DATE
           ELSE (v_fy.fy_end_date + INTERVAL '4 months')::DATE END,
      'Not Started')
    ON CONFLICT (client_id, fy_label) DO NOTHING;

    ------------------------------------------------------------------------ GST
    IF p_has_gstin AND p_gstin IS NOT NULL THEN
      IF p_gst_frequency = 'Monthly' THEN
        FOREACH v_month IN ARRAY v_months LOOP
          INSERT INTO gst_tracker (client_id, fy_id, fy_label, gstin, return_type, filing_frequency,
                                   period, period_month, standard_due_date, status)
          VALUES
            (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-1', 'Monthly',
             v_month::TEXT || ' ' || CASE WHEN v_month IN ('January','February','March')
               THEN (v_fy_year::INTEGER + 1)::TEXT ELSE v_fy_year END,
             v_month, calc_gst_due_date('GSTR-1', v_month, v_fy_year::INT), 'Not Started'),
            (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-3B', 'Monthly',
             v_month::TEXT || ' ' || CASE WHEN v_month IN ('January','February','March')
               THEN (v_fy_year::INTEGER + 1)::TEXT ELSE v_fy_year END,
             v_month, calc_gst_due_date('GSTR-3B', v_month, v_fy_year::INT), 'Not Started')
          ON CONFLICT (client_id, gstin, return_type, fy_label, period) DO NOTHING;
        END LOOP;

        INSERT INTO gst_tracker (client_id, fy_id, fy_label, gstin, return_type, filing_frequency,
                                 period, status, standard_due_date)
        VALUES (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-9', 'Monthly',
                'Annual ' || v_fy.fy_label, 'Not Started', make_date((v_fy_year::INTEGER + 1), 12, 31))
        ON CONFLICT (client_id, gstin, return_type, fy_label, period) DO NOTHING;

      ELSIF p_gst_frequency = 'Quarterly_QRMP' THEN
        FOREACH v_quarter IN ARRAY v_quarters LOOP
          INSERT INTO gst_tracker (client_id, fy_id, fy_label, gstin, return_type, filing_frequency,
                                   period, period_quarter, status, standard_due_date)
          VALUES
            (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-1', 'Quarterly_QRMP',
             v_quarter::TEXT || ' ' || v_fy.fy_label, v_quarter, 'Not Started',
             CASE v_quarter WHEN 'Q1' THEN make_date(v_fy_year::INT, 7, 13)
                            WHEN 'Q2' THEN make_date(v_fy_year::INT, 10, 13)
                            WHEN 'Q3' THEN make_date(v_fy_year::INT + 1, 1, 13)
                            WHEN 'Q4' THEN make_date(v_fy_year::INT + 1, 4, 13) END),
            (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-3B', 'Quarterly_QRMP',
             v_quarter::TEXT || ' ' || v_fy.fy_label, v_quarter, 'Not Started',
             CASE v_quarter WHEN 'Q1' THEN make_date(v_fy_year::INT, 7, 22)
                            WHEN 'Q2' THEN make_date(v_fy_year::INT, 10, 22)
                            WHEN 'Q3' THEN make_date(v_fy_year::INT + 1, 1, 22)
                            WHEN 'Q4' THEN make_date(v_fy_year::INT + 1, 4, 22) END)
          ON CONFLICT (client_id, gstin, return_type, fy_label, period) DO NOTHING;
        END LOOP;

        INSERT INTO gst_tracker (client_id, fy_id, fy_label, gstin, return_type, filing_frequency,
                                 period, status, standard_due_date)
        VALUES (p_client_id, v_fy.id, v_fy.fy_label, p_gstin, 'GSTR-9', 'Quarterly_QRMP',
                'Annual ' || v_fy.fy_label, 'Not Started', make_date((v_fy_year::INTEGER + 1), 12, 31))
        ON CONFLICT (client_id, gstin, return_type, fy_label, period) DO NOTHING;
      END IF;
    END IF;

    ------------------------------------------------------------------------ TDS
    -- The original wrote ONLY tds_client_config and never a single tds_tracker
    -- row, so "26Q quarters generated" was never true. The config row is created
    -- first (preserving the existing form_26q = TRUE default), and the quarterly
    -- rows are then driven BY that config — so if an operator later enables 24Q
    -- or 27Q on a client, a re-sync picks it up rather than ignoring it.
    IF p_has_tan AND p_tan IS NOT NULL THEN
      INSERT INTO tds_client_config (client_id, tan, form_26q)
      VALUES (p_client_id, p_tan, TRUE)
      ON CONFLICT (client_id) DO NOTHING;

      SELECT array_remove(ARRAY[
               CASE WHEN c.form_24q  THEN '24Q'  END,
               CASE WHEN c.form_26q  THEN '26Q'  END,
               CASE WHEN c.form_27q  THEN '27Q'  END,
               CASE WHEN c.form_27eq THEN '27EQ' END
             ]::tds_form_enum[], NULL)
      INTO v_forms
      FROM tds_client_config c
      WHERE c.client_id = p_client_id;

      IF v_forms IS NOT NULL THEN
        FOREACH v_form IN ARRAY v_forms LOOP
          FOREACH v_quarter IN ARRAY v_quarters LOOP
            -- Statutory due dates.
            --   24Q / 26Q / 27Q : Q1 31 Jul, Q2 31 Oct, Q3 31 Jan (+1y), Q4 31 May (+1y)
            --   27EQ (TCS)      : Q1 15 Jul, Q2 15 Oct, Q3 15 Jan (+1y), Q4 15 May (+1y)
            v_due := CASE
              WHEN v_form = '27EQ' THEN
                CASE v_quarter
                  WHEN 'Q1' THEN make_date(v_fy_year::INT,     7, 15)
                  WHEN 'Q2' THEN make_date(v_fy_year::INT,    10, 15)
                  WHEN 'Q3' THEN make_date(v_fy_year::INT + 1, 1, 15)
                  WHEN 'Q4' THEN make_date(v_fy_year::INT + 1, 5, 15)
                END
              ELSE
                CASE v_quarter
                  WHEN 'Q1' THEN make_date(v_fy_year::INT,     7, 31)
                  WHEN 'Q2' THEN make_date(v_fy_year::INT,    10, 31)
                  WHEN 'Q3' THEN make_date(v_fy_year::INT + 1, 1, 31)
                  WHEN 'Q4' THEN make_date(v_fy_year::INT + 1, 5, 31)
                END
            END;

            INSERT INTO tds_tracker (client_id, fy_id, fy_label, tan, form_type, quarter,
                                     period_label, standard_due_date, status)
            VALUES (p_client_id, v_fy.id, v_fy.fy_label, p_tan, v_form, v_quarter,
                    v_quarter::TEXT || ' ' || v_fy.fy_label, v_due, 'Not Started')
            ON CONFLICT (client_id, form_type, quarter, fy_label) DO NOTHING;
          END LOOP;
        END LOOP;
      END IF;
    END IF;

    ------------------------------------------------------------------------ ROC
    IF p_has_cin AND p_cin IS NOT NULL
       AND p_client_type IN ('Private Limited Company','Limited Company','Section 8 Company') THEN
      INSERT INTO roc_tracker (client_id, fy_id, fy_label, cin, form_name, filing_type, status, standard_due_date)
      VALUES
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'AOC-4', 'Annual', 'Not Started',
           (v_fy.fy_end_date + INTERVAL '6 months 29 days')::DATE),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin,
           CASE WHEN p_client_type = 'Private Limited Company' THEN 'MGT-7A' ELSE 'MGT-7' END,
           'Annual', 'Not Started', (v_fy.fy_end_date + INTERVAL '9 months')::DATE),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'ADT-1', 'Annual', 'Not Started',
           make_date(v_fy_year::INT + 1, 10, 15)),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'DPT-3', 'Annual', 'Not Started',
           make_date(v_fy_year::INT + 1, 6, 30)),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'MSME-1 (Apr-Sep)', 'Annual', 'Not Started',
           make_date(v_fy_year::INT, 10, 31)),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'MSME-1 (Oct-Mar)', 'Annual', 'Not Started',
           make_date(v_fy_year::INT + 1, 4, 30)),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'DIR-3 KYC', 'Annual', 'Not Started',
           make_date(v_fy_year::INT + 1, 9, 30)),
        (p_client_id, v_fy.id, v_fy.fy_label, p_cin, 'Director Report', 'Annual', 'Not Started',
           (v_fy.fy_end_date + INTERVAL '6 months 29 days')::DATE)
      -- WAS: ON CONFLICT DO NOTHING -- no target, no unique key, so it deduped
      -- NOTHING and added eight fresh rows on every single re-sync.
      ON CONFLICT (client_id, fy_label, cin, form_name) DO NOTHING;
    END IF;

    ------------------------------------------------------------------------ LLP
    IF p_has_llpin AND p_llpin IS NOT NULL AND p_client_type = 'LLP' THEN
      INSERT INTO llp_tracker (client_id, fy_id, fy_label, llpin, form_name, filing_type, status, standard_due_date)
      VALUES
        (p_client_id, v_fy.id, v_fy.fy_label, p_llpin, 'Form 8',  'Annual', 'Not Started',
           (v_fy.fy_end_date + INTERVAL '6 months 29 days')::DATE),
        (p_client_id, v_fy.id, v_fy.fy_label, p_llpin, 'Form 11', 'Annual', 'Not Started',
           (v_fy.fy_end_date + INTERVAL '2 months 29 days')::DATE)
      ON CONFLICT (client_id, fy_label, llpin, form_name) DO NOTHING;
    END IF;

    ----------------------------------------------------------------- FINANCIALS
    -- NOTE: financials_tracker.client_id is TEXT (the YA-xxx code), not the uuid.
    IF v_client_text IS NOT NULL
       AND p_client_type IN ('Private Limited Company','Public Limited Company','Limited Company',
                             'Section 8 Company','LLP','Partnership Firm','Proprietor') THEN
      v_fin_types := ARRAY['Audited Balance Sheet','Computation of Income',
                           'Tax Audit Report (TAR)','ITR Form','ITR Acknowledgement'];
      FOREACH v_fin_type IN ARRAY v_fin_types LOOP
        INSERT INTO financials_tracker (client_id, fy_label, doc_type, status, due_date)
        VALUES (v_client_text, v_fy.fy_label, v_fin_type, 'Not Uploaded',
          CASE v_fin_type WHEN 'Tax Audit Report (TAR)' THEN make_date(v_fy_year::INT + 1, 9, 30)
                          ELSE make_date(v_fy_year::INT + 1, 10, 31) END)
        ON CONFLICT (client_id, fy_label, doc_type) DO NOTHING;
      END LOOP;
    END IF;

  END LOOP;

  -- Never again: success over an empty loop.
  IF v_fy_count = 0 THEN
    RAISE EXCEPTION
      'generate_client_compliance: no active financial_years rows between % and %. NOTHING was generated.',
      v_start, v_current
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

ALTER FUNCTION public.generate_client_compliance_core(
  uuid, text, character varying, boolean, text, text, boolean, text, boolean, text, boolean, text
) OWNER TO postgres;


-- ---------------------------------------------------------------------------
-- SECTION 6 — generate_client_compliance  (the frontend's entry point)
--
-- Signature, argument NAMES, order and defaults are IDENTICAL to the original.
-- The frontend calls this with named arguments (supabase.rpc), so renaming even
-- one parameter would break every call site silently.
--
-- It is now a thin wrapper: derive the start FY, delegate to the core.
-- The start-FY rule is UNCHANGED — get_client_start_fy(incorporation), floored at
-- 2020-21 — as agreed for future onboarding.
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
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_start_fy character varying(10);
BEGIN
  -- Rev 1.1: resolve_client_start_fy(), NOT get_client_start_fy().
  --
  -- WAS: get_client_start_fy(p_incorporation_date) -> NULL becomes '2020-21', so a
  --      Re-sync on a dateless client silently generated six years of compliance
  --      the controlled backfill had deliberately declined to invent.
  -- NOW: a dateless client resolves to the policy anchor (2025-26), and a client
  --      WITH a real date behaves exactly as before.
  v_start_fy := resolve_client_start_fy(p_client_id, p_incorporation_date);

  PERFORM generate_client_compliance_core(
    p_client_id, p_client_type, v_start_fy,
    p_has_gstin, p_gstin, p_gst_frequency,
    p_has_tan,   p_tan,
    p_has_cin,   p_cin,
    p_has_llpin, p_llpin
  );
END;
$$;

ALTER FUNCTION public.generate_client_compliance(
  uuid, text, boolean, text, text, boolean, text, boolean, text, boolean, text, date
) OWNER TO postgres;


-- ---------------------------------------------------------------------------
-- SECTION 6b — EXECUTE PRIVILEGES                                   [Rev 1.5]
--
-- ⚠ THE DEFAULT IS WRONG, AND SILENTLY SO.
--
-- PostgreSQL grants EXECUTE on a new function to PUBLIC by default. Supabase goes
-- further: `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO
-- postgres, anon, authenticated, service_role`. So EVERY function this migration
-- creates is, by default, callable by **anon** — an UNAUTHENTICATED web client —
-- the moment it exists. Nobody has to grant anything. It simply happens.
--
-- That matters most for ensure_financial_year_horizon(): it is SECURITY DEFINER,
-- owned by postgres, and it INSERTs and UPDATEs. Left at the default, any visitor
-- holding the public anon key could invoke a privileged maintenance routine that
-- writes to the financial-year master table. It is idempotent and additive, so the
-- blast radius is small — but "small blast radius" is not a security control, and
-- an anonymous caller has no business touching it at all.
--
-- generate_client_compliance_core() is worse and was NOT on the review list: it is
-- SECURITY DEFINER and writes compliance rows for ANY client uuid it is handed.
-- It is locked down here too.
--
-- WHAT KEEPS WORKING, AND WHY:
--   Nested calls inside a SECURITY DEFINER function execute as the DEFINER
--   (postgres), not the caller. So revoking EXECUTE from `authenticated` on
--   get_current_fy() / resolve_client_start_fy() does NOT break
--   generate_client_compliance() — which the frontend does call, and which keeps
--   its EXECUTE grant. Verified: the frontend calls exactly two of these functions
--   (generate_client_compliance, activate_accounting_service) and none of the
--   internals.
--
-- Idempotent: REVOKE/GRANT may be re-run safely, and CREATE OR REPLACE FUNCTION
-- preserves existing ACLs, so a second run of this migration changes nothing.
--
-- Roles are revoked defensively — a role that does not exist is skipped rather
-- than aborting the migration.
-- ---------------------------------------------------------------------------
-- These are written as EXPLICIT, top-level statements rather than dynamic SQL inside
-- a DO block. Dynamic SQL would hide them from static classification, and a privilege
-- change nobody can read in the diff is a privilege change nobody has reviewed.
-- Section 0 has already asserted that anon / authenticated / service_role exist, so
-- these cannot fail on a missing role.

-- ── INTERNAL FUNCTIONS: no web role may call these, under any circumstances ──
--
-- EXECUTE remains with the OWNER (postgres) alone. An owner always retains it
-- implicitly, so no GRANT is required and none is given. Least privilege, literally.

-- WRITE + SECURITY DEFINER. The one the review flagged.
REVOKE ALL ON FUNCTION public.ensure_financial_year_horizon(integer)
  FROM PUBLIC, anon, authenticated, service_role;

-- WRITE + SECURITY DEFINER, and NOT on the review's list — but worse than the rest:
-- it writes compliance rows for ANY client uuid handed to it. Locked down too.
REVOKE ALL ON FUNCTION public.generate_client_compliance_core(
  uuid, text, character varying, boolean, text, text, boolean, text, boolean, text, boolean, text)
  FROM PUBLIC, anon, authenticated, service_role;

-- Read-only helpers. No reason for a web client to reach them directly.
REVOKE ALL ON FUNCTION public.get_current_fy()
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_unknown_incorporation_start_fy()
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.resolve_client_start_fy(uuid, date)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.expected_backfill_start_fy(uuid, date)
  FROM PUBLIC, anon, authenticated, service_role;

-- service_role is revoked from ensure_financial_year_horizon() DELIBERATELY. The cron
-- proposal schedules the job as `postgres` (pg_cron runs a job as the role that
-- scheduled it), so the owner suffices and a service_role grant would be privilege we
-- do not need. If a future backend job genuinely must call it with the service key,
-- add ONE reviewed line and state why:
--     GRANT EXECUTE ON FUNCTION public.ensure_financial_year_horizon(integer) TO service_role;
-- Do not widen it pre-emptively.


-- ── FRONTEND RPCs: authenticated (+ service_role), never anon ────────────────
--
-- These two ARE called by the app. Verified: the frontend calls exactly these two
-- and none of the internals above.
--
-- They were created by 0008 and inherited the permissive default, so `anon` — an
-- UNAUTHENTICATED holder of the public anon key — can call them today. Nothing in the
-- app needs that: the onboarding wizard and the Clients page both require a signed-in
-- user. Tightened here.
--
-- service_role is RETAINED on these two (and only these two): it is the key any
-- server-side or admin tooling would already be using against them, and removing it
-- could break something outside this repository that I cannot see.

REVOKE ALL ON FUNCTION public.generate_client_compliance(
  uuid, text, boolean, text, text, boolean, text, boolean, text, boolean, text, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_client_compliance(
  uuid, text, boolean, text, text, boolean, text, boolean, text, boolean, text, date)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.activate_accounting_service(uuid, character varying)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_accounting_service(uuid, character varying)
  TO authenticated, service_role;

-- NOTE, and it is not fixed here: the schema-wide ALTER DEFAULT PRIVILEGES that
-- caused this remains in place. Any FUTURE function created in `public` will again
-- be granted to anon/authenticated/service_role automatically. Tightening the
-- default itself is a schema-wide governance change affecting objects far outside
-- R4, so it is RECOMMENDED SEPARATELY rather than smuggled in here. Until then,
-- every new function must revoke explicitly, exactly as this section does.


-- ---------------------------------------------------------------------------
-- SECTION 7 — BACKFILL the existing active clients
--
-- BUSINESS RULE (explicit, and the reason it is not 2020-21):
--
--   Existing active clients are backfilled from FY 2025-26 to the current FY.
--
--   12 of the 13 have NO incorporation date. Deriving their start FY would send
--   get_client_start_fy(NULL) -> '2020-21' and manufacture six years of records
--   for years in which we did not act for them — inventing history, not
--   recovering it. 2025-26 is the earliest year for which the firm actually holds
--   an engagement, so it is the earliest year we are entitled to assert.
--
--   FUTURE ONBOARDING IS UNAFFECTED: a newly onboarded client still starts from
--   its incorporation FY floored at 2020-21, because there the date is real.
--
-- Rev 1.1/1.2 -- THIS HOLE IS NOW CLOSED. (The paragraph that used to sit here warned
--   that a later Re-sync on a dateless client would derive 2020-21 and generate the
--   earlier years this backfill declines to invent. It no longer can.)
--
--   resolve_client_start_fy() returns the policy anchor (2025-26) for a client with no
--   incorporation date, and every entry point -- this core, the wrapper, and
--   activate_accounting_service -- CLAMPS with GREATEST(requested, policy). A caller may
--   ask for a LATER start FY; none can ask for an earlier one. The frontend still passes
--   '2020-21' for a dateless client (accountingStartFy in src/lib/compliance.js) and the
--   database now simply refuses to honour it.
--
--   The post-conditions below prove it against the DATA, not just the code.
--
-- The client_type mapping mirrors CLIENT_TYPE_RPC_MAP in src/lib/compliance.js.
-- 'Public Limited Company' MUST become 'Limited Company' or the ITR due-date and
-- ROC branches take the wrong path.
-- ---------------------------------------------------------------------------
DO $backfill$
DECLARE
  r            RECORD;
  v_start      CONSTANT character varying(10) := '2025-26';
  v_current    character varying(10);
  v_clients    int := 0;
BEGIN
  v_current := get_current_fy();

  IF v_start > v_current THEN
    RAISE EXCEPTION 'STOP: backfill start FY (%) is after the current FY (%).', v_start, v_current;
  END IF;

  FOR r IN
    SELECT id, client_id, client_type, gstin, tan, cin
    FROM clients
    WHERE status = 'Active' AND coalesce(is_draft, false) = false
    ORDER BY client_id
  LOOP
    PERFORM generate_client_compliance_core(
      r.id,
      CASE r.client_type
        WHEN 'Public Limited Company' THEN 'Limited Company'
        WHEN 'Proprietorship'         THEN 'Proprietor'
        WHEN NULL                     THEN 'Private Limited Company'
        ELSE coalesce(r.client_type, 'Private Limited Company')
      END,
      v_start,
      (r.gstin IS NOT NULL), r.gstin, 'Monthly',
      (r.tan   IS NOT NULL), r.tan,
      (r.cin   IS NOT NULL), r.cin,
      false, NULL                       -- clients has NO llpin column; LLP cannot be generated
    );

    PERFORM activate_accounting_service(r.id, v_start);

    v_clients := v_clients + 1;
  END LOOP;

  RAISE NOTICE 'Backfilled % active client(s) from FY % to FY %.', v_clients, v_start, v_current;
END
$backfill$;


-- ---------------------------------------------------------------------------
-- SECTION 8 — compliance_calendar
--
-- Deliberately LAST: the unique key from section 3 must exist before a single
-- row is inserted, or a re-run would duplicate the entire calendar.
--
-- Scope note: the calendar is GST-only, which mirrors exactly what the frontend
-- populates today. Widening it to ITR/TDS/ROC due dates would change what the
-- dashboard shows and is a product decision, not a repair. Flagged in the README.
-- ---------------------------------------------------------------------------
INSERT INTO public.compliance_calendar
  (client_id, compliance_type, compliance_name, compliance_tracker_id,
   fy_label, period, due_date, status, is_overdue, is_due_soon, days_to_due)
SELECT
  g.client_id,
  'GST',
  g.return_type || ' — ' || g.period,
  g.id,
  g.fy_label,
  g.period,
  g.standard_due_date,
  g.status,
  (g.standard_due_date <  (now() AT TIME ZONE 'Asia/Kolkata')::date AND g.status <> 'Filed'),
  (g.standard_due_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date
   AND g.standard_due_date <= (now() AT TIME ZONE 'Asia/Kolkata')::date + 7),
  (g.standard_due_date - (now() AT TIME ZONE 'Asia/Kolkata')::date)
FROM public.gst_tracker g
WHERE g.standard_due_date IS NOT NULL
  AND g.fy_label >= '2025-26'
  AND g.fy_label <= public.get_current_fy()
ON CONFLICT (client_id, compliance_tracker_id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- SECTION 9 — POST-CONDITIONS. If these fail, the whole transaction rolls back.
-- ---------------------------------------------------------------------------
DO $postcheck$
DECLARE
  v_fy_rows   int;
  v_current   character varying(10);
  v_clients   int;
  v_missing   int;
  v_acc_bad   int;
  v_itr_bad   int;
  v_dups      int;
  v_early     int;
BEGIN
  SELECT count(*) INTO v_fy_rows FROM financial_years;
  IF v_fy_rows < 11 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: financial_years has % rows, expected at least 11 (2020-21 .. 2030-31).',
      v_fy_rows;
  END IF;

  v_current := get_current_fy();
  IF v_current <> '2026-27' THEN
    RAISE NOTICE 'NOTE: current FY resolved to % (expected 2026-27 as at July 2026).', v_current;
  END IF;

  -- Rev 1.3 — THE HORIZON MUST HOLD. The current FY and at least the next TWO must
  -- exist, or 1 April of some future year becomes an outage.
  DECLARE
    v_y int := left(v_current, 4)::int;
    v_next   text := (v_y + 1)::text || '-' || lpad(((v_y + 2) % 100)::text, 2, '0');
    v_next2  text := (v_y + 2)::text || '-' || lpad(((v_y + 3) % 100)::text, 2, '0');
    v_overlap int;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM financial_years
                    WHERE fy_label = v_next AND coalesce(is_active, true)) THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: the NEXT financial year (%) does not exist. Rollover would break.', v_next;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM financial_years
                    WHERE fy_label = v_next2 AND coalesce(is_active, true)) THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: the FY after next (%) does not exist. Horizon is under two years.', v_next2;
    END IF;

    SELECT count(*) INTO v_overlap
    FROM financial_years a JOIN financial_years b
      ON a.id < b.id
     AND coalesce(a.is_active, true) AND coalesce(b.is_active, true)
     AND a.fy_start_date <= b.fy_end_date AND b.fy_start_date <= a.fy_end_date;
    IF v_overlap > 0 THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: % overlapping financial-year range(s).', v_overlap;
    END IF;

    RAISE NOTICE 'Horizon OK: current %, next %, then %.', v_current, v_next, v_next2;
  END;

  SELECT count(*) INTO v_clients FROM clients
   WHERE status = 'Active' AND coalesce(is_draft, false) = false;

  -- Every active client must now have an ITR row for the current FY.
  SELECT count(*) INTO v_missing FROM clients c
   WHERE c.status = 'Active' AND coalesce(c.is_draft, false) = false
     AND NOT EXISTS (SELECT 1 FROM income_tax_tracker t
                      WHERE t.client_id = c.id AND t.fy_label = v_current);
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: % active client(s) still have no income_tax_tracker row for FY %.',
      v_missing, v_current;
  END IF;

  -- Rev 1.2 — EXACTLY 12 accounting months for EVERY client/FY pair that should exist.
  --
  -- The Rev 1.1 check was:
  --     SELECT client_id, fy_label FROM accounting_tracker
  --      GROUP BY client_id, fy_label HAVING count(*) <> 12
  --
  -- which only ever inspected pairs that ALREADY HAD ROWS. A client that received no
  -- accounting at all for a financial year produced no group, so there was nothing to
  -- count and nothing to fail. The worst outcome — a client with ZERO accounting —
  -- was the one outcome the check could not see.
  --
  -- So we now start from what SHOULD exist (every active client CROSS JOIN every FY in
  -- the backfill window) and LEFT JOIN what does. A missing pair scores 0 and fails,
  -- exactly like a pair with 11 or 13.
  -- Rev 1.4: the expected window is now PER CLIENT, not a fixed '2025-26'.
  --
  -- Rev 1.3 demanded 12 months from '2025-26' for EVERY client. Generation does not
  -- work that way: the core clamps to GREATEST(floor, resolve_client_start_fy(...)),
  -- so a client incorporated inside FY 2026-27 legitimately has NO 2025-26 rows. The
  -- check disagreed with the thing it was checking and would have aborted a correct
  -- migration. expected_backfill_start_fy() states the rule once, and both this
  -- post-condition and the post-verification script now use it.
  SELECT count(*) INTO v_acc_bad
  FROM public.clients c
  CROSS JOIN public.financial_years f
  LEFT JOIN LATERAL (
    SELECT count(*) AS n
    FROM public.accounting_tracker a
    WHERE a.client_id = c.id AND a.fy_label = f.fy_label
  ) g ON true
  WHERE c.status = 'Active'
    AND coalesce(c.is_draft, false) = false
    AND coalesce(f.is_active, true)
    AND f.fy_label >= public.expected_backfill_start_fy(c.id, c.date_of_incorporation)
    AND f.fy_label <= v_current
    AND coalesce(g.n, 0) <> 12;

  IF v_acc_bad > 0 THEN
    RAISE EXCEPTION
      E'POST-CHECK FAILED: % client/FY pair(s) do not have EXACTLY 12 accounting months.\n'
       'This counts MISSING pairs (zero rows) as well as wrong counts.\n'
       'Expected window is PER CLIENT: expected_backfill_start_fy(client) .. % inclusive.',
      v_acc_bad, v_current;
  END IF;

  -- Same rule for income tax. (Rev 1.2 fixed the missing-pair blind spot; Rev 1.4
  -- fixes the wrong expected START for a client clamped later than the floor.)
  SELECT count(*) INTO v_itr_bad
  FROM public.clients c
  CROSS JOIN public.financial_years f
  WHERE c.status = 'Active'
    AND coalesce(c.is_draft, false) = false
    AND coalesce(f.is_active, true)
    AND f.fy_label >= public.expected_backfill_start_fy(c.id, c.date_of_incorporation)
    AND f.fy_label <= v_current
    AND NOT EXISTS (SELECT 1 FROM public.income_tax_tracker t
                     WHERE t.client_id = c.id AND t.fy_label = f.fy_label);

  IF v_itr_bad > 0 THEN
    RAISE EXCEPTION
      'POST-CHECK FAILED: % client/FY pair(s) have NO income_tax_tracker row within their expected window (per-client start .. %).',
      v_itr_bad, v_current;
  END IF;

  -- Rev 1.1 — the start-FY policy must actually HOLD in the data, not merely be
  -- implemented in a function. No client lacking an incorporation date may have a
  -- single tracker row earlier than the policy anchor.
  SELECT count(*) INTO v_early FROM (
    SELECT 1 FROM income_tax_tracker t JOIN clients c ON c.id = t.client_id
     WHERE c.date_of_incorporation IS NULL
       AND t.fy_label < public.get_unknown_incorporation_start_fy()
    UNION ALL
    SELECT 1 FROM accounting_tracker t JOIN clients c ON c.id = t.client_id
     WHERE c.date_of_incorporation IS NULL
       AND t.fy_label < public.get_unknown_incorporation_start_fy()
    UNION ALL
    SELECT 1 FROM gst_tracker t JOIN clients c ON c.id = t.client_id
     WHERE c.date_of_incorporation IS NULL
       AND t.fy_label < public.get_unknown_incorporation_start_fy()
  ) e;
  IF v_early > 0 THEN
    RAISE EXCEPTION
      'POST-CHECK FAILED: % tracker row(s) exist before FY % for clients with NO incorporation date. The start-FY policy is not holding.',
      v_early, public.get_unknown_incorporation_start_fy();
  END IF;

  -- Nothing we created may be duplicated.
  SELECT count(*) INTO v_dups FROM (
    SELECT 1 FROM roc_tracker GROUP BY client_id, fy_label, cin, form_name HAVING count(*) > 1
    UNION ALL
    SELECT 1 FROM llp_tracker GROUP BY client_id, fy_label, llpin, form_name HAVING count(*) > 1
    UNION ALL
    SELECT 1 FROM compliance_calendar WHERE compliance_tracker_id IS NOT NULL
     GROUP BY client_id, compliance_tracker_id HAVING count(*) > 1) d;
  IF v_dups > 0 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: % duplicate group(s) exist after the migration.', v_dups;
  END IF;

  RAISE NOTICE '=== 0014 POST-CHECKS PASSED ===';
  RAISE NOTICE 'financial_years rows : %', v_fy_rows;
  RAISE NOTICE 'current FY           : %', v_current;
  RAISE NOTICE 'active clients       : %', v_clients;
END
$postcheck$;

COMMIT;
