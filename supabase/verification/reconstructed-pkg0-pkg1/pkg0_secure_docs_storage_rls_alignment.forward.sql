-- ############################################################################
-- RECONSTRUCTED — NOT RE-APPLIED (repository traceability only)
-- ----------------------------------------------------------------------------
-- Byte-faithful transcription of the SQL ACTUALLY APPLIED to the authorised dev
-- project yav2-dev (ogjrwemjefvccpyjwxuo) as tracked migration:
--     version 20260808060349   name pkg0_secure_docs_storage_rls_alignment
-- Source of truth: supabase_migrations.schema_migrations.statements
--     (captured read-only on 2026-08-08; the live database ALREADY contains these objects).
--
-- DO NOT execute this file against yav2-dev — the policies already exist and
-- CREATE POLICY (no IF NOT EXISTS, preserved verbatim) would error. This file is
-- for code review / rollback pairing only. No database change was made to produce it.
-- Rollback: pkg0_secure_docs_storage_rls_alignment.rollback.sql
-- ############################################################################

-- ============================================================================
-- PACKAGE 0 — Align secure-docs storage object policies with documents-table intent
-- Target: yav2-dev (ogjrwemjefvccpyjwxuo) ONLY.
-- Keeps admin/manager ALL (incl. delete). Adds Executive upload + Exec/Staff/Viewer read.
-- No physical-delete grant for non-admin/manager. Additive only.
-- ============================================================================

-- Executive may upload objects into secure-docs (mirrors documents_executive_insert)
create policy secure_docs_exec_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'secure-docs' and is_active_user() and get_portal_role() = 'Executive');

-- Exec/Staff/Viewer may read objects (needed for signed URL / download); admin/manager already covered by ALL
create policy secure_docs_read on storage.objects
  for select to authenticated
  using (bucket_id = 'secure-docs' and is_active_user()
         and get_portal_role() = any (array['Executive','Staff','Viewer']));
