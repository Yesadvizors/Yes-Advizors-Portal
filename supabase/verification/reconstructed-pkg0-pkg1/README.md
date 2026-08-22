# Reconstructed traceability — Package 0 & Package 1 (document source-of-truth)

**Status:** RECONSTRUCTED FROM LIVE APPLIED DEFINITIONS — **not** re-applied. No database change was made to produce these files.
**Authorised project:** yav2-dev `ogjrwemjefvccpyjwxuo` ONLY. **Never** V1 (`zcszesuvjrryxtigjglt`) or production.
**Captured:** 2026-08-08 (read-only), by Claude Code under explicit PJ authorisation.

## Why this folder exists

Package 0 and Package 1 were applied directly to yav2-dev via Supabase `apply_migration` in a
prior session, and were recorded **only** in the live `supabase_migrations.schema_migrations`
ledger — there were **no forward or rollback `.sql` files in the repository**. These files close
that traceability gap so the exact applied SQL is version-controlled and code-reviewable, and so a
rollback path exists on disk.

## Applied migrations (live ledger)

| version | name | forward file | rollback file |
|---|---|---|---|
| `20260808060349` | `pkg0_secure_docs_storage_rls_alignment` | `pkg0_...forward.sql` | `pkg0_...rollback.sql` |
| `20260808061628` | `pkg1_document_source_of_truth` | `pkg1_...forward.sql` | `pkg1_...rollback.sql` |

## Fidelity

- **`*.forward.sql`** — a **byte-faithful transcription** of `schema_migrations.statements` for
  each version. The SQL body is unchanged (not "improved" or made idempotent beyond what was
  applied). A `RECONSTRUCTED — NOT RE-APPLIED` banner is prepended as leading comments only.
- **`*.rollback.sql`** — authored reverse of each forward migration (drop-in-reverse). Marked
  destructive; preserves the pre-existing legacy objects that were **not** part of each package's
  footprint (`secure_docs_admin_manager_all`; `financials_tracker.document_id`;
  `documents.compliance_ref_id`).

## Confirmation the forward files match live definitions

The forward SQL is the applied SQL verbatim, so it matches by construction. Independently
cross-checked read-only against the live catalog on 2026-08-08:

- `documents` columns `content_hash, is_current(NOT NULL default true), supersedes_document_id,
  superseded_at, superseded_by` present; self-FK `documents_supersedes_fk … ON DELETE SET NULL`; indexes
  `idx_documents_content_hash`, `idx_documents_client_current`, `idx_documents_compliance_ref` present.
- `document_requirements` table + PK + FK `→documents(id) ON DELETE CASCADE` + CHECK
  `document_requirements_reftype_chk`; indexes `uq_docreq_req_doc`, `uq_docreq_one_current (WHERE is_current)`,
  `idx_docreq_document`, `idx_docreq_requirement`; RLS enabled with policies
  `docreq_admin_manager_all`, `docreq_exec_insert`, `docreq_read`.
- RPCs `document_link/document_replace/document_archive` — SECURITY DEFINER, `search_path=public`,
  bodies identical to forward file; grants `authenticated, service_role, postgres` EXECUTE, revoked from
  `public`/`anon`.
- Storage policies `secure_docs_exec_insert`, `secure_docs_read` present on `storage.objects`
  (`secure_docs_admin_manager_all` pre-existing, preserved).

Live integrity at capture: 11 documents, 11/11 `is_current = true`, 0 dangling supersedes pointers,
0 duplicate current requirement links, `document_requirements` empty (backfill matched 0 + 0 rows).
