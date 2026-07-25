-- 0024_search_path_hardening.ROLLBACK.PROPOSED.sql
-- EMERGENCY ROLLBACK ONLY — separate PJ approval required. MUST NOT be executed automatically.
-- PROPOSED — NOT APPLIED. Reverses 0024 to the prior bare-'public' search_path. Target V2 only.
BEGIN;
ALTER FUNCTION public.get_portal_role()       SET search_path = public;
ALTER FUNCTION public.is_active_user()        SET search_path = public;
ALTER FUNCTION public.is_admin_or_manager()   SET search_path = public;
COMMIT;
