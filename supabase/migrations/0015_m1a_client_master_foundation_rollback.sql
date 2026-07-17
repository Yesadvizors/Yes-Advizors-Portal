-- ============================================================================
--  0015_m1a_client_master_foundation_ROLLBACK.sql          (Rev 1.1)
--
--  TARGET : V2 / yav2-dev ONLY — ogjrwemjefvccpyjwxuo
--  RUNTIME: Supabase SQL Editor compatible (no psql meta-commands).
--
--  Drops ONLY the objects 0015 created. Because 0015 is purely additive, this
--  rollback restores the exact prior state:
--    * drops the 9 new tables (in FK dependency order);
--    * deletes ONLY the 12 additive audit_event_contract rows (existing rows,
--      including audit.log.read_requested / read_completed, are untouched).
--
--  It changes NO client, tracker, financial, calendar or legacy row/column, and does
--  not touch migration 0014.
--
--  ⚠ WHEN THIS ROLLBACK IS SAFE (Rev 1.1):
--    * SAFE only BEFORE M1-B, and BEFORE any data has been written into the new tables.
--      In M1-A the tables are freshly created and empty, so DROP loses nothing.
--    * AFTER M1-B (or once client-master data exists in these tables), DO NOT run this.
--      DROP would destroy real data. Use a BACKUP + FORWARD-FIX migration instead.
--
--  Project guard: human attestation only — VISUALLY confirm ogjrwemjefvccpyjwxuo first.
-- ============================================================================

BEGIN;

DO $guard$
BEGIN
  IF current_setting('yav2.confirm_project', true) IS DISTINCT FROM 'ogjrwemjefvccpyjwxuo' THEN
    RAISE EXCEPTION E'STOP: run  SET yav2.confirm_project = ''ogjrwemjefvccpyjwxuo'';  first.';
  END IF;
END
$guard$;

-- Tables, in dependency order (children before parents).
DROP TABLE IF EXISTS public.client_relationships;
DROP TABLE IF EXISTS public.client_contacts;          -- references client_persons
DROP TABLE IF EXISTS public.client_addresses;
DROP TABLE IF EXISTS public.client_remediation_flags;
DROP TABLE IF EXISTS public.client_identifiers;
DROP TABLE IF EXISTS public.gst_registration_details; -- references client_registrations
DROP TABLE IF EXISTS public.client_registrations;
DROP TABLE IF EXISTS public.client_persons;
DROP TABLE IF EXISTS public.entity_type_catalogue;

-- Additive audit contract rows only (never the pre-existing events).
DELETE FROM public.audit_event_contract
WHERE event_name IN ('client.created','client.updated','client.status_transition',
  'client.duplicate_override','registration.added','registration.updated','identifier.added',
  'person.kyc_verified','person.kyc_exception_approved','document.signed_url_issued',
  'document.verified','remediation.resolved');

COMMIT;
