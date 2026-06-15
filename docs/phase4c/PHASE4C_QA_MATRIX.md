# Phase 4C v8 — QA Matrix

> DRAFT / NOT EXECUTED. Branch DB only. Apply 080000–080008 in order.

## A. Preflight & setup
A1 run P1–P8/P-RLS/P-DUP. A2 apply 080000–080008. A3 seed Admin, Manager "Ayush"(+1 assignment, none YA-024), Staff, Viewer, +1 unsupported portal_role. A4 mint JWTs. A5 contract=23 rows.

## B. Migration order + secure-at-each-step (finding #2)
B1 apply in order, no skips. B2 after 080003, audit_log already has FORCE RLS + policies + revokes (before any function migration). B3 after 080004, contract table secured. B4 no function migration precedes RLS. B5 preflight re-run when objects exist → RAISES.

## C. No generic authenticated writer (finding #1)
C1 no function named log_audit_event_user/_trusted/_generic granted to authenticated (only get_sensitive_audit_logs). C2 authenticated cannot insert audit_log directly (RLS). C3 _write_read_audit granted to no app role. C4 trusted-backend writer granted only to service_role+audit_owner, not authenticated.

## D. Single honest service identity (findings #6,#7,#8)
D1 writer always stores actor_service='trusted-backend'. D2 no p_initiated_by_type param (signature). D3 no per-service wrapper functions exist. D4 contract has no 'system' actor; CHECK allows only user/service. D5 caller cannot set service name.

## E. Reader one-snapshot + envelope (findings #3,#8)
E1 admin valid → envelope items+total_count+returned_count+total_pages+out_of_range. E2 non-admin → DENY. E3 normal page: items match total/paging. E4 empty result → items=[],total_count=0,total_pages=0 (NO second count query). E5 out-of-range page → items=[],total_count=full,out_of_range=true. E6 page_size>200/page_no>100000/range>92d/bad tier → DENY. E7 deterministic order.

## F. Exact scope + truthful facts (findings #4,#5)
F1 read_requested records filter_date_start/end (validated ts), filter_risk_tier, page no/size, canonical client_uuid top-level (not in metadata). F2 read_completed records DB-derived returned_row_count, total_match_count, page_empty, completion_status_code. F3 no placeholder/fake count anywhere. F4 client_uuid not duplicated in metadata.

## G. Validation (revalidate v5)
G1 required null → REQUIRED_NULL. G2 required ""/"  " → REQUIRED_BLANK. G3 optional explicit null → OPTIONAL_NULL_NOT_ALLOWED. G4 role enum violation → BAD_FORMAT. G5 attempt_count=1.5 → BAD_FORMAT. G6 date 2026-99-99 → BAD_FORMAT. G7 unknown field → DISALLOWED_KEY. G8 nested → NESTED_NOT_ALLOWED. G9 secret in value/description/resource_id → PROHIBITED_VALUE. G10 invalid UUID → BAD_FORMAT (real cast). G11 nonexistent client → CLIENT_NOT_FOUND. G12 nonexistent target → TARGET_USER_NOT_FOUND. G13 target req/prohibited enforced.

## H. Roles fail closed (finding #11)
H1 misspelled/null/unsupported role → denied. H2 Viewer/Intern/Developer_Test/Client → no access. H3 Manager/Executive/Staff assigned-only; YA-024 false. H4 Admin/is_admin global. H5 duplicate active → anon/false.

## I. Privileges (finding #12)
I1 each function REVOKEd from PUBLIC/anon/authenticated/service_role. I2 helpers (_record_audit_failure,_write_read_audit) not app-callable. I3 roles USAGE public+auth, no CREATE. I4 no app role can assume audit roles. I5 SECURITY DEFINER search_path pinned. I6 writer INSERT-only (no RETURNING).

## J. Collision preflight completeness (finding #9)
J1 every function (incl audit_is_uuid, get_app_role_for_user, _write_read_audit) in preflight. J2 all 8 indexes in preflight. J3 policies checked. J4 inventory matches OBJECT_INVENTORY.md.

## K. Append-only / rollback / regression
K1 UPDATE/DELETE audit_log → DENY. K2 rollback outside migrations. K3 rollback drops only 4C objects + revokes 4C grants/schema usage; activity_logs/clients/team untouched. K4 role drop ownership-guarded. K5 clients/team/*_tracker/documents/activity_logs unchanged. K6 app build unaffected.

## L. RLS compatibility (existing tables)
L1 RLS/FORCE state recorded. L2 authenticated-only policies → audit_owner empty → preflight fails. L3 audit_owner SELECT works. L4 resolver correct.

## M. Failure-monitoring (finding #13)
M1 read_requested fail → RAISE, nothing returned. M2 later failure → whole txn rolls back (documented; no persistence claim). M3 ingestion failure row best-effort.

## N. Packaging (finding #14)
N1 ZIP has no __MACOSX/._*/.DS_Store. N2 README count==actual (9). N3 no nested zip/backup/temp.

## P. v7 targeted fixes
P1 _write_read_audit owner=audit_writer; INSERT into audit_log succeeds under FORCE RLS (matches audit_writer_insert). P2 _write_read_audit EXECUTE granted only to audit_owner; not authenticated/anon/service_role. P3 get_app_role_for_user EXECUTE revoked from authenticated; callable only by audit_owner/audit_writer. P4 get_app_role (self) still callable by authenticated. P5 _record_audit_failure EXECUTE granted to audit_writer; not app roles. P6 metadata field names filter_date_start/filter_date_end match across contract/validator/reader (no filter_date_range_*). P7 reader timestamps formatted YYYY-MM-DDTHH:MI:SS.MSZ (UTC, ms, Z) for both start and end. P8 validator accepts a valid timestamptz string and rejects 2026-99-99T00:00:00.000Z via real ::timestamptz parse. P9 ZIP has no __MACOSX/._*/.DS_Store (final-archive check).

## Q. v8 request/completion correlation
Q1 read_completed without read_request_audit_id → MISSING_REQUIRED_KEY:read_request_audit_id. Q2 read_request_audit_id not a UUID → BAD_FORMAT:read_request_audit_id. Q3 completion read_request_audit_id equals the v_req_id returned by the request insert (server-derived). Q4 read_request_audit_id is not a parameter of get_sensitive_audit_logs (cannot be caller-supplied/overridden). Q5 two concurrent reads produce two distinct request ids and two completion events each referencing its own request id. Q6 request event remains authoritative for scope (date/client/risk/page). Q7 completion records page_empty (boolean) + completion_status_code (SUCCESS/EMPTY). Q8 page_empty/completion_status_code now pass validation (regression for the previously-unvalidated required keys).
