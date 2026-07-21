-- ============================================================================
--  YAV2 — P5 — PG-1 (Migration 0022) — TRANSACTIONAL FUNCTIONAL TESTS
--                       (DRAFT — NOT EXECUTED)
--
--  ⚠️ Run ONLY AFTER Migration 0022 has been applied on V2/yav2-dev. This script
--  makes NO permanent changes: the whole run is a single transaction that ends in
--  ROLLBACK. Every fixture row and every audit row created by the RPCs is reverted.
--  Target V2 ONLY (ogjrwemjefvccpyjwxuo). V1/Production prohibited.
--
--  WHY A SIMULATED AUTH CONTEXT: the RPCs require auth.uid() and gate on
--  is_active_user()/is_admin_or_manager(), which resolve the actor via
--  team.auth_user_id = auth.uid(). A bare SQL-Editor session has auth.uid() = NULL,
--  so the tests set a transaction-local JWT claim (sub = an existing active
--  Admin/Manager team.auth_user_id) and SET LOCAL ROLE authenticated for the RPC
--  calls. The owner-level CHECK backstop and the rerun guard run after RESET ROLE.
--
--  PREREQUISITES (must hold on V2 at run time; the script asserts them):
--    * Migration 0022 applied: constraint csa_other_notes_required_chk present and
--      the create/update RPC bodies contain the OTHER_NOTES_REQUIRED guard.
--    * AUTHORISED TEST ACTOR: at least one team row with is_active = true,
--      portal_role IN ('Admin','Manager') and a NON-NULL auth_user_id.
--    * VALID TEST CLIENTS: at least TWO existing public.clients rows (client A for the
--      main flow; client B for the isolated owner-level CHECK backstop).
--    * SERVICE CATALOGUE: active codes 'OTHER', 'GST', 'TDS' (all seeded by 0021 with
--      requires_registration = false, so NO registration/owner fixtures are needed).
--    * AUTHENTICATED RPC CONTEXT: the executing SQL-Editor role can SET ROLE
--      authenticated and (for the backstop) bypasses RLS as owner/postgres so the
--      table CHECK — not an RLS INSERT denial — is what fires.
--    * NO owner/registration values are required (owner_team_id and
--      linked_registration_id are passed as NULL throughout).
-- ============================================================================

BEGIN;

-- ---- Structural verification (read-only; proves 0022 is applied) ------------
DO $structural$
DECLARE v_def text; v_create_guard boolean; v_update_guard boolean; v_status_guard boolean;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_def
  FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
  WHERE r.relname='client_service_applicability' AND c.conname='csa_other_notes_required_chk';
  IF v_def IS NULL THEN RAISE EXCEPTION 'STRUCT_FAIL: csa_other_notes_required_chk missing — apply 0022 first'; END IF;
  IF v_def !~ 'OTHER' OR v_def !~ 'btrim' THEN RAISE EXCEPTION 'STRUCT_FAIL: constraint def unexpected: %', v_def; END IF;

  SELECT prosrc LIKE '%OTHER_NOTES_REQUIRED%' INTO v_create_guard FROM pg_proc WHERE proname='service_applicability_create';
  SELECT prosrc LIKE '%OTHER_NOTES_REQUIRED%' INTO v_update_guard FROM pg_proc WHERE proname='service_applicability_update';
  SELECT prosrc LIKE '%OTHER_NOTES_REQUIRED%' INTO v_status_guard FROM pg_proc WHERE proname='service_applicability_set_status';
  IF NOT v_create_guard THEN RAISE EXCEPTION 'STRUCT_FAIL: create RPC lacks the OTHER_NOTES_REQUIRED guard'; END IF;
  IF NOT v_update_guard THEN RAISE EXCEPTION 'STRUCT_FAIL: update RPC lacks the OTHER_NOTES_REQUIRED guard'; END IF;
  IF v_status_guard THEN RAISE EXCEPTION 'STRUCT_FAIL: set_status must NOT contain the guard (must be unchanged)'; END IF;
  RAISE NOTICE 'STRUCT PASS: constraint present; create/update guarded; set_status unchanged';
END $structural$;

-- ---- Fixture selection into TRANSACTION-LOCAL config (reverts on ROLLBACK) ----
--  Selected as the SQL-Editor (owner) role and stored via set_config(..., is_local=>true)
--  so the values survive the later SET LOCAL ROLE switch WITHOUT relying on temp-table
--  privileges (authenticated need not have SELECT/USAGE on a temp object). These GUCs
--  are transaction-local: they revert at transaction end (COMMIT or ROLLBACK) and leave
--  NO object and NO grant behind. Empty string ('') denotes "not found" for the asserts.
SELECT set_config('pg1.actor_uid',
         coalesce((SELECT t.auth_user_id::text FROM public.team t
                     WHERE t.is_active = true AND t.portal_role IN ('Admin','Manager')
                       AND t.auth_user_id IS NOT NULL
                     ORDER BY t.auth_user_id LIMIT 1), ''), true);
SELECT set_config('pg1.client_a',
         coalesce((SELECT c.id::text FROM public.clients c ORDER BY c.id LIMIT 1), ''), true);
SELECT set_config('pg1.client_b',
         coalesce((SELECT c.id::text FROM public.clients c ORDER BY c.id OFFSET 1 LIMIT 1), ''), true);

DO $prereq$
BEGIN
  IF current_setting('pg1.actor_uid') = '' THEN
    RAISE EXCEPTION 'PREREQ_FAIL: need an active Admin/Manager team member with a non-null auth_user_id'; END IF;
  IF current_setting('pg1.client_a') = '' THEN RAISE EXCEPTION 'PREREQ_FAIL: need at least one existing client'; END IF;
  IF current_setting('pg1.client_b') = '' THEN RAISE EXCEPTION 'PREREQ_FAIL: need at least TWO existing clients (backstop uses a second)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.service_catalogue WHERE code='OTHER' AND is_active) THEN
    RAISE EXCEPTION 'PREREQ_FAIL: active OTHER catalogue code required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.service_catalogue WHERE code='GST'  AND is_active) THEN
    RAISE EXCEPTION 'PREREQ_FAIL: active GST catalogue code required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.service_catalogue WHERE code='TDS'  AND is_active) THEN
    RAISE EXCEPTION 'PREREQ_FAIL: active TDS catalogue code required'; END IF;
  RAISE NOTICE 'PREREQ PASS: actor + two clients + OTHER/GST/TDS catalogue present';
END $prereq$;

-- ---- Simulate the authenticated actor (transaction-local) -------------------
SELECT set_config('request.jwt.claims',
         json_build_object('sub', current_setting('pg1.actor_uid'), 'role', 'authenticated')::text,
         true);
SET LOCAL ROLE authenticated;

-- ---- Controlled RPC error tests + successful RPC cases + set_status compat ---
DO $tests$
DECLARE
  v_client_a uuid; r jsonb; v_r1 uuid; v_r1_rv integer; v_r3 uuid; v_r3_rv integer; v_r4 uuid; v_r4_rv integer;
  v_notes text; v_status text; v_rv integer;
BEGIN
  v_client_a := current_setting('pg1.client_a')::uuid;

  -- T1: create OTHER + NULL notes -> OTHER_NOTES_REQUIRED
  BEGIN
    r := public.service_applicability_create(v_client_a,'OTHER',NULL,NULL,NULL,NULL,NULL,NULL);
    RAISE EXCEPTION 'T1_FAIL: expected OTHER_NOTES_REQUIRED, got success';
  EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE 'OTHER_NOTES_REQUIRED%' THEN RAISE EXCEPTION 'T1_FAIL: wrong error: %', SQLERRM; END IF;
    RAISE NOTICE 'T1 PASS: create OTHER + NULL -> OTHER_NOTES_REQUIRED';
  END;

  -- T2: create OTHER + empty notes -> OTHER_NOTES_REQUIRED
  BEGIN
    r := public.service_applicability_create(v_client_a,'OTHER',NULL,NULL,NULL,NULL,NULL,'');
    RAISE EXCEPTION 'T2_FAIL: expected OTHER_NOTES_REQUIRED';
  EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE 'OTHER_NOTES_REQUIRED%' THEN RAISE EXCEPTION 'T2_FAIL: %', SQLERRM; END IF;
    RAISE NOTICE 'T2 PASS: create OTHER + empty -> OTHER_NOTES_REQUIRED';
  END;

  -- T3: create OTHER + whitespace notes -> OTHER_NOTES_REQUIRED
  BEGIN
    r := public.service_applicability_create(v_client_a,'OTHER',NULL,NULL,NULL,NULL,NULL,'   ');
    RAISE EXCEPTION 'T3_FAIL: expected OTHER_NOTES_REQUIRED';
  EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE 'OTHER_NOTES_REQUIRED%' THEN RAISE EXCEPTION 'T3_FAIL: %', SQLERRM; END IF;
    RAISE NOTICE 'T3 PASS: create OTHER + whitespace -> OTHER_NOTES_REQUIRED';
  END;

  -- T4: create OTHER + meaningful notes -> success, stored TRIMMED
  r := public.service_applicability_create(v_client_a,'OTHER',NULL,NULL,NULL,NULL,NULL,'  ad-hoc filing  ');
  v_r1 := (r->>'id')::uuid; v_r1_rv := (r->>'row_version')::int;
  SELECT notes INTO v_notes FROM public.client_service_applicability WHERE id=v_r1;
  IF v_notes <> 'ad-hoc filing' THEN RAISE EXCEPTION 'T4_FAIL: notes not trimmed/stored (got %)', v_notes; END IF;
  RAISE NOTICE 'T4 PASS: create OTHER + meaningful -> success, trimmed';
  -- free the (client_a, OTHER) live slot so later OTHER rows do not collide (also smoke-tests set_status)
  v_rv := public.service_applicability_set_status(v_r1, v_r1_rv, 'Inactive', current_date);

  -- T5: create non-OTHER (GST) + NULL notes -> success (unaffected)
  r := public.service_applicability_create(v_client_a,'GST',NULL,NULL,NULL,NULL,NULL,NULL);
  RAISE NOTICE 'T5 PASS: create GST + NULL notes -> success';

  -- Prepare a live OTHER Draft (with notes) on client_a for the update tests
  r := public.service_applicability_create(v_client_a,'OTHER',NULL,NULL,NULL,NULL,NULL,'keep');
  v_r3 := (r->>'id')::uuid; v_r3_rv := (r->>'row_version')::int;

  -- T6: update OTHER clearing notes -> OTHER_NOTES_REQUIRED
  BEGIN
    v_rv := public.service_applicability_update(v_r3, v_r3_rv, NULL,NULL,NULL,NULL,NULL, NULL);
    RAISE EXCEPTION 'T6_FAIL: expected OTHER_NOTES_REQUIRED';
  EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE 'OTHER_NOTES_REQUIRED%' THEN RAISE EXCEPTION 'T6_FAIL: %', SQLERRM; END IF;
    RAISE NOTICE 'T6 PASS: update OTHER clearing notes -> OTHER_NOTES_REQUIRED';
  END;

  -- T7: update OTHER to whitespace notes -> OTHER_NOTES_REQUIRED
  BEGIN
    v_rv := public.service_applicability_update(v_r3, v_r3_rv, NULL,NULL,NULL,NULL,NULL, '   ');
    RAISE EXCEPTION 'T7_FAIL: expected OTHER_NOTES_REQUIRED';
  EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE 'OTHER_NOTES_REQUIRED%' THEN RAISE EXCEPTION 'T7_FAIL: %', SQLERRM; END IF;
    RAISE NOTICE 'T7 PASS: update OTHER whitespace -> OTHER_NOTES_REQUIRED';
  END;

  -- T8: update OTHER + meaningful notes -> success (trimmed)
  v_r3_rv := public.service_applicability_update(v_r3, v_r3_rv, NULL,NULL,NULL,NULL,NULL, '  revised note  ');
  SELECT notes INTO v_notes FROM public.client_service_applicability WHERE id=v_r3;
  IF v_notes <> 'revised note' THEN RAISE EXCEPTION 'T8_FAIL: notes (got %)', v_notes; END IF;
  RAISE NOTICE 'T8 PASS: update OTHER meaningful -> success, trimmed';

  -- T9: update non-OTHER (TDS) with NULL notes -> success
  r := public.service_applicability_create(v_client_a,'TDS',NULL,NULL,NULL,NULL,NULL,'seed');
  v_r4 := (r->>'id')::uuid; v_r4_rv := (r->>'row_version')::int;
  v_rv := public.service_applicability_update(v_r4, v_r4_rv, NULL,NULL,NULL,NULL,NULL, NULL);
  SELECT notes INTO v_notes FROM public.client_service_applicability WHERE id=v_r4;
  IF v_notes IS NOT NULL THEN RAISE EXCEPTION 'T9_FAIL: non-OTHER notes should be NULL (got %)', v_notes; END IF;
  RAISE NOTICE 'T9 PASS: update non-OTHER + NULL notes -> success';

  -- T11: approve a valid OTHER Draft (notes present, effective_from set) -> success
  --      set_status compatibility: the new CHECK re-validates the row and passes.
  v_r3_rv := public.service_applicability_update(v_r3, v_r3_rv, current_date, NULL, NULL, NULL, NULL, 'revised note');
  v_rv := public.service_applicability_set_status(v_r3, v_r3_rv, 'Approved', NULL);
  SELECT status INTO v_status FROM public.client_service_applicability WHERE id=v_r3;
  IF v_status <> 'Approved' THEN RAISE EXCEPTION 'T11_FAIL: expected Approved (got %)', v_status; END IF;
  RAISE NOTICE 'T11 PASS: approve valid OTHER Draft -> success (set_status unaffected)';
END $tests$;

RESET ROLE;

-- ---- T10: direct owner-level INSERT backstop (proves the table CHECK) --------
--  Runs as the owner/postgres role (BYPASSRLS) so RLS does NOT mask the CHECK.
--  Uses client_b, which has no live OTHER row, so the live-unique index cannot fire.
--  EVERY mandatory column is supplied with a valid value (id, client_id, service_code,
--  status='Draft', row_version, timestamps; all optional/date/fk columns NULL and the
--  same-client composite FK is not triggered because linked_registration_id is NULL) so
--  the ONLY constraint that can fail is csa_other_notes_required_chk (notes = NULL on an
--  OTHER row). This makes the expected check_violation deterministic.
DO $backstop$
DECLARE v_client_b uuid := current_setting('pg1.client_b')::uuid;
BEGIN
  BEGIN
    INSERT INTO public.client_service_applicability
      (id, client_id, service_code, effective_from, effective_to, frequency,
       linked_registration_id, owner_team_id, status, approved_by, approved_at,
       notes, row_version, created_at, created_by, updated_at, updated_by)
    VALUES
      (gen_random_uuid(), v_client_b, 'OTHER', NULL, NULL, NULL,
       NULL, NULL, 'Draft', NULL, NULL,
       NULL, 1, now(), NULL, now(), NULL);
    RAISE EXCEPTION 'T10_FAIL: direct OTHER insert with NULL notes unexpectedly succeeded';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM NOT LIKE '%csa_other_notes_required_chk%' THEN
        RAISE EXCEPTION 'T10_FAIL: wrong check violated: %', SQLERRM; END IF;
      RAISE NOTICE 'T10 PASS: direct OTHER+NULL insert blocked by csa_other_notes_required_chk';
  END;
END $backstop$;

-- ---- T12: rerun / fail-closed guard (duplicate constraint name rejected) -----
DO $rerun$
BEGIN
  BEGIN
    ALTER TABLE public.client_service_applicability
      ADD CONSTRAINT csa_other_notes_required_chk CHECK (true);
    RAISE EXCEPTION 'T12_FAIL: duplicate constraint add unexpectedly succeeded';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'T12 PASS: duplicate csa_other_notes_required_chk rejected (migration not rerunnable)';
  END;
END $rerun$;

ROLLBACK;

-- ---- Post-ROLLBACK confirmation (read-only; all test effects reverted) -------
--  Expect applicability_rows = 0 (every fixture row created above rolled back;
--  audit_write_event rows inserted by the RPCs rolled back with them).
SELECT 'post_rollback_applicability_rows' AS check,
       (SELECT count(*) FROM public.client_service_applicability) AS applicability_rows,
       (SELECT count(*) FROM public.client_service_applicability) = 0 AS pass;
-- ============================================================================
--  END TRANSACTIONAL FUNCTIONAL TESTS (DRAFT / NOT EXECUTED). Always ends in ROLLBACK.
-- ============================================================================
