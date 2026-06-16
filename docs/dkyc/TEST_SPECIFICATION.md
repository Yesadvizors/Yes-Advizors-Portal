# Director KYC — v5 Test Specification

Review-only test plan. Each test states: setup, action, expected result, and which artifact enforces it.

EVIDENCE LEVEL (see review/LOGIC_TEST_RESULTS.txt header for the full tier table):
 - (A) static/parse checks and (B) logic-port tests: PERFORMED.
 - (D) hosted READ-ONLY preflight (schema/role inspection, SELECT-only): PERFORMED during authoring.
 - (C) PostgreSQL execution tests and (E) hosted mutation testing: NOT performed, NOT approved.
The SQL grant/RLS/trigger and per-role/per-client/finalise/replay outcomes below are therefore written
as exact, RUNNABLE checks for the approver to execute AFTER apply; they have not been executed here.

## 1. Direct browser finalise is DENIED
- Setup: a valid authenticated end-user JWT (Admin or not).
- Action (a): `select has_function_privilege('authenticated',
    'public.dkyc_finalize_document_upload(uuid,uuid,text,bigint,text)','EXECUTE');`
  Expected: **false** (authenticated EXECUTE revoked). Enforced by C migration grant block + C validation.
- Action (b): browser `supabase.rpc('dkyc_finalize_document_upload', {...})`.
  Expected: **permission denied for function** (PostgREST 403). The frontend never calls it (reconciliation
  shows finalise is NOT among frontend RPCs).
- Action (c): `select has_function_privilege('anon', '...finalize...','EXECUTE');` Expected: **false**.

## 2. Trusted verifier finalise SUCCEEDS
- Setup: Edge Function holds service_role; an Admin created intent I (status PREPARED, unexpired);
  object uploaded at I.approved_storage_path with matching size/mime.
- Action: service client calls
  `dkyc_finalize_document_upload(I.id, <admin team.id>, 'doc.pdf', <size>, '<mime>')`.
- Expected: returns `{status:'ok', document_id}`; one `documents` row + one `director_kyc_documents`
  bridge row created; intent I -> FINALIZED; KYC_DOCUMENT_ATTACHED logged.
- Enforced by: `service_role` EXECUTE grant; RPC actor re-validation against `team`; bridge insert.

## 3. Forged / replayed verification FAILS
- Forged actor: call finalise with `p_verifier_actor` = a non-Admin team.id or a random uuid.
  Expected: **FORBIDDEN_ROLE** (RPC re-validates Admin/Manager) — passing a fake actor does not work.
- Actor != intent creator: Admin B finalises Admin A's intent.
  Expected: **PARENT_NOT_AUTHORISED** (`intent.created_by <> p_verifier_actor`).
- Replay: call finalise twice on the same intent.
  Expected: first -> `ok`; second -> `{status:'noop', document_id:<same>}`; NO duplicate documents/bridge row.
- Tampered size/mime: object_size > intent.expected_file_size, or object_mime != intent.expected_mime_type.
  Expected: **UPLOAD_PATH_INVALID**.
- Expired intent: expires_at < now. Expected: **INTENT_EXPIRED** (and intent marked EXPIRED).
- Enforced by: finalise RPC checks (actor role, ownership, status/expiry, size/mime), single-use flip.

## 4. Company A access does not expose Company B
- Setup: director D linked to Company A (client_A) and Company B (client_B). Staff S has a
  team_client_access row for client_A only. D has KYC records.
- Action (a): S calls `dkyc_list_clientwise(p_client_id = A.id, ...)`.
  Expected: rows for A returned (S is authorised for A).
- Action (b): S calls `dkyc_list_clientwise(p_client_id = B.id, ...)`.
  Expected: **CLIENT_FORBIDDEN** (staff_can_access_client(B) = false). S never sees B's view even though
  D is linked to B. Record assignment alone does NOT grant company-B visibility.
- Action (c): Admin calls both. Expected: both succeed (staff_can_access_client returns true for Admin).
- Enforced by: explicit `staff_can_access_client(p_client_id)` gate in `dkyc_list_clientwise` (Blocker 3),
  which checks `team_client_access` for non-admins.

## 5. Empty initial records can be safely reconciled and created
- Setup: live holders today — DIN 11521014 (allotment NULL), 07853564 (2021-04-01), 07718133 (2020-01-01).
  No director_kyc_records exist for them.
- Action: Admin calls `dkyc_create_initial_obligation(holder_id)` for each.
  Expected:
    - NULL allotment -> `{status:'manual_review', classification:'MANUAL_REVIEW', created:false}` (no row).
    - 2021-04-01 (legacy) -> `{status:'manual_review', classification:'LEGACY_HISTORY_UNRESOLVED',
      created:false}` (no row — NOT calculated as new DIN).
    - 2020-01-01 (legacy) -> same as above.
    - A hypothetical NEW_DIN holder (allotment 2026-03-31) -> `{status:'ok', created:true,
      compliance_cycle:2029, due_date:2029-06-30, interpretation_applied:true}`.
    - A holder with verified prior-regime evidence -> `{status:'ok', created:true,
      compliance_cycle:2028}` (PRIOR_REGIME_VERIFIED).
- Critical: the RPC NEVER reads last_kyc_month or kyc_change_done (grep-verifiable: those identifiers do
  not appear in dkyc_create_initial_obligation).
- Enforced by: engine classification + the MANUAL_REVIEW-creates-nothing rule.

## 6. Duplicate obligations cannot be created
- Setup: a NEW_DIN holder with no records.
- Action (a): call `dkyc_create_initial_obligation(holder)` -> `{status:'ok', created:true, record_id:R}`.
- Action (b): call it again -> `{status:'exists', record_id:R, created:false}` (idempotent; same row).
- Action (c): two concurrent calls (advisory xact lock serialises them) -> exactly one row; the loser
  returns `exists`.
- Action (d): attempt a manual duplicate INSERT of a second PERIODIC_KYC row for the same
  (din_holder_id, compliance_cycle) -> **unique_violation** on `uq_dkyc_periodic_holder_cycle`.
- Enforced by: in-RPC existence check + `pg_advisory_xact_lock` + the partial unique index backstop (A).

## Grants / isolation summary checks (runnable)
- finalise: authenticated=false, anon=false, service_role=true.
- prepare/record_filing/verify/accept/initial-obligation: authenticated=true, anon=false; each gates
  Admin/Manager inside and fails closed on NO_ACTOR_IDENTITY.
- private helpers (compute_due, record_status, etc.): authenticated=false.
- snapshot, upload_intents, director_kyc_documents tables: no authenticated grant (RPC-only).

## Logic-test results
See review/LOGIC_TEST_RESULTS.txt for the executed Python port covering classification (all paths +
boundaries), duplicate-prevention decision logic, and company-isolation decision logic.

## 8. EVENT_UPDATE change_type handling (v4 — fail-closed for OTHER)
- Setup: an EVENT_UPDATE record with trigger_date set.
- change_type in (MOBILE, EMAIL, RESIDENTIAL_ADDRESS, MULTIPLE): due = trigger_date + 30 (Rule 12A(2));
  DUE_SOON/OVERDUE/SUBMITTED_PENDING/FILED_VERIFIED resolve as per the branch.
- change_type = OTHER: compliance_status = MANUAL_REVIEW, reason_code =
  'MANUAL_REVIEW_EVENT_OTHER_NOT_CLASSIFIED', due_date = NULL. The 30-day statutory deadline is NOT
  applied to OTHER because Rule 12A(2) confirms it only for mobile/email/residential-address changes.
- change_type IS NULL on an EVENT_UPDATE: MANUAL_REVIEW, reason_code =
  'MANUAL_REVIEW_EVENT_TYPE_UNSPECIFIED', due_date = NULL.
Enforced by: the EVENT_UPDATE branch in dkyc_record_status (B_rpcs/02_MIGRATION.sql).
