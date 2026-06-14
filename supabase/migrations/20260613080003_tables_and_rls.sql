-- =====================================================================
-- Phase 4C v7 — 20260613080003_tables_and_rls.sql
-- STATUS: DRAFT / NOT APPLIED. Do not run. For review only.
-- =====================================================================
-- audit_log + audit_ingestion_failures. Per finding #2, each table is
-- FULLY SECURED in the SAME migration that creates it, BEFORE any
-- function is created:
--   1. CREATE TABLE (+ indexes)   2. REVOKE direct privileges
--   3. ENABLE + FORCE RLS         4. owner/writer policies
--   5. minimal custom-role GRANTs
-- No SECURITY DEFINER function exists yet at this point, so there is no
-- window in which a callable function precedes the RLS boundary.
--
-- Canonical columns (target_user_id, client_uuid, resource_id, action,
-- resource_type, description) are top-level only; never duplicated in
-- metadata. Actor CHECK constraints enforce per-type field consistency.
-- Pre-generated id (no RETURNING).
-- =====================================================================

-- ---- audit_log --------------------------------------------------------------
CREATE TABLE public.audit_log (
  id                    uuid PRIMARY KEY,
  occurred_at           timestamptz DEFAULT now() NOT NULL,
  initiated_by_type     text NOT NULL CHECK (initiated_by_type IN ('user','service')),
  actor_user_id         uuid,
  actor_service         text,
  actor_app_role        text,
  target_user_id        uuid,
  client_uuid           uuid,
  client_code_snapshot  text,
  resource_type         text,
  resource_id           text,
  event_name            text NOT NULL,
  event_category        text,
  action                text,
  description           text,
  risk_tier             text CHECK (risk_tier IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  sensitivity_tier      text CHECK (sensitivity_tier IN ('S1','S2','S3','S4')),
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_actor_user CHECK (
    initiated_by_type <> 'user' OR (actor_user_id IS NOT NULL AND actor_service IS NULL)
  ),
  CONSTRAINT chk_actor_service CHECK (
    initiated_by_type <> 'service' OR (actor_service IS NOT NULL AND actor_user_id IS NULL)
  )
);
ALTER TABLE public.audit_log OWNER TO audit_owner;

CREATE INDEX idx_audit_log_actor       ON public.audit_log (actor_user_id);
CREATE INDEX idx_audit_log_target      ON public.audit_log (target_user_id);
CREATE INDEX idx_audit_log_service     ON public.audit_log (actor_service);
CREATE INDEX idx_audit_log_client_uuid ON public.audit_log (client_uuid);
CREATE INDEX idx_audit_log_event_name  ON public.audit_log (event_name);
CREATE INDEX idx_audit_log_occurred    ON public.audit_log (occurred_at DESC, id DESC);
CREATE INDEX idx_audit_log_risk_time   ON public.audit_log (risk_tier, occurred_at DESC)
  WHERE risk_tier IN ('HIGH','CRITICAL');

REVOKE ALL ON TABLE public.audit_log FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;
CREATE POLICY "audit_writer_insert" ON public.audit_log FOR INSERT TO audit_writer WITH CHECK (true);
CREATE POLICY "audit_owner_select"  ON public.audit_log FOR SELECT TO audit_owner USING (true);
CREATE POLICY "no_update_all" ON public.audit_log AS RESTRICTIVE FOR UPDATE USING (false);
CREATE POLICY "no_delete_all" ON public.audit_log AS RESTRICTIVE FOR DELETE USING (false);
CREATE POLICY "no_anon_all" ON public.audit_log AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "no_authenticated_direct" ON public.audit_log AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
GRANT INSERT ON TABLE public.audit_log TO audit_writer;
GRANT SELECT ON TABLE public.audit_log TO audit_owner;

COMMENT ON TABLE public.audit_log IS 'Phase 4C v7: append-only SECURITY audit trail; secured at creation. Distinct from activity_logs.';

-- ---- audit_ingestion_failures ----------------------------------------------
CREATE TABLE public.audit_ingestion_failures (
  id                  uuid PRIMARY KEY,
  failed_at           timestamptz DEFAULT now() NOT NULL,
  triggering_event    text,
  failure_reason_code text,
  field_names_only    text[],
  sqlstate_code       text
);
ALTER TABLE public.audit_ingestion_failures OWNER TO audit_owner;
CREATE INDEX idx_audit_fail_time ON public.audit_ingestion_failures (failed_at DESC);

REVOKE ALL ON TABLE public.audit_ingestion_failures FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE public.audit_ingestion_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_ingestion_failures FORCE ROW LEVEL SECURITY;
CREATE POLICY "fail_writer_insert" ON public.audit_ingestion_failures FOR INSERT TO audit_writer WITH CHECK (true);
CREATE POLICY "fail_owner_select"  ON public.audit_ingestion_failures FOR SELECT TO audit_owner USING (true);
CREATE POLICY "fail_no_update_all" ON public.audit_ingestion_failures AS RESTRICTIVE FOR UPDATE USING (false);
CREATE POLICY "fail_no_delete_all" ON public.audit_ingestion_failures AS RESTRICTIVE FOR DELETE USING (false);
CREATE POLICY "fail_no_anon_all" ON public.audit_ingestion_failures AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "fail_no_authenticated_direct" ON public.audit_ingestion_failures AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
GRANT INSERT ON TABLE public.audit_ingestion_failures TO audit_writer;
GRANT SELECT ON TABLE public.audit_ingestion_failures TO audit_owner;

COMMENT ON TABLE public.audit_ingestion_failures IS 'Phase 4C v7: best-effort failure store (rolls back if caller txn aborts). KEY NAMES only.';

-- Existing tables: ADD read grants for custom roles (no baseline change).
GRANT SELECT ON TABLE public.clients            TO audit_owner, audit_writer;
GRANT SELECT ON TABLE public.team               TO audit_owner, audit_writer;
GRANT SELECT ON TABLE public.team_client_access TO audit_owner;
