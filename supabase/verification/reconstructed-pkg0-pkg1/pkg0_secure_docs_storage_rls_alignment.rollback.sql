-- ############################################################################
-- ROLLBACK for pkg0_secure_docs_storage_rls_alignment (version 20260808060349)
-- ----------------------------------------------------------------------------
-- RECONSTRUCTED / AUTHORED reverse of the applied Package 0 migration.
-- NOT executed. Target (if ever authorised): yav2-dev (ogjrwemjefvccpyjwxuo) ONLY.
--
-- Reverses ONLY the two policies that Package 0 added. It INTENTIONALLY PRESERVES
-- secure_docs_admin_manager_all, which PRE-EXISTED Package 0 (original live
-- secure-docs provisioning) and is NOT part of this migration's footprint.
-- After this rollback, secure-docs returns to admin/manager-only access.
--
-- Run only under explicit PJ authorisation for a live change. No data loss
-- (storage objects and the documents/document_requirements rows are untouched).
-- ############################################################################

drop policy if exists secure_docs_read       on storage.objects;
drop policy if exists secure_docs_exec_insert on storage.objects;

-- NOTE: secure_docs_admin_manager_all is deliberately NOT dropped (pre-existing).
