-- ============================================================================
--  0018_m1b_d2b_delete_privilege_closure.sql            (M1-B / D2b — patch)
--
--  GRANT-ONLY privilege closure. Revokes the residual direct DELETE grant held by
--  `authenticated` on the seven D2b client-master base tables, completing the
--  bypass closure begun in 0017 (which revoked INSERT/UPDATE but not DELETE).
--
--  TARGET   : V2 / yav2-dev ONLY — Supabase project ref ogjrwemjefvccpyjwxuo
--  RUNTIME  : Supabase SQL Editor compatible (no psql meta-commands).
--
--  CONFIRMED LIVE STARTING STATE (per executor, on V2):
--    authenticated INSERT=false, UPDATE=false, DELETE=TRUE, SELECT=true on all 7
--    tables; DELETE grant is DIRECT to authenticated; no DELETE RLS policies exist.
--  END STATE AFTER THIS PATCH:
--    authenticated INSERT=false, UPDATE=false, DELETE=false, SELECT=true on all 7.
--
--  THIS PATCH CHANGES NOTHING ELSE. It touches ONLY the authenticated→DELETE grant
--  on exactly these 7 tables. It does NOT alter any RPC, RLS policy, row of data,
--  service_role/postgres privilege, other table, D3/D4, frontend, compliance,
--  tracker/overdue/calendar/FY logic, or V1/Production.
--
--  ⚠ PROJECT GUARD — human attestation only (not a DB-identity check). VISUALLY
--    confirm the dashboard shows ogjrwemjefvccpyjwxuo, then:
--        SET yav2.confirm_project = 'ogjrwemjefvccpyjwxuo';
--
--  ONE transaction; every check is fail-closed.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SECTION 0 — PRECONDITIONS (fail closed)
-- ---------------------------------------------------------------------------
DO $precheck$
DECLARE v_missing text;
BEGIN
  IF current_setting('yav2.confirm_project', true) IS DISTINCT FROM 'ogjrwemjefvccpyjwxuo' THEN
    RAISE EXCEPTION E'STOP: run  SET yav2.confirm_project = ''ogjrwemjefvccpyjwxuo'';  first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE EXCEPTION 'STOP: role authenticated is missing.';
  END IF;
  SELECT string_agg(t, ', ') INTO v_missing
  FROM unnest(ARRAY['client_persons','client_identifiers','client_contacts','client_addresses',
                    'client_relationships','client_registrations','gst_registration_details']) AS t
  WHERE to_regclass('public.'||t) IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: expected base table missing: %', v_missing;
  END IF;
  RAISE NOTICE 'D2b DELETE-closure preconditions passed.';
END
$precheck$;

-- ---------------------------------------------------------------------------
-- SECTION A — REVOKE DELETE from authenticated (grant-only; nothing else)
-- ---------------------------------------------------------------------------
DO $revoke$
DECLARE t text;
  tabs text[] := ARRAY['client_persons','client_identifiers','client_contacts','client_addresses',
                       'client_relationships','client_registrations','gst_registration_details'];
BEGIN
  FOREACH t IN ARRAY tabs LOOP
    EXECUTE format('REVOKE DELETE ON public.%I FROM authenticated', t);
  END LOOP;
END
$revoke$;

-- ---------------------------------------------------------------------------
-- SECTION B — POST-CONDITIONS (roll back on any violation; NULL-safe)
--   Proves the intended end state AND that nothing else moved:
--   authenticated INSERT=false, UPDATE=false, DELETE=false, SELECT=true on all 7.
-- ---------------------------------------------------------------------------
DO $postcheck$
DECLARE t text;
  tabs text[] := ARRAY['client_persons','client_identifiers','client_contacts','client_addresses',
                       'client_relationships','client_registrations','gst_registration_details'];
BEGIN
  FOREACH t IN ARRAY tabs LOOP
    IF has_table_privilege('authenticated', ('public.'||t)::regclass, 'DELETE') IS DISTINCT FROM FALSE THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: authenticated still holds DELETE on %', t;
    END IF;
    IF has_table_privilege('authenticated', ('public.'||t)::regclass, 'INSERT') IS DISTINCT FROM FALSE THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: authenticated INSERT unexpectedly present on % (this patch must not change it)', t;
    END IF;
    IF has_table_privilege('authenticated', ('public.'||t)::regclass, 'UPDATE') IS DISTINCT FROM FALSE THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: authenticated UPDATE unexpectedly present on % (this patch must not change it)', t;
    END IF;
    IF has_table_privilege('authenticated', ('public.'||t)::regclass, 'SELECT') IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'POST-CHECK FAILED: authenticated SELECT lost on % (reads must remain)', t;
    END IF;
  END LOOP;
  RAISE NOTICE '=== D2b DELETE-closure COMPLETE ===';
  RAISE NOTICE 'authenticated on all 7 base tables: INSERT=false, UPDATE=false, DELETE=false, SELECT=true.';
END
$postcheck$;

COMMIT;
