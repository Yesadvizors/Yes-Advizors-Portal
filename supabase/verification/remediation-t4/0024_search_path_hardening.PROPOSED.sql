-- 0024_search_path_hardening.PROPOSED.sql
-- PROPOSED — NOT APPLIED. V-4 remediation: repin the 3 bare-'public' helpers. Target V2 only.
-- Severity: LOW-severity defence-in-depth security hardening.
BEGIN;
ALTER FUNCTION public.get_portal_role()       SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.is_active_user()        SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.is_admin_or_manager()   SET search_path = pg_catalog, public, pg_temp;
COMMIT;
-- Expected: proconfig for the 3 helpers = {search_path=pg_catalog, public, pg_temp}; all 51 functions remain pinned.
