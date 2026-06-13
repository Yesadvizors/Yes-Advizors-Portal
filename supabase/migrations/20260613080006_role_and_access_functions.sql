-- =====================================================================
-- Phase 4C v7 — 20260613070007_role_and_access_functions.sql
-- STATUS: DRAFT / NOT APPLIED. Do not run. For review only.
-- =====================================================================
-- get_app_role(): UNKNOWN ROLES FAIL CLOSED (finding #9). No ELSE 'staff'.
--   Explicit mapping of every known portal_role; anything else -> 'denied'.
-- get_app_role_for_user(uuid): resolve role for a SPECIFIC verified user id
--   (finding #4) so user-attributed events store a consistent
--   actor_user_id + actor_app_role. Validates exactly one active team row
--   and an approved role; else 'denied'.
-- staff_can_access_client(uuid): global only for admin; assigned-only for
--   manager/staff/executive; viewer/intern/etc -> no access. Fail closed
--   on duplicate identity.
-- =====================================================================

CREATE FUNCTION public.get_app_role()
RETURNS text LANGUAGE plpgsql STABLE
SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_count int; v_admin boolean; v_portal text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'anon'; END IF;
  SELECT count(*) INTO v_count FROM public.team t WHERE t.auth_user_id=auth.uid() AND t.is_active=true;
  IF v_count <> 1 THEN RETURN 'anon'; END IF;  -- 0 or duplicate -> fail closed
  SELECT t.is_admin, t.portal_role::text INTO v_admin, v_portal
    FROM public.team t WHERE t.auth_user_id=auth.uid() AND t.is_active=true;
  IF v_admin THEN RETURN 'admin'; END IF;
  RETURN CASE v_portal
    WHEN 'Admin' THEN 'admin'
    WHEN 'Manager' THEN 'manager'
    WHEN 'Executive' THEN 'staff'
    WHEN 'Staff' THEN 'staff'
    WHEN 'Viewer' THEN 'viewer'
    ELSE 'denied'           -- unknown/unsupported role FAILS CLOSED
  END;
END;
$$;
ALTER FUNCTION public.get_app_role() OWNER TO audit_owner;
REVOKE EXECUTE ON FUNCTION public.get_app_role() FROM PUBLIC, anon, authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.get_app_role() TO authenticated;
COMMENT ON FUNCTION public.get_app_role() IS 'Phase 4C v7: explicit role map; unknown roles -> denied; duplicate/absent identity -> anon.';

-- Resolve role for a specific verified user id (used by user-attributed writer).
CREATE FUNCTION public.get_app_role_for_user(p_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE
SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_count int; v_admin boolean; v_portal text;
BEGIN
  IF p_user_id IS NULL THEN RETURN 'denied'; END IF;
  SELECT count(*) INTO v_count FROM public.team t WHERE t.auth_user_id=p_user_id AND t.is_active=true;
  IF v_count <> 1 THEN RETURN 'denied'; END IF;   -- absent or duplicate -> fail closed
  SELECT t.is_admin, t.portal_role::text INTO v_admin, v_portal
    FROM public.team t WHERE t.auth_user_id=p_user_id AND t.is_active=true;
  IF v_admin THEN RETURN 'admin'; END IF;
  RETURN CASE v_portal
    WHEN 'Admin' THEN 'admin'
    WHEN 'Manager' THEN 'manager'
    WHEN 'Executive' THEN 'staff'
    WHEN 'Staff' THEN 'staff'
    WHEN 'Viewer' THEN 'viewer'
    ELSE 'denied'
  END;
END;
$$;
ALTER FUNCTION public.get_app_role_for_user(uuid) OWNER TO audit_owner;
REVOKE EXECUTE ON FUNCTION public.get_app_role_for_user(uuid) FROM PUBLIC, anon, authenticated, service_role;
-- finding #4: arbitrary-user role lookup is INTERNAL ONLY. Not callable by
-- authenticated/anon/service_role/PUBLIC. Granted only to the audit roles
-- that need it (audit_owner reader path; audit_writer read-audit helper).
GRANT  EXECUTE ON FUNCTION public.get_app_role_for_user(uuid) TO audit_owner, audit_writer;
COMMENT ON FUNCTION public.get_app_role_for_user(uuid) IS 'Phase 4C v7: role for a specific verified user id; fails closed (denied) on absent/duplicate/unknown.';

CREATE FUNCTION public.staff_can_access_client(p_client_uuid uuid)
RETURNS boolean LANGUAGE plpgsql STABLE
SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_count int; v_team_id uuid; v_admin boolean; v_portal text; v_role text;
BEGIN
  IF auth.uid() IS NULL OR p_client_uuid IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO v_count FROM public.team t WHERE t.auth_user_id=auth.uid() AND t.is_active=true;
  IF v_count <> 1 THEN RETURN false; END IF;
  SELECT t.id, t.is_admin, t.portal_role::text INTO v_team_id, v_admin, v_portal
    FROM public.team t WHERE t.auth_user_id=auth.uid() AND t.is_active=true;
  IF v_admin OR v_portal='Admin' THEN RETURN true; END IF;
  -- only these non-admin roles may hold assigned-client access; others fail closed
  IF v_portal NOT IN ('Manager','Executive','Staff') THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.team_client_access tca
    JOIN public.clients c ON c.client_id=tca.client_id
    WHERE tca.team_member_id=v_team_id AND c.id=p_client_uuid
  );
END;
$$;
ALTER FUNCTION public.staff_can_access_client(uuid) OWNER TO audit_owner;
REVOKE EXECUTE ON FUNCTION public.staff_can_access_client(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.staff_can_access_client(uuid) TO authenticated;
COMMENT ON FUNCTION public.staff_can_access_client(uuid) IS 'Phase 4C v7: global only for admin; assigned-only for Manager/Executive/Staff; others fail closed.';
