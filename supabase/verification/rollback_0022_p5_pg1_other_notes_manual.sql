-- ============================================================================
--  YAV2 — P5 — MANUAL ROLLBACK for MIGRATION 0022 (PG-1)  (DRAFT — NOT EXECUTED)
--
--  ⚠️ THIS IS A MANUAL, OPERATOR-RUN ROLLBACK — NOT A FORWARD MIGRATION.
--  It is deliberately placed OUTSIDE supabase/migrations/ so no migration tooling
--  can ever apply it in the forward sequence. Run manually only, by PJ, AND ONLY
--  after SEPARATE PJ + ChatGPT approval, to reverse an approved 0022 execution.
--  NOT APPROVED. AUTHORED / NOT EXECUTED.
--
--  ⚠️⚠️ WARNING — THIS ROLLBACK WEAKENS AUTHORITATIVE ENFORCEMENT.
--  It removes the OTHER-notes authority (table CHECK + RPC guards). After rollback,
--  a future write path could again create/keep an 'OTHER' applicability row with
--  blank notes. Only run it if PG-1 must be reversed for a reviewed reason, and
--  re-establish enforcement before any write UI (CP-5/CP-6) is enabled.
--
--  WHAT IT DOES (single transaction; fail-closed; NO data changes):
--    * reports total applicability rows and OTHER rows (NOTICE);
--    * FAILS if ANY 'OTHER' row has null / empty / whitespace-only notes
--      (such a row would be left unprotected — resolve the data first);
--    * restores the EXACT pre-PG-1 (Migration 0021) create + update RPC bodies
--      (guard removed) via CREATE OR REPLACE — signatures/DEFINER/search_path/grants
--      unchanged;
--    * drops ONLY constraint csa_other_notes_required_chk;
--    * makes NO INSERT/UPDATE/DELETE against any data table; leaves service_catalogue,
--      audit_event_contract, set_status, RLS and grants untouched.
--
--  Target : V2 / yav2-dev ONLY (ogjrwemjefvccpyjwxuo). V1/Production prohibited.
-- ============================================================================

BEGIN;

DO $rb_pre$
DECLARE
  v_total  bigint;
  v_other  bigint;
  v_bad    bigint;
BEGIN
  IF to_regclass('public.client_service_applicability') IS NULL THEN
    RAISE EXCEPTION 'ROLLBACK ABORT: client_service_applicability does not exist (was 0021 applied?)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='csa_other_notes_required_chk') THEN
    RAISE EXCEPTION 'ROLLBACK ABORT: csa_other_notes_required_chk absent (PG-1 not applied / already rolled back)';
  END IF;

  SELECT count(*) INTO v_total FROM public.client_service_applicability;
  SELECT count(*) INTO v_other FROM public.client_service_applicability WHERE service_code='OTHER';
  SELECT count(*) INTO v_bad   FROM public.client_service_applicability
   WHERE service_code='OTHER' AND (notes IS NULL OR btrim(notes) = '');

  RAISE NOTICE 'PG-1 ROLLBACK inspection: applicability rows=%, OTHER rows=%, OTHER-with-blank-notes=%',
    v_total, v_other, v_bad;

  -- Corrected guard: do NOT abort merely because rows exist. Abort only if an OTHER
  -- row would be left non-compliant once the authority is removed.
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK ABORT: % OTHER row(s) have blank notes; resolve the data before removing enforcement', v_bad;
  END IF;
END $rb_pre$;

-- 1) restore EXACT pre-PG-1 (Migration 0021) create RPC body (NO OTHER-notes guard)
CREATE OR REPLACE FUNCTION public.service_applicability_create(
  p_client_id uuid, p_service_code text, p_effective_from date, p_effective_to date,
  p_frequency text, p_linked_registration_id uuid, p_owner_team_id uuid, p_notes text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_id uuid; v_rv integer; v_code text; v_freq text; v_requires boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'CLIENT_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id=p_client_id) THEN RAISE EXCEPTION 'CLIENT_NOT_FOUND: %', p_client_id; END IF;

  v_code := nullif(upper(btrim(p_service_code)),'');
  IF v_code IS NULL THEN RAISE EXCEPTION 'SERVICE_CODE_REQUIRED'; END IF;
  SELECT requires_registration INTO v_requires FROM public.service_catalogue WHERE code=v_code AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_OR_INACTIVE_SERVICE_CODE: %', v_code; END IF;

  v_freq := nullif(upper(btrim(p_frequency)),'');
  IF v_freq IS NOT NULL AND v_freq NOT IN ('MONTHLY','QUARTERLY','HALF_YEARLY','ANNUAL','EVENT_BASED','ONE_TIME','AS_REQUIRED') THEN
    RAISE EXCEPTION 'INVALID_FREQUENCY'; END IF;

  IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN
    RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM'; END IF;

  IF p_owner_team_id IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM public.team WHERE id=p_owner_team_id AND coalesce(is_active,false)=true) THEN
    RAISE EXCEPTION 'OWNER_NOT_ACTIVE_TEAM_MEMBER'; END IF;

  IF v_requires AND p_linked_registration_id IS NULL THEN RAISE EXCEPTION 'REGISTRATION_REQUIRED_FOR_SERVICE'; END IF;
  IF p_linked_registration_id IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM public.client_registrations WHERE id=p_linked_registration_id AND client_id=p_client_id) THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_SAME_CLIENT'; END IF;

  INSERT INTO public.client_service_applicability
    (client_id, service_code, effective_from, effective_to, frequency,
     linked_registration_id, owner_team_id, status, notes, created_by, updated_by)
  VALUES
    (p_client_id, v_code, p_effective_from, p_effective_to, v_freq,
     p_linked_registration_id, p_owner_team_id, 'Draft', nullif(btrim(p_notes),''), auth.uid(), auth.uid())
  RETURNING id, row_version INTO v_id, v_rv;

  PERFORM public.audit_write_event('service_applicability.added','CREATE','client_service_applicability',
            v_id::text, p_client_id, jsonb_build_object('change_type_code','CREATED'));
  RETURN jsonb_build_object('id', v_id, 'row_version', v_rv);
END $fn$;

-- 2) restore EXACT pre-PG-1 (Migration 0021) update RPC body (NO OTHER-notes guard)
CREATE OR REPLACE FUNCTION public.service_applicability_update(
  p_id uuid, p_expected_row_version integer, p_effective_from date, p_effective_to date,
  p_frequency text, p_linked_registration_id uuid, p_owner_team_id uuid, p_notes text
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE v_client uuid; v_status text; v_new_rv integer; v_freq text; v_requires boolean; v_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NO_AUTH_CONTEXT'; END IF;
  IF public.is_active_user()      IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE'; END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'NOT_AUTHORISED'; END IF;
  IF p_id IS NULL OR p_expected_row_version IS NULL THEN RAISE EXCEPTION 'ID_AND_VERSION_REQUIRED'; END IF;

  SELECT client_id, status, service_code INTO v_client, v_status, v_code
  FROM public.client_service_applicability WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROW_NOT_FOUND'; END IF;
  IF v_status = 'Inactive' THEN RAISE EXCEPTION 'ROW_INACTIVE_NOT_EDITABLE'; END IF;
  IF v_status = 'Approved' AND p_effective_to IS NOT NULL THEN
    RAISE EXCEPTION 'EFFECTIVE_TO_NOT_ALLOWED_FOR_APPROVED'; END IF;

  v_freq := nullif(upper(btrim(p_frequency)),'');
  IF v_freq IS NOT NULL AND v_freq NOT IN ('MONTHLY','QUARTERLY','HALF_YEARLY','ANNUAL','EVENT_BASED','ONE_TIME','AS_REQUIRED') THEN
    RAISE EXCEPTION 'INVALID_FREQUENCY'; END IF;
  IF p_effective_from IS NOT NULL AND p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN
    RAISE EXCEPTION 'EFFECTIVE_TO_BEFORE_FROM'; END IF;
  IF v_status='Approved' AND p_effective_from IS NULL THEN RAISE EXCEPTION 'EFFECTIVE_FROM_REQUIRED_FOR_APPROVED'; END IF;

  IF p_owner_team_id IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM public.team WHERE id=p_owner_team_id AND coalesce(is_active,false)=true) THEN
    RAISE EXCEPTION 'OWNER_NOT_ACTIVE_TEAM_MEMBER'; END IF;

  SELECT requires_registration INTO v_requires FROM public.service_catalogue WHERE code=v_code;
  IF v_requires AND p_linked_registration_id IS NULL THEN RAISE EXCEPTION 'REGISTRATION_REQUIRED_FOR_SERVICE'; END IF;
  IF p_linked_registration_id IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM public.client_registrations WHERE id=p_linked_registration_id AND client_id=v_client) THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_SAME_CLIENT'; END IF;

  UPDATE public.client_service_applicability SET
    effective_from=p_effective_from, effective_to=p_effective_to, frequency=v_freq,
    linked_registration_id=p_linked_registration_id, owner_team_id=p_owner_team_id,
    notes=nullif(btrim(p_notes),''), row_version=row_version+1, updated_at=now(), updated_by=auth.uid()
  WHERE id=p_id AND row_version=p_expected_row_version
  RETURNING row_version INTO v_new_rv;
  IF NOT FOUND THEN RAISE EXCEPTION 'STALE_ROW_VERSION'; END IF;

  PERFORM public.audit_write_event('service_applicability.updated','UPDATE','client_service_applicability',
            p_id::text, v_client, jsonb_build_object('change_type_code','UPDATED'));
  RETURN v_new_rv;
END $fn$;

-- 3) drop ONLY the PG-1 constraint (no other schema/grant/RLS change)
ALTER TABLE public.client_service_applicability DROP CONSTRAINT IF EXISTS csa_other_notes_required_chk;

DO $rb_post$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='csa_other_notes_required_chk') THEN
    RAISE EXCEPTION 'ROLLBACK POST: csa_other_notes_required_chk still present';
  END IF;
  IF to_regprocedure('public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text)') IS NULL
     OR to_regprocedure('public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text)') IS NULL
     OR to_regprocedure('public.service_applicability_set_status(uuid,integer,text,date)') IS NULL THEN
    RAISE EXCEPTION 'ROLLBACK POST: an RPC signature is missing';
  END IF;
  RAISE NOTICE 'PG-1 ROLLBACK complete: constraint dropped, pre-PG-1 RPC bodies restored. ENFORCEMENT IS NOW WEAKENED.';
END $rb_post$;

COMMIT;
-- ============================================================================
--  END MANUAL ROLLBACK (DRAFT / NOT EXECUTED / NOT APPROVED). Not a forward migration.
--  Requires SEPARATE PJ + ChatGPT approval before execution.
-- ============================================================================
