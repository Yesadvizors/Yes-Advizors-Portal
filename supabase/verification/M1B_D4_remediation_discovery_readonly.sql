-- ============================================================================
--  YAV2 — M1-B D4 — REMEDIATION-FLAGS DISCOVERY (READ-ONLY)
--
--  STATUS: DRAFT / NOT EXECUTED. READ-ONLY — every statement begins with SELECT or
--          WITH; there are ZERO writes (no INSERT/UPDATE/DELETE/MERGE/DDL/GRANT/
--          REVOKE/function creation). Discovery/design only — NO remediation
--          population is authored or performed.
--
--  Target : V2 / yav2-dev ONLY — project ref ogjrwemjefvccpyjwxuo. If any other
--           project (V1/Production zcszesuvjrryxtigjglt), STOP — do not run.
--
--  Purpose: evidence the current remediation-relevant state so PJ + independent
--           review can confirm the D4 rule matrix and schema readiness BEFORE any
--           population is designed. Population is DEFERRED (see design report).
--
--  OUTPUT DISCIPLINE — AGGREGATE COUNTS + BOOLEAN/SCHEMA METADATA ONLY.
--  This file NEVER emits: client UUIDs, names, PAN/GSTIN/CIN/TAN values, mobile,
--  email, Aadhaar values, raw JSON, or duplicate normalized identifier values.
--  (Normalized identifiers are used ONLY inside internal CTE grouping; only counts
--  are emitted. UUID-level diagnostics, if ever needed, are a separate reviewed query.)
--
--  ONE EXACT PRODUCTION-ELIGIBILITY PREDICATE, used identically in every block:
--        coalesce(is_test_client, false) = false
--    AND coalesce(is_draft, false)       = false
--    AND coalesce(status, '')            = 'Active'
--  It yields a NON-NULL boolean per row (prod_elig). The third scope is the EXACT
--  NOT(prod_elig) complement, so every block reconciles:
--        all_current = production_eligible + sample_test_draft_or_inactive.
--
--  Current data is PJ-confirmed sample/testing data; current counts DO NOT
--  represent future production counts.
--
--  RULE STATUS: MISSING_INCORP_DATE and LEGACY_JSONB_DIRECTORS are the only
--  first-pass rules (design only, NOT populated); LEGACY_JSONB_DIRECTORS is a
--  TEMPORARY SAMPLE-CLEANUP OBSERVATION pending the future V2 Clean-Start Reset.
--  MALFORMED_PAN / DUP_IDENTIFIER / GST-registration-mismatch / UNMAPPED_ENTITY_TYPE
--  are CANDIDATE OBSERVATIONS ONLY — non-approved, no severity/resolution/population
--  authority assigned.
-- ============================================================================

-- ---- D4-DISC-01: client universe by scope (counts only) ---------------------
WITH b AS (
  SELECT
    (coalesce(is_test_client,false)=false AND coalesce(is_draft,false)=false AND coalesce(status,'')='Active') AS prod_elig,
    coalesce(is_test_client,false) AS tc,
    coalesce(is_draft,false)       AS dr,
    (status IS DISTINCT FROM 'Active') AS not_active
  FROM public.clients
)
SELECT jsonb_pretty(jsonb_build_object(
  'clients_all_current',                    (SELECT count(*) FROM b),
  'clients_production_eligible',            (SELECT count(*) FROM b WHERE prod_elig),
  'clients_sample_test_draft_or_inactive',  (SELECT count(*) FROM b WHERE NOT prod_elig),
  'is_test_client_true',                    (SELECT count(*) FROM b WHERE tc),
  'is_draft_true',                          (SELECT count(*) FROM b WHERE dr),
  'status_not_active',                      (SELECT count(*) FROM b WHERE not_active),
  'PASS_scope_reconciliation',
     ((SELECT count(*) FROM b)
      = (SELECT count(*) FROM b WHERE prod_elig) + (SELECT count(*) FROM b WHERE NOT prod_elig))
)) AS d4_disc_01_client_universe;


-- ---- D4-DISC-02: MISSING_INCORP_DATE (confirmed rule; NOT populated) --------
WITH b AS (
  SELECT
    (date_of_incorporation IS NULL) AS miss,
    (coalesce(is_test_client,false)=false AND coalesce(is_draft,false)=false AND coalesce(status,'')='Active') AS prod_elig
  FROM public.clients
)
SELECT jsonb_pretty(jsonb_build_object(
  'rule_code',   'MISSING_INCORP_DATE',
  'rule_status', 'CONFIRMED first-pass rule — design only, NOT populated',
  'predicate',   'date_of_incorporation IS NULL',
  'missing_all_current',                    (SELECT count(*) FROM b WHERE miss),
  'missing_production_eligible',            (SELECT count(*) FROM b WHERE miss AND prod_elig),
  'missing_sample_test_draft_or_inactive',  (SELECT count(*) FROM b WHERE miss AND NOT prod_elig),
  'PASS_scope_reconciliation',
     ((SELECT count(*) FROM b WHERE miss)
      = (SELECT count(*) FROM b WHERE miss AND prod_elig) + (SELECT count(*) FROM b WHERE miss AND NOT prod_elig))
)) AS d4_disc_02_missing_incorp_date;


-- ---- D4-DISC-03: LEGACY_JSONB_DIRECTORS (TEMPORARY SAMPLE-CLEANUP OBSERVATION) --
--  Purpose is ONLY to verify sample data pending the future V2 Clean-Start Reset.
--  NOT a permanent real-client remediation rule; NOT populated.
WITH b AS (
  SELECT
    -- CASE guard (NOT reliant on AND short-circuit / expression evaluation order):
    CASE WHEN jsonb_typeof(directors) = 'array'
         THEN jsonb_array_length(directors) > 0
         ELSE false END AS nonempty,
    CASE WHEN jsonb_typeof(directors) = 'array'
         THEN jsonb_array_length(directors)
         ELSE 0 END AS n_elem,
    (coalesce(is_test_client,false)=false AND coalesce(is_draft,false)=false AND coalesce(status,'')='Active') AS prod_elig
  FROM public.clients
)
SELECT jsonb_pretty(jsonb_build_object(
  'rule_code',      'LEGACY_JSONB_DIRECTORS',
  'classification', 'TEMPORARY SAMPLE-CLEANUP OBSERVATION — verifies sample data pending V2 Clean-Start Reset; NOT a permanent rule; NOT populated',
  'predicate',      'CASE WHEN jsonb_typeof(directors)=array THEN jsonb_array_length(directors) > 0 ELSE false END',
  'nonempty_directors_all_current',                   (SELECT count(*) FROM b WHERE nonempty),
  'nonempty_directors_production_eligible',           (SELECT count(*) FROM b WHERE nonempty AND prod_elig),
  'nonempty_directors_sample_test_draft_or_inactive', (SELECT count(*) FROM b WHERE nonempty AND NOT prod_elig),
  'PASS_scope_reconciliation',
     ((SELECT count(*) FROM b WHERE nonempty)
      = (SELECT count(*) FROM b WHERE nonempty AND prod_elig) + (SELECT count(*) FROM b WHERE nonempty AND NOT prod_elig)),
  'total_director_array_elements_all_current',                   (SELECT coalesce(sum(n_elem),0) FROM b),
  'total_director_array_elements_production_eligible',           (SELECT coalesce(sum(n_elem) FILTER (WHERE prod_elig),0) FROM b),
  'total_director_array_elements_sample_test_draft_or_inactive', (SELECT coalesce(sum(n_elem) FILTER (WHERE NOT prod_elig),0) FROM b),
  'PASS_element_scope_reconciliation',
     ((SELECT coalesce(sum(n_elem),0) FROM b)
      = (SELECT coalesce(sum(n_elem) FILTER (WHERE prod_elig),0) FROM b)
        + (SELECT coalesce(sum(n_elem) FILTER (WHERE NOT prod_elig),0) FROM b))
)) AS d4_disc_03_legacy_jsonb_directors;


-- ---- D4-DISC-04a: current remediation flag counts (no client IDs) -----------
SELECT jsonb_pretty(jsonb_build_object(
  'total',    (SELECT count(*) FROM public.client_remediation_flags),
  'open',     (SELECT count(*) FROM public.client_remediation_flags WHERE resolved=false),
  'resolved', (SELECT count(*) FROM public.client_remediation_flags WHERE resolved=true)
)) AS d4_disc_04a_flag_counts;

-- ---- D4-DISC-04b: flag counts by rule_code x resolved (no client IDs) -------
--  Returns zero rows while the table is empty. Emits only rule_code + resolved + n.
SELECT rule_code, resolved, count(*) AS n
FROM public.client_remediation_flags
GROUP BY rule_code, resolved
ORDER BY rule_code, resolved;


-- ---- D4-DISC-05: CANDIDATE OBSERVATIONS (NON-APPROVED; counts only) ---------
--  Diagnostic aggregates ONLY, in all three scopes. NOT approved rules; NO severity
--  / resolution policy / population authority. Require separate business +
--  normalization decisions. No identifier VALUE is emitted (normalized keys live
--  only inside the CTE for grouping).
--
--  NOTE on duplicate-group scope counts: these are diagnostic PERSPECTIVES and are
--  NOT expected to reconcile as all_current = production_only + nonproduction_only,
--  because a duplicate group may SPAN both scopes. dup_*_groups_mixed_scope reports
--  those cross-scope groups (count(*)>1 with >=1 production-eligible AND >=1
--  sample/test/draft/inactive client). Per-row candidate counts (malformed PAN, GST
--  mismatch, unmapped entity type) DO partition and reconcile; duplicate GROUP
--  counts do not.
WITH b AS (
  SELECT
    (coalesce(is_test_client,false)=false AND coalesce(is_draft,false)=false AND coalesce(status,'')='Active') AS prod_elig,
    (pan IS NOT NULL AND btrim(pan)<>'' AND upper(btrim(pan)) !~ '^[A-Z]{5}[0-9]{4}[A-Z]$') AS mal_pan,
    (gstin IS NOT NULL AND btrim(gstin)<>''
       AND NOT EXISTS (SELECT 1 FROM public.client_registrations r WHERE r.client_id=c.id AND r.reg_type='IN_GST')) AS gst_mm,
    (client_type IS NOT NULL AND btrim(client_type)<>''
       AND NOT EXISTS (SELECT 1 FROM public.entity_type_catalogue e WHERE upper(btrim(e.code))=upper(btrim(c.client_type)))) AS unmapped,
    nullif(upper(btrim(pan)),'')   AS pan_k,
    nullif(upper(btrim(gstin)),'') AS gstin_k,
    nullif(upper(btrim(cin)),'')   AS cin_k
  FROM public.clients c
)
SELECT jsonb_pretty(jsonb_build_object(
  'label', 'CANDIDATE OBSERVATIONS — NON-APPROVED; require separate business + normalization decisions; no severity/resolution/population authority',
  'malformed_pan_all_current',                       (SELECT count(*) FROM b WHERE mal_pan),
  'malformed_pan_production_eligible',               (SELECT count(*) FROM b WHERE mal_pan AND prod_elig),
  'malformed_pan_sample_test_draft_or_inactive',     (SELECT count(*) FROM b WHERE mal_pan AND NOT prod_elig),
  'gst_registration_mismatch_all_current',           (SELECT count(*) FROM b WHERE gst_mm),
  'gst_registration_mismatch_production_eligible',   (SELECT count(*) FROM b WHERE gst_mm AND prod_elig),
  'gst_registration_mismatch_sample_test_draft_or_inactive', (SELECT count(*) FROM b WHERE gst_mm AND NOT prod_elig),
  'unmapped_entity_type_all_current',                (SELECT count(*) FROM b WHERE unmapped),
  'unmapped_entity_type_production_eligible',        (SELECT count(*) FROM b WHERE unmapped AND prod_elig),
  'unmapped_entity_type_sample_test_draft_or_inactive', (SELECT count(*) FROM b WHERE unmapped AND NOT prod_elig),
  'dup_pan_groups_all_current',                      (SELECT count(*) FROM (SELECT pan_k FROM b WHERE pan_k IS NOT NULL GROUP BY pan_k HAVING count(*)>1) g),
  'dup_pan_groups_production_eligible',              (SELECT count(*) FROM (SELECT pan_k FROM b WHERE prod_elig AND pan_k IS NOT NULL GROUP BY pan_k HAVING count(*)>1) g),
  'dup_pan_groups_sample_test_draft_or_inactive',    (SELECT count(*) FROM (SELECT pan_k FROM b WHERE NOT prod_elig AND pan_k IS NOT NULL GROUP BY pan_k HAVING count(*)>1) g),
  'dup_pan_groups_mixed_scope',                      (SELECT count(*) FROM (SELECT pan_k FROM b WHERE pan_k IS NOT NULL GROUP BY pan_k HAVING count(*)>1 AND count(*) FILTER (WHERE prod_elig)>=1 AND count(*) FILTER (WHERE NOT prod_elig)>=1) g),
  'dup_gstin_groups_all_current',                    (SELECT count(*) FROM (SELECT gstin_k FROM b WHERE gstin_k IS NOT NULL GROUP BY gstin_k HAVING count(*)>1) g),
  'dup_gstin_groups_production_eligible',            (SELECT count(*) FROM (SELECT gstin_k FROM b WHERE prod_elig AND gstin_k IS NOT NULL GROUP BY gstin_k HAVING count(*)>1) g),
  'dup_gstin_groups_sample_test_draft_or_inactive',  (SELECT count(*) FROM (SELECT gstin_k FROM b WHERE NOT prod_elig AND gstin_k IS NOT NULL GROUP BY gstin_k HAVING count(*)>1) g),
  'dup_gstin_groups_mixed_scope',                    (SELECT count(*) FROM (SELECT gstin_k FROM b WHERE gstin_k IS NOT NULL GROUP BY gstin_k HAVING count(*)>1 AND count(*) FILTER (WHERE prod_elig)>=1 AND count(*) FILTER (WHERE NOT prod_elig)>=1) g),
  'dup_cin_groups_all_current',                      (SELECT count(*) FROM (SELECT cin_k FROM b WHERE cin_k IS NOT NULL GROUP BY cin_k HAVING count(*)>1) g),
  'dup_cin_groups_production_eligible',              (SELECT count(*) FROM (SELECT cin_k FROM b WHERE prod_elig AND cin_k IS NOT NULL GROUP BY cin_k HAVING count(*)>1) g),
  'dup_cin_groups_sample_test_draft_or_inactive',    (SELECT count(*) FROM (SELECT cin_k FROM b WHERE NOT prod_elig AND cin_k IS NOT NULL GROUP BY cin_k HAVING count(*)>1) g),
  'dup_cin_groups_mixed_scope',                      (SELECT count(*) FROM (SELECT cin_k FROM b WHERE cin_k IS NOT NULL GROUP BY cin_k HAVING count(*)>1 AND count(*) FILTER (WHERE prod_elig)>=1 AND count(*) FILTER (WHERE NOT prod_elig)>=1) g)
)) AS d4_disc_05_candidate_observations;


-- ---- D4-DISC-06: remediation-column schema metadata ------------------------
SELECT jsonb_pretty(jsonb_build_object(
  'columns_present',
     (SELECT count(*) FROM (VALUES
        ('flag_type'),('severity'),('detail'),('resolved'),('created_by'),
        ('resolved_by'),('resolved_at'),('rule_code'),('rule_version'),('batch_id')) AS req(c)
      WHERE EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='client_remediation_flags' AND column_name=req.c)),
  'columns_expected', 10,
  'rule_code_type',    (SELECT data_type FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='client_remediation_flags' AND column_name='rule_code'),
  'rule_version_type', (SELECT data_type FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='client_remediation_flags' AND column_name='rule_version'),
  'batch_id_type',     (SELECT data_type FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='client_remediation_flags' AND column_name='batch_id'),
  'severity_default',  (SELECT column_default FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='client_remediation_flags' AND column_name='severity'),
  'resolved_default',  (SELECT column_default FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='client_remediation_flags' AND column_name='resolved'),
  'severity_check_present',
     (SELECT count(*) FROM pg_constraint con
      JOIN pg_class rel ON rel.oid=con.conrelid
      JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
      WHERE nsp.nspname='public' AND rel.relname='client_remediation_flags' AND con.contype='c'
        AND pg_get_constraintdef(con.oid) ILIKE '%severity%')
)) AS d4_disc_06_schema_metadata;


-- ---- D4-DISC-07: indexes (open-rule idempotency key) -----------------------
SELECT jsonb_pretty(jsonb_build_object(
  'open_uq_present',
     (SELECT count(*) FROM pg_indexes WHERE schemaname='public'
        AND tablename='client_remediation_flags' AND indexname='client_remediation_flags_open_uq'),
  'open_uq_def',
     (SELECT indexdef FROM pg_indexes WHERE schemaname='public'
        AND tablename='client_remediation_flags' AND indexname='client_remediation_flags_open_uq'),
  'idx_remediation_client_present',
     (SELECT count(*) FROM pg_indexes WHERE schemaname='public'
        AND tablename='client_remediation_flags' AND indexname='idx_remediation_client'),
  'idx_remediation_open_present',
     (SELECT count(*) FROM pg_indexes WHERE schemaname='public'
        AND tablename='client_remediation_flags' AND indexname='idx_remediation_open')
)) AS d4_disc_07_indexes;


-- ---- D4-DISC-08: RLS enabled / forced --------------------------------------
SELECT jsonb_pretty(jsonb_build_object(
  'rls_enabled', (SELECT relrowsecurity     FROM pg_class WHERE oid='public.client_remediation_flags'::regclass),
  'rls_forced',  (SELECT relforcerowsecurity FROM pg_class WHERE oid='public.client_remediation_flags'::regclass)
)) AS d4_disc_08_rls;


-- ---- D4-DISC-09: grants + policy shape (metadata only) ---------------------
SELECT jsonb_pretty(jsonb_build_object(
  'authenticated_select', has_table_privilege('authenticated','public.client_remediation_flags','SELECT'),
  'authenticated_insert', has_table_privilege('authenticated','public.client_remediation_flags','INSERT'),
  'authenticated_update', has_table_privilege('authenticated','public.client_remediation_flags','UPDATE'),
  'authenticated_delete', has_table_privilege('authenticated','public.client_remediation_flags','DELETE'),
  'anon_select',          has_table_privilege('anon','public.client_remediation_flags','SELECT'),
  'policy_count',         (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='client_remediation_flags'),
  'policy_cmds',          (SELECT jsonb_agg(DISTINCT cmd ORDER BY cmd) FROM pg_policies WHERE schemaname='public' AND tablename='client_remediation_flags')
)) AS d4_disc_09_grants_policies;


-- ---- D4-DISC-10: remediation-named-function catalogue check ----------------
--  NARROW claim: this checks ONLY for public functions whose NAME contains
--  'remediation'. It does NOT prove the absence of every differently-named write
--  function; a governed remediation write path must be confirmed by repository
--  review (see design report §7).
SELECT jsonb_pretty(jsonb_build_object(
  'remediation_named_functions',
     (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname ILIKE '%remediation%'),
  'no_remediation_named_function_found',
     ((SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname ILIKE '%remediation%') = 0),
  'note', 'Name-only catalogue check; does not prove absence of a differently-named write function — confirm governed write path by repository review.'
)) AS d4_disc_10_remediation_function_check;
-- ============================================================================
--  END D4 DISCOVERY (READ-ONLY / DRAFT / NOT EXECUTED). No writes. Aggregate
--  counts + boolean/schema metadata only. No population authored.
-- ============================================================================
