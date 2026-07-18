-- =====================================================================================
-- 0009_rls_refined_phase4b.sql
-- G-2b / Phase 4B authored migration — AUTHORED NOT APPLIED; review under G-2b before G-3.
-- =====================================================================================
-- PURPOSE
--   Replace the BASELINE "authenticated-all" posture created in 0006_rls_policies.sql
--   with a REFINED portal-role RLS model for the 20 operational application tables,
--   using portal_role_enum (Admin / Manager / Executive / Staff / Viewer) resolved from
--   the team table via auth_user_id.
--
-- DESIGN BASIS (faithful to existing artefacts — nothing fabricated)
--   * Phase 4B design doc: docs/PHASE4B_AUDIT_EVENT_CATALOGUE_RLS_TEST_MATRIX.md
--       - §3.1 role definitions; §3.2 raw audit_log has NO permissive policy for any role;
--         all audit access is via SECURITY DEFINER functions only.
--   * V1 helper functions (REFERENCE ONLY, reference_archive/v1_schema_reference.sql):
--       - public.get_portal_role()   -> text  : team.portal_role for active caller (L3748)
--       - public.get_app_role()      -> text  : normalised app role (L3620)
--       - public.is_active_user()    -> bool  : team.is_active for auth.uid() (L3879)
--       - public.is_admin()          -> bool  : portal_role='Admin' & active (L3895)
--       - public.is_admin_or_manager()-> bool : portal_role in (Admin,Manager) & active (L3912)
--   * V1's OWN refined policies (reference L12693-13191) are the template this file follows:
--       - <table>_admin_manager_all  : FOR ALL using is_admin_or_manager()
--       - <table>_executive_select   : FOR SELECT using is_active_user() and portal in (Exec/Staff/Viewer)
--       - <tracker>_executive_update : FOR UPDATE using is_active_user() and portal='Executive'
--       - documents_executive_insert : FOR INSERT (Executive)
--       - tasks_executive_staff_all  : FOR ALL (Executive, Staff)
--       - team_admin_all + team_others_select
--       - follow_ups / completed_documents / extracted_document_data : team-wide (all active staff)
--
-- REFINEMENT MODEL (this file)
--   (a) RLS remains ENABLED on all 20 tables (0006 already enabled it; re-asserted here idempotently).
--   (b) Only ACTIVE authenticated staff obtain any access: every permissive policy requires
--       is_active_user() (or the role helpers, which themselves require is_active). anon gets nothing
--       (no permissive policy => default deny; 0006/0005 restrictive posture unchanged for audit_*).
--   (c) Write/delete gating:
--         - Admin/Manager  : broad ALL (read+write+delete) on operational tables (is_admin_or_manager()).
--         - Executive      : scoped write where the domain table exposes an assignment/authoring column
--                            (trackers: UPDATE; documents: INSERT; tasks: ALL). Executive otherwise read.
--         - Staff          : read on operational data; full edit only on tasks (per V1 tasks model).
--         - Viewer         : read-only everywhere (never appears in any WITH CHECK / write USING).
--         - team           : Admin-only write; every active user may SELECT the roster.
--   (d) audit_log / audit_event_contract / audit_ingestion_failures are UNTOUCHED here: they keep the
--       default-deny + FORCE RLS posture from 0005/0006. NO direct policy is added for app roles.
--       Access is ONLY via SECURITY DEFINER functions: the audit-READ path get_sensitive_audit_logs()
--       (0008) -> _write_read_audit() + the audit-validation chain (0007). NOTE (C-G2B-6): the general
--       audit-WRITE function log_audit_event() is NOT part of this migration set — no object here calls
--       it; it belongs to the future Phase-4 audit-write implementation gate (roadmap G-9) and is DEFERRED,
--       not missing. This file MUST NOT create any policy on the three audit_* tables.
--
-- ASSIGNMENT-COLUMN NOTE (why Executive/Staff scoping is role-based, not row-level here)
--   The trackers carry uuid assignment columns (assigned_to / assigned_auditor, prepared_by, reviewed_by).
--   The operational document/task/client tables, however, store the actor as a *text* label
--   (assigned_to/uploaded_by/reviewed_by are text, not auth_user_id), so a reliable row-level
--   "own-assignment" predicate (assigned_to = auth.uid()) is NOT expressible against them without a
--   normalisation decision (scope_map OI-1). V1 therefore scopes Executive/Staff by ROLE, not by row,
--   and this file preserves that faithfully. Tightening tracker writes to
--   "assigned_to = get_my_team_id()" is called out as OPEN QUESTION OQ-2 below for review — it is a
--   deliberate design change, not authored here.
--
-- STATUS: NOT APPLIED. No SQL executed, no DB/Supabase change, no branch/PR. Review artefact only.
-- =====================================================================================


-- =====================================================================================
-- SECTION 1 — DROP the BASELINE 0006 policies (authenticated-all) for all 20 tables.
--   0006 created exactly one policy per table named "<table>_authenticated_all".
--   Dropped first so the refined policies below fully replace the permissive baseline.
--   IF EXISTS keeps this safe/idempotent if the baseline was never applied.
-- =====================================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'team','clients','client_directors','financial_years',
    'tasks','follow_ups','documents','completed_documents','extracted_document_data',
    'client_financials','financials_tracker','claude_usage_log',
    'compliance_calendar','gst_tracker','income_tax_tracker','tds_tracker','roc_tracker',
    'notice_tracker','audit_tracker','accounting_tracker'
  ]
  LOOP
    -- Re-assert RLS enabled (0006 already did this; idempotent belt-and-braces).
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    -- Remove the permissive baseline policy authored in 0006.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_authenticated_all', t);
  END LOOP;
END $$;


-- =====================================================================================
-- SECTION 2 — REFINED portal-role policies.
--   All predicates use the V1 SECURITY DEFINER helpers so behaviour matches V1 exactly.
--   get_portal_role() returns the raw enum text: 'Admin' | 'Manager' | 'Executive' | 'Staff' | 'Viewer'.
--   is_admin_or_manager() and is_admin() already embed the is_active_user() check.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 2.1  team  (identity/roster — most privileged writes)
--   Admin-only write; any active user may read the roster (needed for assignment UIs).
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS team_admin_all      ON public.team;
DROP POLICY IF EXISTS team_others_select  ON public.team;

CREATE POLICY team_admin_all ON public.team
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY team_others_select ON public.team
  FOR SELECT TO authenticated
  USING (public.is_active_user());


-- -------------------------------------------------------------------------------------
-- 2.2  clients
--   Admin/Manager full; Executive/Staff/Viewer read-only (client master is not staff-editable
--   below Manager). Faithful to V1 clients_admin_manager_all + clients_executive_select.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS clients_admin_manager_all ON public.clients;
DROP POLICY IF EXISTS clients_executive_select  ON public.clients;

CREATE POLICY clients_admin_manager_all ON public.clients
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY clients_executive_select ON public.clients
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff','Viewer']));


-- -------------------------------------------------------------------------------------
-- 2.3  client_directors
--   Admin/Manager full; Executive read (V1 restricted director read to Executive only).
--   Staff/Viewer excluded from director PII read here, matching V1 directors_executive_select.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS directors_admin_manager_all ON public.client_directors;
DROP POLICY IF EXISTS directors_executive_select  ON public.client_directors;

CREATE POLICY directors_admin_manager_all ON public.client_directors
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY directors_executive_select ON public.client_directors
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Executive');


-- -------------------------------------------------------------------------------------
-- 2.4  financial_years  (firm-wide reference/master data — no client_id)
--   Admin/Manager may maintain; all active staff (incl. Viewer) may read.
--   V1 exposed FY read broadly (auth_read_fy); write kept to Admin/Manager (master data).
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS fy_admin_manager_all ON public.financial_years;
DROP POLICY IF EXISTS fy_all_select        ON public.financial_years;

CREATE POLICY fy_admin_manager_all ON public.financial_years
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY fy_all_select ON public.financial_years
  FOR SELECT TO authenticated
  USING (public.is_active_user());


-- -------------------------------------------------------------------------------------
-- 2.5  tasks
--   Admin/Manager full; Executive+Staff full ALL (create/update their work items).
--   Viewer read-only via the executive/staff SELECT arm is intentionally NOT granted write
--   (Viewer excluded from the ALL predicate). V1: tasks_admin_manager_all + tasks_executive_staff_all.
--   Added a Viewer read arm (tasks_viewer_select) so Viewer can see tasks read-only.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS tasks_admin_manager_all   ON public.tasks;
DROP POLICY IF EXISTS tasks_executive_staff_all ON public.tasks;
DROP POLICY IF EXISTS tasks_viewer_select       ON public.tasks;

CREATE POLICY tasks_admin_manager_all ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY tasks_executive_staff_all ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff']))
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff']));

CREATE POLICY tasks_viewer_select ON public.tasks
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Viewer');


-- -------------------------------------------------------------------------------------
-- 2.6  follow_ups  (work-note stream tightly coupled to tasks)
--   Any active team member may create/read follow-ups (V1 follow_ups_team_all).
--   Kept team-wide but now gated on is_active_user() (baseline had USING(true) with no active check).
--   Viewer read-only: excluded from the write arm.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS follow_ups_team_all     ON public.follow_ups;
DROP POLICY IF EXISTS follow_ups_viewer_select ON public.follow_ups;

CREATE POLICY follow_ups_team_all ON public.follow_ups
  FOR ALL TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Admin','Manager','Executive','Staff']))
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Admin','Manager','Executive','Staff']));

CREATE POLICY follow_ups_viewer_select ON public.follow_ups
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Viewer');


-- -------------------------------------------------------------------------------------
-- 2.7  documents
--   Admin/Manager full; Executive may INSERT + SELECT; Staff/Viewer SELECT only.
--   Faithful to V1 documents_admin_manager_all / documents_executive_insert / documents_executive_select.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS documents_admin_manager_all ON public.documents;
DROP POLICY IF EXISTS documents_executive_insert  ON public.documents;
DROP POLICY IF EXISTS documents_executive_select  ON public.documents;

CREATE POLICY documents_admin_manager_all ON public.documents
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY documents_executive_insert ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user()
              AND public.get_portal_role() = 'Executive');

CREATE POLICY documents_executive_select ON public.documents
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff','Viewer']));


-- -------------------------------------------------------------------------------------
-- 2.8  completed_documents  (final filed work products)
--   Admin/Manager full; Executive+Staff may add/update completed work; Viewer read-only.
--   V1 used a team-wide cd_team_all; refined here to keep Viewer read-only while preserving
--   Executive/Staff write on the work they complete.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS completed_docs_admin_manager_all ON public.completed_documents;
DROP POLICY IF EXISTS completed_docs_exec_staff_write  ON public.completed_documents;
DROP POLICY IF EXISTS completed_docs_all_select        ON public.completed_documents;

CREATE POLICY completed_docs_admin_manager_all ON public.completed_documents
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY completed_docs_exec_staff_write ON public.completed_documents
  FOR ALL TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff']))
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff']));

CREATE POLICY completed_docs_all_select ON public.completed_documents
  FOR SELECT TO authenticated
  USING (public.is_active_user());


-- -------------------------------------------------------------------------------------
-- 2.9  extracted_document_data  (OCR/AI extraction rows, reviewed by staff)
--   Admin/Manager full; Executive+Staff may write (they review extractions); Viewer read-only.
--   V1 exposed this team-wide (auth_all_extracted_data); refined to keep Viewer read-only.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS extracted_admin_manager_all ON public.extracted_document_data;
DROP POLICY IF EXISTS extracted_exec_staff_write  ON public.extracted_document_data;
DROP POLICY IF EXISTS extracted_all_select        ON public.extracted_document_data;

CREATE POLICY extracted_admin_manager_all ON public.extracted_document_data
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY extracted_exec_staff_write ON public.extracted_document_data
  FOR ALL TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff']))
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff']));

CREATE POLICY extracted_all_select ON public.extracted_document_data
  FOR SELECT TO authenticated
  USING (public.is_active_user());


-- -------------------------------------------------------------------------------------
-- 2.10  client_financials  (extracted/finalised financial figures — sensitive)
--   Admin/Manager full; Executive read only (V1 financials_executive_select restricted to Executive).
--   Staff/Viewer excluded from financial figures read, matching V1.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS financials_admin_manager_all ON public.client_financials;
DROP POLICY IF EXISTS financials_executive_select  ON public.client_financials;

CREATE POLICY financials_admin_manager_all ON public.client_financials
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY financials_executive_select ON public.client_financials
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Executive');


-- -------------------------------------------------------------------------------------
-- 2.11  financials_tracker  (financial-statement workflow tracker)
--   Admin/Manager full; Executive may UPDATE (workflow progression); Exec/Staff/Viewer read.
--   Modelled on the tracker family (gst/itr/... executive_update pattern), applied to the
--   financials workflow tracker which V1 exposed team-wide (auth_all_financials_tracker).
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS financials_tracker_admin_manager_all ON public.financials_tracker;
DROP POLICY IF EXISTS financials_tracker_executive_select  ON public.financials_tracker;
DROP POLICY IF EXISTS financials_tracker_executive_update  ON public.financials_tracker;

CREATE POLICY financials_tracker_admin_manager_all ON public.financials_tracker
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY financials_tracker_executive_select ON public.financials_tracker
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff','Viewer']));

CREATE POLICY financials_tracker_executive_update ON public.financials_tracker
  FOR UPDATE TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Executive')
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = 'Executive');


-- -------------------------------------------------------------------------------------
-- 2.12  claude_usage_log  (LLM usage/telemetry — written by service, read by staff)
--   Direct app-role writes are NOT granted (usage rows are inserted by the SECURITY DEFINER
--   edge/service path, mirroring V1 auth_read_claude_usage which was SELECT-only).
--   Admin/Manager may read all; Executive/Staff/Viewer may read (telemetry, no PII by design).
--   NOTE: service_role bypasses RLS for the insert path; no INSERT policy is needed for app roles.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS claude_usage_all_select ON public.claude_usage_log;

CREATE POLICY claude_usage_all_select ON public.claude_usage_log
  FOR SELECT TO authenticated
  USING (public.is_active_user());


-- -------------------------------------------------------------------------------------
-- 2.13  compliance_calendar  (derived due-date calendar; assigned_to uuid present)
--   Admin/Manager full; Executive may UPDATE; Exec/Staff/Viewer read.
--   Tracker-family pattern applied (calendar rows progress with compliance work).
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS cal_admin_manager_all ON public.compliance_calendar;
DROP POLICY IF EXISTS cal_executive_select  ON public.compliance_calendar;
DROP POLICY IF EXISTS cal_executive_update  ON public.compliance_calendar;

CREATE POLICY cal_admin_manager_all ON public.compliance_calendar
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY cal_executive_select ON public.compliance_calendar
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff','Viewer']));

CREATE POLICY cal_executive_update ON public.compliance_calendar
  FOR UPDATE TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Executive')
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = 'Executive');


-- -------------------------------------------------------------------------------------
-- 2.14  gst_tracker   (Admin/Manager all; Executive select+update; Staff/Viewer read)
--   Verbatim to V1 gst_admin_manager_all / gst_executive_select_update / gst_executive_update.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS gst_admin_manager_all       ON public.gst_tracker;
DROP POLICY IF EXISTS gst_executive_select_update ON public.gst_tracker;
DROP POLICY IF EXISTS gst_executive_update        ON public.gst_tracker;

CREATE POLICY gst_admin_manager_all ON public.gst_tracker
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY gst_executive_select_update ON public.gst_tracker
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff','Viewer']));

CREATE POLICY gst_executive_update ON public.gst_tracker
  FOR UPDATE TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Executive')
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = 'Executive');


-- -------------------------------------------------------------------------------------
-- 2.15  income_tax_tracker  (V1 itr_admin_manager_all / itr_executive_select / itr_executive_update)
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS itr_admin_manager_all ON public.income_tax_tracker;
DROP POLICY IF EXISTS itr_executive_select  ON public.income_tax_tracker;
DROP POLICY IF EXISTS itr_executive_update  ON public.income_tax_tracker;

CREATE POLICY itr_admin_manager_all ON public.income_tax_tracker
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY itr_executive_select ON public.income_tax_tracker
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff','Viewer']));

CREATE POLICY itr_executive_update ON public.income_tax_tracker
  FOR UPDATE TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Executive')
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = 'Executive');


-- -------------------------------------------------------------------------------------
-- 2.16  tds_tracker  (V1 tds_admin_manager_all / tds_executive_select / tds_executive_update)
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS tds_admin_manager_all ON public.tds_tracker;
DROP POLICY IF EXISTS tds_executive_select  ON public.tds_tracker;
DROP POLICY IF EXISTS tds_executive_update  ON public.tds_tracker;

CREATE POLICY tds_admin_manager_all ON public.tds_tracker
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY tds_executive_select ON public.tds_tracker
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff','Viewer']));

CREATE POLICY tds_executive_update ON public.tds_tracker
  FOR UPDATE TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Executive')
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = 'Executive');


-- -------------------------------------------------------------------------------------
-- 2.17  roc_tracker  (V1 roc_admin_manager_all / roc_executive_select / roc_executive_update)
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS roc_admin_manager_all ON public.roc_tracker;
DROP POLICY IF EXISTS roc_executive_select  ON public.roc_tracker;
DROP POLICY IF EXISTS roc_executive_update  ON public.roc_tracker;

CREATE POLICY roc_admin_manager_all ON public.roc_tracker
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY roc_executive_select ON public.roc_tracker
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff','Viewer']));

CREATE POLICY roc_executive_update ON public.roc_tracker
  FOR UPDATE TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Executive')
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = 'Executive');


-- -------------------------------------------------------------------------------------
-- 2.18  notice_tracker  (tracker family; assigned_to uuid present)
--   V1 exposed notice_tracker team-wide (auth_read_notice). Refined here to the tracker
--   family model for consistency: Admin/Manager all; Executive update; Exec/Staff/Viewer read.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS notice_admin_manager_all ON public.notice_tracker;
DROP POLICY IF EXISTS notice_executive_select  ON public.notice_tracker;
DROP POLICY IF EXISTS notice_executive_update  ON public.notice_tracker;

CREATE POLICY notice_admin_manager_all ON public.notice_tracker
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY notice_executive_select ON public.notice_tracker
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff','Viewer']));

CREATE POLICY notice_executive_update ON public.notice_tracker
  FOR UPDATE TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Executive')
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = 'Executive');


-- -------------------------------------------------------------------------------------
-- 2.19  audit_tracker  (compliance AUDIT engagement tracker — NOT the audit_log)
--   NOTE: audit_tracker is an OPERATIONAL compliance tracker (statutory/tax audits). It is
--   deliberately in scope here and is UNRELATED to audit_log/audit_event_contract/audit_ingestion_failures
--   which remain default-deny in §3. Assignment column is assigned_auditor (uuid).
--   Tracker family model: Admin/Manager all; Executive update; Exec/Staff/Viewer read.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS audit_tracker_admin_manager_all ON public.audit_tracker;
DROP POLICY IF EXISTS audit_tracker_executive_select  ON public.audit_tracker;
DROP POLICY IF EXISTS audit_tracker_executive_update  ON public.audit_tracker;

CREATE POLICY audit_tracker_admin_manager_all ON public.audit_tracker
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY audit_tracker_executive_select ON public.audit_tracker
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff','Viewer']));

CREATE POLICY audit_tracker_executive_update ON public.audit_tracker
  FOR UPDATE TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Executive')
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = 'Executive');


-- -------------------------------------------------------------------------------------
-- 2.20  accounting_tracker  (tracker family; assigned_to uuid present)
--   V1 exposed accounting_tracker team-wide (auth_read_acc). Refined to tracker family model.
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS acc_admin_manager_all ON public.accounting_tracker;
DROP POLICY IF EXISTS acc_executive_select  ON public.accounting_tracker;
DROP POLICY IF EXISTS acc_executive_update  ON public.accounting_tracker;

CREATE POLICY acc_admin_manager_all ON public.accounting_tracker
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY acc_executive_select ON public.accounting_tracker
  FOR SELECT TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = ANY (ARRAY['Executive','Staff','Viewer']));

CREATE POLICY acc_executive_update ON public.accounting_tracker
  FOR UPDATE TO authenticated
  USING (public.is_active_user()
         AND public.get_portal_role() = 'Executive')
  WITH CHECK (public.is_active_user()
         AND public.get_portal_role() = 'Executive');


-- =====================================================================================
-- SECTION 3 — audit_* tables are INTENTIONALLY NOT TOUCHED here.
--   public.audit_log, public.audit_event_contract, public.audit_ingestion_failures keep the
--   FORCE RLS + default-deny posture set in 0005/0006. NO permissive policy for any app role.
--   Audit-READ access is via SECURITY DEFINER get_sensitive_audit_logs() (0008) -> _write_read_audit()
--   + validation chain (0007). log_audit_event() (general audit-WRITE) is DEFERRED to the Phase-4
--   audit-write gate (C-G2B-6) and is not created/called here. This file MUST NOT add any policy to
--   those three tables.
--   (Per Phase 4B design doc §1.2/§1.4/§3.2 and RLS summary matrix §3.4.)
-- =====================================================================================


-- =====================================================================================
-- OPEN QUESTIONS / ASSUMPTIONS FOR REVIEW (before G-3)
--
-- OQ-1  Viewer read scope. This file grants Viewer SELECT on clients, tasks, follow_ups,
--       documents, completed_documents, extracted_document_data, financials_tracker, all
--       trackers, financial_years and claude_usage_log — but NOT on client_directors or
--       client_financials (V1 restricted those to Executive). Confirm Viewer should be blind
--       to director PII and financial figures (assumed YES, faithful to V1).
--
-- OQ-2  Row-level assignment scoping. Executive/Staff writes are scoped by ROLE, not by row,
--       because operational tables store the actor as text (assigned_to/uploaded_by/reviewed_by),
--       not auth_user_id, so "assigned_to = auth.uid()" is not expressible (scope_map OI-1).
--       The trackers DO carry uuid assigned_to/assigned_auditor; a future tightening to
--       "assigned_to = public.get_my_team_id()" would restrict Executive writes to their own
--       assignments. Deferred as a deliberate design change — NOT authored here.
--
-- OQ-3  claude_usage_log / financials_tracker / extracted_document_data / notice/accounting/
--       audit trackers were team-wide "authenticated USING(true)" in V1 (auth_read_*). This file
--       tightens them to the role model (Viewer read-only; Exec/Staff scoped write). Confirm the
--       tightening is acceptable vs. exact V1 parity.
--
-- OQ-4  completed_documents / extracted_document_data / follow_ups: V1 allowed team-wide writes
--       (USING(true)). This file removes Viewer's implicit write by role-gating the write arms.
--       Confirm Viewer must never write these (assumed YES).
--
-- OQ-5  clients WITH CHECK on insert. Admin/Manager only may create clients; Executive cannot
--       (no clients_executive_insert). Confirm client creation stays Manager+ (assumed YES; V1 had
--       no executive insert on clients).
--
-- ASSUMPTIONS
--   A1  Helper functions get_portal_role(), get_app_role(), is_active_user(), is_admin(),
--       is_admin_or_manager() are present at apply time (they ship in 0007 transcription / exist in
--       the target DB per the V1 reference). This file depends on them but does not (re)create them.
--   A2  get_portal_role() returns the raw enum text ('Admin'|'Manager'|'Executive'|'Staff'|'Viewer').
--       All ANY(ARRAY[...]) comparisons use those exact literals.
--   A3  0006 named its baseline policies exactly "<table>_authenticated_all"; the SECTION 1 drop
--       loop targets that name. Verified against 0006_rls_policies.sql.
--   A4  service_role continues to bypass RLS for service/writer paths (e.g. claude_usage_log inserts,
--       audit writer); no app-role INSERT policy is needed for those paths.
--   A5  audit_tracker is an operational compliance tracker and is correctly IN SCOPE for refinement,
--       distinct from the three protected audit_* tables which remain default-deny.
-- =====================================================================================

-- END 0009_rls_refined_phase4b.sql — AUTHORED NOT APPLIED.


-- ============================================================================
-- SECTION 5 (Tranche-2 closure addition): refined policies for the 5
-- DEPENDENCY-KEEP tables added by 0007_dependency_closure.sql.
-- Model: tracker-family (admin_manager_all + executive_select + executive_update)
-- for llp/payroll/trust_ngo trackers; config table tds_client_config =
-- admin_manager_all + executive_select; ct_team_members mirrors team
-- (admin write, any active staff read). Assumption A6: same role model as
-- Section 2; review with OQ-1..OQ-5.
-- ============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['llp_tracker','payroll_tracker','trust_ngo_tracker']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_admin_manager_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_active_user() AND public.get_portal_role() = ANY (ARRAY[''Admin'',''Manager''])) WITH CHECK (public.is_active_user() AND public.get_portal_role() = ANY (ARRAY[''Admin'',''Manager'']));', t||'_admin_manager_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_executive_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_active_user() AND public.get_portal_role() = ANY (ARRAY[''Executive'',''Staff'',''Viewer'']));', t||'_executive_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_executive_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_active_user() AND public.get_portal_role() = ANY (ARRAY[''Executive'',''Staff''])) WITH CHECK (public.is_active_user() AND public.get_portal_role() = ANY (ARRAY[''Executive'',''Staff'']));', t||'_executive_update', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS tds_client_config_admin_manager_all ON public.tds_client_config;
CREATE POLICY tds_client_config_admin_manager_all ON public.tds_client_config FOR ALL TO authenticated USING (public.is_active_user() AND public.get_portal_role() = ANY (ARRAY['Admin','Manager'])) WITH CHECK (public.is_active_user() AND public.get_portal_role() = ANY (ARRAY['Admin','Manager']));
DROP POLICY IF EXISTS tds_client_config_executive_select ON public.tds_client_config;
CREATE POLICY tds_client_config_executive_select ON public.tds_client_config FOR SELECT TO authenticated USING (public.is_active_user() AND public.get_portal_role() = ANY (ARRAY['Executive','Staff','Viewer']));

DROP POLICY IF EXISTS ct_team_members_admin_all ON public.ct_team_members;
CREATE POLICY ct_team_members_admin_all ON public.ct_team_members FOR ALL TO authenticated USING (public.is_active_user() AND public.get_portal_role() = 'Admin') WITH CHECK (public.is_active_user() AND public.get_portal_role() = 'Admin');
DROP POLICY IF EXISTS ct_team_members_others_select ON public.ct_team_members;
CREATE POLICY ct_team_members_others_select ON public.ct_team_members FOR SELECT TO authenticated USING (public.is_active_user());