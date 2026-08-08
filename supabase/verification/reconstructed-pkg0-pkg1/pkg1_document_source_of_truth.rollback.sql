-- ############################################################################
-- ROLLBACK for pkg1_document_source_of_truth (version 20260808061628)
-- ----------------------------------------------------------------------------
-- RECONSTRUCTED / AUTHORED reverse of the applied Package 1 migration.
-- NOT executed. Target (if ever authorised): yav2-dev (ogjrwemjefvccpyjwxuo) ONLY.
--
-- DESTRUCTIVE: drops the additive canonical-document objects. Because the model
-- is additive and legacy conventions were retained, reverting is safe for the
-- legacy path but DOES discard version/link metadata:
--   - all public.document_requirements rows (incl. any 'backfill:pkg1' links)
--   - documents.{content_hash,is_current,supersedes_document_id,superseded_at,superseded_by}
--
-- INTENTIONALLY PRESERVED (pre-existing legacy, NOT part of Package 1's footprint):
--   - public.financials_tracker.document_id
--   - public.documents.compliance_ref_id
--
-- Run only under explicit PJ authorisation for a live change. Reverse order of forward.
-- ############################################################################

-- 5) governed RPCs
drop function if exists public.document_archive(uuid);
drop function if exists public.document_replace(text, uuid, uuid, boolean);
drop function if exists public.document_link(text, uuid, uuid, boolean);

-- 2/3/4) link table (cascade-drops its RLS policies, indexes, CHECK, FK, and all rows)
drop table if exists public.document_requirements;

-- 1) documents indexes added by Package 1
drop index if exists public.idx_documents_compliance_ref;
drop index if exists public.idx_documents_client_current;
drop index if exists public.idx_documents_content_hash;

-- 1) documents self-FK, then the 5 additive columns
alter table public.documents drop constraint if exists documents_supersedes_fk;
alter table public.documents
  drop column if exists superseded_by,
  drop column if exists superseded_at,
  drop column if exists supersedes_document_id,
  drop column if exists is_current,
  drop column if exists content_hash;
