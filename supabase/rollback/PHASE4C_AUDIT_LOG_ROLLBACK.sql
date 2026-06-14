-- #####################################################################
-- #  PHASE 4C AUDIT LOG — MANUAL ROLLBACK (version-neutral)
-- #  *** MANUAL ONLY — DESTRUCTIVE — DO NOT PLACE IN supabase/migrations ***
-- #####################################################################
-- MANUAL ONLY (in supabase/rollback/, never auto-applied).
-- DESTRUCTIVE: drops Phase 4C objects + ALL audit history. EXPORT first.
-- SCOPE: branch / pre-production only.
-- SAFETY: drops ONLY Phase 4C objects; revokes only Phase 4C-added grants
--   on existing tables/schemas; never touches activity_logs/clients/team/
--   business tables. Best-effort via IF EXISTS; complete partial-state
--   safety not claimed. Manual intervention may be required.
-- #####################################################################

-- 1) Functions (reverse dependency order)
DROP FUNCTION IF EXISTS public.get_sensitive_audit_logs(timestamptz,timestamptz,int,int,text,uuid);
DROP FUNCTION IF EXISTS public._write_read_audit(text,uuid,jsonb);
DROP FUNCTION IF EXISTS public.log_audit_event_trusted_backend(text,uuid,uuid,text,text,text,text,jsonb);
DROP FUNCTION IF EXISTS public._record_audit_failure(text,text,text[],text);
DROP FUNCTION IF EXISTS public.audit_validate_event(text,text,text,text,uuid,uuid,jsonb);
DROP FUNCTION IF EXISTS public.audit_field_format_ok(text,jsonb);
DROP FUNCTION IF EXISTS public.audit_is_uuid(text);
DROP FUNCTION IF EXISTS public.audit_contains_secret(text);
DROP FUNCTION IF EXISTS public.staff_can_access_client(uuid);
DROP FUNCTION IF EXISTS public.get_app_role_for_user(uuid);
DROP FUNCTION IF EXISTS public.get_app_role();

-- 2) Revoke Phase 4C grants on EXISTING tables
DO $$
BEGIN
  IF to_regclass('public.team') IS NOT NULL THEN REVOKE SELECT ON TABLE public.team FROM audit_owner, audit_writer; END IF;
  IF to_regclass('public.team_client_access') IS NOT NULL THEN REVOKE SELECT ON TABLE public.team_client_access FROM audit_owner; END IF;
  IF to_regclass('public.clients') IS NOT NULL THEN REVOKE SELECT ON TABLE public.clients FROM audit_owner, audit_writer; END IF;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'rollback: table revoke: %, continuing', SQLERRM;
END
$$;

-- 3) Policies (only if table exists)
DO $$
BEGIN
  IF to_regclass('public.audit_log') IS NOT NULL THEN
    DROP POLICY IF EXISTS "audit_writer_insert" ON public.audit_log;
    DROP POLICY IF EXISTS "audit_owner_select" ON public.audit_log;
    DROP POLICY IF EXISTS "no_update_all" ON public.audit_log;
    DROP POLICY IF EXISTS "no_delete_all" ON public.audit_log;
    DROP POLICY IF EXISTS "no_anon_all" ON public.audit_log;
    DROP POLICY IF EXISTS "no_authenticated_direct" ON public.audit_log;
  END IF;
  IF to_regclass('public.audit_ingestion_failures') IS NOT NULL THEN
    DROP POLICY IF EXISTS "fail_writer_insert" ON public.audit_ingestion_failures;
    DROP POLICY IF EXISTS "fail_owner_select" ON public.audit_ingestion_failures;
    DROP POLICY IF EXISTS "fail_no_update_all" ON public.audit_ingestion_failures;
    DROP POLICY IF EXISTS "fail_no_delete_all" ON public.audit_ingestion_failures;
    DROP POLICY IF EXISTS "fail_no_anon_all" ON public.audit_ingestion_failures;
    DROP POLICY IF EXISTS "fail_no_authenticated_direct" ON public.audit_ingestion_failures;
  END IF;
  IF to_regclass('public.audit_event_contract') IS NOT NULL THEN
    DROP POLICY IF EXISTS "contract_owner_select" ON public.audit_event_contract;
    DROP POLICY IF EXISTS "contract_writer_select" ON public.audit_event_contract;
    DROP POLICY IF EXISTS "contract_no_anon" ON public.audit_event_contract;
    DROP POLICY IF EXISTS "contract_no_authenticated" ON public.audit_event_contract;
  END IF;
END
$$;

-- 4) Tables (DESTRUCTIVE — export first). Indexes drop with their tables.
DROP TABLE IF EXISTS public.audit_ingestion_failures;
DROP TABLE IF EXISTS public.audit_event_contract;
DROP TABLE IF EXISTS public.audit_log;

-- 5) Schema grants added by Phase 4C
DO $$
BEGIN
  REVOKE USAGE ON SCHEMA public FROM audit_owner, audit_writer;
  REVOKE USAGE ON SCHEMA auth   FROM audit_owner, audit_writer;
  REVOKE EXECUTE ON FUNCTION auth.uid() FROM audit_owner, audit_writer;
EXCEPTION WHEN undefined_object THEN
  RAISE WARNING 'rollback: schema revoke: role or object not found, skipping: %', SQLERRM;
END
$$;

-- 6) Roles — drop only if they own nothing remaining
DO $$
DECLARE v_owns int;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='audit_writer') THEN
    SELECT (SELECT count(*) FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner WHERE r.rolname='audit_writer')
         + (SELECT count(*) FROM pg_proc  p JOIN pg_roles r ON r.oid=p.proowner WHERE r.rolname='audit_writer') INTO v_owns;
    IF v_owns=0 THEN DROP ROLE audit_writer; ELSE RAISE WARNING 'audit_writer still owns % object(s); manual intervention required', v_owns; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='audit_owner') THEN
    SELECT (SELECT count(*) FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner WHERE r.rolname='audit_owner')
         + (SELECT count(*) FROM pg_proc  p JOIN pg_roles r ON r.oid=p.proowner WHERE r.rolname='audit_owner') INTO v_owns;
    IF v_owns=0 THEN DROP ROLE audit_owner; ELSE RAISE WARNING 'audit_owner still owns % object(s); manual intervention required', v_owns; END IF;
  END IF;
END
$$;

-- MANUAL-INTERVENTION: reassign/drop any remaining owned objects first.
-- Verify activity_logs and business tables remain untouched.
