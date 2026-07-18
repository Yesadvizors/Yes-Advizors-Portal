-- G-2b authored migration — AUTHORED NOT APPLIED; reviewed under G-2b before G-3.
-- Source: V1 reference (REFERENCE ONLY): team L8215, clients L7271, client_directors L7180, financial_years L7691.
-- Scope-map: team KEEP; clients KEEP; client_directors KEEP; financial_years KEEP (dependency: trackers.fy_id).
-- NOTE (open item OI-1): V1 uses a MIXED client reference model — trackers use client_id uuid,
--   while clients.id is uuid AND clients.client_id is text; documents/tasks/etc use client_id text.
--   Types are transcribed FAITHFULLY from V1 (not silently normalized) to avoid breaking the frontend.
--   Normalization is a MODIFY decision deferred to review (see scope_map OI-1).

CREATE TABLE public.financial_years (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fy_label character varying(10) NOT NULL,
    fy_start_date date NOT NULL,
    fy_end_date date NOT NULL,
    assessment_year character varying(10),
    is_current boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT financial_years_pkey PRIMARY KEY (id),
    CONSTRAINT financial_years_fy_label_key UNIQUE (fy_label)
);

CREATE TABLE public.team (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    mobile text,
    role text DEFAULT 'Staff'::text,
    initials text,
    color text DEFAULT '#0D7A53'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    is_admin boolean DEFAULT false NOT NULL,
    designation text,
    auth_user_id uuid,
    display_name text,
    ct_role text DEFAULT 'Team Member'::text,
    portal_role public.portal_role_enum DEFAULT 'Staff'::public.portal_role_enum,
    chatbot_role text,
    CONSTRAINT team_pkey PRIMARY KEY (id),
    CONSTRAINT chk_team_chatbot_role CHECK (((chatbot_role IS NULL) OR (chatbot_role = ANY (ARRAY['Admin'::text,'Manager'::text,'Staff'::text,'Intern'::text,'Developer_Test'::text,'Client'::text]))))
);

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text,
    name text NOT NULL,
    client_type text,
    mobile text,
    email text,
    pan text,
    gstin text,
    tan text,
    address text,
    status text DEFAULT 'Active'::text,
    quick_onboarded boolean DEFAULT false,
    onboarded_by text,
    drive_folder_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    date_of_incorporation date,
    cin text,
    contact_person text,
    contact_designation text,
    secondary_email text,
    city text,
    state text,
    pincode text,
    directors jsonb DEFAULT '[]'::jsonb,
    services jsonb DEFAULT '[]'::jsonb,
    bank_name text,
    bank_account text,
    engagement_start date,
    notes text,
    pf_no text,
    esi_no text,
    udyam_no text,
    num_directors integer DEFAULT 0,
    is_draft boolean DEFAULT false,
    iec_no text,
    doc_pin text,
    gst_registration_date date,
    pf_registration_date date,
    esi_registration_date date,
    shop_estb_no text,
    shop_estb_state text,
    is_test_client boolean DEFAULT false,
    CONSTRAINT clients_pkey PRIMARY KEY (id),
    CONSTRAINT clients_client_id_key UNIQUE (client_id)
);

CREATE TABLE public.client_directors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'Director'::text,
    din text,
    pan text,
    aadhaar_last4 text,
    aadhaar_masked text,
    mobile text,
    email text,
    dsc_expiry date,
    dsc_status text DEFAULT 'Unknown'::text,
    is_active boolean DEFAULT true,
    is_primary_contact boolean DEFAULT false,
    appointment_date date,
    cessation_date date,
    nationality text DEFAULT 'Indian'::text,
    designation text,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT client_directors_pkey PRIMARY KEY (id)
);
