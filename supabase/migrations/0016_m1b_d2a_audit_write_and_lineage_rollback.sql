-- ============================================================================
--  0016_m1b_d2a_audit_write_and_lineage_ROLLBACK.sql          (M1-B / D2a — Rev 2.2)
--
--  TARGET : V2 / yav2-dev ONLY — ogjrwemjefvccpyjwxuo
--  RUNTIME: Supabase SQL Editor compatible (no psql meta-commands).
--
--  Drops ONLY the objects 0016 created. Because 0016 is purely additive, this
--  restores the exact prior (post-0015) state:
--    * drops the general write-audit helper public.audit_write_event
--      (EXACT Rev-2 signature: text,text,text,text,uuid,jsonb — the caller-controlled
--      event_category parameter was removed in Rev 2);
--    * drops the 2 partial unique indexes;
--    * drops the 4 lineage columns on client_persons and the 3 rule-identity
--      columns on client_remediation_flags;
--    * deletes ONLY the 6 additive family audit_event_contract rows (the 12 M1-A
--      events and the two read events are untouched).
--
--  It changes NO client, tracker, financial, calendar, audit_log or legacy row,
--  and does not touch migration 0014 or 0015's objects (beyond the columns 0016
--  itself added to two 0015 tables).
--
--  ⚠ WHEN THIS ROLLBACK IS SAFE:
--    * SAFE while client_persons / client_remediation_flags hold NO backfilled or
--      populated rows that depend on these columns (D2a adds the columns but writes
--      no data; D3/D4 are not yet authored/executed). At the D2a stage the columns
--      are empty, so DROP COLUMN loses nothing.
--    * AFTER D3/D4 populate lineage/rule data, DO NOT run this — dropping the
--      columns would destroy lineage/idempotency identity. Use BACKUP + FORWARD-FIX.
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

-- Indexes (explicit; also dropped implicitly with their columns, but be explicit).
DROP INDEX IF EXISTS public.client_persons_source_uq;
DROP INDEX IF EXISTS public.client_remediation_flags_open_uq;

-- Lineage columns on client_persons.
ALTER TABLE public.client_persons
  DROP COLUMN IF EXISTS source_system,
  DROP COLUMN IF EXISTS source_ref,
  DROP COLUMN IF EXISTS source_hash,
  DROP COLUMN IF EXISTS backfill_batch_id;

-- Rule-identity columns on client_remediation_flags.
ALTER TABLE public.client_remediation_flags
  DROP COLUMN IF EXISTS rule_code,
  DROP COLUMN IF EXISTS rule_version,
  DROP COLUMN IF EXISTS batch_id;

-- General write-audit helper (EXACT Rev-2 6-argument signature).
DROP FUNCTION IF EXISTS public.audit_write_event(text,text,text,text,uuid,jsonb);

-- Additive family audit contract rows only (never the pre-existing events).
DELETE FROM public.audit_event_contract
WHERE event_name IN ('person.changed','identifier.changed','contact.changed',
  'address.changed','relationship.changed','gst_detail.changed');

COMMIT;
