-- ============================================================================
--  YAV2 — P5 — MANUAL ROLLBACK for MIGRATION 0021 (DRAFT — NOT EXECUTED)
--
--  ⚠️ THIS IS A MANUAL, OPERATOR-RUN ROLLBACK — NOT A FORWARD MIGRATION.
--  It is deliberately placed OUTSIDE supabase/migrations/ so no migration tooling
--  can ever apply it as part of the forward sequence. Run manually only, by PJ,
--  to reverse an approved 0021 execution. NOT APPROVED.
--
--  Reverts 0021_service_applicability.sql. Single transaction; fail-closed.
--  DATA-SAFE GUARD: aborts if any client_service_applicability rows exist (the
--  feature was used) — those must be resolved first. It drops only the objects 0021
--  created and the 4 audit events it registered; it does NOT touch clients /
--  clients.services / client_registrations DATA.
--
--  Target : V2 / yav2-dev ONLY (ogjrwemjefvccpyjwxuo). V1/Production prohibited.
-- ============================================================================

BEGIN;

DO $rb_pre$
BEGIN
  IF to_regclass('public.client_service_applicability') IS NOT NULL
     AND (SELECT count(*) FROM public.client_service_applicability) <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK ABORT: client_service_applicability has rows; resolve before schema rollback';
  END IF;
END $rb_pre$;

-- 1) RPCs (exact signatures)
DROP FUNCTION IF EXISTS public.service_applicability_set_status(uuid,integer,text,date);
DROP FUNCTION IF EXISTS public.service_applicability_update(uuid,integer,date,date,text,uuid,uuid,text);
DROP FUNCTION IF EXISTS public.service_applicability_create(uuid,text,date,date,text,uuid,uuid,text);

-- 2) core table (drops its policies, indexes, constraints incl. the composite FK)
DROP TABLE IF EXISTS public.client_service_applicability;

-- 3) composite-FK prerequisite on client_registrations (data untouched)
ALTER TABLE public.client_registrations DROP CONSTRAINT IF EXISTS client_registrations_id_client_uq;

-- 4) reference catalogue (drops its policy)
DROP TABLE IF EXISTS public.service_catalogue;

-- 5) the 4 additive lifecycle audit events
DELETE FROM public.audit_event_contract
 WHERE event_name IN ('service_applicability.added','service_applicability.updated',
                      'service_applicability.approved','service_applicability.deactivated');

DO $rb_post$
BEGIN
  IF to_regclass('public.client_service_applicability') IS NOT NULL
     OR to_regclass('public.service_catalogue') IS NOT NULL THEN
    RAISE EXCEPTION 'ROLLBACK POST: table(s) still present';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='client_registrations_id_client_uq') THEN
    RAISE EXCEPTION 'ROLLBACK POST: client_registrations_id_client_uq still present';
  END IF;
  IF EXISTS (SELECT 1 FROM public.audit_event_contract
             WHERE event_name IN ('service_applicability.added','service_applicability.updated',
                                  'service_applicability.approved','service_applicability.deactivated')) THEN
    RAISE EXCEPTION 'ROLLBACK POST: audit events still present';
  END IF;
END $rb_post$;

COMMIT;
-- ============================================================================
--  END MANUAL ROLLBACK (DRAFT / NOT EXECUTED / NOT APPROVED). Not a forward migration.
-- ============================================================================
