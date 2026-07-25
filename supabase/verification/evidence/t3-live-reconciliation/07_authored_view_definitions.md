# Supplementary evidence — authored view definitions (V2, PJ)

Environment: Supabase V2 / yav2-dev `ogjrwemjefvccpyjwxuo`. Collection: PJ-executed read-only.

## Attestation received (this handoff)
PJ confirmed that **full live definitions were captured** for the three authored views, and that
**all three are ordinary VIEW relations** (relkind = 'v'):
- `public.v_client_compliance_summary`
- `public.v_firm_dashboard`
- `public.v_overdue_ageing`

This **supersedes** the earlier bundle file `06_views_and_relation_absence.md`, whose §6 query had
returned the *absent* relation set (`v_client_overview`, `v_client_service_applicability`,
`v_sensitive_audit_log`) rather than these authored views. The three authored views are **PRESENT** live.

## Transmission gap (honest record)
The **raw `pg_get_viewdef` text** for the three views was **not transmitted to Terminal 1** in this handoff
(only the attestation above). Therefore T1 can confirm **existence + ordinary-view relkind**, but has **not
independently byte-verified** the live definition text against source. See report §11a and the "specific
corrections" in §14. No live definition text is fabricated here.

## Source definitions (for the eventual byte-comparison) — `supabase/migrations/0009_views.sql`
All three authored `WITH (security_invoker='on')`. Column contracts:
- `v_firm_dashboard` → category,total,completed,overdue,pending,**due_in_7_days**,waiting_client,partner_approval_pending (GROUP BY category)
- `v_client_compliance_summary` → client_id,fy_label,total_compliances,completed,overdue,pending,**due_soon**,not_applicable,waiting_client,partner_approval_pending,review_pending,filing_pending (GROUP BY client_id,fy_label)
- `v_overdue_ageing` → client_id,category,due_date,days_overdue,ageing_bucket
