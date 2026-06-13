# Phase 4C v8 — REVIEW PACK

> **Status:** DRAFT / NOT APPLIED / NOT DEPLOYED. For review only.
> No SQL run · no migration applied · no Supabase inspection or change · no branch · no PR · no deploy · no GitHub token.

## 1. Migration sequence (9, dependency-correct, none failing)
```
080000_preflight                  complete collision guard (roles/tables/funcs/indexes/policies) + auth.uid() assert
080001_roles                      audit_owner, audit_writer (NOLOGIN NOINHERIT NOCREATEROLE NOCREATEDB)
080002_schema_grants              USAGE public+auth, EXECUTE auth.uid(), REVOKE CREATE
080003_tables_and_rls             audit_log + audit_ingestion_failures: CREATE→REVOKE→RLS→policies→grants (secured at creation)
080004_event_contract_and_rls     audit_event_contract: secured at creation + 23 rows
080005_validation_functions       contains_secret, is_uuid, field_format_ok (enums), validate_event
080006_role_and_access_functions  get_app_role (fail-closed), get_app_role_for_user, staff_can_access_client
080007_trusted_backend_writer     single service writer (trusted-backend) + _record_audit_failure
080008_sensitive_audit_reader     Admin-only reader (self-contained) + private _write_read_audit
```
RLS is active on every audit table from the migration that creates it — no window where a callable function precedes the RLS boundary (finding #2). Each migration leaves the DB in a secure state if a later one fails.

## 2. No generic authenticated writer (finding #1)
The generic user writer is removed. The only authenticated-callable RPC is `get_sensitive_audit_logs` (Admin-only). It is not a generic logger: it authenticates, enforces Admin, performs the read, and writes its own fixed `audit.log.read_requested`/`read_completed` events through the private `_write_read_audit` (granted to no application role). The caller cannot choose event name, target, client, resource, action, description or metadata. All other user-originated audit events are **Blocked / future integration / require an atomic business-operation RPC or app/Edge Function change** — not implemented here.

## 3. Single honest service identity (findings #6, #7, #8)
One writer, `log_audit_event_trusted_backend`, always writes `initiated_by_type='service'` and `actor_service='trusted-backend'` (hard-coded). No `p_initiated_by_type` parameter; no per-service wrappers; no `system` mode. `service_role` proves trusted backend access, not which component called — stated plainly. Per-component provenance and any `system` caller are future work.

## 4. Self-contained reader (findings #3, #4, #5, #10, #13)
`get_sensitive_audit_logs` returns one JSONB envelope `{items,total_count,returned_count,page_number,page_size,total_pages,out_of_range}`. items/total/returned/total_pages all come from ONE statement over MATERIALIZED `filtered`+`page_rows` — no empty-page fallback count (finding #3). Records exact scope: canonical `client_uuid` (top-level), `filter_date_start`/`filter_date_end` as canonical UTC `YYYY-MM-DDTHH:MI:SS.MSZ` (millisecond precision, trailing Z; original tz not preserved), validated by real `::timestamptz` parsing, `filter_risk_tier`, page number/size (finding #4). read_requested = pre-exec facts only; read_completed = DB-derived returned/total/page_empty/completion_status + read_request_audit_id (= server-derived v_req_id, UUID-validated, never caller input) linking it to the one immutable request event (findings v8 #1/#2). Admin-only; `_write_read_audit` re-verifies admin + client existence (finding #10). Bounded pagination (page≤200, page_no≤100000, range≤92d, bigint offset), deterministic order. Fail-closed: read_requested first; if it fails, RAISE. One transaction: if a later statement raises, the whole transaction (incl. audit rows) rolls back — not claimed to persist; durable alerting is out-of-band (finding #13).

## 5. Validation (unchanged, accepted in v5)
Required keys present + non-null + non-blank (trimmed) + format-valid; explicit-null optional rejected; explicit enums (role/login/change/export/scope/etc.) with unknown field → reject; real UUID cast; integers reject fractional + bounded; real `::date` cast (rejects 2026-99-99); secret scan (PAN/Aadhaar/GSTIN/TAN/mobile/email/bank/JWT/key/secret keywords); client + target-user existence verified; canonical fields never duplicated in metadata.

## 6. Role resolution fail-closed (finding #11)
Unknown/null/duplicate → denied/anon; Manager/Executive/Staff assigned-only; Admin/is_admin global; Viewer/Intern/Developer_Test/Client → no access. No `ELSE 'staff'`.

## 7. Privileges (finding #12)
Explicit schema USAGE+EXECUTE auth.uid(); CREATE revoked; roles NOCREATEROLE/DB; every function REVOKEd from PUBLIC/anon/authenticated/service_role before narrow re-grants; helpers internal; SECURITY DEFINER search_path pinned; RLS before functions. Full chain in PRIVILEGE_MATRIX.

## 8. activity_logs vs audit_log
audit_log = 23 security events (contract-listed). activity_logs = operational history (unchanged). No duplication; no historical migration; retention a future decision.

## 9. RLS / branch preflight (run before any apply)
P1 CREATE ROLE · P2 ALTER OWNER · P3 app roles exist · P4 FORCE RLS permitted · P5 gen_random_uuid/pgcrypto · P6 auth.uid (asserted) · P7 public not writable by untrusted · P8 USAGE auth grantable · P-RLS-1..5 existing-table RLS lets audit_owner read team/team_client_access/clients (else **fail preflight**) · P-DUP duplicate active identity.

## 10. Remaining blockers
Branch-DB preflight; existing-table RLS compatibility; backend JWT-verification for any future user-attributed business event; service-specific cryptographic identity (current is asserted `trusted-backend`); Edge Function / application wiring of writer calls; atomic business-operation mutation-audit RPC (separate approval); client/director feed (Blocked). None solvable in SQL alone.

## 11. Confirmation
No SQL executed · no migration applied · no Supabase inspection or change · no branch · no PR · no deploy · no merge · no user/role/permission change · no GitHub token.
