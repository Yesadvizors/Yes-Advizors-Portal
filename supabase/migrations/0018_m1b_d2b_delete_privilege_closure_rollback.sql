-- ============================================================================
--  0018_m1b_d2b_delete_privilege_closure_ROLLBACK.sql       (M1-B / D2b — patch)
--
--  TARGET : V2 / yav2-dev ONLY — ogjrwemjefvccpyjwxuo
--  RUNTIME: Supabase SQL Editor compatible (no psql meta-commands).
--
--  Restores ONLY the DELETE grant that 0018 revoked: GRANT DELETE ON the seven D2b
--  base tables TO authenticated. Restores nothing else, and changes no RPC, RLS
--  policy, data, service_role/postgres privilege, or any other grant.
--
--  ⚠ SECURITY NOTE: re-granting DELETE reopens a direct, unaudited, RLS-only delete
--    path on the client-master base tables (there are no DELETE RLS policies, so
--    this grant alone governs deletion). Use only as a deliberate rollback position.
--
--  Project guard: human attestation only — VISUALLY confirm ogjrwemjefvccpyjwxuo first.
--  ONE transaction; fail-closed guard.
-- ============================================================================

BEGIN;

DO $guard$
BEGIN
  IF current_setting('yav2.confirm_project', true) IS DISTINCT FROM 'ogjrwemjefvccpyjwxuo' THEN
    RAISE EXCEPTION E'STOP: run  SET yav2.confirm_project = ''ogjrwemjefvccpyjwxuo'';  first.';
  END IF;
END
$guard$;

DO $restore$
DECLARE t text;
  tabs text[] := ARRAY['client_persons','client_identifiers','client_contacts','client_addresses',
                       'client_relationships','client_registrations','gst_registration_details'];
BEGIN
  FOREACH t IN ARRAY tabs LOOP
    EXECUTE format('GRANT DELETE ON public.%I TO authenticated', t);
  END LOOP;
END
$restore$;

COMMIT;
