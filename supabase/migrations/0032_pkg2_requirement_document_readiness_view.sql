-- ============================================================================
-- 0032 — PACKAGE 2 — Document readiness read contract (APPLIED via Supabase
-- apply_migration to yav2-dev (ogjrwemjefvccpyjwxuo) on 2026-08-10; version
-- pkg2_requirement_document_readiness_view). Additive, read-only. No data change.
--
-- v_requirement_document_readiness: one row per compliance requirement across the
-- linkable trackers, joined to the CURRENT document_requirements link + CURRENT
-- document. Archived/superseded documents (is_current=false) do NOT satisfy
-- readiness. SECURITY INVOKER — caller RLS applies. llp/payroll excluded (not in
-- the document_requirements reftype CHECK).
-- Rollback: 0032_pkg2_requirement_document_readiness_view_rollback.sql
-- ============================================================================
create or replace view public.v_requirement_document_readiness
with (security_invoker = on) as
with reqs as (
  select 'financials'::text as requirement_ref_type, ft.id as requirement_ref_id,
         ft.client_id::text as client_id, c0.name as client_name, ft.fy_label::text as fy_label,
         null::text as period, ft.doc_type as requirement_label, ft.doc_type as doc_type,
         ft.status::text as compliance_status, ft.due_date as due_date
    from public.financials_tracker ft left join public.clients c0 on c0.client_id = ft.client_id
  union all
  select 'gst', g.id, c.client_id, c.name, g.fy_label::text, g.period::text,
         (g.return_type::text || coalesce(' '||g.period,'')), g.return_type::text, g.status::text,
         coalesce(g.individual_due_date, g.extended_due_date, g.standard_due_date)
    from public.gst_tracker g left join public.clients c on c.id = g.client_id
  union all
  select 'income_tax', it.id, c.client_id, c.name, it.fy_label::text, null,
         'Income Tax Return', 'Income Tax Return', it.status::text,
         coalesce(it.individual_due_date, it.extended_due_date, it.standard_due_date)
    from public.income_tax_tracker it left join public.clients c on c.id = it.client_id
  union all
  select 'tds', t.id, c.client_id, c.name, t.fy_label::text, coalesce(t.period_label, t.quarter::text),
         (t.form_type::text || coalesce(' '||t.quarter::text,'')), t.form_type::text, t.status::text,
         coalesce(t.individual_due_date, t.extended_due_date, t.standard_due_date)
    from public.tds_tracker t left join public.clients c on c.id = t.client_id
  union all
  select 'roc', r.id, c.client_id, c.name, r.fy_label::text, null,
         ('ROC '||r.filing_type::text), r.filing_type::text, r.status::text,
         coalesce(r.individual_due_date, r.extended_due_date, r.standard_due_date)
    from public.roc_tracker r left join public.clients c on c.id = r.client_id
  union all
  select 'audit', a.id, c.client_id, c.name, a.fy_label::text, null,
         'Audit', 'Audit', a.status::text,
         coalesce(a.individual_due_date, a.extended_due_date, a.standard_due_date)
    from public.audit_tracker a left join public.clients c on c.id = a.client_id
  union all
  select 'notice', n.id, c.client_id, c.name, n.fy_label::text, null,
         'Notice Response', 'Notice', n.status::text,
         coalesce(n.individual_due_date, n.extended_due_date, n.response_due_date)
    from public.notice_tracker n left join public.clients c on c.id = n.client_id
  union all
  select 'accounting', ac.id, c.client_id, c.name, ac.fy_label::text, ac.period_label::text,
         ('Accounting '||coalesce(ac.period_label,'')), 'Accounting', ac.status::text, null::date
    from public.accounting_tracker ac left join public.clients c on c.id = ac.client_id
)
select
  r.requirement_ref_type, r.requirement_ref_id, r.client_id, r.client_name, r.fy_label, r.period,
  r.requirement_label, r.doc_type, r.compliance_status, r.due_date,
  (d.id is not null) as is_available,
  case when d.id is not null then 'Available' else 'Missing' end as readiness,
  d.id as current_document_id, d.doc_name as current_document_name, d.doc_type as current_document_type,
  coalesce(vc.version_count, 0) as version_count,
  d.created_at as latest_upload_at, d.uploaded_by as latest_uploaded_by
from reqs r
left join public.document_requirements dr
       on dr.requirement_ref_type = r.requirement_ref_type
      and dr.requirement_ref_id   = r.requirement_ref_id
      and dr.is_current = true
left join public.documents d on d.id = dr.document_id and d.is_current = true
left join lateral (
  select count(distinct dr2.document_id) as version_count
  from public.document_requirements dr2
  where dr2.requirement_ref_type = r.requirement_ref_type
    and dr2.requirement_ref_id   = r.requirement_ref_id
) vc on true;

grant select on public.v_requirement_document_readiness to authenticated;
