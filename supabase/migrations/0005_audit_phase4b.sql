-- G-2b authored migration — AUTHORED NOT APPLIED; reviewed under G-2b before G-3.
-- Source: V1 reference (REFERENCE ONLY): audit_log L7041, audit_event_contract L7000,
--   audit_ingestion_failures L7025. V1 ALREADY ships the Phase 4B audit model (FORCE RLS).
-- Scope-map: audit_log KEEP; audit_event_contract KEEP; audit_ingestion_failures KEEP.
-- Dependency: RPC get_sensitive_audit_logs (0008) reads audit_log via the SECURITY DEFINER
--   audit-READ path _write_read_audit() + validation chain (0007). The general audit-WRITE
--   function log_audit_event() exists in the V1 reference but is NOT part of this migration set
--   (no authored object calls it) — DEFERRED to the Phase-4 audit-write gate (C-G2B-6).

CREATE TABLE public.audit_log (
    id uuid NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    initiated_by_type text NOT NULL,
    actor_user_id uuid,
    actor_service text,
    actor_app_role text,
    target_user_id uuid,
    client_uuid uuid,
    client_code_snapshot text,
    resource_type text,
    resource_id text,
    event_name text NOT NULL,
    event_category text,
    action text,
    description text,
    risk_tier text,
    sensitivity_tier text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT audit_log_pkey PRIMARY KEY (id),
    CONSTRAINT audit_log_initiated_by_type_check CHECK ((initiated_by_type = ANY (ARRAY['user'::text,'service'::text]))),
    CONSTRAINT audit_log_risk_tier_check CHECK ((risk_tier = ANY (ARRAY['LOW'::text,'MEDIUM'::text,'HIGH'::text,'CRITICAL'::text]))),
    CONSTRAINT audit_log_sensitivity_tier_check CHECK ((sensitivity_tier = ANY (ARRAY['S1'::text,'S2'::text,'S3'::text,'S4'::text]))),
    CONSTRAINT chk_actor_service CHECK (((initiated_by_type <> 'service'::text) OR ((actor_service IS NOT NULL) AND (actor_user_id IS NULL)))),
    CONSTRAINT chk_actor_user CHECK (((initiated_by_type <> 'user'::text) OR ((actor_user_id IS NOT NULL) AND (actor_service IS NULL))))
);
ALTER TABLE ONLY public.audit_log FORCE ROW LEVEL SECURITY;

CREATE TABLE public.audit_event_contract (
    event_name text NOT NULL,
    risk_tier text NOT NULL,
    sensitivity text NOT NULL,
    required_keys text[] DEFAULT '{}'::text[] NOT NULL,
    optional_keys text[] DEFAULT '{}'::text[] NOT NULL,
    allow_empty_metadata boolean DEFAULT false NOT NULL,
    client_requirement text NOT NULL,
    target_user_requirement text NOT NULL,
    permitted_actor_types text[] NOT NULL,
    permitted_actions text[] DEFAULT '{}'::text[] NOT NULL,
    permitted_resource_types text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT audit_event_contract_pkey PRIMARY KEY (event_name),
    CONSTRAINT audit_event_contract_client_requirement_check CHECK ((client_requirement = ANY (ARRAY['required'::text,'optional'::text,'prohibited'::text]))),
    CONSTRAINT audit_event_contract_risk_tier_check CHECK ((risk_tier = ANY (ARRAY['LOW'::text,'MEDIUM'::text,'HIGH'::text,'CRITICAL'::text]))),
    CONSTRAINT audit_event_contract_sensitivity_check CHECK ((sensitivity = ANY (ARRAY['S1'::text,'S2'::text,'S3'::text,'S4'::text]))),
    CONSTRAINT audit_event_contract_target_user_requirement_check CHECK ((target_user_requirement = ANY (ARRAY['required'::text,'optional'::text,'prohibited'::text])))
);
ALTER TABLE ONLY public.audit_event_contract FORCE ROW LEVEL SECURITY;

CREATE TABLE public.audit_ingestion_failures (
    id uuid NOT NULL,
    failed_at timestamp with time zone DEFAULT now() NOT NULL,
    triggering_event text,
    failure_reason_code text,
    field_names_only text[],
    sqlstate_code text,
    CONSTRAINT audit_ingestion_failures_pkey PRIMARY KEY (id)
);
ALTER TABLE ONLY public.audit_ingestion_failures FORCE ROW LEVEL SECURITY;
