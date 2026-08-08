-- ############################################################################
-- RECONSTRUCTED — NOT RE-APPLIED (repository traceability only)
-- ----------------------------------------------------------------------------
-- Byte-faithful transcription of the SQL ACTUALLY APPLIED to the authorised dev
-- project yav2-dev (ogjrwemjefvccpyjwxuo) as tracked migration:
--     version 20260808061628   name pkg1_document_source_of_truth
-- Source of truth: supabase_migrations.schema_migrations.statements
--     (captured read-only on 2026-08-08; the live database ALREADY contains these objects).
--
-- DO NOT execute this file against yav2-dev — the objects already exist. The
-- ALTER TABLE ... ADD CONSTRAINT documents_supersedes_fk has no IF NOT EXISTS
-- (preserved verbatim) and would error on re-run. For code review / rollback
-- pairing only. No database change was made to produce it.
-- Rollback: pkg1_document_source_of_truth.rollback.sql
-- ############################################################################

-- ============================================================================
-- PACKAGE 1 — Document Source of Truth + Integrity
-- Target: yav2-dev (ogjrwemjefvccpyjwxuo) ONLY. Additive only.
-- Linkage is UUID requirement_ref_id <-> UUID document_id (NOT the client key).
-- Legacy compatibility retained: financials_tracker.document_id, documents.compliance_ref_id.
-- ============================================================================

-- 1) documents: versioning + dedup + retirement metadata --------------------
alter table public.documents
  add column if not exists content_hash            text,
  add column if not exists is_current              boolean not null default true,
  add column if not exists supersedes_document_id  uuid,
  add column if not exists superseded_at           timestamptz,
  add column if not exists superseded_by           text;

alter table public.documents
  add constraint documents_supersedes_fk
  foreign key (supersedes_document_id)
  references public.documents(id) on delete set null;

create index if not exists idx_documents_content_hash
  on public.documents(content_hash) where content_hash is not null;
create index if not exists idx_documents_client_current
  on public.documents(client_id, is_current);
create index if not exists idx_documents_compliance_ref
  on public.documents(compliance_ref_id) where compliance_ref_id is not null;

-- 2) document_requirements: requirement <-> document (M:N, versioned) --------
create table if not exists public.document_requirements (
  id                   uuid primary key default gen_random_uuid(),
  requirement_ref_type text not null,
  requirement_ref_id   uuid not null,
  document_id          uuid not null references public.documents(id) on delete cascade,
  is_current           boolean not null default true,
  linked_by            text,
  linked_at            timestamptz not null default now(),
  constraint document_requirements_reftype_chk check (requirement_ref_type in
    ('financials','gst','income_tax','tds','roc','audit','notice','accounting','other'))
);

create unique index if not exists uq_docreq_req_doc
  on public.document_requirements(requirement_ref_type, requirement_ref_id, document_id);
create unique index if not exists uq_docreq_one_current
  on public.document_requirements(requirement_ref_type, requirement_ref_id)
  where is_current;
create index if not exists idx_docreq_document
  on public.document_requirements(document_id);
create index if not exists idx_docreq_requirement
  on public.document_requirements(requirement_ref_type, requirement_ref_id);

-- 3) RLS on document_requirements -------------------------------------------
alter table public.document_requirements enable row level security;

create policy docreq_admin_manager_all on public.document_requirements
  for all to authenticated
  using (is_admin_or_manager()) with check (is_admin_or_manager());
create policy docreq_exec_insert on public.document_requirements
  for insert to authenticated
  with check (is_active_user() and get_portal_role() = 'Executive');
create policy docreq_read on public.document_requirements
  for select to authenticated
  using (is_active_user() and get_portal_role() = any (array['Executive','Staff','Viewer']));

-- 4) Backfill existing convention into links (live expectation: 0 + 0 rows) --
insert into public.document_requirements (requirement_ref_type, requirement_ref_id, document_id, is_current, linked_by)
select 'financials', ft.id, ft.document_id, true, 'backfill:pkg1'
from public.financials_tracker ft
where ft.document_id is not null
  and exists (select 1 from public.documents d where d.id = ft.document_id)
on conflict (requirement_ref_type, requirement_ref_id, document_id) do nothing;

insert into public.document_requirements (requirement_ref_type, requirement_ref_id, document_id, is_current, linked_by)
select case d.compliance_type
         when 'income_tax' then 'income_tax' when 'gst' then 'gst' when 'tds' then 'tds'
         when 'roc' then 'roc' when 'audit' then 'audit' when 'financials' then 'financials'
         when 'notice' then 'notice' when 'accounting' then 'accounting' else 'other' end,
       d.compliance_ref_id, d.id, true, 'backfill:pkg1'
from public.documents d
where d.scope='compliance' and d.compliance_ref_id is not null
on conflict (requirement_ref_type, requirement_ref_id, document_id) do nothing;

-- 5) Governed RPCs ----------------------------------------------------------
create or replace function public.document_link(
  p_requirement_ref_type text, p_requirement_ref_id uuid,
  p_document_id uuid, p_make_current boolean default false
) returns uuid language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NO_AUTH_CONTEXT'; end if;
  if not is_active_user() then raise exception 'NOT_AUTHORISED_INACTIVE'; end if;
  if not (is_admin_or_manager() or get_portal_role() = 'Executive') then raise exception 'NOT_AUTHORISED'; end if;

  if p_make_current then
    update public.document_requirements set is_current = false
     where requirement_ref_type = p_requirement_ref_type
       and requirement_ref_id = p_requirement_ref_id and is_current;
  end if;

  insert into public.document_requirements(requirement_ref_type, requirement_ref_id, document_id, is_current, linked_by)
  values (p_requirement_ref_type, p_requirement_ref_id, p_document_id, coalesce(p_make_current,false), coalesce(auth.uid()::text,'system'))
  on conflict (requirement_ref_type, requirement_ref_id, document_id)
  do update set is_current = (document_requirements.is_current or excluded.is_current);

  return p_document_id;
end $$;

create or replace function public.document_replace(
  p_requirement_ref_type text, p_requirement_ref_id uuid,
  p_new_document_id uuid, p_sync_financials boolean default true
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_prev uuid;
begin
  if auth.uid() is null then raise exception 'NO_AUTH_CONTEXT'; end if;
  if not is_active_user() then raise exception 'NOT_AUTHORISED_INACTIVE'; end if;
  if not (is_admin_or_manager() or get_portal_role() = 'Executive') then raise exception 'NOT_AUTHORISED'; end if;

  select dr.document_id into v_prev
  from public.document_requirements dr
  where dr.requirement_ref_type = p_requirement_ref_type
    and dr.requirement_ref_id = p_requirement_ref_id and dr.is_current
  limit 1;

  update public.document_requirements set is_current = false
   where requirement_ref_type = p_requirement_ref_type
     and requirement_ref_id = p_requirement_ref_id and is_current;

  if v_prev is not null and v_prev <> p_new_document_id then
    update public.documents
       set is_current = false, superseded_at = now(), superseded_by = coalesce(auth.uid()::text,'system')
     where id = v_prev;
    update public.documents set supersedes_document_id = v_prev where id = p_new_document_id;
  end if;

  insert into public.document_requirements(requirement_ref_type, requirement_ref_id, document_id, is_current, linked_by)
  values (p_requirement_ref_type, p_requirement_ref_id, p_new_document_id, true, coalesce(auth.uid()::text,'system'))
  on conflict (requirement_ref_type, requirement_ref_id, document_id) do update set is_current = true;

  update public.documents set is_current = true where id = p_new_document_id;

  if p_sync_financials and p_requirement_ref_type = 'financials' then
    update public.financials_tracker
       set document_id = p_new_document_id, status = 'Uploaded', updated_at = now()
     where id = p_requirement_ref_id;
  end if;

  -- AUDIT: deferred to Package 4 (current audit_write_event is admin/manager-only + contract-gated).
  return p_new_document_id;
end $$;

create or replace function public.document_archive(p_document_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NO_AUTH_CONTEXT'; end if;
  if not is_active_user() then raise exception 'NOT_AUTHORISED_INACTIVE'; end if;
  if not (is_admin_or_manager() or get_portal_role() = 'Executive') then raise exception 'NOT_AUTHORISED'; end if;
  update public.documents
     set is_current = false, superseded_at = now(), superseded_by = coalesce(auth.uid()::text,'system')
   where id = p_document_id;
  update public.document_requirements set is_current = false where document_id = p_document_id;
end $$;

revoke all on function public.document_link(text,uuid,uuid,boolean)    from public, anon;
revoke all on function public.document_replace(text,uuid,uuid,boolean) from public, anon;
revoke all on function public.document_archive(uuid)                   from public, anon;
grant execute on function public.document_link(text,uuid,uuid,boolean)    to authenticated;
grant execute on function public.document_replace(text,uuid,uuid,boolean) to authenticated;
grant execute on function public.document_archive(uuid)                   to authenticated;
