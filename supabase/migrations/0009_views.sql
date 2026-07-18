-- G-2b migration (Tranche 2, Rev1.1 corrected) — AUTHORED NOT APPLIED; reviewed before G-3.
-- 3 views byte-exact from V1 reference (REFERENCE ONLY), UTF-8-correct. KEEP.

-- v_client_compliance_summary (ref L8293-8378)
CREATE VIEW public.v_client_compliance_summary WITH (security_invoker='on') AS
 WITH all_trackers AS (
         SELECT income_tax_tracker.client_id,
            income_tax_tracker.fy_label,
            income_tax_tracker.status,
            'Income Tax'::text AS category,
            COALESCE(income_tax_tracker.individual_due_date, income_tax_tracker.extended_due_date, income_tax_tracker.standard_due_date) AS due_date
           FROM public.income_tax_tracker
        UNION ALL
         SELECT gst_tracker.client_id,
            gst_tracker.fy_label,
            gst_tracker.status,
            'GST'::text,
            COALESCE(gst_tracker.individual_due_date, gst_tracker.extended_due_date, gst_tracker.standard_due_date) AS "coalesce"
           FROM public.gst_tracker
        UNION ALL
         SELECT tds_tracker.client_id,
            tds_tracker.fy_label,
            tds_tracker.status,
            'TDS'::text,
            COALESCE(tds_tracker.individual_due_date, tds_tracker.extended_due_date, tds_tracker.standard_due_date) AS "coalesce"
           FROM public.tds_tracker
        UNION ALL
         SELECT roc_tracker.client_id,
            roc_tracker.fy_label,
            roc_tracker.status,
            'ROC'::text,
            COALESCE(roc_tracker.individual_due_date, roc_tracker.extended_due_date, roc_tracker.standard_due_date) AS "coalesce"
           FROM public.roc_tracker
        UNION ALL
         SELECT llp_tracker.client_id,
            llp_tracker.fy_label,
            llp_tracker.status,
            'LLP'::text,
            COALESCE(llp_tracker.individual_due_date, llp_tracker.extended_due_date, llp_tracker.standard_due_date) AS "coalesce"
           FROM public.llp_tracker
        UNION ALL
         SELECT audit_tracker.client_id,
            audit_tracker.fy_label,
            audit_tracker.status,
            'Audit'::text,
            COALESCE(audit_tracker.individual_due_date, audit_tracker.extended_due_date, audit_tracker.standard_due_date) AS "coalesce"
           FROM public.audit_tracker
        UNION ALL
         SELECT accounting_tracker.client_id,
            accounting_tracker.fy_label,
            accounting_tracker.status,
            'Accounting'::text,
            NULL::date
           FROM public.accounting_tracker
        UNION ALL
         SELECT payroll_tracker.client_id,
            payroll_tracker.fy_label,
            payroll_tracker.status,
            'Payroll'::text,
            COALESCE(payroll_tracker.individual_due_date, payroll_tracker.extended_due_date, payroll_tracker.standard_due_date) AS "coalesce"
           FROM public.payroll_tracker
        UNION ALL
         SELECT trust_ngo_tracker.client_id,
            trust_ngo_tracker.fy_label,
            trust_ngo_tracker.status,
            'Trust/NGO'::text,
            COALESCE(trust_ngo_tracker.individual_due_date, trust_ngo_tracker.extended_due_date, trust_ngo_tracker.standard_due_date) AS "coalesce"
           FROM public.trust_ngo_tracker
        UNION ALL
         SELECT notice_tracker.client_id,
            notice_tracker.fy_label,
            notice_tracker.status,
            'Notice'::text,
            COALESCE(notice_tracker.individual_due_date, notice_tracker.extended_due_date, notice_tracker.response_due_date) AS "coalesce"
           FROM public.notice_tracker
        )
 SELECT client_id,
    fy_label,
    count(*) AS total_compliances,
    count(*) FILTER (WHERE (status = ANY (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum]))) AS completed,
    count(*) FILTER (WHERE ((status = 'Overdue'::public.compliance_status_enum) OR ((due_date < CURRENT_DATE) AND (status <> ALL (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum, 'Closed'::public.compliance_status_enum, 'Not Applicable'::public.compliance_status_enum]))))) AS overdue,
    count(*) FILTER (WHERE ((status <> ALL (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum, 'Overdue'::public.compliance_status_enum, 'Closed'::public.compliance_status_enum, 'Not Applicable'::public.compliance_status_enum])) AND ((due_date IS NULL) OR (due_date >= CURRENT_DATE)))) AS pending,
    count(*) FILTER (WHERE (((due_date >= CURRENT_DATE) AND (due_date <= (CURRENT_DATE + 7))) AND (status <> ALL (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum, 'Closed'::public.compliance_status_enum, 'Not Applicable'::public.compliance_status_enum])))) AS due_soon,
    count(*) FILTER (WHERE (status = ANY (ARRAY['Not Applicable'::public.compliance_status_enum, 'Closed'::public.compliance_status_enum]))) AS not_applicable,
    count(*) FILTER (WHERE (status = 'Waiting for Client'::public.compliance_status_enum)) AS waiting_client,
    count(*) FILTER (WHERE (status = 'Partner Approval Pending'::public.compliance_status_enum)) AS partner_approval_pending,
    count(*) FILTER (WHERE (status = 'Reviewed'::public.compliance_status_enum)) AS review_pending,
    count(*) FILTER (WHERE (status = 'Filing Pending'::public.compliance_status_enum)) AS filing_pending
   FROM all_trackers
  GROUP BY client_id, fy_label;

-- v_firm_dashboard (ref L8385-8456)
CREATE VIEW public.v_firm_dashboard WITH (security_invoker='on') AS
 WITH all_trackers AS (
         SELECT income_tax_tracker.client_id,
            income_tax_tracker.status,
            'Income Tax'::text AS category,
            COALESCE(income_tax_tracker.individual_due_date, income_tax_tracker.extended_due_date, income_tax_tracker.standard_due_date) AS due_date
           FROM public.income_tax_tracker
        UNION ALL
         SELECT gst_tracker.client_id,
            gst_tracker.status,
            'GST'::text,
            COALESCE(gst_tracker.individual_due_date, gst_tracker.extended_due_date, gst_tracker.standard_due_date) AS "coalesce"
           FROM public.gst_tracker
        UNION ALL
         SELECT tds_tracker.client_id,
            tds_tracker.status,
            'TDS'::text,
            COALESCE(tds_tracker.individual_due_date, tds_tracker.extended_due_date, tds_tracker.standard_due_date) AS "coalesce"
           FROM public.tds_tracker
        UNION ALL
         SELECT roc_tracker.client_id,
            roc_tracker.status,
            'ROC'::text,
            COALESCE(roc_tracker.individual_due_date, roc_tracker.extended_due_date, roc_tracker.standard_due_date) AS "coalesce"
           FROM public.roc_tracker
        UNION ALL
         SELECT llp_tracker.client_id,
            llp_tracker.status,
            'LLP'::text,
            COALESCE(llp_tracker.individual_due_date, llp_tracker.extended_due_date, llp_tracker.standard_due_date) AS "coalesce"
           FROM public.llp_tracker
        UNION ALL
         SELECT audit_tracker.client_id,
            audit_tracker.status,
            'Audit'::text,
            COALESCE(audit_tracker.individual_due_date, audit_tracker.extended_due_date, audit_tracker.standard_due_date) AS "coalesce"
           FROM public.audit_tracker
        UNION ALL
         SELECT accounting_tracker.client_id,
            accounting_tracker.status,
            'Accounting'::text,
            NULL::date
           FROM public.accounting_tracker
        UNION ALL
         SELECT payroll_tracker.client_id,
            payroll_tracker.status,
            'Payroll'::text,
            COALESCE(payroll_tracker.individual_due_date, payroll_tracker.extended_due_date, payroll_tracker.standard_due_date) AS "coalesce"
           FROM public.payroll_tracker
        UNION ALL
         SELECT trust_ngo_tracker.client_id,
            trust_ngo_tracker.status,
            'Trust/NGO'::text,
            COALESCE(trust_ngo_tracker.individual_due_date, trust_ngo_tracker.extended_due_date, trust_ngo_tracker.standard_due_date) AS "coalesce"
           FROM public.trust_ngo_tracker
        UNION ALL
         SELECT notice_tracker.client_id,
            notice_tracker.status,
            'Notice'::text,
            COALESCE(notice_tracker.individual_due_date, notice_tracker.extended_due_date, notice_tracker.response_due_date) AS "coalesce"
           FROM public.notice_tracker
        )
 SELECT category,
    count(*) AS total,
    count(*) FILTER (WHERE (status = ANY (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum]))) AS completed,
    count(*) FILTER (WHERE ((status = 'Overdue'::public.compliance_status_enum) OR ((due_date < CURRENT_DATE) AND (status <> ALL (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum, 'Closed'::public.compliance_status_enum, 'Not Applicable'::public.compliance_status_enum]))))) AS overdue,
    count(*) FILTER (WHERE ((status <> ALL (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum, 'Overdue'::public.compliance_status_enum, 'Closed'::public.compliance_status_enum, 'Not Applicable'::public.compliance_status_enum])) AND ((due_date IS NULL) OR (due_date >= CURRENT_DATE)))) AS pending,
    count(*) FILTER (WHERE (((due_date >= CURRENT_DATE) AND (due_date <= (CURRENT_DATE + 7))) AND (status <> ALL (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum, 'Closed'::public.compliance_status_enum, 'Not Applicable'::public.compliance_status_enum])))) AS due_in_7_days,
    count(*) FILTER (WHERE (status = 'Waiting for Client'::public.compliance_status_enum)) AS waiting_client,
    count(*) FILTER (WHERE (status = 'Partner Approval Pending'::public.compliance_status_enum)) AS partner_approval_pending
   FROM all_trackers
  GROUP BY category;

-- v_overdue_ageing (ref L8463-8505)
CREATE VIEW public.v_overdue_ageing WITH (security_invoker='on') AS
 WITH all_overdue AS (
         SELECT income_tax_tracker.client_id,
            'Income Tax'::text AS category,
            COALESCE(income_tax_tracker.individual_due_date, income_tax_tracker.extended_due_date, income_tax_tracker.standard_due_date) AS due_date
           FROM public.income_tax_tracker
          WHERE ((income_tax_tracker.status <> ALL (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum, 'Closed'::public.compliance_status_enum, 'Not Applicable'::public.compliance_status_enum])) AND (COALESCE(income_tax_tracker.individual_due_date, income_tax_tracker.extended_due_date, income_tax_tracker.standard_due_date) < CURRENT_DATE))
        UNION ALL
         SELECT gst_tracker.client_id,
            'GST'::text,
            COALESCE(gst_tracker.individual_due_date, gst_tracker.extended_due_date, gst_tracker.standard_due_date) AS "coalesce"
           FROM public.gst_tracker
          WHERE ((gst_tracker.status <> ALL (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum, 'Closed'::public.compliance_status_enum, 'Not Applicable'::public.compliance_status_enum])) AND (COALESCE(gst_tracker.individual_due_date, gst_tracker.extended_due_date, gst_tracker.standard_due_date) < CURRENT_DATE))
        UNION ALL
         SELECT tds_tracker.client_id,
            'TDS'::text,
            COALESCE(tds_tracker.individual_due_date, tds_tracker.extended_due_date, tds_tracker.standard_due_date) AS "coalesce"
           FROM public.tds_tracker
          WHERE ((tds_tracker.status <> ALL (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum, 'Closed'::public.compliance_status_enum, 'Not Applicable'::public.compliance_status_enum])) AND (COALESCE(tds_tracker.individual_due_date, tds_tracker.extended_due_date, tds_tracker.standard_due_date) < CURRENT_DATE))
        UNION ALL
         SELECT roc_tracker.client_id,
            'ROC'::text,
            COALESCE(roc_tracker.individual_due_date, roc_tracker.extended_due_date, roc_tracker.standard_due_date) AS "coalesce"
           FROM public.roc_tracker
          WHERE ((roc_tracker.status <> ALL (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum, 'Closed'::public.compliance_status_enum, 'Not Applicable'::public.compliance_status_enum])) AND (COALESCE(roc_tracker.individual_due_date, roc_tracker.extended_due_date, roc_tracker.standard_due_date) < CURRENT_DATE))
        UNION ALL
         SELECT notice_tracker.client_id,
            'Notice'::text,
            COALESCE(notice_tracker.individual_due_date, notice_tracker.extended_due_date, notice_tracker.response_due_date) AS "coalesce"
           FROM public.notice_tracker
          WHERE ((notice_tracker.status <> ALL (ARRAY['Filed'::public.compliance_status_enum, 'Completed'::public.compliance_status_enum, 'Closed'::public.compliance_status_enum, 'Not Applicable'::public.compliance_status_enum])) AND (COALESCE(notice_tracker.individual_due_date, notice_tracker.extended_due_date, notice_tracker.response_due_date) < CURRENT_DATE))
        )
 SELECT client_id,
    category,
    due_date,
    (CURRENT_DATE - due_date) AS days_overdue,
        CASE
            WHEN (((CURRENT_DATE - due_date) >= 0) AND ((CURRENT_DATE - due_date) <= 7)) THEN '0-7 Days'::text
            WHEN (((CURRENT_DATE - due_date) >= 8) AND ((CURRENT_DATE - due_date) <= 15)) THEN '8-15 Days'::text
            WHEN (((CURRENT_DATE - due_date) >= 16) AND ((CURRENT_DATE - due_date) <= 30)) THEN '16-30 Days'::text
            ELSE 'More than 30 Days'::text
        END AS ageing_bucket
   FROM all_overdue;

-- v_team_workload: ADD/DEFER — absent in V1 reference; frontend (Dashboard.jsx, Compliance.jsx)
-- references it. DEFERRED — author fresh under a follow-up once expected columns are specified.
