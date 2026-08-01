-- ############################################################################
-- ##  0030 ROLLBACK — remove ONLY the 23 Phase 4C security/auth events         ##
-- ##  EXACT inverse: because 0030's fail-closed precondition proved all 23 were ##
-- ##  ABSENT before insertion, 0030 owns every one of them, so this DELETE can  ##
-- ##  remove exactly those 23 without ever touching a pre-existing row. It      ##
-- ##  alters no RLS/grant and no base business-event row.                       ##
-- ############################################################################
BEGIN;
DELETE FROM public.audit_event_contract
WHERE event_name = ANY (ARRAY[
  'auth.session.login_success','auth.session.login_failed','auth.session.logout','auth.session.revoked',
  'auth.password_reset.requested','auth.password_reset.completed','auth.mfa.changed',
  'user.account.created','user.account.deactivated','user.account.reactivated','user.role.changed','user.permission.changed',
  'access.client.denied','access.cross_client.attempted','data.bulk_export','data.mass_download',
  'security.setting.changed','security.rls_policy.changed','audit.log.read_requested','audit.log.read_completed',
  'audit.log.exported','audit.ingestion.failed','whatsapp.access.denied']);
COMMIT;
