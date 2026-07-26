-- ============================================================================
-- P6 HISTORICAL & CURRENT COMPLIANCE FRAMEWORK
-- FINAL APPROVED SELECT-ONLY V2 DIAGNOSIS PACKAGE
-- ----------------------------------------------------------------------------
-- Status: PASS WITH SPECIFIC CORRECTIONS (read-only consolidation).
-- Author terminal: T1 (Control Tower). Executor: PJ (manual). Reviewer: ChatGPT.
-- Governing HEAD at authoring: b1f2b60d52a0d09a9561e06182b5ced397ff8439
-- ----------------------------------------------------------------------------
-- TARGET: V2 / yav2-dev project ref ogjrwemjefvccpyjwxuo ONLY.
-- PROHIBITED: V1 / Production project ref zcszesuvjrryxtigjglt (never connect).
-- CONTENT: SELECT / catalog reads ONLY. NO DDL. NO DML. NO corrective SQL.
--          NO function call that mutates. NO migration. NO mutation of any kind.
-- ============================================================================

-- ############################################################################
-- ## DATA-MINIMISATION WARNING (READ FIRST)
-- ############################################################################
-- Outputs from this package - and anything shared with the independent reviewer -
-- MUST NOT include or expose PAN, Aadhaar, banking, contact data, addresses,
-- document paths/URLs, internal remarks, monetary amounts, or any unrelated
-- client information. The client-data stage retrieves ONLY the minimum
-- FY/period/identity/date fields needed for the later-of and coverage analysis.
-- The governing compliance identifiers GSTIN/TAN/CIN/LLPIN are business
-- identifiers (not PAN/Aadhaar) and are included deliberately for identifier-wise
-- coverage; everything else confidential is excluded by design. If any block
-- would surface a confidential field, do not run it and record the deviation.

-- ############################################################################
-- ## EXECUTION MODEL
-- ############################################################################
-- 1. Before anything: PJ MUST visually confirm project ogjrwemjefvccpyjwxuo is
--    selected in the Supabase dashboard. Block 1's current_database()/
--    current_user/server IP are SUPPORTING CONTEXT ONLY - they do NOT prove the
--    project ref. If the dashboard does not show ogjrwemjefvccpyjwxuo, STOP.
-- 2. Run EACH numbered BLOCK as a SEPARATE SQL execution. Execute one block,
--    SAVE its output, then run the next. Do NOT paste multiple blocks into one
--    run: a submitted batch may ABORT on the first error, and later statements
--    in that batch will NOT necessarily continue. Block-by-block guarantees one
--    failure cannot destroy the remaining evidence.
-- 3. STAGE 1 (Blocks 1-20) is catalog/metadata only. STAGE 2 (Blocks 21-42) is
--    minimised client data - run it ONLY after reviewing the Stage-1 column
--    inventory (Block 4) and adjusting any column name that differs.
-- 4. The old FY ceiling (if found) is an IMPLEMENTATION BLOCKER to RECORD, not a
--    stop condition - continue all remaining checks.
-- 5. Tri-state every conclusion: [SOURCE] repo file, [GOVERNING-CLOSED] register,
--    [LIVE] this script (only these outputs are LIVE).
-- 6. No corrective SQL and no assumed migration number appear anywhere.

-- ============================================================================
-- STAGE 1 - CATALOG / METADATA DIAGNOSIS (no client-identifying data)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BLOCK 1 - TARGET CONTEXT (supporting info only; does NOT prove the ref)
-- ----------------------------------------------------------------------------
SELECT current_database() AS db_name, current_user AS db_user,
       inet_server_addr() AS server_ip, version() AS pg_version, now() AS executed_at;
-- EXPECTED [LIVE]: one context row.
-- INTERPRETATION: informational only; the project ref is proven by the DASHBOARD,
-- not this row. If PJ has not visually confirmed ogjrwemjefvccpyjwxuo, STOP.

-- ----------------------------------------------------------------------------
-- BLOCK 2 - MIGRATION LEDGER: COLUMN INVENTORY (do not assume name/executed_at)
-- ----------------------------------------------------------------------------
SELECT column_name, data_type, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
ORDER BY ordinal_position;
-- EXPECTED [LIVE]: the ledger's real columns (at least a version column).
-- INTERPRETATION: adapt Block 3 to whatever columns exist.

-- ----------------------------------------------------------------------------
-- BLOCK 3 - MIGRATION LEDGER: APPLIED ROWS
-- ----------------------------------------------------------------------------
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
-- EXPECTED [LIVE]: migration versions recorded as applied on V2.
-- INTERPRETATION: this ledger is ONE migration-governance input and may NOT
-- include separately dashboard-executed remediation artifacts (e.g. the
-- remediation-t4 "0023/0024" grants/search_path work). The next P6 migration
-- number CANNOT be derived from this ledger alone - it must be reconciled against
-- repository migration files, the governing register reservations, AND the
-- already-consumed remediation numbers 0023/0024. No number is assumed.

-- ----------------------------------------------------------------------------
-- BLOCK 4 - LIVE COLUMN INVENTORY (run before ANY Stage-2 data query)
-- ----------------------------------------------------------------------------
SELECT table_name, ordinal_position, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'clients','gst_tracker','tds_tracker','income_tax_tracker','roc_tracker',
      'llp_tracker','audit_tracker','accounting_tracker','financials_tracker',
      'notice_tracker','payroll_tracker','compliance_calendar',
      'client_registrations','client_service_applicability')
ORDER BY table_name, ordinal_position;
-- EXPECTED [LIVE]: full live column list per table.
-- INTERPRETATION: authoritative field list; every Stage-2 query must be adjusted
-- to match it. For payroll_tracker specifically: inspect whether EPF and ESIC are
-- represented separately (e.g. distinct pf_*/esi_* flags or a scheme column) and
-- whether an establishment-identity column exists.

-- ----------------------------------------------------------------------------
-- BLOCK 5 - financial_years COLUMN INVENTORY
-- ----------------------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'financial_years'
ORDER BY ordinal_position;
-- EXPECTED [LIVE]: columns incl. fy_label + a current-flag boolean.
-- INTERPRETATION: pick the real current-flag column for Block 7.

-- ----------------------------------------------------------------------------
-- BLOCK 6 - financial_years ROWS FY 2022-23 .. 2030-31
-- ----------------------------------------------------------------------------
SELECT * FROM public.financial_years
WHERE fy_label >= '2022-23' AND fy_label <= '2030-31'
ORDER BY fy_label;
-- EXPECTED [LIVE]: rows for 2022-23 .. 2030-31.
-- INTERPRETATION: confirms the historical->future FY span exists as data. Missing
-- 2026-27+ rows would mean generation is data-starved regardless of function
-- bodies (record; continue). financial_years is reference data, not client PII.

-- ----------------------------------------------------------------------------
-- BLOCK 7 - financial_years SINGLE CURRENT FLAG (adjust column name per Block 5)
-- ----------------------------------------------------------------------------
SELECT fy_label, is_current FROM public.financial_years WHERE is_current IS TRUE;
-- EXPECTED [LIVE]: exactly one row (today should be 2026-27).
-- INTERPRETATION: zero rows or a stale value is a data-side cause of the
-- "FY 2026-27" symptom.

-- ----------------------------------------------------------------------------
-- BLOCK 8 - get_current_fy() LIVE RETURN
-- ----------------------------------------------------------------------------
SELECT public.get_current_fy() AS get_current_fy_result;
-- EXPECTED [LIVE]: a single FY label.
-- INTERPRETATION: if 2025-26 (or error) while the real FY is 2026-27, the resolver
-- is stale (record; continue).

-- ----------------------------------------------------------------------------
-- BLOCK 9 - OLD-CEILING SCREENING TEST (screening only - NOT decisive)
-- ----------------------------------------------------------------------------
SELECT n.nspname AS schema, p.proname AS function,
       pg_get_function_identity_arguments(p.oid) AS args,
       (p.prosrc LIKE '%<= ''2025-26''%')                 AS screen_upper_bound_le_2025_26,
       (p.prosrc ~ 'v_current_fy[^;]*:=[^;]*''2025-26''')  AS screen_hardcoded_current_fy_2025_26,
       (p.prosrc LIKE '%2025-26%')                         AS mentions_2025_26_anywhere,
       CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security_mode,
       p.proconfig AS set_config
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'generate_client_compliance','generate_client_compliance_core',
      'activate_accounting_service','get_current_fy','get_client_start_fy',
      'resolve_client_start_fy','expected_backfill_start_fy')
ORDER BY p.proname, args;
-- EXPECTED [LIVE]: per-function screening flags.
-- INTERPRETATION: this is a SCREENING TEST only. A positive
-- screen_upper_bound_le_2025_26 / screen_hardcoded_current_fy_2025_26 flags a
-- likely old generation ceiling (blocker to record). A mentions_2025_26_anywhere
-- alone is likely a LEGITIMATE start/floor anchor, not the ceiling. A NEGATIVE
-- screen does NOT prove the old ceiling is absent - the full definitions in
-- Block 10 remain decisive.

-- ----------------------------------------------------------------------------
-- BLOCK 10 - FULL LIVE DEFINITIONS + SECURITY MODE + SEARCH PATH (decisive)
-- ----------------------------------------------------------------------------
SELECT n.nspname AS schema, p.proname AS function,
       pg_get_function_identity_arguments(p.oid) AS args,
       CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security_mode,
       p.proconfig AS set_config,
       pg_get_functiondef(p.oid) AS full_definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'generate_client_compliance','generate_client_compliance_core',
      'activate_accounting_service','get_current_fy','get_client_start_fy',
      'resolve_client_start_fy','expected_backfill_start_fy')
ORDER BY p.proname, args;
-- EXPECTED [LIVE]: full body + security mode + search_path per function.
-- INTERPRETATION: decisive evidence. Read Block 9's screen against these bodies to
-- distinguish a true upper ceiling from a legitimate start anchor, and confirm
-- DEFINER/INVOKER + search_path pinning.

-- ----------------------------------------------------------------------------
-- BLOCK 11 - EXECUTE ACL ON GENERATION / FY FUNCTIONS
-- ----------------------------------------------------------------------------
SELECT n.nspname AS schema, p.proname AS function,
       pg_get_function_identity_arguments(p.oid) AS args,
       COALESCE(array_to_string(p.proacl, E'\n'), '(NULL = default: PUBLIC has EXECUTE)') AS execute_acl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'generate_client_compliance','generate_client_compliance_core',
      'activate_accounting_service','get_current_fy','get_client_start_fy',
      'resolve_client_start_fy','expected_backfill_start_fy')
ORDER BY p.proname, args;
-- EXPECTED [LIVE]: proacl per function.
-- INTERPRETATION: EXECUTE ACL alone does NOT establish effective invocation -
-- schema USAGE, role inheritance, RLS on the target tables, the function's
-- internal auth gates, and the caller's runtime identity all also govern whether
-- a call succeeds. Catalog ACL is one input; it does NOT replace later runtime
-- allow/deny verification (admin allow / non-admin 42501).

-- ----------------------------------------------------------------------------
-- BLOCK 12 - ROC & LLP UNIQUE CONSTRAINTS
-- ----------------------------------------------------------------------------
SELECT rel.relname AS table_name, con.conname AS constraint_name, con.contype AS type,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname IN ('roc_tracker','llp_tracker')
  AND con.contype = 'u'
ORDER BY rel.relname, con.conname;
-- EXPECTED [LIVE]: roc/llp unique keys if present.
-- INTERPRETATION: presence confirms ONLY these specific ROC/LLP constraint changes
-- exist live - it does NOT prove that all of Migration 0014 (Rev 1.3) was fully
-- applied (full-application state is inferred from Blocks 3, 10, 13).

-- ----------------------------------------------------------------------------
-- BLOCK 13 - ALL TRACKER + compliance_calendar CONSTRAINTS (corrected predicate)
-- ----------------------------------------------------------------------------
SELECT rel.relname AS table_name, con.conname AS constraint_name, con.contype AS type,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND con.contype IN ('u','p')
  AND (
        rel.relname LIKE '%tracker%'
     OR rel.relname = 'compliance_calendar'
  )
ORDER BY rel.relname, con.contype DESC, con.conname;
-- EXPECTED [LIVE]: PK+UNIQUE per tracker/calendar.
-- INTERPRETATION: the live idempotency contract; a PK-only tracker is an
-- idempotency gap. Payroll: check whether payroll_tracker's unique key includes an
-- establishment identifier (i.e. whether uniqueness distinguishes EPF vs ESIC per
-- establishment) - record if absent.

-- ----------------------------------------------------------------------------
-- BLOCK 14 - INDEXES ON TRACKERS + calendar
-- ----------------------------------------------------------------------------
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename LIKE '%tracker%' OR tablename = 'compliance_calendar')
ORDER BY tablename, indexname;
-- EXPECTED [LIVE]: all indexes incl. partial-unique.
-- INTERPRETATION: reveals idempotency indexes not surfaced as named constraints.

-- ----------------------------------------------------------------------------
-- BLOCK 15 - EXISTING LIVE compliance_calendar KEY (confirm before any design)
-- ----------------------------------------------------------------------------
SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public' AND rel.relname = 'compliance_calendar'
ORDER BY con.contype DESC, con.conname;
-- EXPECTED [LIVE]: calendar PK + unique key(s).
-- INTERPRETATION: this existing key governs calendar idempotency; no new/
-- replacement key is proposed until this is reviewed.

-- ----------------------------------------------------------------------------
-- BLOCK 16 - TRACKER RLS ENABLED/FORCED FLAGS
-- ----------------------------------------------------------------------------
SELECT rel.relname AS table_name, rel.relrowsecurity AS rls_enabled,
       rel.relforcerowsecurity AS rls_forced
FROM pg_class rel JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND (rel.relname LIKE '%tracker%' OR rel.relname = 'compliance_calendar')
ORDER BY rel.relname;
-- EXPECTED [LIVE]: RLS enabled/forced booleans.
-- INTERPRETATION: report exactly as returned.

-- ----------------------------------------------------------------------------
-- BLOCK 17 - TRACKER POLICIES (all commands; report exactly)
-- ----------------------------------------------------------------------------
SELECT tablename, policyname, cmd, roles, qual AS using_expr, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (tablename LIKE '%tracker%' OR tablename = 'compliance_calendar')
ORDER BY tablename, cmd, policyname;
-- EXPECTED [LIVE]: exact policies (cmd/roles/expressions).
-- INTERPRETATION: report EXACTLY what exists. Do NOT pre-characterise (e.g.
-- "Admin/Manager INSERT-only") - the live rows define the true write authority.

-- ----------------------------------------------------------------------------
-- BLOCK 18 - TRACKER DIRECT GRANTS
-- ----------------------------------------------------------------------------
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND (table_name LIKE '%tracker%' OR table_name = 'compliance_calendar')
  AND grantee IN ('anon','authenticated','service_role','PUBLIC')
ORDER BY table_name, grantee, privilege_type;
-- EXPECTED [LIVE]: exact grants.
-- INTERPRETATION: report as returned; combine with Blocks 16-17 for the real
-- posture (no characterisation asserted).

-- ----------------------------------------------------------------------------
-- BLOCK 19 - DOCUMENT LINKAGE COLUMNS
-- ----------------------------------------------------------------------------
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
       (table_name = 'documents' AND column_name IN
          ('compliance_ref_id','compliance_type','compliance_period','fy_label','scope'))
    OR (table_name LIKE '%tracker%' AND column_name = 'document_id')
    OR (table_name = 'compliance_calendar' AND column_name = 'compliance_tracker_id')
  )
ORDER BY table_name, column_name;
-- EXPECTED [LIVE]: which linkage columns exist.
-- INTERPRETATION: evidence only (no document paths returned - column metadata only).

-- ----------------------------------------------------------------------------
-- BLOCK 20 - DOCUMENT LINKAGE FK BACKING
-- ----------------------------------------------------------------------------
SELECT rel.relname AS table_name, con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public' AND con.contype = 'f'
  AND (rel.relname LIKE '%tracker%' OR rel.relname IN ('documents','compliance_calendar'))
ORDER BY rel.relname, con.conname;
-- EXPECTED [LIVE]: FK constraints (likely none backing the soft links).
-- INTERPRETATION: confirms whether document<->tracker linkage is FK-enforced or
-- soft. No linkage design is prescribed.

-- ============================================================================
-- STAGE 2 - TARGETED, MINIMISED CLIENT-DATA DIAGNOSIS
-- ----------------------------------------------------------------------------
-- Run ONLY after reviewing the Block 4 inventory. Adjust every column name to the
-- live inventory. Select ONLY the minimal fields shown - never SELECT *, never
-- remarks, amounts, PAN, Aadhaar, contact, address or document paths. Run each
-- block separately.
--
-- COLUMN-MISMATCH RULE: If Block 4's inventory shows that a column referenced by a
-- Stage-2 block does NOT exist (or is named differently), PJ must RECORD the
-- mismatch and SKIP that block. PJ must NOT independently rewrite the query;
-- Terminal 1 will supply a corrected, column-accurate query after reviewing the
-- Block 4 inventory output.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BLOCK 21 - YA-012 MINIMUM DATE/IDENTITY FIELDS (for the later-of analysis only)
-- ----------------------------------------------------------------------------
SELECT client_id, date_of_incorporation, engagement_start,
       gst_registration_date, pf_registration_date, esi_registration_date
FROM public.clients
WHERE client_id = 'YA-012';
-- EXPECTED [LIVE]: one row of P6-relevant dates.
-- INTERPRETATION: the base date inputs for the later-of rule. No PAN/Aadhaar/
-- banking/contact/address fields are retrieved.

-- ----------------------------------------------------------------------------
-- BLOCK 22 - YA-012 REGISTRATIONS (minimum columns; reg number as presence flag)
-- ----------------------------------------------------------------------------
SELECT reg_type, effective_from, effective_to, registered_on,
       (reg_number IS NOT NULL) AS has_reg_number
FROM public.client_registrations
WHERE client_id = (SELECT id FROM public.clients WHERE client_id = 'YA-012')
ORDER BY reg_type;
-- EXPECTED [LIVE]: registration types + effective dates.
-- INTERPRETATION: later-of inputs; the actual registration number value is NOT
-- disclosed (presence flag only). Adjust column names to Block 4 if they differ.

-- ----------------------------------------------------------------------------
-- BLOCK 23 - YA-012 APPROVED SERVICE APPLICABILITY (minimum columns)
-- ----------------------------------------------------------------------------
SELECT service_code, status, frequency, effective_from, effective_to,
       (linked_registration_id IS NOT NULL) AS has_linked_registration
FROM public.client_service_applicability
WHERE client_id = (SELECT id FROM public.clients WHERE client_id = 'YA-012')
ORDER BY service_code;
-- EXPECTED [LIVE]: applicability entitlements + effective dates.
-- INTERPRETATION: the applicability inputs a future generator would consume; no PII.

-- ----------------------------------------------------------------------------
-- BLOCK 24 - gst_tracker coverage (YA-012)
-- ----------------------------------------------------------------------------
SELECT fy_label, period, return_type, gstin, status, filing_date
FROM public.gst_tracker
WHERE client_id = (SELECT id FROM public.clients WHERE client_id = 'YA-012')
ORDER BY fy_label, period;

-- ----------------------------------------------------------------------------
-- BLOCK 25 - tds_tracker coverage (YA-012; TAN-wise)
-- ----------------------------------------------------------------------------
SELECT fy_label, quarter, tan, form_type, status, filing_date
FROM public.tds_tracker
WHERE client_id = (SELECT id FROM public.clients WHERE client_id = 'YA-012')
ORDER BY fy_label, quarter;

-- ----------------------------------------------------------------------------
-- BLOCK 26 - income_tax_tracker coverage (YA-012)
-- ----------------------------------------------------------------------------
SELECT fy_label, assessment_year, itr_form, status, filing_date
FROM public.income_tax_tracker
WHERE client_id = (SELECT id FROM public.clients WHERE client_id = 'YA-012')
ORDER BY fy_label;

-- ----------------------------------------------------------------------------
-- BLOCK 27 - roc_tracker coverage (YA-012)
-- ----------------------------------------------------------------------------
SELECT fy_label, form_name, cin, filing_type, status, filing_date
FROM public.roc_tracker
WHERE client_id = (SELECT id FROM public.clients WHERE client_id = 'YA-012')
ORDER BY fy_label, form_name;

-- ----------------------------------------------------------------------------
-- BLOCK 28 - llp_tracker coverage (YA-012)
-- ----------------------------------------------------------------------------
SELECT fy_label, form_name, llpin, status, filing_date
FROM public.llp_tracker
WHERE client_id = (SELECT id FROM public.clients WHERE client_id = 'YA-012')
ORDER BY fy_label, form_name;

-- ----------------------------------------------------------------------------
-- BLOCK 29 - audit_tracker coverage (YA-012)
-- ----------------------------------------------------------------------------
SELECT fy_label, audit_type, status, filing_date
FROM public.audit_tracker
WHERE client_id = (SELECT id FROM public.clients WHERE client_id = 'YA-012')
ORDER BY fy_label;

-- ----------------------------------------------------------------------------
-- BLOCK 30 - accounting_tracker coverage (YA-012)
-- ----------------------------------------------------------------------------
SELECT fy_label, month, status
FROM public.accounting_tracker
WHERE client_id = (SELECT id FROM public.clients WHERE client_id = 'YA-012')
ORDER BY fy_label, month;

-- ----------------------------------------------------------------------------
-- BLOCK 31 - payroll_tracker coverage (YA-012; EPF/ESIC separation + establishment)
-- ADJUST to Block 4: add the live EPF/ESIC flag/scheme column(s) and the
-- establishment-identifier column if they exist; keep it minimal (no amounts).
-- ----------------------------------------------------------------------------
SELECT fy_label, month, status
FROM public.payroll_tracker
WHERE client_id = (SELECT id FROM public.clients WHERE client_id = 'YA-012')
ORDER BY fy_label, month;

-- ----------------------------------------------------------------------------
-- BLOCK 32 - financials_tracker coverage (YA-012; TEXT client_id = YA code)
-- ----------------------------------------------------------------------------
SELECT fy_label, doc_type, status, filing_date
FROM public.financials_tracker
WHERE client_id = 'YA-012'
ORDER BY fy_label, doc_type;

-- ----------------------------------------------------------------------------
-- BLOCK 33 - compliance_calendar coverage (YA-012)
-- ----------------------------------------------------------------------------
SELECT fy_label, period, compliance_type, status, due_date
FROM public.compliance_calendar
WHERE client_id = (SELECT id FROM public.clients WHERE client_id = 'YA-012')
ORDER BY fy_label, period;
-- EXPECTED [LIVE] (Blocks 24-33): YA-012's FY/period coverage per tracker (some may
-- be empty). INTERPRETATION: shows the real obligation spread and the TOP FY
-- reached per tracker for the client that surfaced R-11 - without disclosing
-- complete rows or internal remarks. Payroll: from Blocks 4/13/31, determine
-- whether EPF and ESIC are represented separately and whether establishment
-- identity + a uniqueness key exist; record any absence as a first-release gap.

-- ----------------------------------------------------------------------------
-- BLOCKS 34-42 - PRE-FY-2025-26 HISTORICAL PRESENCE (aggregate counts only; SAMPLE)
-- Run each block separately; each returns per-FY row counts only (no client data).
-- Aggregate counts across all clients - no client filter.
-- ----------------------------------------------------------------------------

-- BLOCK 34 - gst_tracker pre-2025-26 counts
SELECT 'gst_tracker' AS tracker, fy_label, count(*) AS rows
FROM public.gst_tracker
WHERE fy_label < '2025-26'
GROUP BY fy_label
ORDER BY fy_label;

-- BLOCK 35 - tds_tracker pre-2025-26 counts
SELECT 'tds_tracker' AS tracker, fy_label, count(*) AS rows
FROM public.tds_tracker
WHERE fy_label < '2025-26'
GROUP BY fy_label
ORDER BY fy_label;

-- BLOCK 36 - income_tax_tracker pre-2025-26 counts
SELECT 'income_tax_tracker' AS tracker, fy_label, count(*) AS rows
FROM public.income_tax_tracker
WHERE fy_label < '2025-26'
GROUP BY fy_label
ORDER BY fy_label;

-- BLOCK 37 - roc_tracker pre-2025-26 counts
SELECT 'roc_tracker' AS tracker, fy_label, count(*) AS rows
FROM public.roc_tracker
WHERE fy_label < '2025-26'
GROUP BY fy_label
ORDER BY fy_label;

-- BLOCK 38 - llp_tracker pre-2025-26 counts
SELECT 'llp_tracker' AS tracker, fy_label, count(*) AS rows
FROM public.llp_tracker
WHERE fy_label < '2025-26'
GROUP BY fy_label
ORDER BY fy_label;

-- BLOCK 39 - audit_tracker pre-2025-26 counts
SELECT 'audit_tracker' AS tracker, fy_label, count(*) AS rows
FROM public.audit_tracker
WHERE fy_label < '2025-26'
GROUP BY fy_label
ORDER BY fy_label;

-- BLOCK 40 - accounting_tracker pre-2025-26 counts
SELECT 'accounting_tracker' AS tracker, fy_label, count(*) AS rows
FROM public.accounting_tracker
WHERE fy_label < '2025-26'
GROUP BY fy_label
ORDER BY fy_label;

-- BLOCK 41 - payroll_tracker pre-2025-26 counts
SELECT 'payroll_tracker' AS tracker, fy_label, count(*) AS rows
FROM public.payroll_tracker
WHERE fy_label < '2025-26'
GROUP BY fy_label
ORDER BY fy_label;

-- BLOCK 42 - financials_tracker pre-2025-26 counts (TEXT client_id; aggregate)
SELECT 'financials_tracker' AS tracker, fy_label, count(*) AS rows
FROM public.financials_tracker
WHERE fy_label < '2025-26'
GROUP BY fy_label
ORDER BY fy_label;
-- EXPECTED [LIVE] (Blocks 34-42): per-tracker/per-FY counts of pre-2025-26 rows.
-- INTERPRETATION: a SAMPLE across the first-release-relevant trackers (event-based
-- notice_tracker/trust_ngo_tracker excluded from this sample). Non-zero counts
-- prove historical FYs are already representable and populated. No specific
-- expected count is asserted - the live output is the evidence.

-- ============================================================================
-- DESIGN-RESTRAINT NOTES (not SQL; carried forward from the approved package)
-- ----------------------------------------------------------------------------
-- - Lineage = precedent only: tracker provenance fields are NOT frozen until PJ
--   approves the manual/generated coexistence rule and minimum B-scope.
-- - Enforcement method open: the later-of rule is NOT pre-committed to a CHECK;
--   audited RPC vs controlled trigger/function vs other safe approaches are
--   compared AFTER this evidence.
-- - Calendar key: no new/replacement key until Block 15 is reviewed.
-- - Migration number: none assumed; reconciled from Block 3 ledger + repo files +
--   governing register + consumed remediation numbers 0023/0024.
-- ============================================================================

-- ============================================================================
-- NO-ACTION CONFIRMATION
-- This file is a SELECT/catalog-only diagnosis package for PJ MANUAL execution on
-- V2 ogjrwemjefvccpyjwxuo after visual project confirmation. It contains no DDL,
-- no DML, no corrective SQL, no migration, and performs no mutation. Terminal 1
-- did not execute it. No commit/push/PR/merge/deploy. No V1/Production access.
-- ============================================================================
