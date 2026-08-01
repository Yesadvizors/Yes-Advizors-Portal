-- ############################################################################
-- ##  0031 ROLLBACK — RESTORE the prior (INSECURE) audit-table grants          ##
-- ##  ⚠ SECURITY RISK: this re-grants the broad direct privileges that 0031     ##
-- ##  removed (anon/authenticated/service_role gain DELETE/INSERT/SELECT/UPDATE ##
-- ##  and TRUNCATE/REFERENCES/TRIGGER/MAINTAIN on the audit tables — e.g. anon   ##
-- ##  could TRUNCATE the audit log). Restores the pre-0031 exposure exactly.     ##
-- ##                                                                            ##
-- ##  DO NOT run this automatically merely because a later migration failed.    ##
-- ##  It requires EXPLICIT separate PJ approval; the secure state is NO grant.   ##
-- ##  PUBLIC had NO direct grant before 0031, so PUBLIC is intentionally NOT     ##
-- ##  restored here.                                                            ##
-- ############################################################################

BEGIN;

GRANT ALL ON TABLE public.audit_log               TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.audit_event_contract    TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.audit_ingestion_failures TO anon, authenticated, service_role;

COMMIT;
-- ############################################################################
-- ##  END 0031 ROLLBACK — broad grants restored (INSECURE; PJ-approved only)   ##
-- ############################################################################
