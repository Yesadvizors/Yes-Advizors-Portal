# Phase 4C v8 — Audit Log Implementation Draft

**STATUS: DRAFT / NOT APPLIED / NOT DEPLOYED.** Nothing executed. No SQL run, no migration applied, no Supabase inspection or change, no branch, no PR, no deploy, no GitHub token. For ChatGPT review only.

## Package structure
```
README.md
supabase/
  migrations/
    20260613080000_preflight.sql
    20260613080001_roles.sql
    20260613080002_schema_grants.sql
    20260613080003_tables_and_rls.sql
    20260613080004_event_contract_and_rls.sql
    20260613080005_validation_functions.sql
    20260613080006_role_and_access_functions.sql
    20260613080007_trusted_backend_writer.sql
    20260613080008_sensitive_audit_reader.sql
  rollback/
    PHASE4C_AUDIT_LOG_ROLLBACK.sql          (MANUAL ONLY / DESTRUCTIVE)
docs/
  PHASE4C_REVIEW_PACK.md
  PHASE4C_QA_MATRIX.md
  PHASE4C_V8_CORRECTION_MATRIX.md
  PHASE4C_EVENT_CONTRACT_MATRIX.md
  PHASE4C_ACTOR_ATTRIBUTION_MATRIX.md
  PHASE4C_PRIVILEGE_MATRIX.md
  PHASE4C_OBJECT_INVENTORY.md
  blocked/
    PHASE4C_GET_CLIENT_ACTIVITY_BLOCKED.md
```

**Migration count: 9.** Dependency-correct; none fail; none skipped. RLS active at table creation. Rollback outside `migrations/`.

## v8 highlights (minimal corrections; no redesign)
- `audit.log.read_completed` now carries `read_request_audit_id` = the server-derived request-event id (`v_req_id`), UUID-validated, never a caller input — linking completion to one immutable request event.
- Request event is authoritative for read scope; completion records outcome facts only.
- Rollback heading made version-neutral.
- `page_empty`/`completion_status_code` now explicitly validated.
- Clean ZIP verified via `unzip -Z1`.

### Earlier v7 highlights (retained)
- `_write_read_audit` owned by `audit_writer` so its INSERT satisfies the `audit_writer_insert` policy under FORCE RLS; EXECUTE granted only to `audit_owner`.
- Timestamp metadata uses one canonical name pair `filter_date_start`/`filter_date_end` everywhere; validated by real `::timestamptz` parsing.
- `_record_audit_failure` EXECUTE granted explicitly to `audit_writer`; never to app roles.
- `get_app_role_for_user(uuid)` no longer executable by `authenticated` (internal roles only); `get_app_role()` (self) unchanged.
- Reader emits canonical UTC timestamps `YYYY-MM-DDTHH:MI:SS.MSZ` (ms precision, trailing Z); docs state UTC normalisation (no original-tz claim).
- Clean ZIP verified via `unzip -Z1`.

All v6 controls retained: no generic authenticated writer, RLS-before-functions, one-snapshot reader, honest `trusted-backend`, no system mode, fail-closed roles, complete preflight.
