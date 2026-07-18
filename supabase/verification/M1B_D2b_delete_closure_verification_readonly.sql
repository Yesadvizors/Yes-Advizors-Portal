-- ============================================================================
--  YAV2 — Module 1 — M1-B D2b DELETE-CLOSURE VERIFICATION  (READ-ONLY)
--
--  Target : V2 / yav2-dev ONLY — ogjrwemjefvccpyjwxuo.  Run AFTER migration 0018.
--  Read-only: privilege probes only (has_table_privilege). No writes, no DDL.
--  ⚠ CONFIRM the project is ogjrwemjefvccpyjwxuo before running.
--
--  Proves, for `authenticated` on all 7 D2b base tables:
--    INSERT=false · UPDATE=false · DELETE=false · SELECT=true
-- ============================================================================

-- V1: per-table privilege grid (7 rows).
SELECT t AS base_table,
       has_table_privilege('authenticated', 'public.'||t, 'INSERT') AS insert_expect_false,
       has_table_privilege('authenticated', 'public.'||t, 'UPDATE') AS update_expect_false,
       has_table_privilege('authenticated', 'public.'||t, 'DELETE') AS delete_expect_false,
       has_table_privilege('authenticated', 'public.'||t, 'SELECT') AS select_expect_true
FROM unnest(ARRAY['client_persons','client_identifiers','client_contacts','client_addresses',
                  'client_relationships','client_registrations','gst_registration_details']) AS t
ORDER BY t;

-- V2: NULL-safe roll-up over all 7 tables. Expect closed_expect_true = TRUE.
SELECT bool_and(
             has_table_privilege('authenticated', 'public.'||t, 'INSERT') IS NOT DISTINCT FROM FALSE
         AND has_table_privilege('authenticated', 'public.'||t, 'UPDATE') IS NOT DISTINCT FROM FALSE
         AND has_table_privilege('authenticated', 'public.'||t, 'DELETE') IS NOT DISTINCT FROM FALSE
         AND has_table_privilege('authenticated', 'public.'||t, 'SELECT') IS NOT DISTINCT FROM TRUE
       ) AS all_7_insert_update_delete_denied_select_kept_expect_true
FROM unnest(ARRAY['client_persons','client_identifiers','client_contacts','client_addresses',
                  'client_relationships','client_registrations','gst_registration_details']) AS t;
