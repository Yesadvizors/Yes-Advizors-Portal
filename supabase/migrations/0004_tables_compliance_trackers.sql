-- G-2b authored migration — AUTHORED NOT APPLIED; reviewed under G-2b before G-3.
-- Source: V1 reference (REFERENCE ONLY): compliance_calendar L7355, gst_tracker L7800,
--   income_tax_tracker L7855, tds_tracker L8169, roc_tracker L8070, notice_tracker L7947,
--   audit_tracker L7074, accounting_tracker L6930.
-- Scope-map: all KEEP (V2-required, referenced by Compliance.jsx). client_id uuid (V1 tracker model).

CREATE TABLE public.compliance_calendar (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    compliance_type character varying(50) NOT NULL,
    compliance_name character varying(200) NOT NULL,
    compliance_tracker_id uuid,
    fy_label character varying(10),
    period character varying(50),
    due_date date NOT NULL,
    status public.compliance_status_enum DEFAULT 'Not Started'::public.compliance_status_enum,
    assigned_to uuid,
    is_overdue boolean DEFAULT false,
    is_due_soon boolean DEFAULT false,
    days_to_due integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT compliance_calendar_pkey PRIMARY KEY (id)
);

CREATE TABLE public.gst_tracker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL, fy_id uuid, fy_label character varying(10) NOT NULL,
    gstin character varying(15), state_code character varying(5),
    return_type public.gst_return_type_enum NOT NULL,
    filing_frequency public.gst_frequency_enum DEFAULT 'Monthly'::public.gst_frequency_enum,
    period character varying(30) NOT NULL, period_month public.month_enum, period_quarter public.quarter_enum,
    standard_due_date date, extended_due_date date, individual_due_date date,
    sales_data_received boolean DEFAULT false, purchase_data_received boolean DEFAULT false,
    bank_statement_received boolean DEFAULT false, gstr2b_downloaded boolean DEFAULT false,
    reconciliation_completed boolean DEFAULT false, liability_computed boolean DEFAULT false,
    challan_prepared boolean DEFAULT false, payment_done boolean DEFAULT false,
    payment_amount numeric(15,2), payment_date date, return_prepared boolean DEFAULT false,
    review_completed boolean DEFAULT false, client_approval_received boolean DEFAULT false,
    return_filed boolean DEFAULT false, arn character varying(50), filing_date date,
    late_fee numeric(10,2) DEFAULT 0, interest numeric(10,2) DEFAULT 0,
    workflow_stage public.workflow_stage_enum DEFAULT 'Assigned'::public.workflow_stage_enum,
    status public.compliance_status_enum DEFAULT 'Not Started'::public.compliance_status_enum,
    assigned_to uuid, assigned_date timestamp with time zone, prepared_by uuid, prepared_date timestamp with time zone,
    reviewed_by uuid, reviewed_date timestamp with time zone, partner_approved_by uuid, partner_approved_date timestamp with time zone,
    filed_by uuid, filed_date timestamp with time zone, remarks text,
    created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gst_tracker_pkey PRIMARY KEY (id)
);

CREATE TABLE public.income_tax_tracker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL, fy_id uuid, fy_label character varying(10) NOT NULL,
    assessment_year character varying(10), itr_form character varying(20),
    standard_due_date date, extended_due_date date, individual_due_date date,
    data_received boolean DEFAULT false, data_received_date date, ais_downloaded boolean DEFAULT false,
    tis_downloaded boolean DEFAULT false, form_26as_downloaded boolean DEFAULT false,
    computation_prepared boolean DEFAULT false, tax_payable numeric(15,2), refund_amount numeric(15,2),
    client_approval_received boolean DEFAULT false, client_approval_date date,
    return_filed boolean DEFAULT false, filing_date date, acknowledgement_number character varying(50),
    revised_return_required boolean DEFAULT false, revised_return_filed boolean DEFAULT false,
    revised_filing_date date, revised_ack_number character varying(50),
    updated_return_required boolean DEFAULT false, updated_return_filed boolean DEFAULT false,
    demand_amount numeric(15,2), refund_status character varying(100),
    workflow_stage public.workflow_stage_enum DEFAULT 'Assigned'::public.workflow_stage_enum,
    status public.compliance_status_enum DEFAULT 'Not Started'::public.compliance_status_enum,
    assigned_to uuid, assigned_date timestamp with time zone, prepared_by uuid, prepared_date timestamp with time zone,
    reviewed_by uuid, reviewed_date timestamp with time zone, partner_approved_by uuid, partner_approved_date timestamp with time zone,
    filed_by uuid, filed_date timestamp with time zone, remarks text,
    created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT income_tax_tracker_pkey PRIMARY KEY (id)
);

CREATE TABLE public.tds_tracker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL, fy_id uuid, fy_label character varying(10) NOT NULL,
    tan character varying(10), form_type public.tds_form_enum NOT NULL, quarter public.quarter_enum NOT NULL,
    period_label character varying(30), standard_due_date date, extended_due_date date, individual_due_date date,
    challan_received boolean DEFAULT false, deductee_details_received boolean DEFAULT false,
    return_prepared boolean DEFAULT false, return_reviewed boolean DEFAULT false, return_filed boolean DEFAULT false,
    filing_date date, token_number character varying(50), form_16_status character varying(50),
    form_16a_status character varying(50), correction_required boolean DEFAULT false, correction_filed boolean DEFAULT false,
    default_notice_received boolean DEFAULT false,
    workflow_stage public.workflow_stage_enum DEFAULT 'Assigned'::public.workflow_stage_enum,
    status public.compliance_status_enum DEFAULT 'Not Started'::public.compliance_status_enum,
    assigned_to uuid, assigned_date timestamp with time zone, prepared_by uuid, prepared_date timestamp with time zone,
    reviewed_by uuid, reviewed_date timestamp with time zone, partner_approved_by uuid, partner_approved_date timestamp with time zone,
    filed_by uuid, filed_date timestamp with time zone, remarks text,
    created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tds_tracker_pkey PRIMARY KEY (id)
);

CREATE TABLE public.roc_tracker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL, fy_id uuid, fy_label character varying(10) NOT NULL,
    cin character varying(25), form_name character varying(50) NOT NULL, filing_type public.roc_filing_type_enum NOT NULL,
    description text, event_date date, event_description text,
    standard_due_date date, extended_due_date date, individual_due_date date,
    documents_pending boolean DEFAULT true, form_prepared boolean DEFAULT false, form_reviewed boolean DEFAULT false,
    dsc_available boolean DEFAULT false, form_uploaded boolean DEFAULT false, return_filed boolean DEFAULT false,
    filing_date date, srn character varying(30), challan_amount numeric(10,2), additional_fees numeric(10,2) DEFAULT 0,
    approval_status character varying(50), resubmission_required boolean DEFAULT false, resubmission_date date,
    workflow_stage public.workflow_stage_enum DEFAULT 'Assigned'::public.workflow_stage_enum,
    status public.compliance_status_enum DEFAULT 'Not Started'::public.compliance_status_enum,
    assigned_to uuid, assigned_date timestamp with time zone, prepared_by uuid, prepared_date timestamp with time zone,
    reviewed_by uuid, reviewed_date timestamp with time zone, partner_approved_by uuid, partner_approved_date timestamp with time zone,
    filed_by uuid, filed_date timestamp with time zone, remarks text,
    created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(),
    agm_date date, board_approval_date date,
    CONSTRAINT roc_tracker_pkey PRIMARY KEY (id)
);

CREATE TABLE public.notice_tracker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL, fy_label character varying(10), authority public.notice_authority_enum NOT NULL,
    notice_type character varying(100) NOT NULL, section character varying(100),
    notice_date date, date_of_receipt date, response_due_date date, extended_due_date date, individual_due_date date,
    linked_tracker_type character varying(50), linked_tracker_id uuid, linked_compliance_period character varying(50),
    extension_required boolean DEFAULT false, extension_filed boolean DEFAULT false, documents_required text,
    reply_prepared boolean DEFAULT false, reply_reviewed boolean DEFAULT false, reply_filed boolean DEFAULT false,
    reply_filed_date date, acknowledgement_number character varying(100), order_received boolean DEFAULT false,
    order_date date, demand_raised numeric(15,2), appeal_required boolean DEFAULT false, appeal_filed boolean DEFAULT false,
    appeal_date date,
    workflow_stage public.workflow_stage_enum DEFAULT 'Assigned'::public.workflow_stage_enum,
    status public.compliance_status_enum DEFAULT 'Not Started'::public.compliance_status_enum,
    assigned_to uuid, assigned_date timestamp with time zone, prepared_by uuid, prepared_date timestamp with time zone,
    reviewed_by uuid, reviewed_date timestamp with time zone, partner_approved_by uuid, partner_approved_date timestamp with time zone,
    remarks text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notice_tracker_pkey PRIMARY KEY (id)
);

CREATE TABLE public.audit_tracker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL, fy_id uuid, fy_label character varying(10) NOT NULL,
    audit_type public.audit_type_enum NOT NULL, applicability_reason text,
    standard_due_date date, extended_due_date date, individual_due_date date,
    books_received boolean DEFAULT false, trial_balance_received boolean DEFAULT false, ledger_received boolean DEFAULT false,
    bank_statement_received boolean DEFAULT false, gst_data_received boolean DEFAULT false, tds_data_received boolean DEFAULT false,
    prev_year_financials boolean DEFAULT false, fixed_asset_register boolean DEFAULT false, loan_confirmations boolean DEFAULT false,
    debtors_confirmation boolean DEFAULT false, creditors_confirmation boolean DEFAULT false, inventory_details boolean DEFAULT false,
    audit_query_raised boolean DEFAULT false, audit_query_date date, query_replied boolean DEFAULT false, query_reply_date date,
    audit_working_prepared boolean DEFAULT false, review_completed boolean DEFAULT false, partner_review_done boolean DEFAULT false,
    financial_statements_final boolean DEFAULT false, udin_generated boolean DEFAULT false, udin_number character varying(50),
    audit_report_signed boolean DEFAULT false, signing_date date, filing_completed boolean DEFAULT false, filing_date date,
    workflow_stage public.workflow_stage_enum DEFAULT 'Assigned'::public.workflow_stage_enum,
    status public.compliance_status_enum DEFAULT 'Not Started'::public.compliance_status_enum,
    assigned_auditor uuid, assigned_date timestamp with time zone, prepared_by uuid, prepared_date timestamp with time zone,
    reviewed_by uuid, reviewed_date timestamp with time zone, partner_approved_by uuid, partner_approved_date timestamp with time zone,
    remarks text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_tracker_pkey PRIMARY KEY (id)
);

CREATE TABLE public.accounting_tracker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL, fy_id uuid, fy_label character varying(10) NOT NULL,
    month public.month_enum NOT NULL, period_label character varying(30),
    sales_booked boolean DEFAULT false, purchase_booked boolean DEFAULT false, bank_entries_completed boolean DEFAULT false,
    expense_entries_completed boolean DEFAULT false, journal_entries_completed boolean DEFAULT false,
    payroll_entries_completed boolean DEFAULT false, gst_reconciliation_done boolean DEFAULT false,
    tds_reconciliation_done boolean DEFAULT false, debtors_reconciliation_done boolean DEFAULT false,
    creditors_reconciliation_done boolean DEFAULT false, bank_reconciliation_done boolean DEFAULT false,
    month_closing_done boolean DEFAULT false, mis_prepared boolean DEFAULT false, mis_sent_to_client boolean DEFAULT false,
    mis_sent_date date,
    workflow_stage public.workflow_stage_enum DEFAULT 'Assigned'::public.workflow_stage_enum,
    status public.compliance_status_enum DEFAULT 'Not Started'::public.compliance_status_enum,
    assigned_to uuid, assigned_date timestamp with time zone, prepared_by uuid, prepared_date timestamp with time zone,
    reviewed_by uuid, reviewed_date timestamp with time zone, partner_approved_by uuid, partner_approved_date timestamp with time zone,
    remarks text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT accounting_tracker_pkey PRIMARY KEY (id)
);
