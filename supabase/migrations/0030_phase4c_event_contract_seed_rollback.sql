-- ############################################################################
-- ##  0030 ROLLBACK — remove ONLY the 21 events 0030 inserted                  ##
-- ############################################################################
-- PROVENANCE-SAFE: 0030 inserts exactly the 21 NON-read events (its fail-closed
-- precondition proved they were absent). This rollback deletes ONLY those 21.
-- It DELIBERATELY EXCLUDES audit.log.read_requested and audit.log.read_completed —
-- those were PRE-EXISTING, load-bearing (17 audit_log rows each), and NOT created by
-- 0030, so they must NEVER be deleted by this rollback. No RLS/grant change.
-- ############################################################################

BEGIN;

DELETE FROM public.audit_event_contract
WHERE event_name = ANY (ARRAY[
  'auth.session.login_success','auth.session.login_failed','auth.session.logout','auth.session.revoked',
  'auth.password_reset.requested','auth.password_reset.completed','auth.mfa.changed',
  'user.account.created','user.account.deactivated','user.account.reactivated','user.role.changed','user.permission.changed',
  'access.client.denied','access.cross_client.attempted','data.bulk_export','data.mass_download',
  'security.setting.changed','security.rls_policy.changed','audit.log.exported','audit.ingestion.failed','whatsapp.access.denied']);
-- NOTE: 'audit.log.read_requested' and 'audit.log.read_completed' are intentionally
-- NOT in this list — 0030 did not create them; they are preserved.

COMMIT;
-- ############################################################################
-- ##  END 0030 ROLLBACK                                                        ##
-- ############################################################################
