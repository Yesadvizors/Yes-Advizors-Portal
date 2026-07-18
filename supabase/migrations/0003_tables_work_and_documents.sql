-- G-2b authored migration — AUTHORED NOT APPLIED; reviewed under G-2b before G-3.
-- Source: V1 reference (REFERENCE ONLY): tasks L8121, follow_ups L7780, documents L7601,
--   completed_documents L7322, extracted_document_data L7649, client_financials L7209, financials_tracker L7741.
-- Scope-map: all KEEP (V2-required). Faithful column transcription; PK added on id.

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id text,
    task_name text NOT NULL,
    client_id text,
    client_name text,
    assigned_to text,
    assigned_by text,
    due_date date,
    priority text DEFAULT 'Normal'::text,
    status text DEFAULT 'Pending'::text,
    notes text,
    latest_update text,
    next_action text,
    next_followup_date date,
    last_updated timestamp with time zone DEFAULT now(),
    completed_on timestamp with time zone,
    completed_by text,
    created_at timestamp with time zone DEFAULT now(),
    work_type text DEFAULT 'General Task'::text,
    checklist jsonb DEFAULT '[]'::jsonb,
    checklist_1 boolean DEFAULT false,
    checklist_2 boolean DEFAULT false,
    checklist_3 boolean DEFAULT false,
    CONSTRAINT tasks_pkey PRIMARY KEY (id)
);

CREATE TABLE public.follow_ups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    followup_id text,
    task_id text,
    client_id text,
    client_name text,
    updated_by text,
    note text,
    next_action text,
    next_followup_date date,
    status_at_time text,
    attachment_url text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT follow_ups_pkey PRIMARY KEY (id)
);

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text,
    client_name text,
    doc_type text,
    doc_name text,
    file_path text,
    file_url text,
    file_size integer,
    mime_type text,
    uploaded_by text,
    created_at timestamp with time zone DEFAULT now(),
    scope text DEFAULT 'client'::text NOT NULL,
    director_name text,
    compliance_type text,
    compliance_ref_id uuid,
    compliance_period text,
    fy_label text,
    doc_category text DEFAULT 'kyc'::text,
    CONSTRAINT documents_pkey PRIMARY KEY (id),
    CONSTRAINT documents_scope_chk CHECK ((scope = ANY (ARRAY['client'::text,'director'::text,'compliance'::text])))
);

CREATE TABLE public.completed_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    client_name text NOT NULL,
    client_type text,
    pan text,
    gstin text,
    financial_year text NOT NULL,
    month text,
    quarter text,
    category text NOT NULL,
    doc_type text NOT NULL,
    doc_name text NOT NULL,
    file_path text NOT NULL,
    file_name text,
    file_size bigint,
    mime_type text,
    uploaded_by text NOT NULL,
    visibility text DEFAULT 'internal'::text,
    status text DEFAULT 'Final Uploaded'::text,
    remarks text,
    version integer DEFAULT 1,
    original_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT completed_documents_pkey PRIMARY KEY (id),
    CONSTRAINT completed_documents_visibility_check CHECK ((visibility = ANY (ARRAY['internal'::text,'client'::text])))
);

CREATE TABLE public.extracted_document_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid,
    client_id text NOT NULL,
    fy_label text,
    doc_type text,
    field_name text NOT NULL,
    extracted_value text,
    source_page integer,
    confidence_score text,
    extraction_engine text,
    edited_value text,
    final_value text,
    reviewed boolean DEFAULT false,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT extracted_document_data_pkey PRIMARY KEY (id)
);

CREATE TABLE public.client_financials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    fy_label text NOT NULL,
    turnover numeric, other_income numeric, total_income numeric, purchases numeric,
    employee_cost numeric, finance_cost numeric, depreciation numeric, other_expenses numeric,
    pbt numeric, tax_expense numeric, pat numeric, ebitda numeric, equity_capital numeric,
    reserves numeric, net_worth numeric, borrowings numeric, trade_payables numeric,
    fixed_assets numeric, investments numeric, trade_receivables numeric, cash_bank numeric,
    loans_advances numeric, total_assets numeric, total_liabilities numeric, gross_total_income numeric,
    total_deductions numeric, taxable_income numeric, tax_payable numeric, tax_paid numeric, refund numeric,
    tax_audit_applicable boolean, udin text, auditor_name text, audit_firm_frn text,
    source_document_id uuid, extraction_mode text, extraction_engine text, overall_confidence text,
    raw_extracted jsonb, reviewed boolean DEFAULT false, reviewed_by text, reviewed_at timestamp with time zone,
    scanned_at timestamp with time zone, created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(), data_source text DEFAULT 'primary'::text,
    source_fy_label text, verification_status text, verification_note text,
    currency_unit text DEFAULT 'absolute'::text, unit_detected boolean DEFAULT true,
    CONSTRAINT client_financials_pkey PRIMARY KEY (id)
);

CREATE TABLE public.financials_tracker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    fy_label text NOT NULL,
    doc_type text NOT NULL,
    status text DEFAULT 'Not Uploaded'::text NOT NULL,
    document_id uuid,
    due_date date, filing_date date, uploaded_by text, remarks text,
    created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(),
    udin_number text, udin_date date, document_date date, board_approval_date date,
    auditor_name text, audit_firm_frn text, audit_opinion text, caro_applicable boolean,
    tax_audit_form text, tax_audit_applicable boolean, itr_filing_date date, ack_number text,
    refund_demand numeric, turnover numeric, pdf_type text,
    extraction_status text DEFAULT 'pending'::text, extraction_engine text,
    extracted_at timestamp with time zone, acknowledgement_number text,
    CONSTRAINT financials_tracker_pkey PRIMARY KEY (id)
);

CREATE TABLE public.claude_usage_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_name text NOT NULL,
    model text, purpose text, input_tokens integer, output_tokens integer, total_tokens integer,
    client_id text, created_at timestamp with time zone DEFAULT now(), tier text,
    provider text DEFAULT 'anthropic'::text, cost_estimate numeric,
    CONSTRAINT claude_usage_log_pkey PRIMARY KEY (id)
);
