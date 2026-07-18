-- ============================================================================
--  YAV2 — Module 1 — M1-B D3 SUPPLEMENTARY LEGACY-PERSON DISCOVERY (READ-ONLY)
--
--  Target : V2 / yav2-dev ONLY — Supabase project ref ogjrwemjefvccpyjwxuo.
--           If the dashboard names any other project (V1/Production
--           zcszesuvjrryxtigjglt), STOP — do not run.
--
--  Purpose: gather the bounded supplementary evidence that the D3 reviewer HOLD
--           requires BEFORE Migration 0019 may be authored:
--             A. exact client_persons schema relevant to the backfill;
--             B. exact unique-constraint / index definitions on client_persons;
--             S. full JSONB source universe reconciliation (array vs object entries);
--             C. idempotency feasibility — the stable per-entry source key;
--             D. role vocabulary (grouped, non-sensitive) vs person_type domain;
--             E. weak-identity partition counts reconciling to the current object-entry
--                source total (protected baseline expectation is 26, verified at execution);
--             F. controlled record-level execution-evidence output (non-sensitive).
--
--  READ-ONLY BY CONSTRUCTION: every statement is a SELECT or a WITH...SELECT.
--  The file contains NO write statement and NO schema-changing statement of any
--  kind (no data-modifying language, no data-definition language, no RPC, no
--  procedural block). Safe to run repeatedly. NO backfill is authored or run here.
--
--  NO PERSONAL VALUES: no name / PAN / Aadhaar / mobile / email value is ever
--  emitted. Only catalog metadata, COUNTs, IS-NULL / regex predicates, GROUP BY
--  over NORMALISED role designations (non-sensitive, explicitly requested),
--  client UUIDs, source array ordinals, and outcome/reason codes appear.
--  Aadhaar keys are neither read for value nor emitted anywhere in this file.
-- ============================================================================


-- ===========================================================================
-- SECTION A — client_persons schema relevant to the proposed backfill
-- ===========================================================================

-- A.1 — columns: names, types, nullability, defaults (catalog metadata only).
SELECT
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'client_persons'
ORDER BY ordinal_position;

-- A.2 — check constraints AND foreign keys AND unique/primary constraints,
--       with their exact server-rendered definitions.
SELECT
  con.conname                       AS constraint_name,
  con.contype                       AS constraint_type,   -- c=check f=fkey u=unique p=pkey
  pg_get_constraintdef(con.oid)     AS definition
FROM pg_constraint con
JOIN pg_class     rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public' AND rel.relname = 'client_persons'
ORDER BY con.contype, con.conname;

-- A.3 — person_type permitted values IF the column is backed by an enum type.
--       (If person_type is not an enum, this returns no rows and the allowed
--        set is instead defined by any check constraint listed in A.2.)
SELECT
  t.typname          AS enum_type,
  e.enumlabel        AS permitted_value,
  e.enumsortorder    AS sort_order
FROM information_schema.columns c
JOIN pg_namespace tn ON tn.nspname = c.udt_schema
JOIN pg_type t ON t.typname = c.udt_name AND t.typnamespace = tn.oid
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE c.table_schema = 'public'
  AND c.table_name  = 'client_persons'
  AND c.column_name = 'person_type'
ORDER BY e.enumsortorder;

-- A.4 — person_type OBSERVED values (grouped counts; person_type is non-sensitive).
--       client_persons is expected empty (0 rows) at discovery, so this is
--       expected to return no rows.
SELECT
  coalesce(person_type::text, '(null)') AS person_type,
  count(*)                              AS n
FROM public.client_persons
GROUP BY 1
ORDER BY 1;

-- A.5 — all lineage / source / batch / provenance related columns.
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'client_persons'
  AND (
        column_name ILIKE '%source%'
     OR column_name ILIKE '%batch%'
     OR column_name ILIKE '%lineage%'
     OR column_name ILIKE '%origin%'
     OR column_name ILIKE '%provenance%'
     OR column_name IN ('created_at', 'updated_at', 'created_by', 'inserted_at')
      )
ORDER BY column_name;


-- ===========================================================================
-- SECTION B — exact unique constraint / index definitions on client_persons
-- ===========================================================================

-- B.1 — every index on client_persons with its full definition (column order,
--       expressions and partial predicate are all contained in indexdef).
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'client_persons'
ORDER BY indexname;

-- B.2 — the named idempotency index client_persons_source_uq, isolated, with
--       uniqueness flag and the partial predicate rendered explicitly.
SELECT
  c2.relname                                   AS index_name,
  i.indisunique                                AS is_unique,
  i.indisprimary                               AS is_primary,
  pg_get_indexdef(i.indexrelid)                AS index_def,
  pg_get_expr(i.indpred, i.indrelid)           AS index_predicate
FROM pg_index i
JOIN pg_class     c1 ON c1.oid = i.indrelid
JOIN pg_class     c2 ON c2.oid = i.indexrelid
JOIN pg_namespace n  ON n.oid  = c1.relnamespace
WHERE n.nspname = 'public' AND c1.relname = 'client_persons'
  AND c2.relname = 'client_persons_source_uq'
ORDER BY c2.relname;


-- ===========================================================================
-- SECTION S — full JSONB source universe reconciliation (COUNTS ONLY)
-- ===========================================================================
-- Proves the COMPLETE clients.directors universe before any classification.
-- Sections C / E / F classify OBJECT entries only; this block accounts for the
-- full universe so nothing is silently dropped. Any non-object array element is
-- reported here and, if present (non_object_elements > 0), MUST keep the eventual
-- Migration 0019 BLOCKED until explicitly handled. No personal value is emitted.
WITH dirs AS (
  SELECT
    c.id                       AS client_uuid,
    c.directors                AS d,
    jsonb_typeof(c.directors)  AS dtype
  FROM public.clients c
),
elems AS (
  SELECT jsonb_typeof(e.elem) AS etype
  FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors) = 'array' THEN c.directors ELSE '[]'::jsonb END
       ) AS e(elem)
)
-- Client-level directors partition — mutually exclusive, sums to clients_total:
--   sql_null + jsonb_null + is_array + nonnull_nonarray_nonjsonbnull = clients_total.
--   null_like_total = sql_null + jsonb_null (a convenience roll-up of its first two
--   members; it is NOT an additional partition member and must not be re-added).
--   SQL NULL (column absent) and JSONB 'null' (a stored null literal) are distinct:
--   jsonb_typeof(<sql null>) is NULL, jsonb_typeof('null'::jsonb) is 'null'.
SELECT jsonb_pretty(jsonb_build_object(
  'clients_total',                                  (SELECT count(*) FROM dirs),
  'clients_directors_sql_null',                     (SELECT count(*) FROM dirs WHERE d IS NULL),
  'clients_directors_jsonb_null',                   (SELECT count(*) FROM dirs WHERE d IS NOT NULL AND dtype = 'null'),
  'clients_directors_null_like_total',              (SELECT count(*) FROM dirs WHERE d IS NULL OR dtype = 'null'),
  'clients_directors_is_array',                     (SELECT count(*) FROM dirs WHERE dtype = 'array'),
  'clients_directors_nonnull_nonarray_nonjsonbnull',(SELECT count(*) FROM dirs WHERE d IS NOT NULL AND dtype <> 'array' AND dtype <> 'null'),
  'total_jsonb_array_elements',                     (SELECT count(*) FROM elems),
  'object_elements',                                (SELECT count(*) FROM elems WHERE etype = 'object'),
  'non_object_elements',                            (SELECT count(*) FROM elems WHERE etype <> 'object'),
  'all_array_elements_are_objects',
     ((SELECT count(*) FROM elems WHERE etype = 'object') = (SELECT count(*) FROM elems)),
  'current_object_entry_total',                     (SELECT count(*) FROM elems WHERE etype = 'object'),
  'matches_protected_baseline_26',                  ((SELECT count(*) FROM elems WHERE etype = 'object') = 26),
  'non_object_elements_block_migration',            ((SELECT count(*) FROM elems WHERE etype <> 'object') > 0)
)) AS d3s_sectionS_full_source_universe;


-- ===========================================================================
-- SECTION C — idempotency feasibility: the stable per-entry source key
-- ===========================================================================
-- The clients.directors JSONB array has no intrinsic key. The only candidate
-- stable per-entry key is (client uuid, source array ordinal). This section
-- proves the cardinality and uniqueness of that candidate key. Ordinal STABILITY
-- across future app edits is NOT proven by SQL and MUST NOT be assumed — see the
-- addendum: idempotency is not yet assumed and depends on Section B's exact index
-- definition covering a stable per-entry key.
WITH src AS (
  SELECT
    c.id AS client_uuid,
    ord  AS source_ordinal
  FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors) = 'array' THEN c.directors ELSE '[]'::jsonb END
       ) WITH ORDINALITY AS t(elem, ord)
  WHERE jsonb_typeof(elem) = 'object'
)
SELECT jsonb_pretty(jsonb_build_object(
  'object_entries_total',        (SELECT count(*) FROM src),
  'distinct_client_ordinal_keys',(SELECT count(*) FROM (SELECT DISTINCT client_uuid, source_ordinal FROM src) s),
  'client_ordinal_key_is_unique',
     ((SELECT count(*) FROM src)
       = (SELECT count(*) FROM (SELECT DISTINCT client_uuid, source_ordinal FROM src) s)),
  'max_entries_in_one_client',   (SELECT coalesce(max(cnt),0)
                                    FROM (SELECT client_uuid, count(*) cnt FROM src GROUP BY client_uuid) g),
  'clients_carrying_entries',    (SELECT count(DISTINCT client_uuid) FROM src)
)) AS d3s_sectionC_idempotency_key_feasibility;


-- ===========================================================================
-- SECTION D — role vocabulary (grouped, non-sensitive) vs person_type domain
-- ===========================================================================

-- D.1 — grouped counts of the normalised legacy role designation. Role is a
--       designation field (non-sensitive) and its enumeration is explicitly
--       requested. Null / blank roles are bucketed as '(blank_or_null)'.
WITH roles AS (
  SELECT
    coalesce(nullif(btrim(regexp_replace(lower(coalesce(e.elem->>'role','')), '\s+', ' ', 'g')), ''),
             '(blank_or_null)') AS role_norm
  FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors) = 'array' THEN c.directors ELSE '[]'::jsonb END
       ) AS e(elem)
  WHERE jsonb_typeof(e.elem) = 'object'
)
SELECT role_norm, count(*) AS n
FROM roles
GROUP BY role_norm
ORDER BY n DESC, role_norm;

-- D.2 — the permitted person_type domain, restated here for the role -> type
--       crosswalk gap analysis (enum path; empty if not an enum — then A.2).
SELECT
  e.enumlabel     AS permitted_person_type,
  e.enumsortorder AS sort_order
FROM information_schema.columns c
JOIN pg_namespace tn ON tn.nspname = c.udt_schema
JOIN pg_type t ON t.typname = c.udt_name AND t.typnamespace = tn.oid
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE c.table_schema = 'public'
  AND c.table_name  = 'client_persons'
  AND c.column_name = 'person_type'
ORDER BY e.enumsortorder;


-- ===========================================================================
-- SECTION E — weak-identity partition (COUNTS ONLY; reconciles exactly to the
--             current object-entry source total; protected baseline expectation
--             is 26 and must be verified at execution)
-- ===========================================================================
-- Mutually exclusive buckets assigned by strict priority, over object entries:
--   1) name missing/blank                         -> EXCLUDED
--   2) name repeated within same client           -> HELD  (rule 4: never merged)
--   3) name unique in client + mobile AND email    -> CANDIDATE
--   4) name unique in client + mobile only         -> CANDIDATE
--   5) name unique in client + email only          -> CANDIDATE
--   6) name unique in client + no secondary signal -> HELD  (the name-only set)
-- Malformed PAN is reported as a NON-partitioning overlay (it never removes a
-- row from its bucket; per rule 6 a malformed PAN value is simply never copied).
WITH elems AS (
  SELECT
    c.id AS client_uuid,
    ord  AS source_ordinal,
    lower(regexp_replace(coalesce(e.elem->>'name',''), '\s+', ' ', 'g')) AS name_key_raw,
    nullif(btrim(e.elem->>'mobile'), '')            AS mobile_n,
    nullif(lower(btrim(e.elem->>'email')), '')      AS email_n,
    nullif(upper(btrim(e.elem->>'pan')), '')        AS pan_n
  FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors) = 'array' THEN c.directors ELSE '[]'::jsonb END
       ) WITH ORDINALITY AS e(elem, ord)
  WHERE jsonb_typeof(e.elem) = 'object'
),
norm AS (
  SELECT
    client_uuid, source_ordinal, mobile_n, email_n, pan_n,
    nullif(btrim(name_key_raw), '') AS name_key
  FROM elems
),
grp AS (
  SELECT
    n.*,
    CASE WHEN name_key IS NOT NULL
         THEN count(*) OVER (PARTITION BY client_uuid, name_key)
         ELSE NULL END AS name_count_in_client
  FROM norm n
),
bucketed AS (
  SELECT
    client_uuid, source_ordinal, pan_n,
    CASE
      WHEN name_key IS NULL                              THEN 'EXCLUDED_missing_name'
      WHEN name_count_in_client > 1                      THEN 'HELD_repeated_name'
      WHEN mobile_n IS NOT NULL AND email_n IS NOT NULL  THEN 'CAND_name_unique_both'
      WHEN mobile_n IS NOT NULL                          THEN 'CAND_name_unique_mobile_only'
      WHEN email_n  IS NOT NULL                          THEN 'CAND_name_unique_email_only'
      ELSE                                                    'HELD_name_only_no_signal'
    END AS bucket
  FROM grp
)
SELECT jsonb_pretty(jsonb_build_object(
  'total_object_entries',              (SELECT count(*) FROM bucketed),
  -- individual mutually exclusive buckets
  'EXCLUDED_missing_name',             (SELECT count(*) FROM bucketed WHERE bucket = 'EXCLUDED_missing_name'),
  'HELD_repeated_name',                (SELECT count(*) FROM bucketed WHERE bucket = 'HELD_repeated_name'),
  'HELD_name_only_no_signal',          (SELECT count(*) FROM bucketed WHERE bucket = 'HELD_name_only_no_signal'),
  'CAND_name_unique_mobile_only',      (SELECT count(*) FROM bucketed WHERE bucket = 'CAND_name_unique_mobile_only'),
  'CAND_name_unique_email_only',       (SELECT count(*) FROM bucketed WHERE bucket = 'CAND_name_unique_email_only'),
  'CAND_name_unique_both',             (SELECT count(*) FROM bucketed WHERE bucket = 'CAND_name_unique_both'),
  -- rolled-up outcome totals
  'candidate_total',                   (SELECT count(*) FROM bucketed WHERE bucket LIKE 'CAND_%'),
  'held_total',                        (SELECT count(*) FROM bucketed WHERE bucket LIKE 'HELD_%'),
  'excluded_total',                    (SELECT count(*) FROM bucketed WHERE bucket LIKE 'EXCLUDED_%'),
  'reconciles_total',                  (SELECT count(*) FROM bucketed
                                          WHERE bucket LIKE 'CAND_%' OR bucket LIKE 'HELD_%' OR bucket LIKE 'EXCLUDED_%'),
  -- baseline check only (NOT assumed): report whether current total equals 26
  'object_entry_total_equals_baseline_26', ((SELECT count(*) FROM bucketed) = 26),
  -- overlap proof: buckets are exclusive by construction, so this must equal total
  'buckets_are_mutually_exclusive',
     ((SELECT count(*) FROM bucketed)
       = (SELECT count(*) FROM bucketed
            WHERE bucket LIKE 'CAND_%' OR bucket LIKE 'HELD_%' OR bucket LIKE 'EXCLUDED_%')),
  -- non-partitioning diagnostic overlay
  'overlay_entries_with_malformed_pan',(SELECT count(*) FROM bucketed
                                          WHERE pan_n IS NOT NULL AND pan_n !~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  'overlay_entries_with_any_pan',      (SELECT count(*) FROM bucketed WHERE pan_n IS NOT NULL)
)) AS d3s_sectionE_weak_identity_partition;


-- ===========================================================================
-- SECTION F — controlled, NON-SENSITIVE record-level execution-evidence output
-- ===========================================================================
-- Recommended manifest schema emits ONLY non-sensitive fields: client UUID,
-- source array ordinal, outcome_code, reason_code, and a malformed-PAN overlay
-- flag. It emits NO name / PAN / Aadhaar / mobile / email value, and NO hash of
-- any personal value (a name hash over a tiny domain is potentially reversible,
-- so it is deliberately excluded). batch_id is NULL here (assigned only at a
-- future authorised run). This is a TRANSIENT SQL result set — NOT inherently
-- durable; it becomes durable evidence only if PJ saves it into an approved
-- controlled evidence artifact or later approves a dedicated manifest table (no
-- such table is created here). Migration 0019 would reuse this classification.
WITH elems AS (
  SELECT
    c.id AS client_uuid,
    ord  AS source_ordinal,
    lower(regexp_replace(coalesce(e.elem->>'name',''), '\s+', ' ', 'g')) AS name_key_raw,
    nullif(btrim(e.elem->>'mobile'), '')            AS mobile_n,
    nullif(lower(btrim(e.elem->>'email')), '')      AS email_n,
    nullif(upper(btrim(e.elem->>'pan')), '')        AS pan_n
  FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors) = 'array' THEN c.directors ELSE '[]'::jsonb END
       ) WITH ORDINALITY AS e(elem, ord)
  WHERE jsonb_typeof(e.elem) = 'object'
),
norm AS (
  SELECT client_uuid, source_ordinal, mobile_n, email_n, pan_n,
         nullif(btrim(name_key_raw), '') AS name_key
  FROM elems
),
grp AS (
  SELECT n.*,
         CASE WHEN name_key IS NOT NULL
              THEN count(*) OVER (PARTITION BY client_uuid, name_key)
              ELSE NULL END AS name_count_in_client
  FROM norm n
)
SELECT
  client_uuid,
  source_ordinal,
  CASE
    WHEN name_key IS NULL             THEN 'EXCLUDED'
    WHEN name_count_in_client > 1     THEN 'HELD'
    WHEN mobile_n IS NOT NULL OR email_n IS NOT NULL THEN 'MIGRATE_CANDIDATE'
    ELSE                                   'HELD'
  END AS outcome_code,
  CASE
    WHEN name_key IS NULL                             THEN 'EXCLUDED_MISSING_NAME'
    WHEN name_count_in_client > 1                     THEN 'HELD_REPEATED_NAME'
    WHEN mobile_n IS NOT NULL AND email_n IS NOT NULL THEN 'NAME_UNIQUE_BOTH'
    WHEN mobile_n IS NOT NULL                         THEN 'NAME_UNIQUE_MOBILE_ONLY'
    WHEN email_n  IS NOT NULL                         THEN 'NAME_UNIQUE_EMAIL_ONLY'
    ELSE                                                   'HELD_NAME_ONLY_NO_SIGNAL'
  END AS reason_code,
  (pan_n IS NOT NULL AND pan_n !~ '^[A-Z]{5}[0-9]{4}[A-Z]$') AS overlay_malformed_pan,
  NULL::text AS batch_id   -- assigned only at a future authorised run; never here
FROM grp
ORDER BY client_uuid, source_ordinal;
