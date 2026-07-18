-- ============================================================================
--  YAV2 — Module 1 — M1-B D3 LEGACY-PERSON BACKFILL  PRE-DISCOVERY  (READ-ONLY)
--
--  Target : V2 / yav2-dev ONLY — Supabase project ref ogjrwemjefvccpyjwxuo.
--           If the dashboard names any other project (V1/Production
--           zcszesuvjrryxtigjglt), STOP — do not run.
--  Purpose: size and characterise the legacy person sources
--             (a) clients.directors jsonb  (uuid clients.id directly available)
--             (b) client_directors table    (text client_id → join clients.client_id)
--           to ground the D3 backfill design into public.client_persons. Grounds the
--           dedupe ladder, ambiguity handling, the Aadhaar-exclusion size and the
--           protected post-backfill baseline. NO backfill is authored or run here.
--
--  READ-ONLY BY CONSTRUCTION: every statement is a SELECT. No INSERT/UPDATE/DELETE/
--  DDL, no RPC, no writes of any kind. Safe to run repeatedly.
--
--  NO SENSITIVE VALUES: PAN / Aadhaar / mobile / email / names appear ONLY inside
--  COUNTs, IS-NULL / regex predicates, GROUP BY over NORMALISED values (whose values
--  are never SELECTed), and jsonb KEY NAMES (structural metadata, not PII). Aadhaar
--  last-four / masked are COUNTED only — never emitted. Preserve every block's output
--  as D3 design evidence.
--
--  Legacy director jsonb shape (from the app writer directorForPersist):
--    { name, din, email, mobile, pan, aadhaar_last4, aadhaar_masked, role }
--  NB: designation/appointment/cessation/nationality/is_active are NOT in the jsonb
--      (they exist only on the client_directors table).
-- ============================================================================


-- ---- Block 1: source sizing (clients.directors jsonb) ----------------------
-- Clients with a non-empty directors array; total director elements; malformed rows.
SELECT jsonb_pretty(jsonb_build_object(
  'clients_total',                       (SELECT count(*) FROM public.clients),
  'clients_with_nonempty_directors', (
     SELECT count(*) FROM public.clients
     WHERE directors IS NOT NULL AND jsonb_typeof(directors) = 'array'
       AND jsonb_array_length(directors) > 0),
  'total_jsonb_director_entries', (
     SELECT coalesce(sum(jsonb_array_length(directors)), 0) FROM public.clients
     WHERE directors IS NOT NULL AND jsonb_typeof(directors) = 'array'),
  'clients_directors_not_null_but_not_array', (
     SELECT count(*) FROM public.clients
     WHERE directors IS NOT NULL AND jsonb_typeof(directors) <> 'array'),
  'jsonb_director_elements_not_object', (
     SELECT count(*) FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors)='array' THEN c.directors ELSE '[]'::jsonb END) AS e
     WHERE jsonb_typeof(e) <> 'object'),
  'distinct_director_jsonb_keys', (
     SELECT coalesce(jsonb_agg(DISTINCT k ORDER BY k), '[]'::jsonb)
     FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors)='array' THEN c.directors ELSE '[]'::jsonb END) AS e,
       LATERAL jsonb_object_keys(e) AS k)
)) AS d3_block1_source_sizing;


-- ---- Block 2: counts by entity type (clients carrying directors) -----------
SELECT coalesce(client_type, '(null)') AS client_type,
       count(*)                        AS clients_with_directors,
       coalesce(sum(jsonb_array_length(directors)), 0) AS director_entries
FROM public.clients
WHERE directors IS NOT NULL AND jsonb_typeof(directors) = 'array'
  AND jsonb_array_length(directors) > 0
GROUP BY client_type
ORDER BY 1;


-- ---- Block 3: per-element field presence / quality (jsonb source) ----------
-- Uses a normalised expansion. No value is emitted — only counts.
WITH dir AS (
  SELECT c.id AS client_uuid,
         e.elem,
         nullif(btrim(e.elem->>'name'), '')                        AS nm,
         nullif(upper(btrim(e.elem->>'pan')), '')                  AS pan_n,
         nullif(btrim(e.elem->>'din'), '')                         AS din_n,
         nullif(btrim(e.elem->>'role'), '')                        AS role_n,
         lower(regexp_replace(coalesce(e.elem->>'name',''), '\s+', ' ', 'g')) AS name_key
  FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors)='array' THEN c.directors ELSE '[]'::jsonb END) AS e(elem)
  WHERE jsonb_typeof(e.elem) = 'object'
)
SELECT jsonb_pretty(jsonb_build_object(
  'director_elements_total',        (SELECT count(*) FROM dir),
  'missing_or_blank_name',          (SELECT count(*) FROM dir WHERE nm IS NULL),
  'has_pan',                        (SELECT count(*) FROM dir WHERE pan_n IS NOT NULL),
  'has_valid_pan_format',           (SELECT count(*) FROM dir WHERE pan_n ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  'has_malformed_pan',              (SELECT count(*) FROM dir WHERE pan_n IS NOT NULL AND pan_n !~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  'has_din',                        (SELECT count(*) FROM dir WHERE din_n IS NOT NULL),
  'has_valid_din_format',           (SELECT count(*) FROM dir WHERE din_n ~ '^[0-9]{8}$'),
  'has_role_designation',           (SELECT count(*) FROM dir WHERE role_n IS NOT NULL),
  'no_pan_and_no_din_weak_identity',(SELECT count(*) FROM dir WHERE pan_n IS NULL AND din_n IS NULL)
)) AS d3_block3_field_presence;


-- ---- Block 4: Aadhaar exclusion sizing (COUNTS ONLY — never values) ---------
-- D3 MUST NOT copy aadhaar_last4 / aadhaar_masked or any Aadhaar digit into
-- client_persons. This block sizes how many legacy entries carry them so the
-- exclusion is provable and so each is recorded as an EXCEPTION item. The presence
-- of legacy masked/last-four does NOT imply verification: backfilled persons take
-- the neutral approved value 'Not Provided' (the column's NOT NULL default — null is
-- not permitted); NO 'Masked Only' / 'Verified' / 'Exception' status is inferred from
-- legacy metadata.
SELECT jsonb_pretty(jsonb_build_object(
  'jsonb_entries_with_aadhaar_last4', (
     SELECT count(*) FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors)='array' THEN c.directors ELSE '[]'::jsonb END) AS e
     WHERE jsonb_typeof(e)='object' AND nullif(btrim(e->>'aadhaar_last4'),'') IS NOT NULL),
  'jsonb_entries_with_aadhaar_masked', (
     SELECT count(*) FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors)='array' THEN c.directors ELSE '[]'::jsonb END) AS e
     WHERE jsonb_typeof(e)='object' AND nullif(btrim(e->>'aadhaar_masked'),'') IS NOT NULL),
  'jsonb_entries_with_any_aadhaar', (
     SELECT count(*) FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors)='array' THEN c.directors ELSE '[]'::jsonb END) AS e
     WHERE jsonb_typeof(e)='object'
       AND (nullif(btrim(e->>'aadhaar_last4'),'') IS NOT NULL
         OR nullif(btrim(e->>'aadhaar_masked'),'') IS NOT NULL)),
  'jsonb_entries_with_RAW_aadhaar_key_expect_0', (
     -- directorForPersist never writes a raw `aadhaar` key; prove none exists.
     SELECT count(*) FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors)='array' THEN c.directors ELSE '[]'::jsonb END) AS e
     WHERE jsonb_typeof(e)='object' AND (e ? 'aadhaar'))
)) AS d3_block4_aadhaar_exclusion_sizing;


-- ---- Block 5: dedupe candidates (grouped; VALUES never emitted) -------------
-- Duplicate detection is PER-CLIENT: same-client repeated PAN / DIN / name are
-- candidates to collapse into ONE client_persons row for THAT client. A PAN or DIN
-- repeated ACROSS DIFFERENT clients is a legitimate SEPARATE per-client association
-- (a person who is a director of several clients) — reported separately and NEVER
-- treated as a duplicate to merge. Name matching is within-client only (the merge
-- rule additionally requires supporting evidence — see the design report).
WITH dir AS (
  SELECT c.id AS client_uuid,
         nullif(upper(btrim(e.elem->>'pan')), '') AS pan_n,
         nullif(btrim(e.elem->>'din'), '')        AS din_n,
         lower(regexp_replace(coalesce(e.elem->>'name',''), '\s+', ' ', 'g')) AS name_key
  FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors)='array' THEN c.directors ELSE '[]'::jsonb END) AS e(elem)
  WHERE jsonb_typeof(e.elem)='object'
)
SELECT jsonb_pretty(jsonb_build_object(
  -- SAME-CLIENT duplicates (collapse to one row per client at backfill):
  'same_client_dup_pan_groups', (
     SELECT count(*) FROM (
       SELECT client_uuid, pan_n FROM dir WHERE pan_n ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'
       GROUP BY client_uuid, pan_n HAVING count(*) > 1) g),
  'same_client_dup_din_groups', (
     SELECT count(*) FROM (
       SELECT client_uuid, din_n FROM dir WHERE din_n ~ '^[0-9]{8}$'
       GROUP BY client_uuid, din_n HAVING count(*) > 1) g),
  'same_client_dup_name_groups', (
     SELECT count(*) FROM (
       SELECT client_uuid, name_key FROM dir WHERE name_key <> ''
       GROUP BY client_uuid, name_key HAVING count(*) > 1) g),
  -- CROSS-CLIENT repeated identity (NOT duplicates — separate associations preserved):
  'cross_client_pan_identities', (
     SELECT count(*) FROM (
       SELECT pan_n FROM dir WHERE pan_n ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'
       GROUP BY pan_n HAVING count(DISTINCT client_uuid) > 1) g),
  'cross_client_din_identities', (
     SELECT count(*) FROM (
       SELECT din_n FROM dir WHERE din_n ~ '^[0-9]{8}$'
       GROUP BY din_n HAVING count(DISTINCT client_uuid) > 1) g)
)) AS d3_block5_dedupe_candidates;


-- ---- Block 6: ambiguous records requiring MANUAL review --------------------
-- Ambiguous = cannot be resolved by the deterministic PAN→DIN→name+evidence ladder:
--   * no valid PAN and no valid DIN (name-only) AND no secondary signal (mobile/email);
--   * a valid PAN that maps to more than one DISTINCT normalised name (identity conflict).
WITH dir AS (
  SELECT c.id AS client_uuid,
         nullif(upper(btrim(e.elem->>'pan')), '')  AS pan_n,
         nullif(btrim(e.elem->>'din'), '')         AS din_n,
         nullif(btrim(e.elem->>'mobile'), '')      AS mobile_n,
         nullif(lower(btrim(e.elem->>'email')), '') AS email_n,
         lower(regexp_replace(coalesce(e.elem->>'name',''), '\s+', ' ', 'g')) AS name_key
  FROM public.clients c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.directors)='array' THEN c.directors ELSE '[]'::jsonb END) AS e(elem)
  WHERE jsonb_typeof(e.elem)='object'
)
SELECT jsonb_pretty(jsonb_build_object(
  'name_only_no_secondary_signal', (
     SELECT count(*) FROM dir
     WHERE (pan_n IS NULL OR pan_n !~ '^[A-Z]{5}[0-9]{4}[A-Z]$')
       AND (din_n IS NULL OR din_n !~ '^[0-9]{8}$')
       AND mobile_n IS NULL AND email_n IS NULL),
  'valid_pan_mapping_to_multiple_names', (
     SELECT count(*) FROM (
       SELECT pan_n FROM dir
       WHERE pan_n ~ '^[A-Z]{5}[0-9]{4}[A-Z]$' AND name_key <> ''
       GROUP BY pan_n HAVING count(DISTINCT name_key) > 1) g)
)) AS d3_block6_ambiguous;


-- ---- Block 7: legacy client_directors table (secondary source) -------------
-- Expected 0 rows per prior discovery; confirm size + dedupe-key availability.
SELECT jsonb_pretty(jsonb_build_object(
  'client_directors_rows',               (SELECT count(*) FROM public.client_directors),
  'client_directors_distinct_text_clients', (SELECT count(DISTINCT client_id) FROM public.client_directors),
  'client_directors_joinable_to_clients', (
     SELECT count(*) FROM public.client_directors cd
     WHERE EXISTS (SELECT 1 FROM public.clients c WHERE c.client_id = cd.client_id)),
  'client_directors_valid_pan', (
     SELECT count(*) FROM public.client_directors
     WHERE pan IS NOT NULL AND upper(btrim(pan)) ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  'client_directors_with_aadhaar_last4_or_masked', (
     SELECT count(*) FROM public.client_directors
     WHERE nullif(btrim(aadhaar_last4),'') IS NOT NULL OR nullif(btrim(aadhaar_masked),'') IS NOT NULL),
  'client_directors_missing_name', (
     SELECT count(*) FROM public.client_directors WHERE nullif(btrim(name),'') IS NULL)
)) AS d3_block7_client_directors;


-- ---- Block 8: target state + collision with existing normalized persons -----
SELECT jsonb_pretty(jsonb_build_object(
  'client_persons_rows',                (SELECT count(*) FROM public.client_persons),
  'client_persons_backfilled_rows', (
     SELECT count(*) FROM public.client_persons WHERE source_system IS NOT NULL),
  'clients_with_directors_AND_existing_persons', (
     SELECT count(*) FROM public.clients c
     WHERE c.directors IS NOT NULL AND jsonb_typeof(c.directors)='array'
       AND jsonb_array_length(c.directors) > 0
       AND EXISTS (SELECT 1 FROM public.client_persons p WHERE p.client_id = c.id)),
  'client_persons_source_uq_present', (
     SELECT count(*) FROM pg_indexes
     WHERE schemaname='public' AND indexname='client_persons_source_uq')
)) AS d3_block8_target_and_collision;


-- ---- Block 9: PROTECTED baseline (post-backfill must-not-change counts) ------
-- Capture BEFORE any D3 run. After backfill: client_persons increases; audit_log MAY
-- increase ONLY if/when an approved audit path is decided (audit is an OPEN BLOCKER —
-- no emission is assumed); every OTHER count below must be unchanged.
SELECT jsonb_pretty(jsonb_build_object(
  'clients_all',            (SELECT count(*) FROM public.clients),
  'clients_active',         (SELECT count(*) FROM public.clients WHERE status='Active' AND coalesce(is_draft,false)=false),
  'clients_directors_jsonb_unchanged_probe', (
     SELECT coalesce(sum(jsonb_array_length(directors)),0) FROM public.clients
     WHERE jsonb_typeof(directors)='array'),
  'client_persons',         (SELECT count(*) FROM public.client_persons),
  'client_remediation_flags',(SELECT count(*) FROM public.client_remediation_flags),
  'audit_log',              (SELECT count(*) FROM public.audit_log),
  'accounting_tracker',     (SELECT count(*) FROM public.accounting_tracker),
  'financials_tracker',     (SELECT count(*) FROM public.financials_tracker),
  'income_tax_tracker',     (SELECT count(*) FROM public.income_tax_tracker),
  'compliance_calendar',    (SELECT count(*) FROM public.compliance_calendar)
)) AS d3_block9_protected_baseline;
