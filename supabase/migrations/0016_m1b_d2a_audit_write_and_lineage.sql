-- ============================================================================
--  0016_m1b_d2a_audit_write_and_lineage.sql          (M1-B / D2a — Rev 2.2)
--
--  YAV2 Portal V2 — Module 1 (Client Master) — M1-B step D2a.
--  ADDITIVE ONLY: (A) a general-purpose write-audit helper, (B) six additive
--  family audit-event-contract rows, (C) lineage/idempotency columns+index on
--  client_persons, (D) rule-identity columns+index on client_remediation_flags.
--
--  TARGET   : V2 / yav2-dev ONLY — Supabase project ref ogjrwemjefvccpyjwxuo
--  BASIS    : M1-B Implementation Package Rev 2 (approved) + the LIVE catalogue of
--             this governed repository's migrations 0005/0007/0008 (which V2 was
--             built from). NUMBER 0016 (0014 = FY repair, NEVER touched;
--             0015 = M1-A foundation, live).
--  RUNTIME  : Supabase SQL Editor compatible (no psql meta-commands).
--
--  REV 2.2 CORRECTION (independent review HOLD — one fail-closed authorization fix):
--    Security Boolean control-flow checks are made NULL-safe. In PostgreSQL,
--    `NOT NULL` evaluates to NULL and a PL/pgSQL `IF` does NOT enter a NULL branch,
--    so `IF NOT fn() THEN raise` denies FALSE but PASSES on NULL (fail-open).
--    Fixed:
--      * caller-active + Admin/Manager gates now use `fn() IS DISTINCT FROM TRUE`
--        (access requires an explicit TRUE);
--      * the post-condition EXECUTE-denial checks now use
--        `has_function_privilege(...) IS DISTINCT FROM FALSE` (abort on TRUE or NULL);
--      * the SECURITY DEFINER post-check uses `IS DISTINCT FROM TRUE`.
--    All other guards were already NULL-safe (IS NULL / IS NOT NULL / IS DISTINCT
--    FROM; the role gate's explicit `IS NULL OR NOT IN`; the validator gate where
--    NULL means success; `IF NOT FOUND`, which PL/pgSQL guarantees is non-NULL;
--    count `<>` comparisons, count(*) never NULL; `IF EXISTS(...)`). All Rev 2.1
--    substantive decisions are unchanged.
--
--  REV 2.1 CORRECTION (independent review HOLD — one execution-blocking fix):
--    Every function-identity lookup now resolves by EXACT OID via
--    to_regprocedure('public.fn(argtypes)') and compares p.oid, instead of string-
--    matching pg_get_function_identity_arguments(...). Rev 2 mixed a names-included
--    assumption for audit_validate_event with a names-excluded one for
--    audit_write_event, which risked the post-condition reporting the freshly
--    created helper as "not created" and rolling back. All Rev 2 substantive
--    decisions below are unchanged.
--
--  REV 2 CORRECTIONS (independent review HOLD — REVISION REQUIRED):
--    (2) audit_write_event now fail-closes on EVERY authorization check: null
--        auth.uid(), is_active_user(), is_admin_or_manager(), and a derived-role
--        sanity gate — ALL raise BEFORE any audit insertion.
--    (3) event_category is DERIVED inside the helper (family prefix of event_name);
--        the caller-controlled p_event_category parameter is REMOVED. No
--        unresolved caller-controlled nullable audit field remains. (See header
--        "EVENT_CATEGORY DECISION" below and the Implementation Report §N.)
--    (4) Function dependencies validated by EXACT signature via to_regprocedure(...)
--        (audit_validate_event, get_app_role_for_user, is_active_user,
--        is_admin_or_manager, pg_catalog.gen_random_uuid), not by bare name.
--    (5) Post-conditions verify SECURITY DEFINER=true, the exact pinned
--        search_path, the approved owner (= owner of the live audit_validate_event
--        definer fn), and PUBLIC / anon / authenticated / service_role EXECUTE all
--        = false (service_role NOT granted — justified below).
--    (6) Uniform rerun policy — OPTION A: the migration requires ALL of its objects
--        (the function, the 7 columns, the 2 indexes, the 6 events) to be ABSENT.
--        No idempotent "ON CONFLICT DO NOTHING" rerun; no identical-rerun claim.
--    (7) audit_log binding is prechecked by exact (column, type, nullability)
--        against the LIVE audit_log catalogue (D1 Block 2 / migration 0005).
--
--  CRITICAL BINDING CORRECTION (Rev 1 was WRONG): the live public.audit_log
--    (migration 0005 + the live writer public._write_read_audit in 0007) uses the
--    columns  initiated_by_type / actor_user_id / actor_service / actor_app_role /
--    target_user_id / client_uuid  — NOT actor_type / actor_id / actor_role /
--    client_id. The Rev-1 INSERT bound non-existent columns and could never have
--    committed. Rev 2 binds the exact live columns and satisfies the live CHECK
--    constraints (initiated_by_type='user' ⇒ actor_user_id NOT NULL, actor_service
--    NULL; risk_tier ∈ LOW/MEDIUM/HIGH/CRITICAL; sensitivity_tier ∈ S1..S4).
--
--  EVENT_CATEGORY DECISION (review item 3 — exact decision + evidence):
--    * LIVE type/nullability: audit_log.event_category is  text  and NULLABLE
--      (migration 0005, no NOT NULL, no CHECK).
--    * LIVE semantic source: the only live audit writer, public._write_read_audit
--      (0007), sets event_category to a fixed literal ('audit') AT THE WRITE SITE.
--      It is NOT a column of audit_event_contract and is NOT caller input.
--    * CONSUMER: the Admin audit viewer (src/components/AuditLog.jsx) renders it as
--      free display text (`row.event_category || '—'`); no enum/CHECK constrains it.
--    * DECISION: DERIVE event_category deterministically from the event family
--      (split_part(event_name,'.',1) → 'person'|'identifier'|'contact'|'address'|
--      'relationship'|'gst_detail'), caller-independent and always non-null. The
--      arbitrary caller parameter is removed. This mirrors the live precedent of a
--      write-site-assigned semantic category while eliminating caller control.
--
--  D1-GROUNDED DECISIONS (do not silently change):
--    * The read-audit writer _write_read_audit is READ-SPECIFIC (hard-coded actor
--      role admin / action VIEW / resource_type audit_log / category audit) and is
--      NOT reused. This migration adds a NEW general write-audit helper.
--    * Live vocabulary: actor type 'user'; permitted actions include CREATE and
--      UPDATE; 'CHANGE' is NOT permitted. The six family events use CREATE + UPDATE.
--    * change_type_code values are CREATED | UPDATED | DISABLED | ENABLED (the live
--      audit_field_format_ok whitelist accepts CREATED/UPDATED/DELETED/ENABLED/
--      DISABLED/GRANTED/REVOKED; 'DEACTIVATED' is NOT valid). Enforced at the
--      RPC/app layer (D2b), documented here.
--    * Tiers (risk_tier / sensitivity_tier) come from audit_event_contract, never
--      the caller; client_code_snapshot is captured from clients at event time;
--      metadata is validated via audit_validate_event.
--    * Role helper get_app_role_for_user(uuid) derives + retains the actor role.
--    * Standing ALTER DEFAULT PRIVILEGES can grant EXECUTE on new functions to
--      anon — so the new helper explicitly REVOKEs ALL FROM PUBLIC, anon,
--      authenticated, service_role.
--
--  SCOPE FENCE — this migration does NOT:
--    * author or create any D2b CRUD RPC (only the shared audit helper);
--    * author D3 (backfill) or D4 (remediation population) logic;
--    * write a single audit_log row (the helper is defined, never called here);
--    * drop/alter any legacy column, change any client status, or touch any
--      tracker/financial/compliance_calendar row;
--    * touch migration 0014, V1/Production (zcszesuvjrryxtigjglt), or generate
--      compliance; copy no Aadhaar digits/last-four (no person data is moved here).
--
--  ⚠ PROJECT GUARD — HUMAN CONFIRMATION, NOT AUTOMATIC IDENTITY VERIFICATION.
--    Before running, the EXECUTOR MUST VISUALLY CONFIRM the Supabase dashboard URL
--    shows project ref  ogjrwemjefvccpyjwxuo  (V2 / yav2-dev), then set:
--        SET yav2.confirm_project = 'ogjrwemjefvccpyjwxuo';
--    Section 0 refuses to run without this attestation. It does NOT verify the
--    connected database's true identity — the executor remains responsible.
--
--  ONE transaction (BEGIN/COMMIT). Every check is fail-closed: a RAISE EXCEPTION
--  aborts the transaction and rolls everything back.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SECTION 0 — PRECONDITIONS (fail closed)
-- ---------------------------------------------------------------------------
DO $precheck$
DECLARE
  v_confirm text := current_setting('yav2.confirm_project', true);
  v_missing text;
  v_exists  text;
  v_bad     text;
BEGIN
  -- Human attestation only (see header). Not a DB-identity check.
  IF v_confirm IS DISTINCT FROM 'ogjrwemjefvccpyjwxuo' THEN
    RAISE EXCEPTION
      E'STOP: project not attested.\n'
       'VISUALLY CONFIRM the dashboard shows ogjrwemjefvccpyjwxuo, then run:\n'
       '  SET yav2.confirm_project = ''ogjrwemjefvccpyjwxuo'';\n'
       'This migration is for V2 / yav2-dev ONLY.';
  END IF;

  -- Roles required by SECTION A (explicit REVOKE targets).
  SELECT string_agg(r, ', ') INTO v_missing
  FROM unnest(ARRAY['anon','authenticated','service_role']) AS r
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: expected Supabase role(s) missing: %', v_missing;
  END IF;

  -- Table dependencies we read/extend, plus the resource tables the six family
  -- events name (grounds permitted_resource_types against the live schema).
  SELECT string_agg(t, ', ') INTO v_missing
  FROM unnest(ARRAY['clients','audit_log','audit_event_contract',
                    'client_persons','client_remediation_flags',
                    'client_identifiers','client_contacts','client_addresses',
                    'client_relationships','gst_registration_details']) AS t
  WHERE to_regclass('public.'||t) IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: expected table dependency missing: %', v_missing;
  END IF;

  -- (Review 4) Function dependencies validated by EXACT SIGNATURE via
  -- to_regprocedure(...) — NULL if the exact signature is absent. Bare-name
  -- matching is not used.
  SELECT string_agg(sig, E'\n  ') INTO v_missing
  FROM unnest(ARRAY[
    'public.audit_validate_event(text,text,text,text,uuid,uuid,jsonb)',
    'public.get_app_role_for_user(uuid)',
    'public.is_active_user()',
    'public.is_admin_or_manager()',
    'pg_catalog.gen_random_uuid()'
  ]) AS sig
  WHERE to_regprocedure(sig) IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION
      E'STOP: required function(s) missing at the EXACT signature:\n  %', v_missing;
  END IF;

  -- (Review 7) audit_log binding contract: exact (column, type, nullability) the
  -- helper INSERTs into, verified against the LIVE audit_log catalogue. If any
  -- bound column is absent OR differs in type/nullability, STOP fail-closed rather
  -- than write a wrong row. Expected shape is migration 0005 (D1 Block 2).
  SELECT string_agg(spec, E'\n  ') INTO v_bad
  FROM (
    VALUES
      ('id',                  'uuid', 'NO'),
      ('initiated_by_type',   'text', 'NO'),
      ('actor_user_id',       'uuid', 'YES'),
      ('actor_service',       'text', 'YES'),
      ('actor_app_role',      'text', 'YES'),
      ('target_user_id',      'uuid', 'YES'),
      ('client_uuid',         'uuid', 'YES'),
      ('client_code_snapshot','text', 'YES'),
      ('resource_type',       'text', 'YES'),
      ('resource_id',         'text', 'YES'),
      ('event_name',          'text', 'NO'),
      ('event_category',      'text', 'YES'),
      ('action',              'text', 'YES'),
      ('description',         'text', 'YES'),
      ('risk_tier',           'text', 'YES'),
      ('sensitivity_tier',    'text', 'YES'),
      ('metadata',            'jsonb','NO')
  ) AS want(col, typ, nullable)
  , LATERAL (SELECT want.col||' ('||want.typ||','||want.nullable||')' AS spec) s
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.table_name='audit_log'
      AND c.column_name = want.col
      AND c.data_type   = want.typ
      AND c.is_nullable = want.nullable
  );
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION
      E'STOP: live audit_log does not match the bound (column,type,nullability) contract:\n  %\n'
       'Reconcile the helper INSERT against the live audit_log catalogue (D1 Block 2 / migration 0005) under review.', v_bad;
  END IF;

  -- audit_event_contract must expose every column SECTION B inserts.
  SELECT string_agg(c, ', ') INTO v_missing
  FROM unnest(ARRAY['event_name','risk_tier','sensitivity','required_keys','optional_keys',
                    'allow_empty_metadata','client_requirement','target_user_requirement',
                    'permitted_actor_types','permitted_actions','permitted_resource_types']) AS c
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_schema='public' AND table_name='audit_event_contract'
                       AND column_name=c);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: audit_event_contract missing column(s): %', v_missing;
  END IF;

  -- (Review 6 — OPTION A) Additive guard (helper): the function name must not exist.
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
              WHERE n.nspname='public' AND p.proname='audit_write_event') THEN
    RAISE EXCEPTION 'STOP: public.audit_write_event already exists (not additive; rerun disallowed).';
  END IF;

  -- (Review 6 — OPTION A) Additive guard (columns): none may already exist.
  SELECT string_agg(msg, ', ') INTO v_exists FROM (
    SELECT 'client_persons.'||column_name AS msg FROM information_schema.columns
      WHERE table_schema='public' AND table_name='client_persons'
        AND column_name IN ('source_system','source_ref','source_hash','backfill_batch_id')
    UNION ALL
    SELECT 'client_remediation_flags.'||column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='client_remediation_flags'
        AND column_name IN ('rule_code','rule_version','batch_id')
  ) s;
  IF v_exists IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: target column(s) already exist (not additive; rerun disallowed): %', v_exists;
  END IF;

  -- (Review 6 — OPTION A) Additive guard (indexes): neither may already exist.
  SELECT string_agg(indexname, ', ') INTO v_exists
  FROM pg_indexes
  WHERE schemaname='public'
    AND indexname IN ('client_persons_source_uq','client_remediation_flags_open_uq');
  IF v_exists IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: target index(es) already exist (not additive; rerun disallowed): %', v_exists;
  END IF;

  -- (Review 6 — OPTION A) Additive guard (family events): ALL SIX must be ABSENT.
  -- There is no idempotent rerun: any pre-existing family event aborts the run.
  SELECT string_agg(event_name, ', ') INTO v_exists
  FROM public.audit_event_contract
  WHERE event_name IN ('person.changed','identifier.changed','contact.changed',
                       'address.changed','relationship.changed','gst_detail.changed');
  IF v_exists IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: M1-B family event(s) already present (not additive; rerun disallowed): %', v_exists;
  END IF;

  RAISE NOTICE 'M1-B D2a preconditions passed (exact signatures + typed audit_log contract verified).';
END
$precheck$;

-- Capture baseline counts for the post-condition (start == end within the txn).
CREATE TEMP TABLE _m1b_d2a_baseline ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM public.clients)                                          AS clients_all,
  (SELECT count(*) FROM public.clients WHERE status='Active' AND coalesce(is_draft,false)=false) AS clients_active,
  (SELECT count(*) FROM public.accounting_tracker)                              AS accounting_tracker,
  (SELECT count(*) FROM public.financials_tracker)                             AS financials_tracker,
  (SELECT count(*) FROM public.income_tax_tracker)                             AS income_tax_tracker,
  (SELECT count(*) FROM public.compliance_calendar)                            AS compliance_calendar,
  (SELECT count(*) FROM public.audit_log)                                      AS audit_log_rows,
  (SELECT count(*) FROM public.client_persons)                                 AS client_persons_rows,
  (SELECT count(*) FROM public.client_remediation_flags)                       AS remediation_rows;


-- ---------------------------------------------------------------------------
-- SECTION A — general-purpose write-audit helper (SECURITY DEFINER)
--
--   Reusable by every D2b CRUD RPC. FAIL-CLOSED on all authorization checks in
--   this order, BEFORE any audit insertion:
--     1. reject null auth.uid()                          -> NO_AUTH_CONTEXT
--     2. caller must be active     (is_active_user())    -> NOT_AUTHORISED_INACTIVE
--     3. caller must be Admin/Manager (is_admin_or_manager()) -> NOT_AUTHORISED
--     4. derive + retain app role (get_app_role_for_user) and sanity-gate it
--                                                        -> NOT_AUTHORISED_ROLE
--   It does NOT swallow validation/DB errors: a non-empty rejection code from
--   audit_validate_event RAISEs, so the calling RPC's whole transaction (data
--   write + audit) rolls back atomically.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.audit_write_event(
  p_event_name     text,
  p_action         text,
  p_resource_type  text,
  p_resource_id    text,
  p_client_id      uuid,
  p_metadata       jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $awe$
DECLARE
  v_actor          uuid := auth.uid();
  v_actor_role     text;
  v_reject         text;
  v_client_code    text;
  v_risk           text;
  v_sens           text;
  v_event_category text;
  v_id             uuid := pg_catalog.gen_random_uuid();  -- id generated explicitly
BEGIN
  -- (1) Reject unauthenticated callers before any work.
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'NO_AUTH_CONTEXT';
  END IF;

  -- (2) Caller must be an ACTIVE team member (SECURITY DEFINER bypasses RLS, so
  --     re-assert). Exact live signature: public.is_active_user() RETURNS boolean.
  --     NULL-safe fail-closed: `NOT NULL` is NULL and a PL/pgSQL IF skips a NULL
  --     branch, so `IF NOT fn()` would deny FALSE but pass NULL. `IS DISTINCT FROM
  --     TRUE` denies both FALSE and NULL — access requires an explicit TRUE.
  IF public.is_active_user() IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'NOT_AUTHORISED_INACTIVE';
  END IF;

  -- (3) Caller must be Admin or Manager. Exact live signature:
  --     public.is_admin_or_manager() RETURNS boolean. NULL-safe fail-closed as above.
  IF public.is_admin_or_manager() IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'NOT_AUTHORISED';
  END IF;

  -- (4) Derive + retain the actor's application role via the confirmed helper.
  --     get_app_role_for_user returns 'denied' for a null/absent/inactive user; a
  --     caller that passed (2)+(3) must resolve to 'admin' or 'manager'. Anything
  --     else fails closed.
  v_actor_role := public.get_app_role_for_user(v_actor);
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin','manager') THEN
    RAISE EXCEPTION 'NOT_AUTHORISED_ROLE: %', coalesce(v_actor_role,'<null>');
  END IF;

  -- Tiers MUST come from the contract, not the caller.
  SELECT c.risk_tier, c.sensitivity
    INTO v_risk, v_sens
  FROM public.audit_event_contract c
  WHERE c.event_name = p_event_name;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'UNKNOWN_AUDIT_EVENT: %', p_event_name;
  END IF;

  -- event_category is DERIVED (family prefix), never accepted from the caller.
  v_event_category := split_part(p_event_name, '.', 1);
  IF v_event_category IS NULL OR v_event_category = '' THEN
    RAISE EXCEPTION 'UNRESOLVED_EVENT_CATEGORY: %', p_event_name;
  END IF;

  -- When a client UUID is supplied, confirm it exists and snapshot its code.
  IF p_client_id IS NOT NULL THEN
    SELECT cl.client_id INTO v_client_code
    FROM public.clients cl WHERE cl.id = p_client_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'CLIENT_NOT_FOUND: %', p_client_id;
    END IF;
  END IF;

  -- Validate action/resource/metadata through the canonical validator (actor
  -- 'user'). audit_validate_event RETURNS a rejection code (NULL on success) — it
  -- does not raise — so we inspect the result and RAISE on any non-empty code.
  v_reject := public.audit_validate_event(
                p_event_name, 'user', p_action, p_resource_type,
                p_client_id, NULL, p_metadata);
  IF v_reject IS NOT NULL AND v_reject <> '' THEN
    RAISE EXCEPTION 'AUDIT_VALIDATION_FAILED: %', v_reject;
  END IF;

  -- Insert the audit row atomically within the caller's transaction, binding the
  -- EXACT live audit_log columns (0005). initiated_by_type='user' satisfies
  -- chk_actor_user (actor_user_id NOT NULL, actor_service NULL).
  INSERT INTO public.audit_log
    (id, initiated_by_type, actor_user_id, actor_service, actor_app_role, target_user_id,
     client_uuid, client_code_snapshot, resource_type, resource_id,
     event_name, event_category, action, description, risk_tier, sensitivity_tier, metadata)
  VALUES
    (v_id, 'user', v_actor, NULL, v_actor_role, NULL,
     p_client_id, v_client_code, p_resource_type, p_resource_id,
     p_event_name, v_event_category, p_action, NULL, v_risk, v_sens,
     coalesce(p_metadata, '{}'::jsonb));

  RETURN v_id;
END
$awe$;

COMMENT ON FUNCTION public.audit_write_event(text,text,text,text,uuid,jsonb) IS
  'M1-B D2a general-purpose write-audit helper. SECURITY DEFINER; fail-closed on null auth.uid(), is_active_user(), is_admin_or_manager() and a derived-role gate BEFORE any insert; derives+retains actor role via get_app_role_for_user; tiers from audit_event_contract; event_category derived from the event family (not caller input); snapshots clients.client_id; validates via audit_validate_event (raises on rejection, does not swallow); inserts one audit_log row binding the live 0005 columns with an explicitly generated id. Internal helper for D2b RPCs (invoked as their SECURITY DEFINER owner); not granted to anon/authenticated/service_role.';

-- Standing default privileges can grant EXECUTE on new functions to anon/PUBLIC —
-- REVOKE from every grantee. (Review 5) service_role is NOT granted: the D2b CRUD
-- RPCs are themselves SECURITY DEFINER and invoke this helper as their function
-- owner (who can EXECUTE regardless of grants), so no role-level EXECUTE grant is
-- required. Granting to nobody is the most fail-closed posture.
REVOKE ALL ON FUNCTION public.audit_write_event(text,text,text,text,uuid,jsonb)
  FROM PUBLIC, anon, authenticated, service_role;


-- ---------------------------------------------------------------------------
-- SECTION B — six additive family audit events (CREATE + UPDATE vocabulary)
--
--   Dedicated events (not folded under client.updated). permitted_actions use the
--   LIVE vocabulary CREATE + UPDATE only ('CHANGE' is not permitted). Required key
--   change_type_code carries the lifecycle stage, valued CREATED|UPDATED|DISABLED|
--   ENABLED (NOT 'DEACTIVATED') — enforced by the D2b RPC layer, not a DB CHECK.
--   Optional keys are drawn only from the existing audit_field_format_ok whitelist.
--
--   (Review 6 — OPTION A) SECTION 0 already proved all six are ABSENT, so this is a
--   plain INSERT with NO "ON CONFLICT DO NOTHING". The migration is single-shot:
--   a rerun is disallowed (SECTION 0 aborts), and the audit_event_contract PK on
--   event_name is a fail-closed backstop against any race.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _m1b_events ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('person.changed','MEDIUM','S2',
     ARRAY['change_type_code'], ARRAY['setting_name_code','old_value_code','new_value_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['CREATE','UPDATE'], ARRAY['client_persons']),
  ('identifier.changed','MEDIUM','S2',
     ARRAY['change_type_code'], ARRAY['old_value_code','new_value_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['CREATE','UPDATE'], ARRAY['client_identifiers']),
  ('contact.changed','MEDIUM','S2',
     ARRAY['change_type_code'], ARRAY['setting_name_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['CREATE','UPDATE'], ARRAY['client_contacts']),
  ('address.changed','MEDIUM','S2',
     ARRAY['change_type_code'], ARRAY['setting_name_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['CREATE','UPDATE'], ARRAY['client_addresses']),
  ('relationship.changed','MEDIUM','S2',
     ARRAY['change_type_code'], ARRAY['old_value_code','new_value_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['CREATE','UPDATE'], ARRAY['client_relationships']),
  ('gst_detail.changed','MEDIUM','S2',
     ARRAY['change_type_code'], ARRAY['old_value_code','new_value_code'],
     false,'required','prohibited', ARRAY['user'], ARRAY['CREATE','UPDATE'], ARRAY['gst_registration_details'])
) AS v(event_name, risk_tier, sensitivity, required_keys, optional_keys, allow_empty_metadata,
       client_requirement, target_user_requirement, permitted_actor_types, permitted_actions,
       permitted_resource_types);

INSERT INTO public.audit_event_contract
  (event_name, risk_tier, sensitivity, required_keys, optional_keys, allow_empty_metadata,
   client_requirement, target_user_requirement, permitted_actor_types, permitted_actions,
   permitted_resource_types)
SELECT event_name, risk_tier, sensitivity, required_keys, optional_keys, allow_empty_metadata,
       client_requirement, target_user_requirement, permitted_actor_types, permitted_actions,
       permitted_resource_types
FROM _m1b_events;


-- ---------------------------------------------------------------------------
-- SECTION C — client_persons lineage / idempotency columns + partial unique index
--   Additive ADD COLUMN on the empty M1-A table (D1 Block 8 confirmed 0 rows).
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_persons
  ADD COLUMN source_system     text,   -- 'legacy_jsonb' | 'client_directors' | 'manual'
  ADD COLUMN source_ref        text,   -- stable legacy key (e.g. client_id + jsonb index)
  ADD COLUMN source_hash       text,   -- hash of normalised source fields (idempotent re-run)
  ADD COLUMN backfill_batch_id uuid;   -- which backfill run created/last-touched this row

-- Re-running the backfill cannot double-insert an already-mapped legacy person.
CREATE UNIQUE INDEX client_persons_source_uq
  ON public.client_persons (client_id, source_system, source_ref)
  WHERE source_system IS NOT NULL;

COMMENT ON COLUMN public.client_persons.source_system IS
  'M1-B D3 lineage: origin of a backfilled person. NULL for RPC-created rows.';


-- ---------------------------------------------------------------------------
-- SECTION D — client_remediation_flags rule-identity columns + open-flag index
--   Additive ADD COLUMN on the empty M1-A table (D1 Block 8 confirmed 0 rows).
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_remediation_flags
  ADD COLUMN rule_code    text,     -- stable rule id, e.g. 'MISSING_INCORP_DATE'
  ADD COLUMN rule_version integer,  -- bump when a rule's definition changes
  ADD COLUMN batch_id     uuid;     -- population run identity

-- At most one OPEN flag per (client, rule_code); re-running D4 is idempotent.
CREATE UNIQUE INDEX client_remediation_flags_open_uq
  ON public.client_remediation_flags (client_id, rule_code)
  WHERE resolved = false;

COMMENT ON COLUMN public.client_remediation_flags.rule_code IS
  'M1-B D4 rule identity. Populated by the remediation-population run; NULL for legacy/manual flags.';


-- ---------------------------------------------------------------------------
-- SECTION E — POST-CONDITIONS (roll back on any violation)
-- ---------------------------------------------------------------------------
DO $postcheck$
DECLARE
  b _m1b_d2a_baseline%ROWTYPE;
  v_family int;
  v_m1a int;
  v_cols int;
  v_idx int;
  v_secdef boolean;
  v_proconfig text[];
  v_owner name;
  v_approved_owner name;
BEGIN
  SELECT * INTO b FROM _m1b_d2a_baseline;

  -- Additive: NONE of the pre-existing counts may change (incl. audit_log — the
  -- helper is defined but never called here).
  IF (SELECT count(*) FROM public.clients) <> b.clients_all
     OR (SELECT count(*) FROM public.clients WHERE status='Active' AND coalesce(is_draft,false)=false) <> b.clients_active THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: client counts changed.';
  END IF;
  IF (SELECT count(*) FROM public.accounting_tracker)  <> b.accounting_tracker
     OR (SELECT count(*) FROM public.financials_tracker) <> b.financials_tracker
     OR (SELECT count(*) FROM public.income_tax_tracker) <> b.income_tax_tracker
     OR (SELECT count(*) FROM public.compliance_calendar) <> b.compliance_calendar THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: a tracker/calendar row count changed.';
  END IF;
  IF (SELECT count(*) FROM public.audit_log) <> b.audit_log_rows THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: audit_log row count changed (helper must not emit during migration).';
  END IF;
  IF (SELECT count(*) FROM public.client_persons) <> b.client_persons_rows
     OR (SELECT count(*) FROM public.client_remediation_flags) <> b.remediation_rows THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: person/remediation row count changed (no data write in D2a).';
  END IF;

  -- (Review 5) The write helper: exists, SECURITY DEFINER, exact pinned
  -- search_path, approved owner, and PUBLIC/anon/authenticated/service_role hold
  -- NO EXECUTE.
  SELECT p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner)
    INTO v_secdef, v_proconfig, v_owner
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.audit_write_event(text,text,text,text,uuid,jsonb)');
  IF v_secdef IS NULL THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: audit_write_event(text,text,text,text,uuid,jsonb) not created.';
  END IF;
  IF v_secdef IS DISTINCT FROM TRUE THEN   -- NULL-safe: denies FALSE and NULL alike
    RAISE EXCEPTION 'POST-CHECK FAILED: audit_write_event is not SECURITY DEFINER.';
  END IF;
  -- Exact pinned search_path (single proconfig entry, exact value).
  IF v_proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, pg_temp'] THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: audit_write_event search_path is not the exact pinned value (got: %).',
      coalesce(array_to_string(v_proconfig, ', '), '<none>');
  END IF;
  -- Approved owner = the owner of the live canonical definer validator
  -- (public.audit_validate_event). Grounds "approved owner" in live evidence.
  SELECT pg_get_userbyid(p.proowner) INTO v_approved_owner
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.audit_validate_event(text,text,text,text,uuid,uuid,jsonb)');
  IF v_approved_owner IS NULL THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: could not resolve the approved owner (audit_validate_event owner).';
  END IF;
  IF v_owner IS DISTINCT FROM v_approved_owner THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: audit_write_event owner % is not the approved owner % (audit_validate_event owner).',
      v_owner, v_approved_owner;
  END IF;
  -- EXECUTE must be denied to every role. Because has_function_privilege returns
  -- true when EITHER the role OR PUBLIC holds the grant, all three being FALSE also
  -- proves PUBLIC holds no EXECUTE. NULL-safe fail-closed: security here depends on
  -- the result being FALSE, so `IS DISTINCT FROM FALSE` aborts on TRUE *and* on any
  -- NULL/indeterminate result (a bare `IF fn() THEN` would pass on NULL).
  IF has_function_privilege('anon',
       'public.audit_write_event(text,text,text,text,uuid,jsonb)', 'EXECUTE') IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: anon EXECUTE on audit_write_event is not provably denied (non-FALSE).';
  END IF;
  IF has_function_privilege('authenticated',
       'public.audit_write_event(text,text,text,text,uuid,jsonb)', 'EXECUTE') IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: authenticated EXECUTE on audit_write_event is not provably denied (non-FALSE).';
  END IF;
  IF has_function_privilege('service_role',
       'public.audit_write_event(text,text,text,text,uuid,jsonb)', 'EXECUTE') IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: service_role EXECUTE on audit_write_event is not provably denied (non-FALSE; must not be granted).';
  END IF;

  -- Six family events present; the 12 M1-A events remain intact.
  SELECT count(*) INTO v_family FROM public.audit_event_contract
  WHERE event_name IN ('person.changed','identifier.changed','contact.changed',
                       'address.changed','relationship.changed','gst_detail.changed');
  IF v_family <> 6 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: expected 6 family events, found %.', v_family;
  END IF;
  SELECT count(*) INTO v_m1a FROM public.audit_event_contract
  WHERE event_name IN ('client.created','client.updated','client.status_transition',
    'client.duplicate_override','registration.added','registration.updated','identifier.added',
    'person.kyc_verified','person.kyc_exception_approved','document.signed_url_issued',
    'document.verified','remediation.resolved');
  IF v_m1a <> 12 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: expected 12 M1-A events intact, found %.', v_m1a;
  END IF;

  -- Lineage (4) + rule-identity (3) columns present.
  SELECT count(*) INTO v_cols FROM information_schema.columns
  WHERE table_schema='public'
    AND ( (table_name='client_persons' AND column_name IN ('source_system','source_ref','source_hash','backfill_batch_id'))
       OR (table_name='client_remediation_flags' AND column_name IN ('rule_code','rule_version','batch_id')) );
  IF v_cols <> 7 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: expected 7 additive columns, found %.', v_cols;
  END IF;

  -- Both partial unique indexes present.
  SELECT count(*) INTO v_idx FROM pg_indexes
  WHERE schemaname='public'
    AND indexname IN ('client_persons_source_uq','client_remediation_flags_open_uq');
  IF v_idx <> 2 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: expected 2 new indexes, found %.', v_idx;
  END IF;

  RAISE NOTICE '=== M1-B D2a COMPLETE ===';
  RAISE NOTICE 'audit_write_event: created; SECURITY DEFINER; owner %; search_path pinned; anon/authenticated/service_role/PUBLIC EXECUTE denied.', v_owner;
  RAISE NOTICE 'family events: 6 · M1-A events intact: % · additive columns: 7 · new indexes: 2', v_m1a;
  RAISE NOTICE 'audit_log rows unchanged: % · client_persons rows: % · remediation rows: %',
    b.audit_log_rows, b.client_persons_rows, b.remediation_rows;
END
$postcheck$;

COMMIT;
